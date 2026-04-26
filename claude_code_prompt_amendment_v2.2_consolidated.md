# Pink Oregon Trail — Consolidated Amendment v2.2

> ## ⚠️ READ THIS FIRST
>
> This amendment supersedes all prior amendments and the original `claude_code_prompt.md`. It is the single source of truth for the v2.2 build. The accompanying `oregon_trail_game_data.json` is version 2.2 — confirm `meta.version === "2.2"` before applying any changes.
>
> v2.2 combines v2.1 (four bug fixes plus money economy) with major playability improvements driven by playtesting: warning escalation before death, pre-death intervention events, per-member health bars, death-per-turn cap, difficulty selector, teacher mode use case clarity, historical illustrations, and a comprehensive testing protocol.
>
> **The most important change in v2.2 is the death system overhaul (Part 2).** In v2.1 testing, the simulation killed multiple members in a single turn with no warning, leaving the player passive. v2.2 fixes this with a layered warning system that gives the player real agency at every stage.
>
> If you have an existing pink_oregon_trail.html from a v2.0 or v2.1 build, do NOT discard it. Patch in place — there are working systems to preserve.

---

## Part 0 — Read order, then build order

**Read order** before writing any code:
1. This document, in full
2. `oregon_trail_game_data.json` — confirm v2.2, scan all the new top-level keys: `difficulty_settings`, `warning_escalation_system`, `per_member_health_bar`, `teacher_mode_use_cases`, `historical_illustrations`, `testing_protocol`, `money_economy`, `music_system`, `death_announcement_protocol`, `hunt_action`
3. The accompanying `pink_oregon_trail_rules.html` (illustrated rules, separately delivered) — read for context on what kids will be told about the game

**Build order** for applying v2.2 changes to an existing v2.1 build:
1. Reload JSON, confirm meta.version === "2.2"
2. Bug-fix layer: wagon SVG (Part 1A), responsive viewport (Part 1B), music rotation (Part 1C) — these are the foundations
3. Per-member health bars on team strip (Part 5) — small visual change, prerequisite for Part 2 to work
4. Warning escalation system (Part 2A through 2D) — the agency overhaul
5. Death announcement protocol (Part 2E) — refined from v2.1
6. Money economy from v2.1 (Part 3) — already in JSON, just needs implementation
7. Difficulty selector (Part 4) — adds setup screen, modifies starting values
8. Teacher Mode use case copy (Part 6) — wording-only change
9. Historical illustrations (Part 7) — add daguerreotype SVGs at landmarks
10. Run the full testing protocol (Part 9) before declaring complete

After every section, verify it works in isolation before moving to the next.

---

# Part 1 — Foundation fixes (preserved from v2.1)

## 1A — Wagon SVG must be a single grouped element

**Symptom from playtest:** Wheels spin in the vicinity of the wagon body but not attached. Ox floats in the air. Parts move independently.

**Root cause:** The wagon was implemented as multiple separate SVG elements (or a parent SVG containing child SVGs at different DOM positions). When wheel rotation animation applies `transform: rotate(...)` with `transform-origin` set to a coordinate that's correct in one coordinate space but wrong for the actual element placement, the wheel orbits around the wrong point and drifts away from the wagon.

**Fix:**

The wagon must be ONE `<svg>` element with viewBox `0 0 90 60`. All parts (ox, yoke, wagon body, canvas top, wagon ribs, both wheels) live inside that single SVG as nested `<g>` and primitive elements. The wheels rotate inside that coordinate space via CSS `transform-origin` set to the actual center of each wheel circle in viewBox units (14px 44px for the left wheel, 40px 44px for the right wheel).

**Reference SVG (use exactly this — copied from v2.0 Part 1.2):**

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

```css
@keyframes wheelSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.player-wagon .wheel {
  animation: wheelSpin 1.2s linear infinite;
}
@keyframes oxWalk {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-1px); }
}
.player-wagon .ox-walk {
  animation: oxWalk 0.6s ease-in-out infinite;
}
```

The outer `<svg class="player-wagon">` is what translates to move along the trail. The wheels rotate in place. The ox bobs up and down 1px. **Do not add any other internal animations.**

**Acceptance:** Travel 10 spaces, observe the wagon. The ox stays attached to the front via the yoke. The wheels rotate in place beneath the wagon body without drifting. The whole wagon moves as one unit.

## 1B — Viewport-responsive layout

**Symptom from playtest:** The game UI is sized for a desktop monitor at high resolution. Player must zoom out to 33% to see everything.

**Root cause:** Fixed pixel dimensions on main containers. The scene canvas, resource ribbon, team strip, and action bar are sized at the full 1920×900 implied by v2.0 layout sketches, with no responsive scaling.

**Fix:**

