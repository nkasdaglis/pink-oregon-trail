# BUILD REPORT — v2.9 (visual overhaul)

**Status:** complete · **Date:** 2026-04-27 · **Working file:** `pink_oregon_trail.html`

## Summary

v2.9 is a visual overhaul layered on v2.8. Brightened scenery, region
weather, larger wagon, smaller callout type, single-row bottom bar,
team walking alongside the wagon, parchment-style historical map,
real public-domain photo override, and a fix for the now-playing
badge clipping. No gameplay changes.

## Stage outcomes

| # | Stage | Result | Notes |
|---|---|---|---|
| 1 | Scenery brightness fix | PASS | atmosphere gradients lifted across morning/midday/afternoon/dusk; data-region + data-winter overrides; Oregon City finish forces midday |
| 2 | Weather + ambient motion | PASS | tumbleweeds + sun glare (high desert), fog drift (foothills), falling rocks (mountains), dusk leaves (forest); transform-only keyframes; reduced-motion gated |
| 3 | Wagon scale up | PASS | default `wagonScale` 0.9 → 1.10; smaller-scene 0.85 → 1.10, 0.7 → 0.85 |
| 4 | Callout typography | PASS | 8 clamp tuples lowered ~15% to match v2.8's narrower left-anchored callout |
| 5 | Single-row bottom bar | PASS | new `.bottom-bar` grid: standard+ in single row 38/22/36 fr, compact stacked; mini-map height reduced to 100px in row, 180px when stacked |
| 6 | Team walking alongside wagon | PASS | `_buildTravelingTeam` paints walking figures + canopy silhouettes + trailside graves into the scene; pace-driven walk cadence; reduced-motion gated |
| 7 | Historical trail map | PASS | parchment minimap with state outlines, Platte/Snake/Columbia rivers, dashed trail polyline through 12 historical waypoints; spaces and wagon markers project onto the curve; ~80 lines of dead snake-grid code removed |
| 8 | Photo override population | PASS (after recovery) | 633 KB override block spliced before final `</body>`; first attempt landed inside a JS comment that contained literal `</body>` text — surgical repair restored the comment and re-spliced via `lastIndexOf`; expanded `historicalLocationIdFor` map to cover fort_kearny, fort_hall, fort_boise, ash_hollow, scotts_bluff, courthouse_rock |
| 9 | Now-playing badge | PASS | CSS-only fix; removed nowrap + ellipsis combo that was collapsing multi-word names to a single character at narrow widths |

## File size journey

| Checkpoint | Bytes | Notes |
|---|---:|---|
| v2.8 baseline | 585,810 | starting point for this amendment |
| Stage 1 | 589,300 | atmosphere gradients |
| Stage 2 | 596,100 | + weather keyframes |
| Stage 3 | 596,300 | + wagon scale literals |
| Stage 4 | 596,700 | + clamp tuples |
| Stage 5 | 614,200 | + single-row bottom bar CSS |
| Stage 6 | 623,700 | + team walking helper + CSS |
| Stage 7 | 627,100 | + historical map (dead minimap code removed, net +3.4KB) |
| Stage 8 | 1,261,157 | + 633 KB photo override block embedded |
| Stage 9 | 1,261,617 | + cosmetic CSS delta |

Final file is **1.26 MB**, within the spec's 1.2-1.3 MB target after
photo embed.

## Validation

- JS parse: both inline `<script>` blocks parse cleanly via
  `new Function(content)` (Node smoke test).
- Helper sanity sims:
  - `_buildTravelingTeam` with a 5-member test team → 3 walkers + 1
    canopy silhouette + 1 grave; output 3 KB, well-formed SVG.
  - `_buildHistoricalMapSvgBody` with a stub trail → 6.9 KB output;
    parchment fill, Platte/Snake/Columbia labels, compass rose, and
    wagon markers all present.
- Browser visual verification: NOT performed in this build session.
  The animations, scene composition, and bottom-bar geometry should
  be eyeballed at compact (`<1280px`), standard (1280-1919),
  and large (≥1920) widths before this is committed.

## Known follow-ups (deferred to v3.x)

These were explicitly *out of scope* for v2.9 per the spec's
`scope_explicitly_excluded` block:

- Audio rebalancing (some musical states overlap awkwardly).
- Physical printable board redesign.
- Per-member death-position tracking on the trail (Stage 6 graves
  currently render as a sober count along the bottom-left rather
  than at geographic death sites — the schema change to
  `w.membersLost` was deferred to keep the build focused).
- Wagon wheel rotation synced to translateX (the existing 1.2s
  continuous spin already reads as "wagon is rolling" and the
  effort to sync wasn't worth the visual improvement).

## git work pending

Per the standing instruction for this build, no commits were made
during the v2.9 stages. The working tree contains:

- `pink_oregon_trail.html` — full v2.9 working file
- `NOTES_v2.9.md` — per-stage walk-throughs (pre + post)
- `BUILD_REPORT_v2.9.md` — this file
- `historical_photos_override_block.html` — source of the photo
  data (still at the repo root; the splice copies its body into the
  main HTML)
- `oregon_trail_game_data.json` — `meta.version === "2.9"` block
  carried forward from earlier (no JSON edits in this build)

Recommended commit message style:
> v2.9: visual overhaul (scenery + weather + wagon + bottom bar +
> team walking + historical map + photos + badge fix)

The `docs/` GitHub Pages folder is untouched — copy
`pink_oregon_trail.html` over once Gabby has playtested.
