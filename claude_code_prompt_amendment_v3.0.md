# Pink Oregon Trail — v3.0 Amendment (Mobile + Player Visibility)

## Context

Two issues from playtest:

1. **Mobile play is broken.** On phones (414×896 portrait, 896×414 landscape) and narrow tablets, the current layout can't show scene + callout + action menu + team strip + mini-map all at once. Something is always cut off. Specific failure: callout-on-left at 42vw is too narrow at 414px viewport (~174px), and the centered-bottom mobile fallback covers the entire scene.

2. **Multi-wagon player positions invisible on mini-map.** When 4-6 wagons are near the same trail position (start, forts, finish), the 10px colored circles overlap into a single blob. Players can't see which wagon is whose or what space they're on.

JSON updated to v3.0. New top-level key: `v3_0_mobile_and_visibility`. Confirm `meta.version === "3.0"` before starting.

**Scope: 3 stages, ~4 hours of focused build time.** Stage 1 (drawer-based mobile UI) is the structural change with the most ripple. Stage 2 (pin needles) is contained to the mini-map renderer.

---

## Build order

### Stage 1 — Drawer-based mobile UI

**Approach:** On mobile (or any narrow-portrait viewport), the layout becomes a vertical sandwich. Scene canvas takes the top ~60%. A fixed bottom-zone (40%) holds the active interaction (callout when one is firing, action buttons otherwise). Team strip and mini-map collapse into bottom-edge tabs that slide up as overlays when tapped.

This is **Approach C** from design discussion — the modern hybrid-game pattern (Pokémon GO, Roblox mobile). Confirmed by Nicholas.

#### Viewport detection

Update the existing density updater:

```javascript
function updateUIDensity() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  let density = 'standard';
  
  // NEW: mobile detection — narrow OR narrow-portrait orientation
  if (w < 740 || (w < 1024 && h > w)) {
    density = 'mobile';
  } else if (w < 1280) {
    density = 'compact';
  } else if (w >= 2560) {
    density = 'jumbo';
  } else if (w >= 1920) {
    density = 'large';
  }
  
  document.documentElement.dataset.uiDensity = density;
}
```

The mobile tier joins compact, standard, large, jumbo. Existing density-tier CSS rules continue to apply where relevant (typography clamps, action button heights), but mobile gets its own layout structure.

#### Mobile layout structure

```
┌────────────────────────────────────────┐
│  resource ribbon (32px tall)          │  ← always visible
├────────────────────────────────────────┤
│                                        │
│  scene canvas (60% of remaining vh)   │  ← scene fills here
│                                        │
├────────────────────────────────────────┤
│                                        │
│  interaction panel (40% of remaining)  │  ← callout when active
│  - shows callout when event firing    │     OR action buttons
│  - shows action menu otherwise         │
│                                        │
├──[Team]────────────────[Map]──────────┤  ← drawer tabs (28px)
└────────────────────────────────────────┘
```

When user taps the **Team** tab: a drawer slides up from the bottom over everything below the resource ribbon. Drawer takes ~70% of viewport height. Shows full team strip with state info inline (no hover — tap a portrait for tooltip; tap outside drawer to dismiss).

When user taps the **Map** tab: same drawer mechanism, shows the mini-map at near-fullscreen size with all pin-needle wagon markers visible (Stage 2).

#### CSS pattern

Use `position: fixed` for the interaction panel and drawer tabs. Drawers use:

```css
.drawer {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: 70vh;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(251, 246, 240, 0.96);
  backdrop-filter: blur(2px);
  z-index: 200;
  overflow-y: auto;
  border-top: 2px solid var(--rose-deep, #B85770);
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -8px 32px rgba(61, 40, 23, 0.25);
}
.drawer.open {
  transform: translateY(0);
}
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 199;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}
.drawer-overlay.open {
  opacity: 1;
  pointer-events: auto;
}
```

Tap on the overlay (the dark background behind the drawer) closes the drawer.

#### Drawer tab styling

```css
.drawer-tab {
  position: fixed;
  bottom: 0;
  width: 80px; height: 28px;
  background: var(--rose-deep);
  color: white;
  font-family: Georgia, serif;
  font-size: 13px;
  font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.2);
  z-index: 150;
  cursor: pointer;
  user-select: none;
}
.drawer-tab.team { left: 16px; }
.drawer-tab.map { right: 16px; }
```

Show drawer tabs ONLY when `data-ui-density="mobile"`. Hide on desktop.

#### Audio gate for mobile

Mobile browsers (especially iOS Safari) require a user gesture before audio plays. Wire the audio controller initialization to the FIRST tap or click anywhere in the document:

```javascript
let audioGated = true;
document.addEventListener('click', function gateAudio() {
  if (audioGated) {
    audioController.init();
    audioGated = false;
    document.removeEventListener('click', gateAudio);
  }
}, { once: true, capture: true });
```

If after 3 seconds the audio hasn't been gated yet AND we're on mobile, show a small hint: "Tap anywhere to enable sound." Auto-dismiss when first tap happens.

