# BUILD REPORT — v3.1 (physical board redesign + single-sheet poster)

**Status:** complete · **Date:** 2026-04-27 · **Game file untouched:** `pink_oregon_trail.html` is unchanged in this build.

## Summary

v3.1 redesigns the printable physical board. The previous board files
were functional but generic. v3.1 produces 15 SVG-heavy HTML files:
6 redesigned tiles × 2 variants (decorated + paintable) + a
36×24" wall poster × 2 variants + a printing/painting guide. All 15
files emit from a single Node generator (`build_v31_board.js`) that
hosts the shared SVG library and the per-file compositions.

## Files emitted (15)

All written to `docs/`:

| File | KB | Notes |
|---|---:|---|
| `board_short_tile_A_decorated.html` | 31.9 | Missouri & Eastern KS — Independence start, compass rose top-left, settlers + wagon train, Big Blue + Kansas Rivers |
| `board_short_tile_A_paintable.html`  | 31.7 | same composition, fills→none, strokes→sepia outline |
| `board_short_tile_B_decorated.html` | 25.7 | Nebraska — Platte ribbon, Fort Kearny, buffalo herds, Chimney Rock + Scotts Bluff + Ash Hollow |
| `board_short_tile_B_paintable.html` | 24.9 | |
| `board_short_tile_C_decorated.html` | 22.5 | Wyoming Territory — Fort Laramie + flag, Sweetwater River, Independence Rock, Devil's Gate |
| `board_short_tile_C_paintable.html` | 19.9 | |
| `board_short_tile_D_decorated.html` | 19.5 | Oregon Territory — Cascade Range snowcaps, Whitman Mission (solemn), The Dalles with respectful Native fishermen, Columbia River, Oregon City + Willamette Falls finish, Pacific Ocean strip |
| `board_short_tile_D_paintable.html` | 18.6 | |
| `board_short_tile_E_decorated.html` | 21.4 | Snake River country — dramatic oxbow curve, Fort Boise, Three Island Crossing, Massacre Rocks (sober), hot springs, sagebrush |
| `board_short_tile_E_paintable.html` | 20.5 | |
| `board_short_tile_F_decorated.html` | 26.0 | Idaho high country — Rocky Mountain snowcap backdrop, South Pass saddle, Fort Bridger, Soda Springs with steam, Fort Hall (British style — different roof) |
| `board_short_tile_F_paintable.html` | 24.0 | |
| `board_poster_decorated.html`        | 100.1 | 36×24 landscape — single-S-curve trail across all 25 spaces, ornate compass rose, scroll cartouche, 4 corner vignettes (settler / oxen+wagon / Pawnee guide / campfire), scale bar, all 5 region labels |
| `board_poster_paintable.html`        | 93.3 | same composition, paintable variant |
| `PRINTING_AND_PAINTING_GUIDE.html`   | 7.1  | letter-portrait single-page; print options table; Staples instructions; Hobby Lobby supply list; 8-color palette with paint-mixing recipes; 5 painting techniques; sealing instructions; Gabby's-dad tips section |

## Stage 0 — shared SVG library reusability

The generator's library hosts these components, all with a single
`paintable` flag:

- decorative/framing: `buildPaperGrain`, `buildVignetteEdges`,
  `buildDecorativeBorder`, `buildAlignmentDots`,
  `buildTileAssemblyLabel`
- titles/decoration: `buildCompassRose` (with ornate variant),
  `buildCartouche`, `buildScaleBar`
- trail: `buildTrailLine`, `buildSpaceMarker`
- landmarks: `buildPalisadeFort` (American + British variants),
  `buildChimneyRock`, `buildIndependenceRock`, `buildScottsBluff`,
  `buildSouthPass`, `buildDevilsGate`
- scenery: `buildBuffaloHerd`, `buildMountainRange` (snowcap option),
  `buildPineForest`, `buildPrairieGrass`, `buildRiver`
- vignettes: `buildSettlerVignette`, `buildOxenWagonVignette`,
  `buildCampfireVignette`, `buildPawneeGuideVignette`

All 24 components are reusable for the Extended-trail tile
generation (12 more files covering the 50-space trail). To produce
those, add `tileA_extended` … `tileF_extended` composition
functions calling the same components with extended-mode space
indexes. The Stage 0 library is the work; tile compositions are
arrangements.

The `paintable` flag was the right architectural call — it keeps
the codebase to ~24 components × 1 boolean rather than 48
duplicated functions for the two variants.

## Validation

### File integrity
- 15/15 files: valid DOCTYPE, html/body/svg tags closed, expected
  classes present. Validated via Node grep harness.
- Each tile contains its spec'd landmarks (Chimney Rock on B,
  Independence Rock on C, Snake River oxbow on E, Whitman Mission on
  D, etc.).
- Poster contains: trail (25 marked spaces), compass rose,
  cartouche, all 4 corner vignettes (settler / oxen+wagon / Pawnee
  guide / campfire).

### Print preview verifications (described)

These are **descriptive** — actual browser print-preview is a
NEEDS-PLAYTEST item.

