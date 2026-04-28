# Calibration Audit — v3.5 Stage 1

*Read-only inventory of every rule, probability, and number that drives Pink Oregon Trail. No changes proposed yet — this is what the game actually does today.*

> **git work pending: no commits this stage.**

---

## Headline finding before anything else

**The live game does not load any external file.** No `<script src=>`, no `fetch(...)`, no `XMLHttpRequest`. The game's "JSON config" is an inline literal — `const GAME_DATA = {...}` starting around `pink_oregon_trail.html:2349`. Editing that inline literal is the only way to affect the running game.

There is a separate file `oregon_trail_game_data.json` at the project root (419 KB), but it is a **stale mirror of an earlier version (v2.2)** — the game does not read it. Per the in-file comment at line 2349: *"Full contents of oregon_trail_game_data.json (v2.2). Edit any value here to retune the game."*

**Implication for the v3.5 directive's "update the JSON, not the JS" rule:**
"The JSON" = the inline `GAME_DATA` literal inside `pink_oregon_trail.html`. There is no separate runtime config file to edit. This means JSON edits ARE HTML edits — they happen in the same file as the JS. The intent of the rule still holds (touch values, not logic), but the user-facing distinction between "JSON" and "JS" reduces to "stay inside the `GAME_DATA` braces vs venture into the surrounding script body."

There is also a related concern: several calibration constants live as hardcoded JS objects OUTSIDE the `GAME_DATA` literal (V32_STARTING, V32_PRICES, V32_DAILY, V33_CFG `_baseMult` / `_extDisc` / `MORT_MULT`, daily money depletion rates). Per the v3.5 directive, **the right move is to migrate these into the `GAME_DATA` literal** with the live JS reading them through, not to edit them in place. That migration becomes a Stage 4 decision.

---

## 1. File map

### Files the running game touches at runtime
- `pink_oregon_trail.html` — single self-contained ~6.4 MB file. Inline `<style>`, inline `<script>`, inline `GAME_DATA`, inline `HISTORICAL_PHOTOS_OVERRIDE` script block. The browser loads this and nothing else.

### Files in the repo NOT loaded by the game (mirrors / build artifacts / docs)
- `oregon_trail_game_data.json` (419 KB, v2.2 mirror, **stale, unloaded**)
- `pink_oregon_trail_v3_3_spec.json` (58 KB — v3.3 spec doc, not loaded)
- `pink_oregon_trail_rules.html` / `pink_oregon_trail_teacher_edition.html` — student/teacher-facing prints, not loaded by the game
- `historical_photos_override_block.html` (633 KB) and `historical_photos_override_v3_2.html` — pre-baked photo blocks, content already inlined into the live HTML
- `build_v31_board.js` / `build_v33_board.js` / `build_v33_physical_board.js` — Node build scripts that emit board tile HTMLs; not loaded at runtime
- `landing_page.html` (28 KB) — pre-game landing, not loaded by the game itself
- `.sim_v33_calibration.js` — Node calibration harness (extracts inline GAME_DATA + sim modules via regex, runs Monte Carlo)
- `docs/play.html` — production mirror of `pink_oregon_trail.html` (deployed via GitHub Pages)
- `docs/board_v33_master_svg.js` + `docs/board_v33_poster_short_36x24.html` + `docs/board_v33_poster_extended_36x24.html` — the print posters
- `docs/make_your_own_map.html`, `docs/rules.html`, `docs/teacher_edition.html`, PDFs — student-facing artifacts
- Many `board_*tile_*.html` files at root and in `docs/` — printable physical-board tiles

### Files containing tunable numbers
- **Authoritative:** `pink_oregon_trail.html` (inline `GAME_DATA` and the surrounding JS constants V32_STARTING / V32_PRICES / V32_DAILY / V33_CFG multipliers).
- **Mirrored / stale:** `oregon_trail_game_data.json`. Editing this file does not affect the live game.

---

## 2. Resource table

From `GAME_DATA.resources` (~line 4724):

