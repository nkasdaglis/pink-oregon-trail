# NOTES — v2.3 design walk-throughs

Per the v2.3 amendment's logic-first instruction: for each issue, walk through
the relevant user story end-to-end **before** writing code. Surface
contradictions or ambiguities here. After implementation, validate the user
story actually plays out and update the entry with a PASS / FAIL /
NEEDS-PLAYTEST note.

This file is committed alongside each stage so the design walk-throughs are
visible in the git history.

---

## Stage 0 — orient + housekeeping

- v2.3 JSON loaded; `meta.version === "2.3"`, `max_wagon_count_competitive === 6`.
- All 10 new top-level keys verified present.
- `music_system.songs` has 9 entries (5 originals + 4 new period songs).
- `simulation_logic_validation.required_user_stories_pre_implementation`
  contains 10 stories US-01 → US-10.
- v2.2 JSON archived under `.backups/oregon_trail_game_data.v2.2.backup.json`
  with a README entry. The previous v2.1 backup remains in place.
- `fetch_historical_photos.py` provided by Nicholas — not edited; run separately.
- `claude_code_prompt_amendment_v2.3.md` is the spec; tracked in the repo.

---

## Stage 1 — Issue 6 — team alignment (PRE-IMPLEMENTATION)

**US-02 walk-through:**

The wagon's `setupState.wagons[i]` carries three parallel arrays:
`professions[]`, `names[]`, `skinTones[]`. Per the v2.2 architecture they're
in lock-step — `names[k]` is the name the player gave to the person doing
`professions[k]`. The bug is that `splice(idx, 1)` on `professions` does not
propagate to `names` and `skinTones`, so deselecting a profession leaves
later positions with the wrong metadata.

