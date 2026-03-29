# Scenario Mapping

Authoritative reference for all 16 prediction scenarios. Each file documents the full pipeline: API response fields, DB storage, resolution logic, bracket options, and real API examples.

## Summary

| # | File | Category | Points | Input Type | Resolution Phase | DB Column |
|---|------|----------|--------|------------|------------------|-----------|
| 1 | [01_match_winner.md](01_match_winner.md) | `match_winner` | 10 | Team Pick | `end` | `matches.match_winner` |
| 2 | [02_toss_winner.md](02_toss_winner.md) | `toss_winner` | 5 | Team Pick | `toss` | `matches.toss_winner` |
| 3 | [03_top_scorer.md](03_top_scorer.md) | `top_scorer` | 15 | Player Pick | `end` | `matches.top_scorer` |
| 4 | [04_top_wicket_taker.md](04_top_wicket_taker.md) | `top_wicket_taker` | 15 | Player Pick | `end` | `matches.top_wicket_taker` |
| 5 | [05_player_of_match.md](05_player_of_match.md) | `player_of_match` | 20 | Player Pick | `post_match` | `matches.player_of_match` |
| 6 | [06_first_innings_score.md](06_first_innings_score.md) | `first_innings_score` | 10 | Range | `innings_break` | `matches.first_innings_score` |
| 7 | [07_total_match_runs.md](07_total_match_runs.md) | `total_match_runs` | 10 | Range | `end` | `matches.total_match_runs` |
| 8 | [08_powerplay_score.md](08_powerplay_score.md) | `powerplay_score` | 10 | Range | `powerplay` | `matches.powerplay_score` |
| 9 | [09_powerplay_wickets.md](09_powerplay_wickets.md) | `powerplay_wickets` | 10 | Range | `powerplay` | `matches.powerplay_wickets` |
| 10 | [10_total_sixes.md](10_total_sixes.md) | `total_sixes` | 10 | Range | `end` | `matches.total_match_sixes` |
| 11 | [11_total_wickets.md](11_total_wickets.md) | `total_wickets` | 10 | Range | `end` | `matches.total_match_wickets` |
| 12 | [12_batsman_fifty.md](12_batsman_fifty.md) | `batsman_fifty` | 10 | Yes/No | `mid_match` | `matches.batsman_scored_fifty` |
| 13 | [13_bowler_three_wkt.md](13_bowler_three_wkt.md) | `bowler_three_wkt` | 10 | Yes/No | `mid_match` | `matches.bowler_took_three` |
| 14 | [14_had_super_over.md](14_had_super_over.md) | `had_super_over` | 20 | Yes/No | `end` | `matches.had_super_over` |
| 15 | [15_most_sixes.md](15_most_sixes.md) | `most_sixes` | 15 | Player Pick | `end` | `matches.most_sixes_player` |
| 16 | [16_first_wicket_over.md](16_first_wicket_over.md) | `first_wicket_over` | 10 | Range | `first_wicket` | `matches.first_wicket_over` |

## Resolution Phases (chronological order)

1. **`toss`** — Resolved immediately when toss is called (before match starts)
2. **`first_wicket`** — Resolved when the first wicket of the match falls
3. **`powerplay`** — Resolved after 6 overs of the first innings
4. **`mid_match`** — Resolved progressively during the match (can resolve early if condition met)
5. **`innings_break`** — Resolved after the first innings completes
6. **`end`** — Resolved when the match is marked "Finished"
7. **`post_match`** — Resolved when post-match data (e.g., Man of the Match) is available

## Source Files

| File | Purpose |
|------|---------|
| `supabase/migrations/004_seed_data.sql` | Scenario definitions (points_config table) |
| `supabase/migrations/002_views_functions.sql` | `resolve_match_predictions()` SQL function |
| `supabase/functions/match-live/index.ts` | Live engine: `progressiveResolve()`, `parseFullResults()` |
| `supabase/functions/_shared/deps.ts` | Parsing utilities (powerplay, wickets, etc.) |
| `web-app/src/lib/constants.ts` | `SYSTEM_SCENARIOS`, `RANGE_OPTIONS` |
