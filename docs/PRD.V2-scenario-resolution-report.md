# Scenario Resolution Report — Sportmonks Live Data Analysis

**Date:** 2026-04-05
**Purpose:** Validate that every scenario in `PRD.V2.md` can be resolved from real Sportmonks live match data, document the actual resolution method used, and flag any deviations from the PRD.

**Source data:** `api-tester/responses/sportsmonk/live-data/` — three polling sessions captured during a real IPL 2026 match.

**Tracked match:** Fixture `69526` — Gujarat Titans (GT, home/localteam 1976) vs Rajasthan Royals (RR, away/visitorteam 7) at Narendra Modi Stadium. Final: RR 210/6 (20) — GT 204/8 (20). RR won by 6 runs.

---

## Data Coverage Summary

| Session | Rounds | Coverage | Notes |
|---------|--------|----------|-------|
| `live-2026-04-04T13-54-33` | 1–181 | Pre-match → mid-2nd innings | Captured toss (already set at round 1), full 1st innings (201/6 → 210/6), and start of 2nd innings. Killed mid-2nd innings. |
| `live-2026-04-04T16-13-32` | 1–170 | Mid-2nd innings → finished + 35 post-match polls | Captured end of 2nd innings, match finish, and ~25 minutes of post-match polls. |
| `live-2026-04-05T04-09-26` | 1 | Next morning (authoritative state) | Only session where `man_of_match_id` is populated. |

**Total:** 352 poll rounds across ~14 hours of real-match tracking.

**Poll interval:** 45 seconds (configured via manifest). _Note: PRD specifies 15s; this dataset was captured at 45s which is why some transitions span multiple rounds._

---

## Key Rounds (for reference)

| Event | Session | Round | File |
|-------|---------|-------|------|
| Toss set (status: `NS`) | 1 | 001 | `live-2026-04-04T13-54-33/round-001/fixture-69526.json` |
| First ball (status: `1st Innings`) | 1 | 011 | `round-011/fixture-69526.json` |
| Away team PP end (RR 69/0 @ 6.0) | 1 | 050 | `round-050/fixture-69526.json` |
| Last `1st Innings` round | 1 | 154 | `round-154/fixture-69526.json` |
| Innings Break | 1 | 155 | `round-155/fixture-69526.json` |
| First `2nd Innings` round | 1 | 177 | `round-177/fixture-69526.json` |
| Home team PP end (GT 56/0 @ 6.0) | 2 | 028 | `live-2026-04-04T16-13-32/round-028/fixture-69526.json` |
| Last `2nd Innings` round | 2 | 135 | `round-135/fixture-69526.json` |
| First `Finished` round (MoM still null) | 2 | 136 | `round-136/fixture-69526.json` |
| Last round of session 2 (MoM still null after 35 post-finished polls) | 2 | 170 | `round-170/fixture-69526.json` |
| Next-morning poll (MoM finally populated) | 3 | 001 | `live-2026-04-05T04-09-26/round-001/fixture-69526.json` |

---

## Per-Scenario Resolution

### Scenario 1: `toss_winner`

| Field | Value |
|-------|-------|
| **Resolvable** | Yes |
| **Confidence** | High |
| **Resolved Value** | Team 7 (Rajasthan Royals), elected: `batting` |
| **Source** | Fixture field `toss_won_team_id` + `elected` |
| **Key File** | `live-2026-04-04T13-54-33/round-001/fixture-69526.json` |
| **PRD Method** | "Direct field. Map to internal team UUID via `v2_league_teams.api_id`." |
| **Deviation from PRD** | None |

**Notes:** Toss data was populated from round 1 even though match status was `NS`. Resolution can happen as soon as polling begins for a fixture on match day — no need to wait for `1st Innings` status.

---

### Scenario 2: `match_winner`

| Field | Value |
|-------|-------|
| **Resolvable** | Yes |
| **Confidence** | High |
| **Resolved Value** | Team 7 (Rajasthan Royals); `note: "Rajasthan Royals won by 6 runs"` |
| **Source** | Fixture field `winner_team_id` |
| **Key File** | `live-2026-04-04T16-13-32/round-136/fixture-69526.json` (first `Finished`) |
| **PRD Method** | "Direct field. Map to internal team UUID via `v2_league_teams.api_id`." |
| **Deviation from PRD** | None |

**Notes:** Set the instant `status` becomes `Finished`. No delay observed.

---

### Scenario 3: `top_scorer`

