# Pink Oregon Trail — v2.3 Amendment

## Context for Claude Code

You delivered v2.2 with a clean build report (23 headless tests passing, 8 browser-required marked SKIP-BROWSER with reproduction steps). The 4-player playtest revealed a set of **playability issues** rather than implementation bugs — most of these are correct behavior of an underspecified system. The player's experience is the source of truth here, not the test battery.

This amendment provides **diagnoses based on direct review of `pink_oregon_trail.html` at HEAD `adbc6ce`** (line numbers cited where relevant). Each issue is structured as: (1) what the player observed, (2) the root cause as I see it from reading the code, (3) the desired behavior, and (4) implementation hints. **Decisions about HOW to implement are yours.** I have read the code; you have written the code; the implementation calls are yours.

The JSON has been updated to v2.3 with new top-level keys: `dice_system`, `water_economy`, `morale_impacts_v2_3`, `day_67_easter_egg`, `hover_tooltip_system`, `minimap_upgrade`, `turn_indicator_system`, `trail_news_upgrade`, `team_alignment_fix`, `simulation_logic_validation`, plus expanded `music_system`. Read those carefully — they contain content (narratives, tooltip rules, color palettes, user stories) you will reference in implementation.

**Confirm `meta.version === "2.3"` before starting.**

**Critical meta-instruction from Nicholas:** Do not pause for git permissions during the build. Make all commits autonomously per your normal `feat(v2.3):` / `fix(v2.3):` / `chore(v2.3):` cadence. The single engagement with Nicholas should be the build report at the end. He should not need to be present.

**Critical meta-instruction on logic-first design:** Per Nicholas's request that AI "think thoroughly through the logic of the game, use use cases and user stories and edge cases", the JSON now contains `simulation_logic_validation.required_user_stories_pre_implementation` with 10 user stories. **Before writing code for any feature in this amendment, walk through the relevant user story end-to-end in your build notes.** Confirm the expected behavior is achievable. Surface any contradictions BEFORE implementing. After implementing, validate the user story actually plays out as described. Document this in the build report.

---

## Build order for v2.3

Apply in this order. Each issue numbered to match Nicholas's playtest list. Earlier issues are foundational — later issues may depend on them.

1. **Issue 6** — Team alignment (the foundational bug; many other complaints flow from this)
2. **Issue 1** — Visible dice roll
3. **Issue 14** — Up to 6 wagons in Competitive mode + autonomous git
4. **Issue 2** — Turn indicator + persistent player name
5. **Issue 5** — Turn-intro shouldn't repeat resolved-space narrative
6. **Issue 7** — Water from forage / river / Soda Springs
7. **Issue 4** — Music tempo and variety
8. **Issue 9** — Death announcement consistency (compounding effect of Issue 6)
9. **Issue 11** — Hover tooltips replace fly-by toasts
10. **Issue 12** — Morale actually impacts play
11. **Issue 10** — Trail News becomes useful
12. **Issue 3** — Mini-map shows real board with all wagons
13. **Day 67** — Kids think 67 is funny (delight beat)
14. **Issue 8** — Real historical photos (delivered as a downloader script Nicholas runs once)
15. **Issue 13** — User-story validation pass (final QA)

---

# Issue 6 — Team alignment bug (CORRECTED DIAGNOSIS)

## What Nicholas observed

> "Team selection does not persist. Members chose their team but when the person played different personas showed up or were different than what they chose. One player was very diligent about picking the best team — Carpenter, Scout, Cowboy etc — and instead the characters literally changed to Influencer, Actor, etc. This was definitely a name change. The characters did not always persist."

## Root cause (corrected from initial diagnosis)

This is **NOT** a skin-tone randomization bug. This is an **array alignment bug**.

In `setupState.wagons[i]`, the wagon carries three parallel arrays: `professions[]`, `names[]`, `skinTones[]`. They are kept in lock-step — `names[i]` is the name of the person doing `professions[i]` with skin tone `skinTones[i]`.

In `renderWagonScreen` at line ~7587:

```javascript
if (idx >= 0) w.professions.splice(idx, 1);
else if (w.professions.length < 7) w.professions.push(p.name);
```

When the player deselects a profession (e.g., Carpenter at index 2), `w.professions.splice(2, 1)` removes it. **But `w.names` and `w.skinTones` are not spliced.** They remain as they were.

