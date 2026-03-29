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

## API Quirks (from poll data analysis)

These were discovered by comparing live-play poll data vs finished-match poll data:

### Key ordering differs between `scorecard`/`extra` and `comments`/`wickets`

| Object | Finished Match Key Order | Live Match Key |
|--------|--------------------------|----------------|
| `scorecard` | 1st innings first (`"Team A 1 INN"`, `"Team B 2 INN"`) | Same |
| `extra` | 1st innings first | Same |
| `comments` | **2nd innings first** (`"Team B 2 INN"`, `"Team A 1 INN"`) | `"Live"` |
| `wickets` | **2nd innings first** | 1st innings first (roughly) |

This means `getFirstInningsKey(comments)` and `getFirstInningsKey(wickets)` return the **wrong innings** for finished matches. Affects: `powerplay_score`, `powerplay_wickets`, `first_wicket_over`.

### Entry ordering within arrays

| Object | Live Match Order | Finished Match Order |
|--------|------------------|----------------------|
| `comments[key][]` | Roughly chronological | **Reverse chronological** (latest ball first) |
| `wickets[key][]` | Mixed/roughly chronological | **Reverse chronological** (last wicket first) |

This means `wickets[key][0]` is the **last** wicket in finished matches, not the first. Affects: `first_wicket_over`.

### `event_status_info` uses abbreviations

The API uses short team codes in winner text: `"RCB won by 6 wickets"`, not full names. The `toCode()` mapping doesn't include abbreviations like `"RCB"` → `"RCB"`. Affects: `match_winner`.

### Non-batting players in scorecard

Finished match scorecards include all squad members (not just those who batted), with `R: "0"`, `B: "0"`, `status: ""`. Safe for calculations since `parseInt("0") = 0`.

### These bugs are masked by progressive resolution

Scenarios like `powerplay_score`, `powerplay_wickets`, and `first_wicket_over` are resolved **during live play** via `progressiveResolve()` (when data is in the right order). The `parseFullResults()` fallback runs at match end and would produce wrong results for these scenarios, but they're already resolved by then.

## Resolution Reliability

Based on analysis of poll data across pre-match, live, and finished match states.

### Reliable — will resolve correctly

| Scenario | Confidence | Why |
|----------|------------|-----|
| `toss_winner` | High | `event_toss` field is a simple, well-formatted string present as soon as the toss happens. Parsing is straightforward (split on `", elected to"`). Resolved progressively before the match starts. |
| `first_innings_score` | High | `extra` keys are in correct innings order (1st innings first) in both live and finished states. `parseInningsTotal` regex is reliable. Resolved progressively at innings break. |
| `total_match_runs` | High | Same `extra` source as `first_innings_score`, summing both innings. Key ordering is correct. Resolved at match end from `parseFullResults`. |
| `total_sixes` | High | Reads `6s` field from scorecard batsman entries. Scorecard keys are in correct order. All values are simple string integers. Non-batting players have `"0"` which is safe. |
| `total_wickets` | High | Reads `W` field from scorecard bowler entries. Same reliable scorecard structure. |
| `batsman_fifty` | High | Simple check: any batsman `R >= 50`. Scorecard data is reliable. Progressive "Yes" resolution works; "No" resolved at match end. |
| `bowler_three_wkt` | High | Simple check: any bowler `W >= 3`. Same reliable scorecard structure as above. |
| `had_super_over` | High | Checks `Object.keys(scorecard).length > 2`. Structural check, no parsing needed. |
| `top_scorer` | High | Finds max `R` across all batsmen. Scorecard is reliable. Only risk is tie-breaking (first in scorecard order wins — deterministic but arbitrary). |
| `top_wicket_taker` | High | Finds max `W` across all bowlers. Same as top_scorer. Tie-breaking is first in scorecard order. |

### Has known issues — works via progressive resolution but fallback path is broken

| Scenario | Confidence | Issue | Mitigation |
|----------|------------|-------|------------|
| `powerplay_score` | Medium | In finished matches: (1) `comments` keys are in reverse innings order, so `getFirstInningsKey` picks the 2nd innings; (2) ball entries are in reverse chronological order, so the loop breaks immediately at `over > 6.0`. Returns 0 or wrong innings data. | Progressive resolution during live play works correctly (comments key is `"Live"`, entries are chronological). Fallback only fires if the live engine missed the powerplay phase. |
| `powerplay_wickets` | Medium | In finished matches: `wickets` keys are in reverse innings order, so `getFirstInningsKey` picks the 2nd innings. The `filter` count itself works (checks all entries), but against the wrong innings. | Same as above — progressive resolution during live play uses correct key ordering. |
| `first_wicket_over` | Medium | In finished matches: (1) `wickets` keys reversed → wrong innings; (2) entries reversed → `fow[0]` is the last wicket, not the first. Even during live play, `fow[0]` may not be the actual first wicket (array isn't strictly ordered by time). | Progressive resolution fires as soon as the first wicket is detected during live polling. The fallback is broken for finished matches. |

### Has known bug — needs code fix

| Scenario | Confidence | Issue | Impact |
|----------|------------|-------|--------|
| `match_winner` | Low | API uses abbreviations in `event_status_info` (e.g., `"RCB won by 6 wickets"`). `parseMatchWinner` extracts `"RCB"`, but `toCode("RCB")` returns `null` because `TEAM_NAME_TO_CODE` only maps full team names. | Match winner is NOT set when the API uses abbreviations. This scenario resolves only at match end (no progressive path), so there is no fallback. **Needs fix: add abbreviation entries to `TEAM_NAME_TO_CODE`.** |

### Uncertain — depends on API behavior not yet observed

| Scenario | Confidence | Concern |
|----------|------------|---------|
| `player_of_match` | Medium | Depends on `event_man_of_match` field being populated. In our finished match data it was present (`"Jacob Duffy"`), but there may be a delay between `event_status = "Finished"` and the field being populated. If `parseFullResults` runs before the API populates it, the scenario won't resolve. Subsequent polls would need to re-check. |
| `most_sixes` | Medium | If no sixes are hit in the match (`mostSixes = 0`), the player name is not stored and the scenario is never resolved — all predictions would remain pending. Also, ties are broken by scorecard order (first found wins), which is deterministic but may not match official stats. |

## Source Files

| File | Purpose |
|------|---------|
| `supabase/migrations/004_seed_data.sql` | Scenario definitions (points_config table) |
| `supabase/migrations/002_views_functions.sql` | `resolve_match_predictions()` SQL function |
| `supabase/functions/match-live/index.ts` | Live engine: `progressiveResolve()`, `parseFullResults()` |
| `supabase/functions/_shared/deps.ts` | Parsing utilities (powerplay, wickets, etc.) |
| `web-app/src/lib/constants.ts` | `SYSTEM_SCENARIOS`, `RANGE_OPTIONS` |
