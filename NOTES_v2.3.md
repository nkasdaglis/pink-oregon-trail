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

