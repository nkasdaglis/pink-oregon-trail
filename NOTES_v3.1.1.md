# NOTES — v3.1.1 quick-fix patch

Three small bugs from playtest, bundled into one ~1-hour build per
the v2.3 discipline.

---

## Stage 0 — orient

- v3.1.1 JSON: `meta.version === "3.1.1"`. New top-level key
  `v3_1_1_fixes` present with three fix blocks.
- `pink_oregon_trail.html` is the current v3.1 build (1.28 MB).
- The two regenerated paintable PDFs sit at the project root
  (board_short_paintable.pdf / board_extended_paintable.pdf,
  ~2.2 MB each).

---

## Stage 1 — day/night cycle stuck

**Diagnostic result: the bug was Cause A (and a smaller related
phase-arithmetic bug).**

- **A — was data-time being SET on every turn?** No.
  `paintScenery` (which calls `setTimeOfDayFromWagon`) only fires
  from `beginJourney` (game start) and `advanceWagon`
  (Competitive turn rotation). In Single-Player after day 1,
  `completeEndTurn` advances `daysTraveled` but never re-sets
  `data-time` — so the attribute stayed at whatever was set on
  day 1 forever.
- **B — were CSS selectors matching the right element?** Yes.
  `:root[data-time="…"]` matches `<html>`, which is where
  `document.documentElement.setAttribute('data-time', …)` sets it.
- **C — were the gradients bright enough?** Yes. The v2.9 Stage 1
  brightening targets are met (morning `#FDD89E`, midday `#B6D4E8`,
  afternoon `#F4D2A8`, dusk `#E8957B` top-stop). When the cycle is
  working, the sky reads bright at midday and warm at dusk per
  spec.

**Secondary bug surfaced during the diagnostic:** the phase formula
was `phases[Math.floor((daysTraveled||1) / 1) % 4]`, which simplifies
to `daysTraveled % 4`. With `daysPerTurn = 14` (short trail) this
only ever hits `phases[1]` (midday) and `phases[3]` (dusk) — morning
and afternoon were mathematically unreachable. Even on Competitive
where the cycle did update via `advanceWagon`, players never saw
those two phases.

**Fix applied:**

1. Phase formula now divides by `daysPerTurn` so each turn shifts
   exactly one phase. All four phases visible across the journey on
   both trail lengths. Verified by Node simulation:
   - Short (daysPerTurn=14): day 1 → morning, day 15 → midday,
     day 29 → afternoon, day 43 → dusk, day 57 → morning, …
   - Extended (daysPerTurn=9): day 1 → morning, day 10 → midday,
     day 19 → afternoon, day 28 → dusk, day 37 → morning, …
2. `completeEndTurn` now calls `setTimeOfDayFromWagon(w)` after the
   calendar advance. Single-Player journeys cycle through morning /
   midday / afternoon / dusk every turn. No regression on
   Competitive (which still gets the call from `advanceWagon`).

**Oregon City finish:** the v2.9 Stage 1 work already set
`document.documentElement.dataset.finish = '1'` in `resolveFinish`,
and CSS rule `:root[data-finish="1"] .region-backdrop .atmosphere
{ fill: url(#atmo-midday); }` overrides the time-of-day gradient
with a forced bright midday. No additional change needed for the
"sky bright at the win" requirement.

**Verification (descriptive — needs real-browser playtest):**
- Day 1 → morning: top-stop `#FDD89E` (warm dawn), bottom near-white.
- Day 15 → midday: top `#B6D4E8` (light blue sky), bottom near-white.
- Day 29 → afternoon: top `#F4D2A8` (golden hour), bottom near-white.
- Day 43 → dusk: top `#E8957B`, bottom `#C8A088` (moody but readable).
- Reach Oregon City: data-finish overrides — bright midday regardless
  of the wagon's actual phase.

JS parses cleanly. File size 1.28 MB → 1.28 MB (tiny delta).

## Stage 1 complete — sky now cycles through all four phases each turn in every game mode

---

## Stage 2 — race-to-fort hidden when at a fort + bonus fort-doctor choice

**Root cause:** `distanceToNextFort(w)` iterates from `p = w.position`
(current position INCLUDED). When the wagon sits on a fort space, it
returns 0. The choice filter at `buildInterventionChoices` was
`distFort <= 3`, which is true for distFort=0 — so race_to_fort
displayed even though the wagon was already at a fort. The player's
choice would then call `nextFortAheadAny` (which IS strictly-ahead)
and race to the NEXT fort, contradicting the visible scene state.

**Fix:**

1. New helper `currentSpaceIsFort(w)` — returns true when the
   wagon's current trail space has `type === 'fort'`.
2. `buildInterventionChoices` filter:
   - `race_to_fort` shows when `!atFort && distFort > 0 && distFort <= 3`.
   - `use_fort_doctor` shows when `atFort`.
3. New JSON choice `use_fort_doctor` added to
   `warning_escalation_system.pre_death_intervention.choices` (in
   both the inline JSON inside pink_oregon_trail.html AND the
   standalone oregon_trail_game_data.json):
   - `effects.recovery_probability: 0.65` (no Doctor on team
     required; Doctor on team adds the existing +0.15 bonus →
     0.80, capped at 1.0)
   - `effects.days_added: 0` (already at the gates)
   - `narrative_success`: "The fort's doctor takes {name} into
     the infirmary. Hours pass. By sundown {name} is alive —
     pale, weak, but alive." (period 1840s voice, per spec)
   - `narrative_failure`: "The fort's doctor did everything that
     could be done. {name} did not survive the fever."

The existing `resolveInterventionChoice` is JSON-driven (reads
recovery_probability / narrative_success / narrative_failure from
the choice object), so no special-case JS was needed — just adding
the JSON entry made the new choice fully resolvable.

**Verification (Node sim):**

| Position | Type | Available choices |
|---|---|---|
| Pos 5 (Fort Kearny) | fort | use_fort_doctor, stop_and_tend, pray_and_continue, continue_at_full_pace |
| Pos 8 (2 ahead of Fort Laramie) | plain | race_to_fort, stop_and_tend, pray_and_continue, continue_at_full_pace |
| Pos 1 (start, no fort within 3) | start | stop_and_tend, pray_and_continue, continue_at_full_pace |
| Pos 10 (Fort Laramie, last fort) | fort | use_fort_doctor, stop_and_tend, pray_and_continue, continue_at_full_pace |

All four cases match the spec. Race-to-fort never shows when at a
fort; use_fort_doctor always shows when at a fort.

## Stage 2 complete — race_to_fort properly hidden at forts; use_fort_doctor takes its place

---

## Stage 3 — refresh deployed paintable PDFs

`board_short_paintable.pdf` (2,242,594 bytes) and
`board_extended_paintable.pdf` (2,248,978 bytes) copied from the
project root into `docs/`. Both within the spec's expected ~2.2 MB
range.

## Stage 3 complete — PDFs in docs/, ready for the deploy commit

---

## Stage 4 — deployment commit

Pending: refresh `docs/play.html` (= current pink_oregon_trail.html)
+ stage and commit per spec line 174-178.