```css
html, body {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  font-family: Georgia, serif;
}

.game-root {
  width: 100vw;
  height: 100vh;
  display: grid;
  grid-template-rows: 50px 1fr 100px 80px;
  /* resource ribbon | scene canvas | team strip | action bar */
}

.resource-ribbon {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: linear-gradient(to bottom, #FBF6F0, #F4E8D8);
  border-bottom: 1px solid rgba(184, 87, 112, 0.2);
}

.scene-canvas {
  position: relative;
  overflow: hidden;
}

.scene-canvas svg {
  width: 100%;
  height: 100%;
  display: block;
}

.team-strip {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  overflow-x: auto;
  background: linear-gradient(to top, #FBF6F0, #F4E8D8);
  border-top: 1px solid rgba(184, 87, 112, 0.2);
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: linear-gradient(to bottom, #FBF6F0, #F4E8D8);
}

.scene-backdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
```

For SVG content that scales:

```html
<svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet" 
     style="width: 100%; height: 100%;">
  <!-- content -->
</svg>
```

For the narrative callout (floats over the scene):

```css
.narrative-callout {
  position: absolute;
  bottom: 12%;
  left: 50%;
  transform: translateX(-50%);
  max-width: min(580px, 80vw);
  padding: clamp(16px, 3vw, 32px);
  background: linear-gradient(to bottom, rgba(251,246,240,0.96), rgba(251,246,240,0.88));
  border: 1.5px solid rgba(184, 87, 112, 0.35);
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(61, 40, 23, 0.18), 0 0 0 1px rgba(255,255,255,0.5) inset;
  backdrop-filter: blur(2px);
}

.narrative-intro {
  font-size: clamp(18px, 2.5vw, 28px);
  font-style: italic;
  color: #B85770;
  text-align: center;
}

.narrative-flavor {
  font-size: clamp(13px, 1.6vw, 18px);
  font-style: italic;
  color: #5C4A36;
  text-align: center;
}
```

**Acceptance:** Resize from 1920px wide down to 800px wide. Layout reflows smoothly without breaking. Test specifically at 1366×768 (Chromebook resolution).

## 1C — Music rotation rules

**Symptom from playtest:** Same song plays on loop indefinitely.

**Fix:** Implement the music system per `GAME_DATA.music_system`. Five songs encoded as Web Audio note arrays — Oh! Susanna, Sweet Betsy from Pike, Buffalo Gals, Shenandoah, Amazing Grace. Rotation rules:

- Maintain `lastPlayedId`. Never play same song twice in a row.
- Rotate at minimum every 90 seconds even if no mood change.
- On mood change, fade current song over 5 seconds and start new mood's pool.
- Amazing Grace plays only on member loss / wagon elimination — outside the normal rotation.

```javascript
class MusicController {
  constructor() {
    this.songs = GAME_DATA.music_system.songs;
    this.currentSongId = null;
    this.lastPlayedId = null;
    this.currentMood = 'neutral';
    this.songStartTime = 0;
    this.maxSongDurationMs = 90000;
  }
  
  computeMood(wagon) {
    const team = wagon.team.filter(m => m.state !== 'lost');
    const hasDying = team.some(m => m.state === 'dying');
    const hasSick = team.some(m => m.state === 'sick');
    const r = wagon.resources;
    if (hasDying || r.food === 0 || r.water === 0) return 'somber';
    if (r.morale <= 3 || hasSick) return 'weary';
    if (r.morale >= 7 && !hasSick) return 'hopeful';
    return 'neutral';
  }
  
  pickNextSong(mood) {
    const eligibleIds = this.songs
      .filter(s => s.mood.includes(mood) && s.id !== 'amazing_grace')
      .map(s => s.id);
    const candidates = eligibleIds.filter(id => id !== this.lastPlayedId);
    const pool = candidates.length > 0 ? candidates : eligibleIds;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  
  tick() {
    // Called every 1 second during gameplay
    const now = Date.now();
    const newMood = this.computeMood(getCurrentWagon());
    if (newMood !== this.currentMood) {
      this.fadeOutAndPickNew(newMood);
      this.currentMood = newMood;
    } else if (now - this.songStartTime > this.maxSongDurationMs) {
      this.pickNew(newMood);
    }
  }
}
```

**Acceptance:** Play 5 minutes at moderate morale — at least 3 different songs heard. Force a death — Amazing Grace plays once, then prior mood pool resumes.

---

# Part 2 — Death system overhaul: warning escalation + agency

This is the most important change in v2.2. v2.1's death system was mechanically correct but the player had no warning and no agency — members would silently degrade and die in batches. The player became a passive observer. This part fixes that.

## 2A — The agency problem (why this matters)

A pioneer game where members die without warning fails educationally because:

1. **No agency** — kids feel like the game is happening *to* them, not driven *by* them
2. **No teaching moment** — if a member dies because the team starved, kids should see that coming and have a chance to stop hunting being optional
3. **No emotional weight** — three deaths in one turn dilutes each loss; one death after three turns of struggle is heavy
4. **No strategic depth** — if the simulation is a black box, there's nothing to plan against

The fix is layered visibility and intervention windows. Players see warning lights early. They get a chance to act. Death only happens after that window closes.

