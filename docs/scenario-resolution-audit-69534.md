# Scenario Resolution Audit — Match 69534 (PBKS vs SRH)

**Date:** 2026-04-11
**Author:** Audit of `live-poll-resolve-fixtures` edge function against real captured Sportmonks polling data.
**Data source:** `api-tester/responses/sportsmonk/live-data/` — 1,131 polling rounds at 15s intervals over ~4h42m, covering fixture `69534` (Punjab Kings vs Sunrisers Hyderabad) from `09:34:14` pre-match to `14:16:54` post-match. A second fixture `69535` begins appearing in the capture at `round-1004` for the concurrency check.
**Method:** Two parallel computations of the 19 active scenario answers:

1. **Data truth** — direct inspection of the final `fixture-69534.json` plus the progression of intermediate rounds for time-sensitive fields (powerplay, first wicket, etc.).
2. **Edge function simulation** — full replay of `supabase/supabase/functions/live-poll-resolve-fixtures/index.ts` and `supabase/supabase/functions/_shared/sportmonks-extractors.ts` over all 1,131 rounds, honoring the `previousMaxOvers` pre-poll DB state and the `is_resolved` idempotence guard.

---

## 1. Match recap

- **Fixture 69534** — Punjab Kings (`localteam_id = 4`, HOME) vs Sunrisers Hyderabad (`visitorteam_id = 9`, AWAY). 17th Match of season `1795`. Start time `2026-04-11T10:00:00Z`.
- **Toss:** PBKS won and elected to bowl (`toss_won_team_id = 4`, populated from `round-001` onward, even while status was `NS`).
- **1st innings (SRH, AWAY batting first):** 219/6 in 20 overs.
- **2nd innings (PBKS, HOME chasing):** 223/4 in 18.5 overs. PBKS won by 6 wickets with 7 balls remaining.
- **Player of the Match:** `man_of_match_id = 2813` (Shreyas Iyer, 69 off 33). First appears in the API at `round-1079` — ~16m45s after `status` flipped to `Finished`.
- **Status timeline:** `NS → 1st Innings (round-107) → Innings Break (round-539) → 2nd Innings (round-602) → Finished (round-1012) → [MoM populated at round-1079]`.
- **Concurrency note:** Fixture `69535` (teams `2` vs `3`, different match) first appears in the capture at `round-1004` (`NS`), transitions to `1st Innings` at `round-1062`, and is still batting when the capture ends at `round-1131`.

---

## 2. The two answer sets

Both the data-truth path and the edge-function simulation converge on the **same final value** for every one of the 19 active scenarios. The table also reports the earliest round at which the edge function logic would have resolved the scenario if it were polling cleanly every 15s.

| # | Slug | Data truth | Edge-function sim | Match? | Resolved at |
|---|---|---|---|---|---|
| 1 | `toss_winner` | `4` (PBKS) | `4` | ✓ | round-001 |
| 2 | `match_winner` | `4` | `4` | ✓ | round-1012 |
| 3 | `top_scorer` | `3338` (Abhishek, 74 off 28) | `3338` | ✓ | round-1012 |
| 4 | `top_wicket_taker` | `60735` (3/33) | `60735` | ✓ | round-1012 |
| 5 | `most_sixes_player` | `3338` (8 sixes, 28 balls) | `3338` | ✓ | round-1012 |
| 6 | `player_of_match` | `2813` | `2813` | ✓ | round-1079 |
| 7 | `home_team_innings_score` (PBKS) | 223 → `200+` | 223 → `200+` | ✓ | round-1012 |
| 8 | `away_team_innings_score` (SRH) | 219 → `200+` | 219 → `200+` | ✓ | round-537 |
| 9 | `home_team_powerplay_runs` (PBKS) | 93 → `60+` | 93 → `60+` | ✓ | round-736 |
| 10 | `away_team_powerplay_runs` (SRH) | 105 → `60+` | 105 → `60+` | ✓ | round-244 |
| 11 | `home_team_powerplay_wickets_lost` | 0 → `0` | 0 → `0` | ✓ | round-736 |
| 12 | `away_team_powerplay_wickets_lost` | 0 → `0` | 0 → `0` | ✓ | round-244 |
| 13 | `total_match_runs` | 442 → `400+` | 442 → `400+` | ✓ | round-1012 |
| 14 | `total_match_sixes` | 29 → `26+` | 29 → `26+` | ✓ | round-1012 |
| 15 | `total_match_wickets` | 10 → `9-12` | 10 → `9-12` | ✓ | round-1012 |
| 17 | `first_wicket_over` | 9 → `6+` (fow_balls=8.1) | 9 → `6+` | ✓ | round-291 |
| 18 | `fifty_scored` | `Yes` | `Yes` | ✓ | round-213 |
| 19 | `bowler_three_wickets` | `Yes` | `Yes` | ✓ | round-828 |
| 20 | `super_over` | `No` | `No` | ✓ | round-1012 |

