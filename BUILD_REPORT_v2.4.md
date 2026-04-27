# Pink Oregon Trail — v2.4 Build Report

Build date: 2026-04-27
Designer: Gabby Kasdaglis
Engineer: Nicholas Kasdaglis
Branch: `main` · GitHub: <https://github.com/nkasdaglis/pink-oregon-trail>
Starting state: v2.3 code on disk; all v2.4 work added on top.

This is a focused 2-fix patch driven by playtest data, plus a verification
stage:

1. **Issue 1 — forts rarely visited** (54% of v2.3 journeys visit zero
   forts due to systematic 2d6-cap-at-8 overshoot). Fix: three-path
   visit system (lucky landing / voluntary stop / forced march).
2. **Issue 2 — race_to_fort doesn't move the wagon.** v2.3 applied the
   day cost and recovery bonus but never updated `w.position`. Fix: the
   choice now actually advances to the fort.
3. **Stage 3 — validation pass + photo consumer test.** Verified the
   v2.3 `HISTORICAL_PHOTOS_OVERRIDE` consumer renders an `<img>` when
   the override map is populated.

Per Nicholas's standing instruction (carried from v2.3), no `git`
commands ran during this build. Code is on disk; recommended commits are
in the "git work pending" section at the end of this report.

---

## What v2.4 adds, in one sentence per change

- **Helpers** — `nextUnvisitedFortAhead`, `unvisitedFortInRange`,
  `nextFortAheadAny`, `moveWagonToFort` (used by Path 3, race_to_fort).
- **Path 2 (voluntary stop)** — `promptVoluntaryFortStop` modal fires
  in `doActionPushOn` after dice settle when the roll would carry the
  wagon past an unvisited fort.
- **Path 3 (forced march)** — `doActionMakeForFort` action; 5th
  conditional button on the action bar; `hooves` SFX; CSS
  `.with-fort-march` switches the action grid to 5 columns.
- **Stage 2 fix** — `resolveInterventionChoice` advances `w.position`
  to the next fort when `choice.id === 'race_to_fort'`; appends a
  fort-arrival sentence to the success/failure narratives.

No JSON edits required for the patch itself (the new top-level keys
were already in the v2.4 JSON Nicholas dropped in). The two new user
stories US-11 and US-12 are walked through in `NOTES_v2.4.md` and
validated below; the JSON's `simulation_logic_validation.required_user_stories_pre_implementation`
array still contains 10 entries (US-01..US-10) — adding US-11 and
US-12 to it is a small data edit that can ride alongside the Stage 1
commit.

---

## Pre-implementation reasoning per stage

Full walk-through is in `NOTES_v2.4.md`.

### Stage 1 — fort visit redesign

US-11 + US-12 walked through end-to-end before any code change. The
math diagnosis from the spec was independently confirmed via a 10,000-
run Monte Carlo that reproduced 0.513 avg forts / 54.6% zero-fort —
within ±0.01 of the spec's 0.52 / 54%. The trail layout (5/10/17/20)
and the 2d6-capped-at-8 dice are unchanged from v2.3. The cap is
mathematically the source of the overshoot: 42% of all moves are
exactly 8.

Three paths chosen per the spec, with the helper extraction
(`moveWagonToFort`) shared between Path 3 and Stage 2. The voluntary-
stop prompt fires only for UNVISITED forts (per spec's
fort_filter); forts on the way that the wagon has already visited
don't trigger the prompt.

### Stage 2 — race_to_fort

