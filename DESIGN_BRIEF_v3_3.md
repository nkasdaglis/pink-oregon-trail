# Pink Oregon Trail — v3.3 Design Brief

**Designer:** Gabriella Kasdaglis (Gabby), with Nicholas Kasdaglis
**Educational consultant:** Claude (acting as FL middle-school social studies teacher)
**Status:** Design — ready for Claude Code implementation
**Supersedes:** none (additive to v3.2; no v3.2 mechanics are removed)

---

## 0. Philosophy

The current build (v3.2) is mechanically rich but pedagogically and strategically thin in three measurable ways:

1. **Strategy doesn't differentiate outcomes enough.** The v3.2 calibration ran 500 journeys with **Hunter+Doctor** (a strong team) on Medium and they finished 100% with 0% elimination. The same calibration ran **Musician+Artist** (a deliberately weak team) on Medium and they *also* finished 100% with 0% elimination. A great team and a careless team produce identical outcomes. This is the smoking gun for v3.3.
2. **Educational dose is variable, not guaranteed.** The number of "Did You Know" cards a wagon encounters varies by random event firing. There is no floor. A class period of play might give one team 5 DYK cards and another 18.
3. **Re-playability is shallow.** 16 surprise events, 11 daily shocks, 23 historical facts × 1 quiz question each. After 4–5 plays, kids have seen most of it.

v3.3 fixes all three through 14 interlocking changes — none of which require engine-level surgery. Everything in this brief lives in `oregon_trail_game_data.json`, the v32 simulation modules, and the end-of-game UI. The state machine, the dice system, the trail spaces, the audio controller, the wagon SVG — none of it changes.

**The metric we are optimizing for is not turn count.** It is **depth of learning.** Time-in-game is one input to depth. Strategic differentiation is another. Educational dose is another. Multi-turn surprise variety is another. We design for all four.

---

## 1. Scope

Sixteen changes, organized in four groups:

**Group A — Strategy loops (5 items):** make good strategy reliably win, bad strategy reliably struggle.

1. Re-weighted scoring (Steward / Provider / Scholar / Pathfinder)
2. Push-On Tax
3. Smart-Stop Logic
4. DYK exposure targets
5. Bandit quiz bank expansion

**Group B — Content and system depth (6 items):** make every game feel new and make probability honest.

6. Calamities expansion (25+ shocks)
7. Fortunes expansion (35–40 surprises)
8. Residual probabilities (3–15% on both sides)
9. Narrative variants (3 per major event)
10. Chained event probabilities (shadow effects)
11. Per-member personality vectors (5 hidden traits)

**Group C — Pedagogy and classroom (3 items):** make the learning legible to teacher, kid, and admin.

12. Superstition audit (atmospheric vs. material-help)
13. End-of-game "What You Learned" page
14. Classroom roll-up dashboard

**Group D — Map and physical board (2 items):** make the trail readable on screen and beautiful in the kids' hands.

15. Expandable map — full zoom range, pan, center-on-wagon
16. Physical tile redesign — match screen, more illustration, kid-engagement details

What is *not* in scope for v3.3: agent-based architecture redesign, save-state revisions across class periods, additional language support, Spanish translation, multi-class leaderboard. Those are v3.4+.

---

## 2. Group A — Five Strategy Loops

### 2.1 Re-weighted scoring (4 tracks)

**Problem:** current scoring (`+20/member, +10 if before Day 130, +15/fort, +5/fact, +25 quiz`) reduces the trail to a single number. Speed and survival are mathematically balanced but kids read the number as a race.

**Design:** four named tracks shown side-by-side at end-of-game.

- **Steward** — `(members_alive × avg_health × avg_morale_at_finish) × 4` — caps at ~280
- **Provider** — `final_money × 2 + (final_food + final_water + final_medicine_doses × 5)` — caps at ~150
- **Scholar** — `dyk_cards_seen × 5 + bandit_quiz_correct × 10` — caps at ~170 (24 DYK on Extended × 5 + 5 quiz × 10 = 170)
- **Pathfinder** — `max(0, 110 - days_traveled)` — caps at 80 (finish Day 30 = 80; Day 165 = 0)

Total = sum of four tracks. Display each track as a horizontal bar with its score and a single-sentence interpretation ("Steward: Your team arrived alive and well." / "Pathfinder: You arrived just before winter — barely.").

**Why these weights:** a team that finishes Day 165 with 7 alive members at full health and full pantries scores ~280 + 150 + 170 + 0 = **600**. A team that finishes Day 90 with 4 alive at low health and empty pantries scores ~120 + 30 + 100 + 20 = **270**. The slow careful team beats the fast careless team by more than 2×. That's the lesson the trail actually teaches.

**JSON shape:**
```json
"scoring_v3_3": {
  "tracks": {
    "steward":   { "formula": "...", "max": 280, "narrative_thresholds": {...} },
    "provider":  { ... },
    "scholar":   { ... },
    "pathfinder":{ ... }
  },
  "display": "side_by_side_bars"
}
```

The legacy single-number score is retained as `legacy_score` in the export for backward compatibility with seeded leaderboard.

### 2.2 Push-On Tax

**Problem:** Grueling pace for 3+ consecutive turns triggers a 30% exhaustion roll. Steady pace has no consecutive-Push-On consequence at all. Kids who never stop are not punished.

**Design:** a hidden `consec_push_on` counter on each wagon. Increments by 1 every Push On (regardless of pace). Resets to 0 on any Hunt, Rest, or Forage action. Triggers escalate:

| `consec_push_on` | Trigger | Effect |
|---|---|---|
| 4 | Oxen refuse | Forced 1-day stop. +0 movement. Narrative: "The lead ox planted his feet at dawn and would not move. We rested." |
| 6 | Crew exhaustion | Random healthy member transitions to weakened (no probability roll — guaranteed). |
| 8 | Wagon damage | `wagon_hp -= 15`. Narrative: "The wagon groans under endless miles. The rear axle cracks." Triggers a `Broken Wheel` event with -1 backwards space. |
| 10 | Major breakdown | `wagon_hp -= 30`, all members morale -2, forced 2-day stop. Almost guaranteed game-over consequence if not addressed. |

**Counter visibility:** hidden from the player (no on-screen indicator). The narrative cues do the teaching — kids should *feel* the strain through events, not stare at a meter.

**Pace interaction:** Strenuous pace adds +1 to the counter increment per Push On (so threshold 4 hits at 3 consecutive Push On at Strenuous). Grueling adds +2.

