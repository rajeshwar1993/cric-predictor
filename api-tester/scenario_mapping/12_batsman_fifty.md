# Scenario: Batsman Fifty

| Field | Value |
|-------|-------|
| Category | `batsman_fifty` |
| Label | Will any batsman score 50+? |
| Description | Predict if any batsman scores a half century |
| Points | 10 |
| Input Type | Yes/No Pick (two buttons) |
| Resolution Phase | `mid_match` (resolved progressively as soon as condition is met) |

## Answer Options

| Option | Condition |
|--------|-----------|
| `Yes` | At least one batsman scored 50 or more runs |
| `No` | No batsman reached 50 runs |

## API Source

**Endpoint:** `get_events` (by `event_key`) or `get_livescore`

**Fields:** `scorecard` — batsman entries from both innings

| API Field | Purpose |
|-----------|---------|
| `scorecard.<innings_key>[].type` | Filter: must be `"Batsman"` |
| `scorecard.<innings_key>[].R` | Runs scored (string, must parseInt) |

### Check Logic

```
allBatsmen = [...filterBatsmen(firstInningsEntries), ...filterBatsmen(secondInningsEntries)]
result = allBatsmen.some(b => parseInt(b.R) >= 50)
```

## DB Storage

| Column | Type | Example |
|--------|------|---------|
| `matches.batsman_scored_fifty` | BOOLEAN | `true` |

## Resolution Logic

### Progressive Resolution (during match — "Yes" only)

1. `progressiveResolve()` scans all batsmen from both innings every poll
2. If **any** batsman has `R >= 50`:
   - Immediately calls `resolveScenariosByCategory(matchId, "batsman_fifty", "Yes")`
   - This resolves the scenario mid-match without waiting for completion
3. **"No" cannot be resolved progressively** — it can only be determined at match end

### End-of-Match Resolution (fallback — handles "No")

1. `parseFullResults()` sets `results.batsman_scored_fifty = allBatsmen.some(b => safeInt(b.R) >= 50)`
2. `resolve_match_predictions()` in SQL:
   - `v_correct_answer := CASE WHEN v_match.batsman_scored_fifty THEN 'Yes' ELSE 'No' END`

### Code Locations

| Location | Function |
|----------|----------|
| `match-live/index.ts:496-498` | Progressive: `if (allBatsmen.some(...)) → "Yes"` |
| `match-live/index.ts:569` | `results.batsman_scored_fifty = allBatsmen.some(...)` |
| `002_views_functions.sql:218-221` | SQL: boolean → `"Yes"` / `"No"` |

## API Response Examples

### Batsman with 50+ runs (triggers progressive "Yes")

```json
{
  "scorecard": {
    "Sunrisers Hyderabad 1 INN": [
      {
        "player": "Ishan Kishan",
        "type": "Batsman",
        "R": "80",
        "B": "38",
        "6s": "5"
      }
    ]
  }
}
```

`parseInt("80") >= 50` → `true` → resolve as `"Yes"` immediately.

### No batsman reaches 50

```json
{
  "scorecard": {
    "Team A 1 INN": [
      { "player": "Player 1", "type": "Batsman", "R": "45" },
      { "player": "Player 2", "type": "Batsman", "R": "32" }
    ],
    "Team B 1 INN": [
      { "player": "Player 3", "type": "Batsman", "R": "48" },
      { "player": "Player 4", "type": "Batsman", "R": "28" }
    ]
  }
}
```

No batsman >= 50 → resolved as `"No"` at match end.

### Edge Cases

| Case | Behavior |
|------|----------|
| Batsman on 49* (not out, match in progress) | Not resolved yet — must wait to see if they reach 50 |
| Batsman exactly 50 | `>= 50` → resolves as `"Yes"` |
| Progressive "Yes" → match cancelled | The scenario was already resolved as "Yes"; void logic would need to handle this separately |
| First innings fifty, match still live | Resolved as "Yes" immediately during first innings polling |