(`#16 total_match_catches` is inactive per the PRD and is not seeded.)

### Headline

Ignoring the query-layer bug described in Issue 1 below, the extractor + bracket-mapping logic produces the correct final answer for every one of the 19 active scenarios on this match. **No value mismatches.**

So the real issues aren't in **what** the extractors compute — they're in **when/whether** the cron actually reaches them.

---

## 3. Issues found

### 🔴 Issue 1 (CRITICAL — production blocker): The `get_fixtures_to_poll` fallback query has its time window reversed

**File:** `supabase/supabase/functions/live-poll-resolve-fixtures/index.ts:256`

The comment on line 241 says:

> `(upcoming or live) within time window: start-1h to start+6h`

That is, "poll a fixture from 1 hour **before** its start up to 6 hours **after** its start." The correct PostgREST filter for *"match start time T lies in `[now − 6h, now + 1h]`"* is:

```
start_datetime.gte.(now − 6h)  AND  start_datetime.lte.(now + 1h)
```

The code has it **swapped**:

```ts
start_datetime.gte.${Date.now() - 60 * 60 * 1000}       // now − 1h   ❌
start_datetime.lte.${Date.now() + 6 * 60 * 60 * 1000}    // now + 6h   ❌
```

That filter demands `start_datetime ≥ now − 1h`, i.e. the match started **no more than 1 hour ago**. Any T20 more than one hour past its scheduled start is silently dropped from the `(upcoming, live)` branch. The second branch only picks the fixture up after the DB status transitions to `completed` — but the status can only transition when the fixture is polled. So once the match falls out of the 1h window, it is never re-included.

And because the migrations folder contains no `get_fixtures_to_poll` RPC (`grep -R get_fixtures_to_poll supabase/supabase/migrations` returns no matches), the fallback direct query is the one actually used in production.

**Proof against the capture for match 69534:**

- Match scheduled start: `2026-04-11 10:00:00`.
- Running a time-accurate simulation using the wall clocks in `manifest.json`: with the buggy filter, polling starts at `round-001` (`09:34:14`) and continues normally until `round-343` (wall clock `11:00:02`, exactly 1h after start). From `round-344` onward **match 69534 is not polled even once**. It never transitions to `completed` in the DB, so the second branch never catches it either.
- Scenarios that would have resolved pre-`11:00` and are therefore **safe** (5 of 19):
  - `toss_winner` (round-001)
  - `fifty_scored` (round-213, `10:27`)
  - `away_team_powerplay_runs` + `away_team_powerplay_wickets_lost` (round-244, `10:35`)
  - `first_wicket_over` (round-291, `10:46`)
- Scenarios the data would make resolvable after `11:00` and are therefore **lost** (14 of 19):
  - `away_team_innings_score` (round-537, `11:48`)
  - `home_team_powerplay_runs` + `home_team_powerplay_wickets_lost` (round-736, `12:38`)
  - `bowler_three_wickets` (round-828, `13:01`)
  - Finished-only scenarios at `round-1012` (`13:47`): `match_winner`, `top_scorer`, `top_wicket_taker`, `most_sixes_player`, `home_team_innings_score`, `total_match_runs`, `total_match_sixes`, `total_match_wickets`, `super_over`
  - `player_of_match` (round-1079, `14:03`)

This single bug would make the live-scoring feature unusable on every T20. It was not caught by my pure-extractor simulation because I bypassed the DB query filter and iterated over all rounds directly.

**Fix:**

```ts
start_datetime.gte.${new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()},
start_datetime.lte.${new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString()}
```

…or create the `get_fixtures_to_poll` RPC and make sure it uses the correct bounds.

---

### 🟠 Issue 2 (IMPORTANT): Extractors only accept `fixture.status === 'finished'`, but the status mapper accepts `'won'`, `'draw'`, `'finished'`

**Files:** `supabase/supabase/functions/_shared/sportmonks-extractors.ts` + `live-poll-resolve-fixtures/index.ts:97-99`

