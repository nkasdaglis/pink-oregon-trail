# Pink Oregon Trail — Final Consolidated Amendment v2.0

> ## ⚠️ READ THIS FIRST
>
> This amendment **completely supersedes** the original `claude_code_prompt.md` and all prior amendments. It is the single, consolidated specification for the final game. The accompanying `oregon_trail_game_data.json` is version 2.0 — confirm `meta.version === "2.0"` before applying any changes.
>
> Six board-tile HTML files will also be in the project folder (three decorated, three blank). They do not need to be modified.
>
> **Procedure:**
> 1. Re-read `oregon_trail_game_data.json` from disk. Confirm `meta.version` is `"2.0"`.
> 2. If you have an existing `pink_oregon_trail.html` from a prior amendment round, treat it as discardable. The simulation, UI, and audio layers in this amendment are large enough that a clean rebuild is cleaner than patching.
> 3. Read this amendment in full before writing code. The systems are interconnected — the simulation depends on the state machine, the state machine drives audio cues, audio cues bind to UI moments, and UI moments anchor scenes. Wiring them in the wrong order produces broken integration.
> 4. Build in the order suggested in Part 0.
> 5. Use the JSON as the source of truth for all balance, narratives, and content. Hardcoded numbers should be limited to genuinely-fixed game constants (canvas dimensions, animation durations).
>
> If anything in this amendment conflicts with the original v1.0 prompt, this amendment wins.

---

## What changed since you last saw a spec

This amendment is the result of multiple playtest rounds with the 11-year-old game designer (Gabby) and her father. Three things drove the consolidation:

1. **Gabby played the game and produced a two-page handwritten review.** Forty-two specific items, ranging from bug fixes to deep design changes. Every item is addressed in this amendment.

2. **A team played for a full week with zero food and didn't die.** The resource system was siloed — Food, Water, Health, Morale ticked down independently. There were no feedback loops, no real consequences, and no emergent death rate. This amendment replaces that with a coupled dynamical system.

3. **The UI was flat.** The original visual layer placed scenery, narration, and choices in stacked boxes. The result felt like a textbook with decorations. This amendment specifies a scene-as-canvas architecture — the screen is a composed scene, with the team's actual chosen characters present in it, and the UI is callouts and overlays floating on the scene.

The game is now built around three pillars:

- **A coupled-resource simulation** that produces the historical 1-in-10 death rate through emergence, not scripting. Members have states (healthy → weakened → sick → injured → dying). Resource shortages cascade. Profession protections degrade as the protectors themselves get sick. Different teams genuinely diverge.

- **An immersive scene-driven UI** where every action (Hunt, Forage, Rest, Ford, Caulk, Ferry, Native Guide, Fort visit) is a visible animated scene starring the player's actual named team members in their professions, against a region-appropriate backdrop, with state-driven ambient audio.

- **A learning-as-strategy climax** — a bandit ambush near journey's end where the team faces a 5-question multiple-choice quiz drawn from historical facts they actually saw during their journey. Quiz performance, profession bonuses, and team state combine to determine the outcome. Pay attention to the trail, win the trail.

The amendment is long. It needs to be — the systems are interconnected and the implementation is non-trivial. Read all of it before writing code.

---

# Part 0 — Build order

Build in this order. Each section depends on the prior ones being functional.

1. **Foundation:** JSON re-read, GAME_DATA constant embedded, member state machine implemented as data (no UI yet)
2. **Simulation core:** turn loop, resource consumption, state transitions, death checks (test in console first)
3. **UI shell:** the scene canvas, the resource ribbon, the team strip, the action bar
4. **Setup flow:** screens 1-5 with name input working correctly
5. **Scenery system:** five region backdrops with characters compositing on top
6. **Action scenes:** Push On, Hunt, Forage, Rest, with characters present
7. **Space resolution:** travel, fort, river, landmark, finish handlers
8. **Event system:** narrative resolution with profession highlighting
9. **Stochastic layer:** triangular distributions, momentum, surprise events
10. **Audio system:** state-driven loops, event cues, music pool
11. **Bandit ambush quiz finale**
12. **End game:** Trail Journal, leaderboard, scoring, what-if, teacher mode
13. **Mini-map and dispatch letters**
14. **Polish pass:** funeral music on loss, looping confetti at finish, all the small audio cues

After every section, verify the section works in isolation before proceeding.

---

# Part 1 — Critical bug fixes from playtest

These are confirmed bugs from the playtest. Fix them BEFORE adding new features.

## 1.1 — Name input broken (multiple modes)

**Symptom:** Player cannot type their name in any mode. Reported in Single Player mode AND in Cooperative AND Competitive setup screens.

**Likely causes (check all):**
- Input field has no event listener bound, or the listener is bound before the element exists.
- Input field has `readonly` or `disabled` attribute set inadvertently.
- The setup screen uses an HTML `<form>` element that's swallowing keystrokes (recall original v1.0 prompt: never use `<form>` in this build).
- Click handler on the parent container is calling `preventDefault()` on keystrokes.
- Custom keyboard handler somewhere is intercepting keys before the input.

**Fix:** Use plain `<input type="text">` elements with explicit `oninput` handlers that update `gameState`. Never wrap in `<form>`. Test by opening DevTools, focusing each input, typing, and verifying the displayed value updates.

**Acceptance:** Open the game, walk through setup. The player-name field, the wagon-name field, and the seven team-member-name fields all accept keyboard input and persist their values to gameState. Test in Single, Cooperative, and Competitive modes.

## 1.2 — Wagon icon moves backwards

**Symptom:** The animated wagon SVG on the mini-map (and in scenes) renders or animates in the wrong direction — moving leftward when it should move rightward, or showing its rear when it should show its front.

**Likely causes:**
- A `transform: scaleX(-1)` somewhere in the CSS, possibly applied conditionally based on space index.
- The SVG was authored with the wagon facing left and the path animation moves rightward, creating reversed apparent motion.
- The `transform-origin` is wrong on a rotation, causing the wagon to pivot incorrectly.
- The wagon SVG path uses negative coordinates that flip on certain transforms.

**Fix:** Author the wagon SVG with the wagon facing RIGHT (canvas top higher on the right side, ox to the right of the wagon body). Verify by rendering it at rest before applying any transforms. Then apply translation (no scaling) to move it along the trail. Wheels rotate via their own animation independent of wagon position.

**Reference SVG (use exactly this):**

```html
<svg viewBox="0 0 90 60" width="90" height="60" class="player-wagon" aria-label="Covered wagon pulled by an ox">
  <g class="ox-walk">
    <ellipse cx="76" cy="38" rx="14" ry="8" fill="#5C4A36"/>
    <ellipse cx="84" cy="34" rx="6" ry="5" fill="#5C4A36"/>
    <polygon points="89,32 86,28 86,34" fill="#5C4A36"/>
    <polygon points="85,30 82,26 83,32" fill="#5C4A36"/>
    <rect x="84" y="42" width="2" height="6" fill="#5C4A36"/>
    <rect x="78" y="42" width="2" height="6" fill="#5C4A36"/>
    <rect x="68" y="42" width="2" height="6" fill="#5C4A36"/>
    <rect x="62" y="42" width="2" height="6" fill="#5C4A36"/>
  </g>
  <line x1="62" y1="38" x2="48" y2="36" stroke="#3D2817" stroke-width="1"/>
  <rect x="6" y="29" width="42" height="14" rx="2" fill="#D4C19E" stroke="#5C4A36" stroke-width="0.8"/>
  <path d="M 6 32 Q 27 12 48 32 L 48 29 L 6 29 Z" fill="#FBF6F0" stroke="#5C4A36" stroke-width="0.8"/>
  <line x1="12" y1="16" x2="12" y2="29" stroke="#5C4A36" stroke-width="0.5" opacity="0.4"/>
  <line x1="20" y1="14" x2="20" y2="29" stroke="#5C4A36" stroke-width="0.5" opacity="0.4"/>
  <line x1="27" y1="12" x2="27" y2="29" stroke="#5C4A36" stroke-width="0.5" opacity="0.4"/>
  <line x1="34" y1="14" x2="34" y2="29" stroke="#5C4A36" stroke-width="0.5" opacity="0.4"/>
  <line x1="42" y1="16" x2="42" y2="29" stroke="#5C4A36" stroke-width="0.5" opacity="0.4"/>
  <g class="wheel" style="transform-origin: 14px 44px;">
    <circle cx="14" cy="44" r="6" fill="#3D2817"/>
    <circle cx="14" cy="44" r="4.5" fill="#8B5A2B"/>
    <line x1="14" y1="38" x2="14" y2="50" stroke="#3D2817" stroke-width="0.8"/>
    <line x1="8" y1="44" x2="20" y2="44" stroke="#3D2817" stroke-width="0.8"/>
    <line x1="10" y1="40" x2="18" y2="48" stroke="#3D2817" stroke-width="0.8"/>
    <line x1="10" y1="48" x2="18" y2="40" stroke="#3D2817" stroke-width="0.8"/>
  </g>
  <g class="wheel" style="transform-origin: 40px 44px;">
    <circle cx="40" cy="44" r="6" fill="#3D2817"/>
    <circle cx="40" cy="44" r="4.5" fill="#8B5A2B"/>
    <line x1="40" y1="38" x2="40" y2="50" stroke="#3D2817" stroke-width="0.8"/>
    <line x1="34" y1="44" x2="46" y2="44" stroke="#3D2817" stroke-width="0.8"/>
    <line x1="36" y1="40" x2="44" y2="48" stroke="#3D2817" stroke-width="0.8"/>
    <line x1="36" y1="48" x2="44" y2="40" stroke="#3D2817" stroke-width="0.8"/>
  </g>
</svg>
```

