# Scenario: Most Sixes Player

| Field | Value |
|-------|-------|
| Category | `most_sixes` |
| Label | Most Sixes Player? |
| Description | Predict the player who hits most sixes |
| Points | 15 |
| Input Type | Player Pick (searchable dropdown from match squad) |
| Resolution Phase | `end` (when match status = "Finished") |

## Answer Options

Dynamic — all players from both teams' squads. The prediction value is the player's name.

## API Source

**Endpoint:** `get_events` (by `event_key`) or `get_livescore`

**Fields:** `scorecard` — batsman entries from both innings

| API Field | Purpose |
|-----------|---------|
| `scorecard.<innings_key>[].type` | Filter: must be `"Batsman"` |
| `scorecard.<innings_key>[].player` | Player name (string) |
| `scorecard.<innings_key>[].6s` | Sixes hit by this batsman (string, must parseInt) |

### Computation Logic (`parseFullResults` in `match-live/index.ts:561-563`)

```
allBatsmen = [...filterBatsmen(firstInningsEntries), ...filterBatsmen(secondInningsEntries)]
mostSixes = max of parseInt(b["6s"]) across all batsmen
mostSixesPlayer = player name of the batsman with mostSixes
```

Only stored if `mostSixes > 0` (at least one six was hit).

## DB Storage

| Column | Type | Example |
|--------|------|---------|
| `matches.most_sixes_player` | TEXT | `"Ishan Kishan"` |

Note: Unlike `top_scorer` which also stores `top_scorer_runs`, this scenario only stores the player name, not the count of sixes.

## Resolution Logic

### Step-by-step

1. Match status becomes `"Finished"`
2. `parseFullResults(event)` finds batsman with most sixes
3. Sanitizes name via `safeName()`
4. Stores in `matches.most_sixes_player` (only if `mostSixes > 0`)
5. `resolve_match_predictions()` is called
6. SQL maps: `v_correct_answer := v_match.most_sixes_player`
7. Predictions where `value = most_sixes_player` earn 15 points

### Code Locations

| Location | Function |
|----------|----------|
| `match-live/index.ts:561-563` | Most sixes computation in `parseFullResults()` |
| `002_views_functions.sql:230` | `WHEN 'most_sixes' THEN v_correct_answer := v_match.most_sixes_player` |

## API Response Examples

### Batsmen with sixes

```json
[
  { "player": "Ishan Kishan", "type": "Batsman", "R": "80", "6s": "5" },
  { "player": "TM Head", "type": "Batsman", "R": "11", "6s": "0" },
  { "player": "H Klaasen", "type": "Batsman", "R": "25", "6s": "2" },
  { "player": "V Kohli", "type": "Batsman", "R": "45", "6s": "3" }
]
```

Max `6s` = 5 (Ishan Kishan) → `most_sixes_player = "Ishan Kishan"`

### Edge Cases

| Case | Behavior |
|------|----------|
| Tie in sixes | First batsman in scorecard order wins |
| No sixes in match | `mostSixes = 0` → player name is NOT stored → scenario remains unresolved |
| All batsmen have 0 sixes | Same as above — `most_sixes_player` is `null` |
| Only one six in entire match | That batsman wins regardless |