The internal-status mapper treats three Sportmonks statuses as "completed":

```ts
if (lower === 'finished' || lower === 'won' || lower === 'draw') {
  return 'completed';
}
```

But every "finished-only" extractor checks the raw Sportmonks field with a literal string comparison:

```ts
const status = fixture.status?.toLowerCase();
if (status !== 'finished') {
  return { resolved: false, reason: 'Match not finished yet' };
}
```

**Affected extractors** (scenarios that would stay unresolved if Sportmonks emits `"Won"` or `"Draw"` instead of `"Finished"`):

- `top_scorer`, `top_wicket_taker`, `most_sixes_player`
- `total_match_runs`, `total_match_sixes`, `total_match_wickets`
- `super_over`
- `fifty_scored` and `bowler_three_wickets` — the "No" path. (The "Yes" path resolves mid-match and is safe.)
- `home_team_innings_score` / `away_team_innings_score` — the `isFinished` fallback. This is the most dangerous one because `isInningsComplete = overs >= 20 || wickets >= 10`, and on a chase a winning team often finishes with neither condition met (PBKS in 69534 finished at 18.5 overs / 4 wickets). If Sportmonks ever emits `"Won"` instead of `"Finished"`, `home_team_innings_score` would not resolve on this match even with the query filter fixed.

For 69534 the capture always shows `"Finished"`, so this doesn't bite here. But the mapper proves someone expected to see `"Won"` / `"Draw"` in the wild. Either remove those cases from the mapper, or change the extractors to `if (status !== 'finished' && status !== 'won' && status !== 'draw')`, or (cleanest) use the already-computed `newInternalStatus === 'completed'`.

---

### 🟡 Issue 3 (correctness/precision): Powerplay snapshot is "first poll where `runs.overs >= 6`", not "score at exactly `6.0`"

**File:** `sportmonks-extractors.ts:636-691`

The powerplay extractors snapshot `runs.score` / `runs.wickets` on the first poll whose `runs.overs` value has crossed the 6.0 line (guarded by `previousMaxOvers < 6`). For 69534 this happens to be exact because both teams were observed at the clean `"6"` value in the first qualifying poll:

- **SRH** at `round-244`: `6 / 105 / 0`. Prior poll (`round-240`) was `5.5 / 104 / 0`. Snapshot 105/0 is the real end-of-PP score. ✓
- **PBKS** at `round-736`: `6 / 93 / 0`. Prior poll (`round-733`) was `5.5 / 92 / 0`. Snapshot 93/0 is real. ✓

But the logic is **lucky here**. The extractor will accept a value like `runs.overs = 6.3, score = 112, wickets = 1` if that happens to be the first poll crossing 6. The snapshot would then drift from the true end-of-6th-over figure by up to ~half an over of runs and whatever wickets fell in between. For a 15s cron and typical Sportmonks update cadence this is usually small — but it's a real accuracy risk (especially if polling drops, see Issues 1 and 5) and there is no defence against it.

The wickets half of the extractor has the same concern — if the first poll you see already shows `6.1 / score / 1`, you attribute that wicket to powerplay even though it fell on ball 1 of over 7. For 69534, PBKS's first wicket is at `fow_balls = 6.2` with `fow_score = 99`, so a single missed poll around over 6 would have flipped `home_team_powerplay_wickets_lost` from `0` to `1` — a genuine answer change crossing a bracket boundary.

**Possible tightening:** if `previousMaxOvers < 6 && runs.overs >= 6 && runs.overs < 6.1`, snapshot; otherwise synthesise from `batting.fow_balls` / `fow_score` (these record exact "score when each wicket fell" and let you reconstruct the end-of-6th-over score authoritatively).

---

### 🟡 Issue 4 (design but surprising): `upsertLiveScorecard` stops running once DB status flips to `completed`

**File:** `live-poll-resolve-fixtures/index.ts:432-438`

```ts
const effectiveStatus = newInternalStatus === 'live' || currentDbStatus === 'live'
  ? 'live'
  : newInternalStatus;

if (effectiveStatus === 'live') {
  await upsertLiveScorecard(...);
}
```

At the very first "Finished" poll (`round-1012`) `currentDbStatus` is still `'live'` in memory, so the scorecard is updated one last time. Every poll after that has `currentDbStatus === 'completed'`, so `v2_fixture_live_scores` is no longer refreshed — even though the cron is still running for up to 120 minutes waiting on POTM. Any UI that reads the live scorecard row post-match sees a snapshot taken at ~the moment of "Finished" and nothing more. This may be intentional, but it also means `last_polled_at` is no longer being bumped during the 17-minute wait for MoM, and any downstream "is the live score stale?" heuristic will read false negatives.

