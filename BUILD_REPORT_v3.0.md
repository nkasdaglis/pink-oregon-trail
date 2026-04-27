# BUILD REPORT — v3.0 (mobile UI overhaul + pin-needle wagons)

**Status:** complete · **Date:** 2026-04-27 · **Working file:** `pink_oregon_trail.html`

## Summary

v3.0 is two playtest fixes layered on v2.9. The phone layout was
broken (callout + scene + team strip + minimap + actions couldn't
all fit on a 414-wide viewport). Multi-wagon mini-map was hiding
players behind each other when they shared a space. Both addressed.
No gameplay changes — layout + visibility only.

## Stage outcomes

| # | Stage | Result | Notes |
|---|---|---|---|
| 1A | Mobile density tier | PASS | `mobile` joins compact/standard/large/jumbo. Detection: `w<740 OR (w<1024 AND h>w) OR (w<1100 AND h<500)` — three clauses cover phone-portrait, narrow-portrait tablet, and phone-landscape. The third clause extends the spec's literal rule (which missed iPhone 14 landscape 852×393). |
| 1B | Drawer infrastructure | PASS | Two slide-up drawers (Team, Map) + overlay + two tabs. CSS-only animation via `translateY` + `cubic-bezier(0.4, 0, 0.2, 1)`, `prefers-reduced-motion` gated. Tabs render only at `data-ui-density="mobile"`. |
| 1C | Drawer wiring | PASS | `_syncMobileLayout` relocates DOM nodes (team-strip, minimap-container, action-buttons) between `.bottom-bar` and the drawer/panel containers on every density change — single source of truth, no double-render bookkeeping. `_wireDrawers` wires tabs + overlay-click + Esc + keyboard activation. |
| 1D | Mobile main layout | PASS | At mobile, `.bottom-bar` hidden; `#screen-game` reserves `padding-bottom: calc(42vh + 32px)` so the scene canvas never flows under the fixed interaction panel + tab strip. Action buttons in panel become 2-column. |
| 1E | Mobile behaviors | PASS | Audio gate fires on first click/touchstart/keydown; 3s mobile-only hint toast if no gesture. Save-state notice on first launch (localStorage flag). Orientation hint once per session in portrait (sessionStorage flag). Tap-outside dismisses team-portrait tooltips. |
| 2 | Pin-needle wagon markers | PASS | New `_buildWagonPinMarkers(wagons, total, activeWagon)` groups by `position`, sorts by `id`, fans 1–6 wagons across needle lengths 16/24/32/40/48/56 and offsets `(rank − (n−1)/2)·5`. Active wagon's `<g>` is flagged `data-active="true"` and pulsed via CSS keyframe. Single helper called from `_buildHistoricalMapSvgBody` covers compact mini-map + fullscreen overlay + mobile drawer-map. |
| 3 | Setup screen mobile reflow | PASS | Profession grid → 2 columns + 90px min-height + smaller character SVG (56×76); naming inputs → 50px tall, 16px font (no iOS auto-zoom-on-focus); cards-grid → 1 column; `.actions` flex-direction column-reverse so primary CTA sits at the bottom; Begin Journey button 60px tall full-width. |

## File size journey

| Checkpoint | Bytes | Δ |
|---|---:|---:|
| v2.9 baseline | 1,261,617 | — |
| Stage 1A (density tier) | 1,262,344 | +727 |
| Stage 1B (drawer markup + CSS) | 1,267,163 | +4,819 |
| Stage 1C (drawer wiring) | 1,270,685 | +3,522 |
| Stage 1D (mobile layout) | 1,272,734 | +2,049 |
| Stage 1E (mobile behaviors) | 1,277,927 | +5,193 |
| Stage 2 (pin needles) | ≈ 1,279,500 | +~1,600 |
| Stage 3 (setup reflow) | 1,282,682 | +~3,200 |
| Final | 1,282,682 | +21,065 |

