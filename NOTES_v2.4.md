# NOTES — v2.4 design walk-throughs

Per the v2.3 logic-first discipline carried into v2.4: each stage gets a
pre-implementation walk-through and a post-implementation note. The
v2.4 patch is small (2 fixes + a verification stage), so this file is
correspondingly brief.

---

## Stage 0 — orient

- v2.4 JSON loaded; `meta.version === "2.4"`. Two new top-level keys
  present: `fort_visit_system`, `race_to_fort_fix`.
- Per the spec, `historical_photo_system_v2_4` is also expected; not
  present in this JSON. The spec's mention of it is informational —
  Nicholas runs the photo script himself, no HTML changes required
  for the photo path beyond the v2.3 consumer (lines ~9320-9335).
- v2.3 backup at `oregon_trail_game_data.v2.3.backup.json` (top of
  repo, not in `.backups/`); will move during housekeeping if a
  later commit pass needs it. For now, it's harmless where it sits.
- US-11 and US-12 are described in the spec but not yet present in
  the JSON's `simulation_logic_validation.required_user_stories_pre_implementation`
  array. I'll walk them through here and validate against the
  patched code; adding them to the JSON is a small data edit that
  Nicholas can apply with the Stage 1 commit.

---

## Stage 1 — fort visit redesign (PRE-IMPLEMENTATION)

**Baseline Monte Carlo (10,000 runs):**
- avg forts/journey: **0.513** of 4
- % zero-fort journeys: **54.6%**

Matches the spec's expected baseline (≈0.52 / ≈54%) — the trail and
dice are unchanged from v2.3. The math problem is real: 2d6-capped-at-8
produces 42% of moves at exactly 8, causing systematic overshoot of
small fort distances on a 25-space trail.

**Path-2 simulation (10,000 runs, 70% accept):**
- avg forts/journey: **2.918** of 4
- % zero-fort journeys: **0.3%**

Path 2 alone surpasses the spec's target (2.0-2.5 avg, <5% zero).
Path 3 (forced march) sits on top of that as a player-agency lever
for dying-member scenarios.

**US-11 walk-through (voluntary fort stop):**
Player at space 4 rolls 2d6 = 7. Fort Kearney is at space 5, unvisited.
Roll would carry the wagon from 4 → 11.

In the patched code:
1. `rollDiceAndAdvance` settles to its summary callout. The summary
   shows the math as before. Total move = 7.
2. NEW: After summary hold, before the wagon position update, we
   scan trail spaces (5..11) for any fort with `!w.forts_visited.includes`.
   Fort Kearney at 5 is unvisited.
3. NEW: Show a modal callout with two large buttons. Wagon icon
   stays visible. Audio: soft chime.
4. Player picks "Stop at the Fort" → `w.position = 5`; the 6 spaces
   of forfeited movement are gone. `resolveSpace(w)` then runs and
   triggers `resolveFort`. Fort menu opens. Journal: "We pulled in
   at Fort Kearney. The team was eager to push on but our needs at
   the fort came first."
5. Alternative: "Push Past" → wagon advances to 11 normally.
6. The on-the-way already-visited forts don't trigger this prompt
   (filter in step 2). If two unvisited forts lie on the path,
   prompt for the FIRST one only — player can decide about the
   next on a later turn.

**US-12 walk-through (forced march):**
Player at space 7 with a dying Doctor. Fort Laramie at space 10
(unvisited).

In the patched code:
1. `renderActionMenu` shows 5 buttons: Push On, Hunt, Rest, Forage,
   AND a new "Make for the Fort" with subtitle "Push hard for Fort
   Laramie — 3 spaces, +1 day (urgent)". The (urgent) hint is
   present because a member is dying; base cost is ceil(3/3)=1 day,
   reduced by 1 for the dying member, floored at 1 = 1 day. So
   "(urgent)" labels the dying-member discount.
2. Player clicks. No dice. `moveWagonToFort(w, 10, 1)` advances
   position and adds days. Audio: drumbeat-of-hooves SFX.
3. `resolveSpace(w)` → `resolveFort(w, sp)` → fort menu opens.
   Player can buy medicine for the Doctor.
4. End turn. Next player turn: intervention may fire again for the
   still-dying Doctor. `distanceToNextFort` is now >3 (next fort
   is far), so race_to_fort filters out. `stop_and_tend` and
   `pray_and_continue` remain available — the spec's note that
   "Doctor's Quarters bonus narratively" applies to stop_and_tend
   isn't implemented here but the recovery_probability_with_doctor
   branch is already in place.

**Helper extraction:**
Extract `moveWagonToFort(w, fortPosition, daysCost)` per the spec.
Used by Stage 1 Path 3 and Stage 2 race_to_fort.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. The two helpers
(`nextUnvisitedFortAhead`, `unvisitedFortInRange`), the modal
(`promptVoluntaryFortStop`), the new action (`doActionMakeForFort`),
the renderActionMenu visibility guard, the `with-fort-march` CSS
class for the 5-col grid, the hooves SFX, and the dying-member
day-cost discount are all present. Visual confirmation of the
modal layout and the 5-button row is browser-required.