The ox is on the right (front), wagon body on the left, wheels rotate, ox bobs. Translation moves the whole group rightward without flipping anything.

---

# Part 2 — The coupled-resource simulation system

This is the most important system in the entire game. Without this working correctly, the game will be too easy, teams will converge to similar end states, and Gabby's playtest experience (a team surviving without food) will repeat.

## 2.1 — Member state machine

Replace the current `{name, profession, alive: true}` member structure with:

```javascript
{
  name: "Dr Bill",
  profession: "Doctor",
  state: "healthy",       // healthy | weakened | sick | injured | dying | lost
  state_since_day: 1,     // day this member entered current state
  cause_of_state: null,   // optional descriptor: "starvation", "cholera", "river_drowning", etc.
  lostOnDay: null,        // null if alive
  causeOfDeath: null
}
```

The five living states are defined in `GAME_DATA.meta.simulation_system.member_states`. Each state has:
- A description
- Food/water consumption multiplier (sick members consume more water)
- Movement contribution (negative = slows the wagon)
- Whether the profession modifier is active
- Profession modifier strength (weakened members protect at 80% effectiveness)
- Death chance per turn (sick: 8%, injured: 4%, dying: 30%)
- An audio loop name (coughing, groans, oof_oof_oof — see Part 9)

The `lost` state means the member is dead. They no longer occupy a team slot for state-machine purposes but remain visible on the team strip in grayscale with their cross marker and lostOnDay.

## 2.2 — State transition rules

Transitions are evaluated **at the end of every Push On turn**, AFTER resource consumption but BEFORE the next event resolution. The full ruleset is in `GAME_DATA.meta.simulation_system.state_transitions.rules`. Apply each rule in order:

1. Check if the trigger condition is met (resource level, duration, etc.).
2. For each member matching `from_state`, roll against `probability`.
3. If the roll succeeds, transition them to `to_state` and update `state_since_day` and `cause_of_state`.

Important sub-rules:

- **Counter tracking:** maintain a `gameState.consecutive_zero_food_turns`, `consecutive_zero_water_turns`, `consecutive_zero_supplies_turns`, `consecutive_low_morale_turns`. Increment when the condition is true, reset to zero when not.
- **Doctor recovery rules** apply per-turn, per-Doctor — if multiple Doctors are alive, multiple recovery checks occur (rare with team_size 7 but possible).
- **Rest action triggers** the relevant transition rules with their `probability`.
- **Natural recovery** rules apply automatically each turn for fed and watered teams.

When a member transitions to `dying`, they have a 30% chance per turn to transition to `lost`. Members who transition from `dying` directly to `lost` should be narrated with a respectful death message in the Trail Journal — see Part 8.

## 2.3 — Resource consumption per turn

Per-turn consumption is now state-aware:

```javascript
function computeFoodConsumption(wagon, rationMultiplier) {
  let total = 0;
  for (const member of wagon.team.filter(m => m.state !== "lost")) {
    const stateMultiplier = GAME_DATA.meta.simulation_system.member_states[member.state].food_consumption_multiplier;
    total += 0.5 * rationMultiplier * stateMultiplier;
  }
  return Math.ceil(total);  // pioneers don't eat fractional rations
}
```

Same pattern for water (base 0.7 per member, sick members consume 2x), supplies (base 0.2 per turn).

**On Bare Bones rations**, food consumption is 0 — the team doesn't eat at all that turn. This is intentional starvation. Combine Bare Bones with state-transition rules and a team that stays on Bare Bones too long will start collapsing.

**On Filling rations**, food consumption is 2x base — the team eats well but burns through stores.

## 2.4 — Resource threshold effects

Beyond the state-transition rules, monitor resource levels for additional effects:

- **Food at 0:** Apply state transition rules. Show the persistent "STARVING" indicator in red on the resource ribbon.
- **Water at 0:** Apply state transition rules (water effects are stronger than food). Show "DEHYDRATING" indicator.
- **Supplies at 0:** Wagon condition degrades — apply the configured supply-zero state transitions. Show "DESPERATE" indicator.
- **Morale below 3:** 10% chance per turn one member abandons the wagon (treat as lost with narrative: "{name} could not bear the trail any longer. They turned back at first light.")
- **Morale below 1:** 25% chance per turn the team has an argument and loses 1 day to camp infighting.
- **Morale at or above 8:** +1 movement on Push On. The team is energized.
- **Health below 3:** -1 movement modifier on Push On. The wagon is battered.

Health is no longer the gate to death. It is now a continuous status indicator that affects pace. Most member deaths now flow through the state machine, not through health hitting zero. The old "Health = 0, lose member, restore to 5" rule still exists as a fallback for catastrophic events (river drownings, etc.) but should rarely trigger in normal play.

## 2.5 — Profession modifier degradation

When a profession-protective modifier is checked (Doctor blocks Cholera death, Carpenter blocks supply loss in storms, etc.), the check now requires:

1. A team member with that profession exists.
2. That member's state is `healthy`, `weakened`, OR (if `weakened`) the protection works at 80% strength.
3. Members in states `sick`, `injured`, or `dying` provide NO protection.

**This is the core teaching mechanic of the simulation.** A Doctor who gets sick can no longer save anyone. A Hunter who is injured cannot bring back the buffalo. The team must protect their protectors.

When checking modifiers in event resolution (Part 7), iterate through living members and check their state. For weakened members, apply the `profession_modifier_strength` (0.8). For sick/injured/dying members, skip them as if they weren't there.

## 2.6 — Death rate calibration

The simulation should produce these target rates across many plays:

- **35-45% of wagons reach Oregon City** (the rest are eliminated, lose to winter, or stop)
- **55-70% of wagons lose at least one member**
- **10-15% of wagons are eliminated entirely** (all 7 members lost)
- **Average members lost per journey: 1.5 to 2.5**

If the live-tested numbers fall outside these ranges, tune the JSON constants — specifically the state transition probabilities and the resource consumption rates. Do not tune by adding floors or rubber-banding.

## 2.7 — Path divergence

The simulation should naturally produce divergent end-states. Two teams with different professions and Pace+Ration choices should look visibly different by turn 12-15. Verify divergence is occurring by:

- Tracking each team's Pace+Ration percentages (% time in each setting)
- Tracking each team's resource trajectory (vector over time)
- Tracking each team's member-state trajectory

If divergence is collapsing (multiple test runs converge to similar end states), the simulation has a hidden floor. Common culprits: events with large resource gains that wipe out earlier deficits, profession bonuses that are too forgiving, recovery rules that fire too often.

---

# Part 3 — UI: scene-as-canvas architecture

The original UI placed scenery, narration, and choices in stacked boxes. This produced a flat, disconnected feel. Replace it with **scene-as-canvas**: the screen is a single composed scene, with overlays.

## 3.1 — Layout structure

The game viewport is divided into four zones, layered as follows (CSS z-index ascending):

```
┌──────────────────────────────────────────────────────────┐
│ [ Resource Ribbon ]      [ Calendar ]    [ Audio Toggles] │ ← Top strip (z=100)
├──────────────────────────────────────────────────────────┤
│                                                          │
│                                                          │
│   ┌────────────────────────────────────────────────┐    │
│   │                                                 │    │
│   │       SCENE CANVAS (region backdrop +          │    │ ← Main canvas (z=10)
│   │       characters + animated elements)          │    │
│   │                                                 │    │
│   │   ┌──────────────────────────────────┐         │    │
│   │   │                                   │         │    │ ← Narrative callout
│   │   │  Event title + flavor + choices   │         │    │   (z=50, semi-transparent)
│   │   │                                   │         │    │
│   │   └──────────────────────────────────┘         │    │
│   │                                                 │    │
│   │  [ wagon icon, animated ]                       │    │
│   │                                                 │    │
│   └────────────────────────────────────────────────┘    │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ [ Team Strip — 7 portraits horizontal ]                  │ ← Bottom strip (z=100)
├──────────────────────────────────────────────────────────┤
│ [ Mini-map ]              [ Action Buttons ]             │ ← Action bar (z=100)
└──────────────────────────────────────────────────────────┘
```

The **resource ribbon** at the top is a thin horizontal strip with 7 resource icons + values (Food, Water, Supplies, Money, Health, Morale, Movement) plus the current Day/Date. Each value is small but always visible. Color-coded warnings appear when thresholds are crossed (red glow when food/water = 0).

The **scene canvas** fills the main viewport. It contains the region backdrop (Plains, Mountains, Forest, etc.), the player's wagon, any characters present in the current scene, and animated elements (rain, dust, dice rolls, etc.). The narrative callout floats on top of the scene at the lower-center, semi-transparent (rgba(251,246,240,0.94)) with a soft drop shadow.

The **team strip** at the bottom shows all 7 team portraits in a horizontal row. Each is roughly 60px wide. The currently-acting member (if any) glows. Sick members have a coughing audio icon. Lost members are grayscaled with a cross.

The **action bar** at the very bottom holds the mini-map (left) and the four action buttons during action selection (Push On / Hunt / Rest / Forage), or the Continue button during event resolution.

