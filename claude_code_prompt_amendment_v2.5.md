# Pink Oregon Trail — v2.5 Amendment

## Context

A 4-player playtest produced a Trail Journal showing three issues that warrant a focused patch:

1. **Bandit ambush silently skipped on overshoot.** The trigger condition uses strict `===` equality on the configured bandit space (47 Extended, 23 Short). Any wagon whose dice carry it past that space without landing exactly on it gets a free pass — the climactic educational content (quiz drawn from facts shown along the trail) never fires. Same root cause as the v2.4 fort overshoot bug, just for bandits.

2. **Journey is dramatically too fast.** The playtest wagon finished the Extended trail in 33 days. The seeded leaderboard scores complete in 132-158 days. The dice (2d6 capped at 8, ~5.5 effective avg move) and the calendar (`days_per_turn` = 4 for Extended) were set up under different assumptions and never reconciled. Winter pressure is meaningless if everyone finishes 100 days early.

3. **Member deaths not visually displayed for catastrophic causes.** The v2.3 death announcement protocol with the figure overlay fires correctly for natural-progression deaths (state-machine starvation/illness). But catastrophic deaths from river drowning, bandit ambush, and winter ending bypass the protocol — they use the older `showOutcomeCallout` flow without any figure overlay. The v2.2 build report called this out explicitly as a deferred item; playtest confirmed the seam.

JSON has been updated to v2.5. New top-level keys: `per_event_day_costs`, `bandit_overshoot_fix`, `death_path_unification`. Confirm `meta.version === "2.5"` before starting.

## Build order

1. **Stage 1** — Bandit overshoot fix (smallest change, validates approach)
2. **Stage 2** — Calendar calibration (days_per_turn + per-event day costs)
3. **Stage 3** — Death path unification + overlay prominence upgrade
4. **Stage 4** — Validation: simulate 50 Extended journeys, verify avg ~100-130 days, verify ≥80% of journeys hit bandits, verify all death paths produce overlay

Standing instructions still apply: no git commits during build, append "git work pending" to build report, work autonomously, maintain NOTES_v2.5.md with pre-implementation walk-throughs.

---

# Stage 1 — Bandit overshoot fix

## Diagnosis

Code at `pink_oregon_trail.html` line 9164:

```javascript
const banditSpace = gameState.trailLength === 'short' 
  ? GAME_DATA.bandit_ambush.trigger_space_short 
  : GAME_DATA.bandit_ambush.trigger_space_extended;
if (w.position === banditSpace && !w.bandit_quiz_results) return triggerBanditAmbush(w);
```

The `===` is the bug. Wagon at space 43 rolls 6, advances to 49. Bandit space is 47. Strict equality fails. Bandits never seen.

## Fix

Two parts:

**Part A: in doActionPushOn**, after dice settle but BEFORE setting `w.position`, check whether the move would carry the wagon past the unvisited bandit space. If yes, set position to the bandit space and fire the ambush directly (forfeiting unused movement — bandits are forcing the stop, not the player).

```javascript
// Pseudocode — adapt to existing structure
const dest = Math.min(gameState.trailEnd, w.position + move);
const banditSpace = gameState.trailLength === 'short' 
  ? GAME_DATA.bandit_ambush.trigger_space_short 
  : GAME_DATA.bandit_ambush.trigger_space_extended;

// Check: would this move carry past unvisited bandit space?
if (!w.bandit_quiz_results && w.position < banditSpace && dest >= banditSpace) {
  w.position = banditSpace;
  logToWagon(w, 'The bandits stop the wagon at ' + banditSpace + '. ' + 
                (dest > banditSpace ? 'We forfeit ' + (dest - banditSpace) + ' spaces of movement.' : ''));
  audioController.playSfx('event');
  return triggerBanditAmbush(w);
}
// Otherwise normal flow: voluntary fort stop check, then set position, then resolveSpace
```

**Part B: in resolveSpace**, the existing `=== banditSpace` check stays as-is (it handles the case where dice land exactly on the bandit space). The doActionPushOn check above handles the overshoot case. Both paths converge on `triggerBanditAmbush`.

## Order of checks in doActionPushOn

After dice settle, BEFORE moving the wagon, check in this order:

1. **Bandit overshoot intercept** (involuntary — bandits force the stop)
2. **Voluntary fort stop** (existing v2.4 — player chooses to stop)
3. **Wagon advances to destination**, resolveSpace fires