The bug only matters AFTER names have been entered. It surfaces when a player:

1. Picks 7 professions
2. Goes to naming stage, enters names (and the system writes skin tones)
3. Hits Back to the selection stage
4. Deselects one profession (splice)
5. Selects a replacement (push)
6. Returns to naming stage

After step 5, `professions[]` is `[Doctor, Hunter, Cook, Scout, Cowboy, Priest, Influencer]` but `names[]` is still `[DrBill, Bob, Carla, Cookie, Sam, Joe, Pat]`. So the Cook is now named "Carla" (Carpenter's name), the Scout is named "Cookie" (Cook's name), the Priest is named "Joe" (Cowboy's name), and the new Influencer is named "Pat" (Priest's name).

In a 4-player Competitive game with kids freely back-navigating, this fires roughly once per setup. The diligent player who carefully named "Carla the Carpenter" sees a Cook named Carla appear in the game, and the Carpenter they fought to include is gone. **Their work was erased without warning.** That's exactly what Nicholas described.

The same bug applies to skin tones, which is why characters look visually different too — but that's a compounding effect, not the root cause.

## Desired behavior

The required invariant: at all times when `w.stage === 'naming'` or beyond, `w.names.length === w.professions.length` AND `w.skinTones.length === w.professions.length`, AND the i-th element of `names`/`skinTones` describes the i-th profession.

## Implementation hints

The minimal fix is **lock-step splice**. When a profession is removed via `splice(idx, 1)`, also splice `names[idx]` and `skinTones[idx]`. When a profession is appended via `push`, also push `''` (empty name) and a fresh random skin tone. As a defensive measure, also reconcile arrays on entry to the naming stage: truncate or pad as needed.

A cleaner alternative architecture: refactor `professions/names/skinTones` into a single `members[]` array of `{profession, name, skinTone}` objects. Splice operates on whole objects atomically — alignment becomes structural, not procedural. This is more invasive but eliminates the entire class of bug. **Use your judgment — the minimal fix is acceptable, the structural fix is better.**

The user story `US-02` and the `team_alignment_fix` block in JSON describe this in more detail. Walk through US-02 in your build notes before implementing, confirming the expected outcome.

---

# Issue 1 — Visible dice roll

## What Nicholas observed

> "Dice roll is missing. Players are advanced and have no insight into how they advanced. Have a visual of what the dice say and the ability to move up to 12 spots (double 6). You should decide if this is too many moves for a player — maybe we just have a total of 8 moves forward is possible. Whatever you choose we should see the chance involved in the amount of moves forward."

## Root cause

In `doActionPushOn` (line ~7867), the code uses `die(4)` — a single 1d4 — and adds pace + state modifiers. The result is between 1 and ~6 spaces. The dice are NEVER shown to the player. After 300ms of silence, the wagon teleports to its new position. The audio is a generic dice rattle SFX but no visual.

Players can't see the chance involved, can't anticipate good or bad rolls, and feel like the game is happening to them rather than because of their choices.

## Desired behavior

Per `GAME_DATA.dice_system` in JSON. Switch to **2d6**. Movement = `raw_2d6 + pace_modifier + state_modifier + morale_modifier`, clamped to `[1, 8]`. Cap at 8 because 12 spaces in one turn would skip events on a 25-space Short trail and break the pacing.

Show the dice tumbling for 0.6 seconds, settling on visible faces with pip patterns. Show a brief summary of what the roll became after modifiers. Animate the wagon moving along the mini-map.

## Implementation hints

Two SVG dice with `<rect rx>` rounded corners and pip-pattern circles for faces 1-6. CSS keyframe animation rotates each die through random sequences during tumble (e.g., `rotateX` + `rotateY` cycling). On settle, the final face is rendered. A summary callout below the dice reads something like:

> *"Rolled 4 + 5 = 9 — pace Strenuous +1, team strong +1 = 11, capped at 8. Travel 8 spaces."*

The mini-map wagon icon then slides smoothly from current to new position over 0.8s before space resolution fires.

The dice display sits in the scene canvas, center, above the narrative callout area. Audio: dice rattle (existing 'dice' SFX) during tumble, soft chime on settle.

User story `US-06` in JSON walks through the expected end-to-end behavior.

---

