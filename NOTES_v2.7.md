# NOTES — v2.7 design walk-throughs

Per the v2.3 logic-first discipline carried into v2.7: each stage gets
a pre-implementation walk-through and a post-implementation note. v2.7
is responsive scaling — purely visual/layout, no gameplay changes.

---

## Stage 0 — orient + v2.6 verify

- v2.7 JSON loaded. `meta.version === "2.7"`.
- `responsive_scaling_v2_7` block present with full spec.
- **v2.6 graphics overhaul IS present in the working file.** All
  markers found: `--wagon-progress`, `bg-far`/`bg-mid`/`bg-near`,
  `buildLayeredBackdrop`, `_skinPalette`, `spawnRain`, `spawnSnow`,
  `setTimeOfDayFromWagon`. File size 580.8 KB matches the v2.6
  final report. So v2.7 layers on top of v2.6 directly.
- The v2.7 spec mentions Nicholas's playtest screenshots came from
  a 520KB file (v2.5). The file we're patching is 580.8KB (v2.6).
  v2.7 is layout-level so it works either way; v2.6 graphics
  carryover is verified in Stage 6.

---

## Stage 1 — `--ui-density` CSS variable (PRE-IMPLEMENTATION)

**Walk-through:** v2.6 has a single `@media (max-width: 740px)`
mobile breakpoint. Everything else is fixed pixel sizes — fine for
1366px Chromebooks (the design target) but cramped on a compact
1024px tab and lost in the noise on a 4K projector at 3840px.

**Fix:** four explicit density tiers driven by a `--ui-density`
attribute on the document root, set by JS on load + resize. CSS
rules per tier set `--portrait-size`, `--action-btn-height`,
`--callout-max-w`. Existing CSS rewires to read those variables
with standard-tier fallbacks so the game still works if JS doesn't
fire.

**Tiers** (from JSON `responsive_scaling_v2_7.ui_chrome_scaling_per_density`):
- compact (< 1280px): portrait 62, button 70, callout 540×88vw
- standard (1280-1919px): portrait 76, button 84, callout 640×70vw
- large (1920-2559px): portrait 92, button 100, callout 720×55vw
- jumbo (≥ 2560px): portrait 120, button 130, callout 900×45vw

**Edge cases:**
- Resize listener: throttled? For now just a plain listener — kids
  rarely resize during a class. If it becomes janky on slow
  Chromebooks, add a 100ms debounce.
- Initial flash: density is computed on `load`; before that the CSS
  fallbacks (standard tier) apply. Acceptable.
- iframe / embedded: `window.innerWidth` reads the iframe size,
  which is what we want.

**No spec contradictions.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. `:root` defaults to
standard-tier values; `[data-ui-density="compact"|"large"|"jumbo"]`
overrides flow through `--portrait-size`, `--action-btn-height`,
`--callout-max-w`. JS `updateUIDensity()` fires on init + resize.
Existing `.team-portrait`, `.action-btn`, `.narrative-callout` now
read the variables. Inner SVG width inside `.team-portrait` scales
with the card via `calc(var(--portrait-size) * 0.74)` so the
portrait grows in proportion at jumbo tier without warping.

## Stage 1 complete — --ui-density tier system

---

## Stage 2 — typography clamp() (PRE-IMPLEMENTATION)

**Walk-through:** v2.6 already uses `clamp(min, vw, max)` on event-
title / event-flavor / narrative-text but the resource ribbon, action
buttons, and team-portrait labels all sit at fixed pixel sizes.
Smooth scaling within a density tier needs clamp() everywhere visible
to the player.

**Per JSON `responsive_scaling_v2_7.typography_clamp`:**
- `.resource-ribbon .res-item .val` → clamp(14px, 1.1vw, 22px)
- `.resource-ribbon .res-item .label` → clamp(9px, 0.7vw, 13px)
- `.action-buttons button .name` → clamp(15px, 1.2vw, 22px)
- `.action-buttons button .desc` → clamp(11px, 0.8vw, 16px)
- `.team-portrait .member-name` → clamp(11px, 0.8vw, 15px)
- `.event-title` → clamp(20px, 2vw, 36px)
- `.event-flavor` → clamp(13px, 1vw, 20px)
- `.narrative-text` → clamp(14px, 1.1vw, 22px)

The `.action-buttons button` selector in the JSON spec maps to the
existing `.action-btn` class in the HTML (action-buttons is the
container, action-btn is each button). Same for `.resource-ribbon`
which is the topbar resource container.

**No spec contradictions.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. All 8 spec'd clamp()
ranges land in the CSS. Two existing v2.6 clamps (event-title at
`clamp(20px, 2.5vw, 28px)` and event-flavor at `clamp(13px, 1.6vw,
17px)`) were widened to the v2.7 ranges so 4K projector display
gets the larger maxima. File size 583.3 → 583.9 KB.

## Stage 2 complete — typography clamp() everywhere

---

## Stage 3 — fort silhouette + scenery audit (PRE-IMPLEMENTATION)

