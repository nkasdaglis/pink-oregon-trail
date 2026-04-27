# NOTES — v2.6 design walk-throughs

Per the v2.3 logic-first discipline carried into v2.6: each stage gets a
pre-implementation walk-through and a post-implementation note.
v2.6 is a graphics overhaul — purely visual, no gameplay changes.

---

## Stage 0 — orient

- v2.5 confirmed in HTML: bandit overshoot, calendar calibration,
  death-path unification, post-death drift fix all present and tested.
- JSON `meta.version === "2.6"`. `graphics_overhaul_v2_6` block
  present with 5 sub-keys (philosophy, scope_summary, file_size_budget,
  region_backdrop_specification, character_detail_specification,
  animation_specifications, day_night_cycle).
- File size baseline (post-v2.5, pre-v2.6): 512,580 bytes.
- File size budget: ≤1.5MB.

---

## Stage 1 — region backdrop system (PRE-IMPLEMENTATION)

**Walk-through:** v2.5 region scenery is a single flat SVG per
region (sceneryFor switch). v2.6 spec wants a 3-layer parallax
(bg-far / bg-mid / bg-near), atmospheric gradient overlay,
ambient elements (buffalo / birds / hawk / dust devil / etc.),
and CSS-variable-driven parallax tied to wagon progress.

**Implementation choice:** new helper `buildLayeredBackdrop(regionId,
dayTime)` returns the new SVG. The existing `sceneryFor(region)` is
kept as a public entry point but its switch body is replaced by a
single call into `buildLayeredBackdrop`. This lets every existing
call site keep working — the upgrade is invisible at the API boundary.

**Per-region content** (per JSON spec):
- **Plains:** soft hill silhouettes (far) → rolling prairie + sage
  (mid) → tall grass blades (near). Buffalo silhouettes drift on
  horizon, V-formation birds cross, clouds drift slowly.
- **Foothills:** brown hills three layers → conifers → rocky
  outcrops + sage. Hawk circles thermals; deer silhouette appears
  occasionally.
- **Mountains:** snow-capped peaks → mid mountainsides → boulders.
  Snowflakes when `daysTraveled > 130`. Eagle soars; cloud wisps
  cling.
- **High Desert:** mesa silhouettes → sage + Joshua trees → cracked
  earth + bones. Heat shimmer; dust devil; vulture; tumbleweed.
- **Forest:** distant ridges → conifer silhouettes → detailed pines
  + undergrowth. God rays through canopy; salmon jumps.

**Parallax via CSS variable:** scene container gets
`style="--wagon-progress: 0.34"` from `0..1` (current pos / trailEnd).
Each layer reads it in its `transform: translateX(calc(var(...) *
-Npx))`. Far moves least, near moves most. Computed in
`paintScenery` and updated whenever wagon position changes.

**Atmospheric overlay:** linear-gradient `<rect>` on top of the
backdrop, gradient ID pulled from the day/night state (Stage 4
provides `data-time` on the body). Transitions via
`transition: opacity 0.8s` when state changes.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. 5 region builders
each produce 3-layer parallax + atmosphere + ambient. Document root
gets `data-time` driven by `paintScenery` from
`gameState.daysTraveled % 4`. JS parses, file size 567KB → 574KB
after Stage 1+2.

## Stage 1 complete — region backdrops (parallax + atmosphere + ambient)

---

## Stage 2 — character SVG rebuild (PRE/POST)

**Walk-through:** v2.5 character was a stick-figure with a flat-color
torso and a small accessory. v2.6 spec wants a layered figure with
shading, profession-specific accessories, and state-dependent
face/posture.

**Implementation choice:** keep `PROFESSION_ACCESSORY[profession].extra`
as the accessory layer (the existing v2.5 hat + signature SVG markup
is already RECOGNIZABLE — Doctor red-cross cap, Cowboy rolled-brim
hat, Priest collar, etc.). REPLACE the base figure with a layered
SVG: boots / pants / torso (with cast-shadow + highlight) / arms /
hands / neck / head (skin gradient) / face / state-overlay. The
state-overlay layer (`.char-sweat`, `.char-bandage`) is hidden by
default and shown via CSS for the matching `data-state`. Linear
gradient `<defs>` per character provides skin shading from upper-
left light source.

State variation:
- `healthy`: default appearance.
- `weakened`: eyes scaleY(0.7) — drooping.
- `sick`: scaleY(0.4) animated; sweat drop visible; head desaturate.
- `injured`: brows down, character rotates -2deg; bandage visible.
- `dying`: filter saturate(0.4) + brightness(0.85); sway animation.