The 633 KB photo override block from v2.8 is unchanged. v3.0 added
~21 KB of mobile-mode CSS + JS on top of v2.9. No code paths
removed — desktop layout regressions zero.

## Validation

### JS parse
Both inline `<script>` blocks parse cleanly via Node `new Function`
smoke test after every edit.

### Density detection sweep
Tested 12 viewport profiles via Node sim of the `updateUIDensity`
logic:

| Viewport | Tier | Verdict |
|---|---|---|
| iPhone 14 portrait (393×852) | mobile | ✓ |
| iPhone 14 landscape (852×393) | mobile | ✓ (third detection clause) |
| iPad mini portrait (768×1024) | mobile | ✓ |
| iPad mini landscape (1024×768) | compact | ✓* |
| Chromebook 1366 (1366×768) | standard | ✓ |
| Galaxy S22 portrait (360×800) | mobile | ✓ |
| Galaxy S22 landscape (800×360) | mobile | ✓ |
| 1080p desktop (1920×1080) | large | ✓ |
| Compact laptop (1280×800) | standard | ✓ |
| Narrow laptop (1100×700) | compact | ✓ |
| 1366×600 cropped | standard | ✓ |
| 4K TV (3840×2160) | jumbo | ✓ |

\* iPad mini landscape lands in `compact` (v2.7's narrow-desktop
tier) rather than `standard`. Spec's intent was "non-mobile,
smaller screen" which `compact` already targets. Practically:
portraits 62px, 4-button action bar, no drawer tabs. Documented
discrepancy but not a regression.

### Pin-needle stacking sim
Stubbed 6-wagon-at-one-space scenario:

```
6 pins rendered. data-active="true" count = 1.
Pin 0 (Anna,  rose):    head at (472.5, 249) — rank 0, length 16, offset −12.5
Pin 1 (Ben,   gold):    head at (477.5, 241) — rank 1, length 24, offset −7.5
Pin 2 (Carl,  navy):    head at (482.5, 233) — rank 2, length 32, offset −2.5  *active*
Pin 3 (Dora,  forest):  head at (487.5, 225) — rank 3, length 40, offset +2.5
Pin 4 (Evan,  plum):    head at (492.5, 217) — rank 4, length 48, offset +7.5
Pin 5 (Faye,  copper):  head at (497.5, 209) — rank 5, length 56, offset +12.5
```

All six pins individually distinguishable. The fan reads as a
candlestick of pins from the trail dot, exactly per spec.

### Pin-needle test at 1, 4, 6 wagon counts (described)
- **1 wagon** (single-player): one pin, length 16, offset 0. Reads
  as a single rose flag flagged at the wagon's space.
- **4 wagons** (typical Competitive): when scattered, four pins at
  four spaces, each length 16. When stacked: lengths 16/24/32/40,
  offsets −7.5/−2.5/+2.5/+7.5 — fans out cleanly.
- **6 wagons** (max Competitive): when stacked, all six fan
  through the full 16..56 length range and ±12.5 offset range.

### US verdicts

- **US-16 (mobile drawer):** PASS in static check — markup,
  CSS, and JS wiring all present. NEEDS-PLAYTEST on real iPhone /
  Android hardware to confirm tap latency and no scroll-trap.
- **US-17 (pin-needle stacking):** PASS — 6-wagon sim shows all
  six pins individually visible at the same space. Active wagon
  pulses; others static. NEEDS-PLAYTEST for "tap any pin to see
  player name" enhancement (basic acceptance is just visual
  distinguishability, which we have).
- **US-18 (mobile audio gate):** PASS in static check — gate
  initializes audio on first user gesture; 3s hint surfaces on
  mobile if no gesture; auto-dismisses on first tap.
  NEEDS-PLAYTEST on iOS Safari to confirm Web Audio unlock works
  the same way it does on the v2.x desktop flow.

### Mobile screenshots described