| Field | Value |
|-------|-------|
| **Resolvable** | Yes |
| **Confidence** | High |
| **Resolved Value** | Dhruv Jurel, 75 runs (team 7) |
| **Source** | Batting include — max `score` across all batting entries |
| **Key File** | `live-2026-04-05T04-09-26/round-001/fixture-69526.json` (also present in session 2 round 136+) |
| **PRD Method** | "Find max `score` across all batting entries (both innings). Tiebreaker: fewer balls faced." |
| **Deviation from PRD** | None |

**Notes:** 18 total batting entries in this match. Tiebreaker logic (fewer balls) not needed — Jurel was clear top scorer.

---

### Scenario 4: `top_wicket_taker`

| Field | Value |
|-------|-------|
| **Resolvable** | Yes |
| **Confidence** | High |
| **Resolved Value** | Ravi Bishnoi, 4 wickets (team 7) |
| **Source** | Bowling include — max `wickets` across all bowling entries |
| **Key File** | `live-2026-04-05T04-09-26/round-001/fixture-69526.json` |
| **PRD Method** | "Find max `wickets` across all bowling entries (both innings). Tiebreaker: fewer runs conceded." |
| **Deviation from PRD** | None |

**Notes:** 12 bowling entries. Bishnoi was clear top wicket-taker with 4; tiebreaker not needed.

---

### Scenario 5: `most_sixes_player`

| Field | Value |
|-------|-------|
| **Resolvable** | Yes |
| **Confidence** | High |
| **Resolved Value** | Dhruv Jurel, 5 sixes |
| **Source** | Batting include — max `six_x` per player |
| **Key File** | `live-2026-04-05T04-09-26/round-001/fixture-69526.json` |
| **PRD Method** | "Sum `six_x` per player across both innings. Find max. Tiebreaker: fewer balls faced." |
| **Deviation from PRD** | None |

**Notes:** Since batters don't typically appear in both innings in a single T20 match, the "sum per player across both innings" step is a no-op here. For safety the aggregation logic should still be applied in case of super overs.

---

### Scenario 6: `player_of_match`

| Field | Value |
|-------|-------|
| **Resolvable** | Yes |
| **Confidence** | High (but with a major caveat) |
| **Resolved Value** | Player 9459 — Ravi Bishnoi |
| **Source** | Fixture field `man_of_match_id` |
| **Key File** | `live-2026-04-05T04-09-26/round-001/fixture-69526.json` |
| **PRD Method** | "Direct field. Map to internal UUID via `v2_players.api_id`." |
| **Deviation from PRD** | **Yes — significant delay discovered** |

**🚨 CRITICAL FINDING:** `man_of_match_id` was `null` for all 35 rounds of session 2 post-match polls (~25 minutes after match finished). It was only populated the next morning in session 3 (captured ~12 hours after the match ended).

**Implication for PRD:**
- The "post_match" resolution phase cannot be treated as immediate
- The cron function must continue polling the fixture endpoint for hours (potentially until the next day) after `status = Finished` until `man_of_match_id` is no longer null
- The UI should show "Awaiting Player of the Match" until this resolves

**Recommended change:** Add a note to the PRD that POTM resolution is eventually-consistent and may take several hours post-match.

---

### Scenario 7: `home_team_innings_score`

| Field | Value |
|-------|-------|
| **Resolvable** | Yes |
| **Confidence** | High |
| **Resolved Value** | GT: 204 runs (8 wickets, 20 overs) |
| **Source** | Runs include, filter where `team_id == localteam_id` (1976) |
| **Key File** | `live-2026-04-04T16-13-32/round-136/fixture-69526.json` (first `Finished`) |
| **PRD Method** | "Runs include: `score` where `team_id` = home team" |
| **Deviation from PRD** | None (but important clarification) |

**⚠️ IMPORTANT:** In this match, the home team (GT) batted **second** (inning 2). Resolution logic **must not** assume "home team = innings 1". The correct filter is `team_id == localteam_id`, not `inning == 1`. The PRD method is correct as written, but implementation must be careful.

---

### Scenario 8: `away_team_innings_score`

| Field | Value |
|-------|-------|
| **Resolvable** | Yes |
| **Confidence** | High |
| **Resolved Value** | RR: 210 runs (6 wickets, 20 overs) |
| **Source** | Runs include, filter where `team_id == visitorteam_id` (7) |
| **Key File** | `live-2026-04-04T13-54-33/round-154/fixture-69526.json` (last `1st Innings`) |
| **PRD Method** | "Runs include: `score` where `team_id` = away team" |
| **Deviation from PRD** | None |

**Notes:** RR was the away team (visitorteam_id=7) and batted first. Same "team_id filter, not inning filter" rule applies.

