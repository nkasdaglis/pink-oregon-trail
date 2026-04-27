# NOTES — v2.9 design walk-throughs

Per the v2.3 logic-first discipline carried into v2.9: each stage gets
a pre-implementation walk-through and a post-implementation note. v2.9
is a visual overhaul — purely visual, no gameplay changes (audio
issues and physical board redesign are deferred to v3.0/v3.1).

---

## Stage 0 — orient

- v2.9 JSON loaded; `meta.version === "2.9"`.
- `v2_9_visual_overhaul` block present (philosophy / stages /
  dependencies / scope_explicitly_excluded).
- `historical_photos_override_block.html` present at repo root,
  633 KB (within the spec's ~620 KB target).
- v2.8 working file: `pink_oregon_trail.html`, 585.8 KB. v2.7
  density tiers, v2.8 left-anchored callout, v2.6 graphics
  overhaul, v2.5 calendar/death paths all confirmed in prior NOTES.
- Target HTML size after Stage 8 photo embed: ~1.2-1.3 MB.

---

## Stage 1 — scenery brightness (PRE-IMPLEMENTATION)

**Walk-through:** v2.6 added the day/night cycle by setting
`data-time` on document root from `daysTraveled % 4` and swapping
`<linearGradient>` ids inside the `_bgFrame` SVG defs. Spec
diagnosis: those gradient stops are too dark across all times.
Specifically the v2.6 `atmo-dusk` is `#E8957B → #B07A7A → #5C4A66`
— the bottom stop is purple-charcoal which renders the foreground
nearly black.

**JSON-driven targets** (lower bound for top-stop lightness):
- morning/midday: ≥70%
- afternoon: ≥50%
- dusk: ≥30%
- never near-black except a true winter scene at day 165+

**Specific gradients to update** in `_bgFrame`:
- `atmo-morning`: top `#FFE4C4` → `#FDD89E` (warmer dawn)
- `atmo-afternoon`: NEW gradient, top `#F4D2A8`, bottom `#FBF6F0`
  (golden hour — was missing entirely; falling back to midday)
- `atmo-dusk`: top `#E8957B`, bottom `#C8A088` (red but readable —
  was `#5C4A66` charcoal)
- `atmo-midday`: leave (already bright enough)

Plus per-region overrides:
- Mountains midday: top `#B8C8D8` minimum (cool but bright)
- Mountains winter (day > 130): top `#E0E8F0`, bottom white
- High desert: faint white sun-glare radial in the upper-right
  during midday (Stage 2 will add this with the weather motion;
  for Stage 1 just lighten the gradient)
- Forest: greener; top `#C8E0C0` morning, `#98C088` midday

**Oregon City finish override:** when the wagon reaches the trail
end and `resolveFinish` fires, force `data-time="midday"` on the
document root so the win renders bright regardless of the actual
day count. This is a separate one-line setter; the rest of the
gradient changes affect every region.

**Edge cases:**
- The atmospheric gradient is shared across all regions in v2.6's
  `_bgFrame` (not per-region in JSON). The "per-region" tweaks the
  spec describes are largely the same set of gradients with subtle
  tonal shifts. I'll apply the v2.9 lighter master gradients and
  add a region-specific overlay where the spec calls one out
  (mountains winter, high desert sun-glare, forest greener).

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. Atmosphere gradients
brightened (morning #FDD89E top, afternoon #F4D2A8, dusk bottom from
charcoal #5C4A66 to readable #C8A088). Region-specific gradient ids
added: `atmo-mountains-midday`, `atmo-mountains-winter`,
`atmo-forest-morning`, `atmo-forest-midday`. CSS overrides driven by
`data-region` and `data-winter` attributes on the backdrop SVG, set
in `paintScenery`. `data-finish` on document root forces midday on
the Oregon City win; cleared in `beginJourney` so a fresh game
returns to the wagon's actual time-of-day. File size 585.8 → 589.3
KB.

## Stage 1 complete — scenery brightness fixed across all regions × times-of-day

---

## Stage 2 — weather and ambient motion (PRE-IMPLEMENTATION)

**Walk-through:** v2.6 added some ambient motion (clouds, birds, hawk,
vulture, snowflakes after day 130, dust devils in desert, embers
on Rest). Spec asks for additions:
- High desert: tumbleweeds rolling foreground (1-2 active, 8-12s)
  + sun glare overlay at midday (faint white radial upper-right)
- Foothills: morning fog drift (2-3 horizontal soft white bands)
- Mountains: falling rocks every ~45s on a distant slope
- Forest: dusk falling leaves (orange/yellow drifting+rotating)
- Plains: verify grass-sway / buffalo / V-formation birds (already
  in v2.6 — confirm)

**Implementation choice:** all CSS keyframes on transform-only
properties (no layout-triggering). Ambient motion that fires only in
the matching region is gated by CSS attribute selectors on
`.region-backdrop[data-region="..."]`. Ambient motion gated by time-
of-day uses `[data-time="..."]` from v2.6.

The v2.6 builders (`_bgFoothills`, `_bgHighDesert`, `_bgForest`)
already include placeholder DOM for some of these but don't have all
the keyframes wired. I'll add the missing keyframes + the missing
DOM elements (tumbleweeds, sun glare, fog bands, falling leaves,
falling rocks) inside the relevant region builders.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS. Added tumbleweeds + sun-glare to
`_bgHighDesert`, fog drift bands to `_bgFoothills`, falling rocks to
`_bgMountains`, and falling leaves (gated by `[data-time="dusk"]`) to
`_bgForest`. All keyframes are transform-only (translate + rotate) so
the compositor can run them on the GPU without re-layout. Each new
animation is wrapped in a `@media (prefers-reduced-motion: reduce)`
override that sets `animation: none`. File size 589.3 → 596.1 KB.

## Stage 2 complete — region-specific weather and ambient motion live

---

## Stage 3 — wagon scale defaults (PRE-IMPLEMENTATION)

**Walk-through:** v2.6 wagon SVGs are sized too small for the
brightened scenes. Spec asks for ~22% larger across the board.
Searched all `wagonScale: <num>` literals — they appeared at
0.7 / 0.85 / 0.9 / 0.95 / 1.0 / 1.10. The default in
`_makeWagonGroup` was 0.9. New default 1.10. Bump all the smaller
ones proportionally: 0.85 → 1.10, 0.7 → 0.85. Leave 0.95, 1.0, 1.10
alone since those are already legible (e.g. the title-screen wagon).

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS. Default wagonScale 0.9 → 1.10. All
0.85 instances → 1.10, all 0.7 → 0.85. The 1.0 and 0.95 anchors
preserved (these are explicit per-scene overrides). File 596.1 →
596.3 KB.

## Stage 3 complete — wagon now reads cleanly across all scene contexts

---

## Stage 4 — callout typography reduction (PRE-IMPLEMENTATION)

**Walk-through:** v2.8 narrowed the callout's *width* to clear the
right side of the canvas, but the inner type was still scaled for
the previous wider footprint. Spec asks for ~15% smaller across the
board on title, intro, flavor, modifier rows, narrative paragraphs,
and choice option labels. All those rules use `clamp(min, vw-based,
max)` so I'll shift each tuple down by roughly that amount. The
clamp ranges keep the type legible at compact (the min) and stop
runaway scaling at jumbo (the max).

Specific changes (lower the whole tuple, not just the max):
- `.event-title` 20-2vw-36 → 17-1.7vw-30
- `.event-intro` 14-1.3vw-22 → 13-1.2vw-20
- `.event-flavor` 13-1vw-20 → 12-0.9vw-18
- `.modifier-bonus` 13-1vw-18 → 12-0.9vw-16
- `.narrative-text` 14-1.1vw-22 → 13-1vw-19
- `.choice-option .opt-label` 14-1.1vw-19 → 13-1vw-17
- `.choice-option .opt-flavor` 13-0.95vw-17 → 12-0.85vw-15
- `.choice-option .opt-hint` 12-0.85vw-15 → 11-0.8vw-14

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS. All eight clamp tuples lowered.
File 596.3 → 596.7 KB.

## Stage 4 complete — callout type now sized for the v2.8 left-anchor footprint

---

## Stage 5 — single-row bottom bar (PRE-IMPLEMENTATION)

**Walk-through:** v2.7 set up density tiers (compact / standard /
large / jumbo) on `:root[data-ui-density]` from `window.innerWidth`.
At standard+ (≥1280px) the existing 2-row stacked layout
(team-strip on its own row, action-bar with mini-map + buttons on
another row) wastes vertical space and pushes the scene canvas up.
Spec asks: collapse to a single row of `[TEAM 38%] [MAP 22%]
[BUTTONS 36%]`. Compact stays stacked.

**Markup change:** wrap team-strip + mini-map + action-buttons in
a new `.bottom-bar` container. The old `.action-bar` wrapper is
dropped; mini-map and action-buttons become direct siblings of
team-strip inside `.bottom-bar`. JS only references `#team-strip`,
`#minimap-container`, `#minimap-svg`, `#minimap-label-text`, and
`#action-buttons` — none touch `.action-bar` directly, so no JS
changes needed.

**Layout:**
- `.bottom-bar` is CSS Grid. Default (= standard+):
  `grid-template-columns: minmax(0, 38fr) minmax(0, 22fr) minmax(0, 36fr)`
  with row=auto. The `minmax(0, …fr)` floor lets the grid track
  shrink below content size so `overflow-x: auto` on team-strip
  actually engages.
- Compact override: `grid-template-columns: minmax(0,320px) 1fr`,
  `grid-template-rows: auto auto`. Team-strip spans both columns on
  row 1 (with the v2.8 chrome restored: full-width tan tint, no
  border-radius, negative margins to break out of the bar's padding).
  Mini-map and action-buttons sit on row 2.

**Mini-map height:** in single-row mode the 180px svg height
dwarfs the buttons. Reduce to 100px at standard+; restore 180px at
compact. The full-screen click-to-expand overlay is unaffected —
it's a separate `.minimap-fullscreen` rule.

**`#screen-game` grid:** drop from 5 rows to 4
(`auto auto 1fr auto`) since team-strip + action-bar collapse into
the bottom-bar row.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. Markup wraps the
three children in `.bottom-bar`. `#screen-game` reduced to four
rows. `.bottom-bar` defaults to single-row 38/22/36 fr; compact
override puts team-strip on its own full-width top row. Team-strip
chrome moved off the strip itself onto the bottom-bar, with a
compact-density carve-out that restores the v2.8 strip background.
JS parses cleanly. File 596.7 → 614.2 KB (the +17.5 KB is mostly
new CSS rules + the comment block; expected).

## Stage 5 complete — bottom bar now lives on a single row at standard+ density

---

## Stage 6 — team walking alongside the wagon (PRE-IMPLEMENTATION)

**Walk-through:** This is the v2.9 headline feature. Today the team
lives only as portraits in the team-strip; on the scene canvas the
wagon is anonymous. Spec wants the player to *see* the team walking
with the wagon while it travels, with state-driven positioning:
- `lost` members → headstones at the side of the trail (pre-trail,
  not relocated by parallax — they stay at fixed scene positions
  near where they fell, so the scene history reads geographically).
- `sick` / `injured` / `dying` → silhouettes inside the wagon canopy
  (a small pose drawn behind the wagon's canvas-cloth, partially
  visible through a darkened window cutout).
- `healthy` / `weakened` → walking figures positioned around the
  wagon. Three slots: lead (in front of the oxen), flank (alongside
  the wagon body), rear (behind the wagon).

**Position assignment algorithm:**
1. Filter `w.team[]` by state.
2. Lost → render-only as graves; no walking slot needed.
3. Sick/injured/dying → silhouettes inside the wagon (max ~3 visible
   at once; if more, prefer the most recently struck members).
4. Healthy/weakened → distribute across lead/flank/rear in turn
   order. Family member (player) gets lead; remaining 2-7 healthy
   distributed: 1 flank, then rear, then second flank, etc.

**Walk cycle:** CSS keyframes on transform: translateY (gentle
bob ~3px) + scaleX flip every ~600ms for foot-swap illusion. Pure
transform = compositor-only, no re-layout. Duration scales with
pace (steady = 600ms, grueling = 480ms, etc.).

**Wagon wheel rotation:** sync to translateX of the wagon group.
Today wagon X is set via CSS variable `--wagon-progress`. Add a
companion `--wagon-wheel-rot` driven by the same JS that animates
progress; `.wagon-wheel { transform: rotate(calc(var(--wagon-wheel-rot)
* 1deg)); }`. During dice-roll travel JS increments rotation in
proportion to translateX delta.

**Travel vs. stop visibility:** during travel (between camps) the
walking figures animate; at a stop they freeze in their last frame.
Lost graves are visible at all times once the member dies.

**Performance budget:** with 7 walking figures, scenery, and weather
ambient motion, hold 60fps on a 2018 Chromebook (the lower-end
target). Each character SVG is ~3KB inline. Seven walking figures =
seven `<g>` groups in `scene-characters` with transform animation.
Compositor should handle 7-10 transformed elements easily.

**JSON-driven targets:**
- `walking_team_block.character_size`: 64×80 SVG (smaller than the
  team-strip portrait at 76×80 to fit the scene without dwarfing the
  wagon at 1.10 scale).
- `walking_team_block.lead_offset`: in front of oxen, x = wagon.x − 80
- `walking_team_block.flank_offset`: alongside wagon body, x = wagon.x − 5
- `walking_team_block.rear_offset`: behind wagon, x = wagon.x + 110

**Implementation surface:** new function `paintTeamWalking(w)` called
from `paintScene` (the per-frame paint function). It reads `w.team`,
assigns slots, and emits SVG `<g>` groups inside `scene-characters`.
The character SVG builder is `_makeCharacterGroup(member)` (already
exists for portraits — reuse with a smaller viewBox scale). Lost
graves are rendered separately by `paintGraves(w)` keyed off
`w.lostMemberMarkers[]` (a new array we'll push to whenever a member
transitions to `lost`).

**Spec contradictions check:** spec says "lost members are graves at
the *fixed scene position* where they died". Today there's no
historical record of where a member died — the death event records
the day, not the trail mile. I'll add `w.lostMemberMarkers[]` capturing
`{name, mileAtDeath, dayOfDeath}` at the moment of state transition,
and project those onto a scene x-coordinate via the existing
mile-to-x mapping used by mini-map. For members who died before this
v2.9 build, no markers exist; that's acceptable.

**No spec contradictions surfaced.** Proceeding (next message).

**POST-IMPLEMENTATION:** PASS in static check. New helper
`_buildTravelingTeam(w, wagonX, wagonY, wagonScale)` returns SVG
markup for graves (lost members) + canopy silhouettes (sick / injured
/ dying) + walking figures (healthy / weakened) in lead/flank/rear
slots around the wagon. `renderTravelScene` calls it after
`renderSceneCharacters` and appends via `insertAdjacentHTML` so the
existing wagon + characters layer stays untouched. New compact
walker `_miniWalkerInner` re-uses `PROFESSION_ACCESSORY` for hats /
signature items but skips the v2.6 gradient defs (figures are
18×30px so the fine detail isn't visible anyway). DOM cost per
travel-scene paint: at most 6 walker SVGs + 3 silhouette groups + N
graves. CSS keyframes are transform-only (translate + rotate). Pace
on `:root[data-pace]` drives walk cadence — surfaced from
`renderResourceRibbon`. Wagon X shifted from 360 → 480 in the travel
scene so the team has room around it; cleared via the existing
left-anchored callout geometry (callout right edge ~553px at
1280×800; wagon screen-x lands ~736px). Sanity sim with a 5-member
team: 3 walkers + 1 silhouette + 1 grave rendered, output SVG is
3KB. JS parses cleanly. File size 614.2 → 623.7 KB.

## Stage 6 complete — team now walks visibly alongside the wagon

---

## Stage 7 — historical map shape (PRE-IMPLEMENTATION)

**Walk-through:** Today the mini-map is a simple horizontal `<svg>`
with linear stops + a wagon marker at `position / trailEnd × width`.
Spec asks: replace with a parchment-styled historical map of the
Oregon Trail showing state outlines, rivers, and the trail's actual
geographic curve from Independence MO → Platte → South Pass → Snake
oxbow → Columbia → Oregon City. Wagon icon plotted along that curve
at the current trail position.

**Existing surface:** `renderMinimap()` is the function. SVG has id
`minimap-svg` with viewBox `0 0 800 500`. The compact-density
override now sets svg height to 180px; standard+ is 100px. ViewBox
unchanged — internal coords map onto svg height regardless.

**Implementation choice:** the new map needs a viewBox aspect that
reads as "wide US west" — the trail curves through ~9° latitude and
~25° longitude. Use `0 0 200 80` (2.5:1 ratio) so the trail reads as
a long arc.

**Path data:**
- Trail: dashed brown path from (8, 60) Independence to (192, 24)
  Oregon City. Cubic curves through control points at:
  - South Pass (~110, 38)
  - Snake oxbow (~150, 30)
  - Columbia (~178, 22)
- Major rivers: blue thin lines for Platte (around the lower-east
  half), Snake (mid), Columbia (upper-right).
- State outlines: faint tan paths for KS/NE, WY, ID, OR.
- Landmarks: small dots with abbrev labels at Fort Kearny, Chimney
  Rock, Fort Laramie, South Pass, Fort Hall, Fort Boise, The Dalles,
  Oregon City.

**Wagon position projection:** linear interpolation along the trail
path. `getPointAtLength` is supported on SVGPathElement; use that
with `position / trailEnd × pathTotalLength` to plot the wagon icon.

**Click-to-expand fullscreen:** unchanged — the same expand handler
clones the new svg into the modal.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS. New `_buildHistoricalMapSvgBody`
renders parchment background + simplified state outlines (KS/NE,
WY, ID, OR) + Platte/Snake/Columbia rivers + Rocky Mountain ridge
marks + dashed trail polyline through 12 historical waypoints from
Independence MO to Oregon City. Spaces project onto the trail at
fraction `(i-1)/(total-1)`; wagon markers ride the same curve.
ViewBox 0 0 800 500 unchanged (no CSS impact). The old
`buildMinimapSvgBody`, `_minimapPositionFor`, and `REGION_TINT`
were deleted as dead code (~80 lines). Both `renderMinimap` and
`showMinimapFullscreen` now call the new builder. Sanity sim
confirms the rendered SVG is 6.9KB and contains all expected
elements (parchment fill, river labels, compass rose, wagon
markers). File size 623.7 → 627.1 KB (net +3.4 KB after the dead
code was removed).

## Stage 7 complete — minimap is now a parchment-styled historical map

---

## Stage 8 — historical photo override population (PRE-IMPLEMENTATION)

**Walk-through:** A pre-built `historical_photos_override_block.html`
sits at the repo root (633 KB). It contains a `<script>` block
setting `window.HISTORICAL_PHOTOS_OVERRIDE` to a map of {key →
data-uri} for landmarks (Chimney Rock, Scotts Bluff, Independence
Rock, etc.) and forts (Kearny, Laramie, Hall, Boise). The current
HTML may already have an inline override block — replace it if
present, else insert before `</body>`.

**Implementation:** read the override file, scan the main HTML for
an existing `window.HISTORICAL_PHOTOS_OVERRIDE` `<script>` block,
splice it (replace the whole script block region) or append before
`</body>`. Verify file size grows by ~620 KB after splice.

**Edge case:** target HTML size after splice is ~1.2-1.3 MB. Spec
budget allows that. File stays self-contained (no external network
requests).

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS — but with a tale to tell. First splice
attempt used `main.replace(/<\/body>/, override + '\n</body>')` and
matched the FIRST `</body>` substring, which sat in a JS comment
("`// block before </body>: window.HISTORICAL_PHOTOS_OVERRIDE = {...}`").
The override block landed mid-comment and that comment's tail then
parsed as raw HTML (HTML parser closing the main script at the
override's literal `</script>` tag, then treating the leftover
JS as plain text). Repaired surgically: restored line 11100 to its
original text, removed the 17 misplaced lines, then re-inserted the
override block via `lastIndexOf('</body>')` which targets the actual
end-of-document close tag. Both scripts now parse cleanly (script #1
= 555 KB main game; script #2 = 633 KB override). Also expanded
`historicalLocationIdFor` map with fort_kearny / fort_hall /
fort_boise / ash_hollow / scotts_bluff / courthouse_rock keys to
match the override block. File size: 627.1 KB → 1.26 MB. Within the
spec's 1.2-1.3 MB target.

## Stage 8 complete — historical photo override block embedded inline

---

## Stage 9 — now-playing badge full-name fix (PRE-IMPLEMENTATION)

**Walk-through:** v2.4 added a "now-playing" corner badge that shows
which player's turn it is in competitive mode. Spec reports it
shows only the first character of the player's name. Need to render
the full `w.playerName`.

**Existing surface:** `renderTurnCornerBadge` at line ~10070. Likely
takes the first character via `playerName.charAt(0)` somewhere.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS. Investigation showed the JS already
emits the full `w.playerName` — no `charAt(0)` slicing in the badge
path. The visible "first character only" symptom traces to the CSS:
`.turn-corner-badge` had `max-width: 220px` + `white-space: nowrap`
+ `overflow: hidden` + `text-overflow: ellipsis` *together*, and at
narrow viewports those rules collapsed the badge to a single visible
character on multi-word names. Fix: switched the badge to flex
column layout, removed nowrap + ellipsis, added word-break on the
name span, and let max-width grow to `min(360px, calc(100% - 24px))`
so the full name reads cleanly at every density. JS unchanged.
File 1.26 MB → 1.26 MB (cosmetic CSS delta).

## Stage 9 complete — full player name now reads on the now-playing badge

---

## Stage 10 — build report

(Owned by `BUILD_REPORT_v2.9.md` at the repo root. This file is the
narrative log; the build report is the dashboard.)
