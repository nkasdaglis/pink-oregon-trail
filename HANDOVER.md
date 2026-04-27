# Pink Oregon Trail — session handover

This document brings a fresh Claude Code session up to speed on the project. Read it once and you have everything needed to continue Nicholas's work without poking around.

## What this is

A hybrid printable-board + browser game built for Nicholas's daughter Gabby's history class (11 years old). Single self-contained HTML file plus a printable physical board. Period 1840s aesthetic. Nicholas drives the design; Claude Code does the implementation.

## User identity

- **Name:** Nicholas Kasdaglis (`nickkasdaglis@gmail.com`)
- **Daughter:** Gabby (the player)
- **GitHub:** `nkasdaglis/pink-oregon-trail`

## Working directory

`C:\Users\nickk\pink-oregon-trail` — Windows 11, Git Bash available, also PowerShell. Use forward slashes in paths and Unix shell syntax.

## Where things live

| Path | What |
|---|---|
| `pink_oregon_trail.html` | The game. Single self-contained file (3.3 MB). Both HTML+CSS+JS+JSON+inline photo override block. |
| `pink_oregon_trail_rules.html` | Printable rules HTML (~900 lines). |
| `oregon_trail_game_data.json` | Standalone copy of the JSON game data. The inline JSON inside `pink_oregon_trail.html` is the runtime source of truth; this file is a parity mirror Nicholas can edit. Keep them in sync when JSON changes. |
| `docs/index.html` | The CRT-themed landing page (`landing_page.html` is the source). |
| `docs/play.html` | The deployed game. **Refreshed at the end of every patch's deployment commit.** |
| `docs/rules.html` | Mirror of the rules HTML. |
| `docs/board_short_tile_{A..F}_{decorated,paintable}.html` | 12 tile files (v3.1 generator output). |
| `docs/board_poster_{decorated,paintable}.html` | 36×24" wall poster (v3.1). |
| `docs/PRINTING_AND_PAINTING_GUIDE.html` | Print/paint guide (v3.1). |
| `docs/board_short_paintable.pdf`, `docs/board_extended_paintable.pdf` | Pre-rendered paintable PDFs. |
| `docs/historical_photos_override_v3_2.html` | The 46-photo override block (also embedded in `pink_oregon_trail.html`). |
| `build_v31_board.js` | Node generator that emits all 15 v3.1 board files. Re-run to regenerate. |
| `landing_page.html` | Source of `docs/index.html`. |
| `.backups/` | Versioned JSON backups. Move old `oregon_trail_game_data.vX.Y.backup.json` files here from the repo root. |
| `NOTES_vX.Y.md` | Per-amendment design walk-throughs (v2.3 discipline — pre-impl + post-impl). |
| `BUILD_REPORT_vX.Y.md` | Per-amendment build reports. |
| `claude_code_prompt_amendment_vX.Y.md` | Nicholas's spec for each amendment. |
| `economy_simulation_v3_2.py` | Reference Monte Carlo simulator (v3.2 economy). Don't run it; the JS port mirrors it. |
| `economy_calibration_v3_2.txt` | Canonical economy parameters. |

## Live URLs

- **Landing page:** https://nkasdaglis.github.io/pink-oregon-trail/
- **Game:** https://nkasdaglis.github.io/pink-oregon-trail/play.html
- **Rules:** https://nkasdaglis.github.io/pink-oregon-trail/rules.html
- **TinyURL → landing:** https://tinyurl.com/pink-oregon-trail (resolves to the GitHub Pages root)

GitHub Pages rebuild lag is ~60-90 seconds after a push.

## Standing rules (NEVER violate)

1. **Single self-contained `pink_oregon_trail.html`.** Vanilla HTML/CSS/JS, no frameworks, no external network requests at runtime. Game must work offline from a USB drive.
2. **Period 1840s voice** for all narration.
3. **Never use the words** "AI", "Claude", "GPT", "LLM", "model", "agent", "chatbot" anywhere user-facing — narration, UI text, JSON values, captions.
4. **No git commits during a build.** The standing pattern: build → "git work pending" in build report → single deployment commit at end.
5. **Deployment commits ARE allowed** at the end of an amendment (the spec usually says so explicitly with a verbatim message). Same exception applies to small deployment-refresh tasks (landing-page setup, PDF refresh, map orientation fix).
6. **Pre-authorized git commits and pushes** per the user's auto-memory feedback file. Proceed without per-step confirmation. Force-push and history rewrites still need approval.
7. **Maintain `NOTES_vX.Y.md`** per stage with **pre-implementation walk-through** + **post-implementation result**. The "v2.3 discipline."
8. **Always write `BUILD_REPORT_vX.Y.md`** at the end of an amendment. Include calibration numbers, audit line numbers, deviations from spec.