| Resource  | Default start | Min | Max | Unit   |
|-----------|---------------|-----|-----|--------|
| Food      | 10            | 0   | 999 | lbs    |
| Water     | 8             | 0   | 99  | gal    |
| Supplies  | 6             | 0   | 20  | units  |
| Hides     | 0             | 0   | 99  | skins  |
| Medicine  | 1             | 0   | 10  | doses  |
| Money     | 30            | 0   | 999 | $      |
| Health    | 10            | 0   | 10  | abstract|
| Morale    | 5             | 0   | 10  | abstract|
| Movement  | 1             | 0   | 3   | spaces |

Difficulty preset overrides (in `GAME_DATA.difficulty_settings.presets[*].modifiers`, ~line 7261-7313):

| Resource    | Easy | Medium | Hard |
|-------------|------|--------|------|
| money       | 160  | 130    | 110  |
| food (lbs)  | 220  | 160    | 120  |
| water (gal) | 30   | 22     | 16   |
| supplies    | 8    | 5      | 3    |
| medicine    | 3    | 1      | 0    |

**Profession starting bonuses** applied in `newWagonState` (HARDCODED in JS at ~line 11026-11029):
- Banker → +12 money
- Doctor → +1 medicine
- Hunter → +25 food
- Cook → +15 food

**Daily consumption** (HARDCODED in JS in `V32_DAILY` at line 18782): `{ food_lbs: 2.0, water_gal: 0.5 }` per living member per day. Cook reduces food by 22%.

**Daily money depletion** (HARDCODED in JS at line 18878): `{ easy: 0.06, medium: 0.10, hard: 0.15 }` per living member per day.

**Gain sources by resource:**
- Food — Hunt action (+22-25 lbs), Forage (+5-10), passive Hunter/Trapper/Farmer income (~7/3/2 lbs/day average), buy at fort, certain events
- Water — river crossings refill barrels to max free, Forage, buy at fort, Soda/Hot Springs water-rich landmarks
- Supplies — buy at fort, certain events
- Medicine — buy at fort, Doctor +1 starting
- Money — sell hides ($3 each), sell excess food/water/supplies, Hire On day labor at fort (2-3 + Carpenter +1), passive profession income, events
- Morale — Rest, Send Letter Home (+2 for 3 turns), positive events, Independence Rock on-time bonus
- Health — Rest, Filling rations, certain events

**Loss sources by resource:**
- Food — daily consumption, food_spoil shock, prairie_fire, hailstorm, intervention day-cost
- Water — daily consumption, water_spill shock, sunstroke (no-protection), intervention day-cost
- Supplies — daily wear (~1 every 4 turns), supplies_lost shock, river crossings, repair-without-money path
- Medicine — sickness shock auto-consume (legacy), medicine modal player choice, intervention choice
- Money — fort prices, ferries, daily depletion, bandit_demand shock, theft shock
- Wagon HP — wagon_damage shock, broken_axle, hailstorm, prairie_fire, push-on-tax thresholds, river-crossing failure with piano cargo

---

## 3. Event / shock table

### V32 baseline shocks (HARDCODED in JS — `const V32_SHOCKS` at line 18784)

| Shock            | p     | Magnitude | Notes                            |
|------------------|-------|-----------|----------------------------------|
| food_spoil       | 0.16  | 25-50 lbs | Cook ×0.55                       |
| water_spill      | 0.16  | 5-14 gal  | —                                |
| supplies_lost    | 0.10  | 1-3       | —                                |
| wagon_damage     | 0.18  | 15-35 hp  | Blacksmith ×0.65                 |
| broken_axle      | 0.04  | 50-75 hp  | Carpenter free repair, else $18  |
| sickness_minor   | 0.12  | —         | Now transitions a member to sick |
| sickness_severe  | 0.06  | —         | Now transitions worst member to dying |
| bandit_demand    | 0.06  | $8-22     | Take 2 supplies if can't pay     |
| cholera          | 0.025 | —         | Doctor halves chance; victims to dying |
| lost_trail       | 0.05  | —         | Guide/Scout/Surveyor full negate |
| theft            | 0.03  | $4-12     | —                                |

### V33 expanded calamities (in `GAME_DATA.calamities_v3_3.shocks` ~line 9633, also referenced as `V32_SHOCKS` v33 entries at line ~18814)