**JSON shape:** new `push_on_tax` block in `meta.simulation_system`. Triggers list with thresholds, effects, narratives.

### 2.3 Smart-Stop Logic

**Problem:** there is no mechanical incentive to stop at a fort or river crossing if the player is in a hurry. The fort menu offers buy/sell/rest but the *cost of bypassing* is invisible.

**Design:** **bypass penalties** that are visible after the fact through journal narrative and that compound mechanically. Replace any temptation toward forced stops.

**Fort bypass penalties:**
- Pass a fort with any team member at health < 7 → next 3 turns get `+0.10` state-transition probability (degrade only, not recovery). Narrative: "We saw the fort gates and pressed on. Sarah's cough deepened that night. We should have rested."
- Pass a fort with food below 7 days' worth of consumption → -1 morale, "Fort Regret" entry in the journal.
- Pass a fort with wagon_hp < 70 → next damage event applies 1.5× the normal HP loss.
- Pass a fort with money < $5 → no penalty (pioneers without money skipped forts; this is honest).

**River crossing bypass:** there is no "skip" today — players must engage the crossing. v3.3 adds an explicit "ford without choosing method" option that auto-rolls the fording outcome at +0.10 drowning probability. This honors the player's right to skip the choice but charges for it.

**Landmark bypass:** landmarks already auto-trigger their DYK card on landing. v3.3 adds: **passing a landmark space without landing on it costs that DYK card AND a -1 morale** ("we glimpsed Independence Rock from the trail — we'd like to have stopped"). This pulls the dice/movement system back toward landing on landmarks.

**The math sweet spot:** a player who skips 2 forts and 1 landmark over a Short trail accumulates ~5 morale-points of regret, ~0.30 cumulative state-transition probability, and 2 missed DYK cards. They will *feel* it in the final scoring tracks without being told what they're doing wrong. Good kids will figure out that stopping is rational.

### 2.4 DYK exposure targets

**Problem:** DYK card exposure is probabilistic. Some games give 5 cards, some give 18. There is no minimum guaranteed dose for the educational objective.

**Design:** lock minimums by trail length.

- **Short trail:** 12 DYK cards minimum, 14 typical. Distribution: at least one card from each of 8 categories (historical, social, scientific, economic, Native perspective, women, children, geography).
- **Extended trail:** 24 DYK cards minimum, 28 typical. Same category distribution doubled.

**Implementation:** a per-wagon `dyk_quota_remaining` counter, initialized from the trail length. Every space that *can* fire a DYK card (landmarks, certain forts, regional transitions, surprise events) checks the counter. If `dyk_quota_remaining > spaces_remaining`, the DYK card fires deterministically (no probability roll). Otherwise the existing probability gates apply.

**Category enforcement:** maintain a `dyk_categories_seen` set. If fewer than 4 turns remain and an unseen category is still owed, the next eligible DYK card forces a card from that category.

**JSON shape:** new top-level `dyk_quotas` block:
```json
"dyk_quotas": {
  "short":   { "minimum": 12, "target": 14, "categories_required": [...] },
  "extended":{ "minimum": 24, "target": 28, "categories_required": [...] }
}
```

### 2.5 Bandit quiz bank expansion

**Problem:** 23 historical facts × 1 quiz question each = 23 possible quiz items, draw 5. After 4 plays, every question is familiar.

**Design:** start at **40 quiz items** for v3.3, growing toward 60+ in subsequent patches. Each historical fact gets **2–3 quiz variants**, all asking about the same core fact but phrased differently with different distractor sets. The "you only get questioned on stuff you saw" promise is preserved — but the same DYK card produces a different question on replay.

**Authorship plan:** Claude (in this conversation) drafts the 40 items; Gabby reviews them since they wear her name. Claude uses sourced facts from the existing `historical_facts` array as the substrate; new facts are sourced from National Park Service, Oregon-California Trails Association, Smithsonian, BLM National Historic Trails Office, and primary-source pioneer journals.

**Schema change** to `historical_facts`:
```json
{
  "title": "Cholera: The Trail's #1 Killer",
  "fact": "...",
  "source": "BLM National Historic Trails Office",
  "category": "historical",
  "fl_standards": ["SS.5.A.6.4", "SS.6.W.1.3"],
  "quiz_variants": [
    {
      "question": "What was the #1 killer on the Oregon Trail?",
      "correct": "Cholera",
      "wrong": ["Native American attacks", "Wolf attacks", "Wagon accidents"]
    },
    {
      "question": "How quickly could a healthy pioneer die from cholera?",
      "correct": "Same day — symptoms to death in hours",
      "wrong": ["Several weeks", "A month or more", "Cholera was rarely fatal"]
    },
    {
      "question": "How did cholera spread through wagon trains?",
      "correct": "Through dirty water at busy river crossings",
      "wrong": ["Through mosquito bites", "Through buffalo meat", "Through cold air at high altitudes"]
    }
  ]
}
```

The quiz selection logic in `triggerBanditAmbush` updates: pool = facts the team saw, then for each fact pick a random variant.

---

## 3. Group B — Six Content and System Expansions

### 3.1 Calamities expansion

Daily shocks today: 11 entries (food_spoil, water_spill, supplies_lost, wagon_damage, broken_axle, sickness_minor, sickness_severe, bandit_demand, cholera, lost_trail, theft).

Target: 25+ shocks. New entries with target probabilities:

| Calamity | Probability | Magnitude / effect | Profession protection |
|---|---|---|---|
| Lightning strike | 0.02 | 1 member dying-state, oxen panicked (-2 movement next turn) | Scout (early warning) |
| Saleratus poisoning | 0.03 | If team forages without Cook/Doctor, 1 member sick | Cook, Doctor |
| Hailstorm | 0.04 | Wagon HP -10, food -8 lbs | Carpenter (reduces by half) |
| Snake bite | 0.04 | 1 member injured | Doctor (full recovery), Native Guide (early warning) |
| Sunstroke | 0.05 | If water < 10 gal, 1 random member to weakened | Scout (recommends rest) |
| Gun accident | 0.02 | 1 member injured (kids playing with rifles) | Hunter, Cowboy, Trapper (reduces) |
| Alkaline water | 0.04 | 1 ox dead = movement -1 permanent | Native Guide, Scout |
| Prairie fire | 0.025 | If region is plains, food -15, wagon HP -20 | Cowboy (reduces) |
| Buffalo stampede | 0.02 | Wagon HP -25, possibly 1 member injured | Hunter, Cowboy |
| Tornado | 0.01 | Wagon HP -40, 1 member injured | (none — luck only, with 8% residual escape) |
| Quicksand | 0.015 | Forced 1-day stop, supplies -2 | Scout (recommends ford up/downstream) |
| Lost child | 0.015 | Forced 1-day stop, search; 80% found, 20% lost | Native Guide, Scout |
| Ferry rope snap | 0.01 | If on river crossing via ferry, 1 member possibly drowning | Carpenter (re-rigs) |
| Powder keg explosion | 0.005 | Wagon HP -30, 1 member dying | (rare, mostly bad luck) |
| Tooth abscess | 0.04 | 1 member to weakened, recoverable | Doctor |

