# Claude Code Prompt: Pink Oregon Trail (Hybrid Board + App Game)

> **How to use this prompt:** Open Claude Code in a fresh project directory. Place `oregon_trail_game_data.json` in the same directory. Then paste everything below this line into Claude Code as one message.

---

## Project context

I am building a hybrid board + browser game called **Pink Oregon Trail** with my 11-year-old daughter Gabby for her history class. She designed the game core (professions, events, choices, resources, scoring) in a spreadsheet that I have already cleaned and structured into the file `oregon_trail_game_data.json`, which lives in the project directory.

The physical part of the game is a printed paper trail board with numbered spaces. The digital part is a browser-based "wagon master" app that handles turn order, dice rolls, event/choice draws, profession-modifier lookup, resource tracking, and end-game scoring. Players physically move wagon tokens on the paper board to match what the app says.

Your job is to build both deliverables: the **game app** (one self-contained HTML file) and the **printable trail board** (a separate self-contained HTML file designed for printing to PDF on Letter-size paper).

---

## Hard constraints (these are non-negotiable)

1. **One self-contained HTML file** for the game (`pink_oregon_trail.html`). All CSS, JavaScript, and game data inlined. No external scripts, no CDN imports, no font imports, no analytics, no service workers calling out, no fetch calls, no WebSockets, no `localStorage` to remote services. Everything must work when the file is double-clicked from a USB drive on a school Chromebook with no internet connection.

2. **One self-contained HTML file** for the printable board (`trail_board.html`). Same rules. Designed to print to PDF or paper directly from the browser using the system print dialog.

3. **Zero "AI" branding or vocabulary in the code, comments, filenames, or UI.** The game must not look like an AI tool to a school content filter. Call it "the game," "the app," "the wagon master," "the narrator." Do not use words like "AI," "GPT," "Claude," "LLM," "model," "agent," or "chatbot" anywhere in user-facing text or code comments. (You can use the word "Claude" in your developer-facing changelog if needed, but not in any shipped file.)

4. **Game data lives in `oregon_trail_game_data.json`.** Do not invent new professions, events, or choices. Embed the full contents of that JSON file as a JavaScript constant inside the HTML file at build time (read the JSON file, paste its contents into the HTML inside a `<script>` tag as `const GAME_DATA = {...}`).

5. **Browser support: modern Chromium-based browsers (Chrome, Edge, school Chromebooks).** No need to support IE or very old Safari. ES2020+ JavaScript is fine. No frameworks (no React, no Vue, no Svelte). Plain HTML/CSS/JS only — Gabby and I want to be able to read and modify it.

6. **Single shared screen design.** This is a hot-seat game played on one computer, possibly projected. UI elements should be large enough to read from across a classroom table. Minimum 18px body text. Buttons minimum 48px tall.

7. **Offline-first and silent-failure-safe.** No console errors. No network requests. If anything is missing, fail gracefully with a friendly message.

---

## Game design specification

### Setup phase

When the page loads, show a setup screen:

1. **Choose game mode:** Single Player / Cooperative / Competitive (radio buttons or three big cards).
2. **Number of wagons:** 1 (forced for Single and Cooperative) or 2-4 (for Competitive).
3. **For each wagon, name 1-5 family members.** Five name input fields per wagon, blank fields are ignored. At least one name required per wagon.
4. **Each wagon picks one profession** from the 23 in the data file. Show all profession names with their two skills as a tooltip or expandable description. (In Cooperative mode there is one shared wagon with one profession.)
5. **Start Game** button.

### Resources

Each wagon starts with the resource values defined in `oregon_trail_game_data.json` under `resources`:

- Food: 10 (max 20)
- Water: 8 (max 20)
- Supplies: 6 (max 15)
- Money: 5 (max 20)
- Health: 10 (max 10)
- Morale: 5 (max 10)
- Movement: 1 (max 3) — used as the per-turn movement value, see below

Resources clamp to their min/max. Special rules from the resource notes apply:

- **If Food = 0:** lose 1 Health each turn.
- **If Water = 0:** lose 1 Health immediately and each turn until restored.
- **If Health = 0:** lose 1 family member, restore Health to 5. If wagon has 0 family members, that wagon is **eliminated**.
- **Low Morale (≤ 2):** events have a 25% increased chance of bad outcomes (use this as a flat probability bump on negative outcomes).

Display all resources as a persistent sidebar or top bar with labels and current values. Use simple icons (CSS shapes or SVG paths only, no emoji and no external icon fonts).

### Trail and movement

- The trail is **25 spaces** long, numbered 1 (start: Independence, Missouri) to 25 (finish: Oregon City).
- Each wagon starts on space 1.
- On each wagon's turn, the app **rolls 1d4** (random 1-4) for movement, then adds/subtracts the wagon's current Movement modifier (default 0; can be modified by events). Minimum move of 1 unless an event explicitly says "stay in place" or moves the wagon backward.
- The app shows the dice roll result with a brief animation (CSS only — a 0.5s flip or shuffle), then shows the new space number.
- **Players physically move their wagon token on the paper board to match.** The app should display "Move your wagon to space N" prominently.

### Space resolution

When a wagon arrives on a new space, the app rolls to determine what happens:

- 50% chance: an **Event** is drawn from the 36 events in the data file.
- 35% chance: a **Choice** is drawn from the 15 choices.
- 15% chance: nothing happens this turn ("A quiet day on the trail.").

(These probabilities are tunable constants near the top of the JS — define them as `EVENT_CHANCE = 0.50` and `CHOICE_CHANCE = 0.35` so Gabby can tune them later.)

The same event/choice should not repeat within the same wagon's game until all have been drawn (use a per-wagon shuffled deck that reshuffles when exhausted).

### Event resolution

When an event is drawn:

1. Display the event name as a heading and the flavor text in large italic body text ("Cholera killed thousands along rivers").
2. Look at the wagon's profession. If any modifier in the event matches that profession, apply the modifier's effect *instead of* the default outcomes.
3. If no modifier matches, apply both outcomes (or the single outcome if only one is listed).
4. Parse the outcome string for resource and movement effects using the parser described below.
5. Show a "Continue" button. Clicking it advances to the next wagon's turn.

### Choice resolution

When a choice is drawn:

1. Display the scenario text in large italic.
2. Show two big buttons: Option A label and Option B label.
3. **In Cooperative mode**, show a "Vote" prompt — players raise hands and one person clicks the winning option. (The app does not need to count votes; it just waits for any click. Show a small note: "Talk it over — then click the winning option.")
4. **In Competitive and Single Player modes**, the wagon owner clicks directly.
5. After click, look up profession modifiers (same logic as events). Apply outcome.
6. Show outcome description and Continue button.

### Outcome parser

Outcome strings from the data are written in natural language by an 11-year-old. Build a parser that handles these patterns (case-insensitive):

| Pattern | Effect |
|---|---|
| `Lose N <resource>` / `Lose <resource> by N` | Subtract N from that resource (default N=1) |
| `Gain N <resource>` | Add N to that resource (default N=1) |
| `Lose N member(s)` / `Lose 1 member` | Remove N family members |
| `50% lose N <resource>` / `40% lose ...` / `25%...` / `30%...` | Roll percentage; apply if hit |
| `Move +N` / `Move forward N space(s)` | Advance N additional spaces |
| `Move back N space(s)` / `Delay,move back N` | Move back N spaces (min space 1) |
| `Stay in the same place` / `No change` | No movement |
| `Delay` (no number) | Skip next turn |
| `Heal` / `Gain resources` | Restore Health to max / +2 to Food and Supplies |
| `Morale loss` / `Gain morale` | -1 / +1 Morale |
| `Skip delay` / `No delay` | Cancel a pending delay |
| `Exchange resources` | Player chooses: trade 2 of any resource for 3 of another |
| `Lose health each turn` / `Lose health` | Mark wagon "starving" (-1 Health/turn) or -1 immediately |
| `Lose random resource(s)` | Pick random resource, lose 1-2 |

If the parser cannot interpret a line, **fall back gracefully**: log it to the in-app developer console (a hidden div, toggleable with `?dev=1` in the URL) and show the raw outcome text to the player without applying any mechanical effect. Do not crash. Do not show any error to the player.

