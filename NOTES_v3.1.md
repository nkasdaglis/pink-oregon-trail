# NOTES — v3.1 design walk-throughs

Per the v2.3 logic-first discipline. v3.1 is a physical board redesign:
6 redesigned tiles (decorated + paintable variants) + a 36×24" poster
(decorated + paintable) + a printing/painting guide. 15 files total.
No game-code changes — `pink_oregon_trail.html` is untouched. Output
lives in `docs/`.

---

## Stage 0 — orient

- v3.1 JSON: `meta.version` bumped from `"3.0"` → `"3.1"`.
- `v3_1_physical_board_redesign` block present with three stages
  (redesigned_tiles / single_sheet_poster / assembly_and_painting_guide).
- v3.0 game build is committed (`f3a17c1`) + map fix deployed
  (`9e3a946`). Working file `pink_oregon_trail.html` will not be edited
  in this build.
- Existing tiles `docs/board_short_tile_A_blank.html` …
  `_F_decorated.html` are functional but generic. They will be REPLACED
  by the v3.1 redesigned versions (decorated + paintable). Existing
  blank/decorated naming maps onto new decorated/paintable naming.
- Color palette per spec line 188-195: parchment `#F4E8D8`, trail
  `#B85770`, mountains `#8B7A95`, forest `#5F7A5F`, river `#7A9DBE`,
  desert `#C8956D`, sepia text `#5C4A36`, gold `#D4AF37`.

---

## Stage 0 — shared SVG library (PRE-IMPLEMENTATION)

**Walk-through:** the spec is emphatic — *invest in the library*. If
components are good, 14 downstream files compose easily. If
components are weak, every tile and the poster has to repaint by
hand. Spec line 31-53 lists ~17 component functions.