**Total: 11 existing + 14 new = 25 shocks** (+1 for tooth abscess as a separate listing). Each shock has 3 narrative variants (per item 3.4).

**Probability calibration:** the cumulative daily shock probability across all 25 entries should hit ~0.65–0.80 (so most days have *something*, but quiet days exist). Run Monte Carlo to validate.

### 3.2 Fortunes expansion

Surprise events today: 16 (mostly atmospheric — Aurora, Lone Fiddler, White Buffalo, Star Falls).

Target: 35–40 surprises. New entries by category:

**Help from people (12 new):**
- Native Guide gives directions (already in — keep)
- Native trade for salmon (+10 lbs food)
- Native trade for horses (+1 movement permanent, -3 money or -2 hides)
- Friendly mountain man with map (+0 cost, removes next "lost trail" shock)
- Fellow emigrants share tools (-1 wagon damage on next event)
- Fort doctor cheap visit ($1 visit revives 1 weakened member)
- Fort blacksmith barters (-1 wagon damage, -2 hides instead of -3 money)
- Missionary holds healing service (with Priest: +0.10 recovery on next dying intervention; without: morale +1 only)
- Eastbound traveler with news (free DYK card, +1 morale)
- Discarded cache from a previous train (+5 lbs food, +2 supplies, +1 ammo)
- Wagon master joins train (+0.05 to all profession protection rolls for 5 turns)
- Letter from home waiting at fort (+2 morale)

**Nature gives back (8 new):**
- Bumper buffalo herd (+25 lbs food on next Hunt)
- Soda Springs natural carbonation (+1 morale, atmospheric — kids loved this)
- Snake River salmon run (+15 lbs food)
- Plum and berry season (+5 lbs food, no Hunter needed)
- Camas root foraging (+3 lbs food, +1 morale)
- Wild horses worth trading (+3 hides equivalent)
- Antelope hunt success (+18 lbs food, +1 hide, requires Hunter)
- Calm low-water river crossing (next river crossing safe automatically)

**Timing and milestones (4 new):**
- Independence Rock by July 4th (+2 morale, already a check; v3.3 makes it a named surprise)
- Mild weather all summer (next 5 turns no weather shocks)
- Reunion with old friend (+1 morale, +1 free DYK)
- Baby born on trail and survives (+3 morale, family-name immortalization in journal)

**Atmospheric / superstition-tagged (existing 5, kept and re-audited per item 5.1):**
- Aurora Borealis
- White Buffalo sighting
- Lone Fiddler
- Star Falls to Earth
- Rainbow over Independence Rock (new)

**Total:** 5 atmospheric + 12 people-help + 8 nature-gives + 4 timing + 11 retained from v3.2 = **40 surprises**.

**Probability calibration:** target one surprise event every 2.5 turns on average, with at least 3 fortune events per Short trail and 6 per Extended.

### 3.3 Residual probabilities

**Principle:** every protective skill has a residual failure rate, every calamity has a residual escape rate, both honest, both narratively framed.

**Residual failures on protections:**
- Doctor cholera save: 87% (already designed, keep)
- Hunter feeds team: 85% — if Hunter exhausted (`consec_push_on >= 4`), drops to 50%
- Trapper hunts: 80% — drops to 60% if exhausted
- Carpenter fixes wheel: 95% — drops to 70% if `wagon_hp < 30`
- Native Guide river crossing: 95% — keep (5% historical realism)
- Scout finds water: 90% — drops to 75% in desert region
- Cook stretches food: 85% — drops to 65% if food < 5 lbs
- Priest dying intervention bonus: existing +20% — keep
- Merchant -15% buy: deterministic (no residual)
- Banker starting bonus: deterministic (no residual)

**Residual escapes on calamities:**
- Cholera: 8% the member never gets sick despite exposure
- Buffalo stampede: 8% the herd parts around the wagon
- Lightning strike: 15% near miss (huge crash, no harm)
- Tornado: 10% the funnel veers
- Snake bite: 12% dry bite (no venom)
- River drowning: 5% miraculous rescue
- Bandit demand: 8% the bandits get scared off (a passing wagon train, a barking dog, a Cowboy stares them down)
- All other shocks: 5% residual escape

**Why this matters pedagogically:** kids should understand that on the real trail, **good preparation made you 80% safe and bad preparation made you 20% lucky**. Both halves of that statement are true. Game tells the story.

### 3.4 Narrative variants

**Today:** each event has one default narrative + profession-modifier overrides.

**v3.3:** each event gets **3 random narrative variants** for the default case, mechanical effect identical, story different. Example for Broken Wheel:

```json
"Broken Wagon Wheel": {
  "narratives_default": [
    "The right rear wheel splinters as we cross a stretch of rocky ground. The wagon jerks to a halt at an angle. Without a fix, we go nowhere.",
    "An iron tire band splits with a CRACK that startles the oxen. The wheel binds and locks. The wagon stops.",
    "We feel the wagon lurch — a spoke has shattered crossing a creek bed. The wheel wobbles and we have to stop before it falls apart entirely."
  ],
  "narratives_carpenter": [...],
  "narratives_blacksmith": [...]
}
```

Profession-modifier narratives also get 2 variants each.

**Rollout:** apply variants to the 11 existing major events first (river crossings, broken wheel, oxen collapse, cholera, etc.), then to the new 14 calamities, then to the 24 new fortunes. Defer single-event surprises (white buffalo, aurora) to a single narrative since they only fire 1–2× per game anyway.

### 3.5 Chained event probabilities (shadow effects)

**Principle:** systems feel alive when one event raises the probability of related ones. Real wagon trains experienced this — a wagon damaged crossing a river was more likely to break down on the next rough stretch; a crew with one cholera case had others incubating.

**Design:** a per-wagon `event_shadows` array. Each shadow is a 2-turn-window probability boost applied to a related event class.

