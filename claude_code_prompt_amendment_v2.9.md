# Pink Oregon Trail — v2.9 Amendment (Visual Overhaul)

## Context

Direct playtest feedback from Nicholas after v2.8: the game still has visible issues that v2.7 and v2.8 didn't address. Confirmed in screenshot review:

- Scenery is uniformly dark across all times of day. Even the Oregon City win scene renders with a near-black sky.
- Wagon is undersized relative to canvas — reads as small in scene compositions.
- Bottom bar takes 3 stacked rows (action buttons, team strip, mini-map), eating vertical space that could be scenery.
- Team is invisible during travel — no figures walk alongside the wagon. Players don't see their team in motion.
- Trail map is generic; doesn't match the actual historical Oregon Trail geography.
- Now-playing badge shows just first character ('g') instead of full player name.
- Photo override has remained empty — Nicholas just sent the photo zip.

This amendment addresses all of these in one focused build. **Audio issues, physical board redesign, and Pioneer Voices DYK cards are explicitly deferred to v3.0/v3.1** (called out in JSON `v2_9_visual_overhaul.scope_explicitly_excluded`). Don't try to do everything at once — kept v2.9 visual-only.

JSON updated to v2.9. Confirm `meta.version === "2.9"` before starting.

**Scope: 9 stages, ~6 hours of focused build time.** Stage 6 (team walking alongside) is the bulk of the design work and warrants careful attention.

---

## Build order

Sequenced so each stage validates the foundations of the next.

### Stage 1 — Scenery brightness fix

The v2.6 day/night cycle's atmospheric gradients are too dark across the board. Fix:

- Open the existing scenery building functions (likely `sceneryFor` in pink_oregon_trail.html, also region-specific functions if they were broken out).
- For each region's atmosphere gradient at each time-of-day, raise the lightness of the top stop. Specific minimum lightness values per time-of-day are in JSON `v2_9_visual_overhaul.stages.stage_1_scenery_brightness.specific_brightening_targets`.
- Special override for Oregon City finish scene: force midday-style bright atmosphere regardless of `daysTraveled` value. The win moment must feel triumphant, not gloomy.

**Acceptance:** Walk through all 5 regions × 4 times-of-day combinations. No combination should be so dark that figures and foreground objects are silhouetted into invisibility. Dusk scenes can be moody (orange/purple) but must be readable.

### Stage 2 — Weather and ambient motion

Add region-specific motion that wasn't fully landed in v2.6:

- **Plains**: verify grass-sway is running. Buffalo silhouettes should drift slowly across horizon (1-2 active at a time, 30-second crossing). Birds in V formation crossing every ~25s.
- **High desert**: NEW tumbleweeds (1-2 active, rolling foreground crossings, 8-12s each). NEW sun glare overlay at midday (faint white radial gradient upper-right corner).
- **Foothills**: NEW fog drift during morning (2-3 horizontal soft white bands drifting across mid-layer). Hawk circling preserved.
- **Mountains**: snowflakes after day 130 (verify). NEW falling rocks animation every ~45s on a distant slope. Eagle preserved.
- **Forest**: NEW falling leaves during dusk (orange/yellow leaves drifting down from canopy with slow rotation). God-rays preserved.

**All animations are CSS keyframes on transform-only properties.** No layout-triggering animations. Target 60fps with all weather active.

**Acceptance:** Visit each region at midday and at dusk. Verify the listed motion elements are visible.

### Stage 3 — Wagon size up

Default wagon scale up from 0.85 to 1.10 across `renderSceneCharacters()` call sites. Where existing scale is 0.7 (small/distant scenes), bump to 0.85. Where it's 1.0, leave alone.

**Acceptance:** Wagon visibly larger in fort, river, landmark, and travel scenes.

### Stage 4 — Callout typography slightly smaller

Current clamps in `.narrative-callout`:
- Title: `clamp(20px, 2vw, 36px)` → change to `clamp(17px, 1.7vw, 30px)`
- Body: `clamp(14px, 1.1vw, 22px)` → change to `clamp(13px, 1vw, 19px)`
- Choice button label: similar reduction

Reason: callout-on-left occupies 42vw at standard density. Smaller text fits more callout in the same width and gives more breathing room for the right-side scene.

### Stage 5 — Single-row bottom bar (standard+ density only)

Currently the bottom of the screen has 3 stacked horizontal bands: action buttons row, team strip row, mini-map row. Total height ~280px at standard density.

**Replace with single-row layout at standard, large, and jumbo density:**

```
[ TEAM STRIP — 38% ] [ MINI-MAP — 22% ] [ ACTION BUTTONS — 36% ]
```

