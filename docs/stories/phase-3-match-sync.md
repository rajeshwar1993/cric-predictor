# Phase 3 — Match Sync

**Goal:** Sportmonks fixtures and players are automatically imported into the v2 schema via cron jobs. Scenario templates are seeded per gang per upcoming fixture. The Gang Page Upcoming Matches section shows real data.

**Exit criteria:**
- Daily cron imports all IPL 2026 fixtures and team squads from Sportmonks
- Pre-match cron catches last-minute fixture time changes
- Seed-scenarios cron creates gang-specific scenario rows before the prediction window opens
- Gang Page shows the next 3 upcoming matches with teams, date, time, venue, and a "Make Your Calls" CTA
- All API calls have retry + error handling per PRD

---

## SYNC-LIB-001: Sportmonks API client

**Phase:** Phase 3 — Match Sync
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As the developer,
> I want a typed, reusable Sportmonks API client in a shared library,
> So that all cron functions and server actions can call Sportmonks consistently with proper error handling.

**Context / Why:**
Hardcoding Sportmonks endpoints and field names in every cron function creates maintenance pain. A single client module abstracts the API, handles retries, rate limits, and typed responses.

**Acceptance criteria:**
- [ ] Module: `supabase-2/functions/_shared/sportmonks.ts` (shared between edge functions)
- [ ] Also accessible to server actions if needed: optionally re-exported in `web-app-2/src/lib/sportmonks/client.ts`
- [ ] Environment config: `SPORTMONKS_API_TOKEN`, `SPORTMONKS_BASE_URL` (default `https://cricket.sportmonks.com/api/v2.0`)
- [ ] Typed response interfaces for all endpoints used (generated from sample responses in `api-tester/responses/sportsmonk/`)
- [ ] Methods (all async, all return `{ success: true, data } | { success: false, error }`):
  - `getLeagueSeasons(leagueId)` — returns seasons for a league
  - `getCurrentSeason(leagueId)` — returns current active season
  - `getTeamsInLeague(leagueId)` — returns league teams
  - `getTeamSquad(teamId, seasonId)` — returns player squad for a team in a season
  - `getSeasonFixtures(seasonId, includes?: string[])` — returns fixtures with optional includes
  - `getFixture(fixtureId, includes?: string[])` — returns single fixture
  - `getLiveScores(includes?: string[])` — returns all current live fixtures (fallback; fixture endpoint is preferred per PRD)
- [ ] Common includes pre-baked: `'batting,bowling,runs,manofmatch,tosswon,localteam,visitorteam'`
- [ ] Retry logic: 2 retries with 1s exponential backoff on network errors and 5xx responses
- [ ] Rate limit handling: on HTTP 429, do NOT retry — return structured error with `rateLimited: true` flag
- [ ] Response validation: use Zod or manual checks — if the shape doesn't match expected schema, log error + return failure
- [ ] Adds request-level logging with timing info
- [ ] Never logs the API token

**Out of scope:**
- Specific data persistence (done per cron story)
- Mock mode (optional; can be added later for local dev)

**Dependencies:** FND-003 (Supabase structure)
**Blocks:** SYNC-CRON-001, SYNC-CRON-002