The same parser handles modifier `effect` strings — many start with phrases like "no death," "prevents," "reduces," or "doubles gain," which should be applied as overrides to the default outcomes:

- `no <bad thing>` / `prevent(s)` / `cancel(s)` → skip the corresponding bad outcome
- `reduces` → halve the negative effect (round down)
- `doubles` → double the positive effect
- `extra +N` → add N more of the gained resource
- A profession-driven modifier with no parseable verb just shows its text to the player as flavor ("The Guide knows safer paths") and applies no extra mechanical change.

### Turn order

- **Single Player:** the one wagon takes every turn.
- **Cooperative:** the one shared wagon takes every turn; players take turns at the keyboard but it is the same wagon.
- **Competitive:** wagons take turns in order. Show "Wagon 2's turn (the Smiths)" prominently before each turn so players know who's up.

### Win and end conditions

- A wagon **wins** by reaching space 25.
- A wagon is **eliminated** if it loses all family members.
- In **Competitive**, when the first wagon reaches space 25, every other wagon gets one final turn, then the game ends.
- In **Cooperative** and **Single Player**, the game ends when the wagon reaches space 25 OR is eliminated.

### Scoring

At end of game, calculate score per wagon using the rules in `scoring`:

- Finish game: 10 points (only if reached space 25)
- Each Health remaining: 1 point
- Each Supply remaining: 2 points
- Each family member remaining: 3 points
- Each Money remaining: 4 points
- Best Survivor Story: 5 points (manual — see below)

### End-of-game story screen

After the game, show a **Trail Journal** for each wagon. The journal is auto-generated from a log the app keeps as the game plays. The log records each significant moment:

- "Day 1: Set out from Independence, Missouri with the Kasdaglis family (Mom, Dad, Gabby, Luca, Baby Sara)."
- "Day 4: Cholera struck the camp — but Dr. Mom's medicine kept everyone alive."
- "Day 7: Crossed the wide river. Lost 2 supplies in the rapids."
- "Day 12: Reached Fort Laramie. Resupplied and rested."
- "Day 18: Reached Oregon City! 4 of 5 family members survived."

The journal should be plain text, friendly and readable, written in a simple historical voice. Each entry references the wagon name, the family members, the profession, and the actual outcomes that happened.

**Single Player mode:** show a single Trail Journal with a "Print this Journal" button (uses `window.print()` with a print stylesheet). No story voting.

**Cooperative mode:** show the one shared journal with the Print button.

**Competitive mode:** show all wagons' journals side by side. Add a "Vote for Best Survivor Story" prompt — players vote out loud, one person clicks the winning wagon, and that wagon gets +5 points. Then show the final scoreboard.

---

## Visual design

- **Color palette:** Gabby asked for pink. Use a warm dusty-pink/cream color scheme that still feels period-appropriate. Suggested base: cream background `#FBF6F0`, deep rose accents `#B85770`, warm brown text `#3D2817`, soft pink highlights `#F4D3DA`. No neon, no harsh contrast.
- **Typography:** Use system fonts only — `Georgia, "Times New Roman", serif` for narration/flavor text (gives a period feel), `system-ui, -apple-system, sans-serif` for buttons and UI chrome. No web font imports.
- **Layout:** Top bar with wagon name + resources. Center stage for narration and choices. Bottom bar for "Roll dice" / "Continue" / "Next turn" actions.
- **Animations:** Subtle CSS transitions only. Dice roll = 0.5s. Resource changes = number rolls up/down over 0.4s. Card draws = slide-in from side over 0.3s. Respect `prefers-reduced-motion`.
- **No sound by default** — school setting. Optional small "🔊 Mute" toggle in the corner that defaults to muted; if unmuted, plays only short subtle chime sounds generated via the Web Audio API (no audio files).

---

## Printable trail board (`trail_board.html`)

A separate self-contained HTML file that prints cleanly to PDF or paper:

- Letter-size page (8.5" × 11"), portrait orientation.
- The trail winds across the page in an S-curve or snaking path so all 25 spaces fit on one page.
- Each space is a circle (~0.7" diameter) with the space number large and centered.
- Space 1 is labeled "Independence, MO — Start." Space 25 is labeled "Oregon City — Finish."
- Add a few thematic intermediate landmarks at logical spaces: "Fort Kearney" (~5), "Chimney Rock" (~10), "Fort Laramie" (~13), "South Pass" (~17), "Fort Hall" (~20), "The Dalles" (~23).
- Decorative trail line connecting all spaces, drawn in a brown ink color.
- Title at top: "Pink Oregon Trail" with subtitle "by Gabby Kasdaglis."
- Plenty of negative space for Gabby and her dad to draw decorations after printing (mountains, rivers, wagons, etc.).
- Print stylesheet: hide everything but the board when `@media print`. Set page margins to 0.4".
- Include a small instruction line at the bottom: "Move your wagon token to the space the app tells you. Have fun!"

---

## File layout the build should produce

```
project/
├── pink_oregon_trail.html      ← the game
├── trail_board.html             ← the printable board
├── oregon_trail_game_data.json  ← the data (already provided)
└── README.md                    ← brief setup + how to play
```

The README should explain:

1. How to open the game (just double-click `pink_oregon_trail.html`).
2. How to print the board (open `trail_board.html` in a browser, press Ctrl+P, save as PDF or print directly).
3. Quick rules summary (3 modes, 25 spaces, families, dice, scoring).
4. How Gabby can edit the game data: the JSON section near the top of `pink_oregon_trail.html` between the markers `// ===== GAME DATA START =====` and `// ===== GAME DATA END =====`. She can change resource starting values, add events, fix typos, etc.

---

## Acceptance criteria — how I will test this

I will know the build is correct when:

1. ✅ I can double-click `pink_oregon_trail.html` with no internet connection and the game starts.
2. ✅ Browser DevTools Network tab shows **zero** outgoing requests when playing a full game.
3. ✅ I can play a full Single Player game from start to finish in under 5 minutes (testing pace).
4. ✅ I can play a Competitive game with 2 wagons that reaches a winner.
5. ✅ I can play a Cooperative game where the choice prompt clearly says "Talk it over."
6. ✅ Naming a wagon with only 2 family members works (3 fields blank).
7. ✅ When my wagon has a Doctor and draws "Cholera Outbreak," the modifier triggers and no member dies.
8. ✅ When Health hits 0, a member is lost and Health restores to 5.
9. ✅ When the last member dies, the wagon is eliminated and the game continues for other wagons (or ends in solo).
10. ✅ The Trail Journal at the end reads like a real story, with my family members' names in it.
11. ✅ Opening `trail_board.html` and pressing Ctrl+P shows a clean one-page board with 25 numbered spaces.
12. ✅ No word "AI" or "Claude" or similar appears anywhere in the user-facing UI or HTML/CSS/JS files. (You can grep for it.)
13. ✅ Code is readable enough that an 11-year-old with help from her dad can understand the game data section and tweak event probabilities.

---

## Stretch goals (only if everything above works perfectly)

- Save game state to `localStorage` so a long competitive game can resume after closing the browser.
- A "Replay last event" button in case players miss the narration.
- A small "Trail map" thumbnail in the corner showing wagon position(s).
- A "Game stats" appendix on the end screen: total events drawn, total dice rolled, biggest single resource swing.

---

## Style and approach notes for you, Claude Code

- Write the JavaScript in a clear procedural / lightly-modular style. No classes unless they really earn their keep. State should live in one well-commented `gameState` object.
- Comment generously near the parser and modifier-application code — those are the trickiest parts.
- Build the game first, then the printable board, then the README. Test the game by reading the code path for one full turn before declaring it done.
- After build, run a search across all output files for the literal strings "AI", "Claude", "GPT", "LLM", "model", "agent" and confirm none appear in user-facing strings or code comments. Replace any incidental hits.
- When you're done, give me a one-paragraph summary of what was built, what's in each file, and one or two spots where Gabby and I might want to tune game balance.

Build it. Have fun with it — Gabby designed something good.
