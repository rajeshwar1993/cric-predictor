# Scenario: Total Sixes

| Field | Value |
|-------|-------|
| Category | `total_sixes` |
| Label | Total Sixes? |
| Description | Predict total sixes in the match |
| Points | 10 |
| Input Type | Range Pick (4 bracket buttons) |
| Resolution Phase | `end` (when match status = "Finished") |

## Answer Options

| Option | Condition |
|--------|-----------|
| `<15` | Total sixes < 15 |
| `15-25` | 15 <= sixes <= 25 |
| `26-35` | 26 <= sixes <= 35 |
| `36+` | sixes >= 36 |

## API Source

**Endpoint:** `get_events` (by `event_key`) or `get_livescore`

**Fields:** `scorecard` — batsman entries from both innings

| API Field | Purpose |
|-----------|---------|
| `scorecard.<innings_key>[].type` | Filter: must be `"Batsman"` |
| `scorecard.<innings_key>[].6s` | Sixes hit by this batsman (string, must parseInt) |

### Computation Logic (`parseFullResults` in `match-live/index.ts:555`)

```
allBatsmen = [...filterBatsmen(firstInningsEntries), ...filterBatsmen(secondInningsEntries)]
total_match_sixes = sum of parseInt(b["6s"]) across all batsmen
```

## DB Storage

| Column | Type | Example |
|--------|------|---------|
| `matches.total_match_sixes` | INT | `18` |

## Resolution Logic

### Step-by-step

1. Match status becomes `"Finished"`
2. `parseFullResults(event)` sums `6s` field from all batsmen across both innings
3. Stores integer in `matches.total_match_sixes`
4. `resolve_match_predictions()` applies bracketing in SQL:
   - `< 15` → `"<15"`
   - `>= 36` → `"36+"`
   - `>= 26` → `"26-35"`
   - else → `"15-25"`
5. Predictions matching the bracket earn 10 points

### Code Locations

| Location | Function |
|----------|----------|
| `match-live/index.ts:555` | `results.total_match_sixes = allBatsmen.reduce(...)` |
| `002_views_functions.sql:202-209` | SQL bracketing |

### Bracket Boundaries

| Check Order | Condition | Answer |
|-------------|-----------|--------|
| 1 | `sixes < 15` | `<15` |
| 2 | `sixes >= 36` | `36+` |
| 3 | `sixes >= 26` | `26-35` |
| 4 | else | `15-25` |

## API Response Examples

### Batsman scorecard entries with sixes

```json
[
  { "player": "Ishan Kishan", "type": "Batsman", "R": "80", "6s": "5" },
  { "player": "TM Head", "type": "Batsman", "R": "11", "6s": "0" },
  { "player": "Abhishek Sharma", "type": "Batsman", "R": "7", "6s": "1" },
  { "player": "H Klaasen", "type": "Batsman", "R": "25", "6s": "2" }
]
```

Sum of `6s` across all batsmen from both innings = total_match_sixes.

### Edge Cases

| Case | Behavior |
|------|----------|
| Null/missing `6s` field | `safeInt(null)` returns `0` |
| Super Over sixes | Super Over entries are in additional innings keys — included if batsmen are listed with `type: "Batsman"` |
| Low-scoring match | Total sixes might be very low → `"<15"` |
