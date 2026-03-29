# Scenario: Match Winner

| Field | Value |
|-------|-------|
| Category | `match_winner` |
| Label | Who will win? |
| Description | Predict the match winner |
| Points | 10 |
| Input Type | Team Pick (two buttons: Team A / Team B) |
| Resolution Phase | `end` (when match status = "Finished") |

## Answer Options

Dynamic per match — the two team codes participating in the match.

| Example Match | Option A | Option B |
|---------------|----------|----------|
| SRH vs RCB | `SRH` | `RCB` |
| MI vs KKR | `MI` | `KKR` |

The prediction value and correct answer are both stored as the team code (e.g., `"RCB"`).

## API Source

**Endpoint:** `get_events` (by `event_key`) or `get_livescore`

**Field:** `event_status_info`

The match winner is extracted from the `event_status_info` string when `event_status` = `"Finished"`.

| API Field | Purpose |
|-----------|---------|
| `event_status` | Gate: must be `"Finished"` |
| `event_status_info` | Contains winner name, e.g., `"RCB won by 6 wickets (with 26 balls remaining)"` |

### Parsing Logic (`parseMatchWinner` in `_shared/deps.ts`)

1. Check for no-result keywords: `"no result"`, `"abandoned"`, `"cancelled"` → return `null`
2. Find `" won by"` in the string → extract team name before it
3. Check for Super Over pattern: `(Team won Super Over)` → extract team name
4. Convert team name to code via `toCode()` mapping

## DB Storage

| Column | Type | Example |
|--------|------|---------|
| `matches.match_winner` | TEXT | `"RCB"` |

## Resolution Logic

### Step-by-step

1. `match-live` polls the API via `get_livescore` (or `get_events` by key)
2. When `event.event_status === "Finished"`:
   - `parseMatchWinner(event.event_status_info)` extracts winner team name
   - `toCode(winnerName)` converts to team code
   - Stored in `matches.match_winner`
3. `resolve_match_predictions(p_match_id)` is called
4. SQL maps: `v_correct_answer := v_match.match_winner`
5. All predictions with `value = correct_answer` get `is_correct = true` and earn 10 points

### Code Locations

| Location | Function |
|----------|----------|
| `match-live/index.ts:423` | `snapshot.match_winner = toCode(parseMatchWinner(...))` |
| `_shared/deps.ts:167-178` | `parseMatchWinner()` |
| `002_views_functions.sql:167` | `WHEN 'match_winner' THEN v_correct_answer := v_match.match_winner` |

## API Response Examples

### Pre-match (no winner yet)

```json
{
  "event_status": "",
  "event_status_info": "Match yet to begin",
  "event_live": "0"
}
```

### In Progress

```json
{
  "event_status": "In Progress",
  "event_status_info": "RCB need 194 runs in 115 balls.",
  "event_live": "1"
}
```

### Finished

```json
{
  "event_status": "Finished",
  "event_status_info": "RCB won by 6 wickets (with 26 balls remaining)",
  "event_live": "0"
}
```

### KNOWN BUG: API uses abbreviations in `event_status_info`

The API returns `"RCB won by 6 wickets (with 26 balls remaining)"` — using the abbreviation `"RCB"`, not the full name `"Royal Challengers Bengaluru"`.

`parseMatchWinner()` extracts `"RCB"`, then `toCode("RCB")` is called. But `TEAM_NAME_TO_CODE` in `deps.ts` only maps **full team names** (e.g., `"Royal Challengers Bengaluru" → "RCB"`). There is no entry for `"RCB" → "RCB"`.

**Result:** `toCode("RCB")` returns `null` → `match_winner` is NOT set → scenario not resolved.

**Fix needed:** Add abbreviation-to-code entries in `TEAM_NAME_TO_CODE`:
```
"CSK": "CSK", "MI": "MI", "RCB": "RCB", "KKR": "KKR",
"DC": "DC", "SRH": "SRH", "RR": "RR", "PBKS": "PBKS",
"GT": "GT", "LSG": "LSG"
```

### Edge Cases

| Case | `event_status_info` | Result |
|------|---------------------|--------|
| Normal win (abbreviation) | `"RCB won by 6 wickets (with 26 balls remaining)"` | `"RCB"` extracted, but `toCode("RCB")` returns `null` (BUG) |
| Normal win (full name) | `"Royal Challengers Bengaluru won by 6 wickets"` | `toCode("Royal Challengers Bengaluru")` → `"RCB"` (works) |
| Runs win | `"CSK won by 15 runs"` | `toCode("CSK")` → `null` (same bug) |
| Super Over | `"(MI won the Super Over)"` | `toCode("MI")` → `null` (same bug) |
| Abandoned | `"Match abandoned due to rain"` | `null` (voided) |
| No result | `"No result"` | `null` (voided) |