Single-issue fix. Spec offered two implementation alternatives
("arrives at fort, fort menu next turn" vs "open fort menu
immediately"). Picked the simpler "next turn" path per the spec's
default lean. This fits the existing turn rhythm — recovery
narrative is its own beat, fort menu fires on the next Push On (or
the player can use "Make for the Fort" if they want to act
immediately). New helper `nextFortAheadAny` (no visited filter)
mirrors the race_to_fort intent: race to the *nearest physical*
fort, not the nearest *unvisited* one.

### Stage 3 — validation

Photo consumer test: pre-populate
`window.HISTORICAL_PHOTOS_OVERRIDE` with a 1×1 pink-pixel data URL
inside the vm sandbox BEFORE running the script. The script's
`window.HISTORICAL_PHOTOS_OVERRIDE = window.HISTORICAL_PHOTOS_OVERRIDE
|| {}` initializer correctly preserves the pre-existing map. Then
`historicalIllustrationFor('Fort Laramie')` returns an `<img>` with
the pink pixel and no SVG fallback. Reproduced in
`.test_photo_consumer.js`. **All photo consumer assertions PASS.**

---

## Headless test battery — `.test_battery_v2_4.js`

```
PASS: 32   FAIL: 0
```

Run via `node .test_battery_v2_4.js`. Coverage:

- **JSON shape** (4 checks): meta.version === "2.4",
  fort_visit_system + race_to_fort_fix present, three_paths len 3.
- **Stage 1 statics** (10): all helper functions present, doActionPushOn
  calls overshoot detection, renderActionMenu adds Make-for-Fort under
  5 spaces, hooves SFX case, .with-fort-march CSS, dying-member
  day-cost discount expression.
- **Stage 1 behavioral** (2): `moveWagonToFort` updates position +
  daysTraveled; with 0 days only moves position. (Other helpers
  require live `gameState` which is not exposable from the vm
  sandbox; their behavior is exercised by the live browser path.)
- **Stage 2 statics** (4): `nextFortAheadAny` present, race_to_fort
  early branch with `moveWagonToFort(...0)`, success and failure
  arrival narratives.
- **Monte Carlo** (4): baseline matches spec, with-fix ≥ 2.0 avg, <5%
  zero-fort.
- **Photo consumer statics** (3): window-scope init, call-time read,
  data: prefix injection.
- **US-11/US-12 statics** (5): voluntary stop prompt wiring,
  forfeited-spaces journal log, forced-march button visibility under
  5 spaces, dying-member day-cost discount, advance-to-fort.

The separate `.test_photo_consumer.js` adds 6 behavioral assertions
(pink-pixel data URL → `<img>` rendered; no SVG fallback shown for
overridden id; Chimney Rock fallback uses SVG; Chimney Rock with
override gets the pixel; raw-base64 gets the data: prefix). **All
PASS.**

---

## Monte Carlo before/after — fort visit rate

10,000 runs each, Short trail, 4 forts at spaces {5, 10, 17, 20}.

| Scenario | Avg forts / journey | % zero-fort journeys |
|---|---|---|
| **Baseline (v2.3 dice)** | 0.502 of 4 | 55.4% |
| **With Path 2 @ 70% accept** | 2.933 of 4 | 0.4% |

Spec target: avg ≈ 2.0–2.5, zero-fort < 5%. **Both targets exceeded.**

Path 3 (forced march) adds urgency on top of these numbers for
dying-member scenarios but isn't reflected in the simulation since
it's a player-agency mechanism rather than a probabilistic one. In
practice, a wagon with a dying member within 5 spaces of a fort can
*always* reach the fort regardless of dice; that's the safety net the
playtest revealed was missing.

---

## User Story Validation

### US-11 — Voluntary fort stop

**Story:** Player at space 4 rolls 2d6 = 7. Fort Kearney is at space 5
(unvisited). Roll would carry them to space 11.

**Expected:** Dice show 7. Before wagon moves, prompt: "You see Fort
Kearney ahead at space 5. Stop here, or push past?" Player picks
Stop. Wagon moves to space 5. Fort menu opens. Forfeited 6 spaces of
movement gone.

**Verdict: PASS + NEEDS-PLAYTEST visual.** Static-verified:
`doActionPushOn` calls `unvisitedFortInRange(w, fromPos, intended-1)`;
`promptVoluntaryFortStop` builds a two-button choice modal in
`#fort-stop-opts`; clicking Stop calls `moveWagonToFort(w, 5, 0)` then
`resolveSpace(w)` which routes to `resolveFort`. Forfeited spaces
logged to journal. Visual reproduction:

> Open `pink_oregon_trail.html`, start a Short Journey, click Push
> On until the dice settle on a sum that would carry past Fort
> Kearney (e.g., from space 4 with a roll producing total movement
> ≥ 2 will offer the prompt — the cap means most rolls land 8 spaces
> ahead). Look for: a modal with title "Fort Ahead — Fort Kearney",
> two large buttons "Stop at Fort Kearney" and "Push Past", soft
> chime on appearance. Click Stop. Wagon arrives at space 5; fort
> menu opens; journal logs the forfeited movement.

### US-12 — Forced march to save a dying member

**Story:** Player at space 7 with a dying Doctor. Fort Laramie at
space 10. Action bar shows "Make for the Fort" with subtitle "Push
hard for Fort Laramie — 3 spaces, +1 day (urgent)".

**Expected:** Player clicks. Wagon advances to space 10. Day count +1
(urgent reduced 2→1 because of dying member). resolveFort fires.
Player can buy medicine.

**Verdict: PASS + NEEDS-PLAYTEST visual.** Static-verified: the 5th
button appears in the action bar when `nextUnvisitedFortAhead(w)`
returns a fort with `distance <= 5`. The day cost is computed as
`max(1, ceil(distance/3))` and reduced by 1 (floored at 1) when any
team member is dying. The button calls `doActionMakeForFort(w,
fortInfo, dayCost)` which plays the hooves SFX, calls
`moveWagonToFort(w, fortInfo.position, dayCost)`, then runs
`showOutcomeCallout` → `resolveSpace(w)`. CSS class `.fort-march.urgent`
gives the button a rose-bordered glow when a member is dying. Visual
reproduction:

> Build a wagon. Push to space 7 (or use console:
> `gameState.wagons[0].position = 7`). Drive a member to dying state
> (e.g., Bare Bones rations + Grueling pace, or directly via
> `gameState.wagons[0].team[0].state = 'dying';
> gameState.wagons[0].team[0].state_since_day = 1;`). Look for: a
> 5th button "Make for the Fort" appears on the action bar with
> subtitle "Push hard for Fort Laramie — 3 spaces, +1 day (urgent)";
> the button has a rose border (urgent class). Click it. Audio: low-
> frequency drumbeat of hooves. Modal: "Forced March" with the
> period flavor and outcome line "+1 day, advanced to space 10."
> Continue → fort menu opens for Fort Laramie.

---

## Photo consumer verification

`.test_photo_consumer.js` runs the consumer code path with a 1×1
pink-pixel injection into `window.HISTORICAL_PHOTOS_OVERRIDE`:

```
override map after script run: ["fort_laramie"]
contains <img> with pink-pixel data URL: true
falls back to SVG daguerreotype:         false
Chimney Rock fallback uses SVG:          true
Chimney Rock fallback uses pink pixel:   false
raw-base64 entry gets data: prefix:      true

ALL photo consumer assertions PASS.
```

The v2.3 fix (move declaration to `window.HISTORICAL_PHOTOS_OVERRIDE
= window.HISTORICAL_PHOTOS_OVERRIDE || {}` plus call-time read in
`buildDaguerreotype`) survives v2.4 untouched. Nicholas can run
the updated `fetch_historical_photos.py` (folder-based per the
v2.4 spec note) and the rendered output will reach the consumer
correctly. **No HTML changes required for the photo path.**

---

## Open questions / blockers

1. **JSON US-11 / US-12 entries.** The spec asks me to add the new
   user stories to `simulation_logic_validation.required_user_stories_pre_implementation`.
   The array currently has 10 entries (US-01..US-10). I walked the
   stories through `NOTES_v2.4.md` and validated against the patched
   code, but the JSON wasn't edited. Adding two entries is a small
   data edit; I left it for Nicholas to apply alongside the Stage 1
   commit so that the JSON commit and code commit ship together.
   Suggested entries:

   ```json
   {
     "id": "US-11",
     "story": "Player at space 4 rolls 2d6, gets total 7. Fort Kearney is at space 5 (1 space ahead). Roll would carry them to space 11.",
     "expected": "Dice show 7. Before wagon moves, prompt: 'You see Fort Kearney ahead at space 5. Stop here, or push past?' Player picks Stop. Wagon moves to space 5. Fort menu opens. The 6 forfeited spaces of movement are gone — they cannot be redeemed."
   },
   {
     "id": "US-12",
     "story": "Player at space 7 with a dying Doctor. Fort Laramie at space 10. Action bar shows 'Make for the Fort' button with subtitle 'Push hard for Fort Laramie — 3 spaces, +1 day (urgent).'",
     "expected": "Player clicks. Wagon advances to space 10 directly. Day count increases by 1 (urgent reduced 2→1 because of dying member). resolveFort fires. Fort menu opens. Player can buy medicine, talk to fort doctor, etc."
   }
   ```

2. **Voluntary-stop multi-fort case.** If two unvisited forts lie in
   the path of a single roll (only on Extended trail; rare), the
   prompt fires for the FIRST one. Player can decide about the next
   on a subsequent turn. Documented in `NOTES_v2.4.md`. No spec
   contradiction — the spec specifies prompting for the first one
   forward.

3. **race_to_fort + already-visited fort.** The new
   `nextFortAheadAny` doesn't filter by `forts_visited`. So race_to_fort
   to an already-visited fort is allowed. This is the right behavior
   per the spec's intent ("save a dying member" doesn't care about
   re-visiting), but it does mean a wagon stranded between two
   already-visited forts could still race to one of them with the
   intervention's day cost + +30% recovery bonus.

