# Claude Code Directive — Pink Oregon Trail v3.3

You are working on a project Nicholas's daughter Gabby (11, sixth grade) designed: a hybrid printable-board + browser game for her social studies class, called Pink Oregon Trail. The game is a single self-contained HTML file that runs offline from a USB stick on a school Chromebook. It exists at v3.2 and is fully playable.

You are implementing **v3.3**. The full specification is in **`pink_oregon_trail_v3_3_spec.json`**, located in the project root. **Read that file first, cover to cover, before writing any code.** It is the authoritative source of truth — 16 items, calibration targets, acceptance tests, FL standards mapping, stage order, build discipline, sign-off checklist.

## Your job in three sentences

Read the JSON spec. Implement all 16 items in the order specified by `stage_order`. When all 14 acceptance tests pass and all 6 calibration cells pass on 500-run Monte Carlo, write `BUILD_REPORT_v3_3.md`, make ONE final commit with a comprehensive message, and stop.

## Project context you should already know

- Repo root contains: `pink_oregon_trail.html`, `oregon_trail_game_data.json`, `BUILD_REPORT_v3_*.md`, `NOTES_v3_*.md`, `README.md`, board tile HTML files, and the v3.3 spec JSON.
- Read `BUILD_REPORT_v3_2.md` and `NOTES_v3_2.md` for context on how the prior build was structured. Match that style.
- The game runs by opening `pink_oregon_trail.html` directly in a browser. No build step. Test live by opening the file.
- Calibration is run via `#calibrate=N` URL hash in the browser, or via Node with the same code path. Both must produce the same results — the `V32_*` simulation module is the single source of truth.

## Build discipline (non-negotiable)

1. **Logic-first, staged, documented.** For every item (1 through 16), write a PRE-implementation walk-through and a POST-implementation result into `NOTES_v3_3.md`. The walk-throughs are HOW you avoid silent regressions. Same pattern as existing `NOTES_v2_5.md` and `NOTES_v3_2.md` — read those for reference style if you haven't.

2. **JSON first, code second.** Almost every change lives in `oregon_trail_game_data.json` first. Re-embed using `.refresh_embedded_gamedata.js` (or equivalent) after each JSON edit so the inline `GAME_DATA` literal in the HTML matches. Drift between external and embedded is a known structural risk — embed-after-edit is mandatory.

3. **Calibration is a hard gate.** After Stage 2 (strategy loops), run the 500-run Monte Carlo for all 6 configs. **Do not proceed past Stage 3 until all 6 cells pass primary and secondary targets.** Retune via the levers listed in `calibration_targets.discipline` of the spec. Never retune by changing the targets themselves.

4. **Don't break v3.2 saves.** New fields added with safe defaults. Set `meta.version: "3.3"` and `meta.compatible_with: ["3.2"]`.

5. **One final commit, not many.** Per Nicholas's direction for this build: do NOT commit during work. Maintain a "git work pending" log in `NOTES_v3_3.md` listing what should be in the final commit message. When the sign-off checklist is complete, run ONE git commit with a comprehensive message covering all 16 items, then push.

6. **Don't change anything in `do_not_change`.** That list in the spec is the safety rail. The state machine, dice system, trail layouts, audio, wagon SVG, save flow, setup screens — all stay. If anything in the spec seems to imply changing these, stop and surface as a spec contradiction in NOTES_v3_3.md.

## When you finish

Write `BUILD_REPORT_v3_3.md` matching the structure of `BUILD_REPORT_v3_2.md`. Required sections:

1. Executive summary — what shipped, what didn't, headline calibration numbers
2. Per-item results — 16 items × pass/fail/deferred with implementation notes
3. Calibration table — actual vs. target for all 6 cells, primary + secondary metrics
4. Acceptance test results — 14 tests × pass/fail
5. Known limitations and deferred items
6. Self-test summary
7. Final commit message used

Then commit.

## Tone for new content

When writing new period-voice prose (calamity narratives, fortune narratives, DYK card text):
- Concrete sensory detail over abstract claims
- No anachronism — pioneers didn't say "vibes"
- No preachiness — let the trail teach
- Respect for Native American peoples — they were guides, traders, healers, neighbors. Never antagonists.
- Honest about hardship — kids can handle that people died on the trail. Don't be gratuitous; don't sanitize.

Gabby's name is on this. Make her proud.

— Nicholas
