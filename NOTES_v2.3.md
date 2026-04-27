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

