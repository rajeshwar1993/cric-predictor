# Scenario: Toss Winner

| Field | Value |
|-------|-------|
| Category | `toss_winner` |
| Label | Who wins the toss? |
| Description | Predict the toss winner |
| Points | 5 |
| Input Type | Team Pick (two buttons: Team A / Team B) |
| Resolution Phase | `toss` (resolved immediately when toss is called, before match starts) |

## Answer Options

Dynamic per match — the two team codes participating in the match.

| Example Match | Option A | Option B |
|---------------|----------|----------|
| SRH vs RCB | `SRH` | `RCB` |

The prediction value and correct answer are both stored as the team code (e.g., `"RCB"`).

## API Source

**Endpoint:** `get_events` (by `event_key`)

**Field:** `event_toss`

| API Field | Purpose |
|-----------|---------|
| `event_toss` | Full toss string, e.g., `"Royal Challengers Bengaluru, elected to bowl first"` |

### Parsing Logic (`parseTossWinner` in `_shared/deps.ts`)

1. If `event_toss` is empty or null → return `null` (toss not yet done)
2. Try splitting on known delimiters in order:
   - `", elected to"` → take text before it
   - `", chose to"` → take text before it
   - `", opted to"` → take text before it
3. Fallback: split on first comma → take text before it
4. Convert team name to code via `toCode()`

## DB Storage

| Column | Type | Example |
|--------|------|---------|
| `matches.toss_winner` | TEXT | `"RCB"` |

## Resolution Logic

### Step-by-step

1. `match-live` polls `get_events` for upcoming matches
2. When `parseTossWinner(event.event_toss)` returns non-null OR `event.event_live === "1"`:
   - Match transitions to `"live"` status
   - `matches.toss_winner` is set to `toCode(tossWinner)`
3. **Immediately** calls `resolveScenariosByCategory(matchId, "toss_winner", toCode(tossWinner))`
   - This resolves the scenario right away — does NOT wait for `resolve_match_predictions`
4. The RPC `resolve_scenarios_by_category` updates all `toss_winner` scenarios for this match:
   - Sets `correct_answer` on the scenario
   - Sets `is_correct` and `points_earned` on each prediction

### Code Locations

| Location | Function |
|----------|----------|
| `match-live/index.ts:279-299` | `processUpcoming()` — detects toss and resolves |
| `_shared/deps.ts:156-165` | `parseTossWinner()` |
| `match-live/index.ts:598-608` | `resolveScenariosByCategory()` |
| `002_views_functions.sql:168` | `WHEN 'toss_winner' THEN v_correct_answer := v_match.toss_winner` |

### Important: Earliest Resolved Scenario

This is the **first** scenario resolved in any match — it happens before the first ball is bowled. The `processUpcoming()` function in match-live detects the toss and resolves immediately via the progressive resolution path (`resolveScenariosByCategory`), not the end-of-match path (`resolve_match_predictions`).

## API Response Examples

### Pre-match (toss not yet done)

```json
{
  "event_toss": "",
  "event_status": "",
  "event_status_info": "Match yet to begin",
  "event_live": "0"
}
```

### Toss done, match live

```json
{
  "event_toss": "Royal Challengers Bengaluru, elected to bowl first",
  "event_status": "In Progress",
  "event_live": "1"
}
```

### Finished match (toss still available)

```json
{
  "event_toss": "Royal Challengers Bengaluru, elected to bowl first",
  "event_status": "Finished"
}
```

### Parsing Examples

| `event_toss` | Parsed Team Name | Team Code |
|-------------|------------------|-----------|
| `"Royal Challengers Bengaluru, elected to bowl first"` | `"Royal Challengers Bengaluru"` | `"RCB"` |
| `"Chennai Super Kings, elected to bat first"` | `"Chennai Super Kings"` | `"CSK"` |
| `"Mumbai Indians, chose to field"` | `"Mumbai Indians"` | `"MI"` |
| `""` | `null` | — (toss not yet done) |