---

### Scenario 9: `home_team_powerplay_runs`

| Field | Value |
|-------|-------|
| **Resolvable** | Yes |
| **Confidence** | High (with caveat about cache anomalies) |
| **Resolved Value** | GT: 56 runs at end of 6 overs |
| **Source** | Runs include during live polling — capture when `team_id == localteam_id` and `overs == 6` (or first crossing ≥ 6.0) |
| **Key File** | `live-2026-04-04T16-13-32/round-028/fixture-69526.json` |
| **PRD Method** | "Captured during live polling (15s interval) when home team overs first reach >= 6.0." |
| **Deviation from PRD** | Minor — caching issue requires defensive logic |

**⚠️ CACHE ANOMALY DISCOVERED:** At session 2 / round 25, the API returned `overs: 6.4` (which would have triggered our capture logic). But at round 26, it returned `overs: 5.4` (went backwards!). This is a cache/consistency issue on Sportmonks' side.

**Recommended defensive logic:**
1. Track `max(overs)` seen so far per team per fixture
2. Require the value to persist across ≥ 2 consecutive rounds before locking in the powerplay snapshot
3. Or: only capture when the value is a whole `6` (not 6.1, 6.2, etc.) — this locks in the exact state at the powerplay end

---

### Scenario 10: `away_team_powerplay_runs`

| Field | Value |
|-------|-------|
| **Resolvable** | Yes |
| **Confidence** | High |
| **Resolved Value** | RR: 69 runs at end of 6 overs |
| **Source** | Runs include during live polling — capture when `team_id == visitorteam_id` and `overs == 6` |
| **Key File** | `live-2026-04-04T13-54-33/round-050/fixture-69526.json` |
| **PRD Method** | Same as #9 for away team |
| **Deviation from PRD** | None |

---

### Scenario 11: `home_team_powerplay_wickets_lost`

| Field | Value |
|-------|-------|
| **Resolvable** | Yes |
| **Confidence** | High |
| **Resolved Value** | 0 (GT lost no wickets in powerplay) |
| **Source** | Runs include during live polling — `wickets` field at same snapshot as powerplay runs capture |
| **Key File** | `live-2026-04-04T16-13-32/round-028/fixture-69526.json` |
| **PRD Method** | "Captured during live polling when home team overs cross 6.0 — count wickets at that point." |
| **Deviation from PRD** | None |

---

### Scenario 12: `away_team_powerplay_wickets_lost`

| Field | Value |
|-------|-------|
| **Resolvable** | Yes |
| **Confidence** | High |
| **Resolved Value** | 0 (RR lost no wickets in powerplay) |
| **Source** | Runs include at away team powerplay snapshot |
| **Key File** | `live-2026-04-04T13-54-33/round-050/fixture-69526.json` |
| **PRD Method** | Same as #11 for away team |
| **Deviation from PRD** | None |

---

### Scenario 13: `total_match_runs`

| Field | Value |
|-------|-------|
| **Resolvable** | Yes |
| **Confidence** | High |
| **Resolved Value** | 414 runs (210 + 204) |
| **Source** | Runs include — sum of `score` across both innings |
| **Key File** | `live-2026-04-04T16-13-32/round-136/fixture-69526.json` |
| **PRD Method** | "Sum `score` from all innings. Map to bracket option." |
| **Deviation from PRD** | None |

**Bracket:** 414 → "400+" bracket.

---

### Scenario 14: `total_match_sixes`

| Field | Value |
|-------|-------|
| **Resolvable** | Yes |
| **Confidence** | High |
| **Resolved Value** | 19 sixes |
| **Source** | Batting include — sum of `six_x` across all 18 batting entries |
| **Key File** | `live-2026-04-04T16-13-32/round-136/fixture-69526.json` |
| **PRD Method** | "Sum `six_x` across all batting entries (both teams, both innings). Map to bracket." |
| **Deviation from PRD** | None |

**Bracket:** 19 → "16-20" bracket.

---

### Scenario 15: `total_match_wickets`

| Field | Value |
|-------|-------|
| **Resolvable** | Yes |
| **Confidence** | High |
| **Resolved Value** | 14 wickets (6 + 8) |
| **Source** | Runs include — sum of `wickets` across both innings |
| **Key File** | `live-2026-04-04T16-13-32/round-136/fixture-69526.json` |
| **PRD Method** | "Sum `wickets` from all innings. Map to bracket." |
| **Deviation from PRD** | None |

**Bracket:** 14 → "13-15" bracket.

---

### Scenario 16: `total_match_catches`