| Shock                | p      | Effect                                           | Protections                |
|----------------------|--------|--------------------------------------------------|----------------------------|
| lightning_strike     | 0.020  | 25% fatal, 75% injured (named victim)            | Scout                      |
| saleratus_poisoning  | 0.030  | 1 weakened on forage                             | Cook, Doctor (full)        |
| hailstorm            | 0.040  | wagon -8 to -12, food -8                         | Carpenter (×0.5)           |
| snake_bite           | 0.025  | 1 sick                                           | Doctor, Native Guide (full)|
| sunstroke            | 0.040  | 1 weakened (water<10 only)                       | Scout, water>=10 (full)    |
| gun_accident         | 0.020  | 1 injured                                        | Hunter, Cowboy, Trapper    |
| alkaline_water       | 0.040  | 1 ox dead → -1 movement perm                     | Native Guide, Scout        |
| prairie_fire         | 0.025  | food -15, wagon -20 if plains                    | Cowboy                     |
| buffalo_stampede     | 0.020  | wagon -25, possibly 1 injured                    | Hunter, Cowboy             |
| tornado              | 0.010  | wagon -35 to -50, 1 injured                      | (none, escape_p 0.10)      |
| quicksand            | 0.015  | force-stop 1 day, supplies -2                    | Scout                      |
| lost_child           | 0.015  | force-stop 1 day, 80% found                      | Native Guide, Scout        |
| ferry_rope_snap      | 0.010  | ferry-only, possibly 1 drowns                    | Carpenter                  |
| powder_keg_explosion | 0.005  | wagon -30, 1 dying                               | (none)                     |
| tooth_abscess        | 0.040  | 1 weakened, recoverable                          | Doctor                     |

### Shock pick logic (HARDCODED in JS at `v32ApplyShock`, line 18568)
- Each shock independently rolls. Up to many trigger per day.
- Guide presence subtracts 0.15 from a "skip-all-shocks" roll; Scout subtracts 0.05.
- **Biological priority pick**: cholera > sickness_severe > sickness_minor (added in r10) — if any rolls true, that one fires regardless of others.
- Otherwise picks one at random from the triggered list.
- Multiplied by `SHOCK_MULT = _baseMult * (extDisc | 1.55_short)` at fire-time (HARDCODED in JS at line 20753).

### Other event systems
- `GAME_DATA.events` — ~330-entry legacy event deck. Status: **largely supplanted by v3.3 shock + fortune system**. Still referenced by some choice cards but not the dominant per-day driver.
- `GAME_DATA.surprise_events` / `fortunes_v3_3` — ~40 fortune events firing 1 per ~2.5 turns Short / 1 per ~2 turns Extended.
- Push-on tax thresholds at consec_push_on = 4 / 10 / 15 / 20 with effects: oxen refuse, food rots, hunger crisis, collapse.

---

## 4. Choice table

Choices are scattered across several config sections rather than a single `choices` array:

- **Action menu** (Push On, Hunt, Rest, Forage) — `GAME_DATA.turn_actions`. Each has narrative variants and resource deltas defined in JSON.
- **Fort menu** (Buy / Sell / Hire / Repair / Rest / News / Letter / Doctor / Move) — `GAME_DATA.fort_options` for narrative; pricing in `V32_PRICES` (HARDCODED in JS).
- **River crossing** (Ford / Caulk / Ferry / Native Guide) — `GAME_DATA.river_options`. Outcomes computed in JS (`resolveRiver`).
- **Pre-death intervention** (5-6 choices: race_to_fort, use_fort_doctor, stop_and_tend, pray_and_continue, use_revival_charge, continue_full_pace) — `GAME_DATA.warning_escalation_system.pre_death_intervention`. Tunable recovery probabilities.
- **Sickness medicine modal** (Use dose / Save / Pick another) — built in JS in `showSickMemberMedicineChoice` (~line 11487). Logic hardcoded; survival % display reads `STATES[*].death_chance_per_turn` from JSON.
- **Alternate routes** — `GAME_DATA.alternate_routes_v3_3.routes` (Sublette Cutoff, Barlow Road, Whitman bypass; Hastings/California ending was removed in r8). Tunable outcome probabilities.
- **Bandit ambush quiz** — `GAME_DATA.bandit_ambush`. Question count tunable per difficulty (3 / 5 / 7).

