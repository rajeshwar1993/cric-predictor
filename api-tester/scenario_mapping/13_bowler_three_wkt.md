# Scenario: Bowler Three Wickets

| Field | Value |
|-------|-------|
| Category | `bowler_three_wkt` |
| Label | Will any bowler take 3+ wickets? |
| Description | Predict if any bowler takes 3 or more wickets |
| Points | 10 |
| Input Type | Yes/No Pick (two buttons) |
| Resolution Phase | `mid_match` (resolved progressively as soon as condition is met) |

## Answer Options

| Option | Condition |
|--------|-----------|
| `Yes` | At least one bowler took 3 or more wickets |
| `No` | No bowler reached 3 wickets |

## API Source

**Endpoint:** `get_events` (by `event_key`) or `get_livescore`

**Fields:** `scorecard` — bowler entries from both innings

| API Field | Purpose |
|-----------|---------|
| `scorecard.<innings_key>[].type` | Filter: must be `"Bowler"` |
| `scorecard.<innings_key>[].W` | Wickets taken (string, must parseInt) |

### Check Logic

```
allBowlers = [...filterBowlers(firstInningsEntries), ...filterBowlers(secondInningsEntries)]
result = allBowlers.some(b => parseInt(b.W) >= 3)
```

## DB Storage

| Column | Type | Example |
|--------|------|---------|
| `matches.bowler_took_three` | BOOLEAN | `true` |

## Resolution Logic

### Progressive Resolution (during match — "Yes" only)

1. `progressiveResolve()` scans all bowlers from both innings every poll
2. If **any** bowler has `W >= 3`:
   - Immediately calls `resolveScenariosByCategory(matchId, "bowler_three_wkt", "Yes")`
3. **"No" cannot be resolved progressively** — only determined at match end

### End-of-Match Resolution (fallback — handles "No")

1. `parseFullResults()` sets `results.bowler_took_three = allBowlers.some(b => safeInt(b.W) >= 3)`
2. `resolve_match_predictions()` in SQL:
   - `v_correct_answer := CASE WHEN v_match.bowler_took_three THEN 'Yes' ELSE 'No' END`

### Code Locations

| Location | Function |
|----------|----------|
| `match-live/index.ts:499-501` | Progressive: `if (allBowlers.some(...)) → "Yes"` |
| `match-live/index.ts:570` | `results.bowler_took_three = allBowlers.some(...)` |
| `002_views_functions.sql:222-225` | SQL: boolean → `"Yes"` / `"No"` |

## API Response Examples

### Bowler with 3+ wickets (triggers progressive "Yes")

```json
{
  "scorecard": {
    "Sunrisers Hyderabad 1 INN": [
      {
        "player": "Jacob Duffy",
        "type": "Bowler",
        "W": "3",
        "O": "4.00",
        "R": "22",
        "ER": "5.50"
      }
    ]
  }
}
```

`parseInt("3") >= 3` → `true` → resolve as `"Yes"` immediately.

### No bowler reaches 3 wickets

```json
{
  "scorecard": {
    "Team A 1 INN": [
      { "player": "Bowler 1", "type": "Bowler", "W": "2" },
      { "player": "Bowler 2", "type": "Bowler", "W": "1" }
    ],
    "Team B 1 INN": [
      { "player": "Bowler 3", "type": "Bowler", "W": "2" },
      { "player": "Bowler 4", "type": "Bowler", "W": "2" }
    ]
  }
}
```

No bowler >= 3 → resolved as `"No"` at match end.

### Important: Bowler Appears Per Innings

A bowler who bowls in only one innings has their stats in **that batting team's** innings key. They don't accumulate across innings in the scorecard — each innings entry is independent. So `W: "3"` in one innings key means 3 wickets in that spell.

### Edge Cases

| Case | Behavior |
|------|----------|
| Bowler on 2 wickets, match still live | Not resolved yet — must wait |
| Bowler exactly 3 | `>= 3` → resolves as `"Yes"` |
| Bowler takes 5-wicket haul | Still just `"Yes"` (no bonus) |
| Same bowler, 2 wickets per innings | Each innings entry is separate; neither hits 3. Only individual innings entries matter, not cumulative. |