## 3.2 — The scene canvas in detail

The scene canvas is a layered SVG composition:

```html
<div class="scene-canvas">
  <svg class="scene-backdrop" viewBox="0 0 800 500" preserveAspectRatio="xMidYMax slice">
    <!-- Region scenery (Plains, Mountains, etc.) -->
    <!-- Region-specific decorations (buffalo, mountains, pine trees, etc.) -->
    <!-- Hidden historical figure (when at a landmark) -->
    <!-- Animated ambient elements (clouds, birds) -->
  </svg>
  <svg class="scene-characters" viewBox="0 0 800 500" preserveAspectRatio="xMidYMax slice">
    <!-- The wagon (always present, position based on scene type) -->
    <!-- Team members involved in the current scene (named, with profession accessories) -->
    <!-- Other actors (Pawnee family, bandits, river-crossing helpers, etc.) -->
  </svg>
  <div class="scene-overlay">
    <!-- The narrative callout -->
    <!-- Region transition banner -->
    <!-- "Something Unexpected" surprise banner -->
  </div>
</div>
```

Layered SVGs allow us to swap backdrops while keeping characters consistent, and vice versa.

## 3.3 — The narrative callout

The narrative callout is the focal interaction element. It floats on the scene and contains:

- **Intro line** (italic 28px serif, deep rose, centered, fade-in over 0.4s)
- **Flavor text** (italic 18px serif, warm brown, centered, fade-in over 0.4s after intro)
- **Choice buttons OR Continue button** at the bottom of the callout

Styling:

```css
.narrative-callout {
  background: linear-gradient(to bottom, rgba(251,246,240,0.96) 0%, rgba(251,246,240,0.88) 100%);
  border: 1.5px solid rgba(184, 87, 112, 0.35);
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(61, 40, 23, 0.18), 0 0 0 1px rgba(255,255,255,0.5) inset;
  padding: 24px 32px;
  max-width: 580px;
  margin: 0 auto;
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  backdrop-filter: blur(2px);
}
```

The callout is **semi-transparent** so the scene shows through it slightly — this is what creates the "we are in the world" feel rather than "we are reading a book". The backdrop-filter blur creates a frosted-glass effect.

## 3.4 — Resource ribbon detail

The top strip is a thin horizontal bar (~50px tall) with the 7 resources displayed as icon + value pairs. Each resource has its own color and SVG icon:

- **Food** (cream/orange dot, wheat icon)
- **Water** (blue dot, drop icon)
- **Supplies** (brown dot, crate icon)
- **Money** (gold dot, coin icon)
- **Health** (red dot, heart icon)
- **Morale** (yellow dot, star icon)
- **Movement** (rose dot, arrow icon)

When a value changes, the number rolls up or down over 0.4s with a flash background (pale green for gains, pale red for losses).

When a value hits 0 (food, water, supplies), the icon pulses red and a small text indicator appears: "STARVING", "DEHYDRATING", "DESPERATE".

The Calendar shows "Day [N] — [Month] [Day], 1848" right of center. As days pass it updates with a brief number-roll animation.

The Audio Toggles (sound effects mute, music mute) are on the far right.

## 3.5 — Team strip detail

The bottom strip shows the 7 team portraits (or fewer if some are lost) in a horizontal row. Each portrait is roughly 60px wide × 80px tall, including the name label below. Layout:

```html
<div class="team-strip">
  <div class="team-portrait state-healthy" data-member="0">
    <svg class="portrait-svg">[face + profession accessories]</svg>
    <div class="member-name">Dr Bill</div>
    <div class="member-state-icon">[optional state indicator: cough icon, bandage icon, ✝]</div>
  </div>
  <!-- repeated for all 7 -->
</div>
```

State styling:

- **healthy:** full color, no special markings
- **weakened:** desaturated 30%, small "..." breath indicator
- **sick:** desaturated 50%, animated cough cloud icon, soft red glow
- **injured:** small bandage overlay, soft red glow
- **dying:** strong desaturation, pulsing red glow, prominent state icon
- **lost:** full grayscale, opacity 0.4, cross icon, "✝ Day [N]" small text

The currently-acting member (the hero of the current scene) glows with the deep-rose pulse animation. This visually identifies who's on screen.

## 3.6 — Action bar detail

During action selection (start of a Push On turn before dice roll), the action bar shows four large buttons in a row:

```
[ Push On ]  [ Hunt ]  [ Rest ]  [ Forage ]
```

Each button is ~120px wide × 60px tall, with a profession-bonus subtitle in small italic text below the action name when applicable:

```
┌─────────────────┐
│    Push On      │
│ Roll the dice   │
│ and travel west │
└─────────────────┘
```

```
┌─────────────────┐
│      Hunt       │
│ Hunter Forest   │
│ John active     │  ← profession bonus shown when Hunter on team
└─────────────────┘
```

During event resolution, the action bar collapses to a single Continue button (or the choice options replace the action buttons when in a choice scene).

## 3.7 — Mini-map detail

A small permanent fixture in the bottom-left of the action bar (~250px wide × 80px tall):

```
┌───────────────────────────────────────────┐
│  Stop 6 of 25 — Platte River Valley       │
│ ●─●─●─●─●─🚂──●─●─●─●─●─●─●─●─●─●─●─●─● │  ← S-curve simplified to one line
└───────────────────────────────────────────┘
```

The wagon icon (small SVG, same design as the canvas wagon) sits at the current space. When the wagon advances, it slides smoothly to the new space over 0.8 seconds. The label below updates with current space name.

In Competitive mode, multiple wagon icons appear at their respective spaces in different canvas-top colors.

## 3.8 — Best-practice UI principles being applied

For Nicholas — the design choices here are deliberate, grounded in established interactive narrative game design:

- **Single focal point** (the scene canvas) creates clear hierarchy. Players know where to look.
- **Persistent peripheral status** (resource ribbon, team strip, calendar) means players can always answer "how am I doing?" without leaving the scene.
- **Spatial consistency** (resources always top, team always bottom, mini-map always bottom-left) builds quick mental models. Players don't hunt for information.
- **Semi-transparent callouts** (narrative + frosted glass) keep the world visible during text moments — preventing the "reading a screen" disconnection.
- **State-driven visual feedback** (sick portraits, dying glows, lost grayscale) communicates simulation state without requiring inspection.
- **One-tap action selection** (the four action buttons) reduces friction. Players act, they don't navigate menus.

These are the same principles behind games like Reigns, 80 Days, Monument Valley, and Florence — all of which prioritize feel over mechanics.

---

# Part 4 — Setup flow

Five screens, in order. Use period-voice copy throughout — this is the opening of the game and sets the tone.

## Screen 1 — Choose journey length

Title (32px serif): **"How Far Will You Travel?"**

Two large cards side-by-side, each with an SVG illustration:

- **Short Journey** — illustration of a small wagon. *"About 15 minutes. 25 stops along the trail. Perfect for one class period."*
- **Extended Journey** — illustration of a longer wagon train. *"About 40 minutes. 50 stops along the trail. The full crossing of America."*

Card click selects and stores `gameState.trailLength`, plays a soft chime, and advances.

## Screen 2 — Choose game mode

Title: **"Choose Your Game"**

Three cards, each with an SVG illustration:

- **Single Player** — *"One player, one wagon, one journey. The classic Oregon Trail experience."*
- **Cooperative** — *"All players share one wagon. Survive together. Talk through every choice."*
- **Competitive** — *"Each player runs their own wagon. First to Oregon wins. But survival matters more than speed."*

## Screen 3 — Number of wagons (Competitive only)

Skipped for Single and Cooperative. For Competitive: three cards: **2 / 3 / 4 wagons**, with note: *"More wagons means longer turns. Pick what fits your class period."*

## Screen 4 — Outfit your wagon

Title: **"Outfit Your Wagon — Wagon [N] of [Total]"**

Top section, two text inputs:
- **"What's your name?"** — required, accepts keyboard input correctly (see Part 1.1).
- **"Name your wagon"** — defaults to `"[Player]'s Wagon"` after the first name input is filled. Editable.

Middle section, team selection:

Subtitle: **"Choose Your Team of 7"**
Body: *"You have 23 people who want to come west. You can only take 7. Each person brings a skill that may save your wagon — or be lost when disaster strikes. Choose wisely. Once you're on the trail, you cannot recruit more."*

Below, a 5×5 grid of profession cards (with one slot empty since 23 = 5×4+3). Each card:
- Profession portrait SVG (full character, not just face — see Part 5.6)
- Profession name in serif
- Two skills in small text below

Click toggles selection. Selected cards show a deep-rose border, deep-rose tint overlay, and a circled number badge (1-7) in the top-right indicating selection order. The counter at the top updates: "Selected: N of 7" (turns green at 7).

After 7 are selected, the **Confirm Team** button appears at the bottom. Clicking it transitions to the naming sub-screen.

Naming sub-screen:

Subtitle: **"Name Your Team"**
Body: *"These are real people. Give them real names — your family, your friends, your favorite characters. They will appear in your story when the journey is done."*

Vertical list of 7 chosen professions with name inputs next to each:

```
[Doctor portrait] Doctor: [____________]
[Hunter portrait] Hunter: [____________]
...
```

Default values: "Member 1", "Member 2", etc. Empty values auto-fill on submit.

**Confirm Team** advances to the next wagon (or to Screen 5).

## Screen 5 — Ready to roll

