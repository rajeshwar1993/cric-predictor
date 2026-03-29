# Suggested New Scenarios

New prediction scenarios that are fully resolvable from existing api-cricket.com API responses but are not currently implemented. Each scenario has been verified against real poll data.

## Summary

| # | Scenario | Input Type | Suggested Points | Reliability | API Source |
|---|----------|------------|------------------|-------------|------------|
| 1 | Total Fours | Range | 10 | High | `scorecard[].4s` |
| 2 | Most Fours Player | Player Pick | 15 | High | `scorecard[].4s` |
| 3 | Century Scored? | Yes/No | 15 | High | `scorecard[].R` |
| 4 | Highest Individual Score | Range | 10 | High | `scorecard[].R` |
| 5 | Number of Ducks | Range | 10 | High | `scorecard[].R`, `.B`, `.status` |
| 6 | Toss Decision | Bat/Bowl | 5 | High | `event_toss` |
| 7 | Did Toss Winner Win? | Yes/No | 10 | High | `event_toss` + `event_status_info` |
| 8 | Winning Margin | Range | 10 | High | `event_status_info` |
| 9 | Total Extras | Range | 10 | High | `extra[].nr` |
| 10 | Second Innings Score | Range | 10 | High | `extra[].total` |
| 11 | Best Economy Bowler | Player Pick | 15 | High | `scorecard[].ER` |
| 12 | Any Maiden Over? | Yes/No | 15 | High | `scorecard[].M` |
| 13 | Death Overs Score (16-20) | Range | 10 | Medium | `comments[].overs`, `.runs` |
| 14 | Middle Overs Wickets (7-15) | Range | 10 | Medium | `wickets[].fall` |

---

## High Reliability — From Scorecard

These use `scorecard` data which has correct key ordering in both live and finished match states.

---

### 1. Total Fours

| Field | Value |
|-------|-------|
| Category | `total_fours` |
| Description | Predict total fours hit in the match |
| Input Type | Range Pick (4 brackets) |
| Suggested Points | 10 |
| Resolution Phase | `end` |
| Reliability | High |

**API Field:** `scorecard.<innings_key>[].4s` (string, parseInt)

**Suggested Brackets:**

| Option | Condition |
|--------|-----------|
| `<20` | Total fours < 20 |
| `20-29` | 20 <= fours <= 29 |
| `30-39` | 30 <= fours <= 39 |
| `40+` | fours >= 40 |

**Parsing Logic:**
```
allBatsmen = filterBatsmen(firstInnings) + filterBatsmen(secondInnings)
totalFours = sum of parseInt(b["4s"]) across all batsmen
```

Identical pattern to existing `total_sixes` scenario.

**Sample Data (SRH vs RCB, Event 22822):**

```json
{ "player": "Ishan Kishan", "type": "Batsman", "4s": "8" },
{ "player": "Virat Kohli", "type": "Batsman", "4s": "5" },
{ "player": "Devdutt Padikkal", "type": "Batsman", "4s": "7" },
{ "player": "Aniket Verma", "type": "Batsman", "4s": "3" }
```

Match total: 32 fours → bracket `"30-39"`

---

### 2. Most Fours Player

| Field | Value |
|-------|-------|
| Category | `most_fours` |
| Description | Predict the player who hits the most fours |
| Input Type | Player Pick |
| Suggested Points | 15 |
| Resolution Phase | `end` |
| Reliability | High |

**API Field:** `scorecard.<innings_key>[].4s` (string, parseInt)

**Parsing Logic:**
```
allBatsmen = filterBatsmen(firstInnings) + filterBatsmen(secondInnings)
mostFours = max of parseInt(b["4s"]) across all batsmen
mostFoursPlayer = safeName(player name of that batsman)
```

Identical pattern to existing `most_sixes` scenario.

**Sample Data:**
- Ishan Kishan: 8 fours (match high)
- Devdutt Padikkal: 7 fours
- Virat Kohli: 5 fours

Result: `most_fours_player = "Ishan Kishan"`