Approximate choice count across all systems: ~100 distinct choice cards.

---

## 5. Profession effect table

23 professions listed in `GAME_DATA.professions` (~line 2718).

### Professions wired in JS (have actual gameplay effect)
| Profession      | Where checked            | Effect                                                       |
|-----------------|--------------------------|--------------------------------------------------------------|
| Doctor          | activeProtectorMember + v32AnyAlive | +1 medicine starting, halves cholera chance, +0.15 to interventions, full snake-bite save |
| Hunter          | both                     | +25 food starting, ~32% daily +22 lbs passive, full bandit-quiz save in some quotes |
| Carpenter       | both                     | Free wagon repair at fort, full broken-axle save, ferry rope-snap protection |
| Cook            | v32AnyAlive              | +15 food starting, food_spoil ×0.55 mitigation, saleratus_poisoning full save |
| Scout           | both                     | -0.05 daily-shock skip, full sunstroke (water>=10) save, lost_trail save, lost_child mitigation, alkaline_water save |
| Trapper         | activeProtectorMember    | ~28% daily +12 lbs passive, gun_accident protection         |
| Merchant        | both                     | Buy -15% / sell +40%, ferry $5 instead of $8                 |
| Cowboy          | activeProtectorMember    | Prairie fire, buffalo stampede, gun accident protection      |
| Priest          | activeProtectorMember    | +0.20 to pray_and_continue intervention                      |
| Politician      | activeProtectorMember    | Bandit ambush narrative                                      |
| Influencer      | activeProtectorMember    | Bandit ambush narrative                                      |
| Language Teacher| activeProtectorMember    | Free Native Guide river crossing                             |
| Native Guide    | v32AnyAlive              | Snake-bite full save, alkaline_water, lost_child mitigation  |
| Banker          | (newWagonState only)     | +12 money starting                                           |
| Blacksmith      | v32AnyAlive              | wagon_damage ×0.65 mitigation                                |
| Farmer          | v32AnyAlive              | ~20% daily +10 lbs passive                                   |
| Surveyor        | v32AnyAlive              | lost_trail save                                              |
| Guide           | v32AnyAlive              | -0.15 daily-shock skip, lost_trail save                      |

### Wiring gaps (listed in GAME_DATA.professions but no JS code path)
- **Seamstress** — narrative-only
- **Musician** — narrative-only (this is the M of the calibration MA team!)
- **Artist** — narrative-only (this is the A of MA)
- **Fashion Designer** — narrative-only
- **Magician** — narrative-only
- **Actor** — narrative-only
- **Food Critic** — narrative-only

These 7 professions can be picked at team setup but **never** affect simulation outcomes. This is the structural reason the calibration MA reference team (Musician + Artist) underperforms — those two professions contribute zero protection. The Stage 1 audit flags this; whether to wire them as soft-effect professions is a Stage 4 design call.

---

## 6. Difficulty modifier table

From `GAME_DATA.difficulty_settings.presets`:

| Modifier                                  | Easy   | Medium | Hard   |
|-------------------------------------------|--------|--------|--------|
| starting_money                            | 160    | 130    | 110    |
| starting_food                             | 220    | 160    | 120    |
| starting_water                            | 30     | 22     | 16     |
| starting_supplies                         | 8      | 5      | 3      |
| starting_medicine                         | 3      | 1      | 0      |
| state_transition_probability_multiplier   | 0.65   | 1.00   | 1.35   |
| doctor_recovery_bonus                     | +0.20  | 0      | -0.10  |
| bandit_quiz_question_count                | 3      | 5      | 7      |
| luck_floor                                | -2     | -5     | -7     |
| luck_ceiling                              | +6     | +5     | +4     |
| revival_charges                           | 1      | 0      | 0      |
| first_member_lost_grace_period_turns      | 1      | 0      | 0      |

Difficulty multipliers HARDCODED in JS at `v33SimulateJourney` (line ~20751):

