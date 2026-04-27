# Pink Oregon Trail — v2.7 Amendment (Responsive Scaling)

## Context

Playtest screenshots from Nicholas reveal that the game's layout doesn't adapt to display size. At 25% browser zoom on a high-DPI laptop, the UI is unreadable. At 100% zoom, the fort silhouette dominates the scene canvas (~50% of vertical space). When the teacher projects on a 55" TV at 4K resolution, the UI chrome will be far too small and the scenery proportions will look wrong from across the classroom.

Three intertwined problems, all visible in the same screenshots:

1. **Oversized scenery elements.** The fort silhouette in `resolveFort` is drawn at `translate(160 240)` with base width 180 and height 100 plus crenellations and flagpole. Within the 800×500 viewBox, that's ~30% vertical occupation — far too aggressive. After rendering with `xMidYMax slice` on a 16:9 canvas, the fort dominates 40-50% of canvas height.

2. **No responsive design beyond a single mobile breakpoint.** The CSS has `@media (max-width: 740px)` for narrow phones, and that's it. No tier handling for laptops vs. 4K monitors vs. projectors. UI chrome (resource ribbon items, action buttons, team portraits) sits at fixed pixel sizes — appropriately scaled for ~1366px wide displays, too small for 4K TVs, often too big for compact Chromebooks.

3. **Inconsistent aspect ratio handling.** Both the scene-backdrop and scene-characters layers use `viewBox="0 0 800 500"` (8:5) with `preserveAspectRatio="xMidYMax slice"`. On a 16:9 canvas (1.78:1), the SVG scales up to fill width and crops the top. The fort is drawn near the bottom of the viewBox so it stays visible — but anything in the upper viewBox region gets cropped on standard widescreen displays.

The v2.6 graphics overhaul exists in NOTES_v2.6.md but the file Nicholas is playing (520KB, uploaded for diagnosis) is the v2.5 build (594KB v2.6 build is uncommitted per his standing instruction). v2.7 must work whether v2.6 has been merged or not — the responsive scaling fix is layout-level and applies to both.

JSON updated to v2.7. New top-level key: `responsive_scaling_v2_7`. Confirm `meta.version === "2.7"` before starting.

## Build order

Verify v2.6 status first. Then six small focused stages.

### Stage 0 — Verify what's deployed

Read `pink_oregon_trail.html` and check:
- Does it contain the string `--wagon-progress` (v2.6 parallax CSS variable)?
- Does it contain class names `bg-far`, `bg-mid`, `bg-near`?
- Total file size: v2.5 = ~520KB; v2.6 = ~595KB

If v2.6 markers are present: apply v2.7 on top of v2.6.
If absent and file size ~520KB: v2.6 was never merged into the working file. Surface this in NOTES_v2.7.md as a finding. Apply v2.6 first per its amendment, THEN v2.7. Don't skip v2.6 — its parallax scenery will inherit the v2.7 responsive layout cleanly.

### Stage 1 — Layout density CSS variable

Add a `--ui-density` CSS variable on the root element, set by JavaScript on window load and on resize:

```javascript
function updateUIDensity() {
  const w = window.innerWidth;
  let density = 'standard';
  if (w < 1280) density = 'compact';
  else if (w >= 2560) density = 'jumbo';
  else if (w >= 1920) density = 'large';
  document.documentElement.dataset.uiDensity = density;
}
window.addEventListener('load', updateUIDensity);
window.addEventListener('resize', updateUIDensity);
```

Then in CSS:

```css
:root[data-ui-density="compact"] {
  --portrait-size: 62px;
  --action-btn-height: 70px;
  --callout-max-w: min(540px, 88vw);
}
:root[data-ui-density="standard"] {
  --portrait-size: 76px;
  --action-btn-height: 84px;
  --callout-max-w: min(640px, 70vw);
}
:root[data-ui-density="large"] {
  --portrait-size: 92px;
  --action-btn-height: 100px;
  --callout-max-w: min(720px, 55vw);
}
:root[data-ui-density="jumbo"] {
  --portrait-size: 120px;
  --action-btn-height: 130px;
  --callout-max-w: min(900px, 45vw);
}
```

Then update existing CSS to consume these variables:

```css
.team-portrait { width: var(--portrait-size, 76px); }
.action-buttons button { min-height: var(--action-btn-height, 84px); }
.narrative-callout { max-width: var(--callout-max-w, min(640px, 70vw)); }
```

The fallback values match the standard tier so the game works even before JS runs.

### Stage 2 — Typography clamp() everywhere

Replace all fixed font sizes with `clamp(min, vw-relative, max)`:

```css
.resource-ribbon .res-item .val { font-size: clamp(14px, 1.1vw, 22px); }
.resource-ribbon .res-item .label { font-size: clamp(9px, 0.7vw, 13px); }
.action-buttons button .name { font-size: clamp(15px, 1.2vw, 22px); }
.action-buttons button .desc { font-size: clamp(11px, 0.8vw, 16px); }
.team-portrait .member-name { font-size: clamp(11px, 0.8vw, 15px); }
.event-title { font-size: clamp(20px, 2vw, 36px); }
.event-flavor { font-size: clamp(13px, 1vw, 20px); }
.narrative-text { font-size: clamp(14px, 1.1vw, 22px); }
```

This produces smooth scaling within a density tier — combined with Stage 1, you get tier-based jumps PLUS smooth scaling within each tier.

### Stage 3 — Fix the fort silhouette and audit other oversized scenery

In `resolveFort`, replace the fort SVG group with reduced dimensions:

```javascript
// Current (too big):
'<g transform="translate(160 240)"><rect x="0" y="40" width="180" height="100" fill="#A67B5B" stroke="#5C4A36" stroke-width="2"/>' +
'<polygon points="0,40 0,20 18,32 36,20 54,32 72,20 90,32 108,20 126,32 144,20 162,32 180,20 180,40" fill="#A67B5B" stroke="#5C4A36" stroke-width="1.5"/>' +
'<rect x="78" y="80" width="24" height="60" fill="#5C4A36"/><line x1="90" y1="20" x2="90" y2="-12" stroke="#3D2817" stroke-width="2"/>' +
'<polygon points="90,-12 110,-7 90,-2" fill="#c63a3a"/></g>'

// Replace with (smaller, proportional):
'<g transform="translate(220 310)"><rect x="0" y="30" width="130" height="70" fill="#A67B5B" stroke="#5C4A36" stroke-width="1.5"/>' +
'<polygon points="0,30 0,16 13,24 26,16 39,24 52,16 65,24 78,16 91,24 104,16 117,24 130,16 130,30" fill="#A67B5B" stroke="#5C4A36" stroke-width="1.2"/>' +
'<rect x="58" y="58" width="14" height="42" fill="#5C4A36"/><line x1="65" y1="16" x2="65" y2="-4" stroke="#3D2817" stroke-width="1.5"/>' +
'<polygon points="65,-4 80,0 65,4" fill="#c63a3a"/></g>'
```

The fort base is now 130×70 viewBox units (was 180×100) — about 28% smaller in each dimension. Total visual footprint reduced by ~50%. Fort now occupies ~14% of viewBox vertical space, allowing sky and surrounding scenery to breathe.

Audit other scene elements for similar issues:

- `resolveLandmark` extras (Soda Springs, Independence Rock decorations) — check if any are similarly oversized
- River crossing scene's water rect — should still span full width but height reasonable
- Bandit ambush silhouettes — should be small relative to scene
- Any landmark daguerreotype illustrations that ALSO render as scene extras

For each oversized element found, apply the same proportional shrink (~28% smaller in each dimension).

### Stage 4 — preserveAspectRatio change for character layer

The scene-backdrop and scene-characters layers currently both use `xMidYMax slice`. This causes content to be CROPPED at extreme aspect ratios. The fix:

- **Scene backdrop**: KEEP `xMidYMax slice` (so sky and ground always fill the canvas — no letterbox bands)
- **Scene characters**: CHANGE to `xMidYMid meet` (so wagon/fort/characters are NEVER cropped — letterbox bands are transparent, showing the backdrop's sky underneath)

In the HTML:

```html
<!-- Backdrop layer keeps slice -->
<svg class="scene-backdrop" id="scene-backdrop" viewBox="0 0 800 500" preserveAspectRatio="xMidYMax slice"></svg>
<!-- Characters layer changes to meet -->
<svg class="scene-characters" id="scene-characters" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet"></svg>
```

This is the smallest possible change with the highest impact. Backdrop continues to fill the visible canvas at any aspect ratio. Foreground elements (wagon, fort, hero characters) are always fully visible — never cropped at the edges.

### Stage 5 — Test at multiple resolutions

Browser-required test. Take screenshots at:

- 1024×600 (small Chromebook tab)
- 1366×768 (standard Chromebook)
- 1920×1080 (laptop/monitor)
- 2560×1440 (4K laptop or large monitor)
- 3840×2160 (4K TV/projector)
- 414×896 (mobile portrait — graceful degradation)

For each, walk into a fort scene. Verify:
- Fort occupies ~15-20% of canvas vertical space (not 40-50%)
- Sky color visible above the fort
- UI chrome (ribbon, team strip, buttons) appropriately sized for the display
- Text readable from arms-length (laptop) or across-room (TV)
- No element cut off by viewport edges
- No double scrollbars

Document the results in NOTES_v2.7.md. The 4K TV test is critical — it's the teacher's projection scenario. If buttons or text look tiny from across a classroom, bump the jumbo tier sizes.

### Stage 6 — Test the v2.6 carryover

If v2.6 graphics overhaul was applied before v2.7: verify that the parallax scenery (region backdrops with bg-far/bg-mid/bg-near layers) renders correctly under the new responsive layout. The v2.6 atmospheric gradients should fill the canvas at all densities. Region transitions should still look smooth.

If v2.6 was NOT applied before v2.7: surface this in the build report. The current v2.5 scenery looks acceptable under v2.7 responsive layout. v2.6 can be applied later as a separate amendment without conflict.

## Build report requirements

Standard build report plus:

- v2.6 deployment status (was it merged? markers present?)
- Per-density tier UI screenshots described in text (compact/standard/large/jumbo)
- Fort proportion before-and-after measurement (% of canvas vertical occupation)
- Any other oversized scenery elements found and resized in Stage 3
- Open questions about whether jumbo tier sizes are correct for the teacher's specific 55" TV (this can only be confirmed in real testing)

## Critical reminders (unchanged)

- Single self-contained HTML file. No frameworks. No external requests.
- No git commits during build. Append "git work pending" to build report.
- No words "AI", "Claude", "GPT", "LLM", "model", "agent", "chatbot" anywhere user-facing.
- Period 1840s voice for narration.
- Preserve all v2.6 graphics work if present.

This is a focused 1-2 hour build. Stage 1 + 2 + 3 + 4 are small CSS/SVG edits. Stage 5 is browser-required testing. Stage 6 is verification only. The total code change is probably under 200 lines.

The visible result on Nicholas's laptop should be: fort scene where the fort looks like a normal-sized building with sky and ground visible, UI chrome appropriately sized at 100% browser zoom, and a layout that scales gracefully when projected to a 4K TV. Gabby's classroom audience won't have to squint.