**PRD references:**
- [Tech Stack § Cricket Data](../PRD.V2.md#tech-stack)
- [Error Handling & Retries § Sportmonks rate limit](../PRD.V2.md#error-handling--retries)
- [Scenario Resolution Mapping (Sportmonks API)](../PRD.V2.md#scenario-resolution-mapping-sportmonks-api)

**Technical notes:**
- Use `fetch` (available in Deno edge function runtime)
- Include URL: `${baseUrl}/${endpoint}?api_token=${token}&include=...`
- Do NOT embed the token in error messages that might be logged
- Shared constants for endpoint paths
- TypeScript types based on real response samples in `api-tester/responses/sportsmonk/general-calls/`

**Analytics events:**
- `SPORTMONKS_API_CALL` — `{ endpoint, duration_ms, success, status_code }` (fired from server, PostHog server SDK)
- `SPORTMONKS_RATE_LIMITED` — `{ endpoint }` (on 429)

**Unit tests:**
- [ ] Each method makes correct HTTP request (use fetch mock)
- [ ] Retry logic: 1st call fails with 500 → retry → success
- [ ] Rate limit: 429 response → no retry, returns rateLimited error
- [ ] Response validation: malformed JSON → returns failure
- [ ] Type safety: responses match declared interfaces

**Test plan:**
- [ ] Deploy to STG, call each method against live Sportmonks, verify data comes through
- [ ] Temporarily set an invalid token and verify error handling

**Open questions:**
- Should we cache responses briefly (e.g., 10 seconds) to avoid redundant calls in parallel cron steps? (Recommendation: no caching for launch; add only if quota becomes a problem)

---

_Note: The reusable seeding function (formerly `SYNC-DB-001`) has been moved to Phase 2 as `GANG-DB-001` so that `GANG-DB-002 create_gang RPC` can call it directly. Phase 3 depends on it being in place._

---

## SYNC-CRON-001: sync-fixtures daily cron (edge function)

**Phase:** Phase 3 — Match Sync
**Priority:** P0
**Estimated effort:** Large (2–3 days)
**Status:** Not started

**User story:**
> As the developer,
> I want a daily cron that imports IPL fixtures, teams, and player squads from Sportmonks into the v2 schema,
> So that the app always has up-to-date match schedules and rosters.

**Context / Why:**
The core data pipeline. Per PRD, runs once a day at 5 AM IST (23:30 UTC prior day). Uses the Sportmonks client.

**Acceptance criteria:**
- [ ] Edge function: `supabase-2/functions/sync-fixtures/index.ts`
- [ ] Triggered by pg_cron entry: `SELECT cron.schedule('sync-fixtures', '30 23 * * *', $$SELECT net.http_post(url:='https://{project-ref}.functions.supabase.co/sync-fixtures', headers:='{"Authorization": "Bearer {service-role-key}"}'::jsonb)$$)`
- [ ] Reads Sportmonks season ID from the active `v2_seasons.api_id`
- [ ] Steps:
  1. Fetch season fixtures via Sportmonks client (`getSeasonFixtures(seasonId, ['localteam', 'visitorteam', 'venue'])`)
  2. For each fixture:
     - Upsert teams into `v2_league_teams`: INSERT new teams only (by `api_id`). Do NOT overwrite existing teams' `color`, `logo_url`, or `name` since those are curated via the seed migration (FND-DB-005). Only update `api_id` if missing.
     - Upsert fixture into `v2_league_season_fixtures` (match by `api_id`)
     - Detect `start_datetime` changes vs stored value → if changed, reset `pre_match_synced = false`
     - Do NOT overwrite fixture status if already `live`, `completed`, `resolved` (only update metadata like venue_name, match_number)
  3. Collect unique team IDs from the season → for each team:
     - Fetch team squad via `getTeamSquad(teamId, seasonId)`
     - Upsert players into `v2_players` (match by `api_id`)
     - Sync `v2_league_season_team_players`: delete rows for (season_id, team_id) that are not in the current squad, then upsert current squad
- [ ] Uses service role client for DB writes
- [ ] Retry logic: 3 attempts with 15-minute backoff per PRD Error Handling
- [ ] Logs progress per step (fixture count synced, team squads synced, players upserted)
- [ ] Logs errors to PostHog via server SDK
- [ ] Alerts admin if all retries fail (creates a system notification or logs a critical error — exact mechanism TBD, implementation should log at minimum)
- [ ] Idempotent — safe to re-run without creating duplicates
- [ ] Returns a JSON summary: `{ fixturesSynced, teamsSynced, playersSynced, errors }`

**Out of scope:**
- Pre-match delta sync (SYNC-CRON-002)
- Scenario seeding (SYNC-CRON-003)
- Live polling (Phase 5)

**Dependencies:** SYNC-LIB-001, FND-DB-001 through FND-DB-005
**Blocks:** SYNC-CRON-002, SYNC-UI-001, SYNC-CRON-003 (logically — scenarios need fixtures)

**PRD references:**
- [sync-fixtures](../PRD.V2.md#sync-fixtures--daily-fixture-and-player-sync)
- [Error Handling & Retries](../PRD.V2.md#error-handling--retries)
- [v2_league_season_team_players](../PRD.V2.md#v2_league_season_team_players--player-to-team-mapping-per-season)

**Technical notes:**
- Deno edge function runtime
- Use `createClient` with service role key from `Deno.env`
- `pg_cron` schedule must use UTC — 5 AM IST = 23:30 UTC (prior day)
- Mid-season trade handling: delete stale rows per (season_id, team_id), insert fresh
- Don't overwrite fixture `status` if it's already been updated by live-polling (`live`, `completed`, etc.)
- Error alert: log to PostHog with severity `critical`; optionally insert a row in a `v2_system_alerts` table (future)
- Set function timeout to reasonable value (e.g., 5 minutes) — IPL has ~60 fixtures, 10 teams, 25 players each, should complete in < 2 min

**Analytics events:**
- `CRON_SYNC_FIXTURES_STARTED`
- `CRON_SYNC_FIXTURES_COMPLETED` — `{ fixtures_synced, teams_synced, players_synced, duration_ms }`
- `CRON_SYNC_FIXTURES_FAILED` — `{ error, attempt }`
- Uses distinct_id: `'system:sync-fixtures'`

**Unit tests:**
- [ ] Happy path: mock Sportmonks client, verify all upserts
- [ ] Rescheduled fixture: verify `pre_match_synced` reset
- [ ] Player trade: old rows in `v2_league_season_team_players` deleted, new ones added
- [ ] API failure: 3 retries attempted, alert on final failure
- [ ] Does not overwrite `status` for live/completed fixtures

**Test plan:**
- [ ] Deploy to STG, run manually via `supabase functions invoke sync-fixtures`
- [ ] Verify `v2_league_season_fixtures` has IPL 2026 schedule
- [ ] Verify `v2_league_teams` has 10 IPL teams
- [ ] Verify `v2_players` has ~250 players (25 per team × 10)
- [ ] Re-run, verify no duplicates

**Open questions:**
- How do we handle a team that's dropped from the league mid-season? (Edge case — for IPL this never happens; skip for launch)

---

## SYNC-CRON-002: sync-fixtures-pre-match delta cron

**Phase:** Phase 3 — Match Sync
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As the developer,
> I want a cron that runs every 15 minutes and checks fixtures about to start for any last-minute timing changes,
> So that users see accurate match start times even if Sportmonks updates them at the last minute.

**Context / Why:**
Per PRD, the daily sync runs once at 5 AM. Fixtures can get rescheduled close to match time. The pre-match cron catches these changes.

**Acceptance criteria:**
- [ ] Edge function: `supabase-2/functions/sync-fixtures-pre-match/index.ts`
- [ ] pg_cron schedule: every 15 minutes (`'*/15 * * * *'`)
- [ ] Steps:
  1. Query `v2_league_season_fixtures` where `start_datetime BETWEEN now() + INTERVAL '15 minutes' AND now() + INTERVAL '30 minutes'` AND `pre_match_synced = false`
  2. For each matching fixture, call `getFixture(api_id)` from Sportmonks client
  3. Compare `start_datetime` from API with stored value
  4. If changed:
     - Update stored `start_datetime`
     - Keep `pre_match_synced = false` (next cycle will re-verify)
     - Log the change
  5. If unchanged:
     - Set `pre_match_synced = true`
- [ ] Uses service role client
- [ ] Logs processed fixture count
- [ ] No retries — next cycle acts as retry per PRD
- [ ] Alert after 3 consecutive failures

**Out of scope:**
- Daily sync (SYNC-CRON-001)
- Scenario seeding (SYNC-CRON-003)

**Dependencies:** SYNC-LIB-001, SYNC-CRON-001 (fixtures must exist)
**Blocks:** None

**PRD references:**
- [sync-fixtures-pre-match](../PRD.V2.md#sync-fixtures-pre-match--pre-match-delta-sync)

**Technical notes:**
- Flag reset on any start_datetime change — will re-fire next cron cycle until timing is stable
- Idempotent
- Function timeout: 2 minutes

**Analytics events:**
- `CRON_SYNC_PRE_MATCH_STARTED`
- `CRON_SYNC_PRE_MATCH_COMPLETED` — `{ fixtures_checked, fixtures_updated }`
- `CRON_SYNC_PRE_MATCH_FAILED`

**Unit tests:**
- [ ] Query returns only fixtures in the 15–30 min window
- [ ] Unchanged start_datetime → flag set to true
- [ ] Changed start_datetime → flag stays false, start_datetime updated
- [ ] No fixtures to sync → function returns successfully

**Test plan:**
- [ ] Deploy to STG, manually run
- [ ] Manually set a fixture's `pre_match_synced = false` and `start_datetime` in the future window, verify it gets checked

**Open questions:** None

---

## SYNC-CRON-003: seed-scenarios cron (every 30 min)

**Phase:** Phase 3 — Match Sync
**Priority:** P0
**Estimated effort:** Small (3–5 hours)
**Status:** Not started

**User story:**
> As the developer,
> I want a cron that every 30 minutes seeds scenarios for any (gang, upcoming fixture) pair that doesn't have scenarios yet,
> So that all gangs are ready to predict when the 12-hour prediction window opens.

**Context / Why:**
Per PRD, scenarios must be seeded at least 12 hours before each match. The cron uses a 14-hour buffer to allow for up to 30-minute cron lag.

**Acceptance criteria:**
- [ ] Implemented as a **Postgres function** called by pg_cron (DB-only, no external API calls)
- [ ] Function: `run_seed_scenarios_cron() RETURNS JSONB` in migration file `supabase-2/migrations/009_seed_scenarios_cron.sql`
- [ ] pg_cron schedule: every 30 minutes (`'*/30 * * * *'`)
- [ ] Steps:
  1. Find all (gang, fixture) pairs needing seeding:
     ```
     SELECT g.id AS gang_id, f.id AS fixture_id
     FROM v2_league_season_fixtures f
     JOIN v2_gang_league_seasons gls ON gls.season_id = f.season_id AND gls.is_active = true
     JOIN v2_gangs g ON g.id = gls.gang_id AND g.is_deleted = false
     WHERE f.status = 'upcoming'
       AND f.start_datetime - INTERVAL '14 hours' <= now()
       AND f.start_datetime > now()
       AND NOT EXISTS (
         SELECT 1 FROM v2_fixture_scenarios fs
         WHERE fs.gang_id = g.id AND fs.fixture_id = f.id
       )
     ```
  2. For each pair, call `seed_fixture_scenarios_for_gang(gang_id, fixture_id)` (from GANG-DB-001 in Phase 2)
  3. Count successes and failures
  4. Return summary JSON: `{ pairs_processed, pairs_seeded, errors: [...] }`
- [ ] Per-pair transaction: failure on one pair doesn't abort the cron
- [ ] Uses `SECURITY DEFINER` (runs with elevated privileges)
- [ ] Logs errors via `RAISE NOTICE`
- [ ] Runs via pg_cron directly (no edge function wrapper needed since it's DB-only)

**Out of scope:**
- Scenario seeding during gang creation (handled in GANG-DB-002 via the same helper function)
- Edge function wrapper (not needed for DB-only work)

**Dependencies:** GANG-DB-001 (Phase 2 — provides `seed_fixture_scenarios_for_gang` function)
**Blocks:** Prediction flow in Phase 4 (scenarios must exist to predict)

**PRD references:**
- [seed-scenarios](../PRD.V2.md#seed-scenarios--scenario-seeding-per-gang-per-fixture)
- [Cron Functions § Execution model](../PRD.V2.md#cron-functions)

**Technical notes:**
- Per PRD, DB-only cron functions can run as pg_cron directly (no edge function needed)
- Use a loop with exception handling to avoid one bad pair killing the whole run
- Log level: `RAISE NOTICE` for info, `RAISE WARNING` for per-pair failures

**Analytics events:** None (DB cron; optionally log counters to a `system_stats` table)

**Unit tests:**
- [ ] Query returns expected pairs
- [ ] Already-seeded pairs are excluded
- [ ] Per-pair failure doesn't stop other pairs
- [ ] Deleted gangs are excluded
- [ ] Inactive `gang_league_seasons` excluded

**Test plan:**
- [ ] On STG, create a test gang and ensure an upcoming fixture is within 14 hours
- [ ] Manually run `SELECT run_seed_scenarios_cron();`
- [ ] Verify `v2_fixture_scenarios` rows created
- [ ] Run again, verify no duplicates

**Open questions:**
- Should we emit an event when this cron creates > N scenarios for observability? (Recommendation: log to `RAISE NOTICE` for now)

---

## SYNC-UI-001: Gang Page Upcoming Matches section

**Phase:** Phase 3 — Match Sync
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As a gang member,
> I want to see the next 3 upcoming IPL matches on my gang page with a CTA to make predictions,
> So that I know what to predict next.

**Context / Why:**
The Gang Page had a placeholder for Upcoming Matches in Phase 2. Now that fixtures exist, we render them.

**Acceptance criteria:**
- [ ] Component: `src/components/matches/upcoming-matches-section.tsx` (server component)
- [ ] Props: `gangId: string`
- [ ] Fetches via DAL `getUpcomingMatchesForGang(gangId)`:
  - Finds gang's enrolled season(s) via `v2_gang_league_seasons`
  - Queries `v2_league_season_fixtures` for `status IN ('upcoming', 'live')` AND `season_id IN (...)`
  - Orders by `start_datetime ASC`, limits to 3
- [ ] For each match, renders a card showing:
  - `{Home Team} vs {Away Team}` (team codes from `v2_league_teams`)
  - Match number (from fixture)
  - Date + time (formatted in user's local timezone with timezone abbreviation per PRD NFR)
  - Venue name
  - Prediction deadline (computed from `start_datetime - gang.prediction_deadline_mins`)
  - CTA button: "Make Your Calls" → links to `/group/{gangId}/predict/{fixtureId}` (the predict page is built in Phase 4; link can exist now as a dead link for now)
- [ ] If no upcoming matches → empty state "No matches on the horizon — sit tight"
- [ ] If a match is live → the card shows a "LIVE" badge (but Live Matches section is Phase 5)
- [ ] Mobile-responsive cards
- [ ] Accessible

**Out of scope:**
- Live scorecard (Phase 5)
- Predict page (Phase 4)
- Prediction status indicators (who has predicted) — Phase 4

**Dependencies:** SYNC-CRON-001, GANG-UI-005, FND-006
**Blocks:** PRED-UI-* stories (they link from here)

**PRD references:**
- [Gang Page § Upcoming Matches](../PRD.V2.md#gang-page-groupgroupid)
- [Non-Functional Requirements § Localization](../PRD.V2.md#non-functional-requirements)

**Technical notes:**
- Use `Intl.DateTimeFormat` for local timezone formatting
- Gang Page (GANG-UI-005) needs to be updated to replace the placeholder with this component
- DAL: `src/lib/dal/matches.ts` adds `getUpcomingMatchesForGang(gangId)`
- The `prediction_deadline_mins` comes from `v2_gang_league_seasons`

**Analytics events:**
- None directly (autocapture tracks clicks on CTA)

**Unit tests:**
- [ ] DAL returns next 3 upcoming matches
- [ ] Component renders match card with correct data
- [ ] Date shown in local timezone
- [ ] Empty state shown when no matches
- [ ] CTA link is correct

**Test plan:**
- [ ] Ensure IPL 2026 fixtures are in DB via SYNC-CRON-001
- [ ] Visit a test gang's page, verify 3 upcoming matches rendered
- [ ] Verify timezone and date format look correct on mobile
- [ ] Click the CTA — goes to predict page URL (dead link until Phase 4)

**Open questions:**
- Should we show more than 3 matches if there's a doubleheader day? (Per PRD: exactly 3 chronologically; stick with that.)

---

## Summary

Phase 3 delivers the match data pipeline. After this phase, the gang page shows real IPL fixtures and the system is ready for predictions.

**Story count:** 5 stories (1 library, 3 cron jobs, 1 UI) — DB seeding function moved to Phase 2 as GANG-DB-001
**Estimated total effort:** ~8–12 working days

**Ship readiness:**
- ✅ Daily fixture + player sync from Sportmonks
- ✅ Pre-match timing delta sync
- ✅ Scenario seeding per gang per fixture (14-hour buffer)
- ✅ Gang page shows upcoming matches
- ⏳ Predict page itself comes in Phase 4
- ⏳ Live scores and resolution come in Phase 5