## 2B — Per-member health bars on team strip

Each portrait on the team strip gets a small horizontal health bar below the name (specification in `GAME_DATA.per_member_health_bar`):

```html
<div class="team-portrait" data-state="healthy">
  <div class="portrait-svg-container">
    <!-- Member's portrait SVG -->
  </div>
  <div class="member-name">Forest John</div>
  <div class="health-bar">
    <div class="health-bar-fill" style="width: 100%; background: #4A7C3A;"></div>
  </div>
  <div class="member-state-icon"><!-- optional --></div>
</div>
```

```css
.health-bar {
  width: 48px;
  height: 4px;
  background: rgba(61, 40, 23, 0.15);
  border-radius: 2px;
  margin: 4px auto 0;
  overflow: hidden;
}
.health-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease-out, background 0.6s ease-out;
}
.team-portrait[data-state="dying"] .health-bar-fill {
  animation: dyingPulse 1.5s ease-in-out infinite;
}
@keyframes dyingPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

When state changes, animate the bar to its new fill width and color over 0.6s. Kids see at a glance: green = good, gold = tired, orange = sick, red = dying.

## 2C — Transition notifications (early warnings)

When a member transitions from `healthy` to `weakened`, fire a small toast notification (informational, no choice):

```javascript
function showTransitionToast(member, fromState, toState, cause) {
  const phrase = GAME_DATA.warning_escalation_system.transition_notifications.healthy_to_weakened
    .narratives_by_cause[cause] || GAME_DATA.warning_escalation_system.transition_notifications.healthy_to_weakened.narratives_by_cause.default;
  const text = phrase.replace('{name}', member.name);
  
  const toast = document.createElement('div');
  toast.className = 'transition-toast';
  toast.textContent = text;
  document.body.appendChild(toast);
  
  audioController.playSfx('worry_chime');
  
  setTimeout(() => toast.classList.add('fade-out'), 3500);
  setTimeout(() => toast.remove(), 4000);
}
```

```css
.transition-toast {
  position: fixed;
  top: 70px;
  right: 20px;
  background: rgba(212, 175, 55, 0.95);  /* warm gold */
  color: #3D2817;
  padding: 12px 20px;
  border-radius: 8px;
  font-family: Georgia, serif;
  font-style: italic;
  font-size: 15px;
  box-shadow: 0 4px 16px rgba(61, 40, 23, 0.25);
  z-index: 200;
  animation: toastSlideIn 0.4s ease-out;
}
.transition-toast.fade-out {
  animation: toastFadeOut 0.5s ease-in forwards;
}
@keyframes toastSlideIn { from { transform: translateX(120%); } to { transform: translateX(0); } }
@keyframes toastFadeOut { to { opacity: 0; transform: translateX(120%); } }
```

When a member transitions from `weakened` to `sick` or `injured`, fire a larger banner notification that PAUSES the scene and requires the player to click "Acknowledge":

```html
<div class="transition-banner" role="dialog" aria-live="assertive">
  <div class="transition-banner-icon">⚠</div>
  <div class="transition-banner-text">
    <strong>{name} has fallen ill.</strong>
    Without recovery they will worsen.
  </div>
  <button class="transition-banner-acknowledge">Acknowledge</button>
</div>
```

This forces the player to register the event before play continues.

## 2D — Pre-death intervention event

This is the core agency mechanism. When a member transitions to `dying` (or starts a turn in `dying` state), the simulation pauses BEFORE checking whether they die, and the player gets a major event with multiple choices.

Specification is in `GAME_DATA.warning_escalation_system.pre_death_intervention`. Implementation:

```javascript
function checkForDyingMembersAtTurnEnd(wagon) {
  const dyingMembers = wagon.team.filter(m => m.state === 'dying');
  
  if (dyingMembers.length === 0) {
    // No dying members — proceed with normal end-of-turn
    return;
  }
  
  // PAUSE simulation. Player must intervene.
  game.pauseAllInput = true;
  
  // For each dying member, fire intervention event
  // (in practice, fire one at a time; player resolves each)
  for (const member of dyingMembers) {
    fireInterventionEvent(member, wagon);
    return;  // wait for player resolution
  }
}