| JS constant        | Easy  | Medium | Hard  | Use                                          |
|--------------------|-------|--------|-------|----------------------------------------------|
| _baseMult          | 0.80  | 1.30   | 1.85  | shock probability base                       |
| _extDisc           | 0.68  | 0.95   | 0.70  | extended-trail discount                      |
| MORT_MULT          | 0.72  | 1.00   | 1.65  | mortality multiplier on death rolls          |
| _moneyRatePerMember| 0.06  | 0.10   | 0.15  | $ depletion / member / day                  |
| SHORT_BONUS        | 1.55  | 1.55   | 1.55  | short-trail shock multiplier                 |

`SHOCK_MULT = (length === 'extended') ? _baseMult * _extDisc : _baseMult * 1.55`

---

## 7. Trail data

| Trail    | Stops | Start          | Finish      | Type breakdown                                |
|----------|-------|----------------|-------------|-----------------------------------------------|
| Short    | 25    | Independence MO| Oregon City | start 1, fort 4, river 4, landmark 8, travel 7, finish 1 |
| Extended | 50    | Independence MO| Oregon City | start 1, fort 6, river 7, landmark 13, travel 22, finish 1 |

Trail name list in `GAME_DATA.trails.short` / `GAME_DATA.trails.extended`. These are content-only; not tunable.

---

## 8. Member-state machine

From `GAME_DATA.member_states_v2_3.states`:

| State    | death_chance_per_turn | Food mult | Water mult | Movement | Profession active |
|----------|-----------------------|-----------|------------|----------|-------------------|
| healthy  | 0                     | 1.0       | 1.0        | 0        | Yes (1.0×)        |
| weakened | 0                     | 1.0       | 1.0        | 0        | Yes (0.8×)        |
| sick     | 0.08                  | 0.7       | 2.0        | -1       | No                |
| injured  | 0.04                  | 1.0       | 1.0        | -1       | No                |
| dying    | 0.30                  | 0.5       | 1.5        | -2       | No                |
| lost     | —                     | —         | —          | —        | —                 |

Pre-death intervention (`GAME_DATA.warning_escalation_system.pre_death_intervention.choices`):

| Choice                | recovery_probability                                                | Cost                |
|-----------------------|---------------------------------------------------------------------|---------------------|
| race_to_fort          | 0.50 base                                                           | +1 day, fort ≤ 3 away |
| use_fort_doctor       | 0.65 base + 0.20 if Doctor on team                                  | $9 (was $5)         |
| stop_and_tend         | 0.45 base, 0.75 with Doctor                                         | +2 days, food/water |
| pray_and_continue     | 0.20 without Priest, 0.40 with Priest, +0.20 from doctor_recovery_bonus on Easy | none |
| continue_full_pace    | 0.10 base                                                           | none                |
| use_revival_charge    | 1.00                                                                | Easy only, 1 charge |

Plus a v3.4.1 r5 stochastic addition: piano in cargo gives a 20% revive on otherwise-failed intervention (`v33ApplyCargoEvent('dying_member_save')`).

---

## 9. Hardcoded calibration constants in JS (Stage 4 migration candidates)

| Constant            | Location | Current value                                           |
|---------------------|----------|---------------------------------------------------------|
| V32_STARTING        | line 18757 | per-difficulty money/food/water/supplies/medicine/wagon_hp (duplicate of GAME_DATA.difficulty_settings starting_*) |
| V32_PRICES          | line 18767 | food $0.22/lb, water $0.18/gal, medicine $6, supplies $2.40, repair $8/$18, ferry $11, guide $7, doctor $9, letter $2, hide_sale $3, food_sale $0.05 |
| V32_DAILY           | line 18782 | { food_lbs: 2.0, water_gal: 0.5 }                       |
| V32_SHOCKS          | line 18784 | per-shock probabilities + magnitudes (25 entries; partially mirrors `calamities_v3_3.shocks` JSON) |
| _baseMult           | line 20751 | { easy: 0.80, medium: 1.30, hard: 1.85 }                |
| _extDisc            | line 20752 | { easy: 0.68, medium: 0.95, hard: 0.70 }                |
| SHORT_BONUS         | line 20753 | 1.55                                                    |
| MORT_MULT           | line 20755 | { easy: 0.72, medium: 1.00, hard: 1.65 }                |
| _moneyRatePerMember | line 18878 | { easy: 0.06, medium: 0.10, hard: 0.15 }                |
| Profession bonuses (newWagonState) | line 11026 | Banker +12, Doctor +1 medicine, Hunter +25 food, Cook +15 food |
| Hire payout         | line 17128 | 2 + rand(2) + 1 (Carpenter), so 2-3 base / 3-4 with Carpenter |
| Trail news cost     | line 17050 | $3 (literal)                                            |
| Letter cost         | line 17070 | $2 (literal)                                            |
| Wagon repair cost   | line 16863 | $8 / 2 supplies + 1 day (literals)                       |
| Sickness intervention modal survival display | line 11487 | reads STATES death_chance_per_turn (JSON-sourced ✓) |

