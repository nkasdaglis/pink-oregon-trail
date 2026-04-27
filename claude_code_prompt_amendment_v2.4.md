# Pink Oregon Trail — v2.4 Amendment

## Context

v2.3 shipped successfully. Multi-player playtest surfaced two issues that warrant a focused patch:

1. **Forts are rarely visited.** Monte Carlo simulation on the v2.3 dice/trail combination shows 54% of journeys visit zero forts and the average wagon visits 0.52 of 4 forts on a Short Journey. The 2d6-capped-at-8 dice produces 42% of all moves at exactly 8 spaces, causing systematic overshoot of small fort distances. This is a math problem, not a UX bug.

2. **race_to_fort intervention doesn't move the wagon.** When a player chooses "Race to the nearest fort" to save a dying member, the choice applies a day cost and a +30% recovery bonus, but the wagon's `position` is never modified. The narrative claims the wagon arrived; the mechanics say it didn't. Fixing this is straightforward.

A third item is bundled into this patch:

3. **Historical photo loader is broken.** The v2.3 `fetch_historical_photos.py` exits with `sys.exit(2)` on zero successful URL fetches without writing the override block. Several or all of the LoC URLs I provided in v2.3 were unstable guesses (I have no way to verify URLs from my sandbox). Switch to a folder-based system: Nicholas drops JPG files in `historical_photos/`, the script picks them up. URL fetch becomes a fallback, not the primary path.

The JSON has been updated to v2.4. New top-level keys: `fort_visit_system`, `race_to_fort_fix`, `historical_photo_system_v2_4`. Confirm `meta.version === "2.4"` before starting.

## Build order

1. **Stage 1** — Fort visit redesign (three paths)
2. **Stage 2** — race_to_fort actually moves the wagon
3. **Stage 3** — User story validation pass (US-11, US-12)

Photo system is delivered as an updated standalone Python script + folder; no HTML changes required for the photo path beyond verifying the existing override consumer (lines ~9320-9335) still works as written. The consumer code looks correct based on direct review — verify it during Stage 3.

---

# Stage 1 — Fort visit redesign (three paths)

## Diagnosis

Run this Monte Carlo before changing anything to confirm the baseline (you should see numbers close to mine):

```javascript
function simulateOne() {
  let pos = 1;
  const visited = new Set();
  const fortSet = new Set([5, 10, 17, 20]);
  while (pos < 25) {
    const raw = (1 + Math.floor(Math.random() * 6)) + (1 + Math.floor(Math.random() * 6));
    const move = Math.max(1, Math.min(raw, 8));
    pos = Math.min(25, pos + move);
    if (fortSet.has(pos)) visited.add(pos);
  }
  return visited;
}
let zero = 0, total = 0;
for (let i = 0; i < 10000; i++) {
  const v = simulateOne();
  total += v.size;
  if (v.size === 0) zero++;
}
console.log('avg forts/journey:', total / 10000);
console.log('% zero-fort journeys:', zero / 100);
```

Expected: `avg forts/journey ≈ 0.52`, `% zero-fort journeys ≈ 54`. If you see significantly different numbers, the trail layout or dice may have changed since v2.3 — investigate before proceeding.

## Three paths

Per `GAME_DATA.fort_visit_system.three_paths`, players reach a fort via one of three routes:

### Path 1: Lucky landing (existing v2.2/v2.3 behavior)

Dice land the wagon exactly on a fort space. Existing `resolveSpace → resolveFort` flow handles this. No change required.

### Path 2: Voluntary stop on overshoot

When a 2d6 roll WOULD CARRY the wagon past an unvisited fort, pause the turn and offer a choice:

> *"You see Fort Laramie ahead at space 10. Your team is rolling fast. Stop here, or push past?"*

- **Stop at the Fort**: wagon stops at the fort space, forfeits the unused movement. Fort menu opens normally.
- **Push Past**: wagon continues to the original destination. Resume normal space resolution.

**Filter:** Only forts NOT in `w.forts_visited` trigger this prompt. Already-visited forts don't (keeps re-traversal turns brisk).

**Implementation point:** In `doActionPushOn`, after dice settle but BEFORE setting `w.position`, scan the trail spaces between current position (exclusive) and final position (inclusive) for any fort with `!w.forts_visited.includes(fortName)`. If exactly one is found, show the prompt. If two or more (rare on the Short trail; possible on Extended), prompt for the FIRST one found going forward — the player can stop at it and decide about the next one on a subsequent turn.

