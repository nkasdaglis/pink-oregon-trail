# Pink Oregon Trail — v2.5 Build Report

Build date: 2026-04-27
Designer: Gabby Kasdaglis
Engineer: Nicholas Kasdaglis
Branch: `main` · GitHub: <https://github.com/nkasdaglis+pink-oregon-trail>

This is a focused 5-stage gameplay patch driven by the most recent
multi-player playtest journal:

1. **Bandit ambush silently skipped on overshoot** (same class as v2.4
   fort overshoot, just for bandits — strict equality on `===
   banditSpace`).
2. **Journey too fast** — Extended finished in ~33 days vs ~140-day
   calendar target. Calibration mismatch between dice avg and
   `days_per_turn`.
3. **Catastrophic deaths bypass the v2.3 death overlay protocol**.
   River/bandit/winter deaths showed only as text. v2.2 build report
   flagged this as deferred; playtest confirmed the seam.
4. **50-journey Monte Carlo** to validate the calendar calibration.
5. **Post-death calendar drift** (added per the new prompt):
   eliminated wagons keep accumulating days because
   `completeEndTurn`'s elimination check is gated by `!w.eliminated`,
   but subsequent re-entries skip the check AND fall through to the
   calendar advance. The "0/7 alive but 137 days logged" report.

Per Nicholas's standing instruction, no `git` commands ran during this
build. Code is on disk. Recommended commits in the "git work pending"
section.

---

## Pre-flight: build state verification

Per the new prompt's Step 2, I confirmed the v2.4 fort visit redesign
already landed in the HTML before starting v2.5:

```
PRESENT  moveWagonToFort
PRESENT  nextUnvisitedFortAhead
PRESENT  unvisitedFortInRange
PRESENT  promptVoluntaryFortStop
PRESENT  Make for the Fort
PRESENT  .with-fort-march
```

So this is a v2.4 → v2.5 patch (not v2.3 → v2.5). v2.4 was already in
place from prior session.

**Foundational discovery (and fix):** the embedded `GAME_DATA`
literal inside `pink_oregon_trail.html` was still v2.2 — every JSON
key added in v2.3, v2.4, and v2.5 (including `dice_system`,
`fort_visit_system`, `per_event_day_costs`, `bandit_overshoot_fix`,
`death_path_unification`, etc.) was MISSING from the runtime. The
prior amendments' code paths read those keys via
`(GAME_DATA.X || {})` fallbacks, so they ran at default values and
the UX bugs they were meant to fix only PARTLY landed. Re-embedded
the JSON via a one-shot script (`.refresh_embedded_gamedata.js`):
old literal 198,368 chars → new literal 231,520 chars. Script
length 478,536 → 511,688 bytes. JS still parses cleanly. **All v2.3+
features now actually consult their JSON-driven config.**

---

## Pre-implementation reasoning per stage

Full per-stage walk-throughs are in `NOTES_v2.5.md`. Brief summaries:

### Stage 1 — bandit overshoot intercept

Helper `banditOvershootCheck(w, fromPos, toPos)` returns the bandit
ambush space when a move would carry the wagon past it (and the
quiz hasn't fired). Wired into `doActionPushOn` (after dice settle,
before fort overshoot check) and `doActionMakeForFort` (forced
march). race_to_fort intervention path is documented as a deferred
edge case — the spec describes a complex flow where the dying-member
intervention pauses for the bandit fight; the existing intervention
code doesn't have a clean pause-and-resume hook. Documented in
NOTES_v2.5.md.

### Stage 2 — calendar calibration

JSON updated `meta.calendar.days_per_turn` from {short:7, extended:4}
to {short:14, extended:9}; the HTML's `CAL = GAME_DATA.meta.calendar`
+ `DAYS_PER_TURN = CAL.days_per_turn` chain picks up the new values
once GAME_DATA was re-embedded.