---

## 10. Tunability map

**Column A — Tunable in `GAME_DATA` JSON literal today (no code change required):**
- All resource starts / mins / maxes
- All difficulty preset modifiers (starting_money / food / water / supplies / medicine; state_transition multiplier; doctor_recovery_bonus; bandit_quiz_question_count; luck floor / ceiling; revival_charges)
- All `calamities_v3_3.shocks` probabilities, magnitudes, narratives, protections (note: in some shocks the probability in JSON does NOT match V32_SHOCKS in JS — JS wins at runtime)
- `surprise_events` / `fortunes_v3_3` weights and content
- `historical_facts` content (not calibration but tunable)
- `pace_options` and `ration_options` consumption multipliers and morale/health deltas
- `warning_escalation_system.pre_death_intervention.choices` recovery probabilities and cost effects
- `bandit_ambush` quiz config
- `dyk_quotas` (minimum and target counts per trail length)
- `residual_probabilities` (e.g., doctor_cholera_save 0.87, hunter_feeds_team 0.85)
- `push_on_tax.thresholds` (4/10/15/20 trigger points)
- `bypass_penalties.fort_bypass / river_bypass / landmark_bypass` boosts and durations
- `personality_biases.traits` ranges and effect descriptions (effects partially wired)
- `scoring_v3_3.tracks` formulas (max_score per track, narrative bands)
- `loadout_v3_3` wagon/animal/cargo costs and effects
- `alternate_routes_v3_3.routes` outcome probabilities and narrative
- `cyoa_connections_v3_3` (echo, intel, team-state, time-cascade, what-if rules)

**Column B — Hardcoded in JS today (Stage 4 migration candidates if calibration needs them):**
- V32_STARTING — duplicates difficulty preset starting_* values; live `newWagonState` reads from JSON, but the simulator (`v32StartingWagon`, line 18854) reads from V32_STARTING. **The live game and the simulator can drift out of sync silently.** This caused the round-16 starvation bug.
- V32_PRICES — single source for both live game (Buy menu, ferry, repair) and simulator. Live game's `mkOpt` button hints contain literal price strings ("$8", "$3") that must be hand-edited in lockstep.
- V32_DAILY — single source for daily food/water consumption.
- V32_SHOCKS — partially overlaps `calamities_v3_3.shocks` JSON. Simulator reads V32_SHOCKS only.
- `_baseMult` / `_extDisc` / `MORT_MULT` / `SHORT_BONUS` — purely simulator-side calibration knobs. Not surfaced in JSON anywhere.
- `_moneyRatePerMember` — daily money depletion per difficulty.
- Profession-bonus block in `newWagonState`.
- Hire payout, Trail News $3, Letter $2, repair-supplies-or-money quantity, intervention-cost literals.

**Column B is the migration target.** Per the v3.5 directive, calibration should run primarily through column A. Anything in column B that requires tuning in v3.5 should be moved into a new sub-tree of `GAME_DATA` (proposed: `GAME_DATA.calibration_v3_5`) with the JS reading through and the JSON values authoritative.

---

## 11. Unknown surface area

Things I encountered but cannot fully verify from code reading:

1. **Personality traits effect application.** `GAME_DATA.personality_biases` defines 5 traits per member (boldness, frailty, faith, steady, lucky) and `v33GenerateTraits` rolls them at character creation. `v33FrailtyMult` is referenced by `v33LoseMemberByFrailty`. But the FULL set of trait → outcome mappings (e.g., faith → intervention bonus) — only frailty appears wired. The other four traits are surfaced on the character card but their effect on dice / state transitions is uncertain.

