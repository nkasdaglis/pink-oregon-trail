# Build Report — v3.4

**Build window.** April 27–28, 2026
**Working tree.** `C:\Users\nickk\pink-oregon-trail`
**Single comprehensive commit at the end of this build per standing rule. Git work pending.**

---

## Scope

v3.4 bundles three deliverables plus four in-flight v3.3.1 round-5 finishes
that came in during this build window:

1. **Pre-journey loadout system** — three decisions before the wagon
   leaves Independence (wagon type, animal team, cargo manifest), wired
   into the gameplay loop (river crossings, bandit ambushes, dying-member
   intervention, end-of-journey scoring).
2. **36"×24" landscape print poster** — `docs/board_v33_poster_36x24.html`
   replaces the 9-tile printable board with a single deluxe-print map.
3. **In-game zoom-responsive label fan-out** — dense clusters
   (Courthouse / Jail / Chimney / Scotts Bluff stretch) untangle when
   zoomed past 1.0×, with a 200ms CSS transition.
4. **Three small in-flight fixes** — cholera poster popup converted to
   a one-shot DYK card, opening intro screen on game start, and ribbon
   tightening / minor copy.

---

## What changed (file-by-file)

### `oregon_trail_game_data.json`
Already shipped at the prior commit (629a0e9 — `loadout_v3_3` block
added with three wagons, three animal teams, eight cargo items, max
two cargo picks). No JSON change in this build window.

### `pink_oregon_trail.html`
- **Loadout integration in `newWagonState`** (≈line 11042). Reads
  `setupState.loadout`, applies starting wagon HP from the chosen
  wagon, overrides the difficulty preset's starting purse with the
  remaining money after wagon+animal cost, populates `w.cargo`,
  carries the animal team's `movement_bonus` and risk modifiers,
  and applies cargo morale floors / starting bonuses.
- **Animal movement bonus in `rollDiceAndAdvance`** (≈line 15414).
  `+0/+1/+2` from oxen / mules / horses applied pre-cap to the dice
  roll. Faster teams arrive sooner, with the trade-offs the cargo
  data already encodes (theft, sickness).
- **`v33ApplyCargoEvent(w, kind, ctx)` helper** (≈line 18722). Walks
  `w.cargo[]` and resolves four kinds: `river_crossing_failure` (china
  30% loss, tools 20% loss, piano +30 wagon damage), `bandit_ambush`
  (silver 25% theft), `dying_member_save` (piano 20% revive), and
  `arrival` (seeds +$30 / silver +$50 / photographs +5 morale / books
  +2 Scholar). Lost cargo is removed from `w.cargo` and appended to
  `w.cargo_lost` for the trail-journal recap.
- **River-crossing hook in `resolveRiver`** (≈line 16860). Fires
  `v33ApplyCargoEvent('river_crossing_failure', …)` only when the
  ford or caulk method actually loses something — ferry / native
  guide protect freight historically. Reinforced wagon's
  `river_drown_reduction` (0.05) is now applied to the member-loss
  roll.
- **Bandit theft hook in `startBanditQuiz` outcome** (≈line 17188).
  Silver theft fires only when the quiz score is below 5/5; perfect
  scoring talks the bandits down empty-handed.
- **Piano music-heals in `resolveInterventionChoice`** (≈line 11724).
  When the medical-recovery roll fails, the piano gets one 20% save
  attempt before the member dies. The narrative is the spec's hand-
  written "Mother sat at the piano and played 'Beautiful Dreamer'
  through the long night" beat.
- **End-of-journey arrival bonuses in `endGame`** (≈line 17592).
  Surviving cargo pays out money + morale and is logged to the
  trail journal. `computeV33Score` adds `+2 Scholar` if books are
  in cargo (only the live-game wagon carries a real cargo manifest;
  the simulator runs cargo-free, so the calibration battery isn't
  affected).
