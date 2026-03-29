# Scenario: Super Over

| Field | Value |
|-------|-------|
| Category | `had_super_over` |
| Label | Will there be a Super Over? |
| Description | Predict if match goes to Super Over |
| Points | 20 |
| Input Type | Yes/No Pick (two buttons) |
| Resolution Phase | `end` (when match status = "Finished") |

## Answer Options

| Option | Condition |
|--------|-----------|
| `Yes` | Match went to a Super Over |
| `No` | Match did not go to a Super Over |

## API Source

**Endpoint:** `get_events` (by `event_key`) or `get_livescore`

**Fields:** `scorecard` — number of innings keys

| API Field | Purpose |
|-----------|---------|
| `Object.keys(event.scorecard)` | Count of innings in the scorecard |

### Detection Logic (`parseFullResults` in `match-live/index.ts:571`)

```
inningsKeys = Object.keys(event.scorecard)
had_super_over = inningsKeys.length > 2
```

A normal T20 has exactly 2 innings keys (e.g., `"Team A 1 INN"`, `"Team B 1 INN"`). A Super Over adds additional innings keys (3rd, 4th, etc.), so `length > 2` indicates a Super Over occurred.

## DB Storage

| Column | Type | Example |
|--------|------|---------|
| `matches.had_super_over` | BOOLEAN | `false` |

## Resolution Logic

### Step-by-step

1. Match status becomes `"Finished"`
2. `parseFullResults(event)` checks `inningsKeys.length > 2`
3. Stores boolean in `matches.had_super_over`
4. `resolve_match_predictions()` in SQL:
   - `v_correct_answer := CASE WHEN v_match.had_super_over THEN 'Yes' ELSE 'No' END`
5. Predictions matching the answer earn 20 points (highest Yes/No scenario)

### Code Locations

| Location | Function |
|----------|----------|
| `match-live/index.ts:571` | `results.had_super_over = inningsKeys.length > 2` |
| `002_views_functions.sql:226-229` | SQL: boolean → `"Yes"` / `"No"` |

## API Response Examples

### Normal match (no Super Over) — 2 innings keys

```json
{
  "scorecard": {
    "Sunrisers Hyderabad 1 INN": [...],
    "Royal Challengers Bengaluru 1 INN": [...]
  }
}
```

`Object.keys(scorecard).length === 2` → `had_super_over = false` → `"No"`

### Super Over match — 4 innings keys

```json
{
  "scorecard": {
    "Team A 1 INN": [...],
    "Team B 1 INN": [...],
    "Team A 2 INN": [...],
    "Team B 2 INN": [...]
  }
}
```

`Object.keys(scorecard).length === 4` → `had_super_over = true` → `"Yes"`

### Edge Cases

| Case | Behavior |
|------|----------|
| Multiple Super Overs | Even more innings keys (5, 6, etc.) → still `"Yes"` |
| Match abandoned after tied scores | `event_status` would reflect abandonment → `void_abandoned_match` called instead |
| Rain-affected with DLS target | Normal 2 innings → `"No"` |

### Note on Points

At 20 points, this is tied with `player_of_match` for the highest-value scenario. Super Overs are rare in IPL (~2-3 per season historically), making this a high-risk, high-reward prediction.