**Cost framing:** When forfeiting movement, log to journal: *"We pulled in at Fort Laramie. The team was eager to push on but our needs at the fort came first."* The forfeited spaces don't carry over — this is a real cost.

**UI:** Modal callout with two large buttons. The dice display can stay visible above the prompt so the player remembers what they rolled. Audio: soft chime on prompt; click on either button continues the turn.

### Path 3: Forced march

A new fifth action button: **"Make for the Fort"**.

**Visibility condition:** Show this button on the action bar only when the next unvisited fort is within 5 spaces ahead.

**Cost:** 1 extra day per 3 spaces traveled, rounded up. So 5 spaces costs 2 extra days, 3 spaces costs 1 extra day.

**Dying-member bonus:** If any team member is in `dying` state, reduce day cost by 1 (minimum 1). Frame as urgency.

**Mechanics:**
1. Wagon advances directly to the fort space (skip dice, skip Push On).
2. Add day cost to `w.daysTraveled`.
3. Call `resolveSpace` which routes to `resolveFort` (existing).

**Button styling:** Same shape as the other action buttons. Subtitle text: `"Push hard for [Fort Name] — [N] spaces, +[D] day(s)"`. If a team member is dying, append `"(urgent)"`.

**Audio:** Replace the dice rattle with a steady "drumbeat of hooves" — a brief sequence of low-frequency taps over ~0.6s. Wagon icon moves aggressively across the mini-map.

## Rivers and landmarks unchanged

**Important:** The voluntary-stop and forced-march mechanisms apply ONLY to forts. Rivers and landmarks are story beats. If a roll carries the wagon across a river or past a landmark, those spaces resolve normally — no skip option. Per Nicholas's explicit decision.

## Helper extraction

Extract a shared helper:

```javascript
function moveWagonToFort(w, fortPosition, daysCost) {
  w.position = fortPosition;
  w.daysTraveled += daysCost;
  // resolveSpace will handle the fort menu trigger
}
```

Used by both Path 3 (forced march) and Stage 2 (race_to_fort).

## Validation

Re-run the Monte Carlo simulation after implementation, this time approximating Path 2 (assume players accept the voluntary stop 70% of the time when offered):

```javascript
function simulateWithPath2() {
  let pos = 1;
  const visited = new Set();
  const fortSet = [5, 10, 17, 20];
  while (pos < 25) {
    const raw = (1 + Math.floor(Math.random() * 6)) + (1 + Math.floor(Math.random() * 6));
    const move = Math.max(1, Math.min(raw, 8));
    const dest = Math.min(25, pos + move);
    let stopped = false;
    for (const f of fortSet) {
      if (f > pos && f < dest && !visited.has(f)) {
        if (Math.random() < 0.7) {
          pos = f; visited.add(f); stopped = true; break;
        }
      }
    }
    if (!stopped) {
      pos = dest;
      if (fortSet.includes(pos)) visited.add(pos);
    }
  }
  return visited;
}
```

Expected after fix: `avg forts/journey ≈ 2.0-2.5`, `% zero-fort journeys < 5%`. Document the actual numbers in the build report.

---

# Stage 2 — race_to_fort actually moves the wagon

## Current bug

In `resolveInterventionChoice`, when `choice.id === 'race_to_fort'`:

```javascript
if (eff.days_added)    w.daysTraveled += eff.days_added;
// ... no position update ...
// ... recovery roll ...
```

The wagon's `position` is never modified. Player picks "Race to the nearest fort," member recovers or dies, and the wagon is in the same trail position as before. The intervention narrative says the team made it to the fort — it didn't.

## Fix

When `choice.id === 'race_to_fort'`:

1. Compute fort position: walk forward from `w.position` until finding the first fort (use existing `distanceToNextFort` logic, but extract the actual position too — return both `{position, distance}`).
2. Move wagon: `moveWagonToFort(w, fortPosition, eff.days_added)` (the helper from Stage 1).
3. Roll recovery (existing logic).
4. Render narrative.
5. After the player clicks Continue on the recovery narrative, the existing flow returns to `endTurn → completeEndTurn → renderActionMenu`. On the NEXT player turn, when the player clicks Push On, `resolveSpace` fires for the wagon's current space — which is now a fort — triggering `resolveFort` and the fort menu.

This means the player gets full fort benefits (buy medicine, repair, rest, send letter) on their next turn. **Do not double-fire the fort menu** — the recovery narrative is its own beat; the fort menu fires when the player chooses to act at that space.

