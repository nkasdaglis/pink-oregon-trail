# Pink Oregon Trail — v3.1 Amendment (Physical Board Redesign)

## Context

The current 12 board tile HTML files (board_short_tile_*.html and board_extended_tile_*.html, decorated and paintable variants) are functional but generic. They use simplified geometry — straight trails, abstract shapes, minimal scenery. Nicholas wants the physical board to be a **keepsake** — beautiful enough that Gabby and her mom paint it together as a project, and beautiful enough that the teacher hangs the finished board on the wall.

This amendment redesigns the tile system AND adds a new single-sheet poster format printed at 36×24" landscape (Staples standard wall poster size, ~$15-30 to print).

**This is a SVG-drawing-heavy build.** Maybe 6-8 hours of focused work. Most of it is drawing in SVG with code — historically accurate trail geography, period-style watercolor scenery, decorative compositional elements like compass roses and cartouches. The game logic doesn't change at all.

JSON updated to v3.1. New top-level key: `v3_1_physical_board_redesign`. Confirm `meta.version === "3.1"` before starting (note: this version bump happens AFTER the v3.0 mobile build lands; if v3.0 is still pending, do v3.0 first then bump to v3.1).

## What's being produced

Total: **15 files**

- **6 tile files redesigned, decorated version**: `board_short_tile_A_decorated.html` through `board_short_tile_F_decorated.html`
- **6 tile files redesigned, paintable version**: `board_short_tile_A_paintable.html` through `board_short_tile_F_paintable.html`
- **1 single-sheet poster, decorated**: `board_poster_decorated.html`
- **1 single-sheet poster, paintable**: `board_poster_paintable.html`
- **1 printing/painting guide**: `PRINTING_AND_PAINTING_GUIDE.html`

The Extended-trail tile files (12 more files for the 50-space trail) can be auto-generated from the same SVG library by changing the space count and re-rendering. **Decision for build:** generate the Short-trail versions first (15 files above), then if scope allows, generate the Extended-trail tile equivalents. The single-sheet poster supports BOTH Short and Extended modes (all 50 spaces marked; players use only the first 25 for Short Journey).

## Build order

### Stage 0 — Build a shared SVG library

