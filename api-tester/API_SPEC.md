# api-cricket.com API Spec Sheet

**Base URL:** `https://apiv2.api-cricket.com/cricket/`
**Auth:** `APIkey` query parameter
**Generated:** 2026-03-28
**Tested against:** Live API with real IPL data

---

## get_leagues

**Description:** Fetch all available cricket leagues/tournaments. Used to find the IPL league_key.

**Status:** PASS

### Request

```
GET ?method=get_leagues&APIkey=***
```

| Parameter | Description |
|-----------|-------------|
| `method` | API method name |
| `APIkey` | Authentication key |

### Response Fields

| Field | Type / Sample Value |
|-------|---------------------|
| `league_key` | string: 733 |
| `league_name` | string: 4-Day Franchise Series |
| `league_year` | string: 2022-23 |

### Sample Response (first item)

```json
{
  "league_key": "733",
  "league_name": "4-Day Franchise Series",
  "league_year": "2022-23"
}
```

---

## get_events (by league + date range)

**Description:** Fetch match fixtures for a league within a date range. Used to seed IPL match schedule and fetch completed scorecards.

**Status:** PASS

### Request

```
GET ?method=get_events&APIkey=***&league_key=745&date_start=2026-03-21&date_stop=2026-04-04
```

| Parameter | Description |
|-----------|-------------|
| `method` | API method name |
| `APIkey` | Authentication key |
| `league_key` | 745 |
| `date_start` | 2026-03-21 |
| `date_stop` | 2026-04-04 |

### Response Fields

| Field | Type / Sample Value |
|-------|---------------------|
| `event_key` | string: 22822 |
| `event_date_start` | string: 2026-03-28 |
| `event_date_stop` | string: 2026-03-28 |
| `event_time` | string: 15:00 |
| `event_home_team` | string: Royal Challengers Bengaluru |
| `home_team_key` | string: 146 |
| `event_away_team` | string: Sunrisers Hyderabad |
| `away_team_key` | string: 149 |
| `event_service_home` | string:  |
| `event_service_away` | string:  |
| `event_home_final_result` | string:  |
| `event_away_final_result` | string:  |
| `event_home_rr` | null |
| `event_away_rr` | null |
| `event_status` | string:  |
| `event_status_info` | string: Match yet to begin |
| `league_name` | string: Indian Premier League |
| `league_key` | string: 745 |
| `league_round` | string:  |
| `league_season` | string: 2026 |
| `event_live` | string: 0 |
| `event_type` | string: T20 |
| `event_toss` | string:  |
| `event_man_of_match` | string:  |
| `event_stadium` | string: M Chinnaswamy Stadium, Bengaluru |
| `event_home_team_logo` | string: https://apiv2.api-cricket.com/logo/146_royal-challengers-ban |
| `event_away_team_logo` | string: https://apiv2.api-cricket.com/logo/149_sunrisers-hyderabad.p |
| `scorecard` | array (empty) |
| `comments` | array (empty) |
| `wickets` | array (empty) |
| `extra` | array (empty) |
| `lineups` | object {home_team, away_team} |

### Sample Response (first item)

```json
{
  "event_key": "22822",
  "event_home_team": "Royal Challengers Bengaluru",
  "event_away_team": "Sunrisers Hyderabad",
  "event_date_start": "2026-03-28",
  "event_time": "15:00",
  "event_status": "",
  "event_live": "0",
  "event_toss": "(empty)",
  "event_man_of_match": "(empty)"
}
```

---

## get_events (by event_key)

**Description:** Fetch a single match's full data including scorecard, ball-by-ball, wickets, extras, and lineups. Used post-match for result extraction.

**Status:** PASS

### Request

```
GET ?method=get_events&APIkey=***&event_key=22822
```

| Parameter | Description |
|-----------|-------------|
| `method` | API method name |
| `APIkey` | Authentication key |
| `event_key` | 22822 |

### Response Fields

