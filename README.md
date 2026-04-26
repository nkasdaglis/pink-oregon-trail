# Pink Oregon Trail

A hybrid printable-board + browser game designed by **Gabby Kasdaglis** for her history class. Players move wagon tokens on a printed paper trail board while a browser app handles the simulation: a coupled-resource model that produces the historical 1-in-10 trail-death rate through emergence, with state-aware members, profession-aware narratives, a 5-channel audio system, and a final history quiz at the trail's end. The whole thing is one self-contained HTML file, runs offline, and works from a USB stick on a school Chromebook with WiFi off.

## What's in this folder

| File | What it is |
|---|---|
| `pink_oregon_trail.html` | The game. Open in any browser. |
| `oregon_trail_game_data.json` | Source data Gabby designed: trails, events, choices, professions, surprise events, narratives, calibration constants. v2.0. |
| `board_short_tile_A_blank.html` / `..._A_decorated.html` | Printable Letter-size tiles for the **Short** trail board (1 tile, blank + decorated). |
| `board_extended_tile_A_blank.html` … `_F_blank.html` (and `_decorated.html`) | Printable Letter-size tiles for the **Extended** trail board (6 tiles A-F that tape together). |
| `claude_code_prompt.md` | The original v1.0 design brief (kept for history). |
| `claude_code_prompt_amendment.md` | The consolidated v2.0 design amendment that supersedes the original. |
| `HOBBY_LOBBY_SHOPPING_LIST.md` | Craft materials list for assembling the physical board. |
| `README.md` | This file. |

## How to play

### Open the game

Double-click `pink_oregon_trail.html`. It works fully offline. No internet needed. No installation. Works on any school Chromebook.

### Print the board

The physical board is printed as a series of Letter-size tiles you tape together.

**Short trail:** print `board_short_tile_A_decorated.html` (one page) and you're done. The blank version is the same layout without decorations if you and Gabby want to color it yourselves.

**Extended trail:** print all six decorated tiles (`board_extended_tile_A_decorated.html` through `_F_decorated.html`) and tape them together at the marked edges. The blank versions are for decorating by hand.

To print: open a tile in a browser, press **Ctrl+P** (Mac: ⌘+P), choose "Save as PDF" or print directly.

### Setup

1. **Length** — Short Journey (~15 min, 25 stops) for one class period, or Extended Journey (~40 min, 50 stops) for the full crossing.
2. **Mode** — Single Player, Cooperative (everyone shares one wagon), or Competitive (2-4 wagons race).
3. **Outfit each wagon** — type your name and your wagon's name, choose **7 of 23 professions**, then name each persona. Optional: toggle Teacher Mode.
4. **Begin Journey.**

### Each turn

Choose an action: **Push On** (roll dice and travel), **Hunt** (skip movement, gather food), **Rest** (skip movement, heal), or **Forage** (skip movement, find food and water). Adjust **Pace** and **Rations** anytime by clicking the badges in the top strip — these compound on every Push On turn.

When you land on a fort, a river, or a landmark, a special menu opens. Pay attention to the **Did You Know?** facts that appear at landmarks — at the trail's end, a bandit ambush will quiz you on five of them.

## What the simulation actually does

This isn't a fixed-outcome game. The resource layer is a coupled dynamical system. Members have states (healthy → weakened → sick → injured → dying → lost). Sick members consume 2× water. Sick members can't activate their profession's protection. A Doctor who gets sick can no longer save anyone. A team that runs zero water for three consecutive turns will see most of its members shift to dying. The historical 1-in-10 death rate emerges from the system feedback, not from scripts.

A hidden luck counter shifts probabilities by ±15% based on recent outcomes (resets at forts). 8% of turns trigger a rare "surprise event" — Aurora Borealis, A Lone Fiddler, A Star Falls to Earth, the White Buffalo. Even a Doctor's protection has a 3% residual failure: most of the time Mom-the-Doctor saves you from cholera; once in 30 cases she does everything she can and someone is lost anyway.

Calibration: a careful player reaches Oregon ~75% of the time; a careless player reaches it ~50% of the time. About 60-100% of wagons lose at least one member. About 20-49% are eliminated entirely.