# Issue 14 — Up to 6 wagons + autonomous git

## What Nicholas observed

> "We should be able to add up to six players total. Claude Code in the prior amendment kept asking me for permission to commit or do git stuff. This meant I had to be there in every step of the build. I do not want or need this. There should be only one engagement with git after the build is complete."

## Root cause

The wagon count selector caps at 4 (in `renderCountScreen`). And v2.2's commit cadence required checkpoint approvals.

## Desired behavior

Support 2, 3, 4, 5, or 6 wagons in Competitive mode. Each wagon has a unique color accent (deep rose, gold, navy, forest green, plum, copper) used on action-menu border, mini-map marker, and turn banner.

For git: **make all commits autonomously**. No prompts. No "shall I commit this stage?" Run the entire build start to finish, commit per stage on your own initiative, and only re-engage Nicholas with the final build report.

## Implementation hints

For wagon count: extend the count screen to show 6 cards. The wagon-color palette is already partially defined in JSON (the v2.0 amendment mentioned a few). Pick or extend to 6: `#B85770` (rose), `#D4AF37` (gold), `#3A5C7A` (navy), `#3D5A3D` (forest), `#7A4D6E` (plum), `#A87850` (copper). Document these in JSON as `wagon_color_palette`.

For class-period considerations: a 6-wagon Competitive game on the Short trail will run long. Add a small note on the count screen that 5-6 wagons are recommended for the Short trail only.

For git autonomy: just go. Stage your commits cleanly with descriptive messages. Don't pause.

---

# Issue 2 — Turn indicator + persistent player name

## What Nicholas observed

> "Player name does not persist when it is their turn so you can lose track of who is playing their turn."

## Root cause

In multi-wagon games, when `advanceWagon()` switches to the next wagon (line ~9213), it calls `paintScenery(w)` and `renderActionMenu()` but doesn't surface WHOSE turn it is to the player. The player name is buried in the team strip or in narrative callouts. With 4-6 players watching the same screen, kids lose track.

## Desired behavior

Per `GAME_DATA.turn_indicator_system`:

- **Turn banner** slides down from top of scene canvas at start of every wagon's turn: `"[Player Name]'s turn — [Wagon Name]"` in large serif italic. Wagon-color accent. Holds 2.5 seconds.
- **Persistent corner badge** at top-right of scene canvas, always visible: `"Now playing: [Player Name]"` with the wagon's color accent.
- **Audio cue**: cheerful 2-note chime when banner appears (different from worry chime).
- **Wagon color accents** propagate to: action menu border, mini-map marker, turn banner.

## Implementation hints

The turn banner is just a `<div>` positioned absolutely at the top of `.scene-canvas`, sliding down via CSS keyframe `transform: translateY(-100%)` → `translateY(0)`, holding, then fading out. The corner badge is a smaller version that stays put.

Inject a call to a new `showTurnBanner(w)` function at the top of `renderActionMenu()`. Track which wagon was last shown so the banner doesn't re-show when `renderActionMenu` is called mid-turn for ribbon refreshes.

User story `US-10` walks through expected multi-wagon behavior.

---

# Issue 5 — Turn-intro shouldn't repeat resolved-space narrative

## What Nicholas observed

> "The beginning of the turn for a player does not seem to advance, meaning if a player comes to a river and makes a choice they advance, when the turn comes around to them again the state they were at persists. It says they are still at the river."

## Root cause

In `buildTurnIntroCallout(w)` (line ~7795), the function calls `currentSpace()` to get the wagon's current space and includes the space's `info` text in the intro:

```javascript
const intro = (sp && sp.info) ? '<div class="event-flavor">"' + escapeHtml(sp.info) + '"</div>' : '';
```

This fires every time `renderActionMenu` is called — including when a wagon's turn comes around again in Competitive mode AFTER the river has already been resolved. The wagon is still parked at the river space (the river resolution doesn't move them; movement happens on the next Push On). So the turn-intro callout shows the river's flavor text on subsequent turns, making it LOOK like they're stuck at the river.

The river crossing event already happened. The wagon is past it. But the visual cue suggests otherwise.

## Desired behavior