function fireInterventionEvent(member, wagon) {
  const spec = GAME_DATA.warning_escalation_system.pre_death_intervention;
  
  // Determine which choices are available
  const distanceToFort = computeDistanceToNextFort(wagon);
  const hasDoctor = wagon.team.some(m => 
    m.profession === 'Doctor' && ['healthy', 'weakened'].includes(m.state)
  );
  const hasPriest = wagon.team.some(m => 
    m.profession === 'Priest' && ['healthy', 'weakened'].includes(m.state)
  );
  const isEasyMode = gameState.difficulty === 'Easy';
  const revivalCharges = gameState.revivalChargesRemaining;
  
  const availableChoices = spec.choices.filter(c => {
    if (c.id === 'race_to_fort') return distanceToFort <= 3;
    if (c.id === 'use_revival_charge') return isEasyMode && revivalCharges > 0;
    return true;  // others always available
  });
  
  // Compose dying scene: dim backdrop, member figure on bedroll, bedside lantern
  showDyingScene({
    member: member,
    backdropDim: 0.4
  });
  
  // Show intro for 3 seconds before choices
  showNarrativeIntro({
    title: `${member.name} is gravely ill`,
    body: spec.narrative_intro_template.replace('{name}', member.name).replace('{profession}', member.profession),
    holdMs: 3000
  });
  
  // Then show choices
  setTimeout(() => {
    showInterventionChoices(availableChoices, (chosenChoice) => {
      resolveIntervention(member, wagon, chosenChoice, hasDoctor, hasPriest);
    });
  }, 3000);
}

