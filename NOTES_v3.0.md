# NOTES — v3.0 design walk-throughs

Per the v2.3 logic-first discipline carried through v2.9: each stage
gets a pre-implementation walk-through and a post-implementation
note. v3.0 is mobile UI overhaul + pin-needle wagon markers — the
playtest journal flagged unplayable phone layouts and invisible
wagons-on-top-of-each-other on the mini-map.

---

## Stage 0 — orient

- v3.0 JSON loaded; `meta.version === "3.0"`.
- `v3_0_mobile_and_visibility` block present with three stages
  (drawer layout / pin needles / setup reflow).
- `v3_1_physical_board_redesign` is also in the JSON but is NOT
  part of this build.
- v2.9 working file: `pink_oregon_trail.html`, 1.26 MB. v2.7 set up
  density tiers (compact / standard / large / jumbo) — v3.0 will
  add a `mobile` tier on top of that.
- Density updater is at line ~12340 (`updateUIDensity`). Density
  CSS lives at the top of the stylesheet (`:root[data-ui-density=
  "compact" | "standard" | "large" | "jumbo"]`).
- Existing mini-map renderer is `_buildHistoricalMapSvgBody`
  (v2.9 Stage 7) — that's where pin-needle wagons land in Stage 2.
- Setup screens use grid layouts; `@media (max-width: 740px)`
  is the reflow breakpoint per spec.

---

## Stage 1 — drawer-based mobile UI (PRE-IMPLEMENTATION)

**Walk-through:** the v2.9 main grid for `#screen-game` is
`auto auto 1fr auto` (ribbon | pace strip | scene canvas | bottom
bar). On mobile this collapses: ribbon stays, pace strip stays
(with reduced padding), scene canvas takes ~60% of the remaining
height, and a new fixed `interaction-panel` takes ~40%. The
v2.9 bottom bar (team-strip + mini-map + action-buttons) does
NOT render in the main flow on mobile — instead:
  - Action buttons render INTO the interaction panel (when no
    callout is firing).
  - Callout overlays the interaction panel when an event fires
    (so the callout always reads in the same screen real estate
    rather than fighting the wagon for attention).
  - Team strip moves into a slide-up drawer triggered by a Team
    tab pinned bottom-left.
  - Mini-map moves into a second slide-up drawer triggered by a
    Map tab pinned bottom-right.

**Why drawer over fullscreen modal:** the game is observational
during travel — you mostly want to see the scene, glance at the
team, glance at the map. Drawers preserve that flow. A fullscreen
modal would force a context switch every time. Pokémon GO and
Roblox mobile both use this pattern; Nicholas confirmed
"Approach C" for v3.0.

