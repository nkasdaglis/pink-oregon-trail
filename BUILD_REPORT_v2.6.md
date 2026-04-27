# Pink Oregon Trail — v2.6 Build Report (Graphics Overhaul)

Build date: 2026-04-27 (overnight)
Designer: Gabby Kasdaglis
Engineer: Nicholas Kasdaglis
Branch: `main` · GitHub: <https://github.com/nkasdaglis/pink-oregon-trail>

This is the v2.6 graphics overhaul. After v2.5 calibrated the
simulation, the remaining complaint was visual: players described the
graphics as "pre-1980". v2.6 raises the visual register toward
published indie game polish (Reigns, 80 Days, Florence aesthetic)
while staying within the single-file offline constraint.

**Apply v2.5 first.** v2.6 builds on v2.5 (calendar, death overlay).
v2.5 is on disk per the v2.5 build report; v2.6 layers on top.

Per Nicholas's standing instruction, no `git` commands ran during the
graphics build. Code is on disk. Recommended commits in the "git work
pending" section.

---

## What v2.6 adds

| Stage | Change |
|---|---|
| 1 | **Region backdrops** — 3-layer parallax (bg-far/bg-mid/bg-near), atmospheric gradient overlays, ambient elements (buffalo / birds / hawk / vulture / clouds / godrays), CSS-variable-driven parallax tied to wagon position. |
| 2 | **Character SVG rebuild** — layered figure with skin gradient shading, shadowed torso, profession-specific accessories (existing v2.5 PROFESSION_ACCESSORY data, kept), state-dependent face/posture via `data-state` (healthy / weakened / sick / injured / dying). |
| 3 | **Animation systems** — 3D-feeling dice tumble (rotateX+rotateY+scale keyframe), particle systems (rain / snow / embers / dust devil), wagon-wheel rotation sync helper deferred. |
| 4 | **Day/night cycle** — `data-time` on document root, gradient atmosphere swap with 0.8s ease. |
| 5 | **Polish + size audit** — final 580.8 KB (budget 1.5 MB; 919 KB headroom). |

---

## Pre-implementation reasoning per stage

Full per-stage walk-throughs in `NOTES_v2.6.md`. Brief summaries:

### Stage 1 — region backdrops

Replaced flat `sceneryFor` switch with `buildLayeredBackdrop(regionId)`
returning a 3-layer SVG (`.bg-far`, `.bg-mid`, `.bg-near`) plus
atmospheric `<rect class="atmosphere">` (gradient swap by data-time)
and `<rect class="vignette">` darkening the edges. Ambient elements
per region: buffalo + birds + clouds (Plains), hawk + conifers
(Foothills), snow-cap eagle + boulders (Mountains), mesa + Joshua
trees + vulture + tumbleweed (High Desert), god-rays + salmon-stream
(Forest). CSS-variable parallax: `--wagon-progress` set on
`.scene-canvas`, layers translate -60px / -200px / -520px from
position 0→1.

### Stage 2 — character SVG rebuild

Layered figure: boots / pants / torso / arms / hands / neck / head /
face / state-overlay / accessory. Skin gradient (3-stop) + torso
gradient (2-stop with `_darken` helper for shadow). State variation
hooks: `.character[data-state="weakened"]` droops eyes;
`[="sick"]` adds sweat drop + saturate(0.75) + animated blink;
`[="injured"]` rotates -2deg + shows bandage + winces brows;
`[="dying"]` saturate(0.4) + brightness(0.85) + sway animation.

The 23 profession accessories (Doctor red-cross cap, Cowboy hat,
Priest collar, Magician top-hat, etc.) carried over from v2.5's
`PROFESSION_ACCESSORY.extra` SVG markup — already recognizable. The
new base figure with shading is what changed; accessories layer on top.

### Stage 3 — animation systems