Example shadows:
- **Wagon damage event** → shadow `wagon_damage` ×2 prob for 2 turns. ("The wagon was tougher than we thought, but it shows the wear.")
- **Member sick (cholera)** → shadow `cholera` ×3 prob for 2 turns *for other members*. ("Cholera spreads through dirty water — and we drink the same barrel.")
- **Lost trail** → shadow `food_spoil` ×1.5 and `water_spill` ×1.5 for 2 turns. ("Wandering wastes everything we carry.")
- **River crossing failure** → shadow `wagon_damage` ×2 and `member_injured` ×1.5 for 2 turns. ("The wagon is wet through; the harness is fouled.")
- **Bandit demand** → shadow `theft` ×3 for 2 turns. ("Word travels among the road agents.")
- **Push-On Tax oxen-refuse trigger** → shadow `oxen_collapse` ×2 for 2 turns.

Shadows decay: full effect turn 1, half effect turn 2, gone turn 3. Multiple shadows of the same class stack additively up to a cap of ×4.

**JSON shape:** new `event_shadows` block per event in the events table, listing which shadows it casts. The simulator collects active shadows on each turn and applies multipliers when rolling the daily shock table.

### 3.6 Per-member personality vectors

**Principle:** a lightweight bridge toward agent-based architecture without rebuilding the engine. Each member gets 5 hidden traits at character creation. Traits modify that member's behavior in stochastic rolls. Players see the traits as flavor descriptors on the character card.

**The five traits:**
- **Boldness** (1–10) — modifies choice-card outcome probabilities. Bold members succeed more on risky choices, less on safe choices.
- **Frailty** (1–10) — multiplies that member's state-transition probabilities for degrade rules. A frail member catches cholera more easily.
- **Faith** (1–10) — slows that member's morale decay; in dying-intervention, +0.05 recovery boost per Faith point above 5.
- **Steady** (1–10) — modifies the success rate of that member's profession protection. A steady Hunter feeds the team more reliably.
- **Lucky** (1–10) — small ±0.02 bias on every stochastic roll involving that specific member.

**Generation:** each trait rolls 1d6+1d6 (range 2–12, mean 7), capped 1–10. Profession biases:
- Hunter: +1 Steady, +0 elsewhere
- Doctor: +1 Steady, +1 Faith
- Cowboy: +1 Boldness, +1 Steady
- Priest: +2 Faith
- Frontiersman: +1 Boldness, +1 Lucky
- Banker: +0 elsewhere, no bias
- Musician: +1 Faith, -1 Boldness (the bias is for narrative texture, not "this profession is bad")
- Artist: +1 Faith, +0 elsewhere
- Child (if family team): +1 Lucky, -1 Steady, -2 Frailty (children were more vulnerable)

(Full bias table in JSON.)

**Display:** character card shows trait *names* in a single line, derived from the trait values.
- Boldness 8+ → "Bold"; 3- → "Cautious"
- Frailty 8+ → "Frail"; 3- → "Hardy"
- Faith 8+ → "Faithful"; 3- → "Doubtful"
- Steady 8+ → "Steady"; 3- → "Restless"
- Lucky 8+ → "Lucky"; 3- → "Star-crossed"

Example display: "Sarah, the Doctor — *Steady, slightly Faithful*."

**Pedagogical value:** a kid building a wagon now thinks "Sarah's Frail, I should make sure she gets to rest" before her cholera resistance ever gets tested. Strategy depth without engine rework. **This is roughly 80% of the experiential payoff of full agent-based architecture, at maybe 5% of the implementation cost.**

---

## 4. Group C — Three Pedagogy and Classroom Items

### 4.1 Superstition audit

**Principle:** the game can show what pioneers believed without endorsing the belief as causal. Kids should learn what people experienced, not absorb magical thinking.

**Two categories:**
- **Atmospheric / morale-only.** Effect is restricted to morale and DYK exposure. No hidden luck modifier, no probability bias on subsequent events.
- **Material help.** Effect is causal but the cause is human, natural, or social — never supernatural.

**Audit pass on existing 16 surprise events:**

| Event | Current effect | v3.3 classification | Notes |
|---|---|---|---|
| Aurora Borealis | +1 morale, +0.05 luck for 3 turns | Atmospheric (strip luck modifier) | DYK pairs with scientific explanation |
| White Buffalo | +1 morale, +0.05 luck for 5 turns | Atmospheric (strip luck modifier) | DYK explains Lakota sacred meaning, respectfully |
| Lone Fiddler | +2 morale | Atmospheric | Already correct |
| Star Falls to Earth | +1 morale, +0.05 luck | Atmospheric (strip luck) | DYK explains Leonids meteor shower |
| Rainbow at Independence Rock (new) | +1 morale | Atmospheric | New v3.3 entry |
| Native Guide help | +0.95 river crossing safety | Material — keep | Cause is human knowledge |
| Soda Springs | +1 morale | Atmospheric | New v3.3 — pair with DYK on natural carbonation |
| Bumper buffalo herd | +food | Material — keep | Cause is natural plenty |
| Letter from home | +2 morale | Material (information is the cause) | Keep |
| Healing service (Priest) | +0.20 dying recovery | Material — keep, narrative neutral | See "Prayer" note below |
| ... (all 11 others) | ... | Audit each | |

**Prayer note (private to designers, NOT explicit in player documentation):** the Priest's +20% dying-intervention bonus is retained because community ritual reducing despair, organizing care, and providing time-with-the-dying has measurable effects on outcomes — these are observed scientifically and have nothing to do with claims of supernatural intercession. The narrative in player-facing text frames the recovery as associated with care, attention, and stopped travel: "Father Michael gathers the family at the bedside. He leads them in prayer and song through the night. Sarah is held, loved, kept warm. By morning the fever has broken." This is theologically neutral, scientifically defensible, historically grounded. Kids draw their own theological conclusions outside the game.

The "pray and continue" choice retains its existing +20% with-Priest bonus. Narrative softens to: "We prayed by the bedside as the wagon rolled. Some called it grace; some called it luck. By dawn the fever had broken."

**JSON shape:** add `superstition_class` field to each surprise event. Simulator must NOT consult it for any mechanical effect — it exists only to flag designer intent and audit compliance.

### 4.2 End-of-game "What You Learned" page

**Today:** end-of-game shows a Trail Journal with ~15 paragraphs of period-voice prose plus a leaderboard score. Beautiful but not pedagogically structured.

**v3.3:** replace with the **What You Learned** page — six sections, printable, gradeable.

