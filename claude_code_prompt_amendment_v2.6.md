# Pink Oregon Trail — v2.6 Amendment (Graphics Overhaul)

## Context

After v2.5, gameplay is calibrated and the simulation works. The remaining complaint is visual: players described the graphics as "pre-1980" — flat vector silhouettes against simple backgrounds. This amendment is a focused graphics overhaul that stays within the single-file offline constraint while substantially raising the visual register toward published indie game polish (Reigns, 80 Days, Florence aesthetic).

**Apply v2.5 first.** v2.6 builds on v2.5's calendar and death-overlay fixes. Confirm `meta.version === "2.6"` before starting.

JSON contains the full specification at `graphics_overhaul_v2_6`. This amendment is a roadmap; the JSON is the detailed reference.

## Scope at a glance

1. **Five region backdrops** redrawn with 3-layer parallax, gradient atmospheres, time-of-day variation, animated weather and ambient elements
2. **Twenty-three character SVGs** rebuilt with detail, shading, profession-specific accessories, and state-dependent face/posture variation
3. **Animation systems**: 3D-feeling dice, properly-rolling wagon wheels, particle effects (rain, snow, dust devils, embers, river flow)
4. **Day/night ambient cycle**: sky color and lighting shift across calendar days

File size: ~500KB → ~1.2-1.5MB. Still single offline HTML. Still works on a USB stick.

## Build order

1. **Stage 1** — Region backdrop system (foundational; scenery determines everything else)
2. **Stage 2** — Character SVG rebuild (one helper function rewrite, applied across team strip + scene rendering)
3. **Stage 3** — Animation systems (dice, wheels, particles)
4. **Stage 4** — Day/night cycle (small CSS variable update, threaded through scenery)
5. **Stage 5** — Polish pass + asset audit (verify no character/scenery looks incongruent in any state combination)

This is a one-stage-per-day kind of build if you're being thorough. If pushing fast, can collapse to a 2-3 hour focused session. The character rebuilds are the bulk of the work — 23 professions × ~5 detail layers each = ~115 SVG layer compositions. Don't shortcut here; players are going to look at these every turn.

---

# Stage 1 — Region backdrop system

Replace the current `applyRegion` and scenery rendering functions with a layered system. Each region produces an SVG with three groups: `.bg-far`, `.bg-mid`, `.bg-near`. Atmospheric overlay sits on top with a CSS-variable-driven gradient.

## Structure

```html
<svg class="region-backdrop" viewBox="0 0 1920 600" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="atmosphere-{region}-{time}">...</linearGradient>
    <radialGradient id="vignette-{region}">...</radialGradient>
  </defs>
  <rect class="atmosphere" fill="url(#atmosphere-{region}-{time})"/>
  <g class="bg-far">  <!-- distant horizon, soft, low-contrast --> </g>
  <g class="bg-mid">  <!-- middle distance with more detail --> </g>
  <g class="bg-near"> <!-- foreground with crisp edges --> </g>
  <g class="ambient-elements">  <!-- birds, buffalo, dust devils --> </g>
  <rect class="vignette" fill="url(#vignette-{region})"/>
</svg>
```

## Parallax via CSS variables

When the wagon advances, set a CSS variable on the backdrop container: `--wagon-progress: 0.34` (0 to 1, current position / trail end). Each layer translates by:

```css
.bg-far  { transform: translateX(calc(var(--wagon-progress) * -100px)); }
.bg-mid  { transform: translateX(calc(var(--wagon-progress) * -300px)); }
.bg-near { transform: translateX(calc(var(--wagon-progress) * -800px)); }
```

Far moves slowly, near moves quickly — classic parallax. Adjust the multiplier values to taste.

## Five regions — implementation details

See `graphics_overhaul_v2_6.region_backdrop_specification` in JSON for the full spec. Per-region highlights:

**Plains:** distant horizon with two soft hill silhouettes; mid-layer rolling hills with sage; near-layer tall grass blades that sway in a sine-wave loop (CSS keyframe). Buffalo silhouettes drift slowly across the horizon. Birds in V formation cross occasionally. Cloud layer drifts at 0.3× wagon speed.

**Foothills:** brown rolling hills in three layers, sparse conifers in mid-layer, rocky outcrops in foreground. Hawk circles on slow thermals.