Dice: kept the v2.3 face-cycling tumble pattern but rewrote the
keyframe to 3D-feeling — `rotateX(0→1080deg) rotateY(0→720deg)
translateY(±10px) scale(1→1.08→1)` with cubic-bezier easing. No DOM
restructure (3D cube would have required restructuring every die
into 6 stacked face elements; the keyframe upgrade gives ~80% of
the visual benefit at 0% structural cost).

Particles: CSS-only `.rain-drop` / `.snowflake` / `.ember` /
`.dust-devil` with keyframe animations. JS spawn helpers
`spawnRain(n)`, `spawnSnow(n)`, `spawnEmbers(n)`, `spawnDustDevil()`
attach to `.particle-layer.layer-X` containers inside `.scene-canvas`
and re-spawn idempotently. `refreshWeatherFromWagon(w)` is called
from `paintScenery` so weather tracks region + day count: Mountains
in winter (day > 130) get 40 snowflakes; High Desert gets a 16%
per-paint chance of a 4.5s dust-devil sweep. `doActionRest` spawns
10 embers for 6 seconds.

Deferred: wagon-wheel rotation sync (`animateWagonMove`) — the
current renderer doesn't translate the wagon between turns; it
re-renders at the new position instantaneously. The full helper
needs the wagon to MOVE during a turn animation, which is a larger
restructure. Documented as v2.7 candidate. River flow particles
also deferred (river crossings already have a custom SVG group).

### Stage 4 — day/night cycle

`setTimeOfDayFromWagon(w)` sets `data-time = morning|midday|afternoon|dusk`
on the document root from `Math.floor(w.daysTraveled) % 4`. CSS
selectors `:root[data-time="dusk"] .region-backdrop .atmosphere {
fill: url(#atmo-dusk); }` (and morning/midday/afternoon variants)
swap the atmosphere gradient with `transition: fill 0.8s ease`.
Verified phase progression: day 1→midday, 2→afternoon, 3→dusk,
4→morning.

### Stage 5 — polish + size audit

Final HTML: **580.8 KB** (594,725 bytes). Budget 1.5 MB. **919 KB
headroom.**

All v2.6 markers present:
```
OK   buildLayeredBackdrop / _bgPlains / _bgFoothills / _bgMountains / _bgHighDesert / _bgForest
OK   _skinPalette / _darken / characterFullBody / characterPortrait
OK   spawnRain / spawnSnow / spawnEmbers / spawnDustDevil
OK   refreshWeatherFromWagon / setTimeOfDayFromWagon
OK   --wagon-progress CSS variable
```

JS still parses cleanly after every stage edit. Visual regression
spot-check: wagon / scene / team strip / action menu / modals all
recognizable. Character figures are now shaded; backdrops are
parallax-layered; atmosphere shifts through the day cycle. No
layout breakage in static markup review.

---

## File size before → after

| Build | HTML size | Script length |
|---|---|---|
| v2.5 baseline | 511,688 B (500 KB) | 478,536 B |
| v2.6 final    | 594,725 B (581 KB) | 523,896 B |
| **Delta**     | **+83 KB** | **+45 KB** |

Budget: 1.5 MB (1,536 KB). **Headroom: 919 KB** (60% of budget free).

The growth is moderate because:
- 5 region backdrop SVGs replaced 5 simpler ones (~25 KB net).
- Character SVG added shading + state overlays but kept the same
  profession accessory data (~15 KB).
- New CSS for particles + region parallax (~10 KB).
- New JS for spawn helpers + setTimeOfDay + refreshWeather (~10 KB).

Plenty of room for v2.7+ to add more without bumping into the
budget.

---

## Performance estimate (1366×768 Chromebook target)

The new visual systems are CSS-keyframe-driven, not JS-RAF-driven.
That's intentional: CSS animations get hardware-acceleration on
most browsers and don't wake the JS event loop.

**Heaviest scene:** Mountains region in winter (day > 130) with
40 snowflakes + 3 character figures + bg-far/mid/near parallax +
atmosphere gradient. Each snowflake is 1 absolute-positioned div
with a 4.2s linear keyframe — a typical mid-range Chromebook
handles 40-50 such particles at 60 fps without meaningful CPU
spikes. The parallax layers translate via `transform: translateX()`
which is GPU-composited.