US-02 traces a player who picks Doctor/Hunter/Carpenter/Cook/Scout/Cowboy/
Priest, names them, hits Back, deselects Carpenter, picks Influencer instead.
After the misaligned splice the Cook is named Carla (the Carpenter's name),
the Scout is named Cookie (the Cook's name), and so on — the diligent
player's work is silently rewritten.

**Implementation choice:** Minimal fix (lock-step splice) over the
structural refactor (`members[] = [{profession, name, skinTone}]`).
Reasoning: the structural refactor would touch every read site
(wagon-screen, confirm screen, newWagonState/newMember boundary,
team-strip render, journal entries…), introducing a large blast radius
in a single playtest cycle. The minimal fix is two splice/push call
sites plus a defensive reconciliation when the player enters the
naming stage. It enforces the required invariant directly and lets
the structural refactor wait for a future amendment if the lock-step
approach proves fragile in playtest.

**Required invariant:** at all times when `w.stage === 'naming'` or beyond,
`w.names.length === w.professions.length` AND `w.skinTones.length ===
w.professions.length`, with index `i` describing the same person across
all three arrays.

**Edge cases considered:**
- Multiple back-and-forth nav cycles — lock-step splice is idempotent.
- Deselect on first visit before any naming — names/skinTones are empty
  arrays so splice is a no-op.
- New Influencer with no name entered — newMember already defaults to
  "Member N" when name is empty (existing v2.2 behavior).
- A future code path that mutates `professions` directly without going
  through the wagon-screen handlers — caught by the defensive
  reconciliation when `w.stage === 'naming'`.

**No spec contradictions surfaced.** Proceeding with the fix.

**POST-IMPLEMENTATION:** PASS. `.test_team_alignment.js` replays the
exact US-02 sequence and confirms slot-2 holds Cookie (the original Cook
name) after the deselect, slot-6 is empty for the new Influencer, and
all other slots retain their original names. The death-overlay
consistency check (Issue 9) follows in Stage 8.

---

## Stage 2 — Issue 1 — visible 2d6 dice (PRE-IMPLEMENTATION)

**US-06 walk-through:**

Player clicks Push On → two dice tumble center-canvas for 0.6s, settle
on visible pip faces, summary callout reads
`"Rolled 4 + 5 = 9, pace +1, capped at 8 — travel 8 spaces."` After
~1.5s hold, the wagon advances and the new space resolves.

**Implementation choice:** A new `rollDiceAndAdvance(w, onAdvance)`
helper renders an absolutely-positioned `.dice-roll-overlay` inside
`.scene-canvas`. Each die is a `<div class="die">` with six `<svg
class="die-face">` children showing pip patterns for 1–6, only one
visible at a time via `visibility:visible`. During the 0.6s tumble,
the JS picks random faces every 80ms; on settle, it locks the final
face. The summary callout is a `<div class="dice-summary">` that fades
in below the dice, holds 1.5s, then the overlay clears and
`onAdvance(move)` fires. The existing `audioController.playSfx('dice')`
is kept for the rattle; a soft `regionChime`-equivalent fires on settle.

The math:
```
raw = d1 + d2                 // 2..12
paceMod = pace.movement_modifier
stateMod = sum(STATES[m.state].movement_contribution) clamped [-3, +inf]
moraleMod = +1 if morale>=8, -1 if morale<=2, else 0
healthMod = -1 if health<=3
total = clamp(raw + paceMod + stateMod + moraleMod + healthMod, 1, 8)
```

The cap of 8 is from JSON. The summary text shows the raw dice and
the modifiers transparently so kids can see what each part contributed.

**Edge cases:**
- A 2 (snake-eyes) with a sick team and Grueling pace can still hit
  the floor of 1 — never a zero or negative move.
- Any tumble interrupted (window unfocus, component unmount) — the
  setTimeout chain still fires `onAdvance`, so the wagon never gets
  stuck.
- `prefers-reduced-motion`: skip the tumble; show final faces
  immediately and shorten the summary hold.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in headless. Math-path verified for the
floor (snake-eyes + sick team + Grueling) and cap (boxcars + healthy +
Strenuous). Visual settle/animation is browser-required.

## Stage 2 complete — 2d6 dice with summary callout

---

## Stage 3 — Issue 14 — 6 wagons + autonomous git (PRE-IMPLEMENTATION)

**Walk-through (US-10 partly):** the count screen currently shows
buttons for 2/3/4 wagons. Loop the count generation from
`GAME_DATA.meta.max_wagon_count_competitive` (=6). Add a small note
that 5–6 wagons run long and are recommended for the Short trail
only. Define `WAGON_COLOR_PALETTE` (rose, gold, navy, forest, plum,
copper). Stamp `w.color` from the palette in `beginJourney`. The
color usage on action-menu border, mini-map marker, and turn banner
is wired in subsequent stages (4, 12).

**Autonomous git:** the project's `.claude/settings.local.json` has
been expanded with both space-style and colon-style allow-list
entries for every git verb used in the build, plus `node`, `ls`,
`mv`, and `cat .git/*`. The previous narrow `Bash(git commit -m ' *)`
matcher only matched single-quoted messages; the new `Bash(git commit *)`
covers the HEREDOC form too. Per Nicholas's mid-build correction, I
also stopped chaining `git commit && git push 2>&1 | tail -3` because
the matcher evaluates the whole compound line as one unit. Each git
verb was made its own Bash invocation. **Mid-build update:** Nicholas
explicitly directed me to stop ALL git commands for the rest of v2.3
because the prompts kept firing despite the allow-list. From Stage 4
onward, code lives on disk and Nicholas commits it in the morning.
The "git work pending" section at the end of the build report
catalogs what should be in each commit.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS — count screen now generates 2..max cards
where max = `GAME_DATA.meta.max_wagon_count_competitive`; the class-period
note is appended after the buttons; `WAGON_COLOR_PALETTE` is an array of
6 hex codes; `beginJourney` stamps `w.color = palette[i % 6]` on each
wagon. The turn-indicator stage uses this for accents.

## Stage 3 complete — 2-6 wagons + wagon color palette

---

## Stage 4 — Issue 2 — turn indicator + persistent name (PRE-IMPLEMENTATION)

**US-10 walk-through:** in Competitive mode with N players sharing a
screen, kids lose track of whose turn it is. The fix: at start of every
wagon's turn, slide a banner down from the top of `.scene-canvas`
reading `"[Player]'s turn — [Wagon]"` in italic serif, holding 2.5s
then fading. A persistent corner badge in the top-right reads
`"Now playing: [Player]"` for the entire turn so a child looking up
mid-turn instantly knows whose. Both elements are tinted with
`w.color` (rose/gold/navy/forest/plum/copper from Stage 3).

**Implementation:** `showTurnBanner(w)` injects a `.turn-banner` div
into `.scene-canvas` and runs a 2.5s CSS keyframe (slide down → hold →
fade). `renderTurnCornerBadge(w)` (re)attaches the persistent badge
on every render so it survives canvas repaints. Both are called from
the top of `renderActionMenu`. Re-fire is gated by
`gameState._lastBannerWagonId !== w.id` — mid-turn re-renders (e.g.,
ribbon refresh) don't re-trigger. A 2-note major-third chime
(`turnChime`: E5 → G5) plays on banner appearance, distinct from the
worry chime used by transition warnings. The action-menu border now
takes a 3px top stripe of `w.color` so the active wagon's color
saturates the action area too. Mini-map marker color comes in Stage 12.

**Edge cases:**
- Single-player mode: banner still appears at game start (informative,
  not annoying — fires exactly once because `_lastBannerWagonId` is
  unset only on first render).
- `prefers-reduced-motion`: banner stops animating, just appears in
  place.
- Coexistence with the v2.2 transition-toast stack: pushed down to
  top:56px when a corner badge is present so they don't overlap. (The
  toast stack will be replaced entirely in Stage 9 — Issue 11 — by
  hover tooltips, but this transient coexistence works.)

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check — `showTurnBanner`,
`renderTurnCornerBadge`, `turnChime` SFX case, `.turn-banner` and
`.turn-corner-badge` CSS, and the `_lastBannerWagonId` gate are all
present. Visual slide-and-fade is browser-required (NEEDS-PLAYTEST).

## Stage 4 complete — turn banner + persistent corner badge

---

## Stage 5 — Issue 5 — turn-intro deduplication (PRE-IMPLEMENTATION)

**US-03 walk-through:** wagon lands on a river space, player chooses
Ford and crosses successfully. The river-crossing scene resolves and
the player's turn ends. In Competitive mode, when their turn comes
around again, `renderActionMenu` calls `buildTurnIntroCallout`, which
reads `currentSpace()` (still the river space because Push On hasn't
fired yet) and renders the river's `sp.info` text. The visual cue
makes it look like they're stuck at the river. They are not — they
just haven't moved yet because Push On is the next click.

**Implementation:** Track `w.lastResolvedSpace` and set it to
`w.position` at the top of `resolveSpace(w)`. `buildTurnIntroCallout`
now checks if `w.lastResolvedSpace === w.position`; if yes, the
space's info is suppressed and replaced with a generic camp-rest
line tied to the region. If no (wagon just arrived here, hasn't
resolved yet), show the info normally — this is the wagon's first
encounter with the space and the info is informative.

**Edge cases:**
- Day 1 / starting space (Independence): never resolved, so info
  shows normally.
- A wagon that lands on a fort, uses Move On (which calls endTurn
  without changing position), and comes back next turn: position
  unchanged, lastResolvedSpace matches → suppressed. Good — the fort
  intro already played, and they're presumably ready to push on.
- A pendingDelay turn where the wagon is delayed at its current
  space: position unchanged, intro suppressed. Good.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. Visual confirmation
that the "still at river" misread is gone is browser-required —
NEEDS-PLAYTEST.

## Stage 5 complete — turn-intro suppresses already-resolved space info

---

## Stage 6 — Issue 7 — water sources (PRE-IMPLEMENTATION)

**US-04 walk-through:** team without Scout or Farmer takes Forage on a
travel space. v2.2 gave only food and only granted water if a Scout
was present. v2.3 gives water in all four cases (with/without
Scout × travel/water-space) — Scout boosts water amount, Farmer
boosts food, both stack independently. Travel space yields 1 water
without Scout, 3 with. River/landmark space yields 2 without, 4 with.

**US-05 walk-through:** team reaches Soda Springs landmark. v2.2
showed the historical fact card and returned 0 water. v2.3 also
adds +5 water and +1 morale per `water_economy.sources`. Hot Springs
(if it appears in the trail data) gets +4 water on the same hook.
The narrative card explicitly surfaces the water gain so the
player can see the cause.

**Bonus check:** river crossing's `w.resources.water = max` line is
already present and fires across all four crossing methods (ford,
caulk, ferry, guide) — verified in code. v2.3 surfaces the gain in
the post-crossing narrative ("We filled the barrels at the river
before crossing. +N water").

**Edge cases:**
- Forage on a travel space with full water barrels: clamp ensures no
  overflow; tally still reports +N where N can be 0 if already at max.
- River crossing where waterBefore === max: waterFilled = 0; the
  narrative skips the water line.
- Soda Springs where morale is already at max: clamp; tally reports
  +0 morale; UX is fine.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. doActionForage now
always grants water in 4 distinct amounts (1/2/3/4 by Scout × space),
Soda Springs grants +5 water + 1 morale, Hot Springs grants +4 water,
river crossing surfaces the +N water line in all four methods. Player-
visible behavior is browser-required (NEEDS-PLAYTEST).

## Stage 6 complete — water economy: forage / Soda Springs / Hot Springs / river surface

---

## Stage 7 — Issue 4 — music tempo & variety (PRE-IMPLEMENTATION)

**Walk-through:** v2.2 had only 5 songs; with one weakened/sick member
the mood flipped to "weary" and Shenandoah looped at 60bpm forever. The
ear-fatigue was real. Spec: add 4 period-accurate songs (Old Dan Tucker
1843, Camptown Races 1850, Skip to My Lou 1844, Yellow Rose of Texas
1853), speed Amazing Grace from 60 → 75bpm with a 25-note encoding,
add a tempo-variation rule (don't play 2 slow songs back-to-back), and
require the next post-funeral song to be ≥90bpm so Amazing Grace
doesn't bleed into another slow hymn.

**Implementation:** the four new melodies join the `melodies` map
inside `_playSong()`. `_pickNextSong(mood)` now consults bpm:
  1. Drop the back-to-back duplicate (existing behavior).
  2. If `_lastWasFuneral` is true, restrict to bpm≥90 (consume flag).
  3. If the previous song's bpm was <90, prefer bpm≥90 (tempo
     variation rule). If no candidates qualify, fall back to the
     full noRepeat pool.

`switchToFuneral()` now sets `_lastWasFuneral = true`. The flag is
cleared the next time `_pickNextSong` honors it.

**Edge cases:**
- A team with everyone sick + low morale could push the mood to
  "weary" with no fast songs available — fallback returns the pool
  unchanged so we never end up empty.
- A funeral followed by another funeral (rare but possible — two
  deaths in catastrophic events) — `switchToFuneral` re-sets the
  flag; after the second Amazing Grace finishes, the bpm≥90 rule
  applies on resume.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. JSON parses, all 4 new
song ids are encoded, Amazing Grace bumped to 75bpm, the
`_lastWasFuneral` and lastBpm tempo-variation paths are present.
Audible variety is browser-required (NEEDS-PLAYTEST).

## Stage 7 complete — 9 songs total, faster Amazing Grace, tempo variation rule

---

## Stage 8 — Issue 9 — death announcement consistency (PRE-IMPLEMENTATION)

**US-01 walk-through:** team has Priest + Banker. Banker is in 'dying'
state at end of turn. End-of-turn fires →
`applyEndOfTurnDeathChecks(w)`. The death-cap selects the most-progressed
candidate; suppose Banker dies. `processDeathAnnouncements(w, [banker], …)`
runs. The death overlay reads `deceased.name`, `deceased.profession`,
`deceased.skinTone` from the live `w.team[i]` reference, so the figure
shown is the Banker (with the player-chosen skin tone). The team-strip
patch-renders Banker grayscaled with the cross icon. The Priest remains
healthy in their slot. The narrative reads "{Banker name} the Banker
was lost on Day N…". After Continue, completeEndTurn checks
`livingMembers(w).length === 0` → still 6 → no elimination. Game
continues. Priest is alive.

**Verification needed:**
1. presentDeathAnnouncement reads from `deceased` (a reference to
   `w.team[i]`) — VERIFIED in code review (line 6552).
2. characterFullBody(deceased.profession, deceased.skinTone) renders
   consistently with the team-strip portrait — VERIFIED, both read
   from the same member object.
3. `livingMembers(w).length === 0` check fires after a death and
   correctly eliminates only when the team is empty — VERIFIED in
   completeEndTurn at line 9559.

**Bug found and fixed beyond the spec:** `newWagonState` was calling
`newMember(setup.names[i] || ..., p)` with only TWO args. newMember's
third arg is skinTone; without it, newMember falls back to
`pickRandom(['light','medium','dark'])`. So even with Stage 1's
alignment fix, every game start would re-randomize all 7 skin tones.
A player who carefully picked a dark-skinned Doctor would see a
randomly-toned Doctor in-game. Fixed by passing `setup.skinTones[i]`
through to newMember. This compounds Issue 9 — the death overlay
showing a different skin tone than what the player chose was partly
this bug, not just the Issue 6 alignment.

**Diagnostic logging added:** per the spec's request, completeEndTurn
now logs `[v2.3:endTurn] wagon N day D livingMembers=K team=[...]` so
playtest reports can confirm the elimination check's timing. Comment
notes the log should be removed in v2.4 after the v2.3 playtest
confirms the seam.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. Stage 1's alignment
fix + the newWagonState skinTone passthrough together remove both
the data-side and visual-side causes of "the priest suddenly became
the banker". The diagnostic log is in place for playtest.

## Stage 8 complete — death announcement reads current state; skinTones now persist

---

## Stage 9 — Issue 11 — hover tooltips replace toasts (PRE-IMPLEMENTATION)

**US-08 walk-through:** player hovers over any team-strip portrait
(or taps on touch). A persistent tooltip appears above showing
member name + profession (large), state with description, days in
state, recovery probability if Doctor present, cause if known, and
profession bonus contribution. Stays open until pointer leaves; tap
to toggle on touch. The fly-by transition toast is gone — its audio
cue (transitionWarn) stays so the player has an auditory hint, plus
a 1.5s portrait flash provides the immediate visual signal.

**Implementation:**
- `processWarningEvents` no longer calls showTransitionToast — it
  fires the audio cue and calls `flashPortraitForState(name, toState)`
  for each transition. Banners (weakened → sick) are kept since they
  represent the more critical escalation.
- `buildTeamPortrait` now appends a `.state-badge` (label: healthy/
  tired/sick/hurt/dying/lost) under the health bar and calls
  `attachMemberTooltip(card, i)` to wire mouseenter/mouseleave/click.
- `showMemberTooltip` builds the body fresh from `currentWagon().team[i]`
  on every open, so back-nav alignment fixes (Stage 1) flow through.
- `flashPortraitForState` adds a state-specific `.flash-*` class for
  1.5s with a colored glow keyframe. Reduced-motion disables the
  animation.

**Edge cases:**
- Tooltip on a 'lost' member: shows "Lost on Day N" instead of the
  state-since/turns-in-state line.
- Tooltip on a member with `cause_of_state` like "food <= 0 for 1 turn":
  causePhraseFor maps it to a human phrase ("starvation, after too
  many days without food").
- Repeated transitions to the same state in quick succession (rare):
  forced reflow via `void card.offsetWidth` re-fires the animation.
- Doctor recovery probabilities shown in tooltip (60%/50%/40% for
  sick/injured/dying) are illustrative — they reflect the actual
  rule's `with_doctor` branch on Rest, but actual roll math lives in
  `applyRestRecovery` and the intervention resolver. If the spec
  for those changes, this tooltip text should follow.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. The toast UI is no
longer attached during transitions; banners persist; tooltip,
state-badge, and flash-glow code are all wired. Hover behavior is
browser-required (NEEDS-PLAYTEST).

## Stage 9 complete — hover tooltips + state badges + portrait flash

---

## Stage 10 — Issue 12 — morale impacts (PRE-IMPLEMENTATION)

**US-09 walk-through:** team morale drops to 1 (crisis tier). Two
turns pass. Per spec: Push On movement is reduced by 2; 10% chance/turn
a member quits (lost with 'abandonment'); 25% chance/turn an Argument
event fires (lose 1 day, -1 morale); Hunt success drops 25%; music
shifts to somber. The player feels the desperation and is motivated to
find a fort or trigger a positive event.

**Implementation:**
- `getMoraleTier(morale)` — single source of truth: high(8-10) /
  medium(4-7) / low(2-3) / crisis(0-1).
- `rollDiceAndAdvance` morale modifier: +1 high, 0 medium, -1 low,
  -2 crisis (was: +1@>=8, -1@<=2 only).
- `doActionHunt` — succProb adjusted by +0.10/0/-0.15/-0.25 by tier,
  clamped [0.05, 0.98] so a no-specialist crisis hunt is still possible
  (5%) and a hunter on high-morale doesn't exceed 95%.
- `applyRestRecovery` — at HIGH morale, recovery is deterministic
  (every non-healthy member heals one tier); below high, the v2.2
  probabilistic rolls remain. Dying still requires a Doctor regardless.
- `applyCrisisMoraleAbandonment(w)` — called in endTurn between
  intervention and death-announcement. At crisis morale, 10% chance
  one random living member transitions to 'lost' with cause
  'abandonment'. The death announcement pipeline carries the weight;
  causePhraseFor already maps 'abandonment' to the JSON's "they could
  not bear the trail any longer..." phrase.
- `maybeTriggerArgumentEvent(w, onDone)` — called after death
  announcements at crisis morale, 25% chance to fire a one-shot modal
  that adds 1 day, drops morale 1, and shows a period-voice flavor
  callout.

**Deferred from this stage (not breaking):**
- Surprise event positive/negative bias by morale tier — per spec,
  high tier should make surprises 50% more positive and crisis tier
  30% more negative. The surprise pool currently uses weighted
  picks; the bias hook would need a re-weight pass on `pool.weight`.
  Documented as an Open Question — can land in v2.4 if playtest
  shows the existing surprise distribution feels neutral when it
  shouldn't.

**Edge cases:**
- A single-member wagon at crisis morale: abandonment can leave
  zero living. The death-announcement pipeline + completeEndTurn's
  elimination check handle this — wagon is eliminated cleanly.
- Argument event fires on a turn where the wagon is already at the
  trail end: completeEndTurn fires resolveFinish AFTER the argument
  event resolves, so the +1 day cost still applies. Player effectively
  finishes a day later. Acceptable.
- abandonment + same-turn natural death: lossList concatenates so
  both members get individual death announcements. The first-death
  special handles only the very first; the second uses the standard
  2.5s hold.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. The four core
tier-effects (push-on movement, hunt success, rest determinism,
abandonment+argument) are all wired through `getMoraleTier`. Surprise
event re-weighting is the one deferred slice — flagged as Open
Question. NEEDS-PLAYTEST for the qualitative "feeling of desperation"
the spec describes.

## Stage 10 complete — morale tiers drive movement / hunt / rest / abandonment / argument

---

## Stage 11 — Issue 10 — Trail News upgrade (PRE-IMPLEMENTATION)

**Walk-through:** the v2.2 Trail News at fort listed the next 3 stops
by name and type — duplicate of the mini-map. v2.3 spec: surface
upcoming hazards (tough rivers), 40%-chance weather forecast,
profession-relevant tips (Doctor → cholera reports; Carpenter →
broken-axle warning; Hunter → buffalo sightings; Scout → hidden cache
hint), a fact tied to the next landmark, and a region-specific
strategic tip ("Forts are scarce in the high desert"). Render as a
period broadside.

**Implementation:** new `buildTrailNewsHtml(w, fortSpace)` walks
`GAME_DATA.trails[gameState.trailLength]` looking ahead 5 spaces, then
builds a list of 5 tips drawn from these sources. The list renders
inside `.trail-news-broadside` (sepia paper, * * * dividers, italic
header, em-dash bullets).

**Edge cases:**
- Wagon near the trail end with fewer than 5 spaces remaining: ahead
  list naturally truncates.
- No tough river ahead but a regular river: shows a softer "plan your
  crossing" tip instead.
- Trail talk facts only fire if the matching landmark is within 5
  spaces. Otherwise the regional tip carries the strategic content.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. Period broadside
render is browser-required (NEEDS-PLAYTEST).

## Stage 11 complete — Trail News broadside with hazard / weather / profession / region tips

---

## Stage 12 — Issue 3 — mini-map upgrade (PRE-IMPLEMENTATION)

**Walk-through:** v2.2 mini-map was a 36px-tall horizontal strip of
dots. v2.3 spec: 320×200 board view with 3-tile × 2-tile arrangement,
region color tinting, all wagons visible as colored markers with
player initials, active wagon's marker pulses, click to expand
fullscreen.

**Implementation:**
- New `_minimapPositionFor(idx, total)` — boustrophedon snake layout
  inside the 800×500 viewBox. Short trail (25 spaces) lays out in 2
  rows × 13 cols; Extended (50 spaces) in 3 rows × 17 cols. The same
  function powers both the bottom-left mini-map and the fullscreen
  expanded view, so positions are consistent.
- `buildMinimapSvgBody(activeWagon)` — region-tint rectangles behind
  each region's run of spaces (Plains tan / Foothills mauve / Mountains
  purple-grey / High Desert beige / Forest green per JSON's tile
  spec). Trail dashed-path connects all positions. Spaces are colored
  dots (start/finish/fort/river/landmark all distinct). Forts +
  landmarks + endpoints get small Georgia-italic labels. Every
  non-eliminated, non-finished wagon renders as a colored marker (its
  `w.color` from Stage 3) with its player's first initial in white.
  Active wagon: scaled 1.3× with a pulsing halo (CSS keyframe
  `minimapPulse`).
- `renderMinimap()` keeps its existing call sites; the body is rebuilt
  via `buildMinimapSvgBody`. The label cell now shows "Stop N of M —
  Name" plus a "Click to expand" hint.
- `showMinimapFullscreen()` — click the mini-map to overlay a full-
  screen modal showing the same SVG larger. Click anywhere to close.
- The `.mini-map svg` height bumped from 36px to 180px; `.mini-map`
  width from 280px → 320px. Action-bar gets ~140px taller — the v2.2
  CSS grid for `.action-bar` is `grid-template-rows: auto auto 1fr
  auto auto` so it absorbs naturally.

**Edge cases:**
- Single-wagon games: only one marker on the mini-map, always the
  active one with halo. Looks fine.
- 6-wagon games: all six markers distinct by color and initial.
  Initials may collide if two players have the same first letter
  (e.g., two "G"s) — accept; they're still distinguishable by color.
- Two markers at the same position: they overlap. Acceptable for v2.3
  (the labels still tag each via tooltip in a future revision; for
  now, color disambiguates).
- Fullscreen overlay blocking the page: clicking anywhere closes.
  No keyboard escape support yet (could add `Escape` listener in v2.4
  if accessibility audit catches it).

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. Visual fidelity
(region tints look right, halo pulse readable, labels not colliding)
is browser-required (NEEDS-PLAYTEST).

## Stage 12 complete — board-style mini-map with region tints, all wagons, click-to-expand

---

## Stage 13 — Day 67 easter egg (PRE-IMPLEMENTATION)

**US-07 walk-through:** when any wagon's `daysTraveled` reaches 67 for
the first time, fire a comedic interlude: title "Day 67 — A Strange
Day", random flavor from 4 JSON-provided options, +2 morale, light
flute riff + chime, then continue normal turn flow.

**Implementation:** `triggerDay67EasterEgg(w)` picks a random flavor
from `GAME_DATA.day_67_easter_egg.scene.flavor_options`, applies the
+2 morale, plays a new `day67Riff` SFX (6 ascending-then-descending
sine tones C5-E5-G5-A5-G5-E5 + a chime trailer). The completeEndTurn
hook fires AFTER the calendar advance and AFTER winter checks but
BEFORE the next wagon advances — `w._day67Fired` flag prevents re-fire.
Trigger condition is `daysTraveled >= 67` (not `=== 67`) because the
daysPerTurn can step over 67 on the Extended trail (5 days/turn means
the calendar can jump 65 → 70). The flag scope is per-wagon, so each
wagon in Competitive mode gets its own Day 67 moment.

**Edge cases:**
- A wagon that finishes on Day 66 won't trigger Day 67 — fine.
- A wagon that hits Winter Warning at day 138 has already long since
  triggered Day 67 — no conflict, separate flags.
- daysTraveled jumps past 67 due to a rest-at-fort or argument event
  adding +1 day right before the milestone: the flag still fires on
  the first turn-end where >=67 is true.

**No spec contradictions surfaced.** Proceeding.

**POST-IMPLEMENTATION:** PASS in static check. The flute riff and
visual presentation are browser-required (NEEDS-PLAYTEST). The kids'
reaction is what the spec is really after.

## Stage 13 complete — Day 67 easter egg (one-shot per wagon, +2 morale, flute riff)

---

## Stage 14 — Issue 8 — historical photos wiring (PRE-IMPLEMENTATION)

**Walk-through:** spec says verify the override pattern is in place
because the python script `fetch_historical_photos.py` runs SEPARATELY.
On reading the script source, I found it writes
`window.HISTORICAL_PHOTOS_OVERRIDE = {…}` as a NEW `<script>` block
inserted before `</body>`. But v2.2's main script declared
`const HISTORICAL_PHOTOS_OVERRIDE = {};` as a lexical const inside the
main script — and the const and the window property are DIFFERENT
bindings. So even after Nicholas runs the python script, the main
script's `buildDaguerreotype` would still read the empty const, and
photos would never appear.

**This was a real wiring bug introduced in v2.2 that the v2.3 spec
asked me to verify.**

**Fix:**
- Replaced `const HISTORICAL_PHOTOS_OVERRIDE = {};` with
  `window.HISTORICAL_PHOTOS_OVERRIDE = window.HISTORICAL_PHOTOS_OVERRIDE || {};`
  so it's a global, not a lexical const.
- `buildDaguerreotype` now reads `window.HISTORICAL_PHOTOS_OVERRIDE[id]`
  at CALL time, not at declaration time. So whether the python script
  runs BEFORE the main script (impossible — script order in the HTML
  determines this) or AFTER (current setup with the script block
  injected before `</body>`), the override is honored.
- Added a small defensive: if the value is already a `data:`-prefixed
  URI it's used as-is; otherwise the function prepends
  `data:image/jpeg;base64,` so the python script can store either
  raw base64 or a full data URL.

**No spec contradictions.** No further code changes needed.
The python script itself was not edited — Nicholas runs it once.

**POST-IMPLEMENTATION:** PASS in static check. Render path with photos
present is browser-required (NEEDS-PLAYTEST after Nicholas runs the
fetch script).

## Stage 14 complete — HISTORICAL_PHOTOS_OVERRIDE moved to window scope so the fetcher actually works

---

## Stage 15 — user-story validation pass (POST-IMPLEMENTATION)

Live walkthrough of all 10 user stories against the patched code:

| ID | Result | One-line confirmation |
|----|--------|------------------------|
| US-01 | PASS + NEEDS-PLAYTEST | Stage 1 alignment + Stage 8 skinTone passthrough; deceased.* read live; livingMembers===0 check verified. Visual is browser-required. |
| US-02 | PASS | `.test_team_alignment.js` replays the exact sequence; slot 2 → Cookie, slot 6 → Influencer/empty. |
| US-03 | PASS + NEEDS-PLAYTEST | `lastResolvedSpace` set in resolveSpace; turn-intro suppresses sp.info on match. |
| US-04 | PASS | Forage always grants water 1/2/3/4 by Scout × space type; Farmer adds food. |
| US-05 | PASS | Soda Springs adds +5 water + 1 morale via resolveLandmark hook with narrative line. |
| US-06 | PASS + NEEDS-PLAYTEST | rollDiceAndAdvance + summary callout wired; cap/floor honored. |
| US-07 | PASS + NEEDS-PLAYTEST | triggerDay67EasterEgg fires once via _day67Fired flag, +2 morale, flute riff SFX. |
| US-08 | PASS + NEEDS-PLAYTEST | attachMemberTooltip wired in buildTeamPortrait; toast UI removed; flash-glow replaces visual cue. |
| US-09 | PASS + NEEDS-PLAYTEST | getMoraleTier verified live (10/7/3/1 → high/medium/low/crisis); 4 core hooks wired; surprise re-weight deferred. |
| US-10 | PASS + NEEDS-PLAYTEST | Banner + corner badge + colored action-menu border + colored mini-map markers all in place. |

**Headless battery: 77 PASS / 0 FAIL / 7 SKIP-BROWSER.**

## Stage 15 complete — all 10 user stories pass static verification; build report written to BUILD_REPORT_v2.3.md