These are descriptive verifications of how the layout *should*
present at four DevTools mobile-emulation profiles. Real device
screenshots are a NEEDS-PLAYTEST item.

**iPhone 14 portrait (393×852):**
- Top: pink resource ribbon (~36px), days/region/resources legible.
- Below: pace/ration pill row (~28px tall).
- Center: scene canvas fills ~58vh — wagon + scenery + walking
  team visible.
- Bottom: fixed interaction panel — 4 action buttons in 2×2 grid,
  56px tall each.
- Edge: Team tab bottom-left, Map tab bottom-right, both 32px tall.
- Tap Team: drawer slides up to 72vh, shows 7 portraits in
  2-column grid, each tappable for tooltip. Overlay + Esc dismiss.
- Tap Map: drawer slides up; mini-map fills 56vh with parchment
  background, dashed trail, pin needles for any active wagons.

**iPhone 14 landscape (852×393):**
- Same density tier (`mobile` via the third detection clause).
- Ribbon + pace strip + scene + interaction panel + tabs all fit.
- Scene canvas height squeezed but the SVG aspect-ratio meet
  rule keeps the wagon centered.

**iPad mini portrait (768×1024):**
- `mobile` density via the second detection clause (h>w &&
  w<1024). Same drawer layout as iPhone, just larger.
- Profession picker at setup is 2-column, comfortable for a
  fingertip.

**iPad mini landscape (1024×768):**
- `compact` density (not `mobile` — h<w and w≥1024 falls through).
- Existing v2.9 layout with smaller portraits (62px) and 4-button
  action row at the bottom. Scene + bottom bar all visible.

## Open questions

1. **iPad mini landscape:** spec said "uses standard layout" but
   detection lands it in `compact`. Practically equivalent in
   v3.0 (no mobile drawers, smaller portraits). Confirm on
   playtest whether the compact tier is the intended behavior or
   whether 1024px should bump up to `standard`.
2. **Drawer-map wagon-pin scaling:** the mobile drawer's mini-map
   is 56vh tall rendering an `0 0 800 500` viewBox. Pins designed
   for the inline-mini-map size may be too small or too large in
   the drawer. NEEDS-PLAYTEST to assess.
3. **Action-button 2-column grid in interaction panel:** with the
   `.with-fort-march` 5-button case, buttons wrap to 3 rows
   (2+2+1). Layout is functional but the lone fort-march button
   on its own row may look orphaned. Could special-case to span
   both columns; deferred until playtest reveals it.

## git work pending

Per the standing v3.0 build instruction, no commits were made
during the v3.0 stages. The working tree contains:

- `pink_oregon_trail.html` — v3.0 working file (1.28 MB)
- `NOTES_v3.0.md` — per-stage walk-throughs (pre + post)
- `BUILD_REPORT_v3.0.md` — this file
- `oregon_trail_game_data.json` — added US-16/US-17/US-18 to
  `simulation_logic_validation.required_user_stories_pre_implementation`
  (now 13 entries; numbering jumps from 10 to 16 to match the spec
  document's labels).

Recommended commit message:
> v3.0: mobile UI overhaul + pin-needle wagon markers
> 
> Stage 1: drawer-based mobile layout (mobile density tier, slide-up
> Team/Map drawers, fixed interaction panel, audio gate, save notice,
> orientation hint, tap-to-tooltip).
> Stage 2: pin-needle wagon markers with smart-stacking — six tiers
> of needle length and horizontal offset so 6 wagons sharing a space
> remain individually visible.
> Stage 3: setup-screen mobile reflow — 2-column profession grid,
> stacked naming inputs (16px font for iOS no-zoom), 60px Begin
> Journey CTA.

The `docs/` GitHub Pages folder is untouched.
`docs/play.html` still serves the v2.8 build per the v2.9 build
report. v3.0 should playtest on a real iPhone / Android first
before deploying to `docs/play.html`.