#### Save state notice

On first mobile launch (detect via `localStorage.getItem('mobileNoticeShown') !== '1'`), show a brief toast:

> "Your progress saves on this device. Different devices keep separate journeys."

Auto-dismiss after 6 seconds. Set the flag so it doesn't appear again.

#### Tap-to-tooltip on team portraits

Replace hover-tooltip behavior with tap-to-show. The CSS rule for showing the tooltip should use `:focus-within` or `[data-tooltip-open="true"]` instead of `:hover`. JavaScript:

```javascript
function attachTooltipHandler(portraitEl) {
  portraitEl.addEventListener('click', () => {
    // Close any other open tooltips
    document.querySelectorAll('[data-tooltip-open="true"]').forEach(el => {
      if (el !== portraitEl) el.removeAttribute('data-tooltip-open');
    });
    // Toggle this one
    if (portraitEl.dataset.tooltipOpen === 'true') {
      portraitEl.removeAttribute('data-tooltip-open');
    } else {
      portraitEl.dataset.tooltipOpen = 'true';
    }
  });
}
// Tap anywhere else closes all tooltips
document.addEventListener('click', e => {
  if (!e.target.closest('.team-portrait')) {
    document.querySelectorAll('[data-tooltip-open="true"]').forEach(el => {
      el.removeAttribute('data-tooltip-open');
    });
  }
});
```

Desktop hover behavior preserved via `@media (hover: hover)`. Mobile uses tap.

#### Orientation hint

If on mobile in portrait orientation (innerHeight > innerWidth), show a one-time gentle hint after 2 seconds:

> "Rotate your phone for the best experience"

Use `sessionStorage` flag so it shows once per session. Don't lock orientation — just suggest. Some kids will play in portrait on the couch and that should still work.

#### Acceptance test for Stage 1

Open the game on a phone (or use browser DevTools mobile emulation):
- iPhone 14 (393×852) portrait — drawers work, interaction panel visible, scene visible
- iPhone 14 landscape (852×393) — same
- iPad mini portrait (768×1024) — uses mobile layout (narrow-portrait detection)
- iPad mini landscape (1024×768) — uses standard layout
- 1366×768 desktop — uses compact layout (existing v2.7 behavior)

For each: walk into a fort scene. Verify scene visible, callout panel visible at bottom, choices tappable. Tap Team drawer — slides up, all 7 portraits visible, tap each shows tooltip. Tap outside drawer — closes. Same for Map drawer.

### Stage 2 — Smart-stacking pin-needle wagon markers

**Replaces:** the current 10px colored circle wagon markers on the mini-map.

#### Marker design

Each wagon's marker is now a vertical pin needle:

```
       ┌──┐
       │ G│   ← 8-10px circle with player initial, wagon color
       └──┘
        │
        │     ← 2px wide vertical line, wagon color
        │
        ●     ← attached to the trail line at the wagon's space
```

#### Smart-stacking algorithm

When rendering the mini-map, for each wagon:

1. Compute wagon's current space position (linear interpolation along trail line)
2. Group all wagons by their `currentSpace` property
3. For each group with multiple wagons:
   a. Sort by player index (or wagon ID)
   b. Assign each wagon a stack rank: 0, 1, 2, 3, 4, 5
   c. Render needle length = `16 + (stackRank * 8)` pixels  
      (16, 24, 32, 40, 48, 56 — six possible heights without overlap)
   d. Render needle x-offset = `(stackRank - (groupSize-1)/2) * 5` pixels from space center  
      (1 wagon: 0; 2 wagons: -2.5, +2.5; 6 wagons: -12.5, -7.5, -2.5, +2.5, +7.5, +12.5)
4. The result: stacked wagons fan out vertically AND slightly horizontally, like a candlestick holder of pins. Each is independently visible.

#### Wagon color palette (from v2.3)

```javascript
const WAGON_COLOR_PALETTE = [
  '#B85770',  // rose
  '#D4AF37',  // gold
  '#3A5C7A',  // navy
  '#3D5A3D',  // forest
  '#7A4D6E',  // plum
  '#A87850'   // copper
];
```

Wagon at index 0 gets rose, index 1 gets gold, etc. The pin needle and head circle both use the wagon's color. The initial inside the head is white (or `#FBF6F0` cream) for legibility.

#### SVG structure per wagon marker

```html
<g class="wagon-pin" data-wagon-id="0" data-active="false">
  <line x1="X" y1="Y" x2="X-offset" y2="Y-needleLength" 
        stroke="#B85770" stroke-width="2" stroke-linecap="round"/>
  <circle cx="X-offset" cy="Y-needleLength" r="5" 
          fill="#B85770" stroke="#FBF6F0" stroke-width="1.5"/>
  <text x="X-offset" y="Y-needleLength+1.5" 
        text-anchor="middle" font-size="6" font-weight="700" 
        fill="#FBF6F0">G</text>
</g>
```