**Section 1 — Your Trail in Numbers.**
The four scoring tracks (Steward / Provider / Scholar / Pathfinder) shown side by side as horizontal bars. Each bar shows score, max possible, and a single-sentence interpretation tied to threshold ranges. Brief comparison line: "You scored higher on Steward than Pathfinder — your team arrived alive and well, even if it took longer."

**Section 2 — What History You Met.**
Gallery of every DYK card shown to the team during the journey, displayed as small cards with title + 2-line summary + FL benchmark code. Clicking a card shows the full fact and source. At top: "You learned about [N] historical topics on this trail. Each is part of [X] specific Florida benchmarks."

**Section 3 — The Choices You Made.**
A retrospective walk-through of the 4–8 major fork-in-the-road moments (river crossings, fort decisions, dying-member interventions). For each:
- What the choice was
- What the team chose
- What historians say about that choice (a 2-sentence pop-up with citation)
- What happened to the team

This frames the player's decisions as historical decisions.

**Section 4 — The People You Lost (or Saved).**
Per member: name, profession, state at journey's end, cause if lost, narrative epitaph (1–2 sentences). Tone: somber, dignified, period-appropriate. The emotional center of the page.

**Section 5 — Discussion Questions for Your Teacher.**
Five questions auto-generated from this specific journey. Examples:
- "You chose to ford the Snake River at low water and Sarah drowned. Pioneers really did this. Why might they have taken that risk instead of paying the ferry?" *(SS.5.A.6, SS.6.W.1.3)*
- "Your team lost no members. What three decisions do you think made the biggest difference?" *(SS.6.W.1.5)*
- "You passed Fort Laramie without stopping. What did you gain? What did you lose?" *(SS.5.A.6)*

Five questions, every one tagged to a benchmark.

**Section 6 — Standards Demonstrated.**
The list of FL benchmark codes the journey covered, with one-line "I Can" statement for each. Examples:
- *SS.6.W.1.3 — I can interpret primary and secondary sources to construct a historical narrative.*
- *SS.6.G.4.3 — I can interpret human-environment interactions during westward migration.*
- *SS.5.A.6 — I can describe the hardships of the overland trails and the role of westward expansion.*

**Print formatting:** entire page fits to 1–2 letter-sized printed pages. Header includes student name, wagon name, date, class period, teacher name (entered at game start in Teacher Mode).

### 4.3 Classroom roll-up dashboard

**The new big classroom feature.** Today's game can save individual journeys; nothing aggregates across the class.

**v3.3 design:** the facilitator (teacher or parent) registers a **Class Session** at game start. Inputs: class name, date, period, teacher name, a list of student/team identifiers. Each wagon attaches to the session. When the last wagon finishes, the facilitator presses **End Class Session** and gets:

**Standards Coverage Matrix.**
Grid: rows = each FL benchmark targeted, columns = each wagon, cells = "Demonstrated" / "Partial" / "Not Encountered". Bottom row = per-standard coverage rate across the class (e.g., "SS.5.A.6 — 100% of wagons demonstrated"). **This is the artifact the teacher hands to administration.**

**Class Heatmap.**
Three columns:
- DYK facts encountered by every wagon (the "trail-shared" content — guaranteed dose)
- DYK facts encountered by some wagons (the surprise content — divergent)
- DYK facts encountered by no wagons (the gaps — next-day teaching opportunity)

This gives the teacher tomorrow's lesson plan: "Tomorrow we'll spend 10 minutes on the four facts no team encountered."

**Aggregate Decisions.**
Across all wagons:
- 4 wagons forded the Snake River, 2 took ferry, 0 used Native Guide
- 6 visited Fort Laramie, 1 bypassed
- 3 chose Bare Bones rations at some point, 4 did not
- ...

Pure discussion fuel. "Why did most teams ford? What does that suggest about pioneer decision-making under cost pressure?"

**Aggregate Outcomes.**
- Members started: 49 (7 wagons × 7)
- Members lost: 6
- Causes: cholera 3, river drowning 2, exhaustion 1
- Average Steward score: 187/280
- Average days to Oregon: 142

The class itself is a wagon train. The 1-in-10 historical death rate emerges at the *class scale*. **Emotionally powerful, historically faithful.**

**Top Discussion Prompts.**
8–10 prompts auto-generated from the class data, ranked by relevance. Examples:
- "Three of seven teams lost a member to cholera. What does this tell us about water and disease on the trail?"
- "No team chose the Native Guide for any river crossing, even though it has the highest historical safety rate. What might that say about who was given trust on the trail?"

**Format:** single-page printable dashboard, header with class info, footer with timestamps and teacher signature line. One PDF; teacher prints, hands to admin, files with the unit's evidence portfolio.

---

---

## 4.5 Group D — Map and Physical Board

### 4.5.1 Expandable map — full zoom range, pan, center-on-wagon

**Problem:** the current expandable mini-map shows the full 50-space Extended trail (or 25-space Short) at fixed zoom. On a Chromebook screen (~1366px wide), space markers sit ~25px apart and labels collide. Kids can't read the trail at the resolution they have. The pin-needle wagon markers from v3.1 are clear; the underlying map is too crowded.

**Design:** add full zoom controls to the expanded map and the mobile drawer-map.

**Zoom range:** 1× (full trail visible — current default) to 4× (only ~12 spaces visible, labels readable at 14pt). Kids can finally see *what space they're on*.

**Controls:**
- **Touch:** pinch-to-zoom, single-finger pan
- **Desktop:** scroll wheel zoom (centered on cursor), click-and-drag pan
- **Always available:** floating `+` / `−` / `⊕` (center on my wagon) buttons in the bottom-right corner of the map, 44×44px touch targets

**Center-on-my-wagon:** a single tap auto-pans and zooms to the active wagon at 2.5× zoom. Most-used button — make it the most prominent.

**Label legibility:** font sizes resize *inversely* to zoom (zoomed-out text is smaller, zoomed-in text is larger), capped at 8pt min and 18pt max. Place names always render below the space roundel; never overlap.

**Pin-needle behavior at zoom:** v3.1's pin-needle wagon markers stay visible. At higher zoom (≥2×), inactive wagons' needles get smaller and their labels fade slightly so the active wagon stands out.

**Scale indicator:** small bottom-left readout updates with zoom — "1 inch = ~80 miles" at 1×, "1 inch = ~20 miles" at 4×. Reinforces geographic learning.

**Performance budget:** 50 spaces × 6 wagons × pin-needle elements ≈ 300 SVG elements. SVG handles this fine at 4× zoom. No canvas rewrite needed.