2. **`v33TickShadows` / `v33ShadowMultFor` / `v33RegisterShadows`** at line ~20800 — the "shadow" event system. Comments mention it as item 10 (shadow effects after a triggering event), but no `event_shadows_v3_3` JSON definition was located in this audit pass.

3. **CYOA connections.** `GAME_DATA.cyoa_connections_v3_3` has five sub-mechanics (choice_echoes, intel_score, team_health_index, time_cascade, what_if). Wired in JS (`v33EchoMod`, `v33IntelScore`, etc.) but how each contributes to actual probability outcomes vs narrative is hard to verify without running the game.

4. **Loadout cargo effects in the simulator.** Live game applies cargo bonuses (china loss roll, piano save, silver theft, books Scholar bonus, seeds money bonus) via `v33ApplyCargoEvent`. The simulator (`v32StartingWagon`) does NOT model cargo at all — the calibration runs cargo-free. Live results may differ from simulator results in proportion to how many heirlooms a player picks.

5. **Soft profession effects (Musician, Artist, Influencer, etc.).** Listed in GAME_DATA but do not have hardened protection checks. There are scattered narrative refs but it is unclear whether any of these professions affects simulation outcomes at all. Per Section 5, this is the structural reason the calibration MA team underperforms.

6. **Many deferred `notes` markers in GAME_DATA** (`deferred to v3.0`, `deferred to v3.1`, `deferred to v2.7`). These describe features with partial wiring — audio overhauls, real instrument samples, audio gate mobile UX, Pioneer Voices DYK cards. Not calibration-relevant but flagged for completeness.

7. **`HISTORICAL_PHOTOS_OVERRIDE` script block at the bottom of the HTML.** Contains ~30+ base64-encoded JPEGs keyed by location id. Embeds about 2 MB of image data into the file. Read-only at runtime — affects visuals but no calibration.

8. **`docs/board_v33_master_svg.js`** — the print-poster module. Loaded by the standalone poster files in `docs/`, not by the live game. Contains its own `SHORT_TRAIL` / `EXTENDED_TRAIL` / `STATES` / `RIVERS` data with hand-tuned cosmetic lat/lon nudges. Off-limits for calibration; touch only if calibration changes the trail topology.

---

## 12. Summary for Stage 2

The simulator already exists in two forms:
- `v33SimulateJourney` inside the live HTML (used by the in-game `#calibrate3=N` URL hash)
- `.sim_v33_calibration.js` Node harness that extracts the inline modules and runs them server-side

Neither currently produces the full statistics object the v3.5 prompt requires. The Stage 2 deliverable (`docs/calibration_sim.js`) needs to:
1. Read the same `GAME_DATA` literal (extract via the same regex `.sim_v33_calibration.js` already uses, OR import it via a small adapter)
2. Add a deterministic seeded PRNG (Mulberry32)
3. Capture and aggregate the full `event_frequencies`, `death_causes`, `pct_hit_zero_money_before_mid`, `pct_ran_out_food`, member_loss_distribution histogram
4. Run from a `#calibrate=N&team=X,Y,Z&difficulty=hard&trail=short` URL hash inside the live game

Estimated complexity: a few hundred lines added. The existing simulator does most of the work; what's needed is the stats aggregator + seedable PRNG + URL-flag wiring.

---

## STOP — awaiting Stage 2 approval

This is the end of Stage 1. **No values have been changed.** No commits made.

Before proceeding to Stage 2:
- Confirm the audit's findings match your understanding of the game.
- Decide whether the v3.5 work should treat the inline `GAME_DATA` literal as "the JSON" (interpreting the directive's spirit) — or whether you want to first build a real external JSON file the live HTML loads at runtime (a bigger architectural change).
- Decide whether you want the V32_STARTING / V32_PRICES / V32_DAILY / `_baseMult` / `_extDisc` / `MORT_MULT` constants migrated to `GAME_DATA` as part of this v3.5 pass, or left in JS for now.
- Confirm or revise the v3.5 calibration targets in light of the wiring gap on Musician / Artist / 5 other professions — those professions do not currently affect outcomes, so a "weak team" reference will systematically underperform any target written for "team without survival skills."

Awaiting your call before Stage 2 begins.

> **git work pending: no commits this stage.**
