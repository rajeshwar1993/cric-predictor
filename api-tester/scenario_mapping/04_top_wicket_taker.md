# Scenario: Top Wicket-Taker

| Field | Value |
|-------|-------|
| Category | `top_wicket_taker` |
| Label | Top Wicket-Taker? |
| Description | Predict the highest wicket taker in the match |
| Points | 15 |
| Input Type | Player Pick (searchable dropdown from match squad) |
| Resolution Phase | `end` (when match status = "Finished") |

## Answer Options

Dynamic — all players from both teams' squads. The prediction value is the player's name.

## API Source

**Endpoint:** `get_events` (by `event_key`) or `get_livescore`

**Field:** `scorecard[*]` — all bowler entries across both innings

| API Field | Purpose |
|-----------|---------|
| `scorecard.<innings_key>[]` | Array of scorecard entries |
| `scorecard.<innings_key>[].type` | Filter: must be `"Bowler"` |
| `scorecard.<innings_key>[].player` | Player name (string) |
| `scorecard.<innings_key>[].W` | Wickets taken (string, must parseInt) |

### Computation Logic (`parseFullResults` in `match-live/index.ts:565-567`)

```
allBowlers = [...filterBowlers(firstInningsEntries), ...filterBowlers(secondInningsEntries)]
topWickets = max of parseInt(b.W) across all bowlers
topBowler = player name of the bowler with topWickets
```

If two bowlers have the same wickets, the **first one found** in scorecard order wins.

## DB Storage

| Column | Type | Example |
|--------|------|---------|
| `matches.top_wicket_taker` | TEXT | `"Jacob Duffy"` |
| `matches.top_wicket_taker_wickets` | INT | `3` |

## Resolution Logic

### Step-by-step

1. Match status becomes `"Finished"`
2. `parseFullResults(event)` iterates all bowlers from both innings
3. Finds the player with the highest `W` (wickets) value
4. Sanitizes name via `safeName()`
5. Stores in `matches.top_wicket_taker` and `matches.top_wicket_taker_wickets`
6. `resolve_match_predictions()` is called
7. SQL maps: `v_correct_answer := v_match.top_wicket_taker`
8. Predictions where `value = top_wicket_taker` earn 15 points

### Code Locations

| Location | Function |
|----------|----------|
| `match-live/index.ts:565-567` | Top wicket-taker computation in `parseFullResults()` |
| `_shared/deps.ts:151-153` | `filterBowlers()` — filters `type === "Bowler"` |
| `002_views_functions.sql:170` | `WHEN 'top_wicket_taker' THEN v_correct_answer := v_match.top_wicket_taker` |

## API Response Examples

### Scorecard entry (bowler)

```json
{
  "innings": "Sunrisers Hyderabad 1 INN",
  "player": "Jacob Duffy",
  "type": "Bowler",
  "status": "",
  "R": "22",
  "B": null,
  "Min": null,
  "4s": null,
  "6s": null,
  "O": "4.00",
  "M": "0",
  "W": "3",
  "SR": null,
  "ER": "5.50"
}
```

### Multiple bowlers comparison

| Innings | Player | W (string) | Parsed Wickets |
|---------|--------|------------|----------------|
| SH 1 INN (bowling = RCB bowlers) | Jacob Duffy | `"3"` | 3 |
| SH 1 INN | Abhinandan Singh | `"2"` | 2 |
| SH 1 INN | V Kohli | `"0"` | 0 |
| RCB 2 INN (bowling = SH bowlers) | JD Unadkat | `"1"` | 1 |
| RCB 2 INN | HV Patel | `"2"` | 2 |

Result: `top_wicket_taker = "Jacob Duffy"`, `top_wicket_taker_wickets = 3`

### Important: Bowler Innings Mapping

Bowlers appear in the **batting team's** innings key. For example:
- `"Sunrisers Hyderabad 1 INN"` contains SRH batsmen AND the RCB bowlers who bowled to them
- `"Royal Challengers Bengaluru 2 INN"` contains RCB batsmen AND the SRH bowlers

### Edge Cases

| Case | Behavior |
|------|----------|
| Tie in wickets | First bowler in scorecard order wins |
| No wickets taken | Still picks bowler with highest W (even if 0) |
| Bowler bowls in both innings | Scorecard has separate entries per innings; highest single-innings W wins |