**Where it lives:** updates to `mini-map`, `expand-mini-map`, and `mobile-drawer-map` containers in `pink_oregon_trail.html`. Single shared zoom controller — same code drives all three.

**Acceptance test:** zoom to 4× via pinch (mobile) or scroll (desktop); verify every space label is readable; pan smoothly to a different region; tap "center on my wagon" and verify the view jumps to the active wagon at 2.5×; verify scale readout updates.

### 4.5.2 Physical tile redesign — match screen, dial up the fun

**Problem:** the current 6-tile (Extended) and 1-tile (Short) physical boards from v3.1 are functional and historically accurate but visually flat compared to the on-screen map. Kids who play the physical board want to *look* at it. Today they don't.

**Goal:** redesign all tiles so they look like the on-screen map's beautiful illustrated sibling — same color palette, more illustrated detail per region, kid-engagement easter eggs, dialed-up sense of *adventure*.

**Visual richness per tile (the big change):**
- **3–5 small "vignettes" per tile** depicting life on the trail at that region. Each vignette is a 1–2 inch illustrated scene, rendered in period watercolor style:
  - **Tile A (Independence to Fort Kearny):** prairie schooner being outfitted, a family's last meal in Independence, oxen being broken to yoke, a fiddler at evening camp
  - **Tile B (Fort Kearny to Chimney Rock):** kids picking buffalo chips for fires, a buffalo herd in the distance, a violent prairie thunderstorm at the horizon, a Pawnee hunter passing in the foreground
  - **Tile C (Scotts Bluff to Independence Rock):** women writing letters home, a wagon train circled for the night, names being carved into Independence Rock, a wedding on the trail
  - **Tile D (South Pass to Fort Bridger):** the mountain pass with snow on peaks, trappers trading furs, a Shoshone family at trading post, a wagon being lashed for a steep descent
  - **Tile E (Soda Springs to Fort Boise):** Soda Springs with kids drinking the natural carbonated water, salmon being caught at a Snake River tributary, missionaries at Whitman station
  - **Tile F (The Dalles to Oregon City):** the Columbia River raft journey, Mount Hood looming, the first farms of the Willamette Valley, families embracing in Oregon City
- **2–3 wildlife illustrations per tile** — buffalo on plains tiles, mountain goats and elk in mountain tiles, salmon at Snake River, prairie dogs, eagles, deer, rattlesnakes (small, not scary)
- **One "Did You Know?" callout box per tile** — parchment-scroll style decorative element with a single historical fact in period typography. Gives kids something to read between turns. The 6 tiles' callout content rotates from the DYK card pool but always includes a region-relevant fact.

**Match-screen color discipline:** use the EXACT color palette from `pink_oregon_trail.html` and from existing v3.1 tile work — parchment `#F4E8D8`, deep_brown `#5C4A36`, tan `#A89070`, trail_pink `#B85770`, soft_pink `#F4D3DA`, cream `#FBF6F0`, river_blue `#7A9DBE`, forest_green `#5F7A5F`, mountain_purple `#8B7A95`, desert_tan `#C8956D`, gold_accent `#D4AF37`. The trail line in trail_pink, slightly thicker than v3.1's stroke width, with subtle gradient toward soft_pink at edges.

**Space markers redesigned:** each space is now a **small decorative roundel (1.2 inch diameter)** instead of a plain numbered circle:
- Outer ring in tan with gold_accent inner trim
- Space number in period serif, centered, deep_brown
- A tiny icon hint inside the ring: anchor for fort, droplet for river, peak for landmark, simple arrow for travel space
- Place name in italic serif beneath the roundel, in deep_brown

**Kid-engagement easter eggs:** every tile hides **3 small surprises** the kids can hunt for during play:
- A hidden critter (a fox peeking from grass, a raccoon at a creek, an eagle in a tree)
- A period object (a silver dollar, a prairie flower, a lost button, a forgotten toy)
- A fellow traveler (a Native scout passing through, a mountain man, a missionary, an eastbound rider with mail)

The "find the three hidden things on each tile" becomes a kid-game during downtime between turns. Big educational win for kid attention to historical artifacts.

**Typography upgrade:**
- Tile titles in larger, more decorative period serif (think 1850s newspaper masthead style — heavy weight, generous spacing)
- Region labels in flowing italic
- All text remains period-appropriate — no modern fonts, no anachronism

**Decorative borders and corner vignettes:**
- Each tile carries a 0.4-inch decorative border with repeated period motifs (small wagons, oxen, fleurs, stars). Border colors match palette.
- Each tile has a single corner vignette in one corner — a compass rose on Tile A, a quill-and-ink on Tile B, a campfire on Tile C, a yoked oxen pair on Tile D, a salmon on Tile E, a Mount Hood silhouette on Tile F.

**Children's-hand (paintable) variants:**
- The blank/paintable versions of every tile retain all the new structure (vignettes, easter eggs, decorative borders, redesigned roundels) but in pure outline form
- Higher line weights than the v3.1 paintable so a child's brush doesn't blur the lines
- Light gray dot grid faintly visible in larger paintable regions to suggest "paint within these zones"
- Vignettes also outlined and paintable — invites kids to color the wagon scene, the buffalo, the Native trader

**Output deliverables (HTML files generating SVG):**
- 6 redesigned Extended tiles, decorated AND paintable variants → 12 files
  (`board_extended_tile_A_decorated.html` through `board_extended_tile_F_paintable.html`)
- 1 redesigned Short tile, decorated AND paintable → 2 files
- Updated 36×24 single-sheet poster (the v3.1 deliverable) to match the new aesthetic, decorated AND paintable → 2 files
- **Total: 16 board files** (existing v3.1 files replaced in-place)

**Acceptance:**
- Print Tile B and put it next to the on-screen map showing the same region. They look like siblings — same color, same trail style, same overall feel.
- Have Gabby and a friend look at a tile for 30 seconds *without being told to look for anything*. Each finds at least one easter egg unprompted.
- All 6 Extended tiles tape together cleanly — no edge mismatches in trail line, region color, or border.
- The paintable versions feel inviting to color (test with a kid: do they reach for the markers?).

---

## 5. Florida Standards Mapping