**Tiles (8.5×11 letter portrait):**
- Each viewBox is `0 0 850 1100` (8.5×11 at 100 units/inch).
- 28px decorative sepia border with motif; pink registration dots
  at four corners; "Tile X of 6" + neighbor arrows lower-right.
- Title cartouche centered at top.
- State name in faint italic at low opacity behind the trail.
- Mental assembly: tiles A–B–C across the top row, D–E–F across
  the bottom row. Trail flows A → B → C across the top, drops
  through C→F at the right edge, F → E → D across the bottom row,
  finishing at Oregon City in tile D's lower-left.

**Decorated poster (36×24" landscape):**
- ViewBox `0 0 2592 1728` (72 dpi). All 25 trail spaces marked in
  an S-curve from Independence MO (lower-right) up through Wyoming,
  NW through Idaho, finishing at Oregon City (upper-left).
- Title cartouche upper-center reads "PINK OREGON TRAIL — 1848 / A
  History Game Designed by Gabby Kasdaglis", flanked by a quill +
  inkwell vignette and an oxen-wagon vignette.
- Ornate compass rose lower-right, ~200 unit radius, with
  fleur-de-lis north tip.
- Scale bar bottom-center: "1 inch ≈ 70 miles".
- Four corner vignettes labeled in italic.
- Pacific Ocean strip on the far-left edge with vertical "Pacific
  Ocean" label.
- Region zones (PNW / Wyoming / Plains / Idaho / desert) each
  carry their own scenery — pine forests, mountains, buffalo, etc.

**Paintable variants:**
- Same composition, fills replaced with `none`, strokes lightened
  to `#8B7558` (sepiaLi). Trail line stays light pink at reduced
  opacity. Numbered space circles outlined, not filled. Landmark
  names + state labels in faint pencil-stroke gray. Paper grain +
  vignette overlays omitted (no fills to mute, would print as gray
  noise).

### Printing/painting guide
- Single-page letter-portrait printable.
- 8 sections: print options table, Staples instructions, Hobby
  Lobby supply list, 8-color palette with paint-mixing recipes for
  each, 5 painting techniques (sky wash / layered green / soft
  graduated mountains / river highlights / painting around printed
  text), sealing instructions, optional laminating, Gabby's-dad
  tips block.

## Open questions / NEEDS-PLAYTEST

1. **Browser print preview:** open each of the 15 files in a real
   browser and use File > Print Preview to verify
   - tiles render at 8.5×11 without clipping
   - poster renders at 36×24 landscape (Chrome and Safari may need
     custom paper-size dialogs to actually print 36×24)
   - the guide fits letter portrait
2. **Tile assembly fit:** print all six decorated tiles on letter
   paper, tape them together at the registration dots, verify the
   trail flows naturally tile-to-tile across the assembled board.
3. **Paint absorption:** test the paintable variant on 100lb
   cardstock with thinned acrylic — confirm the pencil-gray strokes
   don't bleed when wet.
4. **Extended-trail tile generation:** spec defers extended (50-space)
   tiles to v3.1.1. The generator's tile composition functions
   currently hardcode short-trail space numbers (1–25). To produce
   extended tiles, add an `extendedMode` flag to each tile function
   and re-number spaces 1–50 across the 6 tiles.

## git work pending

Per the standing v3.1 build instruction, no commits were made
during the build. The working tree contains:

- `build_v31_board.js` — Node generator (~1100 lines)
- `docs/board_short_tile_{A..F}_{decorated,paintable}.html` — 12 files
- `docs/board_poster_{decorated,paintable}.html` — 2 files
- `docs/PRINTING_AND_PAINTING_GUIDE.html` — 1 file
- `NOTES_v3.1.md` — pre/post walk-throughs
- `BUILD_REPORT_v3.1.md` — this file
- `oregon_trail_game_data.json` — `meta.version` bumped 3.0 → 3.1
- `claude_code_prompt_amendment_v3.1.md` — spec doc

The previous generic tile files (`board_short_tile_A_blank.html`,
`board_short_tile_A_decorated.html`, etc.) at `docs/` were
**overwritten** by the v3.1 redesigned files of the same name (the
decorated variant) plus the new `*_paintable.html` files. The old
`*_blank.html` files remain untouched in `docs/` — those were the
v2.x blank-board variants and can be deleted as a separate cleanup
commit if desired.

Recommended commit message:
> v3.1: physical board redesign + 36x24 wall poster + painting guide
> 
> 6 redesigned tiles × 2 variants (decorated + paintable),
> a 36×24" landscape wall poster (decorated + paintable), and a
> printing/painting guide. Generated by build_v31_board.js (shared
> SVG library + per-tile compositions + poster + guide).
> 
> Game logic untouched. pink_oregon_trail.html unchanged.
> meta.version bumped 3.0 → 3.1 in JSON.

## Why this is a generator script not 15 hand-edited files

Composing the same component library across 15 outputs by hand
would have multiplied the work and guaranteed inconsistency
between the decorated and paintable variants. Single Node script
keeps the library as one source of truth; per-tile compositions
are arrangements. Re-running the generator regenerates all 15
files in deterministic order. To tweak any component (a slightly
darker mountain, a different fort flag), edit one function and
re-run.