## Auto-memory

`C:\Users\nickk\.claude\projects\C--Users-nickk-pink-oregon-trail\memory\` holds persistent facts across sessions. Currently:

- `MEMORY.md` — index
- `feedback_git_authorization.md` — "Pre-authorized git commits and pushes; proceed without per-step confirmation. Force-push and history rewrites still need approval."

Read `MEMORY.md` at session start. Add new memories when Nicholas teaches you something durable about how he likes to collaborate.

## Build cadence Nicholas uses

Each amendment ships a `claude_code_prompt_amendment_vX.Y.md` file at the repo root. The pattern is:

1. **Step 1:** Confirm `meta.version` in JSON matches the amendment.
2. **Step 2:** Read the amendment in full before writing any code.
3. **Step 3:** Implement stage by stage. Pre-impl walk-through → code → post-impl result, in `NOTES_vX.Y.md`.
4. **Step 4:** Build report, deployment commit at the end (verbatim message from spec when given), push.

When a stage has a STOP gate (e.g., v3.2 §3j calibration sim), validate before proceeding.

## Version history (most recent at top)

| Version | Hash | What |
|---|---|---|
| **v3.2** | `db8820d` | Real economy with units (lbs/gal/$/doses), Medicine + Wagon HP resources, daily shocks + income, sky/day-night fix (region-backdrop class preservation), gender-neutral letter signoff, photo override expanded 11→45/46, multiplayer setup-screen note, rules HTML overhaul, calibration STOP gate passed (Hunter+Doctor on Medium hits all 5 spec targets). |
| **v3.1.1** | `7192123` | Day/night cycle stuck fix (Cause A — `paintScenery` only fired on game-start/wagon-rotate, not on every turn end), race-to-fort hidden when wagon is at a fort + new `use_fort_doctor` choice, paintable PDFs refreshed in `docs/`. |
| **v3.1** | `8078b4a` | Physical board redesign: 6 tiles × 2 variants + 36×24" poster × 2 variants + printing/painting guide. Generated by `build_v31_board.js`. |
| **map fix** | `9e3a946` | Historical mini-map orientation flipped — east right, west left, Oregon City on the LEFT. Educational geography fix. |
| **v3.0** | `f3a17c1` | Mobile UI overhaul (drawer-based layout, audio gate, save notice, orientation hint), pin-needle wagon markers with smart-stacking, setup-screen mobile reflow. |
| **v2.9** | `5d21464` | Visual overhaul: scenery brightness, region weather, wagon scale-up, callout typography, single-row bottom bar, team walking alongside the wagon, parchment historical map, photo override embed, now-playing badge fix. |
| **landing page** | `bb6f97f` | Deploy CRT-themed landing at `docs/index.html`, game moves to `docs/play.html`. |
| **v2.5–v2.8** | `7145266` (Nicholas's bundled commit) + earlier | Bandit overshoot fix, calendar calibration, deaths unification, mobile, walking team groundwork, historical map, photos, callout left-anchor. |

## Known follow-ups / NEEDS-PLAYTEST

These were documented in build reports but not executed. Not in scope for new amendments unless requested.

1. **v3.2 §3g full fort menu replacement.** Only the Buy option was rewritten to v3.2 prices/units. Sell/Hire/Repair/Rest/News/Letter still use legacy v2.x semantics. Full replacement was deferred — the existing fort UI is wired into the bandit/encounter chain and ~200 lines of new UI plumbing risked regressions.
2. **v3.2 §3i Wagon HP=0 hard-fail.** Wagon HP slot renders WAGON DESTROYED but doesn't force a repair scene or game-over. Live integration logs damage but doesn't block the journey.
3. **v3.2 hide economy on the live Sell path.** Calibration sim accumulates hides correctly; live wrappers update `w.resources.hides`; but the existing fort Sell menu still sells hides at the legacy 3-money rate (not the spec's $3/hide with Merchant +40%).
4. **v3.2 photo count discrepancy.** Spec said 46; my regex counted 45 keys. Block is intact and parses; one multi-line key declaration likely missed the regex. Verify if needed.
5. **v3.1 Extended-trail tile files (12 more for 50-space board).** Deferred per spec line 23. The Stage 0 SVG library is reusable — add `extendedMode` flag to tile composition functions and re-render.
6. **`docs/board_short_tile_*_blank.html` cleanup.** v2.x blank-board files orphaned in `docs/` after v3.1 introduced `_paintable.html` variants. `git rm` them in a one-liner commit when convenient.
7. **iPad mini landscape (1024×768).** Lands in `compact` density tier (v2.7's narrow-desktop), not `standard`. Spec said "uses standard layout" but compact is the spec's *intent* (non-mobile, smaller-screen). Document discrepancy if it ever bites.
8. **Real-device playtest of every amendment.** All builds validated by Node smoke tests + math sims; no real iPhone/Android verification was done. Drawer tap latency, iOS Safari Web Audio unlock, drawer-map pin-needle scaling at 56vh — all flagged NEEDS-PLAYTEST.

## Next planned amendment

**v3.3 — multiplayer via PeerJS Cloud + room codes**, supporting up to 6 players, with USB and web solo play preserved. Nicholas's standing plan; he'll provide a `claude_code_prompt_amendment_v3.3.md` when ready. Don't start it without the spec.

## Architectural notes for future builds

### v3.2 economy module (`V32_*` namespace)

Pure functions in the `// SECTION 12 — v3.2 ECONOMY MODULE` block (search for `const V32_STARTING`). The same functions drive both the live Push On day-flow and the `#calibrate=N` calibration sim — single source of truth.

