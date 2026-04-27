# Pink Oregon Trail — v2.7 Build Report (Responsive Scaling)

Build date: 2026-04-27
Designer: Gabby Kasdaglis
Engineer: Nicholas Kasdaglis
Branch: `main` · GitHub: <https://github.com/nkasdaglis+pink-oregon-trail>

This is a focused responsive-scaling patch driven by playtest
screenshots. Three intertwined issues:

1. **Fort silhouette dominates the scene** (~30-40% of visible
   canvas, by playtest report).
2. **No responsive design beyond a single 740px mobile breakpoint** —
   same UI size on a 1366px Chromebook as on a 4K projector.
3. **Aspect ratio handling crops characters** at extreme widescreen
   displays (xMidYMax slice on the character layer was hiding
   above-mid-viewport content on 21:9 ultrawide).

Per Nicholas's standing instruction, no `git` commands ran during
this build. Code is on disk. Recommended commits in "git work
pending" at the end.

---

## v2.6 deployment status

**v2.6 graphics overhaul IS merged into the working file.**
Verified at Stage 0:
```
PRESENT  --wagon-progress
PRESENT  bg-far / bg-mid / bg-near
PRESENT  buildLayeredBackdrop
PRESENT  _skinPalette
PRESENT  spawnRain / spawnSnow
PRESENT  setTimeOfDayFromWagon
File size 580.8 KB (matches v2.6 final report)
```

The v2.7 spec mentions Nicholas was diagnosing from a 520KB v2.5
build (the deployed copy on his laptop). The repository's working
file is the 580.8KB v2.6 build that hasn't been deployed yet. v2.7
patches the v2.6 working file. Both v2.5-only and v2.6+v2.7 paths
get the responsive layout fix.

---

## Pre-implementation reasoning per stage

Full per-stage walk-throughs are in `NOTES_v2.7.md`.

### Stage 1 — `--ui-density` tier system

Four tiers driven by `data-ui-density` on document root:
- `compact` (< 1280px)
- `standard` (1280-1919px)
- `large` (1920-2559px)
- `jumbo` (≥ 2560px)

JS `updateUIDensity()` reads `window.innerWidth` on init + resize.
CSS rules under `:root[data-ui-density="..."]` swap
`--portrait-size`, `--action-btn-height`, `--callout-max-w`. Standard
tier values are also the `:root` defaults so the layout works before
JS fires.

### Stage 2 — typography clamp() everywhere

8 spec'd selectors get `clamp(min, vw, max)`:

| Selector | clamp |
|---|---|
| `.res-item .val` | clamp(14px, 1.1vw, 22px) |
| `.res-item .label` | clamp(9px, 0.7vw, 13px) |
| `.action-btn .name` | clamp(15px, 1.2vw, 22px) |
| `.action-btn .desc` | clamp(11px, 0.8vw, 16px) |
| `.team-portrait .member-name` | clamp(11px, 0.8vw, 15px) |
| `.event-title` | clamp(20px, 2vw, 36px) |
| `.event-flavor` | clamp(13px, 1vw, 20px) |
| `.narrative-text` | clamp(14px, 1.1vw, 22px) |

The two existing v2.6 clamps (event-title and event-flavor) had
narrower max ranges; widened to v2.7 spec so 4K display gets the
full 36px / 20px maxima.

### Stage 3 — fort silhouette resize + scenery audit

Fort SVG group resized:

| Property | v2.5/v2.6 | v2.7 |
|---|---|---|
| translate | (160, 240) | (220, 310) |
| base rect | 0,40 → 180×100 | 0,30 → 130×70 |
| crenellations | 18-unit step | 13-unit step |
| door | 24×60 | 14×42 |
| flagpole top | y = -12 | y = -4 |
| total vertical extent | 152 vb units | 104 vb units |

**Scenery audit (other extras):**
- River crossing rect spans full viewport — intentional, kept.
- Hunt scene buffalo silhouette: ~36×14, small. Kept.
- Bandit ambush: three figures translated + scaled inside scene,
  small. Kept.