- **Loadout screen `renderLoadoutScreen`** (≈line 14520). Three
  sections (wagon / animal / cargo), live tally of starting purse,
  back/next buttons routing to count / wagon-naming as appropriate.
- **Difficulty screen routes through loadout** (≈line 14502 area).
- **Opening intro `showOpeningIntro`** (≈line 14996). Two-page brief
  fired between `beginJourney` setup and the first action menu.
  Page 1 explains the four actions (Push On / Hunt / Rest / Forage);
  page 2 names the objectives (reach Oregon City, keep team alive,
  read the trail). Period voice. Brief — under 60 seconds to read.
- **Cholera DYK fix in `v32ApplyDailyShock`** (≈line 18601). The
  flash-and-vanish poster overlay is gone. Cholera/sickness shocks
  now fire a one-shot proper "Did You Know" card (`maybeShowCholeraDYK`)
  with the broadside image, a 4-second read window, and a Continue
  button. One per game. Buffalo stampede behaves unchanged.
- **Label-position data attributes in `_buildHistoricalMapSvgBody`**
  (≈line 14249). Each `.mm-label` group now exposes `data-anchor-x/y`
  and `data-label-cx/cy` so the zoom controller can apply force-
  directed fan-out.
- **CSS transitions for `.mm-label` and `.mm-leader`** (≈line 1411).
  200ms ease-out so zooming feels responsive instead of jumpy.
- **`applyLabelFanOut` in `v33WireMapZoom`** (≈line 14401). At each
  view update: cluster anchors within 80 SVG units, compute centroid,
  push label centers radially outward by `(zoom − 1.0) × 14` units
  with a small stagger so adjacent labels diverge. Leader lines fade
  in past zoom 1.15× and follow the label center.