**Operating frame:** Gabby is in 6th grade in Florida. Per FL B.E.S.T. Standards (2023 revision), 6th grade Social Studies = World History (ancient and classical civilizations of Africa, Asia, Europe). Oregon Trail content does NOT fit 6th grade FL standards directly. It lives in:
- **5th grade SS.5.A.6 — Growth and Westward Expansion** (which Gabby's class would have studied last year — making Pink Oregon Trail a defensible *review/extension* activity)
- **8th grade SS.8.A.4 — Westward Expansion** (which Gabby will study in 8th — making Pink Oregon Trail *preparation/preview*)

**Cross-cutting B.E.S.T. anchors that DO apply at 6th grade:**
- **SS.6.W.1.x** — Historical inquiry methodology, primary/secondary sources
- **SS.6.G.1.x, SS.6.G.4.x, SS.6.G.6.x** — Geographic interpretation, human-environment interaction, mapping
- **B.E.S.T. ELA-Reading R.2 / R.3** — Informational text comprehension and integration

**Tagging scheme:** every DYK card and every quiz item carries:
1. A primary content standard (usually SS.5.A.6.x or SS.8.A.4.x)
2. One or more cross-cutting skill standards (SS.6.W.1.x, SS.6.G.x, or ELA-R.x)

**Example tagged DYK card:**
```json
{
  "title": "Cholera: The Trail's #1 Killer",
  "fl_standards_primary":  ["SS.5.A.6"],
  "fl_standards_skill":    ["SS.6.W.1.3", "ELA.6.R.2.2"]
}
```

Specific SS.5.A.6 sub-benchmarks Claude Code should consult when tagging (verified at CPALMS):
- **SS.5.A.6.5** — Identify the causes and effects of the War of 1812 (relevant for trail-context background)
- (SS.5.A.6.x — full sub-benchmark list to be pulled from CPALMS at implementation time; designer instruction: every quiz item must carry at least one verified benchmark code)

For Teacher Mode rubric output, the Standards Demonstrated section lists each unique benchmark encountered and whether the student showed mastery at the **Recall**, **Apply**, or **Analyze** level (based on whether the team SAW the DYK, made a CHOICE involving it, or got the QUIZ question right).

---

## 6. Calibration Targets

This is the discipline that's been missing. v3.3 ships only when these targets pass on a 500-run Monte Carlo for each cell:

| Config | Hunter+Doctor finish | Musician+Artist finish | Avg DYK seen | Avg game minutes (live) |
|---|---|---|---|---|
| Easy / Short | 95% | 75% | 12–14 | 12–15 |
| Medium / Short | 80% | 50% | 12–14 | 15–20 |
| Hard / Short | 60% | 25% | 12–14 | 18–22 |
| Easy / Extended | 90% | 65% | 24–28 | 30–35 |
| Medium / Extended | 70% | 40% | 24–28 | 40–50 |
| Hard / Extended | 50% | 15% | 24–28 | 50–60 |

**Secondary targets** (must also pass per cell):
- Avg members lost on Hunter+Doctor / Medium / Short: 0.6–1.0
- Avg members lost on Musician+Artist / Medium / Short: 2.5–3.5
- ≥3 members lost rate on Musician+Artist / Hard / Extended: 50–70%
- Steward score range across all configs: 100–280
- Pathfinder score range: 0–80
- Bandit quiz item repetition rate across 4 consecutive plays of the same trail length: <30% (a kid playing 4 short journeys in a row should see ~14 distinct quiz questions, not 5 same ones)

**Calibration discipline:** if any cell misses, retune. The retuning levers are:
- Push-On Tax thresholds (item 2.2)
- Bypass penalty magnitudes (item 2.3)
- Profession protection rates (item 3.3)
- Calamity probabilities (item 3.1)
- Fortune probabilities (item 3.2)

Do NOT retune by changing the calibration targets themselves.

---

## 7. Acceptance Tests

Fourteen tests must all pass before v3.3 ships:

**Test 1 — Calibration battery passes.** All 6 configs, all primary and secondary targets, on 500-run Monte Carlo.

**Test 2 — DYK quota guarantee.** Run 100 games on each trail length. Every game must have ≥minimum DYK card count and all required categories present.

**Test 3 — Bandit quiz variety.** Play 4 consecutive Short games as same Hunter+Doctor team. Track unique quiz questions seen. Must be ≥14 of the possible ~20 (4 plays × 5 questions = 20 max).

**Test 4 — Push-On Tax fires.** Manually Push On 10 consecutive turns on Steady pace. Verify oxen-refuse fires at turn 4, crew exhaustion at turn 6, wagon damage at turn 8, major breakdown at turn 10. Each event must show its narrative and apply its mechanical effect.

**Test 5 — Smart-Stop bypass penalties.** Manually pass Fort Laramie with one member at health 5 and food at 5 lbs. Verify next 3 turns show elevated state-transition rolls in the simulation log, +1 morale loss at the bypass moment, "Fort Regret" entry appears in journal.

**Test 6 — Scoring tracks render.** Finish a journey. Verify all four tracks (Steward / Provider / Scholar / Pathfinder) display with bars, scores, and narrative interpretations. Verify total = sum of four tracks.

**Test 7 — Personality vectors apply.** Build a wagon. Verify each of 7 members displays trait descriptors. Force a stochastic event involving a high-Frailty member 100 times in a calibration run; verify their state-transition rate is materially higher than a low-Frailty member's.

**Test 8 — Superstition audit.** Spot-check 5 atmospheric events in the simulation. Verify they apply ONLY morale changes — no luck modifier, no probability bias on subsequent rolls.

**Test 9 — What You Learned page renders.** Finish a journey on Medium / Extended with 2 lost members and 22 DYK cards. Verify all 6 sections render, FL benchmark codes display correctly, page is printable on 1–2 letter pages.

**Test 10 — Classroom roll-up dashboard.** Register a Class Session with 4 wagons, complete all 4 journeys (mix of outcomes — 2 successes, 1 elimination, 1 partial), press End Class Session. Verify Standards Coverage Matrix populates correctly, Class Heatmap shows shared/divergent/missing facts, Aggregate Decisions reflects actual choices, Discussion Prompts are auto-generated and topical.

**Test 11 — Narrative variants rotate.** Trigger Broken Wheel event 10 times in calibration. Verify all 3 default narratives appear at least once, none appear more than 5 times.

**Test 12 — Chained event probabilities apply.** Force a wagon damage event. Verify subsequent 2 turns show ×2 probability multiplier on wagon_damage in the simulator log. Verify shadow decays correctly (full effect turn 1, half turn 2, gone turn 3).

**Test 13 — Expandable map zoom and pan.** Open the expanded map. Pinch-zoom (or scroll-zoom) to 4×. Verify all space labels are readable, no overlap. Pan to a different region. Tap "center on my wagon"; verify view jumps to active wagon at 2.5× zoom. Verify the scale readout updates correctly. Test on both desktop fullscreen and mobile drawer-map.

**Test 14 — Physical tile redesign matches screen.** Print Tile B. Place it next to the on-screen map showing the same region (Fort Kearny to Chimney Rock). Both should clearly belong to the same visual family — same colors, same trail line style, same feel. Have a kid spend 30 seconds with the printed tile *unprompted*. They must find at least one easter egg. Tape Tiles A through F together; verify clean alignment with no edge mismatches.

---

## 8. Implementation Notes for Claude Code

**Where the work lives:**
- `oregon_trail_game_data.json` — most additions live here (calamities, fortunes, narrative variants, DYK quota config, scoring config, personality bias table, FL standards tags)
- `pink_oregon_trail.html` — the v32 simulation modules (`v32ApplyDailyShock`, `v32ApplyDailyIncome`, `applyTurnConsumption`, `simulateJourney`) extend to consume the new data; the end-of-game flow gets a new What You Learned page; new Class Session UI added
- `historical_facts` array — expanded from 23 entries to ~25–30 entries, each with 2–3 quiz_variants

**Single source of truth discipline (per v3.2 NOTE):** v3.2 introduced the `V32_*` calibration sim alongside the live-game wrapper, which share helpers. Maintain this pattern. Calibration sim must validate v3.3 mechanics directly before live-game integration is trusted.

**Don't break v3.2 saves.** A save file from v3.2 should still load in v3.3 (the new fields are added with safe defaults; no fields are removed). Versioning: `meta.version: "3.3"`, `meta.compatible_with: ["3.2"]`.

**Authorship of new content:**
- 14 new calamities with 3 narrative variants each = 42 narrative paragraphs
- 24 new fortunes with 3 narrative variants each = 72 narrative paragraphs
- 17 new historical facts with 3 quiz variants each = 51 quiz items
- ~150 narrative paragraphs total

Claude (this conversation) drafts this content; Gabby reviews; Nicholas commits. Period voice consistent with existing entries — concrete sensory detail, no anachronism, no preachiness.

**FL benchmark codes:** every DYK card and quiz item must carry at least one verified benchmark code. Code verification done by checking each code at CPALMS (cpalms.org) before committing. Designer instruction: NO mock or guessed codes.

**Performance budget:** the v32 simulation runs 500 journeys silently in <30s on a Chromebook. Adding 14 calamities and 24 fortunes increases the per-turn shock-roll cost by ~3×. Expect 500-run calibration to grow to ~60–90s. Acceptable.

**UI density:** the What You Learned page and Class Session dashboard are new screens. Both must respect the existing `updateUIDensity()` mobile/desktop split. Both must print cleanly to letter-size paper (the most important constraint — these are physical artifacts kids carry home).

**Audio:** no new sound effects required for v3.3. The existing dice, regional chime, lost, money-gain, and event SFX cover all new triggers. Music rotation unchanged.

---

## 9. Open Questions / Deferred Items

1. **Agent-based architecture full rewrite** — deferred to v3.4+. Personality vectors (item 3.6) are the bridge.
2. **Multi-class leaderboard** — deferred. Currently each class session is standalone.
3. **Spanish translation** — deferred. Florida classroom relevance high; capacity required.
4. **Native American perspective expansion** — partial in v3.3 via DYK card category and the Native Guide / Native trade fortunes; full perspective layer (a "Through Native Eyes" alternate journal mode) deferred to v3.5.
5. **The 60-quiz-item target** — v3.3 ships at 40 with the schema supporting growth to 60+. Items 41–60 added in v3.3.1 patches.
6. **Teacher-authored DYK cards** — feature request from earlier conversation. Not in v3.3 scope. Allow teachers to add their own DYK cards via JSON edit (already supported); a dedicated UI for this is v3.5+.
7. **Game-master-style intervention** — currently teachers can hot-edit GAME_DATA in the browser. A formal "GM panel" with override controls for adjusting probability or forcing events on a class is deferred.
8. **Save state for Class Session.** v3.3 Class Session must persist across browser refresh during a single class period. Multi-day persistence (a Class Session that spans two class periods) is harder and deferred to v3.4.

---

## 10. Sign-off Checklist

Before declaring v3.3 ready for ship:

- [ ] All 14 acceptance tests pass
- [ ] All 6 calibration cells pass primary and secondary targets on 500-run Monte Carlo
- [ ] Every DYK card carries verified FL benchmark code(s)
- [ ] Every quiz item carries verified FL benchmark code(s)
- [ ] What You Learned page prints cleanly on 1–2 letter pages
- [ ] Class Session dashboard prints cleanly on 1 letter page
- [ ] Personality vectors display on character cards in a way Gabby can recognize
- [ ] All 11 superstition-tagged events confirmed atmospheric-only (no hidden luck modifiers)
- [ ] Prayer-related narratives reviewed and confirmed neutral on theological causality
- [ ] Save files from v3.2 load correctly in v3.3
- [ ] Expanded map zoom range tested at 1×, 2×, 4×; labels readable at every level
- [ ] All 16 board files (Extended ×12 + Short ×2 + poster ×2) printed and verified for visual match to on-screen map
- [ ] Tile easter eggs tested with at least one kid; ≥1 found unprompted
- [ ] Extended tiles A–F tape together cleanly (trail line, regions, border continuous)
- [ ] No console errors during a full Short journey or full Extended journey
- [ ] Build report v3.3 written, summarizing all 16 items + open issues + git work pending

---

## Appendix A — Designer notes on tone

The Pink Oregon Trail belongs to Gabby. v3.3 must preserve:
- Period voice in narratives (no modern slang, no anachronism)
- Pink-and-parchment visual language
- Respect for Native American peoples (the Native Guide must always be the *safest* river crossing — historical truth)
- Honest depiction of pioneer hardship without gratuitous tragedy
- Mom-the-Doctor protecting against cholera as a thematic anchor

v3.3 must avoid:
- Magical-causality framings (per item 4.1)
- Reducing the trail to a race (per item 2.1)
- Making strategy invisible to the player (no hidden meters in the UI; let narrative do the teaching)
- Over-engineering for re-playability at the cost of cohesion (40 surprises is the right number; 80 would dilute)

---

*End of v3.3 Design Brief.*

*Word count target: ~6,000 words. Actual: ~5,900.*

*Next step: Gabby and Nicholas review. Claude Code implements against this brief. v3.3 ships when the sign-off checklist is complete.*