**Edge cases:** Same as `most_sixes` — ties broken by scorecard order; if no fours hit (extremely unlikely in T20), scenario unresolvable.

---

### 3. Century Scored?

| Field | Value |
|-------|-------|
| Category | `century_scored` |
| Description | Will any batsman score a century (100+)? |
| Input Type | Yes/No |
| Suggested Points | 15 (rare event, higher reward) |
| Resolution Phase | `mid_match` (progressive "Yes") / `end` ("No" fallback) |
| Reliability | High |

**API Field:** `scorecard.<innings_key>[].R` (string, parseInt)

**Parsing Logic:**
```
allBatsmen = filterBatsmen(allInnings)
result = allBatsmen.some(b => parseInt(b.R) >= 100)
```

Identical pattern to existing `batsman_fifty` but with threshold of 100 instead of 50.

**Progressive resolution:** Resolve as `"Yes"` immediately when any batsman crosses 100. `"No"` resolved at match end.

**Sample Data:** No centuries in SRH vs RCB match (highest: Ishan Kishan 80). IPL centuries are rare (~10-15 per season), making this a high-risk, high-reward prediction.

---

### 4. Highest Individual Score

| Field | Value |
|-------|-------|
| Category | `highest_score` |
| Description | Predict the highest individual score in the match |
| Input Type | Range Pick (4 brackets) |
| Suggested Points | 10 |
| Resolution Phase | `end` |
| Reliability | High |

**API Field:** `scorecard.<innings_key>[].R` (string, parseInt)

**Suggested Brackets:**

| Option | Condition |
|--------|-----------|
| `<40` | Highest score < 40 |
| `40-59` | 40 <= score <= 59 |
| `60-89` | 60 <= score <= 89 |
| `90+` | score >= 90 |

**Parsing Logic:**
```
allBatsmen = filterBatsmen(allInnings)
highestScore = max of parseInt(b.R) across all batsmen
```

This is a bracket version of `top_scorer` (which is player pick). Different question — "who" vs "how much."

**Sample Data:** Highest score = 80 (Ishan Kishan) → bracket `"60-89"`

---

### 5. Number of Ducks

| Field | Value |
|-------|-------|
| Category | `total_ducks` |
| Description | How many batsmen will score zero? |
| Input Type | Range Pick (4 brackets) |
| Suggested Points | 10 |
| Resolution Phase | `end` |
| Reliability | High |

**API Fields:**
- `scorecard.<innings_key>[].R` — must be `"0"`
- `scorecard.<innings_key>[].B` — must be > `"0"` (faced at least 1 ball)
- `scorecard.<innings_key>[].status` — must NOT be `""` (empty = did not bat) or `"not out"`

**Suggested Brackets:**

| Option | Condition |
|--------|-----------|
| `0` | No ducks |
| `1-2` | 1 or 2 ducks |
| `3-4` | 3 or 4 ducks |
| `5+` | 5 or more ducks |

**Parsing Logic:**
```
allBatsmen = filterBatsmen(allInnings)
ducks = allBatsmen.filter(b =>
  parseInt(b.R) === 0 &&
  parseInt(b.B) > 0 &&
  b.status !== "" &&
  b.status !== "not out"
)
totalDucks = ducks.length
```

**Important:** Must exclude `status: ""` (did not bat) and check `B > 0` (faced a ball). In the finished match data, several entries have `R=0, B=0, status=""` — these are squad members who didn't bat, not ducks.

**Sample Data (SRH vs RCB):**
```json
{ "player": "Harshal Patel", "R": "0", "B": "2", "status": "c Padikkal b Kumar" }   // DUCK
{ "player": "Jitesh Sharma", "R": "0", "B": "1", "status": "c Unadkat b Payne" }    // DUCK
{ "player": "Eshan Malinga", "R": "0", "B": "0", "status": "" }                      // DID NOT BAT
{ "player": "Jacob Duffy", "R": "0", "B": "0", "status": "" }                        // DID NOT BAT
```

Result: 2 ducks → bracket `"1-2"`

---

## High Reliability — From Event Fields

