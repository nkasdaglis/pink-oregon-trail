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