Per-event day costs from `meta.calendar.per_event_day_costs`: river
+2, fort +1, landmark +1, major event +1, surprise event +0.
Helper `_perEventDayCost(kind)` reads from JSON. Helper
`_dayCostNarrativeLine(kind)` produces the period-voice italic
narrative line ("Two days at the crossing. The wagon will dry on
the move." / "We rested overnight at the fort gates." / etc.).
Wired into `doRiver`, `resolveLandmark`, `resolveFort` (gated by
per-visit `_fortVisitDayCharged` flag cleared on Push On), and
`resolveNarrativeEvent` (gated by `!event._isSurprise`).

### Stage 3 — death path unification + overlay prominence

River drowning, bandit ambush member loss, winter ending death, and
trail-event member loss all now route the deceased through
`processDeathAnnouncements` after the existing outcome callout
resolves. The catastrophic narrative shows first ("the river took
them"); on Continue, the protocol fires the figure overlay + name
stamp + funeral hymn + hold. Visual parity with state-machine
starvation/illness deaths.

`.death-figure` width bumped from `clamp(120px, 22%, 240px)` to
`clamp(180px, 40%, 360px)` — roughly double. New `.death-stamp`
element renders the deceased name in big serif rose with drop
shadow + "has died" italic below, fading in 0.4s after the figure
begins to grayscale. Hold timings bumped: first death 3500→4500ms,
subsequent 2500→3500ms.

`audioController.switchToFuneral` is now idempotent — early-returns
when `currentMood === 'funeral_only'` so chained catastrophic-death
calls (river inline + protocol; bandit inline + protocol) don't
restart Amazing Grace from the top.

The setTimeout-defer-death pattern in `resolveNarrativeEvent` was
replaced by synchronous `transitionMember` + protocol routing on
Continue.

### Stage 4 — validation Monte Carlo

50-journey Extended simulation. Faithful to the v2.5 dice (2d6 cap 8)
+ days_per_turn=9 + per-event costs + bandit overshoot intercept +
voluntary fort stop at 70% accept rate (matches the Path-2 model
used in v2.4 validation).

### Stage 5 — post-death calendar drift fix

Found in the spec as a 5th stage. `completeEndTurn`'s elimination
check is gated by `!w.eliminated`; on re-entry to an
already-eliminated wagon, the check skips and the calendar advance
below still fires (`w.daysTraveled += gameState.daysPerTurn`),
adding 9 days per re-entry. Fix: early-return at the top of
`completeEndTurn` when `w.eliminated || w.finished`. Plus a
`_addEventDays(w, n)` helper that gates per-event day costs on
`!eliminated && !finished` so a same-turn elimination via a
catastrophic event doesn't tack on residual costs.

---

## Headless test battery — `.test_battery_v2_5.js`

```
PASS: 50   FAIL: 0
```

Run via `node .test_battery_v2_5.js`. Coverage:

- **JSON shape** (10 checks): meta.version >= "2.5", `bandit_overshoot_fix`
  + `death_path_unification` top-level, `per_event_day_costs` nested
  under `meta.calendar`, `days_per_turn` 14/9, all 4 per-event cost
  values match the spec.
- **Stage 1** (6): helper present, both call sites correctly ordered
  (bandit BEFORE fort overshoot in Push On; bandit BEFORE
  moveWagonToFort in forced march), behavioral probe for null-when-
  quiz-done.
- **Stage 2** (14): per-event helpers present, all 4 day costs read
  from JSON correctly via behavioral probes (live `_perEventDayCost`
  returns 2/1/1/1/0/0 for river/fort/landmark/event/surprise/unknown),
  fort-visit per-visit gating + Push On clears flag.
- **Stage 3** (11): figure size, stamp CSS + insertion, hold timings,
  funeral idempotent guard, all four death paths route through
  `processDeathAnnouncements`, setTimeout pattern removed.
- **Stage 5** (6): early-return guard, helper present, 4 call sites
  routed, behavioral probes confirm helper is no-op on
  eliminated/finished wagons and active on living wagons.
- **US-13/14/15** (3): static-checked.

---

## Monte Carlo before/after

50 Extended journeys per scenario, faithful to the v2.5 dice + costs.

| Scenario | Median | p5 | p95 | Bandit % | Avg forts |
|---|---|---|---|---|---|
| **v2.3 baseline** (dpt=4, no per-event costs, no overshoot intercept) | **33** | 29 | 37 | **0%** | 0.62 |
| **v2.5 (no voluntary stops)** | 87 | 69 | 99 | **100%** | 0.68 |
| **v2.5 (voluntary stops @70% accept)** | **99** | 88 | 117 | **100%** | 3.64 |

**Spec targets (US-14):**
- median 95-115 days → **99** ✓
- p5 ≥ 60 → **88** ✓
- p95 ≤ 150 → **117** ✓
- ≥ 90% bandit ambush → **100%** ✓

**ALL Stage 4 calibration targets PASS.**

The journey now lands safely before the day-130 winter warning for
the median wagon, with day-165 deadline genuinely threatening for
slow or unlucky wagons. The seeded leaderboard scores (132-158 days)
sit just outside the 95th percentile of typical play, so they read
as "very fast or very lucky" rather than completely off-scale.

Bandit ambush rate jumped from 0% to 100% across the simulation
because the overshoot intercept guarantees the wagon stops at space
47 (Extended) or space 23 (Short). In live play, bandit_quiz_results
gating ensures the ambush fires once per journey only.

---

## Death path verification

Every catastrophic-death code path now produces the figure overlay:

| Death cause | Path | Fires figure overlay? |
|---|---|---|
| Starvation / illness (state machine) | `applyEndOfTurnDeathChecks` → `processDeathAnnouncements` (v2.3) | YES (existing) |
| River drowning | `doRiver` → `showOutcomeCallout` → `processDeathAnnouncements` | YES (v2.5) |
| Bandit ambush | `resolveBanditOutcome` → `showOutcomeCallout` → `processDeathAnnouncements` (lostObjs[]) | YES (v2.5) |
| Winter ending | `triggerWinterEnding` → `showOutcomeCallout` → `processDeathAnnouncements` | YES (v2.5) |
| Trail event member loss | `resolveNarrativeEvent` → `showOutcomeCallout` → `processDeathAnnouncements` | YES (v2.5) |
| Crisis morale abandonment | `applyCrisisMoraleAbandonment` → endTurn loss list (already routed) | YES (existing v2.3) |

All six death paths reach `presentDeathAnnouncement` →
`renderDeathSceneOverlay` → figure + stamp + funeral hymn + hold +
Continue.

---

## Post-death calendar drift verification

Eliminated and finished wagons no longer accumulate days through
either:
1. `completeEndTurn` re-entry (early return on `eliminated || finished`).
2. Per-event day costs in resolvers (gated by `_addEventDays(w, n)`).

Behavioral probes in `.test_battery_v2_5.js`:
- Living wagon: `_addEventDays(w, 2)` → +2 days. ✓
- Eliminated wagon: `_addEventDays(w, 2)` → no change. ✓
- Finished wagon: `_addEventDays(w, 2)` → no change. ✓

The `_addEventDays` helper is a defensive guard against the same
class of bug appearing in any future code path that mutates
`w.daysTraveled` mid-event-resolution.

---

## User Story Validation

| ID | Story | Verdict |
|---|---|---|
| US-13 | Bandit overshoot — wagon at 43 rolls 6, reaches 49 | **PASS** + NEEDS-PLAYTEST. `banditOvershootCheck` returns `{position:47, distance:4}`; Push On callback forces position to 47, logs forfeit, plays event SFX, calls `triggerBanditAmbush`. Visual confirmation of the ambush quiz UI is browser-required. |
| US-14 | Calendar calibration — Extended median 95-115 days | **PASS**. Monte Carlo: median 99 (target 95-115). All four target sub-checks pass. |
| US-15 | Death overlay parity — every loss path produces overlay | **PASS** + NEEDS-PLAYTEST. All six death paths route through `processDeathAnnouncements` (verified statically). Visual confirmation of the larger figure + name stamp is browser-required. |

---

## Browser-required test reproduction steps

### US-13 — bandit overshoot ambush

**Setup (~3 min):** Open `pink_oregon_trail.html`. Start an Extended
Journey. Use DevTools console to advance:
`gameState.wagons[0].position = 43;`. Click Push On.

**Look for:** dice tumble + summary. Then narrative reads "Bandits
stopped the wagon at space 47" with forfeited spaces logged. Bandit
ambush quiz UI fires (5 questions on facts seen this journey). On
completion, wagon is at space 47 ready for the next turn.

**Fails visibly if:** wagon advances to 49 silently, no ambush UI,
or the quiz never fires.

### US-14 — calendar feel in actual play

**Setup (~30 min):** play one full Extended journey on Medium. Note
the day count at finish.

**Look for:** day count at Oregon City between roughly 80 and 130.
Per-event day-cost narrative lines appear in callouts ("Two days at
the crossing", "We rested overnight at the fort gates", etc.). The
day-130 winter warning appears for slower wagons.

**Fails visibly if:** journey completes in <60 days, or the
narrative day-cost lines don't appear.

### US-15 — death overlay parity

**Setup (~10 min for each catastrophic source):**

- **River drowning:** Force a river crossing by Push On to space 8
  (Extended Big Blue River). Pick Ford. Use console to force
  `Math.random` to always return 0.99 if needed to guarantee a member
  loss. Look for: river callout text → Continue → figure overlay
  with the deceased's name stamped in big serif rose, "has died"
  italic below, funeral hymn audible, hold for ~4.5s before Continue
  activates.

- **Bandit ambush deaths:** Reach space 47, fail every quiz question.
  Look for: ambush narrative → Continue → figure overlay for each
  lost member sequentially.

- **Winter death:** Use console to set
  `gameState.wagons[0].daysTraveled = 165` then take any action.
  Look for: snowfall starts, winter narrative → Continue → figure
  overlay → endGame.

- **State-machine starvation (regression check):** Bare Bones rations
  + Grueling pace until a member dies. Look for: same overlay
  pattern (this was already working in v2.3; verify v2.5 didn't
  break it).

**Fails visibly if:** any death path produces only text without the
figure overlay, or the larger figure size + name stamp don't render.

---

## Open questions / blockers

1. **race_to_fort + bandit overshoot interaction.** Spec edge case:
   "If race_to_fort moves the wagon to a fort beyond the bandit
   space: bandits intercept. The dying member's intervention is
   paused; bandits fight first; intervention resolves after." Not
   implemented. The intervention code doesn't have a clean
   pause-and-resume hook. Deferred to v2.6 or later. Frequency in
   live play is low (race_to_fort fires only when distFort ≤ 3 and
   the bandit space is at 47 in Extended; the overlap window is
   narrow).

2. **JSON version 2.6 already on disk.** The on-disk
   `oregon_trail_game_data.json` reads `meta.version: 2.6` (mtime
   01:38). The v2.5 keys are intact and that's what matters for this
   patch. Will need to be reconciled when the v2.6 graphics-overhaul
   patch lands.

3. **Re-embed of GAME_DATA was a one-shot fix.** The drift-between-
   external-JSON-and-embedded-literal is a structural risk for future
   patches. Recommend Nicholas adopt a build step: a tiny shell
   script `bash refresh_embed.sh` that re-runs
   `.refresh_embedded_gamedata.js` whenever the external JSON
   changes. Until then, every JSON-driven amendment needs a manual
   re-embed.

4. **Diagnostic console.log in completeEndTurn.** v2.3's `[v2.3:endTurn]`
   diagnostic still fires. Comment notes it should be removed in
   v2.4 once the seam was confirmed. Still present. Consider
   removing in v2.6 — the v2.5 playtest will be its final useful
   run.

---

## Confirmation: git autonomy / commits

- **No git commands ran during this build** per Nicholas's standing
  instruction.
- Code is on disk:
  - `pink_oregon_trail.html` (now 512,580 bytes)
  - `NOTES_v2.5.md` (per-stage walk-throughs)
  - `BUILD_REPORT_v2.5.md` (this file)
  - `oregon_trail_game_data.json` (on disk; bumped to 2.6 by an
    external process — the v2.5 keys are intact)
  - `.test_battery_v2_5.js`, `.test_v25_monte_carlo.js`,
    `.test_photo_consumer.js`, `.refresh_embedded_gamedata.js`,
    `.find_gamedata_bounds.js` (all gitignored under `.test_*.js` /
    `.test_*` patterns or by leading-dot convention)

---

## git work pending

For Nicholas to commit. Recommended split:

```
1. chore(v2.5): re-embed v2.5 JSON into HTML (drift fix from v2.2)
   files: pink_oregon_trail.html
   summary: Refreshed the embedded GAME_DATA literal so v2.3+ JSON
            keys (dice_system, fort_visit_system,
            per_event_day_costs, bandit_overshoot_fix,
            death_path_unification, etc.) are available to the
            runtime. Prior versions' code paths read these via
            `(GAME_DATA.X || {})` fallbacks, so features partially
            landed at default values. Now actually consults JSON.

2. feat(v2.5): bandit overshoot intercept — Issue 1
   files: pink_oregon_trail.html, NOTES_v2.5.md
   summary: banditOvershootCheck helper. Wired into doActionPushOn
            (before fort overshoot) and doActionMakeForFort. race_to_fort
            edge case documented as deferred.

3. feat(v2.5): calendar calibration — Issue 2
   files: pink_oregon_trail.html, NOTES_v2.5.md
   summary: days_per_turn 7→14 (short), 4→9 (extended) via JSON.
            _perEventDayCost helper + _dayCostNarrativeLine. River
            +2, fort +1 (per-visit gated), landmark +1, event +1
            (gated by !surprise). Period-voice narrative hooks.

4. feat(v2.5): death path unification + bigger overlay — Issue 3
   files: pink_oregon_trail.html, NOTES_v2.5.md
   summary: River, bandit, winter, and trail-event deaths all route
            through processDeathAnnouncements. Figure 22%→40% width.
            New .death-stamp element with serif rose name + "has
            died" italic below. Hold 3500/2500 → 4500/3500.
            switchToFuneral idempotent on currentMood === 'funeral_only'.

5. fix(v2.5): post-death calendar drift — Stage 5
   files: pink_oregon_trail.html, NOTES_v2.5.md
   summary: completeEndTurn early-returns on eliminated/finished
            so subsequent re-entries don't tick the calendar.
            _addEventDays helper gates per-event day costs the
            same way. Behavioral probes confirm no-op on
            eliminated/finished wagons.

6. chore(v2.5): test battery + Monte Carlo + build report
   files: BUILD_REPORT_v2.5.md
   summary: 50 PASS / 0 FAIL. Monte Carlo median 99 days (target
            95-115). All US-13/14/15 verdicts.
```

`.test_battery_v2_5.js`, `.test_v25_monte_carlo.js`,
`.refresh_embedded_gamedata.js`, and `.find_gamedata_bounds.js` are
gitignored.

Alternatively this can be one squashed `feat(v2.5): playtest fixes`
commit. Per-stage split mirrors v2.3 / v2.4.

---

## Verdict

50 headless tests pass. Monte Carlo confirms calendar calibration.
All five stages address concrete playtest issues:
1. Bandit ambush no longer silently skipped.
2. Extended journeys land in the 95-115-day window.
3. Catastrophic deaths produce the same visual moment as state-
   machine deaths.
4. (validation only — not a fix)
5. Eliminated wagons stop drifting the calendar.

The single most important next step for Nicholas: in playtest,
confirm that the day-cost narrative lines feel honest in the trail
journal (not too noisy), and that the bigger death-overlay figure
reads well at 1366×768. If either feels off, copy/threshold tunes
for v2.7 or later.