| Field | Value |
|-------|-------|
| **Resolvable** | Yes |
| **Confidence** | Medium |
| **Resolved Value** | 13 (using "count of batting entries where `catch_stump_player_id` is not null") |
| **Source** | Batting include |
| **Key File** | `live-2026-04-04T16-13-32/round-136/fixture-69526.json` |
| **PRD Method** | "Count batting entries where `catch_stump_player_id` is not null. May include stumpings." |
| **Deviation from PRD** | None — PRD already marks this as TODO |

**Notes:**
- 13 of 14 total dismissals had `catch_stump_player_id` set (the 14th was likely bowled, LBW, or run out)
- This **includes stumpings** — Sportmonks doesn't distinguish catches from stumpings via this field
- The `wicket_id` field has different values (54 observed for dismissed, 84 for not out) but we don't have a full mapping of `wicket_id` values to dismissal types
- **PRD TODO remains open:** Need to either (a) get the `wicket_id` → dismissal type mapping from Sportmonks to filter out stumpings, or (b) rename the scenario to "Total catches + stumpings" to be accurate

---

### Scenario 17: `first_wicket_over`

| Field | Value |
|-------|-------|
| **Resolvable** | Yes |
| **Confidence** | High (with important clarification) |
| **Resolved Value** | First wicket at `fow_balls = 6.2` → over 7 (using `floor(6.2) + 1 = 7`) |
| **Source** | Batting include — min `fow_balls` in first innings entries |
| **Key File** | `live-2026-04-05T04-09-26/round-001/fixture-69526.json` |
| **PRD Method** | "Find minimum `fow_balls` across all batting entries in the first innings (where `fow_balls > 0`). Convert to over number: `floor(fow_balls) + 1`." |
| **Deviation from PRD** | None (formula validated) |

**Notes:**
- `fow_balls = 6.2` is in `X.Y` format where X = completed overs and Y = ball in current over (0-5 legal balls)
- 6.2 means "after 6 overs and 2 balls bowled = the wicket fell during the 7th over"
- The conversion `floor(6.2) + 1 = 7` correctly maps to "over 7"
- **Bracket mapping:** Over 7 → "6+" bracket (matches the PRD brackets: 1, 2, 3, 4-5, 6+)
- First wicket fell to Vaibhav Suryavanshi at team score 70

---

### Scenario 18: `fifty_scored`

| Field | Value |
|-------|-------|
| **Resolvable** | Yes |
| **Confidence** | High |
| **Resolved Value** | `true` — 3 fifties scored: Yashasvi Jaiswal (55), Sai Sudharsan (73), Dhruv Jurel (75) |
| **Source** | Batting include |
| **Key File** | `live-2026-04-04T16-13-32/round-136/fixture-69526.json` |
| **PRD Method** | "Check if any batting entry has `score >= 50`. Boolean result." |
| **Deviation from PRD** | None |

---

### Scenario 19: `bowler_three_wickets`

| Field | Value |
|-------|-------|
| **Resolvable** | Yes |
| **Confidence** | High |
| **Resolved Value** | `true` — Ravi Bishnoi took 4 wickets |
| **Source** | Bowling include |
| **Key File** | `live-2026-04-04T16-13-32/round-136/fixture-69526.json` |
| **PRD Method** | "Check if any bowling entry has `wickets >= 3`. Boolean result." |
| **Deviation from PRD** | None |

---

### Scenario 20: `super_over`

| Field | Value |
|-------|-------|
| **Resolvable** | Yes |
| **Confidence** | High |
| **Resolved Value** | `false` |
| **Source** | Fixture field `super_over` |
| **Key File** | Any round (populated from round 1) |
| **PRD Method** | "Direct boolean field." |
| **Deviation from PRD** | None |

---

## Summary Table

| # | Scenario | Confidence | Deviation from PRD |
|---|----------|-----------|---------------------|
| 1 | `toss_winner` | High | None |
| 2 | `match_winner` | High | None |
| 3 | `top_scorer` | High | None |
| 4 | `top_wicket_taker` | High | None |
| 5 | `most_sixes_player` | High | None |
| 6 | `player_of_match` | High (with caveat) | **Delayed up to 12+ hours post-match** |
| 7 | `home_team_innings_score` | High | None (clarified: use team_id filter) |
| 8 | `away_team_innings_score` | High | None (clarified: use team_id filter) |
| 9 | `home_team_powerplay_runs` | High | Minor — cache anomaly defense needed |
| 10 | `away_team_powerplay_runs` | High | None |
| 11 | `home_team_powerplay_wickets_lost` | High | None |
| 12 | `away_team_powerplay_wickets_lost` | High | None |
| 13 | `total_match_runs` | High | None |
| 14 | `total_match_sixes` | High | None |
| 15 | `total_match_wickets` | High | None |
| 16 | `total_match_catches` | Medium | Pre-existing TODO (stumpings) |
| 17 | `first_wicket_over` | High | None (formula validated) |
| 18 | `fifty_scored` | High | None |
| 19 | `bowler_three_wickets` | High | None |
| 20 | `super_over` | High | None |

