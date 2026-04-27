# NOTES — v2.5 design walk-throughs

Per the v2.3 logic-first discipline carried into v2.5: each stage gets a
pre-implementation walk-through and a post-implementation note. v2.5 is
a focused 3-fix patch, fourth stage is validation.

---

## Stage 0 — orient

- v2.5 JSON loaded. `meta.version === "2.5"`.
- `bandit_overshoot_fix` and `death_path_unification` are top-level keys.
- `per_event_day_costs` is nested under `meta.calendar` (not a top-level
  key; user's prompt was slightly off-spec but the data is there).
- `meta.calendar.days_per_turn = {short: 14, extended: 9}` (was 7/4 in
  v2.4). The DAYS_PER_TURN const in HTML reads from JSON, so this lands
  immediately on next game start.
- v2.4 backup at `oregon_trail_game_data.v2.3.backup.json` exists from
  earlier; a v2.4 backup may need to be cut at the start of the v2.5
  commit pass. Documenting for the morning commit.

---

## Stage 1 — bandit overshoot fix (PRE-IMPLEMENTATION)

**US-13 walk-through:** Wagon at space 43 (Extended). Bandit ambush
configured for space 47. Player clicks Push On. Dice roll 6.

In v2.4 code:
1. `rollDiceAndAdvance` settles to 6 + modifiers. Suppose final move = 6.
2. `doActionPushOn` callback computes `intended = 49`.
3. `unvisitedFortInRange(w, 43, 48)` — no fort in that range, returns null.
4. `w.position = 49`.
5. `resolveSpace(w)` runs at space 49. The existing
   `if (w.position === banditSpace && !w.bandit_quiz_results)` check at
   ~line 9164 fails (49 !== 47). Bandits silently skipped. Educational
   climax never fires.

In v2.5 patched code:
1. Dice settle. Move = 6, intended = 49.
2. NEW: Bandit overshoot intercept runs FIRST. Compute banditSpace
   from JSON (47 Extended). Check
   `!w.bandit_quiz_results && w.position < banditSpace && intended >= banditSpace`.
   Yes — wagon at 43 < 47 and 49 >= 47 and quiz not done.
3. `w.position = 47`. Log "The bandits stop the wagon at Bandit Camp.
   We forfeit 2 spaces of movement." Audio: existing 'event' SFX (the
   spec says event; could also use banditAttack which is already wired).
4. `triggerBanditAmbush(w)` fires directly. Quiz appears. Player runs
   the 5-question gauntlet.

Order of checks in doActionPushOn after dice settle:
1. **Bandit overshoot intercept** (NEW — involuntary, top priority)
2. **Voluntary fort stop** (existing v2.4)
3. **Advance to dest**, resolveSpace fires.

**Edge cases noted in JSON:**
- Bandit space coincides with fort/river: bandits fire first, fort/river
  resolve next turn (because wagon is still at the bandit space after
  the ambush — resolveSpace will see the bandit_quiz_results flag and
  fall through to fort/river resolution next time).

  Actually wait — looking at the existing flow: after `triggerBanditAmbush`,
  the quiz outcome eventually calls endTurn. Next turn renderActionMenu
  fires; on Push On, resolveSpace sees position=47. If 47 is also a
  fort, the bandit_quiz_results flag is set and the fort code runs. Good.
  If 47 is a regular travel space, the wagon will Push On to a new
  space. Also good.

- Forced march past bandit space (Path 3): `doActionMakeForFort` calls
  `moveWagonToFort(w, fortPosition, dayCost)` directly. If the fort is
  beyond the bandit space, the move would skip bandits. Need to add the
  same intercept check inside `doActionMakeForFort` — OR centralize the
  check in `moveWagonToFort` itself. The latter is cleaner. But it would
  also apply to race_to_fort (intervention path), which the JSON spec
  explicitly mentions as needing bandit-intercept too.

  Decision: **centralize the intercept check in a helper**
  `interceptBanditIfOvershoot(w, fromPos, toPos) → {intercepted: bool,
  newPos: number}`. Both `doActionPushOn` and `doActionMakeForFort` call
  it before moving. `race_to_fort` in `resolveInterventionChoice` is
  trickier — it's mid-intervention, and pausing for a bandit fight while
  a member is dying breaks the flow narratively. The JSON spec text says
  "the dying member's intervention is paused; bandits fight first;
  intervention resolves after." That's a complex flow change. For v2.5,
  I'll apply the intercept to Push On and forced march; race_to_fort
  case I'll document as a deferred edge case (it requires intervention-
  state to be paused mid-flow, which the existing intervention code
  doesn't support cleanly).