Before drawing any specific tile, build a JavaScript module (or just a section in an internal-only HTML file you'll use for tile generation) that exports reusable SVG component functions:

```javascript
// SVG components for the board art
function buildPalisadeFort(x, y, scale = 1, hasFlag = true) { /* returns SVG <g> */ }
function buildChimneyRock(x, y, scale = 1) { /* the distinct conical spire */ }
function buildIndependenceRock(x, y, scale = 1) { /* turtle-shell granite dome */ }
function buildBuffaloHerd(x, y, count = 3, scale = 1) { /* small dark shapes */ }
function buildMountainRange(x, y, peakCount = 3, snowCapped = false) { /* */ }
function buildRiver(pathPoints, opacity = 0.5) { /* meandering blue-gray ribbon */ }
function buildPrairieGrass(x, y, width, height) { /* tall grass blades */ }
function buildPineForest(x, y, treeCount, scale) { /* triangular pines */ }
function buildCompassRose(cx, cy, radius) { /* 8-point ornate */ }
function buildCartouche(x, y, width, height, titleText, subtitleText) { /* scroll banner */ }
function buildDecorativeBorder(width, height, motif) { /* period pattern frame */ }
function buildScaleBar(x, y, label) { /* "1 inch = 70 miles" with hash marks */ }
function buildSettlerVignette(x, y, scale) { /* small family figure */ }
function buildOxenWagonVignette(x, y, scale) { /* yoked oxen pulling wagon */ }
function buildCampfireVignette(x, y, scale) { /* people around fire */ }
function buildPawneeGuideVignette(x, y, scale) { /* respectful Native figure */ }
function buildSpaceMarker(x, y, num, type, name) { /* numbered circle with label */ }
function buildTrailLine(pathPoints, color = '#B85770', dashed = false) { /* */ }
function buildPaperGrain(width, height, opacity = 0.06) { /* feTurbulence subtle */ }
function buildVignetteEdges(width, height) { /* radial gradient browning */ }
```

Each component takes a paintable boolean parameter. When `paintable = true`, the function returns the SAME SVG geometry but with fills set to none (or very light), strokes only, suitable for painting over.

This shared library is the foundation for everything that follows. **Spend time here.** If the components are good, the tiles and poster basically compose themselves. If the components are weak, you'll redo work.

### Stage 1 — Tile A through F redesigns (decorated)

For each tile, follow the per-tile artistic spec in `JSON.v3_1_physical_board_redesign.stage_1_redesigned_tiles.per_tile_artistic_elements`. Highlights:

**Tile A (top-left, Missouri/Kansas plains):**
- Independence MO start drawn as a small frontier town with red-brick storefronts in the corner
- Wagon train silhouettes leaving town
- Tall prairie grass in foreground
- Kansas River and Big Blue River crossings
- Compass rose in upper-left corner (this tile only — anchors the whole assembled board)
- State label "MISSOURI" in faint italic at low opacity

**Tile B (top-middle, Nebraska / Platte River country):**
- Platte River as wide blue-gray ribbon spanning the tile
- Fort Kearny as small palisade fort silhouette
- Buffalo herd on the horizon (small dark shapes scattered)
- Chimney Rock drawn as actual recognizable conical spire — this is iconic, get it right
- Scotts Bluff as broad rocky escarpment
- Ash Hollow as small valley with trees
- "NEBRASKA" label

**Tile C (top-right, Wyoming foothills):**
- Fort Laramie as larger fort with American flag
- Sweetwater River drawn faintly
- Independence Rock as turtle-shell granite dome with names visible faintly carved (just texture, not legible)
- Devil's Gate as narrow river canyon
- Trail bends to drop downward at lower-right (toward tile F below)
- "WYOMING TERRITORY" label

**Tile F (bottom-right, Wyoming high country / Idaho):**
- South Pass drawn as gentle saddle between mountain ranges (Rocky Mountains as soft brown forms in background)
- Fort Bridger as smaller log palisade
- Soda Springs drawn as small bubbling springs with steam
- Fort Hall as British-style trading post (slightly different architecture from American forts)
- Trail enters from top (continuing from tile C above) and exits to the left (continuing to tile E)
- "IDAHO TERRITORY" label

**Tile E (bottom-middle, Idaho / Snake River country):**
- Snake River drawn with its actual oxbow curve shape — Idaho is known for this dramatic river bend; capture it
- Fort Boise as small palisade near a river bend
- Three Island Crossing as a section where trail crosses through a river
- Massacre Rocks (drawn respectfully — small rocky outcrop, not dramatized)
- Hot Springs steam rising
- Sagebrush and high desert vegetation
- Trail flows right-to-left across this tile

**Tile D (bottom-left, Pacific Northwest):**
- Cascade Mountains rising in background (snow-capped peaks)
- Whitman Mission as small white-painted clapboard building (treated solemnly — destroyed 1847)
- Walla Walla and Blue Mountains
- The Dalles drawn as Columbia River narrowing through black basalt cliffs (Native fishermen on rocky platforms — respectful representation)
- Columbia River widening as it flows toward the Pacific
- Oregon City at finish — small Willamette Valley town beside Willamette Falls
- Pacific Ocean hinted at as soft blue at the western edge
- "OREGON TERRITORY" label

#### Common per-tile elements

- **Decorative sepia border** ~24px wide around each tile, with period pattern (small repeated motif: tiny wagons, fleurs, or stars)
- **Tile assembly label** in lower-right: "Tile A of 6" with a small arrow indicating which neighbor connects
- **Alignment registration dots** at each corner — small pink dots that help kids align tiles when taping together
- **Paper grain texture** as subtle SVG `<feTurbulence>` overlay at low opacity
- **Vignette edges** — radial gradient browning at corners and edges to simulate aged paper

#### Acceptance test

Print all 6 decorated tiles in browser print preview (8.5×11 portrait). Mentally assemble — the trail should flow naturally from tile to tile across the assembled 25.5×17 board. State labels should be readable but not dominant. Landmarks should be recognizable as their actual real-world shapes (Chimney Rock = conical spire, Independence Rock = turtle dome, etc.).

### Stage 2 — Tile A through F paintable versions

For each tile, generate a paintable variant. Key differences from decorated:

- **Trail line** stays printed but at slightly reduced opacity so paint shows through
- **Numbered space circles** stay outlined (not filled) so kids can paint inside them
- **Landmark names and state labels** stay printed in faint pencil-stroke gray
- **Background scenery** is reduced to faint outlines only — most fills removed
- **Decorative border** outlined, not filled
- **Compass rose, cartouche, and key icons** outlined only
- **Optional faint dot grid** in large open regions (where kids will paint scenery) to suggest "paint within this area"
- **Reference labels** in faintest gray suggesting colors: "sage green for plains", "sepia for mountains", etc. Designed to be painted OVER (the labels disappear under paint).

The paintable version should print mostly white with light pink trail and pencil-gray labels. Easy to paint over without losing structural information.

### Stage 3 — Single-sheet poster (decorated)

The 36×24-inch landscape format. Different design from the tiles — single continuous artwork.

**Construction:**
- viewBox: `0 0 2592 1728` (36×24 inches at 72 dpi)
- @page CSS: `@page { size: 36in 24in landscape; margin: 0.5in; }`
- preserveAspectRatio: `xMidYMid meet`
- All vector — scales to any print size without quality loss

**Layout:**

Trail forms a sweeping S-curve across the landscape:
- **Lower-left corner**: Independence MO start
- **Lower-third horizontal**: trail flows east-to-west across plains and Nebraska
- **Middle vertical**: trail rises through Wyoming territory (Fort Laramie, Independence Rock, South Pass)
- **Upper-third**: trail turns northwest through Idaho along Snake River
- **Upper-left**: Oregon City finish in Willamette Valley
- **Pacific Ocean**: hinted as soft blue strip along the left edge (off the trail proper)

This S-curve gives the eye a journey to follow across the 36-inch width AND uses the full 24-inch height for vertical region differentiation (plains low, mountains high, forest highest).

All 50 Extended-trail spaces marked. Short-Journey players use only the first 25.

**Decorative elements:**

- **Compass rose** in lower-right corner, ~8 inches diameter, ornate 8-point with fleur-de-lis north and decorative scrollwork
- **Title cartouche** in upper-center, large scroll-style banner reading "PINK OREGON TRAIL — 1848" in period serif font, with subtitle "A History Game Designed by Gabby Kasdaglis"; decorated with quill-and-inkwell vignette and small drawing of a covered wagon
- **Scale bar** at bottom-center: "One inch = approximately 70 miles" with hash marks
- **1.5-inch decorative border** around the entire poster with repeated period motifs (small wagons, oxen, fleurs, stars)
- **Four corner vignettes**:
  - NW: settler family figure
  - NE: oxen yoked to wagon
  - SW: Native American family in respectful representation (Pawnee guide)
  - SE: campfire scene with travelers

**Region scenery zones:**

Each region has its own elaborated scenery zone:
- **Plains zone (lower-third right)**: detailed buffalo herd, prairie grass blowing in wind direction, distant horizon
- **Wyoming zone (middle)**: Independence Rock and Chimney Rock as foreground subjects, hills with sage
- **Mountain zone (upper-middle)**: snow-capped peaks with detailed shading, eagles, treeline
- **Desert zone (upper-middle-right)**: mesa formations, Joshua trees, sagebrush
- **Pacific Northwest zone (upper-left)**: Mount Hood and Cascade range, dense pine forest, Columbia River

**Color palette** (period watercolor):
- Parchment background `#F4E8D8`
- Trail line `#B85770` (pink, period-appropriate cochineal)
- Mountain shading `#8B7A95` (purple-gray)
- Forest greens `#5F7A5F`
- River blues `#7A9DBE`
- Desert tans `#C8956D`
- Sepia text and labels `#5C4A36`
- Gold accent `#D4AF37` (for cartouche, compass rose, decorative elements)

### Stage 4 — Single-sheet poster (paintable)

Same composition as Stage 3 but designed for painting:

- Trail line stays light pink
- Space circles outlined and numbered, NOT filled
- Landmark names in pencil-stroke gray
- State borders in faint pencil
- Compass rose **outlined only** (kids paint the colored sectors)
- Title cartouche **outlined only** (kids paint the scroll backing)
- Border pattern **outlined only**
- Corner vignettes **outlined only**
- Region scenery reduced to faint outlines suggesting where to paint mountains, rivers, trees

**Optional reference labels** in faintest gray within each region: "sky blue here," "prairie green here," "sepia for mountains." Designed to be painted over (labels disappear under paint).

A note on paper: 36×24 watercolor paper is hard to find at Staples. The guide should recommend printing on **heavy 100lb cardstock** which holds acrylic paint well, or on **satin photo paper** which holds acrylic and ink markers well but won't tolerate watercolor. The guide should also suggest using **acrylic paint thinned with water** rather than true watercolor for best results on Staples paper.

### Stage 5 — Printing and painting guide

Single-page HTML document, printable at letter size:

**Sections:**

1. **What you're building** (1 paragraph): "A beautiful hand-painted Oregon Trail board for Gabby's history class. This guide walks you through printing, painting, sealing, and using it for the game."

2. **Print options** (table):
   - Tile version: print 6 letter-size tiles at home, tape together, glue to foam board ($0 for printing if home printer, $5-10 foam board)
   - Poster version (recommended): 36×24" at Staples, ~$15-30 depending on paper
   
3. **Staples printing instructions**:
   - Walk into Staples or upload at staples.com
   - Choose "Engineering Prints" or "Posters" → 36×24" landscape
   - Paper recommendation: **100lb cover cardstock** (best for paint) OR **satin photo paper** (best for vivid colors as-is, no painting)
   - Finish: matte (paintable) or satin (decorated as-is)
   - Cost: $15-30 depending on paper and rush options
   
4. **Hobby Lobby supply list** (for the painting project):
   - Acrylic paint set (12-color basic)
   - Brushes: small detail (#2 round), medium fill (#6 flat), large wash (1" flat)
   - Palette or paper plate
   - Water cup and rag
   - Pencil and eraser (for sketching before painting)
   - Mod Podge gloss (for sealing afterward)
   - Optional: gold leaf paint pen (for compass rose and cartouche details)
   - Optional: fine-tip black marker (for re-tracing or adding detail)

5. **Color palette reference**:
   - Display each named region color with hex value AND a paint-mixing recipe ("Sky blue: 2 parts white + 1 part cobalt blue + drop of ochre")
   - Include the 8-color trail palette from JSON

6. **Painting techniques** (illustrated):
   - **Watercolor wash for sky**: wet brush, light blue, paint top of region, drag downward, lighten as you go
   - **Layered green for grass and forest**: dark base layer, mid-tone over it, light highlights last
   - **Soft graduated mountains**: paint distant peaks in pale purple-gray, foreground peaks in deeper brown-gray
   - **River highlights**: paint river blue, then add white streaks for current and reflections
   - **Painting around printed text**: don't paint over the trail line, the space numbers, or the landmark labels — paint up to them, leaving the printed details visible
   
7. **Sealing**:
   - Wait 24 hours for paint to dry fully
   - Apply Mod Podge gloss with foam brush, thin even coat, full coverage
   - Wait 24 hours
   - Optional second coat for extra durability
   - Result: a board that survives a school year of handling

8. **Optional laminating**: Staples laminating service ($5-10) for ultra-durability after painting and sealing. Use only on the FINISHED painted board, not on a paintable print.

9. **Tips from Gabby's dad** (small playful section):
   - "Paint the sky first. It's the easiest and gives you confidence."
   - "Mountains in the background, not the foreground. Foreground = small details (people, trees, wagons)."
   - "Less paint is more paint. You can always add more. You can't take it back."
   - "If you mess up, the trail is forgiving. Real pioneers had bad days too."

## Validation requirements

- Print preview each tile in browser at letter portrait — verify no clipping, decorations don't overlap, alignment marks visible at corners
- Print preview the poster at 36×24 landscape — verify all text legible, all key landmarks recognizable, decorative elements scale appropriately
- Print preview the painting guide at letter portrait — verify all 9 sections fit
- Render check: open each tile/poster in browser, check that all SVG elements render without errors

## Build report requirements

- Per-stage progress notes
- All 15 file names listed (which were created, any deferred)
- Print preview screenshots described in text for each tile and the poster
- "git work pending" list — Nicholas commits manually
- Note in BUILD_REPORT_v3.1.md whether Stage 0 SVG library is reusable for the Extended-trail tile generation as future work

## Critical reminders

- All vector. No raster images embedded in tile or poster files.
- Single self-contained HTML file per output. No external dependencies.
- Period 1840s aesthetic. No anachronisms.
- Respectful representation of Native Americans (helpers, not adversaries — historically accurate).
- "Massacre Rocks" treated soberly without dramatization.
- Whitman Mission treated solemnly (was destroyed 1847).
- No words "AI", "Claude", etc., anywhere in the output files.
- Small registration marks at corners help with tile assembly.

## Why this is bigger than v2.9 was

v2.9 was 6 hours but mostly small CSS edits and one big team-walking system. v3.1 is mostly drawing — 15 SVG files with elaborate compositions, period-style decoration, historically accurate geography. SVG drawing is slow even with a good shared library. Plan for 6-8 hours.

The decision to defer Extended-trail tiles (12 more files) is intentional — get the Short-trail tiles AND the universal poster done first. Extended-trail tiles can come later as v3.1.1 if needed; the poster covers 50-space Extended play already.

This is the most beautiful thing built in the project. Take the time to make it good. Gabby and her mom should look at the output and feel inspired to paint, not overwhelmed.
