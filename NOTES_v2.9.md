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