Alternative: open the fort menu IMMEDIATELY after the recovery narrative resolves, treating the race_to_fort outcome as a combined "arrived + recovered + now at fort" beat. This is more responsive but disrupts the existing turn rhythm. **Use your judgment.** The amendment leans toward the simpler "arrives at fort, fort menu next turn" flow, but if you find that feels wrong in playtest, immediately-open-fort is acceptable.

## Narrative additions

Append to the recovery narrative success cases:

- *"We pull into the gates of [Fort Name] at sundown. [name] is alive. Weak, pale, but alive."*

Append to the recovery narrative failure cases:

- *"We pull into the gates of [Fort Name] at sundown. [name] did not see them."*

Substitute fort name from the trail data using the position computed above.

## Edge cases

- **No unvisited fort within 3 spaces.** The intervention's `available_when` already filters this out via `distFort <= 3`, so race_to_fort won't appear as a choice. Confirm.
- **Member in dying state at fort already.** If the wagon is already standing on a fort space when the intervention fires (rare but possible), `distanceToNextFort` returns 0 — race_to_fort isn't shown. Player picks stop_and_tend or pray instead. Existing fort menu remains accessible after the intervention.
- **Multiple dying members.** Intervention fires once per dying member per turn. If all of them are saved by race_to_fort (unlikely but possible), the wagon arrives at a fort and gets full benefits. If some die, the dead are dead — the survivors still arrive.

---

# Stage 3 — User story validation

Add two new user stories to `simulation_logic_validation.required_user_stories_pre_implementation`:

### US-11: Voluntary fort stop

**Story:** Player at space 4 rolls 2d6, gets total 7. Fort Kearney is at space 5 (1 space ahead). Roll would carry them to space 11.

**Expected:** Dice show 7. Before wagon moves, prompt appears: "You see Fort Kearney ahead at space 5. Stop here, or push past?" Player picks Stop. Wagon moves to space 5. Fort menu opens. The 6 forfeited spaces of movement are gone — they cannot be redeemed.

### US-12: Forced march to save a dying member

**Story:** Player at space 7 with a dying Doctor. Fort Laramie at space 10. Action bar shows "Make for the Fort" button with subtitle "Push hard for Fort Laramie — 3 spaces, +1 day (urgent)."

**Expected:** Player clicks. Wagon advances to space 10 directly. Day count increases by 1 (urgent reduced 2→1 because of dying member). Resolve fires `resolveFort`. Fort menu opens. Player can buy medicine, talk to fort doctor, etc. Then on next turn, the intervention may fire again for the still-dying Doctor — at which point race_to_fort is no longer available (distance to NEXT unvisited fort is now >3), but stop_and_tend gets a Doctor's Quarters bonus narratively.

Both user stories should be walked through in NOTES_v2.4.md before implementation, and validated after.

---

# The historical photo system — separate from HTML changes

The HTML override consumer at `pink_oregon_trail.html` lines ~9320-9335 looks correct based on review:

```javascript
const override = (window.HISTORICAL_PHOTOS_OVERRIDE || {})[id];
if (override) {
  const src = override.startsWith('data:') ? override : ('data:image/jpeg;base64,' + override);
  return '<div class="historical-illustration"><img src="' + src + '" ...';
}
```

**Verify this code path during Stage 3.** Sanity check by injecting a tiny test override at the browser console:

```javascript
window.HISTORICAL_PHOTOS_OVERRIDE = { fort_laramie: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' };
```

Then arrive at Fort Laramie in-game. If the consumer is correct, you'll see a 1×1 pink pixel where the daguerreotype would be. If you see the SVG instead, the consumer code has a bug — investigate.

The Python fetcher script is being replaced with a folder-based version in this patch (delivered separately as `fetch_historical_photos.py`). Nicholas runs it; you don't need to touch it. But document in the build report that Stage 3 verified the consumer code path works.

---

# Build report additions

In addition to the standard report:

- **Monte Carlo before/after** — fort visit rate before fix vs after fix
- **US-11 and US-12 validation** — PASS / FAIL / NEEDS-PLAYTEST
- **Photo consumer verification** — confirm the test-pixel injection produces the expected `<img>` rendering

# Critical reminders (unchanged)

- No frameworks. Single self-contained HTML.
- No git commits during the build (per Nicholas's standing instruction). Append "git work pending" to the build report.
- No words "AI", "Claude", "GPT", "LLM", "model", "agent", "chatbot" anywhere user-facing.
- Period 1840s voice for narration.

This is a small focused patch. Should be a quick build.