CSS pattern: CSS Grid with `grid-template-columns: auto 1fr auto` and `align-items: center`. Each child takes its natural width; mini-map flexes to fill the middle.

**Compact density (< 1280px wide): KEEP stacked layout.** Not enough horizontal room for single-row at compact resolutions.

**Mini-map behavior**: stays click-to-expand (existing v2.7). In single-row layout default is smaller (~280×80px); click expands to fullscreen overlay.

**Action buttons**: choice options during events STILL appear in the callout panel (per Nicholas's confirmation). Action bar stays as Push On / Hunt / Rest / Forage / optional Make for Fort. When dice rolling, briefly disable action bar with "Rolling..." overlay.

**Vertical space freed**: Going from ~280px stacked to ~100px single-row at standard density frees ~180px for scene canvas. This is a meaningful improvement.

**Acceptance:** At 1920×1080, all three elements fit on one row with appropriate spacing. At 1366×768 (compact), 3-row stacked layout preserved. At 4K resolution, layout still single-row with generous spacing.

### Stage 6 — Team walking alongside the wagon (THE BIG ONE)

**Spend time on this. Get it right.**

#### Visual concept

During Push On (the dice-roll-and-travel turn), the wagon does NOT travel alone. The seven team members are visible across the canvas — some walking ahead, some flanking the wagon, one bringing up the rear, sick/injured/dying members visible as silhouettes inside the wagon, and lost members commemorated by small grave markers on the trail behind.

#### Position assignments

Walk the `w.team[]` array. Assign each living member to a position based on state (in priority order):

1. **Lost members**: render small grave marker on the ground in the trail-rear area (viewBox x=50-150, y near ground). Cross or stone with member's name. Persistent across turns. Do NOT animate; they're attached to the trail behind.
2. **Dying members**: ride in wagon as silhouette (see "wagon passengers" below).
3. **Injured members**: ride in wagon as silhouette.
4. **Sick members**: ride in wagon as silhouette.
5. From REMAINING members (healthy + weakened):
   - Up to 2 to **lead position** (viewBox x=180-300). Prefer Scout if present; otherwise healthiest profession.
   - Up to 2 to **flank position** (viewBox x=400-500). Healthy/weakened adults walking alongside the wagon.
   - Up to 1 to **rear position** (viewBox x=700-750). Prefer weakened over healthy (slowest brings up the rear).
   - Any remaining: ride in wagon as silhouette (represents children, extra hands).

**Edge case all riding**: If all 7 members are sick/injured/dying, only the wagon shows with all silhouettes inside. Bleak but legible.

**Edge case team smaller than 7**: If members are lost, fewer figures walk. Empty positions just don't render.

#### Wagon passengers (silhouettes inside)

Add a new `<g class="wagon-passengers">` group inside the wagon SVG, positioned through the canvas top. Holds up to 3 simplified silhouette figures at slightly reduced opacity (~70%). When a team member is sick/injured/dying or doesn't fit in the walking positions, they render here as a silhouette.

Silhouette is a simplified version of the character's full-body SVG (just torso + head shape, no profession accessories), tinted darker to suggest interior shadow. They visibly sit/lean inside the wagon.

#### Walk cycle animation

CSS-driven, runs ONLY during the dice-roll-and-travel animation phase (~1.5 seconds), then settles to static positions for the rest of the turn.

```css
@keyframes characterWalk {
  0%   { transform: translateY(0); }
  50%  { transform: translateY(-2px); }
  100% { transform: translateY(0); }
}
.character.walking { animation: characterWalk 0.7s ease-in-out infinite; }

@keyframes legSwing-left {
  0%, 100% { transform: translateX(0); }
  50%      { transform: translateX(3px); }
}
@keyframes legSwing-right {
  0%, 100% { transform: translateX(0); }
  50%      { transform: translateX(-3px); }
}
.character.walking .leg-left  { animation: legSwing-left 0.7s ease-in-out infinite; }
.character.walking .leg-right { animation: legSwing-right 0.7s ease-in-out infinite; }
```

State modifiers:
- **Healthy**: full bounce (-2px), full leg swing (3px). Cycle: 0.7s.
- **Weakened**: half bounce (-1px), 80% leg swing, slight forward lean (rotate 2deg). Cycle: 0.85s (slower).
- **Lead-position-Scout**: faster cycle (0.6s), slight forward lean (eager). 

#### Horizontal travel during dice roll

While the dice are tumbling and settling (~1.5s total), team figures + wagon all translate rightward across the canvas. JavaScript drives the position via `requestAnimationFrame`. Translation amount proportional to rolled movement: e.g., a roll of 6 = 6/8 of full screen-width travel.

**Wagon wheel sync (deferred from v2.6/2.7/2.8)**: implement now. Wheels rotate proportionally to translateX delta:

```javascript
const wagonRadius = 8; // viewBox units of the wheel
const circumference = 2 * Math.PI * wagonRadius;
const rotationDegrees = (currentTranslateX / circumference) * 360;
wheels.style.transform = `rotate(${rotationDegrees}deg)`;
```

Wheels actually roll forward, not just spin in place. Same approach for any wheel/leg that should sync with horizontal motion.

#### Performance budget

7 walking figures + wagon + scenery + weather is potentially 60+ animated DOM elements. Test on a Chromebook (1366×768 simulated). If FPS drops below 30, simplify:
- Reduce particle counts
- Drop some figures (e.g., lead position becomes 1 figure instead of 2)

But don't sacrifice the walking team — that's the headline feature of this stage.

#### Between turns

When NOT in the Push On animation phase (callout open, action menu showing, etc.), team figures **stay at their final positions but freeze** (animation paused via `animation-play-state: paused`). Wagon also static. This is a performance win and visually correct (the team has stopped to deliberate).

### Stage 7 — Historical map shape

Replace the generic mini-map with a stylized historical map of the Oregon Trail's actual route.

#### Map design

- **Background**: parchment color `#F4E8D8`, subtle paper grain via SVG filter `<feTurbulence>` at very low opacity
- **Edges**: slightly browned/curled via radial gradient overlay
- **State outlines**: faint sepia (`#A89070`, 0.5px) outlining Missouri, Kansas Territory, Nebraska Territory, Wyoming Territory, Idaho Territory, Oregon Territory. State names labeled in small italic serif.
- **Rivers**: faint blue-gray lines for Missouri, Platte, Sweetwater, Snake, Columbia rivers.
- **Trail line**: thick rose-pink (`#B85770`), 3px stroke, slight stroke-dasharray for hand-drawn feel.

#### Trail shape (the actual historical Oregon Trail)

Trail follows roughly:

1. Start at Independence, MO — viewBox coordinate ~(15, 45)
2. Straight west through Kansas/Nebraska along the Platte River (mostly horizontal, slight south as you go)
3. Through Nebraska/Wyoming border (~x=40-50 of viewBox)
4. South Pass is the inflection point — trail bends NORTHWEST from here
5. Through Idaho along Snake River oxbow shape (dramatic curve)
6. Columbia River gorge near final approach
7. Oregon City at viewBox coordinate ~(12, 38) (Willamette Valley, slightly south of Columbia)

ViewBox: `0 0 100 60` (5:3 aspect). The shape forms a long horizontal stretch with a northwest leg in the final third — an L-shape laid on its side.

#### Stop markers

- **Forts**: filled brown circles, 5px diameter, with small text label (e.g., "Fort Laramie")
- **Landmarks**: small pink stars, 4px
- **River crossings**: small wave icons
- **Current wagon position**: tiny wagon SVG (~10px wide), position computed by linearly interpolating between trail keypoints based on `w.position / trail.length`

#### Multi-wagon display (Competitive)

Each wagon as a small colored circle (per the v2.3 wagon-color palette) with player initial inside. Currently active wagon's marker pulses gently.

#### Expand to fullscreen

Click the mini-map to overlay a 90vw × 80vh version with higher detail. Click outside to dismiss. Existing v2.7 expand mechanism preserved.

**This map's geographic shape will inform v3.1's physical board redesign.** Same trail route, same landmarks at same relative positions.

### Stage 8 — Photo override population

Nicholas provided `historical_photos_override_block.html` in the project folder (delivered alongside this amendment). The file contains a complete `<script id="historical-photos-override">` block with 11 photos base64-encoded inside.

**Implementation:**

1. Read `historical_photos_override_block.html` from the project folder.
2. Find the closing `</body>` tag in `pink_oregon_trail.html`.
3. If a `<script id="historical-photos-override">` block already exists in the HTML (from any prior fetch_historical_photos.py run), REPLACE it with the new block.
4. Otherwise insert the new block immediately before `</body>`.
5. Save and verify file size increased by ~620KB (the size of the embedded photo data).

**The photos cover these landmark IDs** (from JSON `v2_9_visual_overhaul.stages.stage_8_photo_override_population`):

- `fort_laramie`, `chimney_rock`, `south_pass`, `the_dalles`, `oregon_city` (the original 5 of 9 slots)
- `fort_kearny`, `fort_hall`, `fort_boise` (NEW — these forts exist in trail data but didn't have illustration slots before)
- `ash_hollow`, `courthouse_rock`, `scotts_bluff` (NEW — landmark slots)

**Consumer code changes needed:**

The existing `landmarkIllustrationFor()` function (or similar) in v2.5+ should already check `window.HISTORICAL_PHOTOS_OVERRIDE` first. Verify:

1. The function correctly maps SPACE NAMES to landmark IDs (e.g., space named "Fort Laramie" → id `fort_laramie`).
2. New bonus IDs (`fort_kearny`, `fort_hall`, `fort_boise`, `ash_hollow`, `courthouse_rock`, `scotts_bluff`) have name→id mappings added.
3. When the wagon arrives at one of these bonus landmarks/forts, the override consumer renders the photo. If no override, falls back to daguerreotype SVG (or generic fort/landmark SVG if no daguerreotype exists for that ID).

**Acceptance**: Visit Fort Laramie, Chimney Rock, The Dalles, Oregon City — see real photos. Visit South Pass — see Adams' Tetons photo as substitute. Visit Independence Rock or Soda Springs — see daguerreotype SVG fallback (no photo available). Visit Fort Kearny / Fort Hall / Fort Boise / Ash Hollow / Courthouse Rock / Scotts Bluff — see their respective photos.

### Stage 9 — Now-playing badge full-name fix

Screenshot shows "g" in the now-playing badge instead of "Gabby."

**Hypothesis**: The badge renders only the first character (e.g., `name.charAt(0)`) instead of the full name.

**Find**: Search pink_oregon_trail.html for `now-playing` (CSS class) or `nowPlaying` (JS function). The render code is probably in `renderTurnBanner` or `showNowPlaying`.

**Fix**: Render the full `w.playerName`, not a truncated version. If the badge layout space is too narrow to fit a long name, use CSS `text-overflow: ellipsis` for graceful truncation in the rendering — but the source string passed in must be the full name.

**Acceptance**: Win screen, leaderboard, all in-game badges show "Gabby" (or whatever name was entered), not "g."

---

## Validation requirements

Each stage gets a pre-implementation walk-through in NOTES_v2.9.md per the v2.3 discipline. After implementation, validate:

- **Stage 1**: 5 regions × 4 times-of-day = 20 atmosphere screenshots described in text. Identify any combinations that fail the readability test.
- **Stage 2**: Per-region motion check. Each weather element either visibly fires or not.
- **Stage 3-4**: Visual diff vs v2.8. Wagon clearly larger; callout text clearly smaller.
- **Stage 5**: Tested at 1024×600, 1280×720, 1366×768, 1920×1080, 2560×1440, 3840×2160 — single-row at standard+ density, stacked at compact.
- **Stage 6**: This is the headline feature. Test PUSH ON in all team-state combinations:
  - All 7 healthy: 5 walking, 2 in wagon (children)
  - 4 healthy, 1 sick, 1 injured, 1 lost: 4 walking, 2 in wagon (sick + injured silhouettes), grave marker on trail behind
  - 1 healthy, 6 dying: 1 walking ahead (lead), 6 silhouettes in wagon, grim
  - All 7 lost: this should never reach Push On (wagon is eliminated), but if forced, only the empty wagon and 7 grave markers behind
- **Stage 7**: Historical map renders with state outlines, rivers, trail shape, current wagon icon. Click expands to fullscreen.
- **Stage 8**: Visit each landmark; confirm photo OR appropriate fallback renders. File size check (~+620KB).
- **Stage 9**: Setup with name "Gabby" — confirm badge shows "Gabby."

## Build report requirements

Per v2.3 discipline:

- Per-stage commit ledger (under "git work pending" — no autonomous commits)
- Pre-implementation walk-throughs in NOTES_v2.9.md
- Stage 5 layout screenshots described at 6 resolutions
- Stage 6 team walking validation across all the state combinations listed above
- File size before vs. after (target: ~1.2-1.3MB after photo embedding; if larger, audit)
- Performance: rough FPS during Push On with all weather active
- Open questions

## Critical reminders (unchanged)

- Single self-contained HTML file. No frameworks. No external requests at runtime.
- No git commits during build. All git work in build report.
- Period 1840s voice for narration.
- No words "AI", "Claude", "GPT", etc., anywhere user-facing.
- Preserve all v2.5–v2.8 mechanics. v2.9 is purely visual + photo data.

## Why this scope is right

v2.9 deliberately excludes audio overhaul (deferred to v3.0) and physical board PDF regeneration (deferred to v3.1). Doing visual + audio + board in one amendment would be 12+ hours of Claude Code time and ~30 stages — too easy to leave half-finished. Splitting into three focused amendments lets each one ship cleanly with its own validation.

After v2.9, the game has: bright varied scenery with motion, wagon and team visible during travel, full-name badges, real period photographs at most landmarks, single-row bottom UI, historically-accurate trail map. Audio still has the slow-music and static-noise issues — those go to v3.0. Physical board still has the v1 layout — that goes to v3.1.

This is the right slice. Build it.
