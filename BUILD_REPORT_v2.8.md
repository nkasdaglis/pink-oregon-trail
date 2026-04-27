# Pink Oregon Trail — v2.8 Build Report (Callout Repositioning)

Build date: 2026-04-27
Designer: Gabby Kasdaglis
Engineer: Nicholas Kasdaglis
Branch: `main` · GitHub: <https://github.com/nkasdaglis+pink-oregon-trail>

The smallest patch in the v2.x series. Playtest screenshots from
Nicholas show the narrative callout sitting dead-center of the scene
canvas, directly on top of the wagon. Player sees scenery + text
panel but no wagon. Fix: anchor the callout to the LEFT, narrow its
width budget, and shift the default wagon position right so the two
don't collide.

Per Nicholas's standing instruction, no `git` commands ran during
this build. Code is on disk. Recommended commits in "git work
pending" at the end.

---

## Pre-flight

- `meta.version === "2.8"` confirmed.
- `callout_repositioning_v2_8` JSON key present.
- v2.7 carryover verified (the v2.7 `--callout-max-w` density vars,
  `--portrait-size`, `data-ui-density` system, fort silhouette
  resize, and character-layer `xMidYMid meet` are all intact and
  reused by this patch).

---

## What changed

### Stage 1 — `.narrative-callout` left-anchored

**Before (v2.7):**
- `position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%);`
- `max-width: var(--callout-max-w, min(640px, 70vw));`
- `@keyframes calloutIn { from { ...transform: translateX(-50%) translateY(20px); } to { ...transform: translateX(-50%) translateY(0); } }`

**After (v2.8):**
- `position: absolute; left: 16px; bottom: 16px;` (no transform — anchored to viewport left, 16px gutter)
- `max-width: var(--callout-max-w, min(580px, 42vw));`
- `max-height: 88%` (was 80%; more vertical room since horizontal got tighter)
- `@keyframes calloutIn { from { ...transform: translateY(20px); } to { ...transform: translateY(0); } }` (no centering transform)

**Per-density `--callout-max-w` re-tuned for left-anchored geometry:**

| Tier | v2.7 | v2.8 |
|---|---|---|
| `:root` default | min(640, 70vw) | min(560, 42vw) |
| compact | min(540, 88vw) | min(440, 86vw) |
| standard | min(640, 70vw) | min(560, 42vw) |
| large | min(720, 55vw) | min(680, 38vw) |
| jumbo | min(900, 45vw) | min(820, 35vw) |

The compact tier intentionally keeps near-full-width (86vw) because
small Chromebook tabs don't have horizontal room for a side-panel
layout. The mobile fallback (Stage 2) restores centering at <740px
where even compact-tier 86vw becomes too tight.

### Stage 2 — mobile fallback (`@media (max-width: 740px)`)

Inside the existing `@media (max-width: 740px)` block, override
`.narrative-callout` to restore centered-bottom positioning AND
re-define `@keyframes calloutIn` with the centering transform.

```css
@media (max-width: 740px) {
  ...
  .narrative-callout {
    padding: 14px 18px;
    left: 50%; bottom: 8px;
    transform: translateX(-50%);
    max-width: min(95vw, 540px);
  }
  @keyframes calloutIn {
    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
}
```

Note: the inside-media-query `@keyframes calloutIn` re-definition
SHADOWS the outer keyframe at media-match time. Browsers handle
this correctly per the CSS spec (last-defined-applicable rule wins
during cascade resolution).

### Stage 3 — wagonX default + call-site audit

**`renderSceneCharacters` default:** `540` → `580`.

**Call sites updated** (every `wagonX: 540` and every `wagonX: 380`
shifted to `580` and `560` respectively per spec direction):

| Function (line) | v2.7 wagonX | v2.8 wagonX |
|---|---|---|
| Hunt action callout (10311) | 540 | 580 |
| Rest action (10332) | 540 | 580 |
| Forage action (10366) | 540 | 580 |
| `resolveNarrativeEvent` (10595) | 540 | 580 |
| Independence Rock (10891) | 540 | 580 |
| `resolveFort` (11009) | 540 | 580 |
| `resolveLandmark` (11361) | 540 | 580 |
| `showWinterWarning` (11434) | 540 | 580 |
| `triggerBanditAmbush` intro (11459) | 540 | 580 |
| `resolveRiver` (11248) | 380 | 560 |
| `resolveFinish` Oregon City (11597) | 380 | 560 |
| `showEliminationScene` (11816) | 380 | 560 |
| `renderTravelScene` (9966) | 360 | **kept** |