- Hidden figure on landmark: 8×28, small. Kept.

Only the fort needed resizing.

### Stage 4 — preserveAspectRatio for character layer

Backdrop layer keeps `xMidYMax slice` (sky/ground always fill canvas).
Character layer changes to `xMidYMid meet` so wagon/fort/characters
are NEVER cropped at extreme aspect ratios (transparent letterbox
bands show the backdrop through). Smallest possible CSS change with
the highest visual impact.

### Stage 5 — browser-required testing

Reproduction steps below. **NEEDS-PLAYTEST** — cannot run headless.

### Stage 6 — v2.6 carryover

Verified clean. v2.6 backdrop pipeline (`paintScenery →
buildLayeredBackdrop → _bgFrame`), parallax (`--wagon-progress`),
and atmospheric overlays (`data-time`) all coexist with v2.7's
density variables (`--portrait-size`, etc.). Different
attributes/properties, no collision.

---

## Fort proportion — before vs after

Computed against an 8:5 viewBox (800×500) rendered into a 16:9 canvas
(1366×768 typical) with `xMidYMax slice` (the v2.5/v2.6 markup):

| | viewBox extent | % of viewBox vertical | % of visible canvas (16:9 typical) |
|---|---|---|---|
| **Old fort** | 152 units | 30.4% | **33.8%** |
| **New fort** | 104 units | 20.8% | **23.1%** |
| **Reduction** | -48 units | -32% | -32% |

On smaller `.scene-canvas` heights (the actual scene-canvas is the
1fr middle row of the layout grid, so smaller than full viewport),
the playtest-perceived proportion was higher than 33.8% — closer to
the reported 40-50%. After the resize, that maps to roughly 28-32%
of the actual scene-canvas height. The fort now reads as "a building
in the scene" rather than "the scene".

---

## File size

| Build | HTML size |
|---|---|
| v2.6 baseline | 580.8 KB |
| v2.7 final    | **584.5 KB** |
| **Delta**     | **+3.7 KB** |

Tiny growth — v2.7 is mostly inline CSS rule replacement and a
single small JS function. No new assets, no new SVG content (fort
got SMALLER).

---

## Per-density tier UI sketch

| Tier | Trigger | Portrait | Button height | Callout max-width |
|---|---|---|---|---|
| compact | <1280 | 62 px | 70 px | min(540, 88vw) |
| standard | 1280-1919 | 76 px | 84 px | min(640, 70vw) |
| large | 1920-2559 | 92 px | 100 px | min(720, 55vw) |
| jumbo | ≥2560 | 120 px | 130 px | min(900, 45vw) |

Combined with the clamp() typography (Stage 2), each tier has a
size FLOOR/CEILING for chrome elements PLUS smooth font scaling
within the tier as the user zooms or resizes.

---

## Browser-required test reproduction steps (Stage 5 — NEEDS-PLAYTEST)

Open `pink_oregon_trail.html` in Chrome. Open DevTools → Toggle
device toolbar (Ctrl+Shift+M). For each resolution below, complete
setup → press Push On until the wagon lands on a fort space (or
console-set `gameState.wagons[0].position = 5;` to land at Fort
Kearney).

### 1024×600 (small Chromebook tab)

**Expected (compact tier):**
- Resource ribbon items wrap if needed; no horizontal scroll
- Team strip portraits 62px wide
- Action buttons 70px tall
- Fort scene: fort visible, building reads as "small building in
  the distance", sky and ground both clearly visible
- Narrative callout fits within ~88vw of the viewport
- Text readable at arms-length (14px floor on most ribbon labels)

**Fails visibly if:** horizontal scroll appears; fort dominates
height; team strip clips; callout overflows.

### 1366×768 (standard Chromebook)

**Expected (standard tier):**
- Same as compact but with 76px portraits, 84px buttons, callout up
  to 640px wide