| Field | Type / Sample Value |
|-------|---------------------|
| `event_key` | string: 22822 |
| `event_date_start` | string: 2026-03-28 |
| `event_date_stop` | string: 2026-03-28 |
| `event_time` | string: 15:00 |
| `event_home_team` | string: Royal Challengers Bengaluru |
| `home_team_key` | string: 146 |
| `event_away_team` | string: Sunrisers Hyderabad |
| `away_team_key` | string: 149 |
| `event_service_home` | string:  |
| `event_service_away` | string:  |
| `event_home_final_result` | string:  |
| `event_away_final_result` | string:  |
| `event_home_rr` | null |
| `event_away_rr` | null |
| `event_status` | string:  |
| `event_status_info` | string: Match yet to begin |
| `league_name` | string: Indian Premier League |
| `league_key` | string: 745 |
| `league_round` | string:  |
| `league_season` | string: 2026 |
| `event_live` | string: 0 |
| `event_type` | string: T20 |
| `event_toss` | string:  |
| `event_man_of_match` | string:  |
| `event_stadium` | string: M Chinnaswamy Stadium, Bengaluru |
| `event_home_team_logo` | string: https://apiv2.api-cricket.com/logo/146_royal-challengers-ban |
| `event_away_team_logo` | string: https://apiv2.api-cricket.com/logo/149_sunrisers-hyderabad.p |
| `scorecard` | array (empty) |
| `comments` | array (empty) |
| `wickets` | array (empty) |
| `extra` | array (empty) |
| `lineups` | object {home_team, away_team} |

### Sample Response (first item)

```json
{
  "event_key": "22822",
  "event_status": "",
  "event_toss": "(empty)",
  "event_man_of_match": "(empty)",
  "scorecard_innings": 0,
  "comments_innings": 0,
  "wickets_innings": 0,
  "extra_innings": 0
}
```

---

## get_livescore

**Description:** Fetch currently live matches. Used by the cron to poll live scores every minute. Returns same structure as get_events but with real-time data.

**Status:** FAIL — Expected result to be an array

### Request

```
GET ?method=get_livescore&APIkey=***&league_key=745
```

| Parameter | Description |
|-----------|-------------|
| `method` | API method name |
| `APIkey` | Authentication key |
| `league_key` | 745 |

---

## get_teams

**Description:** Fetch team metadata (name, key, logo) for a league. Used to build team_key → team_code mapping and display team logos.

**Status:** PASS

### Request

```
GET ?method=get_teams&APIkey=***&league_key=745
```

| Parameter | Description |
|-----------|-------------|
| `method` | API method name |
| `APIkey` | Authentication key |
| `league_key` | 745 |

### Response Fields

| Field | Type / Sample Value |
|-------|---------------------|
| `team_key` | string: 141 |
| `team_name` | string: Chennai Super Kings |
| `team_logo` | string: https://apiv2.api-cricket.com/logo/141_chennai-super-kings.p |

### Sample Response (first item)

```json
{
  "team_key": "141",
  "team_name": "Chennai Super Kings",
  "team_logo": "https://apiv2.api-cricket.com/logo/141_chennai-super-kings.png"
}
```

---

## Notes

- All numeric values in scorecard entries are **strings** (e.g., `R: "72"`, not `R: 72`). Must use `parseInt()` / `parseFloat()` when consuming.
- Scorecard entries mix batting and bowling in the same array, differentiated by `type: "Batsman"` vs `type: "Bowler"`.
- Fall-of-wickets `fall` field format is `"3.4 ov"` — parse with `parseFloat(fall.replace(" ov", ""))`.
- Extra `total` field format is `"185 ( 20 )"` — parse with regex `/(\ d+)\s*\(\s*([\d.]+)\s*\)/`.
- `event_toss` format: `"Team Name, elected to bat first"` — split on `", elected to"` to extract team.
- `event_status_info` for winner: `"Team won by X wickets"` — parse `" won by"` to extract team.
- `event_live`: `"1"` = live, `"0"` = not live (string, not boolean).
- `balwer` in wickets is a typo in the API (not "bowler") — use as-is.