## Stage 1 complete — fort visit redesign (lucky landing / voluntary stop / forced march)

---

## Stage 2 — race_to_fort actually moves the wagon (PRE-IMPLEMENTATION)

**Walk-through:** Player has a dying member. Intervention modal
fires with race_to_fort listed (because `distanceToNextFort <= 3`).
Player picks it. v2.3 applied the day cost (1) and rolled recovery
with +30%, but `w.position` was unchanged — narrative claimed they
arrived at a fort, but the wagon was still at its original space.
v2.4 patches the choice so it actually advances position.

**Implementation:** In `resolveInterventionChoice`, before the
existing day-cost / resource / recovery logic, detect
`choice.id === 'race_to_fort'`. Use `nextFortAheadAny(w)` (a new
helper that returns the next physical fort regardless of visited
status — since race_to_fort is about saving a member, not progression,
visited forts are valid destinations). Call
`moveWagonToFort(w, fortAhead.position, 0)` — the helper from
Stage 1, with 0 days because the existing
`if (eff.days_added) w.daysTraveled += eff.days_added` line two
lines below applies the day cost. Then the existing recovery flow
runs unchanged.

**Narrative addition:** when `raceFortName` is set, append
`<br><em>We pull into the gates of [Fort] at sundown. [Name] is
alive. Weak, pale, but alive.</em>` on success, or `<br><em>We
pull into the gates of [Fort]. [Name] did not see them.</em>` on
failure. The journal log captures the arrival on both paths.

**Edge cases:**
- No fort ahead at all (rare — only at trail end). `nextFortAheadAny`
  returns null; `raceFortName` stays empty; behavior reverts to v2.3
  (recovery rolls without movement). The intervention's
  `available_when` filter (`distFort <= 3`) gates this so the choice
  shouldn't appear in this case anyway.
- Fort already visited. `nextFortAheadAny` does NOT filter by visited,
  so the wagon races to the nearest physical fort. Acceptable —
  fort doctors are still there on a re-visit.
- Multiple dying members. Intervention fires for the most-progressed
  one (per pickDyingMember logic). After that one resolves, the next
  turn's intervention may fire for another dying member; race_to_fort
  may or may not be available depending on the wagon's new position.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. `.test_battery_v2_4.js`
confirms the early `if (choice.id === 'race_to_fort')` branch with
`moveWagonToFort(w, fortAhead.position, 0)` is wired, and the
arrival narratives include the spec's success and failure phrases.
Browser-side: race_to_fort flow ends → next renderActionMenu fires
on the new turn → Push On (or any other action) → `resolveSpace`
→ wagon is on a fort space → `resolveFort` → fort menu opens. The
"arrives at fort, fort menu next turn" flow is the spec's preferred
path.

## Stage 2 complete — race_to_fort moves wagon to fort + arrival narratives

---

## Stage 3 — validation pass (POST)

**Photo consumer verified.** `.test_photo_consumer.js` injects a
1×1 pink-pixel data URL into `window.HISTORICAL_PHOTOS_OVERRIDE`
BEFORE running the script, then calls `historicalIllustrationFor('Fort
Laramie')`. Output contains the `<img src="data:image/png;base64,..."`
with the pink pixel; SVG daguerreotype is suppressed.
Chimney Rock (no override) correctly falls back to the SVG.
A raw-base64 entry (no `data:` prefix) gets `data:image/jpeg;base64,`
prepended by the consumer's small normalization. **All photo consumer
assertions PASS.**

**Headless battery: 32 PASS / 0 FAIL.**

**Monte Carlo (10,000 runs each):**
- Baseline: 0.502 avg forts / journey, 55.4% zero-fort.
- With Path 2 @ 70% accept: 2.933 avg forts / journey, 0.4% zero-fort.

(Baseline matches the spec's expected ≈0.52 / ≈54%; with-fix exceeds
the spec's target of 2.0–2.5 avg / <5% zero. Path 3 forced-march
adds urgency on top for dying-member scenarios but isn't reflected
in these probabilities.)

**US-11** (voluntary fort stop) — PASS + NEEDS-PLAYTEST visual.
Static-verified that `unvisitedFortInRange` runs after dice settle,
that `promptVoluntaryFortStop` builds a two-button choice modal, and
that the forfeited spaces are logged to journal. Visual reproduction
in the build report.

**US-12** (forced march to save a dying member) — PASS + NEEDS-PLAYTEST
visual. Static-verified that the action button appears at distance
≤5 with the correct subtitle, that the day cost is `ceil(distance/3)`
reduced by 1 (min 1) when a member is dying, and that the action
calls `moveWagonToFort` then `resolveSpace`. Visual reproduction in
the build report.

## Stage 3 complete — 32 headless tests pass; US-11, US-12 verified statically


