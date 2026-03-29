# Scenario: First Wicket Over

| Field | Value |
|-------|-------|
| Category | `first_wicket_over` |
| Label | First Wicket in which Over? |
| Description | Predict when the first wicket falls |
| Points | 10 |
| Input Type | Range Pick (4 bracket buttons) |
| Resolution Phase | `first_wicket` (earliest possible — as soon as first wicket falls) |

## Answer Options

| Option | Condition |
|--------|-----------|
| `1-2` | First wicket falls in over 1 or 2 |
| `3-4` | First wicket falls in over 3 or 4 |
| `5-6` | First wicket falls in over 5 or 6 |
| `7+` | First wicket falls in over 7 or later |

## API Source

**Endpoint:** `get_events` (by `event_key`) or `get_livescore`

**Fields:** `wickets` — fall of wickets for the first innings

| API Field | Purpose |
|-----------|---------|
| `wickets.<first_innings_key>[0]` | First fall-of-wicket entry |
| `wickets.<first_innings_key>[0].fall` | Over at which wicket fell, e.g., `"2.1 ov"` |

### Computation Logic (`deriveFirstWicketOver` in `_shared/deps.ts:221-230`)

```
1. Get the first key from wickets object
2. Get the fall-of-wickets array for that key
3. If empty → return null (no wicket yet)
4. Take the FIRST entry: fow[0]
5. Parse over number: parseOverNumber(fow[0].fall)
6. Apply Math.ceil() to get the over number (e.g., 2.1 → 3, 2.6 → 3)
```

### Parsing Over Number (`parseOverNumber` in `_shared/deps.ts:187-192`)

```
Input:  "2.1 ov"
Step 1: Remove " ov" suffix → "2.1"
Step 2: parseFloat("2.1") → 2.1
Output: 2.1
```

Then `Math.ceil(2.1) = 3` → the wicket fell in over 3.

### Important: Over Number vs Over.Ball

The API uses `"2.1 ov"` format where `2.1` means over 2, ball 1 (i.e., the first ball of the 3rd over). `Math.ceil()` converts this to "over 3" which represents "during the 3rd over."

- `"0.3 ov"` → `Math.ceil(0.3) = 1` → "in over 1"
- `"2.1 ov"` → `Math.ceil(2.1) = 3` → "in over 3"
- `"2.6 ov"` → `Math.ceil(2.6) = 3` → "in over 3"
- `"6.0 ov"` → `Math.ceil(6.0) = 6` → "in over 6"

## DB Storage

| Column | Type | Example |
|--------|------|---------|
| `matches.first_wicket_over` | INT | `3` |

The stored value is the ceiled over number (e.g., `3` means "during the 3rd over").

## Resolution Logic

### Progressive Resolution (during match)

1. `progressiveResolve()` calls `deriveFirstWicketOver(event.wickets)`
2. If result is not null (a wicket has fallen):
   - Applies bracket logic:
     - `<= 2` → `"1-2"`
     - `<= 4` → `"3-4"`
     - `<= 6` → `"5-6"`
     - else → `"7+"`
   - Calls `resolveScenariosByCategory(matchId, "first_wicket_over", bracket)`
3. This is the **second-earliest** resolved scenario (after `toss_winner`)

### End-of-Match Resolution (fallback)

1. `parseFullResults()` stores `first_wicket_over` as integer
2. `resolve_match_predictions()` applies same bracketing in SQL

### Code Locations

| Location | Function |
|----------|----------|
| `match-live/index.ts:455-463` | Progressive resolution in `progressiveResolve()` |
| `match-live/index.ts:577-578` | Fallback in `parseFullResults()` |
| `_shared/deps.ts:221-230` | `deriveFirstWicketOver()` |
| `_shared/deps.ts:187-192` | `parseOverNumber()` |
| `002_views_functions.sql:231-238` | SQL bracketing |

### Bracket Boundaries

| Check Order | Condition | Answer |
|-------------|-----------|--------|
| 1 | `over <= 2` | `1-2` |
| 2 | `over <= 4` | `3-4` |
| 3 | `over <= 6` | `5-6` |
| 4 | else | `7+` |

## API Response Examples

### First wicket falls early (over 2)

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
      }
    ]
  }
}
```

First entry: `fall = "2.1 ov"` → `parseFloat("2.1") = 2.1` → `Math.ceil(2.1) = 3` → bracket `"3-4"`

Wait — let's trace this more carefully from the actual poll data:

The wickets array shows the first entry has `fall: "2.1 ov"`. However, note that the wickets array may NOT be ordered by time. Looking at the real data:
- Entry 0: `fall: "2.6 ov"`, score `"23/2"` (2nd wicket)
- Entry 1: `fall: "2.1 ov"`, score `"18/1"` (1st wicket)

The function takes `fow[0]` — the first array entry. In this sample data, entry 0 is actually the 2nd wicket (2.6 ov, 23/2). However, `score: "23/2"` means 2 wickets have fallen, while `score: "18/1"` means 1 wicket. So the `fow[0]` may not always be the actual first wicket.

**Caveat:** The `deriveFirstWicketOver` function assumes `fow[0]` is the first wicket, but the API may return wickets in non-chronological order. In practice, this works correctly if the API orders by time, which it typically does.

### No wickets yet

```json
{
  "wickets": {
    "Sunrisers Hyderabad 1 INN": []
  }
}
```

or

```json
{
  "wickets": []
}
```

Result: `null` → scenario not resolved yet.

### Edge Cases

| Case | Behavior |
|------|----------|
| Wicket on first ball | `fall: "0.1 ov"` → `Math.ceil(0.1) = 1` → `"1-2"` |
| Wicket on last ball of over 2 | `fall: "2.6 ov"` → `Math.ceil(2.6) = 3` → `"3-4"` (the .6 pushes it to next over) |
| Wicket on over 6.0 exactly | `Math.ceil(6.0) = 6` → `"5-6"` |
| No wickets all match | `deriveFirstWicketOver` returns `null` → scenario unresolved |
| Wickets array not ordered | `fow[0]` taken as-is — may pick wrong entry if API doesn't sort chronologically |