---

### 🟡 Issue 5 (resilience): Non-monotonic `runs.overs` observed twice in this capture

Scanning all 1,131 rounds for 69534:

- `round-169 → round-170`: SRH `2.4 → 2.3` (score `31 → 32`)
- `round-457 → round-458`: SRH `16.4 → 16.3` (score `193 → 194`)

The extractor handles this correctly via the `max-overs-seen` tracking — a lower value will never overwrite the persisted max, and the powerplay guard (`previousMaxOvers >= 6`) prevents double-firing. So this is **not a live bug**; it's confirmation that the defensive design in the PRD (§ scenario 9) is needed and works. Worth a regression test to lock this in.

---

### 🟡 Issue 6 (data-dependent correctness): `top_scorer` / `most_sixes_player` have inconsistent aggregation semantics

For `top_scorer` the code does a single-pass max by `(score, −ball)` over `fixture.batting`. It does **not** aggregate rows per `player_id`. In a normal T20 a player has at most one batting row, so this is fine — and for 69534 it's fine. But in a **super over** (or any future format that lets a batter bat twice), "highest individual entry" and "highest total" are different questions, and the PRD text ("Top run scorer of the match") suggests the intent is the latter.

Contrast with `most_sixes_player`, which **does** aggregate per `player_id` via a `Map`, and whose code comment explicitly mentions "handles super over edge case."

Either both should aggregate or neither — the current split is an inconsistency waiting to bite the moment a super over happens.

---

## 4. Multi-match concurrency (fixture 69535 appears from `round-1004`)

**Question asked:** Does the edge function get confused when two fixtures overlap?

Inside `pollAndResolve`:

- `fixtures` is an array from the DB query.
- Fixtures are processed **sequentially**: `for (const dbFixture of fixtures) { await processFixture(...) }`. Each iteration is wrapped in its own `try`/`catch`, so one failure does not poison others.
- Inside `processFixture`:
  - `sportmonksClient.getFixture(fixtureApiId, …)` is scoped to that specific fixture API ID.
  - Every DB read/write uses `.eq('fixture_id', dbFixture.id)` or `.eq('id', dbFixture.id)`.
  - The `v2_fixture_live_scores` row is per-fixture (PK = `fixture_id`); `home_team_max_overs_seen` / `away_team_max_overs_seen` are per row; the extractor takes its `previousMaxOvers` from that specific row. No shared in-memory state between fixtures.
  - `IdMapper` is the only object shared across fixtures in a run, and it caches **global** team and player ID mappings (`api_id → UUID`) that are not fixture-dependent. Safe to share; if anything, the sharing reduces duplicate DB lookups.
  - `resolvedValues` (the per-slug cache used to avoid recomputing the same scenario for multiple gangs) is declared **inside** `processFixture`, so it's per-fixture. No leakage.

### Verdict on data confusion

**There is no cross-fixture contamination bug.** If fixture `69534` (teams 4 vs 9) and fixture `69535` (teams 2 vs 3) are both returned by the poll query, each is fetched, extracted, and written under its own fixture ID. Team filters inside `getRunsForTeam` pick the right team from *that fixture's* `runs` array. Walking through `69535`'s appearance from `round-1004` through `round-1131` confirms the two fixtures have disjoint `team_id` sets in their `runs` arrays — no way for `69535`'s data to leak into `69534`'s max-overs tracker.

### Real concurrency concerns (not logic bugs, but still operational risks)

1. **Sequential processing + 15s cadence.** Each fixture is one Sportmonks fetch and a handful of DB round-trips (status read, live-scores read, unresolved-scenario fetch, N `resolve_scenario` RPCs, optional `all_scenarios_resolved` + `mark_fixture_resolved`, notifications). On a fast day, ~1-2s per fixture. With 2 concurrent matches, fine; with 4 simultaneous fixtures you're in the 5-8s range with little headroom; with 8+ you will blow the 15s window and pg_cron will either queue or skip the next invocation depending on its config. There's no parallelism, no per-fixture timeout, no soft budget. For the solo-on-call launch day this is the biggest operational risk after Issue 1.

