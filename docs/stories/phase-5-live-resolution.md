# Phase 5 — Live Resolution

**Goal:** The unified live polling cron runs every 15 seconds during live matches and post-match, updates live scorecards, captures powerplay snapshots, progressively resolves scenarios as the match unfolds, and triggers standings recalculation. The Gang Page shows live scorecards for live matches and recent results for completed matches.

**Exit criteria:**
- `live-poll-resolve-fixtures` cron deployed and running every 15 seconds
- All 19 active scenarios resolve correctly from Sportmonks data during live matches
- Abandoned/no_result matches void scenarios correctly
- Post-match polling continues until all scenarios resolve (up to 120 min cutoff)
- Gang Page Live Matches section shows live scorecard with all fields from PRD
- Gang Page Recent Results section shows completed matches with user's prediction summary
- Standings tables populate correctly via triggers

---

## LIVE-LIB-001: Sportmonks response parser + scenario extractors

**Phase:** Phase 5 — Live Resolution
**Priority:** P0
**Estimated effort:** Large (2–3 days)
**Status:** Not started

**User story:**
> As the developer,
> I want a module that parses Sportmonks fixture responses and extracts each scenario's resolved value,
> So that the live-poll cron has a clear, testable function per scenario type.

**Context / Why:**
The scenario resolution logic is complex (20 scenarios, different data shapes). Putting all extraction logic in one module — with one function per scenario — makes the cron simple and the logic unit-testable.

**Acceptance criteria:**
- [ ] Module: `supabase-2/functions/_shared/sportmonks-extractors.ts`
- [ ] Type: `type ExtractResult = { resolved: true; value: string } | { resolved: false; reason?: string }`
- [ ] One exported function per scenario slug:
  - `extractTossWinner(fixture)` — returns winning team UUID from `toss_won_team_id`
  - `extractMatchWinner(fixture)` — returns `winner_team_id`
  - `extractTopScorer(fixture)` — max `score` from batting include; tiebreaker: fewer balls
  - `extractTopWicketTaker(fixture)` — max `wickets` from bowling; tiebreaker: fewer runs conceded
  - `extractMostSixesPlayer(fixture)` — sum `six_x` per player, max
  - `extractPlayerOfMatch(fixture)` — `man_of_match_id` (may be null initially)
  - `extractHomeTeamInningsScore(fixture)` — runs entry where `team_id = localteam_id`
  - `extractAwayTeamInningsScore(fixture)` — runs entry where `team_id = visitorteam_id`
  - `extractHomeTeamPowerplayRuns(fixture, previousMaxOvers)` — live capture when home's max overs first crosses 6.0
  - `extractAwayTeamPowerplayRuns(fixture, previousMaxOvers)` — same for away
  - `extractHomeTeamPowerplayWickets(fixture, previousMaxOvers)` — wickets at same snapshot
  - `extractAwayTeamPowerplayWickets(fixture, previousMaxOvers)` — same
  - `extractTotalMatchRuns(fixture)` — sum of `score` across both innings
  - `extractTotalMatchSixes(fixture)` — sum of `six_x` across all batting
  - `extractTotalMatchWickets(fixture)` — sum of wickets from runs include
  - `extractFirstWicketOver(fixture)` — min `fow_balls` in first innings, converted via `floor(fow_balls) + 1`
  - `extractFiftyScored(fixture)` — any batting `score >= 50`
  - `extractBowlerThreeWickets(fixture)` — any bowling `wickets >= 3`
  - `extractSuperOver(fixture)` — `super_over` boolean field
  - `extractLiveScorecard(fixture)` — extracts all fields needed for `v2_fixture_live_scores` (scores, overs, batting team, run rate, last 6 balls, batsmen, bowler, partnership)
- [ ] Bracket mapping utility: `mapToBracket(value: number, options: string[]): string | null` — maps a raw numeric value to the matching bracket string from the scenario options (e.g., 185 → `"180-199"`)
- [ ] Player ID resolution: extractors return Sportmonks `player_id` (integer); caller maps to internal `v2_players.id` UUID via `api_id`
- [ ] Team ID resolution: same pattern — return Sportmonks team ID, caller maps to `v2_league_teams.id`
- [ ] All extractors handle missing/null data gracefully (return `{ resolved: false }`)
- [ ] First wicket over: bracket mapping per PRD scenario options (`1, 2, 3, 4-5, 6+`)

