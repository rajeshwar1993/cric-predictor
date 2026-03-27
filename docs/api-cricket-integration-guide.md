# Bragg — api-cricket.com Integration Guide

**Provider:** api-cricket.com (v2.0)
**Base URL:** `https://apiv2.api-cricket.com/cricket/`
**Auth:** API key via `APIkey` query parameter
**Pricing:** Starter $20/mo (8K req/day) · Premium $40/mo (80K req/day) · Business $60/mo (200K req/day)
**IPL Coverage:** Yes — league keys `#9785` and `#9875`

---

## Table of Contents

1. [Provider Evaluation vs Requirements](#1-provider-evaluation-vs-requirements)
2. [Endpoint Reference for Bragg](#2-endpoint-reference-for-bragg)
3. [Data Flow by Match Phase](#3-data-flow-by-match-phase)
4. [Scenario Resolution Mapping](#4-scenario-resolution-mapping)
5. [Field Mapping: API → Database](#5-field-mapping-api--database)
6. [Deriving Powerplay Data from Ball-by-Ball](#6-deriving-powerplay-data-from-ball-by-ball)
7. [Deriving First Wicket Over from Wickets Object](#7-deriving-first-wicket-over-from-wickets-object)
8. [Key Differences from CricketData.org](#8-key-differences-from-cricketdataorg)
9. [Request Budget Planning](#9-request-budget-planning)
10. [Data Gaps & Manual Fallbacks](#10-data-gaps--manual-fallbacks)
11. [Implementation Checklist](#11-implementation-checklist)

---

## 1. Provider Evaluation vs Requirements

### What Bragg Needs vs What api-cricket.com Provides

| Requirement | Needed For | api-cricket.com | Verdict |
|-------------|-----------|-----------------|---------|
| Match fixtures (teams, date, time, venue) | Pre-season schedule seed | `get_events` with date range | **YES** |
| Match status (upcoming / live / completed) | Status transitions, deadline enforcement | `event_status`, `event_live` | **YES** |
| Toss result (winner + decision) | `toss_winner` scenario (5 pts) | `event_toss` field | **YES** — needs string parsing |
| Match winner | `match_winner` scenario (10 pts) | `event_status_info` or final scores | **YES** — needs string parsing |
| Player of the Match | `player_of_match` scenario (20 pts) | `event_man_of_match` field | **YES** — this was manual-only with CricketData.org |
| Full scorecard (batting) | Top scorer, fifty detection, sixes count | `scorecard` object with R, B, 4s, 6s per batsman | **YES** |
| Full scorecard (bowling) | Top wicket-taker, 3-wicket haul detection | `scorecard` object with O, M, R, W per bowler | **YES** |
| First innings total | `first_innings_score` scenario (10 pts) | `scorecard` first innings entries or `extra` totals | **YES** |
| Total match runs | `total_match_runs` scenario (10 pts) | Sum from `extra` totals per innings | **YES** |
| Total match wickets | `total_wickets` scenario (10 pts) | Sum from scorecard/wickets data | **YES** |
| Total match sixes | `total_sixes` scenario (10 pts) | Sum of `6s` from all batting entries | **YES** |
| Fall of wickets (over + score) | `first_wicket_over` scenario (10 pts) | `wickets` object with `fall` (e.g., "15.6 ov") and `score` (e.g., "58/3") | **YES** |
| Powerplay data (runs & wickets at over 6) | `powerplay_score` + `powerplay_wickets` scenarios (10+10 pts) | **Not a direct field** — must derive from `comments` (ball-by-ball) by filtering overs ≤ 6 | **PARTIAL** — derivable |
| Ball-by-ball commentary | Powerplay derivation, live on-track projection | `comments` object with overs, runs per ball | **YES** |
| Playing XI / Lineups | Player-pick dropdowns in prediction form | `lineups` object with `starting_lineups` | **YES** |
| Squad (full roster) | Broader player list | `get_teams` with `league_key` for squad-level data | **PARTIAL** — lineups only show match-day XI |
| Live scores | On-track indicators, live display | `get_livescore` endpoint | **YES** |
| Team logos | UI display | `event_home_team_logo`, `event_away_team_logo` | **YES** — bonus |
| Super over detection | `had_super_over` scenario (20 pts) | Extra innings in scorecard (3rd/4th innings) | **YES** — infer from innings count |
| Most sixes player | `most_sixes` scenario (15 pts) | Derive from batting `6s` field | **YES** |

### Verdict: api-cricket.com Covers All 16 Scenarios

| # | Scenario | Auto-Resolvable? | Notes |
|---|----------|-------------------|-------|
| 1 | `match_winner` | **Yes** | Parse from `event_status_info` |
| 2 | `toss_winner` | **Yes** | Parse from `event_toss` |
| 3 | `top_scorer` | **Yes** | Max `R` from scorecard batting entries |
| 4 | `top_wicket_taker` | **Yes** | Max `W` from scorecard bowling entries |
| 5 | `player_of_match` | **Yes** | `event_man_of_match` — **upgrade from manual** |
| 6 | `first_innings_score` | **Yes** | From `extra` object for 1st innings |
| 7 | `total_match_runs` | **Yes** | Sum `extra` totals across innings |
| 8 | `powerplay_score` | **Yes** | Derive from `comments` where `overs` ≤ 6.0 |
| 9 | `powerplay_wickets` | **Yes** | Count `wickets` entries where `fall` ≤ 6.0 overs |
| 10 | `batsman_fifty` | **Yes** | Any batting entry `R >= 50` |
| 11 | `total_sixes` | **Yes** | Sum of `6s` across all batting entries |
| 12 | `total_wickets` | **Yes** | Sum from scorecard or wickets array length |
| 13 | `bowler_three_wkt` | **Yes** | Any bowling entry `W >= 3` |
| 14 | `had_super_over` | **Yes** | Scorecard has > 2 innings objects |
| 15 | `most_sixes` | **Yes** | Max `6s` from batting entries |
| 16 | `first_wicket_over` | **Yes** | `wickets[firstInnings][0].fall` — parse over number |

**All 16 scenarios can be auto-resolved.** This is an improvement over CricketData.org where 3-4 required manual entry.

---

## 2. Endpoint Reference for Bragg

### 2.1 Get Leagues — Find IPL League Key

**When:** Once, during initial setup.
**Purpose:** Confirm the `league_key` for IPL 2026.

```
GET https://apiv2.api-cricket.com/cricket/?method=get_leagues&APIkey={key}
```

**Response:**
```json
{
  "success": 1,
  "result": [
    { "league_key": "9785", "league_name": "IPL", "league_year": "2025/26" }
  ]
}
```

**Action:** Store the `league_key` as an env var `CRICKET_API_LEAGUE_KEY`. Use it to filter all subsequent calls.

---

### 2.2 Get Events — Fetch Match Fixtures & Completed Scorecards

**When:** Pre-season (seed all fixtures), post-match (fetch final scorecard).
**Purpose:** Get match schedule, full scorecard, ball-by-ball, wickets, lineups, man of match.

```
GET https://apiv2.api-cricket.com/cricket/?method=get_events
  &APIkey={key}
  &league_key={iplLeagueKey}
  &date_start=2026-03-28
  &date_stop=2026-06-01
```

**For a single match:**
```
GET https://apiv2.api-cricket.com/cricket/?method=get_events
  &APIkey={key}
  &event_key={matchEventKey}
```

**Key response fields used by Bragg:**

```jsonc
{
  "success": 1,
  "result": [
    {
      // ── Identity & Schedule ──
      "event_key": "123456",               // → matches.api_match_id
      "event_date_start": "2026-03-28",    // → matches.date
      "event_time": "19:30",               // → matches.time_ist
      "event_home_team": "Royal Challengers Bengaluru",  // → matches.team_a (via TEAM_NAME_TO_CODE)
      "home_team_key": "7890",
      "event_away_team": "Sunrisers Hyderabad",          // → matches.team_b
      "away_team_key": "7891",
      "event_stadium": "M. Chinnaswamy Stadium",         // → matches.venue
      "event_home_team_logo": "https://...",
      "event_away_team_logo": "https://...",

      // ── Status ──
      "event_status": "Finished",          // → matches.status mapping
      "event_status_info": "RCB won by 5 wickets",  // → parse match_winner
      "event_live": "0",                   // "1" = live, "0" = not live

      // ── Toss & Awards ──
      "event_toss": "Royal Challengers Bengaluru, elected to bat first",  // → parse toss_winner
      "event_man_of_match": "Virat Kohli",  // → matches.player_of_match

      // ── Live Scores ──
      "event_service_home": "185/4",       // → matches.current_score_a (during live)
      "event_service_away": "186/5",       // → matches.current_score_b

      // ── Scorecard (keyed by innings name) ──
      "scorecard": {
        "Royal Challengers Bengaluru 1 INN": [
          // Batting entries (type: "Batsman")
          { "innings": "...", "player": "Virat Kohli", "type": "Batsman",
            "status": "c Aiden Markram b Bhuvneshwar", "R": "82", "B": "51",
            "Min": "0", "4s": "8", "6s": "4", "SR": "160.78" },
          // Bowling entries (type: "Bowler")
          { "innings": "...", "player": "Bhuvneshwar Kumar", "type": "Bowler",
            "R": "35", "O": "4", "M": "0", "W": "2", "ER": "8.75" }
        ],
        "Sunrisers Hyderabad 1 INN": [ /* ... */ ]
      },

      // ── Ball-by-Ball Commentary ──
      "comments": {
        "Royal Challengers Bengaluru 1 INN": [
          { "innings": "...", "overs": "0.1", "balls": "1", "runs": "0",
            "ended": "No", "post": "Bhuvneshwar to Kohli, no run" },
          { "innings": "...", "overs": "0.2", "balls": "2", "runs": "4",
            "ended": "No", "post": "Bhuvneshwar to Kohli, FOUR" }
          // ... every ball
        ]
      },

      // ── Fall of Wickets ──
      "wickets": {
        "Royal Challengers Bengaluru 1 INN": [
          { "innings": "...", "fall": "3.4 ov", "balwer": "Bhuvneshwar Kumar",
            "batsman": "c Markram b Bhuvneshwar 12", "score": "28/1" },
          { "innings": "...", "fall": "8.2 ov", "balwer": "Rashid Khan",
            "batsman": "lbw Rashid 25", "score": "72/2" }
        ]
      },

      // ── Extras & Totals ──
      "extra": {
        "Royal Challengers Bengaluru 1 INN": {
          "innings": "...", "nr": "12.00",
          "text": "(w 6, nb 3, lb 2, b 1)",
          "total": "185 ( 20 )",              // "runs ( overs )"
          "total_overs": null
        }
      },

      // ── Playing XI ──
      "lineups": {
        "home_team": {
          "starting_lineups": [
            { "player": "Virat Kohli" },
            { "player": "Faf du Plessis" }
            // ... 11 players
          ]
        },
        "away_team": {
          "starting_lineups": [
            { "player": "Travis Head" },
            { "player": "Abhishek Sharma" }
            // ... 11 players
          ]
        }
      }
    }
  ]
}
```

---

### 2.3 Get Livescore — Poll During Live Matches

**When:** Every 1 minute while a match has `event_live: "1"`.
**Purpose:** Live score display, on-track indicator computation.

```
GET https://apiv2.api-cricket.com/cricket/?method=get_livescore
  &APIkey={key}
  &match_key={matchEventKey}
```

**Response structure:** Same as `get_events` — returns the same fields including `scorecard`, `comments`, `wickets`, `extra`, and `lineups`, but with real-time data.

**Filtering by league (to get all live IPL matches at once):**
```
GET https://apiv2.api-cricket.com/cricket/?method=get_livescore
  &APIkey={key}
  &league_key={iplLeagueKey}
```

---

### 2.4 Get Teams — Fetch Team Metadata

**When:** Pre-season, once.
**Purpose:** Get `team_key` values and logos for all 10 IPL teams.

```
GET https://apiv2.api-cricket.com/cricket/?method=get_teams
  &APIkey={key}
  &league_key={iplLeagueKey}
```

**Response:**
```json
{
  "success": 1,
  "result": [
    { "team_key": "7890", "team_name": "Royal Challengers Bengaluru", "team_logo": "https://..." }
  ]
}
```

**Action:** Build a `TEAM_KEY_TO_CODE` mapping alongside existing `TEAM_NAME_TO_CODE`.

---

### 2.5 Get Standings — IPL Points Table (Optional)

**When:** Periodically during season, for display purposes.
**Purpose:** Show IPL standings if desired (not required for core game).

```
GET https://apiv2.api-cricket.com/cricket/?method=get_standings
  &APIkey={key}
  &league_key={iplLeagueKey}
```

---

## 3. Data Flow by Match Phase

### Phase 1: Pre-Season (One-Time Seed)

```
┌─────────────────────────────────────────────────┐
│  get_leagues → find IPL league_key              │
│  get_events(date_start, date_stop, league_key)  │
│  get_teams(league_key)                          │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │  For each event:        │
         │  → INSERT INTO matches  │
         │    match_number (parse from event name or sequence) │
         │    team_a, team_b (via TEAM_NAME_TO_CODE)           │
         │    date, time_ist, venue                             │
         │    api_match_id = event_key                          │
         │    status = 'upcoming'                               │
         └─────────────────────────┘
```

**Requests:** ~2-3 total (1 leagues + 1-2 events pages).

### Phase 2: Pre-Match (~2 Hours Before)

```
┌───────────────────────────────────────────────┐
│  get_events(event_key={api_match_id})         │
│  → Extract lineups.home_team.starting_lineups │
│  → Extract lineups.away_team.starting_lineups │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
         ┌────────────────────────────┐
         │  For each player:          │
         │  → UPSERT INTO players     │
         │  → INSERT INTO match_squads│
         │    (is_playing_xi = true)  │
         └────────────────────────────┘
```

**Requests:** 1 per match.

### Phase 3: Match Start (Toss)

```
┌──────────────────────────────────────────────┐
│  get_events(event_key={api_match_id})        │
│  OR get_livescore(match_key={api_match_id})  │
│  → Check event_toss is populated             │
│  → Parse: "Team Name, elected to bat/field"  │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
         ┌──────────────────────────────┐
         │  UPDATE matches SET          │
         │    toss_winner = parsed team │
         │    status = 'live'           │
         │  → Resolve toss_winner       │
         │    scenario immediately      │
         └──────────────────────────────┘
```

**Requests:** 1 (or part of livescore poll).

### Phase 4: During Match (Live Polling — Every 1 Min)

```
┌──────────────────────────────────────────────┐
│  get_livescore(match_key={api_match_id})     │
│  → scorecard, comments, wickets, extra       │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
         ┌──────────────────────────────────┐
         │  UPDATE matches SET              │
         │    current_score_a = event_service_home │
         │    current_score_b = event_service_away │
         │    current_overs_a = parse from extra   │
         │    current_overs_b = parse from extra   │
         │    live_scorecard_json = full response   │
         │    last_polled_at = now()                │
         │                                          │
         │  Feed to on-track-logic.ts for          │
         │  live prediction status indicators      │
         └──────────────────────────────────────────┘
```

**Requests:** ~240 per match (1/min × 4 hours worst case).

### Phase 5: Post-Match (Final Resolution)

```
┌──────────────────────────────────────────────┐
│  get_events(event_key={api_match_id})        │
│  → Full completed scorecard                  │
│  → event_man_of_match                        │
│  → event_toss                                │
│  → event_status_info (winner)                │
│  → scorecard (all batting/bowling stats)     │
│  → comments (ball-by-ball for powerplay)     │
│  → wickets (fall of wickets for FOW data)    │
│  → extra (innings totals)                    │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────────────────────────┐
         │  Parse all result fields (see Section 5)        │
         │  UPDATE matches SET all result columns          │
         │    status = 'completed', resolved_at = now()    │
         │  CALL resolve_match_predictions(match_id)       │
         └─────────────────────────────────────────────────┘
```

**Requests:** 1 per match.

---

## 4. Scenario Resolution Mapping

How each of the 16 scenarios maps to api-cricket.com response data:

### 4.1 `match_winner` (10 pts) — Parse from `event_status_info`

**API field:** `event_status_info`
**Example value:** `"RCB won by 5 wickets (with 22 balls remaining)"`
**Parsing logic:**
```
1. Check event_status_info for pattern: "{Team} won by ..."
2. Extract team name before " won by"
3. Convert to team code via TEAM_NAME_TO_CODE
4. Edge cases:
   - "Match tied" → check for super over result
   - "No result" / "Match abandoned" → void scenario
```

### 4.2 `toss_winner` (5 pts) — Parse from `event_toss`

**API field:** `event_toss`
**Example value:** `"Royal Challengers Bengaluru, elected to bat first"`
**Parsing logic:**
```
1. Split on ", elected to" or ", chose to"
2. First part = team name
3. Convert to team code via TEAM_NAME_TO_CODE
```

### 4.3 `top_scorer` (15 pts) — Max runs from scorecard batting

**API fields:** `scorecard[*innings*][].R` where `type === "Batsman"`
**Logic:**
```
1. Collect all batting entries across all innings
2. Parse R (string → number)
3. Player with max R = top_scorer
4. Store player name and runs
```

### 4.4 `top_wicket_taker` (15 pts) — Max wickets from scorecard bowling

**API fields:** `scorecard[*innings*][].W` where `type === "Bowler"`
**Logic:**
```
1. Collect all bowling entries across all innings
2. Parse W (string → number)
3. Player with max W = top_wicket_taker
4. Tiebreak: lower economy rate (ER)
```

### 4.5 `player_of_match` (20 pts) — Direct field

**API field:** `event_man_of_match`
**Example value:** `"Virat Kohli"`
**Logic:** Direct string match against prediction value. No parsing needed.

> **This is a major improvement over CricketData.org**, which did not provide this field, requiring manual admin entry.

### 4.6 `first_innings_score` (10 pts) — From extra totals

**API field:** `extra[firstInningsKey].total`
**Example value:** `"185 ( 20 )"`
**Parsing logic:**
```
1. Identify first innings key (first key in extra object)
2. Parse total: extract number before " ("
3. Compare against range brackets: <150, 150-169, 170-189, 190+
```

### 4.7 `total_match_runs` (10 pts) — Sum of innings totals

**API fields:** `extra[*innings*].total` for all innings
**Logic:**
```
1. Sum parsed run totals from all innings in extra object
2. Compare against: <300, 300-349, 350-399, 400+
```

### 4.8 `powerplay_score` (10 pts) — Derive from ball-by-ball

**API fields:** `comments[firstInningsKey][]` where `overs` ≤ `"6.0"`
**Logic:** See [Section 6](#6-deriving-powerplay-data-from-ball-by-ball) for detailed derivation.

### 4.9 `powerplay_wickets` (10 pts) — Derive from wickets

**API fields:** `wickets[firstInningsKey][]` where `fall` ≤ 6.0 overs
**Logic:** See [Section 7](#7-deriving-first-wicket-over-from-wickets-object) — same parsing, count entries where parsed over ≤ 6.0.

### 4.10 `batsman_fifty` (10 pts) — Any batting R >= 50

**API fields:** `scorecard[*innings*][].R` where `type === "Batsman"`
**Logic:**
```
1. Check all batting entries across all innings
2. If any parseInt(R) >= 50 → "Yes", else "No"
```

### 4.11 `total_sixes` (10 pts) — Sum of 6s from batting

**API fields:** `scorecard[*innings*][].6s` where `type === "Batsman"`
**Logic:**
```
1. Sum parseInt(6s) from all batting entries, all innings
2. Compare against: <15, 15-25, 26-35, 36+
```

### 4.12 `total_wickets` (10 pts) — Count from wickets object

**API fields:** Length of `wickets[*innings*]` arrays, or sum of bowling `W` fields
**Logic:**
```
1. Sum wicket counts across all innings
2. Compare against: 12-15, 16-18, 19-21, 22+
```

### 4.13 `bowler_three_wkt` (10 pts) — Any bowling W >= 3

**API fields:** `scorecard[*innings*][].W` where `type === "Bowler"`
**Logic:**
```
1. Check all bowling entries across all innings
2. If any parseInt(W) >= 3 → "Yes", else "No"
```

### 4.14 `had_super_over` (20 pts) — Extra innings in scorecard

**API fields:** Number of keys in `scorecard` object
**Logic:**
```
1. Count innings keys in scorecard
2. If > 2 (normal match has 2 innings) → "Yes", else "No"
3. Alternative: check event_status_info for "Super Over" text
```

### 4.15 `most_sixes` (15 pts) — Max 6s from batting

**API fields:** `scorecard[*innings*][].6s` where `type === "Batsman"`
**Logic:**
```
1. Collect all batting entries with their 6s count
2. Player with max parseInt(6s) = most_sixes_player
```

### 4.16 `first_wicket_over` (10 pts) — From wickets object

**API fields:** `wickets[firstInningsKey][0].fall`
**Example value:** `"3.4 ov"`
**Logic:** See [Section 7](#7-deriving-first-wicket-over-from-wickets-object).

---

## 5. Field Mapping: API → Database

### matches table

| DB Column | API Source | Parsing Required |
|-----------|-----------|-----------------|
| `api_match_id` | `event_key` | None |
| `match_number` | Parse from event sequence or `league_round` | Extract number |
| `team_a` | `event_home_team` | `TEAM_NAME_TO_CODE[value]` |
| `team_b` | `event_away_team` | `TEAM_NAME_TO_CODE[value]` |
| `date` | `event_date_start` | Date parse (YYYY-MM-DD) |
| `time_ist` | `event_time` | Already in IST (verify) |
| `venue` | `event_stadium` | None |
| `status` | `event_status` + `event_live` | Map: see below |
| `toss_winner` | `event_toss` | Split on ", elected to" → team code |
| `match_winner` | `event_status_info` | Parse "{Team} won by" → team code |
| `top_scorer` | `scorecard` batting entries | Max `R` → `player` name |
| `top_scorer_runs` | `scorecard` batting entries | Max `R` value (parseInt) |
| `top_wicket_taker` | `scorecard` bowling entries | Max `W` → `player` name |
| `top_wicket_taker_wickets` | `scorecard` bowling entries | Max `W` value (parseInt) |
| `player_of_match` | `event_man_of_match` | None |
| `first_innings_score` | `extra[1st innings].total` | Parse "{runs} ( {overs} )" |
| `first_innings_wickets` | `wickets[1st innings].length` | Count entries |
| `total_match_runs` | Sum of `extra[*].total` | Parse and sum |
| `total_match_wickets` | Sum of `wickets[*].length` | Count all |
| `total_match_sixes` | Sum of scorecard batting `6s` | parseInt and sum |
| `powerplay_score` | `comments[1st innings]` where overs ≤ 6 | Sum runs (see §6) |
| `powerplay_wickets` | `wickets[1st innings]` where fall ≤ 6 ov | Count entries (see §7) |
| `had_super_over` | Scorecard innings count > 2 | Boolean |
| `most_sixes_player` | Scorecard batting max `6s` | Player name |
| `first_wicket_over` | `wickets[1st innings][0].fall` | Parse "X.Y ov" → integer |
| `batsman_scored_fifty` | Any scorecard batting `R` ≥ 50 | Boolean |
| `bowler_took_three` | Any scorecard bowling `W` ≥ 3 | Boolean |
| `current_score_a` | `event_service_home` (live) | None |
| `current_score_b` | `event_service_away` (live) | None |
| `current_overs_a` | Parse from `extra` or `comments` (live) | Parse overs |
| `current_overs_b` | Parse from `extra` or `comments` (live) | Parse overs |
| `live_scorecard_json` | Full API response (live) | Store as JSONB |
| `last_polled_at` | Set on each poll | `now()` |

### Status Mapping

| `event_status` | `event_live` | → `matches.status` |
|----------------|-------------|---------------------|
| (any) | `"1"` | `live` |
| `"Finished"` | `"0"` | `completed` |
| `"After Over X"` / `"Stumps"` | `"0"` | `live` (still in progress for multi-day, but T20 won't have this) |
| `"Not Started"` / empty | `"0"` | `upcoming` |
| `"Abandoned"` / `"Cancelled"` | `"0"` | `abandoned` |
| Contains `"No result"` | `"0"` | `no_result` |

---

## 6. Deriving Powerplay Data from Ball-by-Ball

The API does not have a dedicated powerplay field. We derive it from `comments`:

### Powerplay Score

```typescript
function derivePowerplayScore(comments: Record<string, CommentEntry[]>): number {
  // Get first innings key (first key in the comments object)
  const firstInningsKey = Object.keys(comments)[0];
  if (!firstInningsKey) return 0;

  const balls = comments[firstInningsKey];
  let totalRuns = 0;

  for (const ball of balls) {
    const over = parseFloat(ball.overs);
    if (over > 6.0) break;  // Past powerplay
    totalRuns += parseInt(ball.runs, 10) || 0;
  }

  return totalRuns;
}
```

**Note:** This sums delivery-level runs from `comments`. It should include extras (wides, no-balls) since each delivery entry in `comments` reflects the actual runs added.

### Powerplay Wickets

```typescript
function derivePowerplayWickets(wickets: Record<string, WicketEntry[]>): number {
  const firstInningsKey = Object.keys(wickets)[0];
  if (!firstInningsKey) return 0;

  return wickets[firstInningsKey].filter(w => {
    const over = parseFloat(w.fall.replace(" ov", ""));
    return over <= 6.0;
  }).length;
}
```

---

## 7. Deriving First Wicket Over from Wickets Object

```typescript
function deriveFirstWicketOver(wickets: Record<string, WicketEntry[]>): number | null {
  // First innings first wicket
  const firstInningsKey = Object.keys(wickets)[0];
  if (!firstInningsKey || wickets[firstInningsKey].length === 0) return null;

  const firstWicket = wickets[firstInningsKey][0];
  // "fall" format: "3.4 ov"
  const overStr = firstWicket.fall.replace(" ov", "");
  const over = parseFloat(overStr);

  // Return the over number (ceiling — "3.4 ov" means in the 4th over)
  return Math.ceil(over);
}
```

**Bracket mapping:**
| Parsed over | Bracket |
|------------|---------|
| 1-2 | `"1-2"` |
| 3-4 | `"3-4"` |
| 5-6 | `"5-6"` |
| 7+ | `"7+"` |

---

## 8. Key Differences from CricketData.org

| Aspect | CricketData.org (old) | api-cricket.com (new) |
|--------|----------------------|----------------------|
| **Base URL** | `api.cricapi.com/v1` | `apiv2.api-cricket.com/cricket/` |
| **Auth** | `apikey` param | `APIkey` param (capital A) |
| **Match ID** | String UUID-like | `event_key` (numeric string) |
| **Scorecard structure** | Array of `InningsScorecard` objects | Object keyed by innings name, mixed batting/bowling entries differentiated by `type` field |
| **Data types** | Numbers are numbers | **All values are strings** — must `parseInt`/`parseFloat` everywhere |
| **Player of Match** | Not available | `event_man_of_match` field |
| **Ball-by-ball** | Not available | `comments` object per innings |
| **Fall of wickets** | Optional `fow[]` array | `wickets` object per innings — reliable |
| **Toss** | `tossWinner` (team name) | `event_toss` (sentence — needs parsing) |
| **Match winner** | `matchWinner` (team name) | `event_status_info` (sentence — needs parsing) |
| **Lineups** | Separate `/match_squad` endpoint | Included in `get_events` response as `lineups` |
| **Team logos** | `teamInfo[].img` | `event_home_team_logo` / `event_away_team_logo` |
| **Extras** | Part of `InningsScorecard.extras` | Separate `extra` object keyed by innings |
| **Innings totals** | `InningsScorecard.totals: {r, w, o}` | `extra[innings].total: "185 ( 20 )"` (string — needs parsing) |
| **Live endpoint** | Same `/match_scorecard` | Dedicated `/get_livescore` |
| **Pricing** | Credit-based | Subscription ($20-60/mo) |

### Critical Migration Notes

1. **String → Number coercion:** Every numeric field (`R`, `B`, `4s`, `6s`, `W`, `O`, `M`, `SR`, `ER`) is a string in api-cricket.com. All parsing code must handle this.

2. **Scorecard is an object, not an array.** Keys are innings names like `"Team A 1 INN"`. You must iterate over `Object.keys(scorecard)` instead of `scorecard[0]` / `scorecard[1]`.

3. **Batting and bowling entries are in the same array**, differentiated by `type: "Batsman"` vs `type: "Bowler"`. Filter accordingly.

4. **Toss and winner require string parsing** instead of direct field access. Build robust parsers with fallback patterns.

5. **Player names** in `event_man_of_match`, `scorecard`, and `wickets` may not match exactly. Use fuzzy matching or normalize names.

---

## 9. Request Budget Planning

### Per-Match Request Count

| Phase | Endpoint | Requests |
|-------|----------|----------|
| Pre-match (lineups) | `get_events` | 1 |
| Toss check | `get_livescore` | 1-5 (poll until toss available) |
| Live polling (4 hrs max) | `get_livescore` | ~240 (1/min) |
| Post-match resolution | `get_events` | 1 |
| **Total per match** | | **~247** |

### Season Budget (74 matches, IPL 2026)

| Plan | Daily Limit | Matches/Day (max 2) | Daily Usage | Headroom |
|------|------------|---------------------|-------------|----------|
| **Starter ($20/mo)** | 8,000 | 2 | ~500 | Comfortable |
| **Premium ($40/mo)** | 80,000 | 2 | ~500 | Massive headroom |

**Recommendation:** The **Starter plan ($20/mo)** is sufficient. Even on double-header days (2 matches), we'd use ~500 requests out of 8,000 — just 6.25% of the daily limit.

### Optimization: Use `get_livescore` with `league_key`

Instead of polling each live match individually, call:
```
get_livescore&league_key={iplKey}
```
This returns ALL live IPL matches in one request, saving requests on double-header days.

---

## 10. Data Gaps & Manual Fallbacks

| Data Point | Auto-Resolvable? | Confidence | Fallback |
|------------|-------------------|------------|----------|
| Match winner | Yes | High — parse `event_status_info` | Manual entry |
| Toss winner | Yes | High — parse `event_toss` | Manual entry |
| Top scorer | Yes | High — max R from scorecard | Manual entry |
| Top wicket-taker | Yes | High — max W from scorecard | Manual entry |
| Player of match | **Yes** | High — `event_man_of_match` | Manual entry (should rarely be needed) |
| First innings score | Yes | High — parse `extra` total | Manual entry |
| Total match runs | Yes | High — sum `extra` totals | Manual entry |
| Powerplay score | Yes | Medium — derived from `comments` | Manual entry if `comments` missing |
| Powerplay wickets | Yes | Medium — derived from `wickets` | Manual entry if `wickets` missing |
| Total sixes | Yes | High — sum batting `6s` | Manual entry |
| Total wickets | Yes | High — sum wickets/bowling data | Manual entry |
| Batsman 50+ | Yes | High — check batting `R` | Manual entry |
| Bowler 3+ wickets | Yes | High — check bowling `W` | Manual entry |
| Super over | Yes | High — innings count > 2 | Manual entry |
| Most sixes player | Yes | High — max batting `6s` | Manual entry |
| First wicket over | Yes | High — `wickets` first entry `fall` | Manual entry |

**Key improvement:** `player_of_match`, `powerplay_score`, `powerplay_wickets`, and `first_wicket_over` were all manual-only or partial with CricketData.org. All four can now be auto-resolved with api-cricket.com.

---

## 11. Implementation Checklist

### Types to Update

- [ ] Replace `CricketApiResponse<T>` with api-cricket.com response shape (`{ success: number, result: T }`)
- [ ] Replace `ScorecardResponse` type with new structure (object-keyed innings, string values)
- [ ] Replace `MatchInfo` with `EventResponse` type
- [ ] Add `CommentEntry`, `WicketEntry`, `ExtraEntry`, `LineupEntry` types
- [ ] Remove `SquadResponse` type (lineups are embedded in events now)

### Client to Rewrite

- [ ] Update base URL and auth parameter name
- [ ] Replace `getSeriesMatches()` → `getLeagues()` + `getEvents(dateRange, leagueKey)`
- [ ] Replace `getMatchInfo()` → `getEvents(eventKey)`
- [ ] Replace `getMatchScorecard()` → `getEvents(eventKey)` (scorecard is in events response)
- [ ] Replace `getMatchSquad()` → `getEvents(eventKey)` (lineups are in events response)
- [ ] Add `getLivescore(matchKey | leagueKey)`

### Parsers to Rewrite

- [ ] `scorecard-parser.ts` — Rewrite `parseScorecardToResults()` for new response shape
- [ ] Add `parseTossWinner(eventToss: string): string` — extract team from sentence
- [ ] Add `parseMatchWinner(eventStatusInfo: string): string` — extract team from sentence
- [ ] Add `parseInningsTotal(extraTotal: string): { runs: number, overs: number }` — parse "185 ( 20 )"
- [ ] Add `derivePowerplayScore(comments): number`
- [ ] Add `derivePowerplayWickets(wickets): number`
- [ ] Add `deriveFirstWicketOver(wickets): number | null`
- [ ] Update all numeric field access to use `parseInt()`/`parseFloat()`

### on-track-logic.ts to Update

- [ ] Update `LiveMatchState` interface for new scorecard shape
- [ ] Update all field access to handle object-keyed innings (not array-indexed)
- [ ] Update batting/bowling field access (filter by `type` field, parse string values)

### Constants to Update

- [ ] Add `TEAM_KEY_TO_CODE` mapping (api-cricket.com `team_key` → our team codes)
- [ ] Update `TEAM_NAME_TO_CODE` if api-cricket.com uses different team name variations

### Environment Variables

- [ ] `CRICKET_API_BASE_URL` → `https://apiv2.api-cricket.com/cricket/`
- [ ] `CRICKET_API_KEY` → new api-cricket.com API key
- [ ] Add `CRICKET_API_LEAGUE_KEY` → IPL league key from `get_leagues`
