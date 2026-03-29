# Scenario: Powerplay Wickets

| Field | Value |
|-------|-------|
| Category | `powerplay_wickets` |
| Label | Powerplay Wickets? |
| Description | Predict wickets in first powerplay |
| Points | 10 |
| Input Type | Range Pick (4 bracket buttons) |
| Resolution Phase | `powerplay` (after 6 overs of first innings) |

## Answer Options

| Option | Condition |
|--------|-----------|
| `0` | 0 wickets fell in powerplay |
| `1` | Exactly 1 wicket |
| `2` | Exactly 2 wickets |
| `3+` | 3 or more wickets |

## API Source

**Endpoint:** `get_events` (by `event_key`) or `get_livescore`

**Fields:** `wickets` — fall of wickets for the first innings

| API Field | Purpose |
|-----------|---------|
| `wickets.<first_innings_key>[]` | Array of fall-of-wicket entries |
| `wickets.<first_innings_key>[].fall` | Over at which wicket fell, e.g., `"2.6 ov"` |
| `extra.<first_innings_key>[0].total_overs` | Used to gate: must be >= 6 before resolving |

### Computation Logic (`derivePowerplayWickets` in `_shared/deps.ts:209-219`)

```
1. Get the first key from wickets object
2. Get the fall-of-wickets array for that key
3. If empty → return 0
4. Count entries where parseOverNumber(w.fall) <= 6.0
5. Return count
```

### Parsing Over Number (`parseOverNumber` in `_shared/deps.ts:187-192`)

```
Input:  "2.6 ov"
Step 1: Remove " ov" suffix → "2.6"
Step 2: parseFloat("2.6") → 2.6
Output: 2.6
```

## DB Storage

| Column | Type | Example |
|--------|------|---------|
| `matches.powerplay_wickets` | INT | `3` |

## Resolution Logic

### Step-by-step (Progressive — during match)

1. `progressiveResolve()` checks if `firstOvers >= 6`
2. Calls `derivePowerplayWickets(event.wickets)`
3. Applies bracket logic:
   - `>= 3` → `"3+"`
   - else → `String(count)` (i.e., `"0"`, `"1"`, or `"2"`)
4. Calls `resolveScenariosByCategory(matchId, "powerplay_wickets", answer)`

### Step-by-step (End of match — fallback)

1. `parseFullResults()` calls `derivePowerplayWickets()` and stores result
2. `resolve_match_predictions()` applies same logic in SQL

### Code Locations

| Location | Function |
|----------|----------|
| `match-live/index.ts:482-485` | Progressive resolution in `progressiveResolve()` |
| `match-live/index.ts:575-576` | Fallback in `parseFullResults()` |
| `_shared/deps.ts:209-219` | `derivePowerplayWickets()` |
| `_shared/deps.ts:187-192` | `parseOverNumber()` |
| `002_views_functions.sql:196-201` | SQL bracketing |

### Bracket Logic

| Check Order | Condition | Answer |
|-------------|-----------|--------|
| 1 | `count >= 3` | `3+` |
| 2 | else | `String(count)` → `"0"`, `"1"`, or `"2"` |

## API Response Examples

### Wickets data (3 wickets in powerplay)

```json
{
  "wickets": {
    "Sunrisers Hyderabad 1 INN": [
      {
        "innings": "Sunrisers Hyderabad 1 INN",
        "fall": "2.1 ov",
        "balwer": "Abhishek Sharma",
        "batsman": " c ?",
        "score": "18/1"
      },
      {
        "innings": "Sunrisers Hyderabad 1 INN",
        "fall": "2.6 ov",
        "balwer": "TM Head",
        "batsman": " c Salt b Duffy 11 ",
        "score": "23/2"
      },
      {
        "innings": "Sunrisers Hyderabad 1 INN",
        "fall": "4.2 ov",
        "balwer": "K Nitish Kumar Reddy",
        "batsman": " c Abhinandan Singh b Duffy 1 ",
        "score": "29/3"
      },
      {
        "innings": "Sunrisers Hyderabad 1 INN",
        "fall": "15.6 ov",
        "balwer": "AU Verma",
        "batsman": " c ? 35 ",
        "score": "155/6"
      }
    ]
  }
}
```

Wickets with `fall` <= 6.0 overs: 3 (at 2.1, 2.6, 4.2)
Result: `powerplay_wickets = 3` → bracket = `"3+"`

### Edge Cases

| Case | Behavior |
|------|----------|
| No wickets in powerplay | `derivePowerplayWickets` returns `0` → answer is `"0"` |
| Wicket on exactly over 6.0 | Included (condition is `<= 6.0`) |
| `balwer` field typo | This is the API's typo — the field is `balwer`, not `bowler`. Used as-is. |
| Empty wickets array | Returns `0` |