- `simulateJourney(team, difficulty)` — one journey end-to-end, mirrors the Python reference. Returns `{ finished, eliminated, members_lost, money }`.
- `runCalibrationSim(n, team, diff)` — runs N journeys, prints stats. Wired to `#calibrate=N` URL hash.
- `_v32LiveView(w)` — proxy shim mapping the live wagon's `w.resources.{food,water,supplies,medicine,money,hides}` and `w.wagon_hp` onto the calibration's flat schema. Adapters `v32ApplyDailyConsumption` / `v32ApplyDailyShock` / `v32ApplyDailyIncome` use the shim to drive both paths from the same code.

### Day/night cycle wiring

- `_bgFrame()` emits `<svg class="region-backdrop" …>`.
- Both `applyRegion` and `paintScenery` use a regex replace that ADDS `scene-backdrop` alongside `region-backdrop` (do not strip). v3.2 fix; commit `db8820d`.
- `setTimeOfDayFromWagon(w)` sets `data-time` on `<html>`. CSS rules of the form `:root[data-time="X"] .region-backdrop .atmosphere { fill: url(#atmo-X) }` then match.
- Phase formula uses `Math.floor(daysTraveled / daysPerTurn) % 4` so all four phases hit on both trail lengths (one per turn). v3.1.1 fix.
- `data-finish="1"` on `<html>` forces midday at Oregon City (set in `resolveFinish`, cleared in `beginJourney`).

### Density tiers (v3.0)

`updateUIDensity()` in `pink_oregon_trail.html` sets `data-ui-density` on `<html>`:

