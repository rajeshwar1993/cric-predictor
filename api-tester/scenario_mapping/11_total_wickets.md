# Scenario: Total Wickets

| Field | Value |
|-------|-------|
| Category | `total_wickets` |
| Label | Total Wickets? |
| Description | Predict total wickets in the match |
| Points | 10 |
| Input Type | Range Pick (4 bracket buttons) |
| Resolution Phase | `end` (when match status = "Finished") |

## Answer Options

| Option | Condition |
|--------|-----------|
| `12-15` | Total wickets between 12 and 15 (inclusive) |
| `16-18` | 16 <= wickets <= 18 |
| `19-21` | 19 <= wickets <= 21 |
| `22+` | wickets >= 22 |

Note: The lowest bracket starts at 12, not 0. A T20 match with fewer than 12 wickets would still fall into `"12-15"` per the SQL logic (any value < 16 maps to `"12-15"`).

## API Source

**Endpoint:** `get_events` (by `event_key`) or `get_livescore`

**Fields:** `scorecard` — bowler entries from both innings

| API Field | Purpose |
|-----------|---------|
| `scorecard.<innings_key>[].type` | Filter: must be `"Bowler"` |
| `scorecard.<innings_key>[].W` | Wickets taken by this bowler (string, must parseInt) |

### Computation Logic (`parseFullResults` in `match-live/index.ts:546-549`)

```
w1 = sum of parseInt(b.W) for all bowlers in first innings
w2 = sum of parseInt(b.W) for all bowlers in second innings
total_match_wickets = w1 + w2
```

## DB Storage

| Column | Type | Example |
|--------|------|---------|
| `matches.total_match_wickets` | INT | `13` |

## Resolution Logic

### Step-by-step

1. Match status becomes `"Finished"`
2. `parseFullResults(event)` sums `W` from bowlers in both innings
3. Stores integer in `matches.total_match_wickets`
4. `resolve_match_predictions()` applies bracketing in SQL:
   - `>= 22` → `"22+"`
   - `>= 19` → `"19-21"`
   - `>= 16` → `"16-18"`
   - else → `"12-15"`
5. Predictions matching the bracket earn 10 points

### Code Locations

| Location | Function |
|----------|----------|
| `match-live/index.ts:546-549` | Wicket summation in `parseFullResults()` |
| `002_views_functions.sql:210-217` | SQL bracketing |

### Bracket Boundaries

| Check Order | Condition | Answer |
|-------------|-----------|--------|
| 1 | `wickets >= 22` | `22+` |
| 2 | `wickets >= 19` | `19-21` |
| 3 | `wickets >= 16` | `16-18` |
| 4 | else | `12-15` |

## API Response Examples

### Bowler scorecard entries

```json
[
  { "player": "Jacob Duffy", "type": "Bowler", "W": "3", "O": "4.00", "R": "22" },
  { "player": "Abhinandan Singh", "type": "Bowler", "W": "2", "O": "4.00", "R": "35" },
  { "player": "V Kohli", "type": "Bowler", "W": "0", "O": "1.00", "R": "12" }
]
```

Sum W from all bowlers in both innings = total_match_wickets.

### Edge Cases

| Case | Behavior |
|------|----------|
| Chase completed with few wickets | e.g., Team wins losing 2 wickets → low total (9+2=11 → `"12-15"`) |
| Both teams all out | Maximum = 20 wickets (10+10) in normal play |
| Super Over | If bowlers in Super Over innings have `W` values, they'd be included |
| Null `W` field | `safeInt(null)` returns `0` |
