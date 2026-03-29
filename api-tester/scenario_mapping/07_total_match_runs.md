# Scenario: Total Match Runs

| Field | Value |
|-------|-------|
| Category | `total_match_runs` |
| Label | Total Match Runs? |
| Description | Predict total runs in the match |
| Points | 10 |
| Input Type | Range Pick (4 bracket buttons) |
| Resolution Phase | `end` (when match status = "Finished") |

## Answer Options

| Option | Condition |
|--------|-----------|
| `<300` | Total runs < 300 |
| `300-349` | 300 <= total <= 349 |
| `350-399` | 350 <= total <= 399 |
| `400+` | total >= 400 |

## API Source

**Endpoint:** `get_events` (by `event_key`) or `get_livescore`

**Fields:** `extra` — totals from both innings

| API Field | Purpose |
|-----------|---------|
| `extra.<first_innings_key>[0].total` | First innings total, e.g., `"201 ( 20 )"` |
| `extra.<second_innings_key>[0].total` | Second innings total, e.g., `"203 ( 15.4 )"` |

### Computation

```
r1 = getInningsRuns(event.extra, firstKey)   // e.g., 201
r2 = getInningsRuns(event.extra, secondKey)  // e.g., 203
total_match_runs = r1 + r2                   // e.g., 404
```

## DB Storage

| Column | Type | Example |
|--------|------|---------|
| `matches.total_match_runs` | INT | `404` |

## Resolution Logic

### Step-by-step

1. Match status becomes `"Finished"`
2. `parseFullResults(event)` sums runs from both innings
3. Stores integer in `matches.total_match_runs`
4. `resolve_match_predictions()` applies bracketing in SQL:
   - `< 300` → `"<300"`
   - `>= 400` → `"400+"`
   - `>= 350` → `"350-399"`
   - else → `"300-349"`
5. Predictions matching the bracket earn 10 points

### Code Locations

| Location | Function |
|----------|----------|
| `match-live/index.ts:548` | `results.total_match_runs = r1 + r2` in `parseFullResults()` |
| `_shared/deps.ts:232-236` | `getInningsRuns()` |
| `002_views_functions.sql:180-187` | SQL bracketing |

### Bracket Boundaries

| Check Order | Condition | Answer |
|-------------|-----------|--------|
| 1 | `total < 300` | `<300` |
| 2 | `total >= 400` | `400+` |
| 3 | `total >= 350` | `350-399` |
| 4 | else | `300-349` |

## API Response Examples

### Both innings complete

```json
{
  "extra": {
    "Sunrisers Hyderabad 1 INN": [{
      "total": "201 ( 20 )",
      "total_overs": "20"
    }],
    "Royal Challengers Bengaluru 1 INN": [{
      "total": "203 ( 15.4 )",
      "total_overs": "15.4"
    }]
  }
}
```

Result: `total_match_runs = 201 + 203 = 404` → bracket = `"400+"`

### Edge Cases

| Case | Behavior |
|------|----------|
| Chase completed early | Second innings total is whatever was scored (e.g., 150/2 chasing 149) |
| Low-scoring match | Both innings combined < 300 → `"<300"` |
| Super Over | Super Over runs are in 3rd/4th innings keys — NOT included (only first 2 innings counted) |
