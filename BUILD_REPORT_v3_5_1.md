# Build Report — v3.5.1

Three bug fixes per the playtest report. Surgical edits only.

---

## Bug 1 — Death sequence raced to Oregon City confetti

**Symptom:** Hard / Extended playthrough. Sixth death triggered an ambush, then the wagon raced to trail end and fired the Oregon City finish sequence (confetti) on a wagon with zero living members.

**Root cause:** Two layers.
1. `processDeathAnnouncements` called its `onDone` callback on every path, including the path that just emptied the wagon. The callbacks resumed Push On / `endTurn`, which advanced to `completeEndTurn`.
2. `completeEndTurn` had this line: `if (w.eliminated || w.finished) return;`. If `w.eliminated` was already set by a prior catastrophic shock (the r17 `checkWagonElimination` hook fires synchronously during `v32ApplyDailyShock`), `completeEndTurn` returned silently. **No ending screen ever fired.** Then the next Push On came along, the wagon kept rolling dice, hit `w.position >= trailEnd`, and `resolveFinish` triggered confetti on a dead wagon.

**Fix:** added five guards.

| Function | Guard added |
|---|---|
| `processDeathAnnouncements` | After last announcement: if all members are now lost, fire `presentWagonLostEnding` instead of `onDone`. |
| `completeEndTurn` | If `w.eliminated && !w._wagonLostEndingShown`, fire `presentWagonLostEnding(w)` and return. Also routes the `living === 0 && !w.eliminated` branch to `presentWagonLostEnding` (was `showEliminationScene` only). |
| `resolveSpace` | Guard: if `w.eliminated`, fire `presentWagonLostEnding` and return. Prevents fort/landmark/river resolution on a dead wagon. |
| `resolveFinish` | Guard: if `livingMembers(w).length === 0`, fire `presentWagonLostEnding`. **The finish never fires for a wagon with zero living members.** This is the actual confetti-prevention guard. |
| `doActionPushOn` / `doActionHunt` / `doActionRest` / `doActionForage` | Guard at top: `if (livingMembers(w).length === 0) { return presentWagonLostEnding(w); }`. Halts any racing action handler. |

**New function: `presentWagonLostEnding(w)`** — replaces the silent-eliminate path. Idempotent (`w._wagonLostEndingShown` flag). Period-voice ending screen with:
- Final tally: stop reached / total, days, lost members count
- Listed names of every lost member with cause + day
- Ends via `endGame()` so the existing scoreboard / What You Learned page renders
- In competitive mode with other wagons still running, falls through to `showEliminationScene` and `advanceWagon` (no full ending until everyone is done)

**Acceptance test path** (manual): kill all 7 members one at a time via console, the moment the 7th dies you should see "The Wagon Is Lost" with the listed deaths — no ambush, no further movement, no confetti.

---

## Bug 2 — Health stayed at 10 the entire game

**Symptom:** Played a Medium Short game. Header health 10/10 the whole journey, even with sickness events firing.

**Root cause:** The `w.resources.health` resource only had UPWARD adjustment paths in the JS:
- `applyTurnConsumption` adds `pace.health_per_turn` and `ration.health_per_turn` (both default zero or positive in JSON)
- `applyRestRecovery` adds +2 (Rest) and +1 (Doctor)
- Letter Home adds +1
- A winter recovery path resets to max

There was **no path that ever subtracted from `w.resources.health`**. Per Gabby's design ("lose health from contaminated water / hunting injury / camp illness / starvation / dehydration"), it was supposed to be a daily-changing barometer. In practice the value was a header decoration that only ever climbed.

**Fix:** added a derive-from-state pass at the bottom of `applyTurnConsumption` (right after `v32ApplyDailyIncome`):

```js
const stateScore = { healthy: 10, weakened: 8, sick: 5, injured: 5, dying: 2, lost: 0 };
const livingTeam = team.filter(m => m.state !== 'lost');
let derived = livingTeam.length
  ? Math.round(livingTeam.reduce((s, m) => s + (stateScore[m.state] ?? 10), 0) / livingTeam.length)
  : 10;
if (food <= 0)  derived -= 2;
if (water <= 0) derived -= 3;
derived = clamp(derived, 0, 10);
w.resources.health = derived;
if (derived === 0 && livingTeam.length > 1) {
  // collapse — lose a member, reset to 5
  ...
}
```

Result:
- Health is now the **average wellness of the living team**, with starvation / dehydration penalties stacked on
- Sick / injured / dying members visibly drop the wagon's overall health every turn
- Resource-zero penalties also drop it
- When health hits 0 and there's still more than one alive: a member is lost ("The wagon's overall health collapsed. X was lost"), health resets to 5, journey continues. If only one is left, the next applyTurnConsumption will derive 0 again and the bug-1 wagon-lost ending fires.

The header `renderResourceRibbon` already reads from `w.resources.health` so it picks the new value up automatically.

---

## Bug 3 — Two new landmark photos wired

**Files found:** `Trail Pics/hot_Springs.jpg` (10.3 KB) and `Trail Pics/Grande_Ronde_Valley.jpg` (11.9 KB).

**Mapping decisions:**
- `hot_Springs.jpg` → key `hot_springs`. Maps to "Hot Springs", "Steamboat Springs", "Idaho Hot Springs" via `historicalLocationIdFor`.
- `Grande_Ronde_Valley.jpg` → key `ronde_valley`. Maps to "Grande Ronde Valley", "Ronde Valley", "La Grande".

Both photos embedded into the inline `HISTORICAL_PHOTOS_OVERRIDE` block right after `soda_springs`:
- `hot_springs:` 13,732 base64 chars
- `ronde_valley:` 15,836 base64 chars

New caption stubs added to `GAME_DATA.historical_illustrations.locations`:
- `hot_springs` — period-voice caption about pioneer use of warm pools
- `ronde_valley` — period-voice caption about the Blue-Mountains rest valley

Result: when the wagon resolves a space whose name contains "Hot Springs" or "Grande Ronde", the daguerreotype illustration now displays the embedded photo with caption.

**Mapping check:** the previous `historicalLocationIdFor` had no entries for "Hot Springs" or any Ronde Valley variant — so those locations were falling back to the generic SVG silhouette. The new entries replace the fallback with the real photo. **No previously-correct photo mapping was disturbed** — the diff only adds new key/value pairs to the map.

---

## Files touched
- `pink_oregon_trail.html` — Bug 1 guards (5 functions), Bug 2 health-derive block in `applyTurnConsumption`, Bug 3 photo embedding + map entries + caption stubs
- `docs/play.html` — refreshed mirror

## Files NOT touched
Everything else — UI, mobile drawer, photo override block layout, audio system, mini-map, fort menus, simulator, calibration_v3_5.

> **git work pending: deployment commit at end of v3.5.1**