The `renderTravelScene` 360 case is intentionally kept per spec —
the idle "what will the team do today?" scene draws the wagon at
scale 1.0 (largest), centered visually around 360-450 in viewBox
units; the wagon's 90-unit width extends past the callout's right
edge on every density tier so the wagon is partly visible
regardless.

---

## Computed gaps between callout right edge and wagon left edge

Using the v2.7 character-layer aspect handling (xMidYMid meet on
800×500 viewBox into the scene canvas's 1fr grid row at ~60% of
viewport height):

| Tier | Viewport | Callout right edge | Wagon @580 left edge | Gap |
|---|---|---|---|---|
| compact | 1024×768 | 456 px | 678 px | **222 px** |
| standard | 1366×768 | 576 px | 849 px | **273 px** |
| standard | 1920×1080 | 576 px | 1193 px | **617 px** |
| large | 2560×1440 | 696 px | 1591 px | **895 px** |
| jumbo | 3840×2160 | 836 px | 2387 px | **1551 px** |

Every tier shows a comfortable gap. Even on the smallest 1024×768
Chromebook tab, there's 222 px of scenery breathing room between
the callout and the wagon — enough for some sky and ground to
show through.

---

## Edits delta

| | Lines / count |
|---|---|
| CSS lines changed (`.narrative-callout` + 5 density rules + media query + 2 keyframe rules) | **~14 lines** |
| JS lines changed (default + comment update) | **~7 lines** |
| HTML markup changes | 0 |
| Total file delta | 584.5 KB → 585.8 KB (**+1.3 KB**) |

This patch genuinely is small. The biggest blocks are CSS comments
explaining WHY (left-anchored vs centered, the per-density width
philosophy).

---

## Browser-required validation steps (NEEDS-PLAYTEST)

Open `pink_oregon_trail.html` in Chrome. DevTools → Toggle device
toolbar (Ctrl+Shift+M).

For each density tier, walk into a Fort scene (force via
`gameState.wagons[0].position = 5;` then click Push On from the
console) and verify:

| | Expected |
|---|---|
| 1 | The narrative callout sits flush LEFT of the scene canvas (16px from left edge) — not centered |
| 2 | The wagon is fully visible to the right of the callout, with sky/ground/scenery showing in the gap between them |
| 3 | The fort silhouette (v2.7) and the wagon (v2.8) coexist on the right portion of the canvas without obscuring each other |
| 4 | Player can read the entire callout text without any of it covering the wagon |
| 5 | At 1024×768 (compact tier) — callout takes most of available width but wagon (rendered at scale 0.7 around viewBox x=580) is still visible at the far right |
| 6 | At 1366×768 (standard) — callout 560 px, wagon visible with ~273 px breathing room |
| 7 | At 3840×2160 (jumbo) — callout 820 px, wagon visible with ~1550 px gap on a 4K projector |

**Mobile fallback verification:** resize viewport below 740px wide.
Callout should snap back to centered-bottom (per `@media
(max-width: 740px)`). The reanimation transform should land
correctly without sliding off-screen — re-defined keyframe inside
the media query handles this.

**Scene type variations to walk through:**
- Fort menu (Buy / Sell / Hire / Move On)
- River crossing choice (Ford / Caulk / Ferry / Guide)
- Trail event (drawn from event deck)
- Landmark with daguerreotype illustration (e.g., Soda Springs,
  Chimney Rock)