function resolveIntervention(member, wagon, choice, hasDoctor, hasPriest) {
  // Apply costs (days, food, water, morale)
  applyChoiceEffects(wagon, choice.effects);
  
  // Compute recovery probability
  let recoveryProb;
  if (choice.id === 'stop_and_tend' && hasDoctor) {
    recoveryProb = choice.effects.recovery_probability_with_doctor;
  } else if (choice.id === 'stop_and_tend') {
    recoveryProb = choice.effects.recovery_probability_base;
  } else if (choice.id === 'pray_and_continue' && hasPriest) {
    recoveryProb = choice.effects.recovery_probability_with_priest;
  } else if (choice.id === 'pray_and_continue') {
    recoveryProb = choice.effects.recovery_probability_base;
  } else {
    recoveryProb = choice.effects.recovery_probability;
  }
  
  // Doctor general bonus (+0.15 to non-stop_and_tend choices when Doctor on team)
  if (hasDoctor && choice.id !== 'stop_and_tend' && choice.id !== 'use_revival_charge') {
    recoveryProb += 0.15;
  }
  
  // Roll for recovery
  const recovered = Math.random() < recoveryProb;
  
  if (choice.id === 'use_revival_charge') {
    gameState.revivalChargesRemaining -= 1;
  }
  
  if (recovered) {
    // Member recovers
    member.state = choice.effects.recovery_state || 'sick';
    member.state_since_day = gameState.day;
    showInterventionResultNarrative(choice, 'success', member, hasPriest);
  } else {
    // Member dies — but trigger full death announcement protocol
    showInterventionResultNarrative(choice, 'failure', member, hasPriest);
    setTimeout(() => triggerDeathAnnouncement(member, wagon, member.causeOfDeath || 'disease_general'), 4000);
  }
  
  // Resume game after narrative
  game.pauseAllInput = false;
}
```

## 2E — Death-per-turn cap

Even with the intervention system, multiple members can be in `dying` state simultaneously. Without a cap, a single bad turn can cascade into multiple deaths. This kills agency.

```javascript
function applyEndOfTurnDeathChecks(wagon) {
  let deathsThisTurn = 0;
  const maxDeathsPerTurn = 1;  // hard cap
  
  // Process dying members in order of how long they've been dying (most progressed first)
  const dyingMembers = wagon.team
    .filter(m => m.state === 'dying')
    .sort((a, b) => a.state_since_day - b.state_since_day);
  
  for (const member of dyingMembers) {
    if (deathsThisTurn >= maxDeathsPerTurn) {
      // Cap reached — leave remaining dying members in dying state
      // They will trigger intervention events again next turn
      continue;
    }
    
    // Check death probability (30% per turn for dying members)
    if (Math.random() < 0.30) {
      member.state = 'lost';
      member.lostOnDay = gameState.day;
      deathsThisTurn += 1;
      triggerDeathAnnouncement(member, wagon, member.causeOfDeath);
    }
  }
}
```

**Catastrophic events bypass the cap.** River drowning failure can drown 1-2 members in one event. Bandit ambush with 0-1 quiz correct kills 2-3. Cholera epidemic event can kill 1-2. These are explicit risk events the player chose to enter — losing multiple members IS the consequence the player accepted by taking the risk. The cap only applies to natural simulation progression.

## 2F — Death announcement protocol (refined from v2.1)

When a member is actually lost (state transitions to 'lost'), run this exact 9-step sequence:

1. **PAUSE** — `game.pauseAllInput = true`
2. **SCENE** — Dim backdrop to 40%. Show member's full-body figure center-canvas with fade-to-grayscale animation over 1.5s.
3. **AUDIO** — Duck current music. Play Amazing Grace.
4. **NARRATIVE CALLOUT** — Show:
   - Title: "{Member Name} is lost"
   - Body: "{Member Name} the {Profession} was lost on Day {N}. Cause: {cause_phrase}."
   - Closing: "We dig a grave by the trail and continue west."
5. **TEAM STRIP UPDATE** — Member's portrait grayscales, gets ✝ icon, label changes to "Lost Day {N}"
6. **DELAY** — Continue button suppressed for 2.5 seconds (3.5s on first death of game; replace text with "A grave on the trail." for that 1 extra second)
7. **JOURNAL ENTRY** — Trail Journal records: "{Day N}: {Member Name} the {Profession}, lost to {cause}. We pressed on."
8. **PERSISTENT GRAVE** — Save to localStorage per v2.0 Part 11.3
9. **RESUME** — On Continue click, unduck music, return to mood pool, `game.pauseAllInput = false`

Cause phrase mapping is in `GAME_DATA.death_announcement_protocol.cause_phrase_map`.

**Acceptance:** Use console to force every cause type once. Verify all 9 steps fire in order with no skipped step. Force two simultaneous deaths via natural progression — verify only one actually dies that turn.

---

# Part 3 — Money economy (preserved from v2.1)

The v2.0 spec had no income mechanism. v2.1 added it. This is now in JSON at `GAME_DATA.money_economy`.

## 3A — Hides resource

Add a new resource Hides between Supplies and Money in the resource ribbon. Starts at 0. No consumption. Gained from successful hunts (Hunter +1, Trapper +2 per success). Sells at forts for 3 Money each.

## 3B — Hunt action with hides

Replace Hunt outcome logic with `GAME_DATA.hunt_action.outcomes`:

- Hunter alive and healthy/weakened: 75% success, +3-7 food, +1 hide
- Trapper alive and healthy/weakened: 85% success, +4-8 food, +2 hides
- Cowboy (no Hunter or Trapper): 55% success, +2-5 food, +1 hide
- No specialist: 30% success, +1-4 food, 0 hides
- Failure: -1 morale

Substitute team's actual character names into narratives.

## 3C — Sell Goods fort action

Add a Sell Goods action to forts:

```javascript
function executeSellGoods(wagon) {
  const r = wagon.resources;
  let earned = 0;
  
  earned += r.hides * 3;
  r.hides = 0;
  
  if (r.food > 5) { earned += (r.food - 5); r.food = 5; }
  if (r.water > 5) { earned += (r.water - 5); r.water = 5; }
  if (r.supplies > 3) { earned += (r.supplies - 3); r.supplies = 3; }
  
  const hasMerchant = wagon.team.some(m => 
    m.profession === 'Merchant' && ['healthy', 'weakened'].includes(m.state)
  );
  if (hasMerchant) earned = Math.ceil(earned * 1.5);
  
  r.money += earned;
  return earned;
}
```

Show confirmation dialog: "Sell N hides, M excess food, K excess water, L excess supplies for X silver coins?"

## 3D — Hire On for the Day fort action

Costs 1 day. Earns ~1 Money per able-bodied team member. -1 Morale (hard work). +2 Money if Carpenter. Show confirmation before executing.

## 3E — Twelve new money-earning encounter events

Already in JSON at events[] with IDs: stranded_wagon, lost_cache, doctor_for_pay, musician_camp, trader_buys, lost_dog, tailor_dress, tutor_day, portrait, magic_show, cooking_pay, blacksmith_work. Trigger 2-4% per turn. Each rewards 1-6 Money based on profession match. Integrate via existing event system (Part 8 of v2.0 amendment) — no new code needed beyond loading them.

## 3F — Money UI affordances

- Money + hides icons in resource ribbon (add Hides between Supplies and Money)
- On change: brief +N or -N flash animation in green/red, value floats up
- Fort entry tip card auto-dismisses after 4 seconds: "Your goods at this fort: N hides, M excess food. Sell them for cash."
- Profession encounter narratives explicitly state "X silver coins"

---

# Part 4 — Difficulty selector

Three difficulty levels, set once at setup (Screen 2.5 between game mode and team selection). Specification is in `GAME_DATA.difficulty_settings`.

## 4A — UI for difficulty selection

Three large cards, each with an icon (sun/cloud/storm) and the label/subtitle:

- **Easy — A Forgiving Trail**  
  *For first-time players. Members are hardier, money flows freely, and you have one revival.*
  
- **Medium — The Honest Trail**  
  *The historical experience. About one in ten wagons faces total disaster. Recommended for most classroom plays.*
  
- **Hard — The Trail of Tears**  
  *Cholera spreads faster. Hunters miss more often. The land is unforgiving. For repeat players who want a real test.*

Default selection is Medium (highlighted by default).

## 4B — How difficulty modifies the simulation

When a difficulty is selected, store `gameState.difficulty` and apply the modifiers from JSON:

```javascript
function applyDifficultyModifiers(gameState, difficulty) {
  const preset = GAME_DATA.difficulty_settings.presets[difficulty];
  const m = preset.modifiers;
  
  // Adjust starting resources
  gameState.wagons.forEach(wagon => {
    wagon.resources.money = m.starting_money;
    wagon.resources.food += m.starting_food_bonus;
    wagon.resources.water += m.starting_water_bonus;
    wagon.resources.supplies += m.starting_supplies_bonus;
  });
  
  // Store for use throughout game
  gameState.difficultyModifiers = m;
  gameState.revivalChargesRemaining = m.revival_charges;
}