Title: **"The Trail Awaits"**

Subtitle (italic period voice): *"April 15, 1848. The wagons are loaded. The oxen are yoked. The road west is open."*

Below, a recap card per wagon:
- Wagon name and player name
- The 7 chosen professions as small portrait icons in a row
- Pace/Ration starting values: *"Starting at Steady pace, Meager rations."*

Big button at the bottom: **"Begin Journey"**.

Clicking Begin Journey:
1. Initializes the AudioContext (browsers require this on user interaction)
2. Plays a triumphant arpeggio sound effect
3. Transitions to the main game UI with a fade

---

# Part 5 — Character system

This is the upgrade Gabby asked for: she wants to **see** her chosen team members in the scenes, not just as abstract icons in a side panel.

## 5.1 — Character SVG specification

Every profession has TWO character renderings:

- **Portrait SVG** (~48×56px): face only with profession accessories, used in the team strip
- **Full-body SVG** (~72×120px): standing figure with profession accessories, used in scenes

Both renderings should be recognizable as the same character. Use consistent skin tones and accessories.

The full-body figure is a simplified silhouette: head + torso + legs + profession accessory. Stand facing 3/4 view (slightly toward the camera) so we can see their face and their accessory.

**Reference full-body figure (base, before accessories):**

```html
<svg viewBox="0 0 72 120" width="72" height="120" class="character">
  <!-- Skin tone variant via CSS class: .skin-light, .skin-medium, .skin-dark -->
  
  <!-- Head -->
  <circle cx="36" cy="20" r="13" class="skin"/>
  
  <!-- Eyes (blink slowly) -->
  <g class="eye-blink">
    <ellipse cx="32" cy="19" rx="1.4" ry="1.8" fill="#3D2817"/>
    <ellipse cx="40" cy="19" rx="1.4" ry="1.8" fill="#3D2817"/>
  </g>
  
  <!-- Mouth -->
  <path d="M 32 24 Q 36 26 40 24" stroke="#3D2817" stroke-width="0.8" fill="none"/>
  
  <!-- Neck -->
  <rect x="33" y="32" width="6" height="6" class="skin"/>
  
  <!-- Torso (clothing color varies by profession) -->
  <path d="M 22 38 L 50 38 L 52 78 L 20 78 Z" class="torso"/>
  
  <!-- Arms -->
  <path d="M 22 40 L 14 70 L 18 72 L 26 44 Z" class="torso"/>
  <path d="M 50 40 L 58 70 L 54 72 L 46 44 Z" class="torso"/>
  
  <!-- Hands -->
  <circle cx="16" cy="71" r="3" class="skin"/>
  <circle cx="56" cy="71" r="3" class="skin"/>
  
  <!-- Legs -->
  <rect x="24" y="78" width="10" height="36" class="pants"/>
  <rect x="38" y="78" width="10" height="36" class="pants"/>
  
  <!-- Boots -->
  <ellipse cx="29" cy="116" rx="6" ry="3" fill="#3D2817"/>
  <ellipse cx="43" cy="116" rx="6" ry="3" fill="#3D2817"/>
  
  <!-- Profession-specific overlays go here -->
</svg>
```

Skin tones (assigned randomly per character at creation):
- `.skin-light` → `#F4D2A8`
- `.skin-medium` → `#E8B888`
- `.skin-dark` → `#C89868`

Torso colors vary by profession (see 5.2 below). Pants are universal `#5C4A36` brown.

## 5.2 — Profession-specific overlays

For each of the 23 professions, add specific accessories. Examples:

- **Doctor:** Blue cap with red cross. Stethoscope around neck (curve hanging down). Black bag at side. Torso color: white.
- **Hunter:** Brown wide-brim hat. Bow strap across chest. Quiver of arrows on back. Torso: tan/brown.
- **Cowboy:** Tan cowboy hat (wide brim). Bandana around neck. Boot spurs. Torso: dark blue.
- **Cook:** Tall white chef hat. Apron over torso. Wooden spoon in one hand. Torso: white apron over dark gray.
- **Carpenter:** Brown work cap. Hammer in one hand. Tool belt. Torso: blue work shirt.
- **Blacksmith:** No hat, dark hair. Leather apron. Hammer in one hand. Torso: dark gray + leather apron.
- **Guide:** Wide hat with feather. Compass in one hand. Torso: brown leather coat.
- **Farmer:** Straw hat. Wheat sheaf in one hand. Torso: faded blue overalls.
- **Scout:** Coonskin cap. Spyglass in one hand. Torso: green jacket.
- **Trapper:** Fur hat. Fishing pole / hook on belt. Torso: brown fur coat.
- **Merchant:** Black bowler hat. Coin pouch at side. Torso: brown vest over white shirt.
- **Seamstress:** No hat, hair in bun. Sewing needle in one hand, thread spool. Torso: light pink dress.
- **Musician:** Small cap. Fiddle in one hand, bow in other. Torso: maroon vest.
- **Artist:** Beret. Paintbrush in one hand, palette in other. Torso: cream smock.
- **Language Teacher:** Spectacles. Open book in one hand. Torso: dark green coat.
- **Politician:** Top hat. Speech scroll in one hand. Torso: black suit + white shirt.
- **Banker:** Top hat. Small money bag in one hand. Torso: gray suit.
- **Actor:** Theater mask in one hand. Flowing scarf. Torso: red velvet jacket.
- **Fashion Designer:** Stylish hat. Measuring tape around neck. Torso: bright pink dress.
- **Magician:** Top hat (with star on side). Wand in one hand. Torso: black cape over white shirt.
- **Influencer:** Stylish wide-brim hat. Microphone in one hand. Torso: bright bandana shirt.
- **Food Critic:** Bowler hat. Fork and spoon crossed in one hand. Torso: dark suit.
- **Priest:** No hat, short hair. White collar. Cross necklace. Bible in one hand. Torso: black robe.

For each character, build the SVG once at character creation (during setup naming step), store it in `member.svgFullBody` and `member.svgPortrait`, then reuse throughout the game.

## 5.3 — Characters in scenes

When a scene fires (Hunt, Forage, Rest, Ford, Caulking, Ferry, Native Guide, Bandits, etc.), the **relevant team member's full-body figure appears in the scene**. The scene composition logic:

- Identify which profession is the "hero" of the scene (Hunt → Hunter; Cholera → Doctor or Cook; River fording → Scout; etc.)
- Find the team member with that profession (use selection priority if multiple).
- If they exist and are alive (state != lost) and not too sick (state != dying), render their full-body SVG in the scene.
- For events that involve the whole team (Rest, Wolves, Storm, Buffalo Encounter), render 2-4 team members in different positions.

Always render the wagon in the scene as well (smaller, off to one side or in the background).

The hero character's portrait in the team strip glows with the deep-rose pulse during the scene (already specced).

## 5.4 — Scene composition examples

**Hunt scene:**
```
[Plains backdrop with buffalo silhouette in distance]
[Wagon parked off to the right]
[Hunter character with bow drawn, in left foreground]
[Narrative callout below: "Forest John crawls through the grass for an hour..."]
```

**Cholera scene with Doctor:**
```
[Plains/foothills backdrop, dim/somber palette]
[Wagon in background with smoke from chimney]
[Doctor character standing at center, beside a small tent]
[Narrative callout: "Dr Bill works through the dark hours..."]
```

**River fording scene:**
```
[River backdrop with rapids visible]
[Wagon mid-river, water around wheels]
[Scout character pointing to the safe path, in front of the wagon]
[Multiple team members visible on the wagon]
[Narrative callout below]
```