**All 20 scenarios are resolvable from Sportmonks live data.**

---

## Critical Findings & Recommendations

### 1. Player of the Match has long post-match delay (highest-priority finding)

`man_of_match_id` was `null` for ~25 minutes of post-match polling, then was populated by the next morning. **The PRD's `post_match` resolution phase needs to account for hours (not minutes) of delay.**

**Recommendation:** The scenario resolution cron must:
- Continue polling the **fixture endpoint** (not livescores) after `status = Finished`
- Poll until `man_of_match_id` is no longer null
- Have a generous timeout (at least 24 hours post-match)
- Users should see "Awaiting Player of the Match" until this resolves

### 2. `livescores` endpoint drops Finished fixtures

Once a fixture's status becomes `Finished`, it disappears from the `livescores` array. Post-match scenarios must be resolved by polling the **specific fixture endpoint** (`/fixtures/{id}?include=...`), not `livescores`.

### 3. Cache anomalies in live data

Observed non-monotonic overs values (5.3 → 6.4 → 5.4) across consecutive polls. **Powerplay capture logic must be defensive:**
- Track max overs seen per team
- Require persistence across ≥ 2 consecutive rounds before locking the snapshot
- Or only capture at exact whole-number crossings (overs == 6.0)

### 4. Home/Away vs batting order

**Home team does not always bat first.** In this match, GT (home) batted second. All team-specific scenarios must filter by `team_id` (matching `localteam_id` or `visitorteam_id`), **not** by inning number.

### 5. Toss is available immediately

`toss_won_team_id` and `elected` are populated in the fixture response even when `status = NS`. Toss scenario can be resolved as soon as the match day polling begins — no need to wait for `status = 1st Innings`.

### 6. Fixture endpoint has full data during live match

The fixture endpoint's `batting`, `bowling`, `runs`, and `scoreboards` arrays are populated and updated every poll cycle during a live match. No need to wait for completion to access scorecards.

### 7. Catches vs stumpings (pre-existing PRD TODO)

`catch_stump_player_id` combines catches and stumpings. To distinguish them, we would need the full mapping of `wicket_id` values to dismissal types — which is not in our spec. **Recommendation:** Either request this mapping from Sportmonks support, or rename the scenario to "Total catches + stumpings" for clarity.

### 8. Poll interval mismatch

Captured dataset uses 45-second intervals; PRD specifies 15 seconds. With 15s polling, the cache anomaly risk is reduced (more snapshots to cross-reference) but not eliminated — defensive logic is still needed.

---

## PRD Updates Required

Based on this analysis, the following updates should be made to `PRD.V2.md`:

1. **Player of Match resolution** — add note about eventual consistency (hours/days delay)
2. **Powerplay capture** — add note about cache anomaly defense (persistence check or max tracking)
3. **Scenario resolution endpoint** — clarify that post-match scenarios must use fixture endpoint, not livescores
4. **`total_match_catches`** — existing TODO remains; consider renaming or getting `wicket_id` mapping
5. **Matches business logic** — clarify that "Scenarios resolve per team based on `team_id` matching `localteam_id`/`visitorteam_id`, not inning number"

---

## Conclusion

**All 20 scenarios are technically resolvable from Sportmonks live data.** The PRD's resolution mapping is largely correct, with two significant findings that require updates:

1. **Player of the Match delay** (hours post-match) — most important finding
2. **Cache anomaly handling** for powerplay capture — minor but required for reliability

The match chosen (GT vs RR) provided excellent test coverage:
- Team batting order reversed (home batted 2nd) — tested home/away filter logic
- 3 fifties scored — positive case for `fifty_scored`
- 4-wicket haul by Bishnoi — positive case for `bowler_three_wickets`
- No super over — negative case for `super_over`
- 14 total wickets — high-variance case for wicket counting scenarios
- First wicket at 6.2 overs — edge case for `first_wicket_over` bracket boundary (fell exactly at the "6+" bracket)

With the recommended PRD updates and defensive polling logic, the scenario resolution system is production-ready.