Show space `info` in the turn-intro **only on the first turn at that space** — i.e., right after the wagon arrives. On subsequent turns at the same space (which only happens if the wagon didn't move that turn), use a generic intro that acknowledges they didn't progress.

## Implementation hints

Add `w.lastResolvedSpace = w.position` after a space resolves. In `buildTurnIntroCallout`, check if `w.position === w.lastResolvedSpace`. If yes, use a generic intro: `"Day [N] — preparing to push on from [region name]"`. If no, use the space info (this is the wagon's first time at this space).

A simpler alternative: skip the space info entirely on turns when `w.position` hasn't changed since the last action. The turn-intro should focus on "what's the team doing today?" not "what is this place?"

User story `US-03` describes the expected end-to-end. Validate it.

---

# Issue 7 — Water sources

## What Nicholas observed

> "Foraging and river crossing do not give the ability to get water. There literally only one place to get water and that is at a fort through purchase. Although forage says you can get berries and water, you only get berries no water. So many deaths of starvation occur. It makes no sense you can go to a river and not get water or you get to Soda Springs and you don't get water."

## Root cause

`doActionForage` at line ~7963: water is granted ONLY if a Scout is on the team, and only +1.

`resolveLandmark` at line ~8880: lands at Soda Springs (literally named for water), shows the historical fact card, returns 0 water.

`resolveRiver` at line ~8866 actually DOES grant water: `w.resources.water = RESOURCES_BY_NAME.water.max`. So that one works. But Nicholas says river crossings don't give water — which suggests either the playtest wagons crossed before the v2.1/v2.2 patch landed this line, or the line isn't firing in some path. Verify it fires across all four crossing methods (ford, caulk, ferry, guide).

## Desired behavior

Per `GAME_DATA.water_economy`. Multiple water sources:

- River crossing (any method): refill to max — already implemented, just verify
- Forage at any river/landmark space: +2 water always, +4 with Scout
- Forage on travel space: +1 water always, +3 with Scout
- Soda Springs landmark: +5 water + 1 morale on visit
- Hot Springs landmark: +4 water on visit
- Storm event: +2-3 water (rain caught)
- Spring/watering hole encounter: +2-3 water

The water economy should be a planning challenge in the high desert region, not a categorical scarcity everywhere.

## Implementation hints

`doActionForage`: rewrite to always grant water (1-4 depending on space type and Scout presence). Update narrative text accordingly. Update button label to honestly reflect "you get food and water; more if you have a Scout."

`resolveLandmark`: check `sp.name === 'Soda Springs'` after the existing flow and add a water bonus. Same for Hot Springs. Show an explicit narrative line in the landmark callout: *"The team filled every barrel from the bubbling springs. (+5 water, +1 morale)"*.

`resolveRiver`: the existing line `w.resources.water = RESOURCES_BY_NAME.water.max;` should fire across all four methods. Confirm it does. Also surface this in the post-crossing narrative explicitly: *"We filled the barrels at the river before crossing."*

User stories `US-04` and `US-05` walk through expected behavior. Validate them.

---

# Issue 4 — Music tempo and variety

## What Nicholas observed

> "Music for funeral and other events the tempo and variety is no good. The tempo is way too slow."

## Root cause

The encoded songs are: Oh Susanna (110 bpm), Sweet Betsy from Pike (100), Buffalo Gals (130), Shenandoah (60), Amazing Grace (60). Shenandoah is the only "weary" mood song — when a wagon has even one sick member, only Shenandoah plays, repeatedly, at 60 bpm. Amazing Grace at 60 bpm is funeral-pace. The ear gets fatigued fast. The encoded melodies are also short (15-25 notes) so they loop within ~30 seconds.

## Desired behavior

Per `GAME_DATA.music_system`:

1. **Add 4 more songs** (already in JSON): Old Dan Tucker (1843, 130 bpm, hopeful), Camptown Races (1850, 140 bpm, hopeful), Skip to My Lou (1844, 145 bpm, hopeful), Yellow Rose of Texas (1853, 95 bpm, neutral/weary). All period-accurate.
2. **Speed up Amazing Grace** from 60 bpm to 75 bpm. Re-encode with more notes for a richer, less plodding melody.
3. **Tempo variation rule**: within a mood pool, prefer alternating fast/slow — don't play 2 slow songs back-to-back. After a funeral hymn, the next song picked from mood pool should be at least 90 bpm (break the somber spell).

## Implementation hints

In the `melodies` object inside `_playSong()` (line ~7200), add the 4 new song encodings. Period songs are public domain. Sample melodies:

- **Old Dan Tucker** (130 bpm, hopeful): `'C4:1 C4:1 G4:2 G4:1 G4:1 A4:2 G4:1 G4:1 F4:1 E4:1 D4:2 C4:3'` — rough sketch, refine to taste
- **Camptown Races** (140 bpm, hopeful): the famous "Doo-dah doo-dah" rhythm — mostly C4-E4-G4 pattern with the C5 jump on "doo-dah day"
- **Skip to My Lou** (145 bpm, hopeful): simple 8-measure jig in F major
- **Yellow Rose of Texas** (95 bpm, neutral): waltz-like melody in 3/4

For Amazing Grace at 75 bpm with more notes, lengthen to ~25 notes for verse 1 of the hymn (D4-G4-B4-G4-B4-A4 etc).

For the tempo variation rule, in `pickNextSong(mood)`, after filtering by mood and excluding `lastPlayedId`, sort the eligible pool by `Math.abs(song.bpm - 110)` (preferring tempos different from the previous song). Pick from the top half of the sorted list randomly.

For the post-funeral rule: track `_lastWasFuneral` boolean. On the next pick after funeral, filter eligible pool to `bpm >= 90` only.

---

# Issue 9 — Death announcement consistency

## What Nicholas observed

> "Members died and then would not die and game end for some players — not all the time, but one player for example had a priest remaining, the message said the banker was weak and then it would say the person died, but the players game would not end. The priest in this case was immortal for several turns. Then the priest suddenly became the banker."

## Root cause

This is **largely a downstream effect of Issue 6** (the alignment bug). The player's mental model was: "I have a Priest at portrait position 5." But due to the Back-nav alignment bug, the data said "position 5 is named [Priest's name] but the profession is Banker." When the Banker died, the death announcement showed the Banker's profession with the Priest's name. The player saw their Priest die. But there was ALSO another wagon member (a real Priest, in a different slot) still alive. So the game didn't end.

The "priest suddenly became the banker" line is exactly this: same portrait, same name, different profession label after death.

## Desired behavior

Once Issue 6 is fixed, this should largely resolve. But also:

- Death announcement must use the **current alignment** of the team (read from `w.team[i]` directly, never from stale references).
- Elimination check (`livingMembers(w).length === 0`) must fire reliably whenever the last living member transitions to lost. Verify in test.
- If the player has been confused by a misaligned member dying, the journal entry should still record correctly (member name and profession at time of death).

## Implementation hints

Verify `presentDeathAnnouncement(w, deceased, onContinue)` reads `deceased.name`, `deceased.profession`, `deceased.skinTone` directly from the team member object, not from a snapshot. Verify the death overlay's `characterFullBody(deceased.profession, deceased.skinTone)` renders consistently with the team-strip portrait.

Add a console.log in `applyEndOfTurnDeathChecks` and `completeEndTurn` for elimination, just for the v2.3 build, so playtest reports can confirm timing. (Remove before final.)

User stories `US-01` (priest+banker scenario) describes the corrected behavior. Validate.

---

# Issue 11 — Hover tooltips replace fly-by toasts

## What Nicholas observed

> "There is a brief message that comes in from the right of the screen for 5-10 seconds that says how people are doing in your team — but that should be able to just mouse over the characters to see it."

## Root cause

The `transition-toast` system (line ~6170) shows a fly-by notification when a member's state changes. It auto-dismisses in ~4 seconds. Players who are looking elsewhere miss it entirely.

## Desired behavior

Per `GAME_DATA.hover_tooltip_system`:

1. **Disable** the transition-toast (keep the audio cue — worry chime — so the player has an auditory hint).
2. **Add** persistent hover/tap tooltips on team-strip portraits showing:
   - Member name + profession (large)
   - Current state with description (e.g., "Sick — coughing, fever. Doctor cannot heal until they recover")
   - Days in current state
   - Recovery probability if Doctor present
   - Cause of state if known
   - Profession bonus contribution if active
3. **State-change visual signal** (replaces toast): on state change, briefly flash entire portrait with colored glow matching new state, lasting 1.5 seconds.
4. **State-indicator badge** under the health bar with text: "healthy" / "tired" / "sick" / "hurt" / "dying".

## Implementation hints

Add `mouseenter` / `mouseleave` handlers on team portrait `<div>`s. Tooltip is a positioned `<div>` that appears next to the portrait, fades in over 100ms. CSS `pointer-events: none` on the tooltip itself so it doesn't trap hover.

For the flash effect: add a short-lived class `.state-just-changed` to the portrait on transition, with CSS keyframe pulsing the box-shadow color matching the new state, then auto-removing the class after 1.5s.

User story `US-08` describes the expected behavior.

---

# Issue 12 — Morale actually impacts play

## What Nicholas observed

> "Morale should really impact play."

## Root cause

Currently morale only affects: +1 movement at ≥8 (line 7875), music mood, and minor low-morale event branching. It's not a strategic resource.

## Desired behavior

Per `GAME_DATA.morale_impacts_v2_3`. Tiered effects:

**High morale (8-10):**
- +1 movement on Push On
- +10% Hunt success chance
- Members heal one state-tier on Rest (deterministic, instead of probabilistic)
- Surprise events 50% more likely positive

**Medium morale (4-7):** Standard play.

**Low morale (2-3):**
- -1 movement on Push On
- -15% Hunt success chance
- Surprise events 30% more likely negative

**Crisis morale (0-1):**
- -2 movement on Push On
- -25% Hunt success chance
- 10% chance per turn that 1 member quits (state→lost, cause='abandonment')
- 25% chance per turn of an Argument event (lose 1 day)

Plus expanded recovery and drain sources documented in JSON.

## Implementation hints

Centralize morale-effect lookups in a helper `getMoraleTier(morale)` returning one of `'high'`, `'medium'`, `'low'`, `'crisis'`. Use the tier in `doActionPushOn` (movement modifier), `doActionHunt` (success chance modifier), `doActionRest` (deterministic heal vs probabilistic), `triggerSurpriseEvent` (positive/negative weighting).

For the crisis-tier abandonment: in `endTurn` after state transitions, check if `getMoraleTier(w.resources.morale) === 'crisis'`. If yes, roll 10% per turn for one random living member to quit — transition to `lost` with cause `'abandonment'`. Use the existing death announcement pipeline but with a different narrative ("They could not bear the trail any longer. They turned back at first light.").

User story `US-09` walks through expected crisis behavior.

---

# Issue 10 — Trail News becomes useful

## What Nicholas observed

> "Does Trail News actually help?"

## Root cause

Trail News at fort (line ~8671) just lists the next 3 stops by name and type. Players already see this on the mini-map. No strategic value.

## Desired behavior

Per `GAME_DATA.trail_news_upgrade`. Show:

- Names of next 3-5 spaces (existing)
- Hazard hint if upcoming spaces include a tough river: *"A traveler reports the Snake River is running high."*
- Weather hint (40% chance): *"Storm clouds on the horizon."*
- Profession-relevant tip if Doctor on team: *"Cholera reports from the Platte River Valley."* If Carpenter: *"A wagon train reports broken axles ahead."*
- Random fact tied to next landmark
- Strategic tip about region scarcity (e.g., "Forts are scarce in the high desert. Stock up here.")

Format as a stylized broadside / handbill — period-appropriate.

## Implementation hints

In the `if (key === 'News')` branch (line ~8671), build a list of news items by examining: upcoming spaces (names + types), upcoming weather event probability, team composition (which professions could benefit from a tip), and the current region. Pick 3-5 items, render as a handbill — sepia background, period serif font, bullet-style list.

The narrative voice should be colloquial pioneer: *"A trader from the west says the river's still passable. Won't be in two weeks."*

---

# Issue 3 — Mini-map shows real board with all wagons

## What Nicholas observed

> "The map of the board on the bottom left should show a miniature of the actual board that is being played in real life and we should always be able to see where all players are in the map. You may need to reorg the UI to provide for this. You could always use collapsing or expanding window."

## Root cause

The current mini-map is a simplified line of dots, not a rendition of the physical 6-tile board. In multi-wagon games, only the active wagon is shown clearly.

## Desired behavior

Per `GAME_DATA.minimap_upgrade`:

- 320×200 px in collapsed state, expandable to 640×400 on click
- 3 tiles wide × 2 tile rows matching physical board
- Region color tinting per tile
- Named landmarks at correct positions
- All wagons shown as colored circles with player initial inside
- Currently-active wagon's marker pulses with halo
- Click to expand to full-screen overlay showing the same content larger

## Implementation hints

`renderMinimap` is the existing function. Refactor it to render an SVG with the 6-tile arrangement. Use the regional color palette from JSON (plains tan, foothills mauve, mountains purple-grey, desert beige, forest green). Label key landmarks (forts, rivers, named landmarks) with small text at their positions.

Wagon markers: small filled circles (~10px diameter) in each wagon's assigned color, with the player's first initial in white centered. Position by mapping `w.position` to the corresponding tile coordinates.

Active wagon: scale 1.3× and add an animated halo (CSS keyframe pulse).

For the expandable view: clicking the mini-map toggles a fullscreen overlay (`position: fixed; inset: 0; background: rgba(0,0,0,0.7);`) showing the mini-map at 2× scale. Click anywhere to close.

This is the most visually intensive part of v2.3. Take care with the layout but don't over-engineer — a clean SVG with regional tints and wagon markers is sufficient. Don't need to faithfully reproduce every illustration from the printed tiles.

---

# Day 67 — Easter egg

## What Nicholas observed

> "You are supposed to do something special on day 67! The kids think 67 is funny."

## Root cause

The v2.0 amendment specced "Day 67 (and other 30-day milestones) get a soft chime announcement" — but only as a chime. There was no special EVENT, and 67 isn't even a 30-day milestone (which would be 30, 60, 90, 120, 150). Nicholas wants a real beat for the 6th-graders' "six seven" meme.

## Desired behavior

Per `GAME_DATA.day_67_easter_egg`. First time `w.daysTraveled` reaches 67 in any wagon's journey, fire a special light comedic event:

- Title: *"Day 67 — A Strange Day"*
- Intro: *"It is Day 67. The number sixty-seven. The team looks around and laughs for no clear reason."*
- One of 4 random flavor texts
- Effects: +2 morale
- Audio: light flute riff (5-6 quick notes ascending then descending) + soft chime

## Implementation hints

In `completeEndTurn`, after the day-milestone check, add a Day 67 check. If `w.daysTraveled === 67 && !w._day67Fired`, fire the event and set the flag. Use the existing event-callout system. Pick a random flavor from the JSON's options.

Light flute riff via Web Audio: 5 short sine-wave tones at C5, E5, G5, A5, G5, each ~150ms, with a quick attack/decay envelope. Then a chime (existing `regionChime` SFX).

Don't make a big deal of it in code comments. Let the kids find it. User story `US-07` walks through it.

---

# Issue 8 — Real historical photos

## What Nicholas observed

> "Get real historic photos."

## Constraint and approach

The game must run offline as a single HTML file. Real photos can't be loaded over the network at runtime. They must be base64-embedded.

The right approach: deliver a Python or PowerShell script that downloads public-domain photos from the Library of Congress, encodes them as base64, and writes them into a `HISTORICAL_PHOTOS_OVERRIDE` constant inside `pink_oregon_trail.html`. Nicholas runs the script ONCE. The game then displays real photos at the 9 historical landmarks. If a photo can't be fetched, the existing daguerreotype SVG fallback is used.

## Implementation hints

Create a script `fetch_historical_photos.py` in the repo root. Each entry in `GAME_DATA.historical_illustrations.locations` already has a `historical_photo_search` hint pointing to LoC. The script:

1. For each of the 9 locations, try a known LoC image URL (hard-code them — no scraping)
2. Download via `urllib.request`
3. Resize to 600×460 max with PIL
4. Base64-encode
5. Read `pink_oregon_trail.html`
6. Write a `const HISTORICAL_PHOTOS_OVERRIDE = { fort_laramie: "<base64>", ... };` block at the top of the script section
7. Save back to `pink_oregon_trail.html`

The 9 LoC image URLs (verify these — they are stable LoC URLs as of this writing):

- **fort_laramie**: `https://tile.loc.gov/storage-services/service/pnp/cph/3a30000/3a35000/3a35200/3a35260v.jpg` (Albert Bierstadt, c. 1858)
- **chimney_rock**: `https://tile.loc.gov/storage-services/service/pnp/cph/3a40000/3a48000/3a48400/3a48468v.jpg` (William Henry Jackson)
- **independence_rock**: `https://tile.loc.gov/storage-services/service/pnp/cph/3c20000/3c25000/3c25800/3c25893v.jpg`
- **soda_springs**: search "Soda Springs Idaho 1870" on LoC; fallback to daguerreotype
- **south_pass**: `https://tile.loc.gov/storage-services/service/pnp/cph/3b40000/3b41000/3b41700/3b41716v.jpg`
- **fort_bridger**: search "Fort Bridger Wyoming 1858" on LoC
- **whitman_mission**: search "Whitman Mission Walla Walla" on LoC
- **the_dalles**: `https://tile.loc.gov/storage-services/service/pnp/cph/3a50000/3a52000/3a52900/3a52966v.jpg` (Carleton Watkins)
- **oregon_city**: `https://tile.loc.gov/storage-services/service/pnp/cph/3c10000/3c10400/3c10406v.jpg`

These URLs may need verification — if any fail, the script logs a warning and skips that entry; the game falls back to the SVG. It's acceptable to have only 5-7 of 9 photos succeed.

Inside `pink_oregon_trail.html`, the existing `historicalIllustrationFor(spaceName)` function should check `window.HISTORICAL_PHOTOS_OVERRIDE[id]` first and render an `<img src="data:image/jpeg;base64,...">` if present, falling back to the daguerreotype SVG otherwise. **This pattern is already specced** — just make sure it's actually implemented.

Document the script in the build report with a one-line instruction for Nicholas:

> *To upgrade with real photos: from the project root, run `python fetch_historical_photos.py`. The script downloads, encodes, and patches the HTML in place. Run it once. Real photos will appear at landmarks afterward. If you need to re-run the build, the override block survives.*

---

# Issue 13 — User-story validation pass (FINAL QA)

## What Nicholas observed

> "As a general statement I would like you the AI to think thoroughly through the logic of the game, use use cases and user stories and edge cases to explore the logic of the game — then test it and ensure that the game design has logic then have Claude Code build it. This is where Claude may need to take a larger role."

## Approach

The `simulation_logic_validation.required_user_stories_pre_implementation` block in JSON contains 10 user stories (US-01 through US-10). For each one:

1. **BEFORE implementing** the feature it validates: write a build-note paragraph describing how the user story plays out in the patched code. Confirm the expected behavior is achievable. If anything contradicts another spec or seems impossible, flag it as an open question and surface it.

2. **AFTER implementing**: walk through the user story step-by-step in actual play (or test harness if browser-required). Verify each expected outcome holds. Document the result in the build report.

This is the framework Nicholas asked for. The user stories are designed to catch the exact class of bug v2.2 missed (alignment, water absence, invisible dice, etc.).

In the build report, include a section "User Story Validation" with each story marked PASS / FAIL / NEEDS-PLAYTEST and a one-line note on what was confirmed. This becomes the gate for declaring v2.3 ready.

---

# Build report requirements (changes from v2.2)

In addition to the standard report structure, add:

### User Story Validation
- US-01 through US-10: PASS / FAIL / NEEDS-PLAYTEST with one-line confirmation each

### Pre-implementation reasoning per feature
- For each numbered issue, a one-paragraph "design walk-through" written BEFORE coding
- Surfaced any spec contradictions or ambiguities BEFORE implementing
- These should appear as build-note commits or as a single NOTES.md file

### Open questions / blockers
- As before, surface anything ambiguous explicitly

### git autonomy confirmation
- Confirm all commits made autonomously without prompts to user

---

# Critical reminders (unchanged across versions)

- Single self-contained HTML file. Vanilla HTML/CSS/JS. No frameworks.
- No external network requests at runtime. Must run from USB on a school Chromebook with WiFi off. (The historical photos fetcher script runs ONCE outside the game.)
- No words "AI", "Claude", "GPT", "LLM", "model", "agent", "chatbot" anywhere user-facing or in code comments.
- Period 1840s voice for all narration. No modern slang. No emojis in user-facing UI (except the Day 67 easter egg, which can be playful).
- Respectful representation of Native Americans (helpers, not adversaries — backed by historical fact).
- Member deaths handled with weight per the death announcement protocol.

This is v2.3. Build to it. Test against it. Report against it. No git prompts. Single engagement at the end.