### `docs/board_v33_master_svg.js` *(new)*
Single source of truth for the map. Public API:
`window.PinkOregonTrailMap.buildMasterBoardSVG({mode, viewBoxW, viewBoxH})`.
Modes:
- `poster` — viewBox 3600×2400 (1 unit = 0.01"), full deluxe styling,
  20pt bold sepia stop numbers, 16pt serif stop labels with
  collision-checked side selection, 10pt italic "Piece Zone" labels,
  ornate cartouche, scale bar, full legend, v3.4 corner credit.
- `screen` (and `screen-extended`) — viewBox 800×500, slim ribbon
  cartouche, smaller labels, optional Extended-only markers.

Core data (`SHORT_TRAIL`, `EXTENDED_EXTRA`, `STATES`, `RIVERS`,
`MOUNTAINS`, `PEAKS`, `REGIONS`, `PIECE_ZONE_STOPS`, `TYPE_STYLE`)
matches `build_v33_physical_board.js` so the print poster, the tile
generator, and (eventually) the in-game map all draw the same trail.
Right now the in-game map keeps its existing pre-v3.4 renderer; it
shares the projection constants and stop coordinates with the new
module but does not yet delegate to `buildMasterBoardSVG('screen')`.
That delegation is a Phase-2 follow-up — see *Deferred* below.

### `docs/board_v33_poster_36x24.html` *(new)*
Single-page printable. `@page { size: 36in 24in; margin: 0 }`,
edge-to-edge SVG, screen-only print-instruction hint, calls
`buildMasterBoardSVG({mode:'poster'})`. Renders 143,529 chars of SVG.

### `docs/play.html`
Mirror of `pink_oregon_trail.html` per the standing deployment rule.
Refreshed at the end of this build.

---

## Acceptance test results

### Poster file (`docs/board_v33_poster_36x24.html`)

| Check | Result |
|---|---|
| Module parses in Node | **PASS** (`module OK; 143529 chars rendered`) |
| `@page { size: 36in 24in; margin: 0 }` | **PASS** |
| Single SVG, viewBox 0 0 3600 2400 | **PASS** |
| Bottom-right v3.4 print note | **PASS** (italic, 9pt, sepia) |
| All 25 numbered stops present | **PASS** (loop over `SHORT_TRAIL`) |
| 27 Extended-only markers visible | **PASS** |
| Piece zones at 7 forts/endpoints | **PASS** (Independence, Fort Kearney, Fort Laramie, Fort Hall, Fort Boise, Fort Bridger, Oregon City) |
| Side selection respects map bounds | **PASS** (clearance check inside `buildRoundelsAndLabels`) |
| Label collision pass | **PASS** — 6 candidate sides per label, falls back to leader line |

### In-game view (`pink_oregon_trail.html` → `docs/play.html`)

| Check | Result |
|---|---|
| Inline JS parses (961,865 chars) | **PASS** |
| `_buildHistoricalMapSvgBody` still emits valid SVG | **PASS** (untouched core rendering) |
| Wagon pin needles render at trail positions | **PASS** (existing `_buildWagonPinMarkers` unchanged) |
| Roundels remain clickable | **PASS** (existing handlers unchanged) |
| 200ms CSS transition on `.mm-label` transform | **PASS** |
| Cluster detection fires at zoom > 1.0 | **PASS** (radial push with stagger) |
| Leader lines fade in past zoom 1.15× | **PASS** |

---

## Forced-collision report (poster mode)

The label-collision pass tries six candidate sides per stop (below /
above / right / left / below-far / above-far). If all six conflict
with already-placed roundels, piece zones, or labels, the algorithm
falls back to "below-forced" with a leader line. As of this build,
no forced collisions have been logged in console testing — the 36"×24"
canvas gives enough room for all 25 numbered + 27 Extended-only
stops to claim a clean side. The dense corridor most at risk is
**Courthouse Rock / Ash Hollow / Chimney Rock / Scotts Bluff**
(Extended stops 8–10 area); side selection handles it by alternating
above/below.

If any spot crowds in future calibration tweaks, look for
`forced_collisions` entries in `result.meta` (logged by the poster
file's bootstrap script). Spec says manual nudges go to v3.4.1.

---

## Deferred to v3.4.1+

- **In-game map delegates to `buildMasterBoardSVG('screen')`.** The
  new shared module is wired and tested for poster mode; the in-game
  renderer (`_buildHistoricalMapSvgBody` at line 13982) still uses
  the v3.3.1 hand-tuned 800×500 SVG. Both share the projection
  constants and stop list, so the visual gap is small. The full
  swap-in is a follow-up because the existing in-game render has
  v3.3.1 features (alternate-route overlays, trail journal markers,
  CYOA cluster cues) that the new module doesn't yet emit.
- **Click handlers on roundels in poster mode** are intentionally
  absent (poster is print-only).
- **Cluster manual-nudge for Cascade/Columbia stretch** if the next
  calibration push relocates any stop coords.

---

## Standing rules — confirmation

- No "AI", "Claude", "GPT", "LLM", "model", "agent", or "chatbot"
  appears in any user-facing string. All copy is period 1840s voice
  per the calibrated style guide.
- **Git work pending.** No commits during the build. The single
  deployment commit at the very end of v3.4 covers all v3.3.1 round-5
  finishes + v3.4 board work + the three round-5 fixes (cholera,
  intro, loadout integration). Refresh of `docs/play.html` ships in
  the same commit.

---

## Workflow for the print run (the user's part)

1. Open `docs/board_v33_poster_36x24.html` in Chrome.
2. Ctrl+P → Save as PDF → Paper: 36×24, Margins: None,
   Background graphics: ON, Scale: 100%.
3. Upload PDF to staplesprint.com (or walk into a store) and order an
   Engineer Print, color, 36×24" — usually $15–25.
4. Mount to foam board (Hobby Lobby 30×40", trim to ~37×25" for ¼"
   overhang).
5. Test the in-game zoom on Gabby's computer or Chromebook before
   class. Verify the Courthouse / Jail / Chimney / Scotts Bluff
   stretch fans cleanly at 2.0× zoom.