These use top-level event fields that are simple strings, no nested object ordering concerns.

---

### 6. Toss Decision

| Field | Value |
|-------|-------|
| Category | `toss_decision` |
| Description | Will the toss winner choose to bat or bowl? |
| Input Type | Two-button pick (Bat / Bowl) |
| Suggested Points | 5 |
| Resolution Phase | `toss` |
| Reliability | High |

**API Field:** `event_toss`

**Parsing Logic:**
```
Input:  "Royal Challengers Bengaluru, elected to bowl first"
Step 1: Split on ", elected to" → take second part → "bowl first"
Step 2: Check for "bat" → "Bat", check for "bowl" or "field" → "Bowl"
```

**Sample Data:**
```json
{ "event_toss": "Royal Challengers Bengaluru, elected to bowl first" }
```

Result: `"Bowl"`

**Note:** This reuses the same `event_toss` field as `toss_winner` but extracts the decision instead of the team name. Can be resolved at the exact same time.

---

### 7. Did Toss Winner Win?

| Field | Value |
|-------|-------|
| Category | `toss_winner_won` |
| Description | Will the team that wins the toss win the match? |
| Input Type | Yes/No |
| Suggested Points | 10 |
| Resolution Phase | `end` |
| Reliability | High |

**API Fields:**
- `event_toss` → extract toss winner team code (already parsed for `toss_winner`)
- `event_status_info` → extract match winner team code (already parsed for `match_winner`)

**Parsing Logic:**
```
tossWinner = toCode(parseTossWinner(event.event_toss))
matchWinner = toCode(parseMatchWinner(event.event_status_info))
result = (tossWinner === matchWinner) ? "Yes" : "No"
```

**Sample Data:**
- Toss winner: RCB (elected to bowl)
- Match winner: RCB (won by 6 wickets)
- Result: `"Yes"`

**Note:** Depends on `toCode` working correctly for both fields. Subject to the same abbreviation bug as `match_winner` (see `01_match_winner.md`).

---

### 8. Winning Margin

| Field | Value |
|-------|-------|
| Category | `winning_margin` |
| Description | Predict the winning margin |
| Input Type | Range Pick (4 brackets) |
| Suggested Points | 10 |
| Resolution Phase | `end` |
| Reliability | High |

**API Field:** `event_status_info`

**Parsing Logic:**
```
Input:  "RCB won by 6 wickets (with 26 balls remaining)"
Step 1: Find "won by" → extract text after it
Step 2: Determine type:
  - Contains "wickets" → wickets margin, parse number
  - Contains "runs" → runs margin, parse number
Step 3: Apply bracket
```

**Suggested Brackets (two sets depending on margin type):**

For batting second wins (by wickets):

| Option | Condition |
|--------|-----------|
| `1-3 wickets` | 1-3 wickets remaining |
| `4-6 wickets` | 4-6 wickets remaining |
| `7+ wickets` | 7 or more wickets remaining |

For batting first wins (by runs):

| Option | Condition |
|--------|-----------|
| `1-20 runs` | Margin 1-20 runs |
| `21-50 runs` | Margin 21-50 runs |
| `51+ runs` | Margin 51+ runs |

**Alternative simpler approach:** Just predict "By Runs" vs "By Wickets" (2-button pick, 5 points).

**Sample Data:**
```json
{ "event_status_info": "RCB won by 6 wickets (with 26 balls remaining)" }
```

Result: `"4-6 wickets"`

**Edge Cases:**
- Super Over: `"(MI won the Super Over)"` → separate category or excluded
- Tied/DLS: margin text may differ

---

## High Reliability — From Extras

The `extra` object has correct key ordering (1st innings first) in both live and finished states.

---

### 9. Total Extras

| Field | Value |
|-------|-------|
| Category | `total_extras` |
| Description | Predict total extras in the match |
| Input Type | Range Pick (4 brackets) |
| Suggested Points | 10 |
| Resolution Phase | `end` |
| Reliability | High |

**API Field:** `extra.<innings_key>[0].nr` (string, parseFloat — extras runs per innings)