**Mountains:** snow-capped peaks (jagged silhouettes, 3 parallax layers). Cloud wisps cling to peaks. **When `daysTraveled > 130`, snowflakes fall** (40-60 particles via SVG circles with CSS keyframe animation, varying speeds for depth).

**High Desert:** mesa silhouettes in distance, sage flats and Joshua trees in mid-layer, cracked earth and bones in foreground. Heat shimmer at horizon (subtle SVG filter `feTurbulence` with low frequency). Dust devil spawns randomly every 30-60 seconds and spirals across the screen for ~3 seconds.

**Forest:** dense conifer forest in three depth layers, light filtering through canopy via SVG gradient (god-rays effect). Distant water visible through trees, salmon occasionally jumps.

## Atmospheric gradients

Each region has gradient definitions for `morning`, `midday`, `dusk`, plus optional `winter` for mountains. The atmosphere `<rect>` uses the gradient determined by current time-of-day (Stage 4). Transition smoothly via `transition: opacity 0.8s` when the gradient swaps.

## Acceptance test

Walk through all 5 regions during one journey. Verify parallax produces visible depth (far layer moves slower than near). Verify ambient elements appear and animate (buffalo drift, birds cross, hawk circles, dust devil spawns). Verify atmospheric tint changes based on day count. Verify snowflakes appear in mountains after day 130.

---

# Stage 2 — Character SVG rebuild

The current `characterFullBody(profession, skinTone)` produces a stick-figure-proportions silhouette with a flat-color torso and small accessory. Replace with a layered figure that has shading, distinct profession accessories, and state-dependent variation.

## New layered structure

Each character renders 8-10 SVG groups in this back-to-front order:

```html
<svg viewBox="0 0 80 140" class="character" data-state="{state}">
  <defs>
    <linearGradient id="skin-{toneId}">...</linearGradient>
    <linearGradient id="torso-{profId}">...</linearGradient>
  </defs>
  <g class="char-boots">...</g>
  <g class="char-pants">...</g>
  <g class="char-torso">...</g>
  <g class="char-arms">...</g>
  <g class="char-hands">...</g>
  <g class="char-neck">...</g>
  <g class="char-head">...</g>
  <g class="char-face">  <!-- eyes, nose, mouth, eyebrows --> </g>
  <g class="char-hair">...</g>
  <g class="char-hat">...</g>
  <g class="char-accessory">  <!-- profession-specific --> </g>
  <g class="char-state-overlay">  <!-- bandage, sweat drop, etc --> </g>
</svg>
```

## Shading

Each major shape (torso, arms, head, hat) uses `<linearGradient>` with 2-3 stops. Light source from upper-left:

```xml
<linearGradient id="skin-medium" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0%"  stop-color="#F2C6A0"/>
  <stop offset="60%" stop-color="#E8B888"/>
  <stop offset="100%" stop-color="#C49870"/>
</linearGradient>
```

Cast shadows: 15-20% opacity black `<path>` overlays where one part falls behind another (under the chin, behind the arms, under the hat brim).

## State-dependent variation

Drive variation via the `data-state` attribute on the SVG and CSS rules. Example:

```css
.character[data-state="sick"] .char-face .eye { 
  /* closed eyes — show only the eyelid line */
  transform: scaleY(0.2);
}
.character[data-state="sick"] .char-face .mouth { 
  d: path("M 32 95 Q 36 92 40 95"); /* small frown */
}
.character[data-state="sick"] .char-state-overlay {
  display: block;
  /* show sweat drop on forehead */
}
.character[data-state="dying"] {
  filter: saturate(0.4) brightness(0.85);
  animation: dyingSway 3s ease-in-out infinite;
}
```

State table (from JSON `graphics_overhaul_v2_6.character_detail_specification.state_variation`):

- **healthy:** neutral mouth, eyes open, normal eyebrows, upright posture
- **weakened:** slight droop in eyes, neutral mouth, shoulders slumped
- **sick:** closed eyes blinking, small frown, paler skin, small sweat drop, head bowed, occasional cough animation
- **injured:** wincing eyes (eyebrows down), leaning slightly, bandage overlay
- **dying:** eyes mostly closed, slight grimace, deep desaturation, slight sway
- **lost:** existing v2.3 (full grayscale + cross icon)

## Profession accessories — detailed