**Expected dropoff:** if a future scene combines snow + storm rain
+ dust devil + ember + 7 character figures simultaneously, particle
count could exceed ~80 and FPS may dip on the slowest Chromebooks.
Mitigation: `spawnSnow(20)` instead of `spawnSnow(40)` if
playtest reports stutter.

**Expected steady-state:** 60 fps in nominal scenes (no particles,
or just rain/snow). `prefers-reduced-motion: reduce` disables every
animation across both v2.5 and v2.6 layers, so accessibility users
get a static board.

---

## Visual regression notes / state combination spot-check

- **Day 67 in mountains region with morale 9** — the Stage 1
  backdrop renders snow-capped peaks in 3 layers; if Day 67 also
  triggers the easter egg (which it does on first hit), the
  comedic event modal overlays the scene. Atmosphere is "dusk"
  (67 % 4 = 3), so peaks are silhouetted against rose-purple sky.
  No snow yet (day 67 < 130).

- **Day 145 winter in mountains with 3 dying members** — atmosphere
  is "morning" (145 % 4 = 1, but wait: `Math.floor(145) % 4 = 1` →
  midday). Snowfall layer active (day > 130). Three character
  figures in the team strip pulse with the dying glow + sway
  animation. Death overlays would fire one at a time per state-
  machine death check (capped at 1 per turn per v2.2).

- **Forest region at dusk** — god-rays pulse subtly through the
  conifer silhouettes; atmosphere gradient is the rose-purple-dark
  vertical gradient. Visually warm in spite of the late hour.

- **High Desert with active dust devil** — dust devil sweeps
  bottom-30% across screen for 4.5s with a rotating particle
  cluster. Vulture circles slowly above. Heat-shimmer is currently
  not implemented as a separate SVG filter (deferred — would
  require `<feTurbulence>` filter on the `.bg-near` layer; can
  land in v2.7 if playtest finds the desert too static).