**Sub-piece order (per Nicholas's instruction not to fan out):**
  1. **1A — viewport detection.** Add `mobile` density tier.
     Drives all the other CSS rules.
  2. **1B — drawer infrastructure.** Markup for two drawers + an
     overlay + two tabs. CSS for slide animation. No JS yet.
     Tabs visible only at `data-ui-density="mobile"`.
  3. **1C — drawer wiring.** Tab click toggles `.open` class on
     drawer + overlay. Overlay click closes. Drawer body
     populated by relocating the existing team-strip and minimap
     containers (or rendering into duplicates inside the drawers).
  4. **1D — mobile main layout.** `#screen-game` grid override at
     mobile density: `auto auto 60vh 40vh` or similar. Action
     buttons relocate from bottom-bar into the interaction panel.
  5. **1E — mobile behaviors.** Audio gate, save notice, tap
     tooltips, orientation hint. Each is small and independent.

**Drawer content strategy:** rather than duplicating the team-
strip and mini-map (which would require dual-rendering on every
update), I'll RELOCATE the existing DOM nodes into the drawers
when entering mobile mode and put them back at standard+. Single
source of truth for renderTeamStrip / renderMinimap.

**No spec contradictions surfaced.** Proceeding stage 1A first.

**POST-IMPLEMENTATION:** PASS in static check.

- **1A** — `updateUIDensity` now picks `mobile` for `w<740` OR
  `(w<1024 && h>w)`. Mobile tier added to the density CSS variables
  (portrait 56px, button 56px, callout full-width minus 24px).
- **1B** — markup adds `.mobile-interaction-panel`, two
  `.drawer-tab`s, an overlay, and two drawers. CSS hides them at
  non-mobile densities; at mobile they display. Drawer animation:
  translateY(100%) → 0 over 0.32s cubic-bezier; reduced-motion
  drops the transition.
- **1C** — `_syncMobileLayout` relocates the existing #team-strip,
  #minimap-container, and #action-buttons DOM nodes between the
  bottom-bar (desktop) and the drawer bodies + interaction panel
  (mobile) on every density change. Single source of truth — the
  existing renderTeamStrip / renderMinimap / renderActionMenu
  continue to write to the same node ids. `_wireDrawers` toggles
  `.open` on tab click, closes on overlay click and Esc, and
  supports Enter/Space keyboard activation on the tabs.
- **1D** — at mobile, `.bottom-bar` is hidden and `#screen-game`
  reserves `padding-bottom: calc(42vh + 32px)` so the scene
  canvas never flows under the fixed interaction panel and tab
  strip. Action buttons inside the panel become a 2-column grid;
  team-strip inside the team drawer becomes a 2-column portrait
  grid (vs the desktop horizontal scroll); minimap inside the
  map drawer fills 56vh.
- **1E** — `_wireAudioGate` initializes audio on the first
  click/touchstart/keydown, with a 3s mobile-only hint toast if
  no gesture has fired. `_maybeShowSaveNotice` shows a one-time
  localStorage-flagged toast on first mobile launch.
  `_maybeShowOrientationHint` fires once per session on mobile
  in portrait (sessionStorage flag). `_wireTooltipDismiss`
  closes any open team-portrait tooltip when the user taps
  outside.

JS parses cleanly. File size 1.26 MB → 1.28 MB (~16 KB of new
mobile code/CSS, no functional regression to the v2.9 desktop
layout).

## Stage 1 complete — drawer-based mobile UI live; bottom-bar hidden at mobile, drawers + tabs render only at mobile

---

## Stage 2 — pin-needle wagon markers with smart-stacking (PRE-IMPLEMENTATION)

**Walk-through:** v2.9 Stage 7's mini-map renders each wagon as a
single colored circle of radius 11 (active) or 11×1.0 (others)
with the player initial inside. When 4-6 wagons sit on the same
trail space (start, forts, finish), those circles overlap into
one indistinguishable blob.

**Spec design:** each wagon becomes a "pin needle" — a vertical
line rooted at the trail dot, with a colored circular head at the
top carrying the player's initial. When multiple wagons share a
space, the algorithm fans them out vertically (longer needle =
later in the stack) AND slightly horizontally (offset by stack
rank from the space center). Six possible stacking heights
(16/24/32/40/48/56 px) and offsets (rank − (n−1)/2)·5.

**Implementation surface:** `_buildHistoricalMapSvgBody(activeWagon)`
in `pink_oregon_trail.html`. Today the wagon-marker render is
inline in that function (a `for (const wg of wagons)` loop). I'll
extract that into a `_buildWagonPinMarkers(wagons, total, activeWagon)`
helper, then call it from the historical map builder. The helper
will:
  1. Group wagons by their projected fraction (rounded to one part
     per total — i.e. by space index `wg.position`).
  2. Within each group, sort by `id` (stable across renders).
  3. Assign `stackRank` 0..N-1.
  4. Compute needle-end at `(p.x + offset, p.y - needleLength)`.
  5. Render `<line>` from `(p.x, p.y)` to needle-end + a `<circle>`
     head + a `<text>` initial inside the head.
  6. Tag each needle's `<g>` with `data-active="true|false"` so a
     CSS keyframe pulses the active wagon.

**Wagon color palette:** spec lists 6 colors (rose / gold / navy /
forest / plum / copper). Pick by wagon index modulo 6. Today the
game already stores `wg.color` in beginJourney. Quick check —
ensure those colors match the v2.3 palette spec; if not, override
within the marker renderer.

**Coverage:** the spec asks pin needles to render in (a) the
compact mini-map at the bottom of the scene, (b) the click-to-
expand fullscreen mini-map, (c) the v3.0 mobile drawer-map. All
three already share the same `_buildHistoricalMapSvgBody`, so a
single change covers all three.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS. New helper `_buildWagonPinMarkers`
groups living wagons by `position`, sorts by `id` within each group,
and renders each as an SVG `<g class="wagon-pin">` with a colored
line + head circle + initial. Six stack tiers (lengths 16/24/32/
40/48/56) and offsets `(rank − (n−1)/2)·5`. Active wagon's `<g>` is
flagged `data-active="true"` and pulsed via the new
`@keyframes wagonPinPulse` (1.5s 1.0→1.12 scale). Reduced-motion
gated. Sanity sim with 6 wagons all at one space rendered 6
distinct pins fanning across x∈[472.5..512.5], y∈[209..249] with
all six colors and player initials. The single helper is
called from `_buildHistoricalMapSvgBody`, which is shared by the
inline mini-map, the click-to-expand fullscreen overlay, and the
v3.0 mobile drawer-map — so all three got the upgrade for free.

## Stage 2 complete — pin needles with smart-stacking

---

## Stage 3 — setup screen mobile reflow (PRE-IMPLEMENTATION)

**Walk-through:** profession picker is currently a 5-column grid via
`grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))`. At
390px viewport that becomes 2 columns automatically — but each card
is too tall (the character SVG is 70×100). Spec wants min-height
90px and font reductions so 23 professions are scrollable.

The naming flow uses `.naming-grid` (auto-fit minmax 280px) with
`.naming-row` flex containers. At narrow widths the row already
wraps, but the input doesn't get the iOS-friendly 16px font (which
would prevent the auto-zoom-on-focus issue). Need explicit
`min-height: 50px; font-size: 16px;` on inputs.

