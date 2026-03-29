# Scenario: First Innings Score

| Field | Value |
|-------|-------|
| Category | `first_innings_score` |
| Label | First Innings Score? |
| Description | Predict the first innings total |
| Points | 10 |
| Input Type | Range Pick (4 bracket buttons) |
| Resolution Phase | `innings_break` (after first innings completes) |

## Answer Options

| Option | Condition |
|--------|-----------|
| `<150` | First innings total < 150 runs |
| `150-169` | 150 <= total <= 169 |
| `170-189` | 170 <= total <= 189 |
| `190+` | total >= 190 |

## API Source

**Endpoint:** `get_events` (by `event_key`) or `get_livescore`

**Fields:** `extra` and `scorecard` — first innings data

| API Field | Purpose |
|-----------|---------|
| `extra.<first_innings_key>[0].total` | Innings total string, e.g., `"201 ( 20 )"` |
| `scorecard.<first_innings_key>[]` | Scorecard entries (used to check if innings is complete) |

### Determining "First Innings"

The first key in `Object.keys(event.scorecard)` is the first innings. The innings key format is `"<Team Name> 1 INN"` (e.g., `"Sunrisers Hyderabad 1 INN"`).

### Parsing the Total (`parseInningsTotal` in `_shared/deps.ts`)

```
Input:  "201 ( 20 )"
Regex:  /(\d+)\s*\(\s*([\d.]+)\s*\)/
Output: { runs: 201, overs: 20.0 }
```

### Determining First Innings Completion (`progressiveResolve`)

The first innings is complete when EITHER:
- A second innings key exists in the scorecard (`secondKey !== null`), AND
- First innings overs >= 20, OR total wickets in first innings >= 10

## DB Storage

| Column | Type | Example |
|--------|------|---------|
| `matches.first_innings_score` | INT | `201` |

## Resolution Logic

### Step-by-step (Progressive — during match)

1. `progressiveResolve()` checks if first innings is complete
2. Reads `getInningsRuns(event.extra, firstKey)` → runs as integer
3. Applies bracket logic:
   - `< 150` → `"<150"`
   - `>= 190` → `"190+"`
   - `>= 170` → `"170-189"`
   - else → `"150-169"`
4. Calls `resolveScenariosByCategory(matchId, "first_innings_score", bracket)`

### Step-by-step (End of match — fallback)

1. `parseFullResults()` stores `first_innings_score` as integer on `matches`
2. `resolve_match_predictions()` applies the same bracketing in SQL

### Code Locations

| Location | Function |
|----------|----------|
| `match-live/index.ts:506-518` | Progressive resolution in `progressiveResolve()` |
| `match-live/index.ts:537` | `results.first_innings_score = getInningsRuns(...)` in `parseFullResults()` |
| `_shared/deps.ts:180-185` | `parseInningsTotal()` |
| `002_views_functions.sql:172-179` | SQL bracketing in `resolve_match_predictions()` |

### Bracket Boundaries (identical in edge function and SQL)

| Check Order | Condition | Answer |
|-------------|-----------|--------|
| 1 | `score < 150` | `<150` |
| 2 | `score >= 190` | `190+` |
| 3 | `score >= 170` | `170-189` |
| 4 | else | `150-169` |

## API Response Examples

### First innings in progress (not yet complete)

```json
{
  "extra": {
    "Sunrisers Hyderabad 1 INN": [{
      "total": "39 ( 5.2 )",
      "total_overs": "5.2"
    }]
  },
  "scorecard": {
    "Sunrisers Hyderabad 1 INN": [...]
  }
}
```

### First innings complete, second innings started

```json
{
  "extra": {
    "Sunrisers Hyderabad 1 INN": [{
      "total": "201 ( 20 )",
      "total_overs": "20"
    }],
    "Royal Challengers Bengaluru 1 INN": [{
      "total": "8 ( 0.5 )",
      "total_overs": "0.5"
    }]
  }
}
```

Result: `first_innings_score = 201` → bracket = `"190+"`

### Edge Cases

| Case | Behavior |
|------|----------|
| All out before 20 overs | Still uses the total runs from `extra` |
| Rain-shortened (DLS) | Uses whatever total is in `extra` at innings completion |
| Very low score (e.g., 87) | Falls into `<150` bracket |