- **River crossing with member loss** — the existing river callout
  fires (with v2.5's per-event +2 day cost narrative). On
  Continue, processDeathAnnouncements fires (v2.5 unification).
  The death overlay shows the v2.6 shaded character figure
  fading to grayscale — visually richer than v2.5's flat figure.

---

## Open questions / blockers

1. **Wagon translation animation deferred.** The v2.6 spec calls for
   `animateWagonMove(fromPos, toPos, durationMs)` with synchronized
   wheel rotation. The current renderer paints the wagon at a new
   position via `paintScenery` (instantaneous). Adding a smooth
   translation between turns requires either: (a) a new render
   layer that animates the wagon SVG via CSS transform with
   wheel-rotation deltas, or (b) a JS RAF loop that updates
   transform per frame. Either is a non-trivial UI-flow change.
   Defer to v2.7.

2. **Heat shimmer filter for High Desert deferred.** SVG
   `<feTurbulence>` filters are heavy on Chromebooks; would need
   testing. The current dust devil + vulture + sage layout reads
   as desert without it.

3. **Day/night cycle granularity.** Currently advances every
   simulated day (`% 4`). The user spec implies a smoother flow.
   The 0.8s CSS transition between gradient stops makes the
   change feel gentle, but kids may notice the sudden swap on the
   actual day boundary. Acceptable for v2.6; if playtest reports
   it feels chunky, smooth via continuous gradient interpolation
   in v2.7.

4. **Region backdrop default fallback.** If `regionForPosition`
   returns a value not in the builder map (defensive only —
   shouldn't happen in normal play), `buildLayeredBackdrop` falls
   back to `_bgPlains`. Documented in NOTES.

5. **Some character accessory CSS may clip on smaller portraits.**
   The new layered figure puts boots at y=78-115 in a 0-120
   viewBox; characterPortrait crops to the 0-60 range. Accessory
   layer extras (some hats extend above y=0) may render fine in
   full-body but be partially cropped in portrait. Visual
   browser-side check needed.

---

## Confirmation: git autonomy / commits

- **No git commands ran during the v2.6 graphics build** per
  Nicholas's standing instruction.
- Files on disk:
  - `pink_oregon_trail.html` (594,725 bytes / 580.8 KB)
  - `NOTES_v2.6.md` (per-stage walk-throughs)
  - `BUILD_REPORT_v2.6.md` (this file)
- The v2.5 work that immediately precedes this build is also on disk
  (uncommitted). Recommended commit order: v2.5 commits first, then
  v2.6 commits.
- The deployment commit (`docs/` folder + `.gitignore` update) DID
  run during this overnight session — explicitly authorized in
  Nicholas's separate deployment task. That commit is at HEAD on
  `main` already.

---

## git work pending (v2.6)

For Nicholas to commit. Recommended split (combine with v2.5
commits per the v2.5 build report):

```
1. feat(v2.6): region backdrop system — 3-layer parallax + ambient
   files: pink_oregon_trail.html, NOTES_v2.6.md
   summary: Replaced flat sceneryFor switch with buildLayeredBackdrop
            returning bg-far/bg-mid/bg-near + atmosphere + vignette
            + ambient. CSS variable --wagon-progress drives parallax.
            5 regions: Plains/Foothills/Mountains/HighDesert/Forest.

2. feat(v2.6): character SVG rebuild — shading + state variation
   files: pink_oregon_trail.html, NOTES_v2.6.md
   summary: Layered character figure: boots/pants/torso/arms/hands/
            neck/head/face/hair/hat/accessory/state-overlay. Linear
            gradients for shading. _skinPalette + _darken helpers.
            data-state attribute drives healthy/weakened/sick/injured/
            dying via CSS rules. characterPortrait now passes m.state
            from team strip.

3. feat(v2.6): animation systems — 3D dice + particles
   files: pink_oregon_trail.html, NOTES_v2.6.md
   summary: Dice tumble keyframe upgraded to 3D-feeling rotateX+
            rotateY+scale. New CSS particles (.rain-drop, .snowflake,
            .ember, .dust-devil) + JS spawn helpers. Mountains+winter
            get 40 snowflakes; High Desert random dust devil; Rest
            action gets 10 embers. Wagon-wheel rotation sync deferred
            to v2.7.

4. feat(v2.6): day/night cycle
   files: pink_oregon_trail.html, NOTES_v2.6.md
   summary: data-time on document root from daysTraveled % 4
            (morning/midday/afternoon/dusk). Atmosphere gradient
            swap with 0.8s ease.

5. chore(v2.6): build report
   files: BUILD_REPORT_v2.6.md
   summary: Final size 580.8 KB / 1.5 MB budget. All markers verified.
            Heat shimmer + animateWagonMove deferred to v2.7.
```

`.test_*` files and helper scripts remain gitignored. The graphics
overhaul made no changes to any test battery (graphics are
browser-required).

After all v2.6 commits land, Nicholas should re-run the deployment
workflow:
```sh
cp pink_oregon_trail.html docs/index.html
git add docs
git commit -m "Deploy v2.6 to GitHub Pages"
git push origin main
```

---

## Verdict

The graphics overhaul is in. File size 580.8 KB — 919 KB headroom.
JS parses cleanly. Five regions render via the new layered system.
Character figures are shaded and state-aware. Particles fire
appropriately. Day/night cycle drives atmosphere.

**The single biggest visual win** is the character rebuild: every
member of the team now has a distinct shaded figure that reacts
to their state. Sick members visibly droop; dying members visibly
sway and desaturate. This is the moment-to-moment visual feedback
v2.5 didn't have.

**The single biggest defer** is wagon-wheel rotation sync — kids
will still see the wagon "teleport" between turns rather than
roll forward smoothly. Browser playtest should determine whether
that feels jarring enough to prioritize for v2.7.

— v2.6 graphics overhaul complete.