JSON `graphics_overhaul_v2_6.character_detail_specification.profession_accessories_detailed` has per-profession descriptions. Implement each as a `<g class="char-accessory">` with the relevant SVG primitives. Each accessory should be RECOGNIZABLE at a glance — kids should be able to tell Hunter from Cowboy from Trapper without reading the name label.

Highlights:
- **Doctor:** white cap with red cross, stethoscope draped around neck, black bag at side
- **Hunter:** wide-brim hat, bandolier across chest, quiver of feathered arrows, compound bow in hand
- **Cowboy:** rolled-brim cowboy hat, bandana around neck, vest, six-shooter holster
- **Priest:** black robe with white collar, cross necklace, Bible in hand
- **Magician:** top hat with star detail, long black cape, wand with small spark effect, pencil mustache

Take the time to do these well — they're what kids will look at every turn.

## Backward compatibility

The two current functions (`characterFullBody` and `characterPortrait`) keep their signatures. Only their internals change. Every call site continues to work. The team strip, naming screen, scene composition, death overlay all get the new look automatically.

## Acceptance test

For each of the 23 professions, render the character in all 5 living states. Verify:
- Profession is recognizable from accessories
- State is recognizable from face + posture
- Shading is consistent (light from upper-left)
- No clipping or layout breaks

---

# Stage 3 — Animation systems

## 3D-feeling dice

Current dice are 2D SVG with face-flip animations. Replace with CSS 3D transform:

```html
<div class="die" data-final-face="4">
  <div class="die-face face-1">⚀</div>
  <div class="die-face face-2">⚁</div>
  <div class="die-face face-3">⚂</div>
  <div class="die-face face-4">⚃</div>
  <div class="die-face face-5">⚄</div>
  <div class="die-face face-6">⚅</div>
</div>
```

```css
.die { 
  transform-style: preserve-3d; 
  width: 96px; height: 96px;
  position: relative;
  animation: dieTumble 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
.die-face { 
  position: absolute; inset: 0;
  background: #FBF6F0;
  border: 2px solid #5C4A36;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 64px;
  color: #3D2817;
}
.face-1 { transform: translateZ(48px); }
.face-2 { transform: rotateY(90deg) translateZ(48px); }
.face-3 { transform: rotateY(180deg) translateZ(48px); }
.face-4 { transform: rotateY(-90deg) translateZ(48px); }
.face-5 { transform: rotateX(90deg) translateZ(48px); }
.face-6 { transform: rotateX(-90deg) translateZ(48px); }

@keyframes dieTumble {
  0%   { transform: rotateX(0deg) rotateY(0deg) scale(1); }
  30%  { transform: rotateX(720deg) rotateY(540deg) scale(1.1); }
  60%  { transform: rotateX(1080deg) rotateY(900deg) scale(1.05); }
  100% { transform: rotateX(var(--final-x)) rotateY(var(--final-y)) scale(1); }
}
```

JavaScript sets `--final-x` and `--final-y` based on the rolled value to land on the correct face. Each die uses dot-pattern SVG faces (preferred over Unicode ⚀⚁⚂ which are inconsistent across systems).

## Wagon wheel rotation synchronized with translation

**Current bug:** wheels spin in place, but wagon translates as one unit. Wheels appear to slide, not roll.

**Fix:** synchronize wheel rotation with horizontal translation. For every X pixels of horizontal movement of the wagon, rotate the wheels by `(X / circumference) * 360` degrees.

Implementation via JavaScript:

```javascript
function animateWagonMove(fromPos, toPos, durationMs) {
  const wagon = document.querySelector('.player-wagon');
  const wheels = wagon.querySelectorAll('.wheel');
  const wheelRadius = 6;  // viewBox units
  const circumference = 2 * Math.PI * wheelRadius;
  
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / durationMs);
    const eased = 1 - Math.pow(1 - t, 3);  // ease-out cubic
    const currentX = fromPos + (toPos - fromPos) * eased;
    const rotationDeg = (currentX / circumference) * 360;
    
    wagon.style.transform = `translateX(${currentX}px)`;
    wheels.forEach(w => {
      w.style.transform = `rotate(${rotationDeg}deg)`;
    });
    
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
```

The rotation now MATCHES the translation. Wheels actually roll forward.

## Particle systems

**Rain:** 30-50 small SVG line elements, each with CSS `animation: rainfall {duration} linear infinite`, with staggered `animation-delay` so they don't all start together. Re-spawn at top by virtue of the loop.