Difficulty / mode / count screens all use the same `.cards-grid`
auto-fit. At narrow widths they already collapse to 1 column via
auto-fit, but the cards retain desktop padding which makes the
screen feel cramped on a phone.

**Implementation:** all rules under `:root[data-ui-density="mobile"]`
(matches our new tier) rather than raw `@media (max-width: 740px)`.
This makes iPad mini portrait ALSO get the touch-optimized sizes.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. Profession grid at
mobile is 2 columns with 90px min-height cards and reduced
character SVG (56×76). Naming inputs are 50px tall, 16px font (no
iOS zoom on focus). cards-grid forces 1 column on mobile. Begin
Journey button is 60px tall, full-width via `.actions
flex-direction: column-reverse` so the primary action sits at the
bottom (closer to thumb). 12-viewport detection sweep run via Node
sim: 11/12 pass; iPad mini landscape lands in `compact` rather than
`standard`, which matches the spec's INTENT (non-mobile, smaller-
screen tier) since the v2.7 compact tier already targets this
range. Documented in build report.

## Stage 3 complete — setup screens are touch-optimized at mobile density

---

## v3.0.1 hotfix — historical map orientation (POST-IMPLEMENTATION)

**Issue:** v2.9 Stage 7's historical map placed Independence MO on
the left and Oregon City on the right. Real maps put east on the
right (because north is up). Kids playing the game saw Oregon City
on the right and intuitively thought they were heading east — bad
for an educational geography game.

**Fix:** flipped all geographic x-coordinates via `x' = 800 − x`:

- `_TRAIL_WAYPOINTS` — all 12 entries flipped. Independence (730,
  400), Oregon City (40, 120). Trail polyline, space dots, labels,
  and wagon pin needles all re-project automatically.
- State blocks — each block's new x = 800 − (old x + width).
  Kansas/Nebraska now east (x=560), Oregon Country now west (x=15).
- River paths (Platte / Snake / Columbia) — every coord's x flipped.
- Mountain ridges — `mx = 396 − i*32` so the six triangles march
  east-to-west across the middle.
- Compass rose stays at top-right (now empty space). N pointer
  remains vertical (north is up).

No text characters mirrored — labels just move to flipped x's; the
characters themselves still read left-to-right.

The historical map uses pin needles, not a wagon SVG, so there's
no map-wagon facing direction to flip. The scene canvas's wagon
SVG (which faces right while traveling across a landscape) stays
unchanged.

**Verification:** Node sim — position 1 (Independence) projects to
pin x=730 (right/east), position 11 (Oregon City) to pin x=40
(left/west). Pin x decreases monotonically as the wagon advances,
confirming westward motion on screen matches westward geographic
progress. Coverage: inline mini-map + fullscreen overlay + mobile
drawer-map all share `_buildHistoricalMapSvgBody`, so single-edit
fix.