Where X is the wagon's space-center on the trail, Y is the trail line's y-position, and offset/length come from the smart-stacking algorithm.

#### Active wagon pulse

Currently-active wagon's pin needle pulses gently:

```css
.wagon-pin[data-active="true"] {
  animation: wagonPinPulse 1.5s ease-in-out infinite;
  transform-origin: bottom;
}
@keyframes wagonPinPulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.15); }
}
```

#### Where pin needles render

Apply the same renderer to:
- The compact mini-map at the bottom of the scene (single-row layout, standard+ density)
- The fullscreen-expanded mini-map (click/tap to expand)
- The mobile drawer-map (Stage 1 drawer)

All three use the same SVG render function. Just different sizes via viewBox scaling.

#### Acceptance test for Stage 2

- Single-player game: one rose pin needle visible at the wagon's space.
- 4-player Competitive: 4 pin needles, each different color and initial, fanning when stacked at the same space (e.g., all at start space).
- 6-player Competitive: 6 pin needles fan vertically when all at one space.
- Wagons spread across trail: each pin shows independently at its space.
- Active wagon pulses, others static.

### Stage 3 — Setup screen mobile reflow

The setup screens currently use multi-column grids that overflow narrow viewports.

**Profession selection grid:** Currently 5 columns × 5 rows. On mobile:

```css
@media (max-width: 740px) {
  .profession-grid {
    grid-template-columns: 1fr 1fr;  /* 2 columns */
    gap: 8px;
  }
  .profession-card {
    /* full-width within column */
    min-height: 90px;
    padding: 8px;
    font-size: 13px;
  }
}
```

**Name input rows:** stack each name input as full-width, 50px tall (touch target minimum):

```css
@media (max-width: 740px) {
  .name-input-row {
    flex-direction: column;
    align-items: stretch;
  }
  .name-input-row input {
    width: 100%;
    min-height: 50px;
    font-size: 16px;  /* prevents iOS zoom on focus */
  }
}
```

**Difficulty cards** (Easy/Medium/Hard): stack vertically full-width on mobile:

```css
@media (max-width: 740px) {
  .difficulty-cards {
    grid-template-columns: 1fr;
  }
  .difficulty-card {
    width: 100%;
  }
}
```

**Wagon count selector:** large tap targets, stack vertically same way.

**Begin Journey button:** 60px tall on mobile, full-width minus 16px margin.

#### Acceptance test for Stage 3

Walk through full setup flow on mobile (393×852):
- Mode select: cards stack, all readable, tap targets ≥44px tall
- Wagon count (Competitive only): same
- Difficulty: cards stack
- Profession select: 2-column grid scrolls vertically, all 23 professions reachable
- Naming screen: name inputs stack, full width, no horizontal scroll
- Begin Journey: tap target large enough

---

## Validation requirements

Per v2.3 discipline:
- Pre-implementation walk-through in NOTES_v3.0.md for each stage
- Post-implementation validation note after each stage

Add user stories to `simulation_logic_validation`:
- **US-16 (mobile drawer)**: Player on iPhone in landscape opens game. Walks to a fort. Sees scene + callout + action menu without horizontal scroll. Taps Team drawer — full team visible. Taps Map drawer — mini-map at near-fullscreen visible.
- **US-17 (pin needle stacking)**: 6-player Competitive game. All 6 wagons at start space. Mini-map shows 6 pin needles fanning out vertically with each player's initial inside their colored head. Tap any pin to see player name (optional enhancement — basic acceptance is just visual distinguishability).
- **US-18 (mobile audio gate)**: First mobile launch — silence until first tap. After tap, music plays. Hint message dismisses correctly.

## Build report requirements

- Per-stage commit ledger (under "git work pending" — uncommitted)
- Mobile screenshots described at 4 device emulations (iPhone 14 portrait/landscape, iPad mini portrait/landscape)
- Pin needle test at 1, 4, 6 wagon counts
- US-16, US-17, US-18 PASS / FAIL / NEEDS-PLAYTEST verdicts
- Open questions

## Critical reminders (unchanged)

- Single self-contained HTML file. No frameworks. No external requests.
- No git commits during build. All git work in build report.
- Period 1840s voice for narration.
- No words "AI", "Claude", etc., anywhere user-facing.
- Preserve all v2.5–v2.9 mechanics. v3.0 is layout + visibility only.

This is a focused 4-hour build. Stage 1 is the bulk of the work (drawer infrastructure, mobile detection, all the small mobile-specific tweaks). Stage 2 and 3 are smaller. After v3.0 lands, Gabby can play on her phone, and Competitive games stop hiding wagons behind each other.

Stage 1 specifically — Build the drawer infrastructure first as a single working unit. Test it works on a desktop browser at narrow widths. THEN integrate the mobile-specific behaviors (audio gate, save notice, orientation hint, tap tooltips). Don't try to do all of Stage 1's six sub-pieces in parallel — you'll get tangled.