**Out of scope:**
- DB writes (the cron handles those)
- `total_match_catches` — INACTIVE per PRD

**Dependencies:** SYNC-LIB-001
**Blocks:** LIVE-CRON-001

**PRD references:**
- [Scenario Resolution Mapping (Sportmonks API)](../PRD.V2.md#scenario-resolution-mapping-sportmonks-api)
- [System Scenario Definitions](../PRD.V2.md#system-scenario-definitions-20-scenarios-total-19-active--1-inactive-max-210-active-points-220-including-inactive)
- `docs/PRD.V2-scenario-resolution-report.md` — detailed findings from real live data

**Technical notes:**
- Powerplay extractors need the previous `max_overs` value (passed in from the DB — cron reads existing `v2_fixture_live_scores` or a tracking column and passes in)
- Live scorecard extraction must include "on-strike" indicator (per PRD Live Matches section)
- Follow recommendations from the scenario resolution report for edge cases
- Use TypeScript exhaustiveness check on a scenario-slug union to ensure every scenario has an extractor

**Analytics events:** None (pure functions)

**Unit tests:**
- [ ] Each extractor has unit tests using sample Sportmonks responses from `api-tester/responses/sportsmonk/`
- [ ] `extractTopScorer` — tied scores → tiebreaker resolves correctly
- [ ] `extractHomeTeamInningsScore` — home team bats second → filters by team_id not inning number
- [ ] `extractPlayerOfMatch` — null field → returns `{ resolved: false }`
- [ ] `extractHomeTeamPowerplayRuns` — overs below 6 → returns not resolved; overs first crosses 6 → returns resolved with score
- [ ] `extractFirstWicketOver` — `fow_balls = 6.2` → maps to `"6+"` bracket
- [ ] `mapToBracket` — boundary values (exact bracket edges) handled correctly

**Test plan:**
- [ ] Run all extractors against the captured live data from `live-data/` folder
- [ ] Verify all scenarios for the GT vs RR match resolve to the expected values from the resolution report

**Open questions:** None

---

## LIVE-DB-001: Scenario resolution Postgres functions

**Phase:** Phase 5 — Live Resolution
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As the developer,
> I want Postgres functions that mark a scenario as resolved, update all predictions for that scenario, and void all scenarios for an abandoned fixture,
> So that the live-poll cron just calls these functions without embedding SQL.

**Context / Why:**
Centralizing scoring logic in Postgres ensures atomicity and consistency, and makes it easy to trigger standings recalculation via existing triggers.

**Acceptance criteria:**
- [ ] Migration file: `supabase-2/migrations/010_scenario_resolution_functions.sql`
- [ ] Function: `resolve_scenario(p_scenario_id UUID, p_correct_answer TEXT) RETURNS VOID`
  - Sets `v2_fixture_scenarios.correct_answer = p_correct_answer`, `is_resolved = true`
  - Updates all `v2_predictions` for this scenario: `is_correct = (value = p_correct_answer)`, `points_earned = is_correct ? scenario.points : 0`
  - Atomic; errors bubble up
  - Standings triggers (from FND-DB-004) fire automatically after this update
  - **For range scenarios**: the caller (LIVE-CRON-001) is responsible for converting the raw numeric value (e.g., `185`) to the matching bracket string (e.g., `"180-199"`) BEFORE passing it as `p_correct_answer`. This function always compares `value = p_correct_answer` as strings. The raw numeric value is separately stored in `v2_fixture_results` for reference.
- [ ] Function: `void_fixture_scenarios(p_fixture_id UUID) RETURNS VOID`
  - Sets `is_voided = true` on all `v2_fixture_scenarios` for the fixture (across all gangs)
  - Standings triggers fire and exclude voided scenarios from aggregations
  - Creates `v2_fixture_results` row with `resolved_at = now()`, `match_winner_id = null` (per PRD)
- [ ] Function: `mark_fixture_resolved(p_fixture_id UUID) RETURNS VOID`
  - Called when all scenarios for a fixture are resolved
  - Sets `v2_league_season_fixtures.status = 'resolved'`
  - Sets `v2_fixture_results.resolved_at = now()` (if row exists, else creates it)
- [ ] Helper: `all_scenarios_resolved(p_fixture_id UUID) RETURNS BOOLEAN`
  - Returns true if all active (non-voided) scenarios for the fixture have `is_resolved = true`
- [ ] All marked `SECURITY DEFINER`

**Out of scope:**
- The cron that calls these (LIVE-CRON-001)

**Dependencies:** FND-DB-001 through FND-DB-004
**Blocks:** LIVE-CRON-001

**PRD references:**
- [Predictions § Scoring](../PRD.V2.md#predictions)
- [Matches § Result resolution](../PRD.V2.md#matches)
- [update-standings trigger](../PRD.V2.md#update-standings--standings-recalculation-db-trigger-not-cron)

**Technical notes:**
- Use `UPDATE v2_predictions SET is_correct = (value = $1), points_earned = CASE WHEN value = $1 THEN s.points ELSE 0 END FROM v2_fixture_scenarios s WHERE v2_predictions.scenario_id = s.id AND s.id = $scenario_id`
- The standings recalc triggers will fire per PRD
- Voiding: if `v2_fixture_results` already exists, just update `resolved_at`

**Analytics events:** None (DB functions)

**Unit tests:**
- [ ] `resolve_scenario` updates predictions correctly (correct = true if match, else false)
- [ ] Points awarded only for correct predictions
- [ ] `void_fixture_scenarios` sets is_voided = true on all scenarios
- [ ] `all_scenarios_resolved` returns correct boolean
- [ ] `mark_fixture_resolved` sets status to resolved

**Test plan:**
- [ ] Create test scenarios and predictions, call `resolve_scenario`, verify row updates
- [ ] Void a fixture, verify standings exclude voided scenarios

**Open questions:** None

---

## LIVE-CRON-001: live-poll-resolve-fixtures edge function

**Phase:** Phase 5 — Live Resolution
**Priority:** P0
**Estimated effort:** Large (3–5 days)
**Status:** Not started

**User story:**
> As the developer,
> I want a unified edge function that polls live/completed fixtures every 15 seconds, updates scorecards, captures powerplay snapshots, and progressively resolves scenarios,
> So that users see real-time match progress and predictions get scored as the match unfolds.

**Context / Why:**
The core data processing engine for match days. This is the single most complex cron function. Uses Sportmonks client (SYNC-LIB-001), extractors (LIVE-LIB-001), and resolution functions (LIVE-DB-001).

**Acceptance criteria:**
- [ ] Edge function: `supabase-2/functions/live-poll-resolve-fixtures/index.ts`
- [ ] Scheduled via `pg_cron` with interval `'15 seconds'` — triggers via `pg_net` calling the function
- [ ] Steps per run:
  1. Query fixtures to poll:
     ```
     SELECT * FROM v2_league_season_fixtures
     WHERE (status IN ('upcoming', 'live')
            AND (start_datetime - INTERVAL '1 hour' <= now())
            AND (start_datetime + INTERVAL '6 hours' > now()))
        OR (status = 'completed'
            AND now() - status_changed_at < INTERVAL '120 minutes')
     ```
  2. For each fixture, call `getFixture(api_id, ['batting', 'bowling', 'runs', 'manofmatch', 'tosswon', 'localteam', 'visitorteam'])` from Sportmonks client
  3. Skip fixtures with API errors (log and continue)
  4. Status transition detection:
     - Sportmonks status maps to internal status:
       - `NS` + live data present → remain `upcoming` (don't transition until we see in-progress)
       - `1st Innings`, `2nd Innings` etc. → transition `upcoming` → `live`
       - `Finished` → transition `live` → `completed` (sets `status_changed_at` via trigger)
       - `Aborted`, `Cancelled` → `abandoned`
       - `No Result` → `no_result`
     - On abandonment/no_result → call `void_fixture_scenarios(fixture_id)`
  5. Live scorecard update (only for `live` fixtures):
     - Extract live fields via `extractLiveScorecard(fixture)`
     - Upsert into `v2_fixture_live_scores` (one row per fixture)
     - Set `last_polled_at = now()`
  6. Powerplay capture:
     - Track `max(overs)` per team per fixture (store in `v2_fixture_results` row or a tracking column)
     - When home team's max first crosses 6.0 → call `extractHomeTeamPowerplayRuns`, `extractHomeTeamPowerplayWickets`, write to `v2_fixture_results`, then resolve the corresponding scenarios
     - Same for away team
  7. Progressive scenario resolution:
     - For each scenario for this fixture that's `is_resolved = false` (already-resolved scenarios are never re-resolved, even if match re-enters a comparable state like a super over):
       - Call the matching extractor based on slug
       - If `resolved: true`:
         - Map player/team API IDs to internal UUIDs where applicable
         - For range scenarios: map raw numeric value to matching bracket string (via `mapToBracket`) before passing to `resolve_scenario`
         - Call `resolve_scenario(scenario_id, correct_answer)` Postgres function
       - If `resolved: false` → skip
  8. After all scenario updates for a fixture, check `all_scenarios_resolved(fixture_id)`:
     - If true → call `mark_fixture_resolved(fixture_id)` (transitions status to `resolved`, stops polling)
     - Create `results_available` notification for all approved members of every gang with predictions on this fixture (use unique index for dedup)
  9. 120-minute cutoff:
     - If fixture has been in `completed` status for 120+ minutes and still has unresolved scenarios → stop polling that fixture, log a "needs admin attention" alert (create notification or log)
- [ ] Max overs tracking: store in `v2_fixture_live_scores.home_team_max_overs_seen` and `away_team_max_overs_seen` columns (new columns — add migration)
- [ ] Write operations use service role client
- [ ] Error handling: per-fixture try/catch; one failure doesn't stop other fixtures
- [ ] Alert admin after 10 consecutive runs fail entirely
- [ ] Function timeout: 60 seconds (must complete within interval)

**Out of scope:**
- Standings recalculation (automatic via triggers)
- Notification UI (Phase 7)

**Dependencies:** SYNC-LIB-001, LIVE-LIB-001, LIVE-DB-001, FND-DB-004 (triggers)
**Blocks:** LIVE-UI-001 (live scorecard component)

**PRD references:**
- [live-poll-resolve-fixtures](../PRD.V2.md#live-poll-resolve-fixtures--unified-live-polling-and-scenario-resolution)
- [Matches § Result resolution](../PRD.V2.md#matches)
- [Scoring & Leaderboards](../PRD.V2.md#scoring--leaderboards)
- `docs/PRD.V2-scenario-resolution-report.md` — real data findings

**Technical notes:**
- Max overs tracking: uses `home_team_max_overs_seen` and `away_team_max_overs_seen` columns on `v2_fixture_live_scores` (created in FND-DB-001); reads current max, compares with incoming overs, only updates if higher; captures powerplay snapshot when max first crosses 6.0
- `pg_cron` interval: `SELECT cron.schedule('live-poll', '15 seconds', $$SELECT net.http_post(url:='...')$$)`
- Sportmonks API rate limit: monitor — 1 call per fixture per 15s. For 1 live match = 240 calls/hour. Within plan quota.
- `results_available` notification: use `ON CONFLICT DO NOTHING` with the unique index
- Player mapping: `SELECT id FROM v2_players WHERE api_id = $1` (cached per function run)
- Team mapping: same pattern

**Analytics events:**
- `CRON_LIVE_POLL_STARTED`
- `CRON_LIVE_POLL_COMPLETED` — `{ fixtures_polled, scenarios_resolved, errors_count, duration_ms }`
- `CRON_LIVE_POLL_FAILED` — `{ error, fixture_id? }`
- `SCENARIO_RESOLVED` — `{ fixture_id, scenario_slug, gang_id }` (per resolution, maybe too noisy — consider aggregating)

**Unit tests:**
- [ ] Fixture query filter correct (status + time window)
- [ ] Status transition: upcoming → live
- [ ] Status transition: live → completed (status_changed_at updated via trigger)
- [ ] Abandoned: `void_fixture_scenarios` called
- [ ] Powerplay capture: max overs crosses 6 → scenarios resolved
- [ ] Progressive scenario resolution: each extractor called, DB updated
- [ ] All scenarios resolved → fixture status → `resolved`
- [ ] `results_available` notification dedup works
- [ ] 120-min cutoff reached → polling stops
- [ ] Per-fixture error doesn't kill the run

**Test plan:**
- [ ] Deploy to STG, manually trigger
- [ ] Test using the captured live data (mock Sportmonks responses using files from `api-tester/responses/sportsmonk/live-data/`)
- [ ] Verify scenarios resolve progressively across multiple runs
- [ ] Verify all scenarios from the GT vs RR test match resolve correctly

**Open questions:** None (decided: log, skip, retry next cycle — acceptable for 15s poll interval)

---

## LIVE-UI-001: Live Scorecard component

**Phase:** Phase 5 — Live Resolution
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As a gang member,
> I want to see live match scores and details as the match unfolds,
> So that I can watch the match inside the app.

**Context / Why:**
Shared component used on Gang Page and Match Leaderboard Page. Auto-polls `v2_fixture_live_scores` via Supabase client.

**Acceptance criteria:**
- [ ] Component: `src/components/matches/live-scorecard.tsx` (client component)
- [ ] Props: `fixtureId, initialScoreData, homeTeam, awayTeam`
- [ ] Polls `v2_fixture_live_scores` every 15 seconds via `setInterval` + Supabase client
- [ ] Displays (per PRD Gang Page Live Matches):
  - Home team score + overs (`185/4 (18.3)`)
  - Away team score + overs
  - Currently batting team indicator
  - Current run rate
  - Last 6 balls breakdown (`1 4 W 0 6 2`)
  - Both batsmen with individual scores, on-strike batsman indicated (dot or asterisk)
  - Current bowler
  - Current partnership
- [ ] "Stale data" indicator if `last_polled_at` is more than 1 minute old
- [ ] Predictions locked indicator (small text "Predictions locked")
- [ ] "Live" badge with pulsing animation
- [ ] Accessible
- [ ] Mobile-responsive — all fields visible without horizontal scroll

**Out of scope:**
- Polling logic (handled internally)
- Edge function that writes scores (LIVE-CRON-001)

**Dependencies:** LIVE-CRON-001, FND-006, FND-004
**Blocks:** LIVE-UI-002

**PRD references:**
- [Gang Page § Live Matches](../PRD.V2.md#gang-page-groupgroupid)
- [Match Leaderboard Page](../PRD.V2.md#match-leaderboard-page-groupgroupidmatchmatchid)

**Technical notes:**
- Use Supabase client `from('v2_fixture_live_scores').select('*').eq('fixture_id', fixtureId).single()`
- Poll via `setInterval(fetchLive, 15000)`; clear on unmount
- Compute "stale" as `now() - last_polled_at > 60_000`
- Last 6 balls: display as pill-shaped spans with color based on content (W = red, 4/6 = green, etc.)
- On-strike batsman: leading dot or asterisk before name

**Analytics events:** None (passive view; autocapture)

**Unit tests:**
- [ ] Renders all fields from initialScoreData
- [ ] Polls on mount
- [ ] Stale indicator appears when last_polled_at is old
- [ ] Stops polling on unmount

**Test plan:**
- [ ] Open the component during a real live match (or simulated data)
- [ ] Verify updates every 15s
- [ ] Kill the cron temporarily, verify stale indicator appears after 1 min

**Open questions:** None

---

## LIVE-UI-002: Gang Page Live Matches section

**Phase:** Phase 5 — Live Resolution
**Priority:** P0
**Estimated effort:** Small (3–5 hours)
**Status:** Not started

**User story:**
> As a gang member,
> I want to see a live scorecard on my gang page when a match is in progress,
> So that I can watch the match without leaving the gang context.

**Context / Why:**
Replaces the placeholder from GANG-UI-005. Uses the Live Scorecard component.

**Acceptance criteria:**
- [ ] Component: `src/components/matches/live-matches-section.tsx` (server component)
- [ ] Props: `gangId`
- [ ] Fetches live fixtures via DAL: all fixtures where `status = 'live'` AND gang is enrolled in the season
- [ ] For each live fixture:
  - Renders Live Scorecard (LIVE-UI-001)
  - CTA button: "View Match Leaderboard" → links to `/group/{gangId}/match/{fixtureId}` (built in Phase 6)
- [ ] If no live fixtures → section hidden entirely
- [ ] Gang Page (GANG-UI-005) is updated to include this component, replacing the placeholder

**Out of scope:**
- Live scorecard component (LIVE-UI-001)
- Match leaderboard page (Phase 6)

**Dependencies:** LIVE-UI-001, GANG-UI-005
**Blocks:** None

**PRD references:**
- [Gang Page § Live Matches](../PRD.V2.md#gang-page-groupgroupid)

**Technical notes:**
- DAL: add `getLiveFixturesForGang(gangId)` to `src/lib/dal/matches.ts`
- This component is conditionally rendered on the Gang Page

**Analytics events:** None

**Unit tests:**
- [ ] Renders with live fixtures
- [ ] Hidden when no live fixtures
- [ ] Multiple live fixtures render correctly (doubleheader)

**Test plan:**
- [ ] Simulate a live fixture, visit gang page, verify scorecard shown
- [ ] End the match, verify scorecard removed and match moves to Recent Results

**Open questions:** None

---

## LIVE-UI-003: Gang Page Recent Results section

**Phase:** Phase 5 — Live Resolution
**Priority:** P0
**Estimated effort:** Medium (4–6 hours)
**Status:** Not started

**User story:**
> As a gang member,
> I want to see the last 3 completed matches with my prediction summary,
> So that I can see how I did recently.

**Context / Why:**
Per PRD, the Gang Page shows the last 3 matches with `status IN ('completed', 'resolved', 'abandoned', 'no_result')`. Each card shows the user's prediction summary (predicted count, correct count, points earned).

**Acceptance criteria:**
- [ ] Component: `src/components/matches/recent-results-section.tsx` (server component)
- [ ] Props: `gangId, userId`
- [ ] Fetches via DAL `getRecentResultsForGang(gangId, userId, limit=3)`:
  - JOIN `v2_league_season_fixtures` (status filter) + `v2_fixture_results` + `v2_gang_fixture_standings` (for user's row)
  - Ordered by `start_datetime DESC`
- [ ] For each result, renders a card:
  - Teams (home vs away) with short codes
  - Match number, date
  - Match result summary (winner + margin if status = `resolved`)
  - User's prediction summary: `{predicted_count}/{total_scenarios} picked, {correct_count} correct, {points_earned} pts`
  - For `completed` (not yet fully resolved): "Results pending..." state
  - For `abandoned`/`no_result`: "Match voided — no points" state
  - Card links to `/group/{gangId}/match/{fixtureId}` (Match Leaderboard page, built in Phase 6)
- [ ] If no results → section hidden or shows "No matches yet" in a friendly way
- [ ] Gang Page (GANG-UI-005) updated to include this component

**Out of scope:**
- Match Leaderboard page (Phase 6)
- Standings data (populated by triggers automatically after resolution)

**Dependencies:** LIVE-CRON-001 (populates results), FND-DB-004 (triggers populate standings), GANG-UI-005
**Blocks:** None

**PRD references:**
- [Gang Page § Recent Results](../PRD.V2.md#gang-page-groupgroupid)

**Technical notes:**
- DAL query: join `v2_league_season_fixtures` with `v2_fixture_results` LEFT JOIN `v2_gang_fixture_standings` (where user_id = current user)
- For not-resolved matches, `v2_fixture_results` might not exist yet; handle null
- Bracket matching: user's predictions are scored against bracket strings from templates (already handled by `resolve_scenario` function)

**Analytics events:** None (clicks tracked by autocapture)

**Unit tests:**
- [ ] Renders last 3 completed/resolved matches
- [ ] Shows user's prediction summary
- [ ] Handles "results pending" state for `completed` fixtures
- [ ] Shows "voided" state for abandoned matches
- [ ] Hidden when no results

**Test plan:**
- [ ] Simulate a completed match, verify card appears
- [ ] Resolve all scenarios, verify card updates with points
- [ ] Abandon a match, verify voided state

**Open questions:** None

---

## Summary

Phase 5 delivers the core live experience: real-time scores, progressive scenario resolution, and recent results with user performance. This is the heart of the app during match days.

**Story count:** 6 stories (1 library, 1 DB functions, 1 cron, 3 UI)
**Estimated total effort:** ~12–18 working days

**Ship readiness:**
- ✅ Live scorecards update every 15 seconds
- ✅ Scenarios resolve during and after matches
- ✅ Powerplay scenarios captured mid-match
- ✅ Abandoned matches void scenarios
- ✅ Recent Results on Gang Page
- ⏳ Full Match Leaderboard page in Phase 6
- ⏳ Season standings page in Phase 6
- ⏳ Notifications UI in Phase 7
