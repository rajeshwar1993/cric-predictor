# Scenario: Player of the Match

| Field | Value |
|-------|-------|
| Category | `player_of_match` |
| Label | Player of the Match? |
| Description | Predict Player of the Match |
| Points | 20 |
| Input Type | Player Pick (searchable dropdown from match squad) |
| Resolution Phase | `post_match` (official announcement, after match ends) |

## Answer Options

Dynamic — all players from both teams' squads. The prediction value is the player's name.

## API Source

**Endpoint:** `get_events` (by `event_key`)

**Field:** `event_man_of_match`

| API Field | Purpose |
|-----------|---------|
| `event_man_of_match` | Player name string. Empty `""` until match is finished and award announced. |

### Parsing

No complex parsing needed. The value is the player name directly:
- `safeName(event.event_man_of_match)` trims and validates the name
- If empty string → returns `null` (not yet announced)

## DB Storage

| Column | Type | Example |
|--------|------|---------|
| `matches.player_of_match` | TEXT | `"Jacob Duffy"` |

## Resolution Logic

### Step-by-step

1. Match status becomes `"Finished"`
2. `parseFullResults(event)` reads `event.event_man_of_match`
3. `safeName()` validates and trims the name
4. Stores in `matches.player_of_match`
5. `resolve_match_predictions()` is called
6. SQL maps: `v_correct_answer := v_match.player_of_match`
7. Predictions where `value = player_of_match` earn 20 points (highest-value scenario)

### Code Locations

| Location | Function |
|----------|----------|
| `match-live/index.ts:540-541` | `const potm = safeName(event.event_man_of_match)` in `parseFullResults()` |
| `002_views_functions.sql:171` | `WHEN 'player_of_match' THEN v_correct_answer := v_match.player_of_match` |

## API Response Examples

### Pre-match / In Progress (not yet announced)

```json
{
  "event_man_of_match": "",
  "event_status": "In Progress"
}
```

### Finished (announced)

```json
{
  "event_man_of_match": "Jacob Duffy",
  "event_status": "Finished",
  "event_status_info": "RCB won by 6 wickets (with 26 balls remaining)"
}
```

### Edge Cases

| Case | Behavior |
|------|----------|
| Not yet announced | `event_man_of_match` is `""` → `safeName()` returns `null` → scenario not resolved yet |
| API delay | The `event_man_of_match` field may populate slightly after `event_status` becomes `"Finished"`. If empty at match completion, it will be picked up on subsequent polls. |
| Name mismatch | Player name from API must exactly match the name stored in `players` table for prediction comparison to work |
