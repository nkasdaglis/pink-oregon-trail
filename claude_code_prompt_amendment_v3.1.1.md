# Pink Oregon Trail — v3.1.1 Quick-Fix Amendment

## Context

Three small bugs surfaced in playtest. None are big enough to warrant separate amendments, so they're bundled here.

**Two require Claude Code to touch `pink_oregon_trail.html`:**
1. Day/night cycle stuck on dark across all scenes
2. "Race to the nearest fort" intervention choice appears even when wagon is currently AT a fort

**One was already fixed by Nicholas's helper outside Claude Code:**
3. The two paintable PDFs (board_short_paintable.pdf, board_extended_paintable.pdf) have been regenerated with proper page-fill CSS. Nicholas's local copies should be replaced; the previously-deployed versions in `docs/` need to be refreshed.

JSON updated to v3.1.1. Confirm `meta.version === "3.1.1"` before starting. Spec details at `v3_1_1_fixes` in JSON.

**Multiplayer (v3.2 with PeerJS Cloud + room codes) is the NEXT amendment after this one.** Don't touch it here.

## Build order

Three stages, ~1 hour total.

### Stage 1 — Day/night cycle diagnostic + fix

Open `pink_oregon_trail.html`. Search for the strings `data-time` and `time-of-day`. Three things to verify:

**A. Is the time-of-day attribute being SET?**

Look for code like `document.documentElement.dataset.time = ...` or similar. The v2.6 spec called for this to be set on game start AND on every turn end. If it's not being set anywhere, that's the bug — the CSS rules `:root[data-time="midday"] ...` never match because `data-time` doesn't exist.

If missing: add a helper:

```javascript
function setTimeOfDay(daysTraveled) {
  const phase = daysTraveled % 4;
  const phaseName = ['morning', 'midday', 'afternoon', 'dusk'][phase];
  document.documentElement.dataset.time = phaseName;
}
```

Call it from:
- `beginJourney()` — once at game start with daysTraveled = 0
- `completeEndTurn(w)` — after every day advance for the active wagon
- `advanceWagon(w)` — when turn rotates between wagons in Competitive

**B. Are the CSS rules selecting the right element?**

If the attribute is being set on `document.documentElement` (the `<html>` tag), the CSS selectors should look like `:root[data-time="midday"] .scene-canvas .atmosphere`. If selectors instead use `.scene-canvas[data-time="midday"]` or similar, the attribute is on the wrong element. Adjust either the JS to set it on the matching element, or the CSS to match where it's actually set.

**C. Are the gradient values bright enough?**

Even with the attribute correctly set and CSS correctly matching, if all four time-of-day gradients are dark, the cycle works but is invisible to the player. Inspect the gradient definitions for each region. The v2.9 brightening targets:

- Morning: top stop lightness ≥ 70%
- Midday: top stop lightness ≥ 75% (brightest)
- Afternoon: top stop lightness ≥ 60%
- Dusk: top stop lightness ≥ 45% (moodier but still visible)

If any are darker than the v2.9 targets specify, brighten them per the v2.9 spec at `v2_9_visual_overhaul.stages.stage_1_scenery_brightness.specific_brightening_targets`.

**Special case for the Oregon City finish scene:**

When the wagon reaches Oregon City (the finish space), force midday brightness regardless of `daysTraveled`. The win moment must feel triumphant.

Find `resolveFinish` (or wherever the win scene composes). At the start of that function, override:

```javascript
const priorTime = document.documentElement.dataset.time;
document.documentElement.dataset.time = 'midday';
// ... win scene composes ...
// (priorTime can stay overridden since the game ends after this)
```

#### Acceptance test for Stage 1

Walk through a full short-trail journey from day 1 to day 60+. Take a screenshot at:
- Day ~1 (should be morning — pink/yellow tint)
- Day ~10 (should be midday — bright sky)
- Day ~20 (should be afternoon — warm gold)
- Day ~30 (should be dusk — orange/red horizon)

Each should be visibly different. Reach Oregon City — sky should be bright (NOT dark) at the win scene.

### Stage 2 — Race-to-fort hidden when wagon is at a fort

Currently, when the dying-member intervention event fires AND the wagon is sitting on a fort space, the choice list still shows "Race to the nearest fort." Player picks it; they advance to... the same fort they're already at, or the next one (depending on how `distanceToNextFort` is implemented).

**Root cause:** The availability check for `race_to_fort` doesn't exclude the current space. If `w.position === someFortSpace`, the function should return that race-to-fort is unavailable.

**Find:** the function that determines which intervention choices are available. Likely named something like `getAvailableInterventionChoices(w)` or inline in `resolveIntervention`. Search for `race_to_fort` in `pink_oregon_trail.html`.

**Fix the availability check:**