- Fort occupies ~23% of scene-canvas height (down from ~34% in v2.6)
- Sky color visible above the fort
- All UI chrome looks "right-sized" for arms-length viewing

### 1920×1080 (laptop / external monitor)

**Expected (large tier):**
- Portraits 92px, buttons 100px, callout up to 720px wide
- Typography clamp() ranges land near max in this tier (event-title
  ~33-36px, narrative-text ~20-22px)
- Fort scene: more sky visible than the standard tier (because
  scene-canvas is bigger)

### 2560×1440 (4K laptop)

**Expected (jumbo tier):**
- Portraits 120px, buttons 130px, callout up to 900px wide
- Buttons are obviously chunkier than the laptop tier — designed for
  arms-length-or-further viewing
- Text at maxima everywhere

### 3840×2160 (4K TV / projector — the teacher's classroom)

**Expected (jumbo tier — same density values as 2560×1440):**
- This is the critical test for the teacher's projection scenario
- Buttons should be 130px tall, easily readable from across a
  classroom
- Resource ribbon values at clamp max (22px)
- Event-title at clamp max (36px) — readable from row 5 of a
  classroom
- Fort proportion: same ~23% of canvas height (the proportion is
  resolution-independent)

**Open question:** if 130px buttons + 36px titles still look small
from the back of the classroom (10-12 feet from a 55" 4K TV),
consider bumping the jumbo tier values further — but this requires
in-situ testing, not headless math. See "Open questions" below.

### 414×896 (mobile portrait — graceful degradation)

**Expected (compact tier):**
- This sits below the existing `@media (max-width: 740px)` mobile
  breakpoint, which has its own narrow-screen layout fallbacks
- 62px portraits in a horizontally-scrolling team strip
- Action buttons grid collapses to 2 columns (existing rule)
- Game playable but cramped — not the primary target

---

## Open questions

1. **Jumbo tier sizing for the teacher's specific 55" TV.** The JSON
   spec calls out: "If played on a TV, sound effects should also be
   louder. Consider boosting all audioController gains by 1.3x at
   jumbo density." This was deferred from v2.7 — adding a
   `.muteFlash` data-attribute hook at jumbo would require a small
   AudioController change. If the playtest reports SFX too quiet
   from across the classroom, plumb the gain boost in v2.8.

2. **Jumbo button and font sizing may need real-world verification.**
   The spec authored 130px buttons and clamp(20-36px) titles for the
   jumbo tier. From a 12-foot classroom distance to a 55" 4K TV,
   that maps to roughly the equivalent of 24px text at arms-length —
   readable but on the small side. If the teacher reports the back
   row can't read action button names, bump jumbo's
   `--action-btn-height` to 160px and consider a separate
   typography override at jumbo (e.g.,
   `:root[data-ui-density="jumbo"] .action-btn .name { font-size:
   28px; }` to override the clamp ceiling).

3. **`@media (max-width: 740px)` interaction.** The pre-existing
   mobile breakpoint still applies. At a 720px-wide phone, the
   media-query rules fire AND `data-ui-density="compact"` applies.
   Both are additive — the media query handles structural layout
   (action grid columns, narrative-callout positioning) while the
   density attribute handles chrome sizes. No conflict observed in
   static review; visual confirmation in Stage 5 needed.

4. **Resize debouncing.** The Stage 1 `updateUIDensity()` listener
   fires synchronously on every resize event. If a kid drags the
   browser window edge slowly, this fires hundreds of times per
   second. CSS engine handles tier-attribute changes cheaply, but
   if jank appears, wrap in a 100ms debounce.

5. **v2.6 region backdrop preserveAspectRatio.** The v2.6 builder
   uses `xMidYMid slice` on its 1920×600 SVG. The v2.7 spec
   recommends `xMidYMax slice` on the backdrop. For a 1920×600 SVG
   (3.2:1 aspect) being sliced into a 16:9 canvas (1.78:1), the
   difference is academic — both crop horizontally because the SVG
   is wider than the canvas. If the canvas ever ends up taller than
   the SVG aspect (4:3 Chromebook in portrait orientation, e.g.),
   xMidYMid centers vertically and xMidYMax pins to bottom. The
   v2.6 builder choice (xMidYMid slice) doesn't actively hurt at
   the v2.7 layout — kept as-is.

---

## Confirmation: git autonomy / commits

- **No git commands ran during this build** per Nicholas's standing
  instruction.
- Files on disk:
  - `pink_oregon_trail.html` (584.5 KB; v2.6 was 580.8 KB)
  - `NOTES_v2.7.md` (per-stage walk-throughs)
  - `BUILD_REPORT_v2.7.md` (this file)
- The deployment commit (docs/) from a prior session remains at
  HEAD on `main`.

---

## git work pending

For Nicholas to commit. Recommended split:

```
1. feat(v2.7): --ui-density tier system + typography clamp() (Stages 1+2)
   files: pink_oregon_trail.html, NOTES_v2.7.md
   summary: Four density tiers (compact/standard/large/jumbo) driven by
            data-ui-density on document root from window.innerWidth.
            CSS rules per tier override --portrait-size,
            --action-btn-height, --callout-max-w. JS updateUIDensity()
            on init + resize. All UI text uses clamp() for smooth
            in-tier scaling: ribbon, action buttons, team portraits,
            event titles/flavor/narrative.

2. fix(v2.7): fort silhouette resize (Stage 3)
   files: pink_oregon_trail.html, NOTES_v2.7.md
   summary: Fort SVG reduced from 180x100 base to 130x70, translate
            from (160,240) to (220,310). Visual occupation drops from
            33.8% to 23.1% of visible canvas on a 16:9 display. Other
            scene extras audited (river/hunt/bandit/hidden figure) —
            none needed similar resize.

3. fix(v2.7): preserveAspectRatio meet on character layer (Stage 4)
   files: pink_oregon_trail.html, NOTES_v2.7.md
   summary: Backdrop layer keeps xMidYMax slice; character layer
            changes from slice to xMidYMid meet so wagon/fort/
            characters are never cropped at extreme widescreen
            aspect ratios. Backdrop shows through transparent
            letterbox bands.

4. chore(v2.7): build report + 6-resolution test reproduction
   files: BUILD_REPORT_v2.7.md
   summary: Final size 584.5 KB. Fort before/after measurement
            (33.8% → 23.1% on 16:9 canvas). Stage 5 reproduction
            steps for 1024×600 / 1366×768 / 1920×1080 / 2560×1440 /
            3840×2160 / 414×896. Open questions about jumbo tier
            sizing for teacher's 55" TV (NEEDS-PLAYTEST).
```

Alternatively this can be one squashed `feat(v2.7): responsive
scaling overhaul` commit. Per-stage split mirrors v2.5/v2.6.

After commits land, Nicholas should re-run the deployment workflow:
```sh
cp pink_oregon_trail.html docs/index.html
git add docs
git commit -m "Deploy v2.7 to GitHub Pages"
git push origin main
```

The deployed copy will then have the responsive layout immediately
visible to Gabby and the teacher.

---

## Verdict

Three small focused fixes that compound: fort no longer dominates
the scene, UI chrome and typography scale through four tiers from
Chromebook to 4K TV, and the character layer never crops at extreme
aspect ratios. v2.6 graphics overhaul confirmed intact and
unaffected. File grew 3.7 KB (~0.6%).

The single most important next step for Nicholas: play through the
6-resolution test battery in DevTools' device toolbar emulation,
then have the teacher try the deployed copy on her 55" TV. If
buttons or text feel too small from across a classroom, the
jumbo-tier `--action-btn-height` and clamp() max values are the
first things to bump.

— v2.7 responsive scaling overhaul complete.