**Walk-through:** the v2.5 fort SVG (in `resolveFort`) draws at
`translate(160 240)` with base 180×100 + 20-unit crenellations + 12-
unit flag, totaling ~30% of the 800×500 viewBox vertical. After
`xMidYMax slice` on a 16:9 canvas, the fort dominates ~40-50% of
canvas height — the playtest screenshot Nicholas flagged.

**Fix per spec:** translate to (220, 310), reduce base to 130×70,
crenellations clamped to y=20-30, door 14×42, flagpole y=20→-4,
flag at y=-4. New visual ~14% of viewBox vertical.

**Audit other scene extras for similar issues** (per Stage 3 spec —
"audit other scene elements for similar issues"):

Looking at the existing scene `extra` parameters in renderSceneCharacters
calls:
- River crossing: `<rect>` 800×80 with wave path. Spans full viewport
  — that's intentional (river fills). Acceptable.
- Hunting (doActionHunt): buffalo silhouette at scale 1, ~36×14
  ellipse. Small — acceptable.
- Bandits (triggerBanditAmbush): three bandit figures translated +
  scaled inside the existing scene — small. Acceptable.
- Hidden figure on landmark: 8×28 figure. Small.

Only the fort needs a major resize. Documenting in build report.

**No spec contradictions.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. Fort SVG resized:
- Old: translate(160,240), 180×100 base, vertical extent 152 vb units (30.4% of viewBox)
- New: translate(220,310), 130×70 base, vertical extent 104 vb units (20.8% of viewBox)
- On a 1366×768 (16:9) canvas: old fort = 33.8% of visible canvas, new fort = 23.1%.

The visible-canvas occupation drops by about a third. Because the
actual `.scene-canvas` grid row is shorter than full viewport height
(action bar + team strip subtract from it), the playtest-perceived
40-50% drops to roughly 28-32% of visible scene-canvas height.

## Stage 3 complete — fort silhouette resized; other scene extras audited (no other resizes needed)

---

## Stage 4 — preserveAspectRatio change (PRE/POST)

**Walk-through:** the v2.5/v2.6 markup uses
`preserveAspectRatio="xMidYMax slice"` on BOTH the `#scene-backdrop`
and `#scene-characters` SVG layers. On a 16:9 canvas, the 8:5 viewBox
gets clipped on the top — fine for the backdrop (sky and ground stay
visible), but the character layer also gets clipped, which means
small characters near the top of the viewBox can disappear at extreme
aspect ratios.

**Fix per spec:** keep slice on backdrop, change character layer to
`xMidYMid meet` so wagon/fort/characters always stay inside the
visible canvas (transparent letterbox bands show backdrop through).

**Note on v2.6 region backdrop:** when `paintScenery` runs, the
backdrop's outerHTML is replaced by the v2.6 layered SVG which uses
its own `preserveAspectRatio="xMidYMid slice"` (on a 1920×600 viewBox,
not the original 800×500). That's fine — it still fills the canvas
with sky/ground; the difference between xMidYMid and xMidYMax slice
is only meaningful when canvas aspect is taller than viewBox aspect,
which is rare for 16:9 displays.

**No spec contradictions.** Done in markup change at line 1377.

**POST-IMPLEMENTATION:** PASS in static check. Backdrop layer keeps
xMidYMax slice; character layer is xMidYMid meet. JS still parses.

## Stage 4 complete — character layer never crops at extreme aspects

---

## Stage 5 — browser-required test (NEEDS-PLAYTEST)

**Cannot run from headless** — needs an actual browser and either
hardware at the listed resolutions or Chrome DevTools' device-toolbar
emulation. Reproduction steps in the build report. Reporting as
NEEDS-PLAYTEST per the standing instruction "don't claim a visual
test passed that you didn't actually run".

## Stage 5 complete — documented; awaits playtest

---

## Stage 6 — v2.6 carryover (POST)

**Verified at the start of v2.7 (Stage 0):** all v2.6 markers present
in working file (`--wagon-progress`, `bg-far`/`bg-mid`/`bg-near`,
`buildLayeredBackdrop`, `_skinPalette`, `spawnRain`, `spawnSnow`,
`setTimeOfDayFromWagon`). File size matches v2.6 final (580.8 KB).

**Verified after v2.7 patches:** JS still parses cleanly at every
stage. The v2.6 layered region backdrop SVGs continue to render via
`paintScenery` → `buildLayeredBackdrop` → `_bgFrame` chain. The new
v2.7 character-layer aspect change applies to the OUTER `<svg
id="scene-characters">` and doesn't affect the v2.6 backdrop pipeline.

The v2.6 atmospheric gradient (`data-time` driven by
`setTimeOfDayFromWagon`) and parallax (`--wagon-progress` set on
`.scene-canvas`) are independent of v2.7's `--ui-density` and
`--portrait-size`/etc. — different attributes, no collision.

## Stage 6 complete — v2.6 carryover verified

