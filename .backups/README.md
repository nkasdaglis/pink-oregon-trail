# Backups

Historical snapshots of `oregon_trail_game_data.json` from prior amendment rounds.
Kept under a leading-dot directory so they don't clutter casual `ls` views, but
git tracks them so we can verify behavior across versions when a regression
appears.

| File | When | Notes |
|---|---|---|
| `oregon_trail_game_data.v2.1.backup.json` | Apr 26, 2025 (Apr 26 in repo) | Pre-v2.2 snapshot. Contains the v2.1 amendment additions (money_economy, music_system, death_announcement_protocol, hunt_action) atop the v2.0 base, but does NOT yet have the v2.2 keys (difficulty_settings, warning_escalation_system, per_member_health_bar, teacher_mode_use_cases, historical_illustrations, testing_protocol). Useful for regression-checking v2.1 behavior. |

Add new backup entries here when a JSON snapshot is committed for archival.