**Ferry scene (per Gabby's request):**
```
[River backdrop]
[Ferry barge in the middle of the river]
[All 7 team members visible, standing on the ferry with luggage]
[Wagon on the ferry too]
[Animated: ferry slides slowly across the screen left-to-right over 4 seconds]
[Narrative callout below]
```

**Caulk and Float scene (per Gabby's request):**
```
[River backdrop]
[Wagon converted to a small boat, sealed with tar]
[Team members visible on the wagon-boat, holding poles]
[Animated: wagon-boat floats slowly across the screen]
[Narrative callout below]
```

**Native Guide scene (per Gabby's request):**
```
[River or trail backdrop]
[Native American guide figure (respectful representation: simple silhouette, distinctive but not stereotyped)]
[Language Teacher character (if on team) standing next to the guide, both pointing west]
[Wagon visible in background]
[Narrative callout: "{Language Teacher name} speaks a few halting words..."]
```

**Bandit ambush scene:**
```
[Foothills or rocky terrain backdrop]
[Three bandit silhouettes on a ridge, faces wrapped]
[Wagon stopped, team visible: Cowboy and Hunter in front (if present), with rifles ready]
[Narrative callout: pre-quiz intro]
[After quiz: outcome scene varies]
```

**Rest scene (per Gabby's "snoring + closing eyes" request):**
```
[Current region backdrop, slightly dimmed]
[Wagon stopped, team visible lying around campfire, sleeping]
[Z's floating up from each character (CSS animation)]
[Eyelid closing effect: two horizontal black bars slide from top and bottom toward the middle, leaving a horizontal slit. Holds for 1.5s, then opens.]
[Snoring sound effect plays softly during the eye-close]
[Narrative callout: "Day 23. We made camp early. Bedrolls in the shade, songs by the fire."]
```

**Hunt scene with visible quarry (per Gabby's "let us see what we are hunting" request):**
```
[Plains backdrop]
[Foreground: Hunter character with bow drawn, partially crouched]
[Mid-ground: a buffalo or deer silhouette grazing — VISIBLE, the player can see what they're hunting]
[Wagon in background, off to one side]
[Narrative callout below]
```

**Forage scene (per Gabby's "show us where we are foraging" request):**
```
[Current region backdrop]
[Foreground: Farmer or relevant character bent down examining wild plants]
[Plants/berries visible: small berry bush, wild onion, etc.]
[Wagon in background]
[Narrative callout below]
```

## 5.5 — Setup screen team grid

On Screen 4 (team selection), the 23 profession cards each show their full-body SVG (smaller, ~80px tall) so kids see the actual character they're choosing, not just a name. This is the moment Gabby's team-selection investment pays off.

Card layout:
```
┌─────────────────┐
│   [character]   │
│      Hunter     │
│  Forage · Hunt  │
└─────────────────┘
```

When selected, the card border becomes deep rose, a tint overlay applies, and the selection number appears in the top-right.

## 5.6 — Team strip portraits

The team strip at the bottom shows portrait-sized SVGs (face only with profession accessory), not full-body. This is for compactness — 7 portraits in a row needs to fit comfortably.

When a member's state changes (becomes sick, dying, lost), the portrait updates accordingly.

---

# Part 6 — Region scenery

Five region backdrops. Each is a full-canvas SVG with multiple parallax layers. Use the SVGs from prior amendment Part 15 as a starting point but enhance them with subtle animation.

## 6.1 — Plains scenery

Pale gold sky gradient. Distant horizon line. Rolling prairie grass at the bottom. Animated elements: a small distant buffalo silhouette grazes (slowly walks left-to-right in the mid-ground over 30s, loops). Tall prairie grass silhouettes at the very bottom edge.

Optional: a small bird silhouette flies across the sky every ~20 seconds.

## 6.2 — Foothills scenery

Soft rolling brown hills. Lower contrast. A few scattered trees. Animated elements: trees sway gently. A distant deer silhouette appears occasionally on a hilltop.

## 6.3 — Mountains scenery

Dramatic snow-capped peaks. Cool purple-gray palette. Multiple parallax mountain layers. Animated elements: clouds drift slowly behind the peaks. Snowflakes fall sparsely (only when in winter conditions, day > 130).

## 6.4 — High desert scenery

Flat mesa silhouettes. Sparse sagebrush dots. Dusty palette. Animated elements: heat shimmer effect (subtle wavy distortion at the horizon). Dust devil occasionally appears (small spinning tornado, 3-second animation).

## 6.5 — Forest/Pacific scenery

Layered pine trees in deep green. Cool, lush palette. Suggestion of mountains beyond. Animated elements: trees sway. Salmon jumps in a distant stream (rare, eye-catching).

## 6.6 — Region transitions

When the wagon crosses a region boundary:
1. The current scenery fades out over 0.6 seconds.
2. The new scenery fades in.
3. A region banner slides down from the top of the canvas: *"You enter the [Region Name]"* — auto-hides after 3 seconds.
4. A subtle wind chime sound effect plays.

## 6.7 — Ambient region audio

Each region has a quiet ambient audio loop:
- **Plains:** gentle wind, distant bird calls
- **Foothills:** wind, occasional hawk
- **Mountains:** stronger wind, distant rockfall
- **High Desert:** dry wind, locusts
- **Forest:** birds, distant water

These loop quietly under any other audio. Volume: 0.15 (very quiet, atmospheric).

---

# Part 7 — Action scenes and events

Every action and every space-type resolution is now a SCENE — not a menu. Implementation pattern:

1. Player selects an action or arrives at a space.
2. Scene composes (backdrop appropriate to context + characters + animated elements).
3. Optional brief animation plays (dice roll, river splash, fire spark, etc.).
4. Narrative callout slides in from the bottom of the scene.
5. Choice buttons or Continue button appear at the bottom of the callout.
6. Player decides.
7. Outcome resolves (resource changes, state transitions).
8. Scene transitions to next state.

## 7.1 — Push On (default action)

1. Backdrop: current region.
2. Wagon visible mid-canvas.
3. Dice animation: a 3D-ish die appears next to the wagon (CSS-flipped cube), shakes 3x over 0.5s, lands on a number.
4. Wagon slides forward to the new space (0.8s).
5. New space narration begins (event/choice/landmark/etc.).

## 7.2 — Hunt (per Gabby's "let us see what we are hunting" request)

1. Backdrop: current region.
2. Hunter character (if on team) appears in foreground crouched with bow drawn.
3. Buffalo or deer silhouette visible in mid-ground.
4. Brief animation: arrow flies from Hunter to quarry. Quarry falls or runs based on outcome.
5. Narrative callout: success or failure narrative.

If no Hunter on team, a generic team member appears with the rifle but with different (worse) outcomes.

## 7.3 — Rest (per Gabby's "snoring + closing eyes" request)

1. Backdrop: current region, slightly darkened.
2. Wagon stopped center-canvas. 4-7 team members visible lying around an animated campfire.
3. Z's float up from each sleeping character (CSS animation, 2s loop).
4. Snoring sound effect plays softly (Web Audio: low-frequency rhythmic noise burst, ~3 seconds, repeats 2x).
5. Eyelid effect: two horizontal black bars slide from top and bottom of the canvas toward the middle, leaving a horizontal slit. Hold for 1.5s. Then bars retract.
6. Narrative callout: rest narrative with state transition results.

## 7.4 — Forage (per Gabby's "show us where we are foraging" request)

1. Backdrop: current region.
2. Farmer character (if on team) bent down examining plants in foreground.
3. Visible foragable items: berry bush, wild onions, herb plants.
4. Brief animation: character picks items, places in basket.
5. Narrative callout: success or failure narrative.

## 7.5 — River crossing scenes (Gabby explicitly listed all four)

### 7.5.1 — Ford the River
1. Backdrop: river scene (full canvas blue water, far bank visible).
2. Wagon mid-river, animated: bobs gently, water effects around wheels.
3. Team members visible on wagon (4-5 silhouettes).
4. Scout character (if on team) in front of wagon, pointing to safe path.
5. Heavy river sounds (Web Audio: filtered noise + low-frequency rumble, looped).
6. Animation: wagon slowly crosses screen left-to-right over 3 seconds.
7. Outcome resolves with narrative.

### 7.5.2 — Caulk and Float
1. Backdrop: river scene.
2. Wagon now visibly sealed (canvas top tied tighter, tar lines visible).
3. Team members on the wagon-boat, holding poles.
4. Animation: wagon-boat floats slowly across screen, tilting slightly as it goes.
5. Narrative callout below.

### 7.5.3 — Hire Ferry (per Gabby's "see your team and luggage and ferry canoe" request)
1. Backdrop: river scene.
2. Animation: ferry barge appears from off-screen left.
3. Team members board (animated: small figures walk from wagon to ferry).
4. Wagon rolls onto ferry.
5. Ferry slides slowly across the screen left-to-right over 4 seconds.
6. Team disembarks on far side.
7. Narrative callout below.

### 7.5.4 — Native Guide (per Gabby's "see someone pointing and the first character standing next to navigator" request)
1. Backdrop: river scene.
2. Native American guide figure stands at the bank (respectful representation).
3. Language Teacher character (if on team) stands beside the guide, both pointing west.
4. If no Language Teacher, a generic team-leader figure stands beside the guide.
5. Animation: guide leads team across the river slowly.
6. Narrative callout below.

For all four, after crossing, the scene transitions back to the trail backdrop.

## 7.6 — Storm scene (per Gabby's "show rain falling" request)

1. Backdrop: current region with storm overlay.
2. Rain effect: 50-100 small rain droplets falling diagonally across the canvas (CSS animation, fast).
3. Lightning flashes occasionally (white screen flash for 0.1s).
4. Wagon visible, team huddled inside.
5. Heavy rain sound (Web Audio: filtered noise loop with thunder cracks).
6. Narrative callout below.

## 7.7 — Bandit ambush scene (per Gabby's request — also the final exam)

1. Backdrop: foothills near journey's end.
2. Three bandit silhouettes on a ridge, faces wrapped, rifles visible.
3. Wagon stopped center-canvas. Team visible: Cowboy and Hunter in front (if on team) with their weapons drawn.
4. Tense music plays.
5. Narrative callout: pre-quiz intro from `GAME_DATA.bandit_ambush.intro`.
6. Continue button reveals quiz.
7. Quiz: 5 multiple-choice questions, drawn from `historical_facts` the team has been shown.
8. Each question is one screen: question text, 4 answer options, 45-second timer (visible as a bar that depletes).
9. After all 5 answered, outcome is computed per `GAME_DATA.bandit_ambush.quiz_outcome_table`.
10. Outcome scene plays: success = bandits ride off; failure = gunfight + member loss.
11. Profession bonuses applied per `GAME_DATA.bandit_ambush.profession_protection`.
12. Trail Journal updated with full quiz performance and outcome.

This is the climactic moment of the game. Pace it slowly. Use suspense.

## 7.8 — Fort visit scene

1. Backdrop: appropriate region for fort location.
2. Fort silhouette visible mid-canvas (log walls, flag).
3. Wagon parked outside fort.
4. Team members visible going to/from fort.
5. Fort options menu appears as a callout: Buy Supplies / Repair / Rest / News / Move On / Send Letter (new).

When player selects an action, scene shifts subtly to show that action (Buy Supplies → trader figure appears at fort entrance with goods displayed; Rest → team visible relaxing).

## 7.9 — Landmark visit scene

1. Backdrop: appropriate region.
2. Landmark element visible (Independence Rock, Chimney Rock, Soda Springs bottle, Blue Mountains in background, etc.).
3. Hidden historical figure visible if applicable (per `GAME_DATA.hidden_figures`) — small, partially hidden in the scene, but findable.
4. Narrative callout: landmark info from JSON.
5. Did You Know card slides up from bottom with sourced fact.
6. Soft "oooh ahhh" awe sound effect plays when the fact card appears (per Gabby's request — Web Audio: filtered choral synthesis, low-pitched, 1.5 seconds).

## 7.10 — Scripted graves on the trail (per Gabby's "graves with words on them" request)

At specific spaces (per `GAME_DATA.scripted_graves`), a small grave marker is visible in the scene at the side of the trail. Clicking the grave (or auto-revealing on arrival) shows:

```
[ Stone grave marker SVG ]
[ Name: Sarah Keyes ]
[ Epitaph: Died May 29, 1846 — Aged 70 — Mother of the Donner-Reed Party ]
[ Fact: Sarah Keyes died of consumption near Alcove Spring... ]
```

Soft mournful sound effect plays when the grave is revealed.

Persistent player graves: if the player has played the game before on this computer (localStorage), graves from previous runs appear on the trail at the spaces where members were lost in those runs. This is the "trail memory" feature.

---

# Part 8 — Narrative resolution system

(This is preserved from the v1.3 amendment. Re-stated here for completeness.)

Every event has a `narratives` object with profession-specific story templates. When an event triggers:

1. Show the event's `intro` field as the dramatic opening line.
2. Show the `flavor` field below.
3. Walk the event's `modifiers` array IN ORDER. For each modifier, check if any LIVING (state != lost AND state != dying) member has that profession with a non-disabled state (healthy, weakened only — NOT sick/injured).
4. First match wins. Use that profession's narrative from `narratives` and apply that modifier's effect.
5. If no modifier matched, use `narratives.default` and apply the event's outcomes.
6. Substitute placeholders: `{Doctor}` → name of the team's healthy/weakened Doctor, `{lost_member}` → name of the random loss, etc.
7. Display the narrative as the main resolution text.
8. Apply mechanical effects AFTER the narrative is shown.

Highlight the hero member's name in deep rose italic in the narrative text. Pulse their team strip portrait with the rose glow during the scene.

When NO profession can save you (all protectors are sick/dying/lost), append a follow-up line: *"We had no [Profession] among us. The cost was paid."*

When a member dies, their card transitions to lost-state with the somber animation. The narrative names them. Continue button is delayed 2 seconds.

---

# Part 9 — Comprehensive audio system

Audio is now doing significant work. The full audio stack:

## 9.1 — Audio layers

The game has FIVE concurrent audio channels:

1. **Background music** (volume 0.10, very quiet) — songs of the trail, mood-aware
2. **Region ambient** (volume 0.15) — wind, birds, water based on current region
3. **State-driven member loops** (volume 0.20 per active loop) — coughing if any member is sick, groans if any injured, oof_oof if any dying
4. **Event sound effects** (volume 0.30) — dice, transitions, gains/losses, special moments
5. **One-shot dialogue cues** (volume 0.40) — oooh-ahhh on facts, huh on surprises, yes on victories

All channels respect the master mute toggles. Music has its own toggle separate from sound effects.

## 9.2 — Web Audio synthesis specifications

All sounds generated procedurally (no audio files). Use the Web Audio API.

### Music — songs of the trail

Already specced in v1.1 Part 14. Four songs encoded as note arrays: Oh! Susanna (1848), Sweet Betsy from Pike (1858), Buffalo Gals (1844), Shenandoah (early 1800s). Mood-aware playback.

**Add: Funeral hymn** (per Gabby's "funeral music when you die" request). Encode the melody of "Amazing Grace" (1779, public domain) as a slow note array. Plays when a member dies for the first time in a journey, and when a wagon is eliminated. Duration: ~30 seconds. After it finishes, return to the previous mood pool.

### Region ambient loops

- **Plains:** Web Audio synthesis: pink noise filtered through a low-pass at 200Hz, very low volume, with occasional bird-call frequency sweeps every 8-15 seconds (sine wave glissando, 80ms each).
- **Foothills:** Same wind base, with occasional hawk-call (descending sweep, 200ms).
- **Mountains:** Stronger wind (white noise + low-pass at 400Hz, slightly louder), with occasional rockfall thuds (low-frequency noise burst, 100ms).
- **High desert:** Dry wind (high-pass filtered noise), with insect chirps (high-frequency sine pulses, 50ms each, irregular pattern).
- **Forest:** Layered bird calls (multiple sine glissandos), distant water (low-pass noise loop).

### State-driven member loops

These play continuously while ANY team member is in the relevant state. They overlap if multiple members are in different states. Volume scales with number of members affected.

- **`coughing_sneezing`** (per Gabby's "if you are sick a sound should be coughing and sneezing" request): bursts of band-passed noise (cough = 200-400Hz burst, 200ms; sneeze = 400-800Hz sweep with sharp envelope, 300ms). Pattern: 1-2 coughs every 8-15 seconds, occasional sneeze.
- **`groans`** (injured members): low-frequency sine wave (120Hz), ADSR envelope, 800ms duration, every 15-20 seconds.
- **`oof_oof_oof`** (per Gabby's "if you are dying a sound should be 'oof oof oof'" request): three rapid low-pitched syllables — sine wave 100Hz with quick envelope, 150ms each, separated by 100ms silence. Repeats every 12 seconds while any member is in `dying` state.
- **`tired_breathing`** (weakened members): subtle filtered noise breath, 1.5s duration, every 20 seconds.

### Event sound effects (already specced, expanded)

| Effect | Trigger | Synthesis |
|---|---|---|
| Dice rattle | Movement dice rolled | 4-6 quick square-wave clicks at descending pitches |
| Resource gain | Resource increases | Two sine tones rising (C5 → E5) |
| Resource loss | Resource decreases | Two sine tones falling |
| Member lost (FIRST in game) | Triggers funeral hymn music switch | (music change) |
| Member lost (subsequent) | Card flip to grayscale | Low sine A2, slow attack/fade, 600ms |
| Choice presented | Choice screen | Soft G5 chime |
| Event drawn | Event screen | Two-tone D5+F#5 |
| River reached | Land on river | Filtered noise water-flow, 400ms |
| Heavy river ambient | While on river space | Continuous filtered noise loop, low volume |
| Fort reached | Land on fort | Bell-tower B4 with reverb decay, 600ms |
| Landmark reached | Land on landmark | Reverent rising chord D4+A4+D5, 400ms |
| Did You Know fact card | Fact card appears | "Oooh-ahhh" — low choral synthesis (multiple sine waves at 200Hz, 250Hz, 300Hz, slight detuning, 1.5s with crescendo). Per Gabby's request. |
| Wagon arrives at Oregon | Reach final space | Triumphant arpeggio C5→E5→G5→C6 |
| Independence Rock on time | Day ≤ 90 trigger | Bright two-note E5→A5 |
| Winter warning | Day 130 trigger | Low D3 warning tone with slow swell |
| Winter ending | Day 165 trigger | Funereal descending cluster |
| Wagon eliminated | All team lost | Funeral hymn music switch |
| Surprise event banner | "✦ Something unexpected ✦" | "Huh?" — confused vocal-like synthesis: rising sine (G4 to A4) with slight tremolo, 400ms. Per Gabby's request. |
| Competitive winner | One wagon beats another | "Yes!" — bright triumphant ascending arpeggio (C5→E5→G5, 80ms each). Per Gabby's request. |
| Storm/rain | During storm event | Continuous filtered noise rain loop with thunder cracks |
| Snoring | During Rest action | Low rhythmic noise bursts, 3-second cycle, plays 2x |
| Cheering at finish | Win screen | Crowd cheer synthesis: pink noise + multiple short noise bursts at varying pitches, layered, looped until Continue clicked |
| Confetti finish loop | Win screen, with cheering | Brief major-chord rolls (C5+E5+G5) at random intervals during cheering, 100ms each |
| Famous person reveal | Hidden figure spotted | Mysterious rising tone (sine 200→400Hz over 800ms) |
| Quiz question | Bandit quiz active | Soft tick metronome (square wave clicks, every second) |
| Quiz correct | Right answer in quiz | Bright bell B5 200ms |
| Quiz wrong | Wrong answer in quiz | Soft buzz (square wave 110Hz with quick envelope) |
| Day milestone | Day 30, 60, 90, 120, 150 | Soft chime announcing day count |
| Robber attack | Bandit encounter event | Sharp high pitched noise burst then low rumble |
| Funeral music | Member loss / wagon elimination | Amazing Grace melody (sine wave, very slow, 30s) |

### Sound design priorities

When multiple sounds compete:

- Music ducks during event narrations (volume drops to 0.05 while text is on screen, returns to 0.10 after).
- Region ambient is continuous unless event sound takes over (e.g., during Rest, region ambient pauses for snoring).
- State-driven loops are always present at low volume — they're informational.
- Event sound effects play at full volume momentarily.

## 9.3 — Audio implementation pattern

Build a single AudioController class that manages all five channels:

```javascript
class AudioController {
  constructor() {
    this.ctx = null;  // AudioContext, lazily initialized on first user click
    this.musicGain = null;
    this.ambientGain = null;
    this.stateLoopGain = null;
    this.sfxGain = null;
    this.cueGain = null;
    this.activeStateLoops = new Map();  // state name -> {oscillator, gain}
    this.muted = { sfx: false, music: false };
  }
  
  init() { /* lazy init on first user click */ }
  
  playSfx(name) { /* short one-shot from synthesis spec table */ }
  playCue(name) { /* longer one-shot like oooh-ahhh */ }
  
  startStateLoop(name) { /* coughing, oof_oof, etc. */ }
  stopStateLoop(name) { /* */ }
  updateStateLoops(team) { /* check team states, start/stop loops to match */ }
  
  setRegion(region) { /* swap ambient loop */ }
  setMusicMood(mood) { /* swap song pool */ }
  duckMusic() { /* music volume drops */ }
  unduckMusic() { /* music volume returns */ }
}
```

Call `audioController.updateStateLoops(currentWagon.team)` at the end of every turn — it will start/stop state loops based on current member states.

---

# Part 10 — Stochastic layer

(Preserved from v1.4 amendment. Re-stated briefly.)

- Choice cards display QUALITATIVE risk badges (Probably safe / Some risk / Risky), never exact numbers.
- Resource changes sample from triangular distributions with the JSON's spread (typically ±1 from nominal).
- Percentage chances jitter ±10% before rolling.
- Hidden luck counter (-5 to +5) tracks momentum, shifts probabilities up to ±15%. Resets at forts.
- 8% of turns trigger a SURPRISE EVENT from `GAME_DATA.surprise_events`. Banner: "✦ Something unexpected ✦" with the "huh?" sound.
- Profession protections have small residual failure (3% death even with Doctor protecting, 10% partial supply loss, 15% partial delay).
- Near-miss narrative tags when probability rolls land within 10% of threshold.

---

# Part 11 — Hidden historical figures and trail memory

## 11.1 — Hidden historical figures (per Gabby's request)

When the wagon arrives at certain landmarks (per `GAME_DATA.hidden_figures`), a small SVG figure of a real historical person appears partially hidden in the scene background. The player can click on them to reveal a small info card:

```
[ Small portrait of Jim Bridger ]
"You spot a bearded mountain man at the trading post."
Jim Bridger — 1804-1881
"A legendary mountain man who founded Fort Bridger in 1843..."
```

The figure is only partially visible (peeking from behind a tree, standing in the doorway, etc.) so finding them is a small reward for paying attention to the scene.

Famous-person reveal sound plays when found.

## 11.2 — Scripted historical graves

At specific spaces (per `GAME_DATA.scripted_graves`), a stone grave marker is visible in the scene. Auto-revealed on arrival. Shows the grave's `name`, `epitaph`, and `fact`.

These graves represent real Oregon Trail deaths (Sarah Keyes of the Donner Party, etc.) and teach history through artifact.

## 11.3 — Persistent player graves

When a member is lost in any game on this computer, persist the loss to localStorage:

```javascript
{
  trail_graves: [
    {
      space: 14,
      member_name: "Forest John",
      profession: "Hunter",
      day_lost: 42,
      cause: "cholera",
      timestamp: "2024-01-15T..."
    },
    ...
  ]
}
```

In subsequent games, when the wagon passes a space where a previous run's member died, a grave appears at that space with the previous run's name and details. This creates the eerie sense of pioneers who came before.

Limit storage to 50 most recent graves (FIFO eviction) to keep localStorage manageable.

## 11.4 — Trail memory toggle

In Settings, allow the user to clear the trail memory ("Forget all previous journeys"). Useful for clean classroom plays.

---

# Part 12 — Bandit ambush quiz finale

Detailed in Part 7.7. Additional notes:

## 12.1 — Question pool generation

When the bandit ambush triggers:

1. Walk `gameState.facts_shown_to_team` (an array maintained throughout the game, listing which `historical_facts` titles the team has been shown via Did You Know cards).
2. From those shown facts, randomly select 5 with `quiz_question` data available.
3. If the team has been shown fewer than 5 facts (rare, only for short games with few landmarks), supplement with random facts they haven't seen — but mark these clearly: "Bonus question — you didn't see this one!"

## 12.2 — Quiz UI

Each question:
- Question text in large serif italic
- 4 multiple-choice options as buttons (A/B/C/D), shuffled
- Timer bar across the bottom: 45 seconds, depletes from full to empty
- After click or timeout: brief feedback (✓ correct or ✗ incorrect), brief sound effect, 1-second pause, next question

After all 5: outcome scene plays based on score.

## 12.3 — Scoring

- 5 correct: bandits flee, no losses, +2 morale
- 4 correct: small tribute paid (1 supply), +1 morale
- 3 correct: gunfight, 1 injury, 2 supplies lost, -1 morale (Cowboy/Hunter help)
- 2 correct: 1 member lost, 3 supplies lost, -2 morale
- 1 correct: 2 members lost, 4 supplies lost, -3 morale
- 0 correct: 3 members lost, 6 supplies lost, -4 morale

Profession bonuses (per `GAME_DATA.bandit_ambush.profession_protection`) are applied AFTER the base score is computed, potentially shifting the outcome up by 1-2 tiers.

## 12.4 — Trail Journal

The bandit ambush gets a special multi-paragraph journal entry showing:
- The intro narrative
- Each question and the team's answer
- The outcome scene narrative
- A reflective closing line: *"The team had walked 2,000 miles. They had earned what they remembered."*

---

# Part 13 — Dispatch letters from forts

(New in v2.0, per Nicholas's suggestion.)

At any fort space, in addition to the existing options, add **"Send Letter Home"** with these properties:

- Costs: 1 Money
- Effect: +2 Morale (held for 3 turns), +1 Health
- Limit: 3 letters per game

When selected, the app generates a one-paragraph letter from the team to family back east, in 1840s voice. Use this template logic:

```
Pick a recipient: "Mother", "Father", "Beloved family", "Dearest sister Anne", etc. (random)

Construct a 4-6 sentence letter referencing:
- Current location (fort name)
- Days elapsed
- Team status (high-morale tone if team is well, somber if team is struggling)
- One specific recent event (cholera survived, river crossed, member lost, buffalo hunted)
- Current pace+ration strategy phrased naturally ("we eat sparingly to make the food last")

Sign with the player's name.
```

Use the `dispatch_letter_templates` patterns and tone words from JSON.

The letter is shown as a beautiful parchment-styled UI card that the player can read. Then it's saved to the Trail Journal as an artifact.

Sound effect when sending: a quill-on-paper scratching effect (filtered noise burst + short clicks).

---

# Part 14 — Teacher Mode

(New in v2.0.)

Added in Setup as a toggle: "Teacher Mode (off / on)".

When ON:
- Game plays normally.
- At end of game, in addition to the regular Trail Journal, generate a Teacher Report.
- Teacher Report is a printable HTML page (Letter portrait) with the rubric structure from `GAME_DATA.teacher_mode.report_includes`.
- "Print Teacher Report" button uses `window.print()` with a print stylesheet.

The report serves as objective evidence for grading — what the team encountered, what they decided, how they performed on the quiz, what their journal says. Teacher can grade engagement and learning outcomes.

---

# Part 15 — What If? mode

(New in v2.0.)

After end-of-game, add a "What If?" button below the score.

Logic:
1. Identify the pivotal choice during the game. Priority:
   - The choice with the largest resource swing (if a Choice event)
   - The choice that caused a member loss
   - The Independence Rock arrival timing
2. Replay JUST that scene with the alternate option taken.
3. Show the alternate narrative outcome (using the same narrative system, but with the other option's effects).
4. Compute the alternate end-game score (briefly — show a comparison: "Original: 142 / What if: 168").
5. Return to the original score screen — the original game still counts.

Use only ONCE per game. After use, the button disappears.

Narrative intro: *"What if you had chosen differently at [event_name] on Day [day]?"*

---

# Part 16 — Leaderboard

## 16.1 — Seeded benchmark scores

The leaderboard starts with 15 seeded scores from `GAME_DATA.leaderboard_seed` — historically-flavored names with realistic outcomes. These give Gabby's class targets to beat.

Display format: name, team status (e.g., "7 of 7 alive" or "ELIMINATED"), day finished, score, and an epitaph line.

## 16.2 — Persistent class scores

After every game, save the player's score to localStorage with the player name. The leaderboard merges seeded + persistent scores, sorted by score descending. Display top 20.

```javascript
{
  leaderboard: [
    { name: "Sarah J.", team_status: "6 of 7 alive", day_finished: 145, score: 158, ... },
    ...
  ]
}
```

When a player beats a score, briefly highlight the row in pink and play a celebratory chime.

## 16.3 — Reset option

Add a Settings option: "Clear leaderboard scores". Useful for fresh class periods.

---

# Part 17 — End game and finale

## 17.1 — Reaching Oregon City

When the wagon reaches space 25 (short) / 50 (extended):

1. Triumphant arpeggio sound effect.
2. Scene: Oregon City silhouette at the horizon, Willamette Valley green.
3. Team members visible in the scene, surviving members standing in front of the wagon.
4. **Cheering crowd sound effect** plays (per Gabby's "cheering and confetti" request).
5. **Confetti animation** loops continuously: 30+ small pink/gold/cream dots fall from the top of the screen with random horizontal drift, regenerating constantly.
6. Cheering and confetti continue UNTIL THE PLAYER PRESSES CONTINUE (per Gabby's request — not a one-shot).
7. Narrative callout: *"You made it. The Willamette Valley stretches before you..."*
8. Continue button below.

## 17.2 — Eliminated wagon

When all 7 members are lost:

1. Scene: barren landscape (varies by region where elimination happened), graves visible.
2. Funeral hymn music begins (Amazing Grace).
3. Slow text reveal: *"The {wagon_name} never reached Oregon. Their bones rest beneath the trail. Their story will not be forgotten."*
4. Long pause.
5. Continue button.

## 17.3 — Winter ending

When day 165 hits without finishing:

1. Scene: snow falling, mountain pass blocked.
2. Funereal music.
3. Slow text reveal: *"The first snow came in the night..."*
4. 1 random member lost (state transition to lost).
5. Continue button.

## 17.4 — Score and Trail Journal

After end-state:
1. Compute final score per JSON `scoring` rules + bonuses.
2. Show the score breakdown.
3. Show the full Trail Journal (multi-paragraph period-voice prose).
4. Buttons: "Print Journal" / "What If?" / "View Leaderboard" / "Play Again".
5. If Teacher Mode: also "Print Teacher Report".

---

# Part 18 — Acceptance criteria

The build is correct when ALL of these are true:

## Setup & basic flow
1. ✅ All input fields accept keyboard input correctly (name, wagon name, team member names) — across all three modes.
2. ✅ Setup walks through 5 screens with vivid period-voice copy.
3. ✅ Each wagon's setup captures player name, wagon name, exactly 7 distinct professions with names per persona.
4. ✅ All 23 profession cards display the full-body character SVG (not just an icon).
5. ✅ The wagon icon faces RIGHT and moves rightward — never appearing to move backwards.

## Simulation
6. ✅ Members have states: healthy, weakened, sick, injured, dying, lost.
7. ✅ Resource consumption is state-aware (sick members consume 2x water).
8. ✅ State transitions occur at end of every turn per JSON rules.
9. ✅ A team that runs zero food for 3+ turns will have members shift to weakened → sick → dying.
10. ✅ A team that runs zero water for 3+ turns will have members die FAST (water effects stronger than food).
11. ✅ A team that runs zero supplies for 2+ turns will have members weaken.
12. ✅ Sick members cannot activate their profession modifier.
13. ✅ Weakened members activate their profession modifier at 80% strength.
14. ✅ Doctor on team can recover sick members (60% chance/turn) and dying members (40%).
15. ✅ Across 20 simulated games, member loss rate is in the 55-70% range.
16. ✅ Across 20 simulated games, wagon elimination rate is in the 10-15% range.
17. ✅ Different teams with different professions and Pace+Ration choices end up in visibly different states.

## UI
18. ✅ The screen is a single composed scene canvas, not stacked boxes.
19. ✅ Resource ribbon at top, team strip at bottom, mini-map and action buttons at very bottom.
20. ✅ Narrative callouts float on the scene with semi-transparent frosted-glass styling.
21. ✅ Region scenery (Plains, Foothills, Mountains, Desert, Forest) fills the canvas and changes as the wagon enters new regions.
22. ✅ Region transitions show a banner and play a wind chime.
23. ✅ The mini-map wagon icon faces right and slides smoothly to new spaces.
24. ✅ The team strip portraits update with state changes (sick → desaturated + cough icon, dying → red glow, lost → grayscale + cross).

## Characters in scenes
25. ✅ When a Hunt action fires, the team's Hunter (named) appears in the scene with the bow, and a buffalo or deer is visible.
26. ✅ When a Rest action fires, multiple team members appear sleeping by the campfire, Z's float, snoring sound plays, eyelid effect closes the screen briefly.
27. ✅ When a Forage action fires, the relevant character appears foraging, with plants visible.
28. ✅ When a river is forded, the wagon and team are visible mid-river with the Scout pointing the way.
29. ✅ When ferry is hired, the ferry barge slides across the screen with the team and wagon visible.
30. ✅ When a Native guide is hired, the guide appears with the Language Teacher beside them.
31. ✅ When the bandit ambush triggers, three bandits are visible on a ridge with team's Cowboy/Hunter in front.

## Audio
32. ✅ Sound effects ON by default. Mute toggle works and persists in URL hash.
33. ✅ Music ON by default. Separate mute toggle works and persists.
34. ✅ Coughing sound plays continuously while any team member is sick.
35. ✅ Groans sound plays while any member is injured.
36. ✅ "Oof oof oof" sound plays while any member is dying.
37. ✅ Snoring sound plays during Rest action.
38. ✅ "Oooh ahhh" sound plays when a Did You Know card appears.
39. ✅ "Huh?" sound plays when a "Something Unexpected" surprise banner appears.
40. ✅ "Yes!" sound plays in Competitive mode when one team beats another.
41. ✅ Funeral hymn (Amazing Grace) plays when a member is lost or wagon eliminated.
42. ✅ Cheering crowd plays continuously at win screen until Continue is clicked.
43. ✅ River sounds play during river crossings.
44. ✅ Storm sounds play during storm events with rain falling on the screen.
45. ✅ Region ambient loops play softly during travel.

## Stochastic layer
46. ✅ Choice cards show qualitative risk badges, not exact numbers.
47. ✅ Resource changes vary slightly between runs (triangular distribution).
48. ✅ Hidden luck counter affects probability rolls without being shown.
49. ✅ ~8% of turns trigger a surprise event from the `surprise_events` array.
50. ✅ Surprise events display a banner and the "huh?" sound.
51. ✅ Profession protections have small residual failure (rare but possible).

## Trail memory
52. ✅ Scripted historical graves appear at their JSON-specified spaces with clickable info cards.
53. ✅ Hidden historical figures appear at landmarks, partially visible, with reveal animations and info cards.
54. ✅ Player graves from previous runs appear at the spaces where members died (persistent across sessions via localStorage).

## Bandit ambush
55. ✅ At space 23 (short) / 47 (extended), the bandit ambush triggers (guaranteed).
56. ✅ The ambush includes a 5-question multiple-choice quiz drawn from facts the team was shown.
57. ✅ Each question has 45-second timer, 4 options, immediate feedback.
58. ✅ Outcome resolves per quiz score table with profession bonuses applied.
59. ✅ Quiz performance and outcome are recorded in the Trail Journal.

## End game
60. ✅ Reaching Oregon plays cheering + confetti CONTINUOUSLY until Continue clicked.
61. ✅ Wagon elimination plays funeral hymn and somber narration.
62. ✅ Day 165 winter ending fires correctly.
63. ✅ Score is computed with all bonuses and penalties.
64. ✅ Trail Journal is multi-paragraph period-voice prose with team names and events.

## Leaderboard, what if, dispatch, teacher
65. ✅ Leaderboard shows seeded benchmark scores plus persistent class scores.
66. ✅ Beating a benchmark highlights and chimes.
67. ✅ "What If?" button replays the pivotal choice with the alternate option once per game.
68. ✅ Forts allow up to 3 dispatch letters per game (1 Money each, +2 Morale held 3 turns, +1 Health).
69. ✅ Dispatch letters are generated in 1840s voice and shown as parchment cards.
70. ✅ Teacher Mode toggle in Setup. When on, generates a printable Teacher Report at end of game.

## Mini-quality
71. ✅ Soda Springs landmark shows a small soda bottle decoration (per Gabby).
72. ✅ Blue Mountains landmark shows small blue mountain icons next to the text (per Gabby).
73. ✅ Buy Supplies menu shows tiny icons next to each item (food, water, supplies — per Gabby).
74. ✅ Robber events occur regularly (about every 5-7 turns of average gameplay).
75. ✅ Day 67 (and other 30-day milestones) get a soft chime announcement.
76. ✅ No word "AI", "Claude", "GPT", "LLM", "model", "agent", "chatbot" appears anywhere user-facing or in code comments. Grep before declaring done.

---

# Part 19 — Notes for you, Claude Code

This is a big amendment. The key insight: **the systems are interconnected**, not independent. The simulation drives state which drives audio which drives UI. Build them in the order from Part 0 and verify each layer before adding the next.

The hardest section to get right is the simulation (Part 2). Spend extra care there. Test it in the console with synthetic scenarios before wiring up UI:

```javascript
// Test scenario: zero food for 3 turns
gameState.wagons[0].resources.food = 0;
gameState.consecutive_zero_food_turns = 3;
applyEndOfTurnStateTransitions(gameState.wagons[0]);
console.log(gameState.wagons[0].team.map(m => `${m.name}: ${m.state}`));
// Expected: most members should now be weakened or sick
```

The character system (Part 5) is the second-hardest. Get the base figure SVG right first, then layer profession accessories. Test that all 23 professions render distinctly before integrating into scenes.

The audio system (Part 9) requires careful AudioContext management. Browsers block contexts before user interaction — initialize on the first button click in setup.

When you're done, give the user a summary covering:
- Which parts you implemented (all of them, ideally)
- Test results for the simulation calibration (member loss rate across 10 simulated games)
- Any balance numbers you think need tuning
- One paragraph on what you think will surprise the kids most

Build it big. Build it carefully. This is the final amendment — Gabby and her class deserve a finished, polished, surprising game.