| Tier | Detection | Notes |
|---|---|---|
| `mobile` | `w<740 OR (w<1024 && h>w) OR (w<1100 && h<500)` | Phone-portrait, narrow-portrait tablet, phone-landscape (the third clause was added because the spec's literal rule missed iPhone landscape). |
| `compact` | `<1280` | Chromebook tab / small laptop. iPad mini landscape lands here. |
| `standard` | 1280-1919 | Default laptops. |
| `large` | 1920-2559 | 4K laptop / large monitor. |
| `jumbo` | ≥2560 | 4K TV / projector. |

CSS variables (`--portrait-size`, `--action-btn-height`, `--callout-max-w`) and the bottom-bar / drawer / setup-screen layouts all key off the data-attribute.

### Mobile drawers

- Markup at end of `#screen-game` div: `.mobile-interaction-panel`, `.drawer-tab.team`, `.drawer-tab.map`, `.drawer-overlay`, `.drawer.drawer-team`, `.drawer.drawer-map`. Hidden at non-mobile densities.
- `_syncMobileLayout()` relocates `#team-strip`, `#minimap-container`, `#action-buttons` between the desktop `.bottom-bar` and the drawer/panel containers on every density change. Fires on init + resize.
- `_wireDrawers()` toggles `.open` on tab click; overlay click closes; Esc closes; Enter/Space activate the tab buttons.

### Wagon-marker rendering (v3.0)

`_buildWagonPinMarkers(wagons, total, activeWagon)` in `_buildHistoricalMapSvgBody` (mini-map renderer). Smart-stacking by `position`: lengths 16/24/32/40/48/56, x-offsets `(rank − (n−1)/2) × 5`. Active wagon's `<g>` flagged `data-active="true"` and CSS-pulsed.

The mini-map is geographically-correct: Independence MO at x=730 (right/east), Oregon City at x=40 (left/west). v3.0.1 fix flipped via `x' = 800 − x`. Three render surfaces share `_buildHistoricalMapSvgBody`: inline mini-map, click-to-expand fullscreen overlay, mobile drawer-map.

## Skills and tools you have access to

- **`/loop`** — periodic loops with explicit interval (CronCreate) or self-paced (ScheduleWakeup). Don't use without a clear reason.
- **`/schedule`** — kick off a future agent. Useful when finishing an amendment that has a follow-up that won't happen until a deadline (e.g. "deploy v3.0 to play.html in 2 weeks if Gabby has playtested").
- **`/fast`** — toggle Opus 4.6 fast mode (only on Opus 4.6, not 4.7).
- **`/help`** — Claude Code help.
- **`/ultrareview`** — multi-agent cloud review of current branch. User-triggered only.

Subagents available: `Explore` (codebase searches), `Plan` (architecture planning), `general-purpose` (multi-step research), `claude-code-guide` (CLI/SDK questions), `statusline-setup`. Spawn for parallel research; don't spawn for code edits Claude Code can do directly.

## Tips that have come up in this project

- **The huge `pink_oregon_trail.html` (3.3 MB) sometimes triggers token limits when read whole.** Use `Read` with `offset` and `limit`, or `Grep` for line numbers and read the relevant region.
- **The inline JSON inside `pink_oregon_trail.html` is the runtime source.** When changing JSON values, change BOTH the inline copy AND the standalone `oregon_trail_game_data.json` to keep them in parity.
- **Photo override block (`<script id="historical-photos-override">`) is huge.** Replacing it with a regex inside Node is fine; it parses cleanly as a separate `<script>` block. Beware: any naive `</body>` regex replace can match a literal `</body>` inside a JS comment — use `lastIndexOf('</body>')` for safety. (See v2.9 BUILD_REPORT for the splice-corruption story.)
- **Calibration validation can run in Node.** Extract the `V32_*` block from `pink_oregon_trail.html`, eval it, call `runCalibrationSim(n, team, diff)`. Same code paths as the browser's `#calibrate=N`.
- **Don't strip the `region-backdrop` class** when re-rendering the scene backdrop. v2.9 → v3.2's biggest bug.
- **Bystanders/historical figures keep their actual gender.** Only the player's avatar references go neutral.
- **Nicholas occasionally pushes commits manually.** Check `git log` at session start — the working tree may be ahead of what your context shows.
- **The `.gitignore` patterns `.build_*.js` and `.test_*.js` only match leading-dot files.** Top-level generators like `build_v31_board.js` are NOT ignored — they're committed as build artifacts.

## How to start a new session well

1. Read this file (`HANDOVER.md`).
2. Read `MEMORY.md` (auto-memory index).
3. `git log --oneline -8` to see recent commits.
4. `git status` to see current working-tree state.
5. Look in the repo root for any `claude_code_prompt_amendment_*.md` newer than the most recent build — that's likely the next amendment Nicholas wants worked on.
6. If unsure what's next, ask.