```css
.rain-drop {
  position: absolute;
  width: 1px;
  height: 12px;
  background: rgba(180, 200, 220, 0.6);
  animation: rainfall 0.8s linear infinite;
}
@keyframes rainfall {
  from { transform: translate(0, -20px); opacity: 0; }
  10%  { opacity: 1; }
  to   { transform: translate(-15px, 100vh); opacity: 0; }
}
```

JavaScript spawns 30-50 with random `left` positions and random `animation-delay` (0 to 0.8s).

**Snow:** similar pattern but slower (3-4s duration), using small white circles instead of lines, with sine-wave horizontal drift via more complex keyframe.

**Dust devil:** SVG group with 5-7 small particles rotating around a central transform-origin while the group itself translates. Trigger randomly every 30-60 seconds in high desert.

**Campfire embers:** 8-12 small orange circles drifting upward from fire origin with fade-out. Loop continuously when in Rest scene.

**River flow:** 2-3 horizontal SVG paths shaped as gentle waves, animated via `stroke-dashoffset` to create flowing water illusion. Different speeds at different depths.

## Acceptance test

- Push On: dice tumble in 3D, settle on faces, wagon rolls forward (wheels rotate) along trail
- Storm event: rain falls visibly, ~30-50 drops at any moment
- Mountains region after day 130: snow falls
- High desert: dust devil spawns periodically
- Rest action: campfire embers drift upward from fire
- River crossing: water flows visibly under the wagon

---

# Stage 4 — Day/night cycle

Add a CSS variable on the body element: `--time-of-day: morning | midday | afternoon | dusk`. Compute from `gameState.daysTraveled % 4`:

- 0 → morning
- 1 → midday  
- 2 → afternoon
- 3 → dusk

When the day advances, update the CSS variable. The atmospheric gradient on each region backdrop reads from this variable and transitions smoothly (0.8s ease).

```css
:root[data-time="morning"] .region-backdrop[data-region="plains"] .atmosphere {
  fill: url(#atmosphere-plains-morning);
}
:root[data-time="dusk"] .region-backdrop[data-region="plains"] .atmosphere {
  fill: url(#atmosphere-plains-dusk);
}
/* ...etc... */

.atmosphere { transition: fill 0.8s ease; }
```

This is a small change that has surprisingly large visual impact — kids notice that "the trail looks different in the afternoon."

## Acceptance test

Walk through 12-16 days and verify the sky tint cycles (morning → midday → afternoon → dusk → morning...). Verify the transition is smooth, not jarring.

---

# Stage 5 — Polish pass + audit

Walk through every game state and verify visual consistency:

- All 23 characters render correctly in all 5 living states
- All 5 regions render correctly in all 4 times-of-day
- Death overlay shows the deceased character's correct profession (post-v2.5 unification)
- River, fort, and landmark scenes integrate the new region backdrops
- Bandit ambush scene composes correctly with the new graphics
- Performance: no janky animations on a Chromebook (target 60fps for the new particle systems)

If any scene looks worse than v2.5 due to the rebuild, fix it before declaring done.

## Build report additions

- File size before and after (target: ≤1.5MB)
- Performance: rough FPS measurement during heavy scenes (storm + multiple characters + region animations)
- Visual regression notes: any state combinations that look incongruent
- A few representative screenshots in the report (described in text — what would kids see at Day 67 in mountains region with team morale 9? At Day 145 winter in mountains with 3 dying members?)

---

# Critical reminders

- Single self-contained HTML file. All assets inline (SVG, CSS, JS).
- Total file size ≤ 1.5MB after build.
- No external network requests. Game still runs from USB on a school Chromebook with WiFi off.
- 60fps target on a 1366×768 Chromebook. If a heavy scene drops below 30fps, simplify (fewer particles, fewer parallax layers).
- Period 1840s aesthetic. The new graphics should feel like richly illustrated children's-book period art, not modern game art. No anachronisms.
- No words "AI", "Claude", "GPT", "LLM", "model", "agent", "chatbot" anywhere user-facing.
- Preserve all v2.5 mechanics. Graphics overhaul is purely visual — no gameplay changes.

This build is bigger than v2.5 in line count but cleaner in structure — most changes are CSS and SVG, not logic. Take the time to make the characters look really good. Kids will look at them every turn for an entire class period.