```javascript
function isRaceToFortAvailable(w) {
  // Find the next fort STRICTLY AHEAD of current position that hasn't been visited
  const trail = GAME_DATA.trails[gameState.trailLength];
  const currentSpace = trail.find(s => s.n === w.position);
  
  // If currently on a fort, race_to_fort is irrelevant — we're already at one
  if (currentSpace && currentSpace.type === 'fort') return false;
  
  const nextUnvisitedFort = trail.find(s => 
    s.n > w.position && 
    s.type === 'fort' && 
    !w.fortsVisited.includes(s.name)
  );
  
  if (!nextUnvisitedFort) return false;
  
  // Must be within 5 spaces (existing rule, adjust if your spec says different)
  return (nextUnvisitedFort.n - w.position) <= 5;
}
```

When composing the choice list for the intervention, only include `race_to_fort` if `isRaceToFortAvailable(w)` returns true.

**Bonus enhancement: add a "Use the fort doctor" choice when the wagon IS at a fort.** This makes being-at-a-fort meaningful for the intervention. Add to the choice list when `currentSpace.type === 'fort'`:

```javascript
{
  id: 'use_fort_doctor',
  label: 'Use the fort doctor',
  description: "The fort's surgeon has supplies and skill we don't.",
  available: () => currentSpaceIsFort(w),
  effects: {
    days_added: 0,  // already at fort, no travel
    morale_change: 0,
    recovery_probability: 0.65  // strong but not guaranteed
  },
  narratives: {
    success: "The fort's doctor takes {name} into the infirmary. Hours pass. By sundown {name} is alive — pale, weak, but alive.",
    failure: "The fort's doctor did everything that could be done. {name} did not survive the fever."
  }
}
```

#### Acceptance test for Stage 2

Force the wagon to a fort space (use console: `gameState.wagons[0].position = 5` then `resolveSpace(gameState.wagons[0])` to reach Fort Kearny). Force a member to dying state. Trigger end-of-turn.

Expected: intervention event fires. Choice list shows:
- Stop and tend
- Pray and continue
- Continue at full pace
- **Use the fort doctor** (NEW — only because at fort)

Race to the nearest fort is NOT shown.

Also test: force wagon to a non-fort travel space with a fort 2 spaces ahead. Force dying member. End-of-turn. Race to the nearest fort SHOULD appear (existing behavior preserved).

### Stage 3 — Refresh deployed PDFs

The two paintable PDFs at:
- `docs/board_short_paintable.pdf`
- `docs/board_extended_paintable.pdf`

...need to be refreshed with the corrected versions (Nicholas has them locally, regenerated by external helper with proper page-fill CSS).

Steps:

1. Confirm Nicholas's project folder has the two updated PDFs at the project root: `board_short_paintable.pdf` and `board_extended_paintable.pdf`. If not, this stage is blocked — Nicholas needs to copy them in.
2. Copy them into `docs/`:
   ```
   cp board_short_paintable.pdf docs/
   cp board_extended_paintable.pdf docs/
   ```
3. Verify file sizes are reasonable (~2.2 MB each).
4. Add to the deployment commit (Stage 4 below).

### Stage 4 — Deployment commit

After the two HTML fixes (Stage 1 and 2) are verified working, AND the two PDFs are in `docs/` (Stage 3):

```
cp pink_oregon_trail.html docs/play.html
git add pink_oregon_trail.html docs/play.html docs/board_short_paintable.pdf docs/board_extended_paintable.pdf
git commit -m "v3.1.1: day/night cycle fix, race-to-fort-at-fort fix, regenerated paintable PDFs"
git push origin main
```

This commit IS allowed — same deployment exception as prior amendments.

After push, GitHub Pages rebuilds in 60-90 seconds. Gabby refreshes her browser on any device:
- Sky cycles through morning / midday / afternoon / dusk (no longer stuck dark)
- "Race to the nearest fort" intervention choice no longer appears when at a fort
- The two paintable PDFs at the URL render correctly when downloaded

## Build report requirements

- Stage 1 verification: 4 screenshots described in text (morning, midday, afternoon, dusk in some region)
- Stage 1 acceptance test result: was data-time being set / not being set / set incorrectly? Was the bug A, B, C, or some combination?
- Stage 2 verification: race_to_fort properly hidden at fort, properly shown when not
- Stage 2 bonus: confirm "Use the fort doctor" choice appears when at fort
- Stage 3: PDFs successfully copied to docs/
- Stage 4: deployment commit hash

## Critical reminders

- Single self-contained HTML file. No frameworks.
- Single deployment commit allowed for this amendment.
- Period 1840s voice for the "Use the fort doctor" narrative.
- No words "AI", "Claude", etc., anywhere user-facing.
- Preserve all v3.0 mechanics. v3.1.1 is bug-fixes-only.

After this lands, v3.2 (multiplayer via PeerJS Cloud) is the next build. Don't start v3.2 until this v3.1.1 is verified working in playtest.
