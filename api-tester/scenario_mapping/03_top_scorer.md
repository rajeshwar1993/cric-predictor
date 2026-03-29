# Scenario: Top Scorer

| Field | Value |
|-------|-------|
| Category | `top_scorer` |
| Label | Top Scorer? |
| Description | Predict the highest run scorer in the match |
| Points | 15 |
| Input Type | Player Pick (searchable dropdown from match squad) |
| Resolution Phase | `end` (when match status = "Finished") |

## Answer Options

Dynamic — all players from both teams' squads (populated from `match_squads` table). The prediction value is the player's name as stored in the `players` table.

## API Source

**Endpoint:** `get_events` (by `event_key`) or `get_livescore`

**Field:** `scorecard[*]` — all batsman entries across both innings

| API Field | Purpose |
|-----------|---------|
| `scorecard.<innings_key>[]` | Array of scorecard entries |
| `scorecard.<innings_key>[].type` | Filter: must be `"Batsman"` |
| `scorecard.<innings_key>[].player` | Player name (string) |
| `scorecard.<innings_key>[].R` | Runs scored (string, must parseInt) |

### Computation Logic (`parseFullResults` in `match-live/index.ts:557-559`)

```
allBatsmen = [...filterBatsmen(firstInningsEntries), ...filterBatsmen(secondInningsEntries)]
topRuns = max of parseInt(b.R) across all batsmen
topScorer = player name of the batsman with topRuns
```

If two batsmen have the same runs, the **first one found** in the scorecard order wins (first innings batsmen are checked before second innings).

## DB Storage

| Column | Type | Example |
|--------|------|---------|
| `matches.top_scorer` | TEXT | `"Ishan Kishan"` |
| `matches.top_scorer_runs` | INT | `80` |

## Resolution Logic

### Step-by-step

1. Match status becomes `"Finished"`
2. `parseFullResults(event)` iterates all batsmen from both innings
3. Finds the player with the highest `R` (runs) value
4. Sanitizes name via `safeName()` (trims, validates characters, max 100 chars)
5. Stores in `matches.top_scorer` and `matches.top_scorer_runs`
6. `resolve_match_predictions()` is called
7. SQL maps: `v_correct_answer := v_match.top_scorer`
8. Predictions where `value = top_scorer` get `is_correct = true` and earn 15 points

### Code Locations

| Location | Function |
|----------|----------|
| `match-live/index.ts:557-559` | Top scorer computation in `parseFullResults()` |
| `_shared/deps.ts:106-115` | `safeName()` — player name sanitization |
| `_shared/deps.ts:148-150` | `filterBatsmen()` — filters `type === "Batsman"` |
| `002_views_functions.sql:169` | `WHEN 'top_scorer' THEN v_correct_answer := v_match.top_scorer` |

## API Response Examples

### Scorecard entry (batsman)

```json
{
  "innings": "Sunrisers Hyderabad 1 INN",
  "player": "Ishan Kishan",
  "type": "Batsman",
  "status": "c Salt b Abhinandan Singh",
  "R": "80",
  "B": "38",
  "Min": "0",
  "4s": "8",
  "6s": "5",
  "O": null,
  "M": null,
  "W": null,
  "SR": "210.52",
  "ER": null
}
```

### Multiple batsmen comparison

| Innings | Player | R (string) | Parsed Runs |
|---------|--------|------------|-------------|
| SH 1 INN | TM Head | `"11"` | 11 |
| SH 1 INN | Ishan Kishan | `"80"` | 80 |
| SH 1 INN | H Klaasen | `"25"` | 25 |
| RCB 2 INN | V Kohli | `"45"` | 45 |
| RCB 2 INN | PD Salt | `"60"` | 60 |

Result: `top_scorer = "Ishan Kishan"`, `top_scorer_runs = 80`

### Edge Cases

| Case | Behavior |
|------|----------|
| Tie in runs | First player in scorecard order wins |
| All-out cheaply | Still picks the highest scorer even if low |
| Rain-shortened | If match is "Finished", still resolved normally |
| Player name with special chars | `safeName()` rejects names not matching `/^[a-zA-Z0-9\s.\-'()]+$/` |