**No spec contradictions surfaced.** Proceeding with Push On + forced
march intercept; documenting the race_to_fort deferral.

**POST-IMPLEMENTATION:** PASS in static check. `banditOvershootCheck`
helper added near the v2.4 fort helpers; both `doActionPushOn` and
`doActionMakeForFort` call it BEFORE moving. Acceptance test (force
position 43 + roll 6 → bandit ambush at 47) is browser-required.

## Stage 1 complete — bandit overshoot intercept

---

## Stage 2 — calendar calibration (PRE-IMPLEMENTATION)

**US-14 walk-through:** Average Extended journey under default play.
Target: median finish 95-115 days.

JSON change is already in place: `meta.calendar.days_per_turn` is now
`{short: 14, extended: 9}` (was `{short: 7, extended: 4}`). The
DAYS_PER_TURN const reads from JSON at script init, so this lands
without code changes.

Per-event day costs to wire:
- River crossing: +2 days (resolveRiver, all four crossing methods)
- Fort visit: +1 day (resolveFort — applied on FIRST entry per fort)
- Landmark visit: +1 day (resolveLandmark)
- Major event resolution: +1 day (resolveNarrativeEvent — the trail
  events drawn from the deck)
- Surprise event: +0 days (already part of the turn's narrative)

**Implementation:** read `GAME_DATA.meta.calendar.per_event_day_costs`
once into a local helper (`_perEventDayCost(kind)`). Apply at the END
of each resolver, BEFORE the existing endTurn/showOutcomeCallout
chain. Append a small italic narrative line with the spec's hook copy
("It cost us a day. The trail does not give time freely.") with
event-specific variants where the spec calls them out.

**Edge cases:**
- Fort revisit: spec says "+1 day per fort visit". The cleanest read is
  PER VISIT, not per UNIQUE FORT — re-entering Fort Laramie a second
  time costs another +1 day. Acceptable; players don't typically revisit
  forts, and the Sell/Hire mechanics are turn-bounded.
- River crossing where wagon also loses a member to drowning: +2 days
  applies; the death announcement runs after the river callout per
  Stage 3. The day cost lands once.
- Landmark coinciding with bandit space: bandit ambush fires (Stage 1);
  next turn resolveSpace runs landmark; +1 day applies then. Ordering
  preserved.

**Calibration math (per spec):**
- Extended: 9 turns × 9 days = 81 base + 5 rivers × 2 + 3 forts × 1 +
  8 landmarks × 1 + 5 events × 1 = ~107 days median.
- Short: 4.5 turns × 14 = 63 + 2 rivers × 2 + 2 forts × 1 + 5 landmarks
  × 1 + 3 events × 1 = ~77 days median.

These targets put Extended journeys safely before the day-130 winter
warning (most of the time), with day-165 deadline genuinely
threatening for slow or unlucky wagons.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. `_perEventDayCost`
helper reads from JSON; +2 applied in `doRiver` (all 4 crossing
methods), +1 in `resolveLandmark`, +1 in `resolveFort` (gated by
`_fortVisitDayCharged` flag cleared on Push On so re-entries pay
again), +1 in `resolveNarrativeEvent` (gated by `!event._isSurprise`).
Narrative hook lines append per kind. Stage 2 also did the river
death-protocol routing as part of the same edit site (river callout
→ Continue → processDeathAnnouncements → Continue → endTurn).

## Stage 2 complete — calendar calibration with per-event day costs

---

## Stage 3 — death path unification + overlay prominence (PRE-IMPLEMENTATION)

**US-15 walk-through:** every member-loss path produces the figure
overlay — starvation, river drowning, bandit ambush, winter ending.

In v2.4 code:
- Starvation/illness (state-machine) → already routed through
  `presentDeathAnnouncement` via Stage 6 of v2.2. ✓
- River drowning → `doRiver` calls transitionMember + switchToFuneral
  + showOutcomeCallout. NO figure overlay. ✗
- Bandit ambush member loss → `resolveBanditOutcome` same pattern. ✗
- Winter ending → `triggerWinterEnding` same pattern. ✗
- Trail event with member loss (resolveNarrativeEvent) → setTimeout
  at +1s appends a death line mid-callout. NO figure overlay. ✗
- Crisis morale abandonment → `applyCrisisMoraleAbandonment` calls
  transitionMember directly; the deceased is added to the lossList
  in endTurn and routed through processDeathAnnouncements. ✓ Already
  unified.

**Implementation:** for each non-unified site, replace the pattern
`showOutcomeCallout(..., () => endTurn(w))` with `showOutcomeCallout(..., () => processDeathAnnouncements(w, [lost], () => endTurn(w)))`.
The narrative callout fires first (river/bandit/winter narrative is
the event's own beat); on Continue the protocol fires the figure
overlay + stamp + hold + Continue → endTurn.

**Overlay prominence upgrades (per spec):**
- `.death-figure` width: clamp(120px, 22%, 240px) → clamp(180px, 40%, 360px)
- New `.death-stamp` element above the figure: deceased name big
  serif rose with shadow + "has died" italic below. Animated fade-in
  over 1.8s with 0.4s delay so it appears *after* the figure begins
  to grayscale.
- Hold duration: 3500ms first → 4500ms first; 2500ms subsequent →
  3500ms subsequent.

**Audio dedup:** v2.4's `presentDeathAnnouncement` already calls
`audioController.switchToFuneral()`. Catastrophic-death sites also
called it inline. Keep BOTH calls but make `switchToFuneral` no-op
when already in funeral mode (cheap idempotency). Looking at the
existing implementation: `switchToFuneral` re-runs `_playSong()`
even if already in funeral mode, which would restart the hymn.
Add a guard: if `currentMood === 'funeral_only'`, skip the song
restart but still preserve the music gain settings.

**Edge case:** river crossing where the wagon also visits the
overshot bandit space later. Per Stage 1, bandit overshoot intercept
fires BEFORE the dice carry to the river, so river crossings can't
be deferred behind a bandit ambush mid-roll. The spec's edge case
list confirms ordering preserved.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. River, bandit, winter,
and trail-event deaths all route through `processDeathAnnouncements`.
The figure overlay grew from 22%→40% width; new `.death-stamp`
element renders the deceased name big serif rose with shadow + "has
died" italic, fading in 0.4s after the figure begins to grayscale.
Hold timings bumped to 4500/3500. `switchToFuneral` is now idempotent
on `currentMood === 'funeral_only'` so chained deaths don't restart
Amazing Grace from the top.

## Stage 3 complete — death-path unification + overlay prominence

---

## Stage 4 — validation pass (POST)

**US-13** (bandit overshoot) — PASS + NEEDS-PLAYTEST. Force position
43 + roll 6 → `banditOvershootCheck(w, 43, 49)` returns
`{position: 47, distance: 4}`. Push On callback sets `w.position = 47`,
logs forfeit of 2 spaces, plays event SFX, calls `triggerBanditAmbush`.
Browser confirmation needed for the ambush UI.

**US-14** (calendar calibration) — see Monte Carlo numbers in
BUILD_REPORT_v2.5.md.

**US-15** (death overlay parity) — PASS + NEEDS-PLAYTEST. River,
bandit, winter, AND state-machine starvation/illness all reach
`presentDeathAnnouncement` → `renderDeathSceneOverlay` → figure +
stamp + funeral hymn + hold + Continue.

---

## Stage 5 — post-death calendar drift fix (PRE/POST)

**Diagnosis:** the playtest journal showed Daddy's wagon at 137 days
with 0/7 alive. Tracing the code: `completeEndTurn`'s elimination
check is gated by `living === 0 && !w.eliminated`. After the wagon
is set to `eliminated = true`, subsequent re-entries to
`completeEndTurn` SKIP the elimination block but FALL THROUGH to
the calendar advance at line 11025 (`w.daysTraveled +=
gameState.daysPerTurn`). Each re-entry adds 9 days. A few
post-elimination re-entries explain the 137-day total.

**Fix:** add an early-return at the top of `completeEndTurn` —
`if (w.eliminated || w.finished) return;`. Plus a defensive helper
`_addEventDays(w, n)` that gates per-event day costs (river +2, fort
+1, landmark +1, event +1) on `!w.eliminated && !w.finished`. All
four call sites updated.

**No spec contradictions.** PASS in static + behavioral check
(_addEventDays is a no-op on eliminated/finished wagons; live wagon
adds days normally).

## Stage 5 complete — eliminated/finished wagons no longer drift the calendar