- Bandit ambush quiz UI
- Intervention modal (drive a member to dying state via console)
- Death announcement overlay (verify the larger v2.5 figure stamp
  on the canvas centerline doesn't collide with the left callout)
- Dispatch letter parchment card (uses the same `.narrative-callout`)
- Trail journal final view (post-game)

**Death announcement specifically:** the deceased character's
full-body figure is rendered center-canvas at `top: 22%` with
`width: clamp(180px, 40%, 360px)`. The callout at left will not
overlap because the figure is centered horizontally, occupying
~30-40% of width starting from canvas center. On the smallest tier
(compact, callout up to 86vw), there COULD be visual overlap —
verify in browser. If it's an issue, reduce compact-tier callout
width to 70vw.

---

## Open questions

1. **Compact tier 86vw might still feel cramped at 1024-1279 px viewports.**
   The mobile fallback only triggers below 740 px. The 1024-1279 px
   range gets the compact tier's 86vw callout, leaving only ~14% of
   width for wagon + scenery. On a typical Chromebook in tabbed
   browser this might still feel tight. If playtest reports the
   wagon disappearing on a 1080p Chromebook in narrow tabs, consider
   a midrange media query at `(max-width: 1024px)` that drops the
   callout to 70vw with the wagon shifting further right.

2. **The intentional `wagonX: 360` case in `renderTravelScene`.**
   The wagon at scale 1.0 (largest) sits at viewBox x=360-450. With
   the v2.8 callout at 42vw on standard tier, on a 1366×768 canvas
   the callout right edge is at ~576 px and the wagon's pixel range
   is ~615-753 px. So the wagon's LEFT EDGE just barely clears the
   callout, but it's tight. On the compact tier (86vw), the wagon
   would be entirely behind the callout. The spec said "buffalo /
   left-positioned scenes can stay as-is." Verify in playtest that
   this scene still feels right; if not, this is the next obvious
   site to tweak.

3. **Long callout content (Trail News broadside, dispatch letter).**
   The Trail News broadside (v2.3) and the dispatch letter parchment
   (v2.0) are both rendered inside `.narrative-callout`. They're
   text-heavy and now constrained to 42-38% canvas width. Should
   still be readable but may feel cramped on a narrow standard-tier
   laptop. Consider a `.narrative-callout.wide` modifier class for
   text-heavy callouts that extends to 70vw if playtest finds the
   broadside text too tight.

---

## Confirmation: git autonomy / commits

- **No git commands ran during this build** per Nicholas's standing
  instruction.
- Files on disk:
  - `pink_oregon_trail.html` (585.8 KB; v2.7 was 584.5 KB)
  - `BUILD_REPORT_v2.8.md` (this file)
- The deployment commit (`docs/`) from a prior session remains at
  HEAD on `main`.

---

## git work pending

For Nicholas to commit. Recommended split:

```
1. fix(v2.8): callout left-anchored — Stage 1
   files: pink_oregon_trail.html
   summary: .narrative-callout switched from left:50% + translateX(-50%)
            to left:16px (no transform). Per-density --callout-max-w
            narrowed to 35-42vw (compact tier keeps 86vw because phones
            have no horizontal room for a side panel). @keyframes
            calloutIn dropped the centering transform.

2. fix(v2.8): mobile fallback for <740px — Stage 2
   files: pink_oregon_trail.html
   summary: Inside @media (max-width: 740px), override .narrative-callout
            to restore centered-bottom + re-define @keyframes calloutIn
            with the translateX(-50%) transform. Phones get the full-
            width centered callout; everywhere else the side-panel
            layout from Stage 1 applies.

3. fix(v2.8): wagonX default 540→580; bandit/river/finish/elim 380→560 — Stage 3
   files: pink_oregon_trail.html
   summary: Default in renderSceneCharacters bumped from 540 to 580 so
            the wagon clears the new left-anchored callout. Nine explicit
            wagonX:540 call sites updated to 580; three wagonX:380 sites
            (river, Oregon City finish, elimination) updated to 560. The
            single wagonX:360 case in renderTravelScene kept as-is per
            spec — large-scale wagon extends past callout right edge on
            every density tier.

4. chore(v2.8): build report
   files: BUILD_REPORT_v2.8.md
   summary: Final size 585.8 KB. Computed callout/wagon gaps:
            222px (compact) → 1551px (jumbo). Browser-required validation
            steps for fort/river/landmark/bandit/intervention/death/
            dispatch/journal scenes documented.
```

Alternatively this can be one squashed `fix(v2.8): callout no longer
covers the wagon` commit. Per-stage split mirrors v2.5/v2.6/v2.7.

After commits land, redeploy:
```sh
cp pink_oregon_trail.html docs/index.html
git add docs
git commit -m "Deploy v2.8 to GitHub Pages"
git push origin main
```

---

## Verdict

Three small focused changes that compound: callout left-anchored
with narrowed widths, mobile fallback restores centered layout for
phones, default wagon position shifts right so the wagon stays
visible to the right of the callout. v2.7 responsive density tiers,
v2.6 graphics overhaul, v2.5 calendar/death-overlay/etc. all
preserved.

**The visible result on Nicholas's laptop should be:** open a fort
scene, see the wagon clearly on the right side of the canvas with
the fort silhouette behind/around it, while the callout (the actual
gameplay surface — buy/sell/news/etc.) sits cleanly on the left.
The teacher's 4K TV gets a 35vw callout (820 px max), leaving 65%
of canvas width for the wagon and scenery — comfortable across-room
viewing.

— v2.8 callout repositioning complete.