2. **No cron-overlap lock.** If pg_cron ever fires a second instance while the first is still running (e.g., because the first got stuck on a slow Sportmonks call), the two instances can race on the same `v2_fixture_live_scores` row. Most writes are upserts so they won't error, but they can produce non-deterministic `home_team_max_overs_seen` values — which could in turn cause a duplicated or missed powerplay snapshot. Recommendation: wrap `pollAndResolve` with `pg_try_advisory_xact_lock(hashtext('live-poll-resolve-fixtures'))` to serialize invocations.

3. **Powerplay precision (Issue 3) gets worse under load.** If the edge function is processing 6 fixtures and each poll is 2s apart, you might observe team X at `5.8` in one cycle and `6.4` in the next. The extractor fires on `6.4`, snapshots that score, and silently misses the true end-of-6th figure.

4. **Sportmonks rate limiting.** Each fixture is 1 call per 15s = 4/min. The shared client has no token-bucket or cross-fixture fairness — it just retries on 500s. If rate-limited (429), `getFixture` returns early and `processFixture` aborts for that fixture this cycle. In isolation that's fine; across a 4-fixture day it means you can lose a whole polling cycle for your scenarios.

---

## 5. Suggested fix priority

1. **Fix the query filter in `index.ts:256`** (or create `get_fixtures_to_poll` with correct bounds). Without this, nothing else matters — the cron will abandon every match 1 hour after its scheduled start.
2. **Align the extractor status check with the status mapper** (`'finished' | 'won' | 'draw'` → "completed enough to resolve"). Either delete the extra mapper cases or accept them in the extractors.
3. **Add a `pg_try_advisory_xact_lock`** at the top of `pollAndResolve` to serialize cron invocations.
4. **Tighten the powerplay extractor**: require `6.0 <= runs.overs < 6.1` (or reconstruct from `fow_balls`/`fow_score`) to avoid drift when a poll lands mid-over-7.
5. **Decide explicitly whether `top_scorer` aggregates across innings** (super-over correctness) and bring it in line with `most_sixes_player`.
6. **Add a regression test** using the `round-169 → round-170` non-monotonic sample to lock in the max-overs defence.

---

## Appendix A — Key round timestamps (from `manifest.json`)

| Round | Wall clock | Event |
|---|---|---|
| 1 | 09:34:14 | First poll, match in `NS`; toss already populated |
| 107 | 10:00:45 | Status → `1st Innings` |
| 213 | 10:27:15 | Abhishek's fifty → `fifty_scored = Yes` |
| 244 | 10:35:00 | SRH first crosses 6.0 overs → `away_team_powerplay_*` snapshot |
| 291 | 10:46:46 | First wicket appears in batting data → `first_wicket_over` |
| 343 | 11:00:02 | **Exactly 1h past match start — buggy filter stops polling here** |
| 537 | 11:48:17 | SRH reaches 20.0 overs → `away_team_innings_score` resolvable |
| 602 | 12:04:33 | Status → `2nd Innings` |
| 736 | 12:38:06 | PBKS first crosses 6.0 overs → `home_team_powerplay_*` snapshot |
| 828 | 13:01:07 | Bowler 60735 takes 3rd wicket → `bowler_three_wickets = Yes` |
| 1004 | ~13:33 | Fixture `69535` starts appearing in capture (`NS`) |
| 1012 | 13:47:07 | Status → `Finished`; `winner_team_id = 4`; 8 finished-only scenarios resolvable |
| 1079 | 14:03:53 | `man_of_match_id = 2813` appears → `player_of_match` |
| 1131 | 14:16:54 | Capture ends |

---

## Appendix B — Raw data truth (final snapshot of `fixture-69534.json` at round-1131)

```
toss_winner             : team 4  (PBKS)
match_winner            : team 4  (PBKS)
player_of_match         : player 2813
super_over              : false
top_scorer              : player 3338  (74 off 28)
top_wicket_taker        : player 60735 (3w / 33r)
most_sixes_player       : player 3338  (8 sixes, 28 balls)
home_innings (PBKS)     : 223 (18.5 ov, 4w)  → 200+
away_innings (SRH)      : 219 (20   ov, 6w)  → 200+
home_powerplay          : 93/0 at 6.0 ov     → 60+ / 0
away_powerplay          : 105/0 at 6.0 ov    → 60+ / 0
total_match_runs        : 442                → 400+
total_match_sixes       : 29                 → 26+
total_match_wickets     : 10                 → 9-12
first_wicket_over       : fow_balls 8.1 → over 9 → 6+
fifty_scored            : Yes
bowler_three_wickets    : Yes
```