**Suggested Brackets:**

| Option | Condition |
|--------|-----------|
| `<10` | Total extras < 10 |
| `10-19` | 10 <= extras <= 19 |
| `20-29` | 20 <= extras <= 29 |
| `30+` | extras >= 30 |

**Parsing Logic:**
```
e1 = parseFloat(extra[firstKey][0].nr)    // e.g., 6.00
e2 = parseFloat(extra[secondKey][0].nr)   // e.g., 18.00
totalExtras = e1 + e2                      // e.g., 24
```

**Sample Data:**
```json
{
  "extra": {
    "Sunrisers Hyderabad 1 INN": [{ "nr": "6.00", "text": "(w 4, lb 2)" }],
    "Royal Challengers Bengaluru 2 INN": [{ "nr": "18.00", "text": "(w 7, lb 3)" }]
  }
}
```

Result: `totalExtras = 6 + 18 = 24` → bracket `"20-29"`

---

### 10. Second Innings Score

| Field | Value |
|-------|-------|
| Category | `second_innings_score` |
| Description | Predict the second innings total |
| Input Type | Range Pick (4 brackets) |
| Suggested Points | 10 |
| Resolution Phase | `end` |
| Reliability | High |

**API Field:** `extra.<second_innings_key>[0].total` (string, parse with regex)

**Suggested Brackets:**

| Option | Condition |
|--------|-----------|
| `<130` | Second innings total < 130 (note: lower than first innings brackets since chases often end early) |
| `130-159` | 130 <= total <= 159 |
| `160-189` | 160 <= total <= 189 |
| `190+` | total >= 190 |

**Parsing Logic:**
Same as `first_innings_score` but using the second key from `extra`:
```
secondKey = Object.keys(event.extra)[1]
total = parseInningsTotal(extra[secondKey][0].total)
```

**Sample Data:**
```json
{ "total": "203 ( 15.4 )" }
```

Result: `second_innings_score = 203` → bracket `"190+"`

**Note:** Second innings totals are often lower than first innings (team chasing stops when target is reached). Brackets should be adjusted accordingly. In a chase, "203" means the target was reached — the actual margin matters, not just the total.

---

## High Reliability — From Bowling Scorecard

---

### 11. Best Economy Bowler

| Field | Value |
|-------|-------|
| Category | `best_economy` |
| Description | Predict the bowler with the best (lowest) economy rate |
| Input Type | Player Pick |
| Suggested Points | 15 |
| Resolution Phase | `end` |
| Reliability | High |

**API Fields:**
- `scorecard.<innings_key>[].type` — filter: `"Bowler"`
- `scorecard.<innings_key>[].ER` — economy rate (string, parseFloat)
- `scorecard.<innings_key>[].O` — overs bowled (string, parseFloat) — for minimum qualifier

**Parsing Logic:**
```
allBowlers = filterBowlers(allInnings)
qualified = allBowlers.filter(b => parseFloat(b.O) >= 2.0)  // min 2 overs
bestER = min of parseFloat(b.ER) across qualified bowlers
bestEconomyBowler = safeName(player name)
```

**Sample Data:**
```json
{ "player": "Jacob Duffy", "type": "Bowler", "O": "4.00", "ER": "5.50" },
{ "player": "Bhuvneshwar Kumar", "type": "Bowler", "O": "4.00", "ER": "7.75" },
{ "player": "Suyash Sharma", "type": "Bowler", "O": "3.00", "ER": "9.33" }
```

Result: `best_economy = "Jacob Duffy"` (ER 5.50)

**Edge cases:** Ties broken by scorecard order. Minimum overs qualifier prevents part-time bowlers who bowl 1 over cheaply from winning.

---

### 12. Any Maiden Over?

| Field | Value |
|-------|-------|
| Category | `any_maiden` |
| Description | Will any bowler bowl a maiden over? |
| Input Type | Yes/No |
| Suggested Points | 15 (rare in T20s) |
| Resolution Phase | `mid_match` (progressive "Yes") / `end` ("No" fallback) |
| Reliability | High |