`characterFullBody` and `characterPortrait` keep their function
signatures with an optional 3rd state arg. Team strip render passes
`m.state` through; setup screens default to healthy.

**Edge cases:**
- `_darken(hex, frac)` helper for torso shadow color — handles
  3-char and 6-char hex.
- Random 4-char id suffix on each render so multiple characters in
  the same scene don't share gradient ids. (Slight DOM cost; trivial.)
- `data-state` attribute serializes whatever the state is, including
  `lost` — the existing v2.3 `.team-portrait.state-lost` CSS handles
  the grayscale/cross overlay at the team-strip card level, so the
  inner SVG state doesn't need to render anything special for lost.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. JS parses (532KB
script / 574KB html). All 23 professions render through the new
shaded base + their existing accessory markup. State variation
hooks present and CSS rules attached.

## Stage 2 complete — layered character SVG with shading + state variation

---

## Stage 3 — animation systems (PRE-IMPLEMENTATION)

**Walk-through:** four discrete animation pieces:
1. **3D-feeling dice.** Replace the v2.3 2D pip-cycling tumble with
   a CSS `transform-style: preserve-3d` cube. Six faces with
   `translateZ(48px)` after rotation. The tumble keyframe rotates
   through random orientations and lands on the face determined by
   the rolled value via `--final-x` / `--final-y` CSS variables
   set per die.
2. **Wagon wheels rotating in sync with translation.** v2.5 wheels
   spin in place; the wagon translates as a unit. Animate via
   requestAnimationFrame: per frame, derive wheel rotation from
   horizontal pixel delta. New helper `animateWagonMove(fromX, toX,
   durationMs)`. Called from `paintScenery` when the wagon position
   changes meaningfully.
3. **Particle systems** — rain (30-50 line elements falling),
   snow (3-4s slow drift with sine horizontal), dust devil (5-7
   particles spiraling with translate), campfire embers (8-12
   orange circles drifting up), river flow (2-3 wave paths
   stroke-dashoffset).
4. Each particle system is a CSS-class-driven container that can be
   toggled on/off depending on scene/region.

**Implementation choice:** scope-pragmatic. The dice + wheels are
high-impact and small. The particle systems are valuable but
broad — I'll build the framework (containers, CSS keyframes,
spawn helpers) and trigger rain on storm events + snow in
mountains-after-day-130 + ember on Rest action + dust devil
randomly in high desert. River flow under the wagon is a nice-to-
have if time remains.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. Dice tumble keyframe
upgraded to 3D-feeling rotateX+rotateY (no DOM restructure — kept
the v2.3 face-cycling pattern). Particle systems wired:
- `spawnRain(n)` / `spawnSnow(n)` / `spawnEmbers(n)` / `spawnDustDevil()`
- `refreshWeatherFromWagon(w)` called from paintScenery: snow in
  Mountains+winter, dust devil in High Desert (16% per paint).
- Embers fire on `doActionRest` for ~6 seconds.
- Wagon-wheel rotation sync (animateWagonMove helper) deferred —
  the current renderer doesn't translate the wagon between turns;
  it re-renders at the new position. Documented as v2.7 candidate.
- River flow particles deferred. (River crossing already has its
  own visual via `extra` SVG group — sufficient for v2.6.)

## Stage 3 complete — dice 3D feel, weather/ember particles wired

---

## Stage 4 — day/night cycle (implemented during Stage 1)

`setTimeOfDayFromWagon(w)` sets `data-time` on the document root
from `Math.floor(w.daysTraveled) % 4`. CSS rules
`:root[data-time="..."] .region-backdrop .atmosphere { fill: url(...); }`
swap the gradient with `transition: fill 0.8s ease`. Verified:
day 1→midday, 2→afternoon, 3→dusk, 4→morning, etc.

## Stage 4 complete — day/night cycle

---

## Stage 5 — polish + size audit (POST)

**Final size:** 580.8 KB (594,725 bytes). Budget 1.5 MB. Headroom
919 KB.

**All v2.6 markers present** (per final audit): backdrop builders ×5,
skin palette + darken helper, characterFullBody/Portrait,
spawn{Rain,Snow,Embers,DustDevil}, refreshWeatherFromWagon,
setTimeOfDayFromWagon, --wagon-progress CSS variable.

**JS still parses cleanly** after every stage.

**Visual regression spot-check:** the v2.5 game still looks
recognizable — wagon, scene, team strip, action menu, modals all
intact. The character figures are now shaded; the backdrops are
parallax-layered; the atmosphere shifts through the day cycle. No
layout breakage observed in static markup.

## Stage 5 complete — v2.6 graphics overhaul