## What the game teaches

- **Westward expansion** — the actual route from Independence to Oregon City, with all the major historical landmarks.
- **Coupled-system thinking** — water shortage breeds sickness, sickness multiplies water consumption, sickness disables protectors. Choices have weight that compounds.
- **Native Americans as helpers** — the Native Guide river crossing is the safest and historically accurate; the game shows them where they really were.
- **The role of professions** — what 23 trades actually did on a wagon train, and what happens when you lose them mid-trail.
- **Real strategic decisions pioneers faced** — pace, rations, river crossings, fort visits, when to rest vs. push.
- **The winter deadline** — why timing was life and death (the Donner Party met this exact fate).
- **History through artifact** — scripted graves on the trail (Sarah Keyes of the Donner-Reed Party), hidden historical figures peeking out of landmark scenes (Daniel Boone at Independence), 23 sourced "Did You Know?" facts in rotation.
- **Probabilistic thinking** — choice cards display qualitative risk (Probably safe / Some risk / Risky), not numbers. Players judge by team strength and gut feel, like a real wagon master.

## How Gabby can edit the game

The game data lives near the top of `pink_oregon_trail.html` between these markers:

```js
// ===== GAME DATA START =====
const GAME_DATA = { ... };
// ===== GAME DATA END =====
```

Edit any value, save, refresh the browser. No build step. The whole game — events, narratives, surprise events, calibration constants, member-state probabilities, scripted graves, hidden figures, leaderboard seeds, dispatch letter templates — is data-driven. The HTML/JS reads from `GAME_DATA` so retuning the feel of the game doesn't require code changes.

Top-level keys in the JSON:

- `meta` — version, calendar, simulation system rules, stochastic config, difficulty notes
- `professions` — 23 trades with skills
- `events` — 54 trail events with profession-aware narratives
- `choices` — 15 fork-in-the-road decisions
- `surprise_events` — 16 rare memorable events
- `trails` — Short (25 spaces) and Extended (50 spaces), each with type, info, and category per space
- `pace_options`, `ration_options`, `turn_actions` — strategic levers
- `fort_options`, `river_options` — sub-menus
- `historical_facts` — 23 sourced facts with quiz overlays
- `bandit_ambush` — the trail's-end quiz finale
- `scripted_graves`, `hidden_figures` — history through artifact
- `leaderboard_seed` — 15 benchmark scores for the class to beat
- `dispatch_system`, `dispatch_letter_templates` — letters home from forts
- `teacher_mode`, `what_if_mode` — classroom features

## Tunable constants

Most balance numbers live in the JSON. The few hardcoded UI constants in the HTML:

- Animation durations (callout slide-in 0.4s, dice shake 0.5s, region cross-fade 0.6s, eyelid 4s)
- Canvas viewBox dimensions (800×500 for the scene canvas)

Everything else — `EVENT_CHANCE` (0.55), `CHOICE_CHANCE` (0.30), `WINTER_WARNING_DAY` (130), `WINTER_DEADLINE_DAY` (165), `INDEPENDENCE_ROCK_DAY` (90), state transition probabilities, resource consumption rates, surprise event chance, residual risk percentages — comes from `GAME_DATA.meta.simulation_system` and `GAME_DATA.meta.stochastic_system`.

## Technical notes

- Single self-contained HTML file. No internet, no CDN, no fonts, no analytics, no fetch calls. Drop on a USB drive, double-click on a Chromebook, it just works.
- Pure HTML/CSS/JS — no frameworks. ~4500 lines of plain procedural code, readable enough for an 11-year-old with help.
- All sound is procedural (Web Audio API). 5 audio channels: music, region ambient, state-driven member loops, event SFX, dialogue cues. Independent mute toggles for sound effects (🔊) and music (♪) persist via URL hash.
- All character art is inline SVG with consistent skin-tone variants and profession-specific accessories — no images, no fonts.
- Class-period leaderboard and previous-run player graves persist in `localStorage`. Clear from in-game settings or via browser controls.
- Add `?dev=1` to the URL while playing to surface internal debug info.

Have fun on the trail.