**API Field:** `scorecard.<innings_key>[].M` (string, parseInt)

**Parsing Logic:**
```
allBowlers = filterBowlers(allInnings)
result = allBowlers.some(b => parseInt(b.M) > 0)
```

**Progressive resolution:** Resolve as `"Yes"` immediately when any bowler's `M > 0`. `"No"` only at match end.

**Sample Data:** No maidens in SRH vs RCB match (all bowlers `M: "0"`). Maidens are extremely rare in T20 cricket (~1-2 per tournament), making this a high-risk, high-reward prediction similar to `had_super_over`.

---

## Medium Reliability — From Comments/Wickets

These have the same key-ordering and entry-ordering issues as `powerplay_score`/`powerplay_wickets`/`first_wicket_over` in finished match data. They would need progressive resolution during live play or fixes to the ordering logic.

---

### 13. Death Overs Score (Overs 16-20)

| Field | Value |
|-------|-------|
| Category | `death_overs_score` |
| Description | Predict runs scored in death overs (16-20) of the first innings |
| Input Type | Range Pick (4 brackets) |
| Suggested Points | 10 |
| Resolution Phase | `innings_break` |
| Reliability | Medium |

**API Field:** `comments.<first_innings_key>[]` — ball-by-ball entries where `overs > 15.0 && overs <= 20.0`

**Suggested Brackets:**

| Option | Condition |
|--------|-----------|
| `<40` | Death overs score < 40 |
| `40-59` | 40 <= score <= 59 |
| `60-79` | 60 <= score <= 79 |
| `80+` | score >= 80 |

**Parsing Logic:**
```
Same as derivePowerplayScore but for overs 16-20 instead of 1-6:
1. Get first innings key from comments
2. Iterate balls where parseFloat(overs) > 15.0 && <= 20.0
3. Sum runs
```

**Reliability Note:** Same ordering issues as `powerplay_score` — comments keys reversed and entries reversed in finished matches. Would need progressive resolution at innings break, or a fix to sort entries.

---

### 14. Middle Overs Wickets (Overs 7-15)

| Field | Value |
|-------|-------|
| Category | `middle_overs_wickets` |
| Description | Predict wickets in middle overs (7-15) of the first innings |
| Input Type | Range Pick (4 brackets) |
| Suggested Points | 10 |
| Resolution Phase | `innings_break` (or progressive after over 15) |
| Reliability | Medium |

**API Field:** `wickets.<first_innings_key>[]` — entries where `parseOverNumber(fall) > 6.0 && <= 15.0`

**Suggested Brackets:**

| Option | Condition |
|--------|-----------|
| `0-1` | 0 or 1 wickets |
| `2-3` | 2 or 3 wickets |
| `4-5` | 4 or 5 wickets |
| `6+` | 6 or more wickets |

**Parsing Logic:**
```
Same as derivePowerplayWickets but for overs 7-15:
1. Get first innings key from wickets
2. Count entries where 6.0 < parseOverNumber(w.fall) <= 15.0
3. Return count
```

**Reliability Note:** Same key-ordering issues as `powerplay_wickets` — wickets keys reversed in finished matches. The filter logic itself works (checks all entries), but against the wrong innings if key ordering is wrong.

---

## Scenarios NOT Suggested (insufficient API data)

| Idea | Why Not |
|------|---------|
| Highest Partnership | No partnership data in API responses. Would need to derive from fall-of-wickets + ball-by-ball, which is complex and error-prone. |
| Dot Ball Percentage | `comments` entries don't reliably distinguish dot balls from wides/no-balls in all states. |
| Caught vs Bowled vs LBW | `status` field has dismissal type but format varies (`"c Salt b Duffy"`, `"c ?"`, `"lbw b Kumar"`). Parsing is fragile. |
| Run Outs | Would need to parse `status` for `"run out"` — possible but not well-tested across different formats. |
| DLS Target | No separate DLS data in API. Rain-affected matches just show revised totals. |
| Batting Order (who opens) | Derivable from `comments` or `scorecard` order, but not reliably ordered in all match states. |