**Implementation choice:** rather than a separate `.js` file (which
would require external `<script src=…>` and break "single
self-contained HTML file per output"), I'll write a **Node generator
script** at the repo root: `build_v31_board.js`. It defines all
component functions, all tile compositions, and the poster
composition, then writes the 15 output HTML files into `docs/` with
the SVG inlined per-file. Single source of truth in the generator;
each output is self-contained.

**Component list (Stage 0 deliverable):**
1. `buildPalisadeFort(x, y, scale, opts)` — log palisade with optional
   flag, gate, blockhouse. American (with star-spangled flag) vs
   British (different roof shape) variants.
2. `buildChimneyRock(x, y, scale)` — distinctive conical spire on a
   conical base mound. The shape has to read as Chimney Rock.
3. `buildIndependenceRock(x, y, scale)` — turtle-shell granite dome
   with subtle "name carving" texture (cross-hatching, not legible).
4. `buildScottsBluff(x, y, scale)` — broad rocky escarpment with
   layered cliff bands.
5. `buildDevilsGate(x, y, scale)` — narrow river canyon between
   vertical rock walls.
6. `buildSouthPass(x, y, scale)` — gentle saddle between two
   mountain peaks.
7. `buildBuffaloHerd(x, y, count, scale)` — dark brown shapes
   scattered, suggestion of grazing.
8. `buildMountainRange(x, y, peakCount, snowCapped)` — series of
   triangular peaks with optional snow caps (white tops).
9. `buildPineForest(x, y, treeCount, scale)` — triangular pines in
   varied heights.
10. `buildPrairieGrass(x, y, w, h)` — short blades scattered across
    a region.
11. `buildRiver(pathPoints, opacity)` — meandering blue-gray ribbon
    with darker centerline.
12. `buildCompassRose(cx, cy, radius, ornate)` — 8-point rose with
    fleur-de-lis north for the ornate variant.
13. `buildCartouche(x, y, w, h, title, subtitle)` — scroll banner
    with rolled ends.
14. `buildDecorativeBorder(width, height, motif, paintable)` —
    tile/poster outer frame with repeated motif.
15. `buildScaleBar(x, y, label)` — hash-marked rule with label.
16. `buildSpaceMarker(x, y, num, type, name, paintable)` — numbered
    circle (color depends on type: start/fort/river/landmark/finish).
17. `buildTrailLine(pathPoints, color, dashed, paintable)` —
    smooth bezier through the points.
18. `buildPaperGrain(width, height, opacity)` — `<feTurbulence>`
    noise overlay.
19. `buildVignetteEdges(width, height)` — radial gradient browning
    at corners.
20. `buildSettlerVignette(x, y, scale)` — small family figure cluster.
21. `buildOxenWagonVignette(x, y, scale)` — yoked oxen pulling
    covered wagon.
22. `buildCampfireVignette(x, y, scale)` — small fire ring with
    seated figures.
23. `buildPawneeGuideVignette(x, y, scale)` — respectful Native
    figure (per spec: "respectful representation, helpers not
    adversaries").
24. `buildAlignmentDots(width, height)` — four pink corner dots for
    tile assembly registration.
25. `buildTileAssemblyLabel(width, height, tileLetter, neighbors)` —
    "Tile A of 6" + arrow indicators in the lower-right corner.

**Paintable handling:** every component takes an `opts.paintable`
flag. When true, fills become `none` (or very faint), strokes only.
That keeps the library to ~25 functions with a single boolean
parameter rather than 50 functions for two variants.

**Coordinate system:** tiles use viewBox `0 0 850 1100` (8.5×11 at
100 units per inch). Poster uses `0 0 2592 1728` (36×24 at 72 dpi).
Components accept (x, y, scale) and emit a `<g>` group transformed
into place, so the same component scales freely.

**No spec contradictions surfaced.** Proceeding.

---

## Stage 1 — six decorated tiles (PRE-IMPLEMENTATION)

**Per-tile compositions** per spec line 59-113:

- **Tile A** (top-left, MO/KS plains): Independence MO frontier town
  bottom-right corner with red-brick storefronts; wagon train
  silhouettes; tall prairie grass; Kansas River + Big Blue River
  crossings; **compass rose top-left** (anchors the assembled board);
  faint italic "MISSOURI" label.
- **Tile B** (top-middle, NE/Platte): Platte River as wide ribbon
  spanning the tile horizontally; Fort Kearny palisade silhouette;
  buffalo herd on horizon; **Chimney Rock** as recognizable conical
  spire; **Scotts Bluff** as escarpment; Ash Hollow valley with
  trees; "NEBRASKA" label.
- **Tile C** (top-right, WY foothills): **Fort Laramie** larger fort
  with American flag; Sweetwater River faint; **Independence Rock**
  as turtle-shell dome with name-carving texture; Devil's Gate as
  narrow canyon; trail bends down at lower-right (toward Tile F);
  "WYOMING TERRITORY" label.
- **Tile F** (bottom-right, WY/ID high country): **South Pass** as
  gentle saddle between mountain ranges; **Fort Bridger** smaller log
  palisade; Soda Springs as bubbling springs with steam; **Fort
  Hall** British-style trading post (different architecture from
  American forts); trail enters from top, exits left toward Tile E;
  "IDAHO TERRITORY" label.
- **Tile E** (bottom-middle, ID/Snake River): Snake River with
  oxbow curve; **Fort Boise** palisade near river bend; Three
  Island Crossing; Massacre Rocks (sober, small); hot springs;
  sagebrush; trail flows right-to-left.
- **Tile D** (bottom-left, Pacific NW): Cascade Mountains with
  snow-capped peaks; **Whitman Mission** as small white clapboard
  building (treated solemnly — destroyed 1847); Walla Walla / Blue
  Mountains; **The Dalles** as Columbia River narrowing through
  basalt cliffs (Native fishermen on platforms — respectful);
  Columbia widening toward Pacific; Oregon City + Willamette Falls;
  Pacific Ocean as soft blue strip at the western edge; "OREGON
  TERRITORY" label.

**Common per-tile elements** per spec line 115-122:
- 24px sepia decorative border with period motif (small wagons /
  fleurs / stars)
- Tile assembly label "Tile X of 6" + neighbor arrow lower-right
- Pink alignment dots at all four corners
- Paper grain texture (low-opacity feTurbulence)
- Vignette edges (radial brown gradient at corners)

**Order:** tiles render via `_renderTile(letter, paintable)`. The
generator calls it 12 times (6 letters × 2 modes).

**No spec contradictions surfaced.** Proceeding to write the
generator and emit all 15 files in one pass.

**POST-IMPLEMENTATION (Stage 0 + Stages 1-5):** PASS in static check.
`build_v31_board.js` (Node generator) defines ~24 component
functions and 6 tile compositions + 1 poster + 1 guide. Running it
emits the 15 files. All files validate (DOCTYPE / html / body / svg
viewBox closing tags); each tile contains its spec'd landmarks
(grep-checked). Component reusability: every component takes a
`paintable` flag, so the same composition function emits both
variants without duplication. The Stage 0 library is reusable for
the Extended-trail tile generation (12 more files for the 50-space
trail) — same components, just call the tile composition functions
with extended-mode space numbers. That work is deferred per spec
line 23.

File-size summary:
- 6 decorated tiles: 19.5–31.9 KB each
- 6 paintable tiles: 18.6–31.7 KB each (slightly smaller — fewer fills)
- Decorated poster: 100.1 KB (one big composition)
- Paintable poster: 93.3 KB
- Printing/painting guide: 7.1 KB
- Total: 487 KB across 15 files

## Stage 0 + 1 + 2 + 3 + 4 + 5 complete — 15 files emitted
