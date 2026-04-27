# Pink Oregon Trail — v2.8 Amendment (Callout Repositioning)

## Context

v2.7 fixed responsive UI chrome scaling — density tiers, clamp() typography, fort silhouette resize, aspect ratio handling. Playtest screenshots from Nicholas confirm the chrome now scales correctly across his laptop and the 55" classroom TV.

But one specific issue remains visible: **the narrative callout (event text + choice buttons) sits dead-center of the scene canvas, directly on top of the wagon's draw position.** The wagon is rendered at viewBox `x=540` (~67% from left). The callout is positioned with `left: 50%; transform: translateX(-50%)` and a max-width of ~640-720px. On a typical 1780-wide canvas, the callout's right edge sits at ~68% from left — exactly covering the wagon.

Result: in every fort/river/event scene, the text panel visually erases the wagon. Players see scenery and a text panel but no wagon. Nicholas's exact words: *"the text is blocking the wagon — perhaps move the text from the center of the page."*

This is a small focused fix — three CSS changes plus one JavaScript default value. Should be a 30-minute build.

JSON updated to v2.8. New top-level key: `callout_repositioning_v2_8`. Confirm `meta.version === "2.8"` before starting.

## Build order

Two stages.

### Stage 1 — Reposition the narrative callout

In the CSS for `.narrative-callout` (around line 414 in pink_oregon_trail.html):

**Current:**
```css
.narrative-callout {
  ...
  position: absolute;
  left: 50%; bottom: 16px;
  transform: translateX(-50%);
  max-width: var(--callout-max-w, min(640px, 70vw));
  width: calc(100% - 32px);
  max-height: 80%;
  overflow-y: auto;
  ...
}
```

**Replace with:**
```css
.narrative-callout {
  ...
  position: absolute;
  left: 16px; bottom: 16px;
  /* No transform — left-anchored, not center-translated */
  max-width: var(--callout-max-w, min(580px, 42vw));
  width: calc(100% - 32px);
  max-height: 88%;
  overflow-y: auto;
  ...
}
```

The `calloutIn` keyframe also needs updating since it referenced the `translateX(-50%)`:

**Current:**
```css
@keyframes calloutIn { 
  from { opacity: 0; transform: translateX(-50%) translateY(20px); } 
  to   { opacity: 1; transform: translateX(-50%) translateY(0); } 
}
```

**Replace with:**
```css
@keyframes calloutIn { 
  from { opacity: 0; transform: translateY(20px); } 
  to   { opacity: 1; transform: translateY(0); } 
}
```

Update the per-density `--callout-max-w` values to match left-anchored geometry:

```css
:root[data-ui-density="compact"]  { --callout-max-w: min(440px, 86vw); }
:root[data-ui-density="standard"] { --callout-max-w: min(560px, 42vw); }
:root[data-ui-density="large"]    { --callout-max-w: min(680px, 38vw); }
:root[data-ui-density="jumbo"]    { --callout-max-w: min(820px, 35vw); }
```

The compact tier intentionally allows the callout to take 86vw (nearly full width) because phones don't have enough horizontal room for a side-panel layout. Other tiers cap at 35-42% so the right portion of the canvas stays visible for the wagon and scene characters.

### Stage 2 — Mobile fallback (optional but recommended)

For viewports below 740px wide, restore the centered-bottom positioning since there's no horizontal room for a side panel:

```css
@media (max-width: 740px) {
  .narrative-callout {
    left: 50%;
    transform: translateX(-50%);
    max-width: min(95vw, 540px);
  }
  @keyframes calloutIn { 
    from { opacity: 0; transform: translateX(-50%) translateY(20px); } 
    to   { opacity: 1; transform: translateX(-50%) translateY(0); } 
  }
}
```

Note the keyframe re-definition inside the media query to restore the centering transform on mobile.

### Stage 3 — Wagon position tweak

In `renderSceneCharacters` (around line 8473), change the default `wagonX`:

**Current:**
```javascript
const wagonX = opts.wagonX != null ? opts.wagonX : 540;
```

**Replace with:**
```javascript
const wagonX = opts.wagonX != null ? opts.wagonX : 580;
```

Then audit explicit `wagonX:` call sites. Files to update:
- All `renderSceneCharacters({...wagonX: 540...})` → `wagonX: 580`
- The bandit scene at line ~11224 with `wagonX: 380` → `wagonX: 560` (so wagon stays clear of the callout in bandit ambush scenes too)
- The buffalo encounter / left-positioned scenes with `wagonX: 360` can stay as-is — those are intentionally wagon-on-left compositions and the callout sitting near the wagon there is acceptable

These shifts add 30-40px of horizontal breathing room between the right edge of the callout and the wagon's left edge. On a typical canvas, the wagon now sits at ~72% from left while the callout's right edge sits at ~45% from left — a comfortable gap with scenery visible between them.

## Validation

This is browser-required test. Walk into a fort scene. Verify:

1. The narrative callout sits on the LEFT side of the scene canvas (not centered)
2. The wagon is visible to the right of the callout
3. Forest trees / mountains / ground / sky on the right side of canvas are all visible
4. Player can read all callout text without it covering the wagon
5. On a phone-sized viewport (<740px), the callout falls back to bottom-centered (mobile fallback)

Repeat for: river crossing scene, landmark scene with daguerreotype, bandit ambush, intervention event modal, death announcement.

For the death announcement specifically: the deceased character's full-body figure is rendered center-canvas at `top: 22%` with `width: clamp(180px, 40%, 360px)`. The callout at left will not overlap because the figure is centered horizontally, occupying ~30-40% of width starting from canvas center. Verify there's no collision.

For the dispatch letter parchment card and trail journal final view: these use the same `.narrative-callout` class. They'll move to the left too. Check that they're still readable.

## What this does NOT fix

The callout still occupies a meaningful chunk of horizontal real estate. On the compact tier (small Chromebook, 1366×768 in tabbed browser), 42vw of width = ~575px. The remaining ~57% of canvas is enough for a wagon and minimal scenery, but if you go to a sub-1280px viewport (truly cramped), the experience is tighter than the standard tier. Mobile fallback handles the very-narrow case but the in-between (1024px-1279px wide) might feel tight. Acceptable for v2.8 — can be revisited in a future patch if playtest shows it's a problem.

The callout also still sits in front of any background scenery elements in its zone (left 42% of canvas). The callout has 96% opacity at the top, 88% at the bottom (gradient) — slight transparency lets faint background colors show through. If the player wants to see the FULL scenery, they need to dismiss the callout (click Continue or a choice button). This is correct behavior — the callout is the active interaction surface; scenery is ambient.

## Build report

Standard format. Specifically include:

- CSS line count delta (probably 4-6 lines changed)
- JavaScript change count (1 default value + a small handful of explicit call sites)
- Browser-required validation: confirm callout-on-left, wagon-on-right at all density tiers
- Mobile fallback verification at <740px viewport

## Critical reminders

- Single self-contained HTML file. No frameworks.
- No git commits during build. Append to "git work pending" list.
- No words "AI", "Claude", etc., anywhere user-facing.
- This is a CSS+small-JS patch. Should not require touching any game logic.

This is the smallest amendment yet — a focused fix for a specific layout issue. After this lands, Nicholas should be able to project the game on the 55" TV and have the wagon reliably visible during fort scenes.