// In state transition checks, multiply probability by the modifier
function applyStateTransitionRules(wagon) {
  for (const rule of GAME_DATA.meta.simulation_system.state_transitions.rules) {
    if (matchesTrigger(wagon, rule.trigger)) {
      const adjustedProb = rule.probability * (gameState.difficultyModifiers?.state_transition_probability_multiplier || 1.0);
      // ... roll against adjustedProb ...
    }
  }
}

// In Doctor recovery checks, add the doctor_recovery_bonus
function rollDoctorRecovery(member, baseChance) {
  const bonus = gameState.difficultyModifiers?.doctor_recovery_bonus || 0;
  return Math.random() < (baseChance + bonus);
}

// In luck system (v1.4), use difficulty-specific floor/ceiling
gameState.luck = clamp(gameState.luck, 
                       gameState.difficultyModifiers.luck_floor, 
                       gameState.difficultyModifiers.luck_ceiling);

// In bandit ambush, use difficulty-specific question count
const questionCount = gameState.difficultyModifiers.bandit_quiz_question_count;
```

**Acceptance:** Start a game on each difficulty. Verify Easy gives 50 starting money + bonuses; Hard gives 20 + penalties. Verify bandit quiz has 3/5/7 questions on Easy/Medium/Hard.

---

# Part 5 — Per-member health bars

Implementation already specified in Part 2B. Specification is in `GAME_DATA.per_member_health_bar`. Implementation must:

1. Render a small horizontal bar (48px × 4px) below the member name on each team strip portrait
2. Color-code by state (green/gold/orange/terracotta/deep rose)
3. Width-code by state (100% / 70% / 45% / 50% / 15%)
4. Animate transitions over 0.6 seconds
5. Pulse (opacity 1.0 ↔ 0.5 over 1.5s) for dying members
6. Hide the bar entirely for lost members (replace with ✝ cross icon)

This is a small addition but it's the single most impactful UI element for player awareness — it lets kids see at a glance who is in trouble.

---

# Part 6 — Teacher Mode use case clarification

The v2.0 amendment specified Teacher Mode but didn't explain when to use it. Result: teachers may turn it on by default and lose the casual play option. Specification is in `GAME_DATA.teacher_mode_use_cases`.

## 6A — Setup screen wording

The Teacher Mode toggle on Setup Screen 5 should read:

> **Teacher Mode (off by default)**
> 
> Turn this on ONLY if today's play is being graded. Adds a printable rubric report at the end of the game showing which historical content the team encountered, what choices they made, and how they performed on the bandit quiz. Most plays should leave this OFF — the game is more fun without grading pressure.

## 6B — When to use it

For graded play:
- End-of-unit assessment (summative grade for Westward Expansion unit)
- Take-home assignment requiring evidence of engagement
- Substitute teacher day (provides evidence without live grading)
- Parent-teacher conferences (defensible artifact)
- IEP, 504, learning-objective documentation

For casual play (turn OFF):
- Indoor recess
- Reward day
- First-time exposure to the game (kids should learn mechanics without pressure)
- Open-ended exploration days

## 6C — Report format

Letter-portrait HTML page, printable via window.print(), containing:
- Student names, wagon name, date, mode, difficulty
- Game length, total events, total choices, total facts shown
- Bandit quiz score
- Forts visited, rivers crossed, pace strategy summary, rations strategy summary
- Members lost (names, days, causes)
- Final outcome and score breakdown
- Full Trail Journal text

---

# Part 7 — Historical illustrations

To enhance educational value, every major landmark and fort gets a period-styled illustration shown alongside the Did You Know fact. Specification is in `GAME_DATA.historical_illustrations`.

## 7A — Default: daguerreotype-style SVG

Build an SVG illustration for each landmark using these specifications:

- **Frame:** Oval frame, 300×230px, warm cream border 6px, then sepia border 2px, then black inner edge 1px
- **Color palette:** Sepia only — `#5C4A36` (darks), `#A89070` (mids), `#D4C19E` (highs), `#FBF6F0` (paper-white)
- **Texture:** Subtle grain via SVG `feTurbulence` filter at 0.08 opacity
- **Vignette:** Dark sepia at edges, fading to lighter center
- **Ornament:** Decorative flourish in corner with year (e.g., "1849") in serif script

The 9 locations to illustrate:

1. **Fort Laramie (1849)** — Wood-and-adobe walled fort, American flag, two-story blockhouse, wagons outside gates, mountains in distance
2. **Chimney Rock (1850)** — Tall slender clay-and-sandstone spire, distinctive cone-and-shaft silhouette, wagon train below for scale
3. **Independence Rock (1850)** — Massive rounded granite dome like a turtle shell, names visible carved in stone, Sweetwater River curving past
4. **Soda Springs (1849)** — Naturally bubbling springs in a high meadow, small steaming pools, pioneers tasting water, sparse pines
5. **South Pass (1849)** — Wide gentle saddle between distant mountains, dry grass, almost no apparent climb, line of wagons crossing
6. **Fort Bridger (1849)** — Modest log palisade fort, few buildings inside, mountain man trading post atmosphere
7. **Whitman Mission (1847)** — Small white-painted clapboard mission with wooden cross, garden, solemn empty atmosphere
8. **The Dalles (1849)** — Columbia River narrowing through black basalt cliffs, Native fishermen on rocky platforms, dangerous rapids
9. **Oregon City (1850)** — Small frontier town beside Willamette Falls, wooden buildings, church spires, forested hills behind

When the wagon arrives at one of these landmarks, show the daguerreotype illustration alongside the Did You Know fact in the narrative callout. The illustration appears with a slow fade-in (0.8s) and a gentle paper-rustling sound effect.

Each illustration includes a caption below it (small italic serif text):

> *Fort Laramie, Wyoming, c. 1849. Originally a fur trading post (Fort William, 1834), it became a U.S. Army fort in 1849. The most important resupply point on the Oregon Trail.*

Captions are in `GAME_DATA.historical_illustrations.locations[].caption`.

## 7B — Optional upgrade: real public-domain photographs

The game ships with daguerreotype SVGs as the default. To upgrade with real Library of Congress public-domain photographs:

1. Visit loc.gov/photos and search for the suggested terms in `GAME_DATA.historical_illustrations.locations[].historical_photo_search`
2. Download the highest-resolution version
3. Resize to 600×460 max, save as JPG quality 85
4. Convert to base64 (Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes('photo.jpg'))`)
5. Add to a `historicalPhotosOverride` constant in pink_oregon_trail.html keyed by location id
6. The game checks the override first; if present, displays the photograph; if not, falls back to daguerreotype SVG

Implement the check pattern:

```javascript
function getLandmarkImageHTML(landmarkId) {
  if (window.HISTORICAL_PHOTOS_OVERRIDE && window.HISTORICAL_PHOTOS_OVERRIDE[landmarkId]) {
    return `<img src="data:image/jpeg;base64,${window.HISTORICAL_PHOTOS_OVERRIDE[landmarkId]}" 
                 alt="Historical photograph" class="landmark-photo"/>`;
  }
  return getDaguerreotypeSVG(landmarkId);  // built-in fallback
}
```

This way the game ships with illustrations immediately, and Nicholas (or anyone else) can enhance with real photos later without rebuilding the game.

---

# Part 8 — Illustrated rules document

A separately-delivered HTML file (`pink_oregon_trail_rules.html`) is the printable rules booklet for the physical board. Six pages, letter-portrait, with SVG illustrations.

The rules HTML is provided as a separate deliverable in the project folder. Claude Code does not need to write it — it is already complete. The game itself does not need to reference or load it. The rules are for printing and physical inclusion with the board.

The rules cover:
1. **Welcome** — Who made it, when it's set, what kids will learn
2. **Setup** — Choose difficulty, mode, length, team of 7, name everyone
3. **A turn at a time** — The four actions, dice rolls, traveling
4. **Watching your team** — Resources, the team strip, what the colors mean
5. **Special situations** — Rivers (4 methods), forts, weather, bandits, historical landmarks
6. **Strategy and winning** — Tips, scoring, what makes a great wagon

---

# Part 9 — Acceptance and testing protocol

This is the testing battery that all builds must pass before delivery. Specification is in `GAME_DATA.testing_protocol`. The previous round's bugs (wagon decomposition, viewport overflow) would have been caught by tests 1, 2, and 3.

## 9A — Test 1: Visual smoke test (7 resolutions)

Open the game in browser. Take screenshots at: 1024×600, 1280×720, 1366×768, 1440×900, 1600×900, 1920×1080, 414×896 (mobile portrait). For each:
- All UI elements visible without horizontal scroll
- Resource ribbon fits without overflow
- Team strip portraits visible (may scroll horizontally on narrow screens)
- Action buttons all visible
- Narrative callout fits within scene canvas
- Text readable

**Pass:** All 7 resolutions show usable layouts.

## 9B — Test 2: Wagon integrity test

Travel 10 spaces. Watch the wagon at each. Verify:
- Wagon body, ox, wheels, yoke move together as one unit
- Ox stays attached to front via yoke
- Wheels rotate beneath wagon body, never drift outside the wagon footprint
- Wagon faces RIGHT
- Wagon translates rightward when traveling, never backward

**Pass:** Zero visible decomposition across 10 consecutive moves.

## 9C — Test 3: Responsive resize test

Resize browser window from 1920px wide down to 800px wide and back up. Verify:
- Layout reflows smoothly without breaking
- No element gets cut off or overlaps another
- Text scales appropriately
- Scene canvas always fills its grid cell

**Pass:** Smooth reflow at every width 800-1920.

## 9D — Test 4: State machine test (console)

Force conditions via console and verify expected transitions:

```javascript
// Test starvation
gameState.wagons[0].resources.food = 0;
gameState.consecutive_zero_food_turns = 3;
applyEndOfTurnStateTransitions(gameState.wagons[0]);
// Expected: ~3-5 of 7 healthy members transition to weakened or sick