Bandits take precedence over voluntary fort stop because if the bandit space and a fort space are both in the path, the bandits are blocking the trail and have to be dealt with first. Edge case: if bandit space and a fort happen to be the same space, the bandit ambush fires first, then on the next turn resolveSpace fires the fort menu (because the wagon is still standing there).

## Acceptance test

Force a wagon to position 43 (Extended), trigger Push On with a roll of 6. Expected: dice show 6, narrative says "The bandits stop the wagon at space 47," ambush quiz fires, all 5 questions ask. After resolution wagon is at space 47 ready to continue next turn.

---

# Stage 2 — Calendar calibration

## Diagnosis

Playtest journey: 33 days for Extended (50 spaces). Seeded benchmarks: 132-158 days. The journey is 4x faster than the calendar implies. Winter pressure (day 130 warning, day 165 deadline) never reaches the player.

Cause: `days_per_turn` set to 4 for Extended. With dice averaging 5.5 effective spaces/turn, a Extended journey takes ~9 turns × 4 days = 36 days. Number was sized assuming ~25-30 turns per journey, but dice produce 7-10.

## Fix

**A. Bump `days_per_turn`.** JSON updated:
- Short: 7 → 14
- Extended: 4 → 9

**B. Add per-event day costs.** When events resolve, they consume calendar time:
- River crossing: +2 days (real wagons spent multiple days at major rivers)
- Fort visit: +1 day (overnight stay implied)
- Landmark visit: +1 day (the team stops to look, photograph, sketch)
- Major event resolution: +1 day (the day was disrupted)
- Surprise event: +0 days (already part of the turn's narrative)

These costs apply AFTER the event resolves, BEFORE the next Push On. Implementation: in each `resolveX` function (resolveFort, resolveRiver, resolveLandmark, resolveTravel/event-firing), add `w.daysTraveled += COST` immediately before transitioning to the next action menu.

JSON has the costs in `meta.calendar.per_event_day_costs`. Read from there at call sites.

**C. Narrative hook.** Append to event resolution callouts a small italic line: *"It cost us a day. The trail does not give time freely."* (Variants OK — vary by event type. River: "Two days at the crossing. The wagon will dry on the move." Fort: "We rested overnight at the fort gates.")

## Calibration math

Typical Extended journey under v2.5:
- 9 turns × 9 days = 81 days base
- 5 rivers × 2 = 10 days
- 3 forts × 1 = 3 days (with v2.4 fort visit improvements)
- 8 landmarks × 1 = 8 days
- 5 events × 1 = 5 days
- **Total: ~107 days**

Typical Short journey:
- 4.5 turns × 14 days = 63 days base
- 2 rivers × 2 = 4 days
- 2 forts × 1 = 2 days
- 5 landmarks × 1 = 5 days
- 3 events × 1 = 3 days
- **Total: ~77 days**

For Extended, this puts the typical journey safely before the day-130 winter warning, with day-165 deadline genuinely threatening for slow or unlucky wagons. For Short, the journey is shorter narratively but the winter clock provides gentle background pressure.

## Validation

In Stage 4, run a Monte Carlo of 50 Extended journeys and report the distribution of finish days. Target: median 95-115, 95th percentile 130-150, no journeys finishing in <60 days.

---

# Stage 3 — Death path unification + overlay prominence

## Diagnosis

`presentDeathAnnouncement` correctly renders the figure overlay, funeral hymn, and 2.5-3.5s hold. But it ONLY fires for natural-progression deaths through the v2.3 state machine pipeline. Catastrophic deaths bypass it:

- **River drowning** (`resolveRiver` → `doRiver` function): calls `transitionMember(lost, 'lost', 'river')` and `audioController.switchToFuneral()` directly, then `showOutcomeCallout` with the river narrative. No figure overlay.
- **Bandit ambush deaths** (`resolveBanditOutcome`): same pattern. No figure overlay.
- **Winter ending death**: same pattern.
- **Morale crisis abandonment** (v2.3 — when morale ≤ 1 and a member quits): unclear if this routes through the protocol. Verify.

Players see catastrophic deaths only as journal text. The visual moment the protocol was designed to create never happens for them.

## Fix

**Part A: route catastrophic deaths through the protocol.**

For each catastrophic-death code site, replace this pattern:

```javascript
transitionMember(lost, 'lost', w.daysTraveled, cause);
audioController.switchToFuneral();
showOutcomeCallout('Title', html_with_river_narrative, () => endTurn(w));
```

With this:

```javascript
transitionMember(lost, 'lost', w.daysTraveled, cause);
showOutcomeCallout('Title', html_with_river_narrative, () => {
  // After the river-narrative callout, route the deceased through the protocol
  processDeathAnnouncements(w, [lost], () => endTurn(w));
});
```

The river/bandit/winter narrative still shows first (its own narrative beat — "the river took them"). On Continue click, the protocol fires for that member: figure overlay, funeral hymn (if not already playing), prominent "X has died" stamp, hold, then second Continue → endTurn.

**Part B: increase overlay prominence.**

Update `.death-figure` CSS:
- `width: clamp(180px, 40%, 360px)` (was 22%) — roughly doubles the figure size
- Add a `.death-stamp` element above the figure with the deceased's name and "has died" or "is lost" in a large serif font, deep rose, with drop shadow

Update hold timings in `presentDeathAnnouncement`:
- First death of journey: 4500ms (was 3500)
- Subsequent deaths: 3500ms (was 2500)

Add `.death-stamp` rendering inside `renderDeathSceneOverlay`:

```javascript
const stamp = el('div', { class: 'death-stamp',
  html: '<div class="death-stamp-name">' + escapeHtml(deceased.name) + '</div>' +
        '<div class="death-stamp-suffix">has died</div>' });
overlay.appendChild(stamp);
```

CSS for stamp:
```css
.death-stamp {
  position: absolute;
  left: 50%; top: 8%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 51;
  opacity: 0;
  animation: deathStampFade 1.8s ease-in 0.4s forwards;
}
.death-stamp-name {
  font-family: Georgia, serif;
  font-size: clamp(28px, 4vw, 56px);
  font-weight: 700;
  color: #B85770;
  text-shadow: 2px 2px 8px rgba(0,0,0,0.5);
  letter-spacing: 0.05em;
}
.death-stamp-suffix {
  font-family: Georgia, serif;
  font-style: italic;
  font-size: clamp(18px, 2.5vw, 32px);
  color: #FBF6F0;
  text-shadow: 1px 1px 6px rgba(0,0,0,0.7);
  margin-top: 8px;
}
@keyframes deathStampFade {
  from { opacity: 0; transform: translate(-50%, -10px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}
```

**Part C: don't double-trigger funeral hymn.**

Track `audioController.musicMode === 'funeral'` and don't call `switchToFuneral()` if already in funeral mode. The first death triggers the music switch; subsequent deaths reuse the existing funeral. (The hymn auto-fades back to mood pool after some duration — verify that timer survives chained deaths.)

## Acceptance test

Force a river drowning (set ford failure to 100%, send a wagon across). Expected sequence:
1. River narrative callout: "{name} was lost in the crossing. The river took them." (existing)
2. Player clicks Continue
3. Death overlay appears: figure (large, grayscaled), prominent "{name} has died" stamp, funeral hymn playing
4. Hold 4.5s for first death, 3.5s for subsequent
5. Player clicks Continue → endTurn

Repeat for bandit deaths (force quiz score 0) and winter ending (advance to day 165 without finishing).

---

# Stage 4 — Validation

Run a Monte Carlo of 50 Extended journeys with default Medium difficulty:

```javascript
function simulateExtendedJourney() {
  // Use the actual game logic (not a simplified model — we want true behavior)
  // For each journey, log:
  //   - days to finish (or "winter died" if hit deadline)
  //   - forts visited
  //   - bandit ambush occurred (yes/no)
  //   - members lost
  //   - members lost via overlay-bypassed path (should be 0 after Stage 3)
}
```

Report:
- Median days to finish (target: 95-115)
- 5th / 95th percentile (target: 5th ≥ 60, 95th ≤ 150)
- % of journeys with bandit ambush (target: ≥ 90% — accounts for some not reaching the bandit space due to early elimination)
- % of journeys with at least one death (target: 50-65%)
- Per-death-path counts: state-machine, river, bandit, winter — all should now route through `presentDeathAnnouncement`

Add user stories US-13, US-14, US-15 to JSON `simulation_logic_validation`:

- **US-13 (bandit overshoot)**: Wagon at space 43, rolls 6. Expected: bandits stop wagon at 47, ambush fires, quiz appears.
- **US-14 (calendar calibration)**: Average extended journey under default play. Expected: median finish 95-115 days.
- **US-15 (death overlay parity)**: River drowning, bandit death, winter death, starvation death — all four produce the figure overlay with stamp.

---

# Notes for Nicholas to read in the morning

The "Member 1, Member 2..." labels in the Trail Journal aren't a bug — that's the default fallback for unnamed team members. Players are skipping the naming step. Worth a small UX nudge in a future patch (a tooltip prompt: "Name your team — they will appear in your story when the journey is done") but not urgent.

The four "Intervention failed: continue_full_pace" entries are strategic learning, not a bug. Player kept picking the riskiest free intervention option because it costs 0 days. The 10% recovery rate caught up with them. The system is teaching that intervention requires real investment.

The seeded leaderboard scores (132-158 days) will now be in roughly the same range as actual Extended journeys (95-150 days), making the leaderboard feel comparable. Short journeys will still be much shorter (~75 days), which is intentional — Short is a different format.

# Critical reminders (unchanged)

- Single self-contained HTML file. No frameworks.
- No git commits during build. Append "git work pending" to build report.
- Period 1840s voice for narration.
- No words "AI", "Claude", "GPT", "LLM", "model", "agent", "chatbot" in user-facing text.
- Preserve all v2.4 mechanics (three fort paths, race_to_fort moves wagon, hover tooltips, etc.).

This should be a focused 1-2 hour build. The bandit fix is small. The calendar adjustment is mostly JSON-driven with helper insertion. The death unification is the largest piece — touches three or four code paths but follows a clean pattern.

---

# Stage 5 — Post-death calendar drift (Issue 4 — added in v2.5 review)

## Diagnosis

Playtest leaderboard showed two anomalies:

```
Daddy (Daddy's Wagon)    0 of 7 alive    137 days
Matthew (Matthew's Wagon) 0 of 7 alive    154 days
```

Both wagons ended with all 7 members dead but logged journeys of 137 and 154 days. The elimination check in `completeEndTurn` exists, but it runs AFTER `w.daysTraveled += gameState.daysPerTurn`. So when the last member dies in a catastrophic event (river drowning, bandit ambush, morale-crisis abandonment), the resulting `endTurn` flow advances the calendar one more turn before the elimination check fires. In Competitive mode with rotation across multiple wagons, this drift compounds — a wagon waiting for its turn to come around again can accumulate several extra days while in zombie state.

The elimination logic is correct in principle; the ORDER of operations is wrong.

## Fix

Three small changes:

**Part A: in `completeEndTurn`, move elimination check BEFORE the days_traveled increment.**

Current shape (paraphrased):
```javascript
function completeEndTurn(w) {
  if (livingMembers(w).length === 0 && !w.eliminated) {
    w.eliminated = true;
    return showEliminationScene(w);
  }
  // ... finish check ...
  // ... day milestone chimes ...
  w.daysTraveled += gameState.daysPerTurn;
  // ... winter check ...
}
```

The elimination check IS before the days increment. So this isn't where the bug is. Look harder — likely the bug is:

**Part B: in catastrophic-death paths (resolveRiver doRiver, resolveBanditOutcome, triggerWinterEnding, morale-crisis abandonment), the elimination check is missing entirely.**

These paths call `transitionMember(...)` and then `showOutcomeCallout(..., () => endTurn(w))`. `endTurn` runs the v2.3 escalation pipeline (warnings, intervention, death announcement, then completeEndTurn). The elimination check at the top of completeEndTurn fires correctly — but only for that wagon's NEXT scheduled completion. In the meantime, the river-narrative callout has already advanced the day display in some cases, or the music has already moved on, or the leaderboard timer thinks the journey is still in progress.

The cleanest fix: after every catastrophic `transitionMember(lost)` call, check elimination synchronously. If `livingMembers(w).length === 0`, set `w.eliminated = true` and `w.causeOfElimination = cause` and `w.eliminatedOnDay = w.daysTraveled` IMMEDIATELY, before the callout fires. Then the callout knows the wagon is eliminated and the chain naturally terminates.

**Part C: the leaderboard / journal write should use `w.eliminatedOnDay` (a new field set at synchronous elimination time) rather than `w.daysTraveled`** for eliminated wagons. This way, even if some downstream code drifts the day count, the recorded elimination day stays accurate.

## Acceptance test

Force a scenario: 4-player Competitive game, set 6 of 7 members in wagon 1 to lost state, with the 7th member in dying state. Trigger a river crossing on wagon 1's turn with 100% drown rate. Expected: wagon 1's last member transitions to lost on day N, river-narrative callout shows, then death overlay protocol fires, then elimination scene fires, then turn rotation moves to wagon 2 — and wagon 1's recorded `eliminatedOnDay` is N, not N+4 or N+8. Confirm via journal: "The {wagon name} never reached Oregon. Their bones rest beneath the trail. Day N."

The validation in Stage 4 should also confirm: 0 wagons in the 50-journey simulation have `eliminatedOnDay` differing from the day of last death.
