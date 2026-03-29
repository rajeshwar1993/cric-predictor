# Scenario: Powerplay Score

| Field | Value |
|-------|-------|
| Category | `powerplay_score` |
| Label | Powerplay Score (First 6 Overs)? |
| Description | Predict first batting powerplay score |
| Points | 10 |
| Input Type | Range Pick (4 bracket buttons) |
| Resolution Phase | `powerplay` (after 6 overs of first innings) |

## Answer Options

| Option | Condition |
|--------|-----------|
| `<40` | Powerplay score < 40 |
| `40-55` | 40 <= score <= 55 |
| `56-70` | 56 <= score <= 70 |
| `71+` | score >= 71 |

## API Source

**Endpoint:** `get_events` (by `event_key`) or `get_livescore`

**Fields:** `comments` — ball-by-ball data for the first innings

| API Field | Purpose |
|-----------|---------|
| `comments.<first_innings_key>[]` | Ball-by-ball entries |
| `comments.<first_innings_key>[].overs` | Over.ball format, e.g., `"5.2"` (string) |
| `comments.<first_innings_key>[].runs` | Runs scored on this ball (string) |
| `extra.<first_innings_key>[0].total_overs` | Used to gate: must be >= 6 before resolving |

### Important: Comments Key During Live Match

During a live match, the comments key is `"Live"` (not the innings name). The `derivePowerplayScore()` function uses `getFirstInningsKey(comments)` which returns the first key regardless of its name.

### Computation Logic (`derivePowerplayScore` in `_shared/deps.ts:194-207`)

```
1. Get the first key from comments object
2. Iterate all balls in that key's array
3. For each ball:
   - Parse overs as float
   - If overs > 6.0 → stop (past powerplay)
   - Add parseInt(ball.runs) to running total
4. Return total
```

## DB Storage

| Column | Type | Example |
|--------|------|---------|
| `matches.powerplay_score` | INT | `39` |

## Resolution Logic

### Step-by-step (Progressive — during match)

1. `progressiveResolve()` checks if `firstOvers >= 6` (from `extra` data)
2. Calls `derivePowerplayScore(event.comments)` to sum runs in overs 1-6
3. Applies bracket logic:
   - `< 40` → `"<40"`
   - `>= 71` → `"71+"`
   - `>= 56` → `"56-70"`
   - else → `"40-55"`
4. Calls `resolveScenariosByCategory(matchId, "powerplay_score", bracket)`

### Step-by-step (End of match — fallback)

1. `parseFullResults()` calls `derivePowerplayScore()` and stores result
2. `resolve_match_predictions()` applies the same bracketing in SQL

### Code Locations

| Location | Function |
|----------|----------|
| `match-live/index.ts:471-479` | Progressive resolution in `progressiveResolve()` |
| `match-live/index.ts:573-574` | Fallback in `parseFullResults()` |
| `_shared/deps.ts:194-207` | `derivePowerplayScore()` |
| `002_views_functions.sql:188-195` | SQL bracketing |

### Bracket Boundaries

| Check Order | Condition | Answer |
|-------------|-----------|--------|
| 1 | `score < 40` | `<40` |
| 2 | `score >= 71` | `71+` |
| 3 | `score >= 56` | `56-70` |
| 4 | else | `40-55` |

## API Response Examples

### Comments during first 6 overs (Live key)

```json
{
  "comments": {
    "Live": [
      { "overs": "1", "runs": "1", "balls": "1" },
      { "overs": "F", "runs": "F", "balls": "F" },
      { "overs": "0.2", "runs": "1", "post": "Duffy to Head" },
      { "overs": "0.3", "runs": "4", "post": "Duffy to Head" },
      { "overs": "5.2", "runs": "6", "post": "Abhinandan Singh to Ishan" },
      { "overs": "5.4", "runs": "6", "post": "Abhinandan Singh to Ishan" },
      { "overs": "6.1", "runs": "1", "post": "Duffy to Klaasen" }
    ]
  }
}
```

The function sums runs for all balls where `parseFloat(overs) <= 6.0`, stopping at `overs > 6.0`.

### Comments after match (innings-keyed) — KNOWN BUG

For finished matches, the API returns comments with **two problems**:

1. **Keys are in reverse innings order** — the 2nd innings key appears first:
```json
{
  "comments": {
    "Royal Challengers Bengaluru 2 INN": [...],
    "Sunrisers Hyderabad 1 INN": [...]
  }
}
```
`getFirstInningsKey()` returns `"Royal Challengers Bengaluru 2 INN"` (the 2nd innings), so `derivePowerplayScore` would calculate the **second innings** powerplay, not the first.

2. **Ball entries are in reverse chronological order** — highest over first:
```json
{
  "comments": {
    "Sunrisers Hyderabad 1 INN": [
      { "overs": "19.6", "runs": "2", "post": "Bhuvneshwar to Unadkat" },
      { "overs": "19.5", "runs": "0", "post": "Bhuvneshwar to Unadkat" },
      "...",
      { "overs": "0.2", "runs": "1", "post": "Duffy to Head" },
      { "overs": "0.1", "runs": "0", "post": "Duffy to Head" }
    ]
  }
}
```
Since the function iterates from index 0 and breaks at `over > 6.0`, it breaks immediately (19.6 > 6.0) and returns `0`.

**Impact:** The `parseFullResults` fallback path produces wrong powerplay scores for finished matches. However, this is **masked in practice** because `progressiveResolve` resolves this scenario during live play (when comments key is `"Live"` and entries are in chronological order). The fallback only fires if progressive resolution missed the powerplay phase.

### Edge Cases

| Case | Behavior |
|------|----------|
| Marker entries (`"F"`, `"D"`, `"1"`) | `parseFloat("F")` returns `NaN`, `NaN > 6.0` is `false`, but `safeInt("F")` returns `0` — so these add 0 runs and don't break the loop |
| Wicket on ball 6.0 | Included (condition is `> 6.0`, not `>= 6.0`) |
| All out in powerplay | Whatever was scored in the first 6 overs (or fewer) |
| Comments key is "Live" (during live play) | `getFirstInningsKey()` returns `"Live"`, entries are roughly chronological → works correctly |
| Comments keys reversed (finished match) | `getFirstInningsKey()` returns 2nd innings key → **wrong innings used** |
| Ball entries reversed (finished match) | Loop breaks immediately on first entry (high over) → returns `0` |