// Test dehydration  
gameState.wagons[0].resources.water = 0;
gameState.consecutive_zero_water_turns = 3;
applyEndOfTurnStateTransitions(gameState.wagons[0]);
// Expected: most members transition to weakened or dying (water > food in severity)

// Test Doctor recovery
// Set one member to 'sick'. Verify Doctor present.
// Run end-of-turn 10 times. ~6 of 10 should produce recovery.
```

**Pass:** Each test case produces results within 20% of expected probability.

## 9E — Test 5: Death announcement test

Force a member to die via console. Verify all 9 steps of death announcement fire in order:
1. Game pauses input ✓
2. Scene composes (backdrop dims, member shown) ✓
3. Amazing Grace plays ✓
4. Narrative callout shows name + cause + closing ✓
5. Team strip grayscales with cross ✓
6. Continue button suppressed 2.5s ✓
7. Trail Journal entry recorded ✓
8. Grave saved to localStorage ✓
9. After Continue: music returns, game resumes ✓

## 9F — Test 6: Warning escalation test

Force healthy → weakened → sick → dying transitions on a single member:
- healthy → weakened: small toast notification
- weakened → sick: larger banner with Acknowledge button
- sick → dying: full intervention event with multiple choices
- 'race_to_fort' choice only available if next fort within 3 spaces
- 'use_revival_charge' only available on Easy with charges remaining

**Pass:** Each transition produces escalating UI weight.

## 9G — Test 7: Money flow test

Run a 25-space Short trail game on Medium difficulty. Log every money change:
- Starting money = 30
- Hides accumulate from successful hunts
- At least 2 of the 12 new money-earning events trigger
- Selling at fort produces money proportional to hides + excess
- Forts give clear tip card on arrival

**Pass:** End-of-game money is 20-80 for averagely-managed game.

## 9H — Test 8: Music rotation test

Play 5 minutes at moderate morale. Log every song change. Verify:
- At least 3 different songs play in 5 minutes
- No song plays back-to-back
- Songs match mood
- Forced death triggers Amazing Grace, returns to prior pool

## 9I — Test 9: Difficulty test

Start a new game on each difficulty:
- **Easy:** money = 50, +bonuses, 3 quiz questions, revival charge available
- **Medium:** standard
- **Hard:** money = 20, -modifiers, 7 quiz questions, transitions ~35% more often

## 9J — Test 10: Full journey test

Play one complete Short journey end-to-end on Medium difficulty. Make ordinary choices. Verify:
- Setup screens work, all inputs accept keyboard
- Wagon stays intact across 25 moves
- At least one event fires per region transition
- Sound effects play (death, money gain, dice, etc.)
- Reaching Oregon: cheering and confetti loop until Continue
- Trail Journal at end has 15+ paragraphs
- Leaderboard shows seeded entries
- Player score appears on leaderboard

**Pass:** Game can be played start to finish without console errors or visible bugs.

## 9K — Delivery gate

**All 10 tests must pass before declaring the build complete.** Report results test-by-test in the build report. Tests 1, 2, 3, and 10 are mandatory regression checks for any future patch.

---

# Part 10 — Build report requirements

When the build is complete, deliver a report covering:

1. **Test results** — pass/fail for each of the 10 tests in Part 9, with notes on any partial passes
2. **Calibration** — across 10 simulated games on Medium difficulty:
   - % of wagons reaching Oregon (target: 35-45%)
   - % of wagons losing at least one member (target: 55-70%)
   - % of wagons eliminated entirely (target: 10-15%)
   - Average members lost per journey (target: 1.5-2.5)
3. **Money trajectory** — across 5 representative games on Medium:
   - Average end-game money for an averagely-managed wagon
   - Highest end-game money observed
   - Lowest end-game money observed
   - Number of money-earning events triggered per game (average)
4. **Difficulty differentiation** — observed difference between Easy / Medium / Hard outcomes
5. **Tuning recommendations** — any constants in the JSON you'd recommend adjusting based on observed play
6. **One paragraph** on what you think will surprise the kids most

---

# Critical reminders (unchanged across versions)

- Single self-contained HTML file. Vanilla HTML/CSS/JS. No frameworks.
- No external network requests. Must run from USB on a school Chromebook with WiFi off.
- No words "AI", "Claude", "GPT", "LLM", "model", "agent", "chatbot" anywhere user-facing or in code comments.
- Period 1840s voice for all narration. No modern slang. No emojis in user-facing UI.
- Respectful representation of Native Americans (helpers, not adversaries — backed by historical fact).
- Member deaths handled with weight per the death announcement protocol.

This consolidated v2.2 amendment is the complete specification. Build to it. Test against it. Report against it.