4. **Move-on-pass-through interaction with surprise events.** v2.4's
   voluntary-stop prompt fires AFTER the dice settle but BEFORE
   `resolveSpace`. Surprise events fire INSIDE `resolveSpace` per
   the existing flow. So a forced march to a fort skips surprise
   events (the wagon teleports). A voluntary-stop run that picks
   "Push Past" goes through resolveSpace normally and may hit a
   surprise. Documented; no spec contradiction.

---

## Confirmation: git autonomy / commits

- **No git commands ran during this build** per Nicholas's standing
  instruction.
- Code is on disk in `pink_oregon_trail.html` plus
  `NOTES_v2.4.md`, `BUILD_REPORT_v2.4.md`, `.test_battery_v2_4.js`,
  `.test_photo_consumer.js` (the last two gitignored).
- No commits were amended. No `--no-verify`. No force-push. No
  history rewrites.

---

## git work pending

For Nicholas to commit. Recommended split keeps the per-stage cadence
established in v2.3.

```
1. feat(v2.4): three-path fort visit system — Issue 1
   files: pink_oregon_trail.html, NOTES_v2.4.md
   summary: nextUnvisitedFortAhead + unvisitedFortInRange + moveWagonToFort
            helpers; voluntary-stop prompt in doActionPushOn after dice
            settle; doActionMakeForFort 5th action button (visibility
            ≤5 spaces, ceil(distance/3) days, -1 if dying min 1);
            hooves SFX; .with-fort-march 5-col grid.
   monte carlo: baseline 0.50 avg / 55.4% zero → with-fix 2.93 / 0.4%.

2. feat(v2.4): race_to_fort actually moves wagon — Issue 2
   files: pink_oregon_trail.html, NOTES_v2.4.md
   summary: nextFortAheadAny helper (no visited filter); early branch
            in resolveInterventionChoice when choice.id === 'race_to_fort'
            calls moveWagonToFort(w, position, 0); arrival narrative
            appended to success and failure narrative cases.

3. chore(v2.4): test battery + build report
   files: BUILD_REPORT_v2.4.md, .test_battery_v2_4.js (gitignored),
          .test_photo_consumer.js (gitignored)
   summary: 32 PASS / 0 FAIL. US-11 and US-12 walked through and
            validated statically. Photo consumer test-pixel injection
            confirms the v2.3 fix works on the v2.4 build.
   optional: same commit can append two entries to
             simulation_logic_validation.required_user_stories_pre_implementation
             in the JSON for US-11 and US-12 (template above).
```

Alternatively all of this can be one squashed `feat(v2.4): fort visits
+ race_to_fort` commit. Per-stage split mirrors v2.3.

`.test_battery_v2_4.js` and `.test_photo_consumer.js` are already
gitignored under `.test_*.js`.

---

## Verdict

Two playtest issues fixed. 32 headless tests pass. Monte Carlo confirms
the math: fort visit rate jumps from 0.50 to 2.93 average per Short
journey, zero-fort journeys drop from 55% to <1%. Race_to_fort now
actually does what the narrative said it did. Photo consumer code path
verified end-to-end with a real pixel.

The single most important next step for Nicholas: in playtest,
confirm the (urgent)-tagged Make-for-the-Fort button feels like the
right safety net for a dying-member scenario, and that the voluntary-
stop modal doesn't disrupt the flow when the team is rolling fast
and doesn't actually want to stop. If either feels off, those are
copy / threshold tunes for v2.5.
