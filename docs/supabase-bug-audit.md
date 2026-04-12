# Supabase Bug Audit

**Date:** 2026-04-12
**Scope:** All migrations, edge functions, shared modules, seed data, and cron jobs in `supabase/supabase/`

---

## Critical

### BUG-001: `delete_account` RPC trusts client-supplied `p_user_id`

- **Location:** `migrations/20260406000012_delete_account_rpc.sql`
- **Description:** The `delete_account(p_user_id UUID)` function accepts a client-supplied UUID and runs as `SECURITY DEFINER`. It does not verify that `p_user_id = auth.uid()`. Any authenticated user can pass another user's UUID and delete their account (soft-delete their profile, reassign or delete their gangs, send notifications on their behalf).
- **Impact:** Full account takeover / destruction. An attacker can wipe any user's account.
- **Fix:** Replace the `p_user_id` parameter with an internal `v_user_id := auth.uid()` call, matching the pattern already applied to `delete_gang` in migration `20260409000016`.

---

### BUG-002: `create_gang` RPC trusts client-supplied `p_creator_id`

- **Location:** `migrations/20260407000008_create_gang_rpc.sql`
- **Description:** The `create_gang(p_gang_name TEXT, p_creator_id UUID)` function accepts a client-supplied creator ID and runs as `SECURITY DEFINER`. A malicious user can:
  1. Create gangs attributed to another user.
  2. Exhaust another user's max-gangs quota (40 memberships).
  3. Bypass their own quota entirely.
- **Impact:** Quota manipulation, impersonation, denial-of-service against other users.
- **Fix:** Remove `p_creator_id` parameter. Resolve the creator internally via `auth.uid()`.

---

### BUG-003: `v2_gang_members` INSERT policy allows self-promotion

- **Location:** `migrations/20260406000002_rls_policies.sql`
- **Description:** The INSERT policy on `v2_gang_members` only checks `user_id = auth.uid()`. It does NOT enforce `status = 'pending'` or `role = 'member'`. A user who knows a `gang_id` can insert a row with `status = 'approved'` and `role = 'admin'`, bypassing the join-request approval workflow and immediately becoming a gang admin.
- **Impact:** Unauthorized access to any gang. Full admin privileges (delete gang, approve/reject members, etc.).
- **Fix:** Tighten the WITH CHECK clause to: `user_id = auth.uid() AND status = 'pending' AND role = 'member'`.

---

### BUG-004: `v2_rate_limits` has no RLS enabled

- **Location:** `migrations/20260408000015_rate_limits_table.sql`
- **Description:** The migration creates `v2_rate_limits` but never calls `ALTER TABLE v2_rate_limits ENABLE ROW LEVEL SECURITY`. Combined with migration `20260407000012` which grants `SELECT, INSERT, UPDATE, DELETE ON ALL TABLES` to both `anon` and `authenticated` roles, any user (including unauthenticated anonymous requests) can read, insert, update, and delete any rate limit record.
- **Impact:** Rate limiting is completely bypassable. If the table is ever activated for actual rate limiting, it provides zero protection.
- **Fix:** Add `ALTER TABLE v2_rate_limits ENABLE ROW LEVEL SECURITY` and create appropriate policies (likely service-role-only for all operations).

---

### BUG-005: `anon` role has full DML on all tables

- **Location:** `migrations/20260407000012_grant_table_permissions.sql`
- **Description:** The migration grants `SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public` to the `anon` role. While RLS policies on the 19 v2 tables restrict row-level access to `authenticated` users, the `anon` role still has table-level DML permissions. This is a defense-in-depth violation — any table added in the future without RLS enabled immediately becomes fully accessible to unauthenticated users.
- **Impact:** Expanded attack surface. Any new table without RLS is wide open. `v2_rate_limits` is already exposed (see BUG-004).
- **Fix:** Restrict `anon` to `SELECT` only (or remove grants entirely). Grant `INSERT, UPDATE, DELETE` only to `authenticated`. Review whether `anon` needs any access at all.

---

## High

### BUG-006: `getSeasonFixtures` does not handle pagination

- **Location:** `functions/_shared/sportmonks.ts:400-423`
- **Description:** The `getSeasonFixtures` method fetches fixtures using a list endpoint but does NOT paginate through results. Sportmonks' default page size is 25-50 items. IPL has ~74 fixtures per season. Only the first page of fixtures is synced — the rest are silently dropped.
- **Impact:** Missing fixtures in the database. Users cannot predict on matches that were never synced. This is likely actively causing data loss in production.
- **Fix:** Implement pagination loop using Sportmonks' `meta.pagination` fields (`current_page`, `last_page`) to fetch all pages.

---

### BUG-007: `getRunsForTeam` returns wrong data in super overs

- **Location:** `functions/_shared/sportmonks-extractors.ts:151-155`
- **Description:** `getRunsForTeam` uses `.find()` which returns only the FIRST matching runs entry for a team. In a super over, each team has two runs entries (main innings + super over). If Sportmonks orders the super-over entry first, the wrong innings data is returned. This affects:
  - `extractHomeTeamInningsScore` / `extractAwayTeamInningsScore` — could return super over score instead of innings score.
  - `extractPowerplayRuns` / `extractPowerplayWickets` — would use wrong innings data.
  - `extractLiveScorecard` — would show super over score instead of main innings score.
- **Impact:** Incorrect scenario resolution and live scorecard data during super over matches. Wrong predictions marked correct/incorrect.
- **Fix:** Filter runs entries by innings type/identifier (e.g., `resource === "runs"` and `type === "innings"` vs `type === "super_over"`), or sort by innings number and pick the main innings entry explicitly.

---

### BUG-008: Status mapper inconsistency between `sync-fixtures` and `live-poll`

- **Location:** `functions/sync-fixtures/index.ts` and `functions/live-poll-resolve-fixtures/index.ts`
- **Description:** Two separate status mapping functions handle different subsets of Sportmonks statuses:
  - `sync-fixtures/mapFixtureStatus` maps `'abandoned'` and `'cancl'` but misses `'aborted'` and `'cancelled'`.
  - `live-poll/mapSmStatusToInternal` handles `'aborted'` and `'cancelled'` but maps `'ns'`/`'not started'` differently from `sync-fixtures`.
  - If `sync-fixtures` encounters an `'aborted'` status, it defaults to `'upcoming'` — an incorrect mapping.
- **Impact:** Fixtures could be stuck in wrong status. Abandoned/cancelled matches could appear as upcoming, allowing users to submit predictions on matches that will never happen.
- **Fix:** Extract a single shared `mapSmStatusToInternal` function into `_shared/` and use it in both edge functions.

---

### BUG-009: Notification dedup `ON CONFLICT DO NOTHING` is dead code for most types

- **Location:** `migrations/20260407000009_delete_gang_rpc.sql`, `20260406000012_delete_account_rpc.sql`, `20260410000001_notification_rpcs.sql`
- **Description:** The unique partial index `uniq_notifications_dedup` only covers `type IN ('deadline_reminder', 'results_available')`. For all other notification types (`gang_deleted`, `join_request`, `join_approved`, `join_rejected`, `new_member`, `admin_promoted`), the `ON CONFLICT DO NOTHING` clause matches on the PK (`id`), which is always unique via `gen_random_uuid()`. The conflict clause never fires, so duplicate notifications are freely inserted.
- **Impact:** Users receive duplicate notifications. Repeated calls to notification RPCs (e.g., due to retries or UI double-clicks) create duplicate entries.
- **Fix:** Either expand the partial index to cover all notification types, or add per-type dedup constraints, or use an idempotency key pattern.

---

## Medium

### BUG-010: `all_scenarios_resolved` check gated on `scenariosResolved > 0`

- **Location:** `functions/live-poll-resolve-fixtures/index.ts:797`
- **Description:** The check that determines whether all scenarios for a fixture are resolved is gated behind `if (scenariosResolved > 0)`. If the final remaining scenario is resolved via the reconciliation pass (step 6.5) rather than the regular resolution loop (step 6), `scenariosResolved` remains 0 because the reconciliation pass uses `re_resolve_scenario` and does not increment the counter. The fixture is never marked as fully resolved.
- **Impact:** Fixtures can get stuck in `completed` status and never transition to `resolved`. Result notifications are never sent. Season standings may be incomplete.
- **Fix:** Always check `all_scenarios_resolved` regardless of `scenariosResolved` count, or increment the counter in the reconciliation pass.

---

### BUG-011: Run rate calculation uses cricket-notation overs

- **Location:** `functions/_shared/sportmonks-extractors.ts:647`
- **Description:** The live scorecard calculates current run rate as `score / overs`. Sportmonks expresses overs in cricket notation where `6.3` means 6 overs and 3 balls (= 6.5 overs mathematically). The code divides by the raw cricket notation value instead of converting to actual overs.
  - Example: 42 runs in 6.3 overs → code gives `42 / 6.3 = 6.67`, correct value is `42 / 6.5 = 6.46`.
- **Impact:** Incorrect run rate displayed on live scorecard. The error magnitude increases with more balls bowled in the current over.
- **Fix:** Convert cricket notation to mathematical overs before division: `Math.floor(overs) + (overs % 1) * 10 / 6`.

---

### BUG-012: N+1 API and DB calls in squad sync

- **Location:** `functions/sync-fixtures/index.ts:331-393`
- **Description:** The squad sync loops over each unique team (10 IPL teams) and makes sequential API calls to `getTeamSquad()`. For each player in each squad (~25 players × 10 teams = ~250 players), it performs individual `upsertPlayer` calls followed by individual `.upsert()` for the team-player link. Total: 10 sequential API calls + ~500 sequential DB operations.
- **Impact:** Slow sync execution. Increased risk of partial failure leaving inconsistent squad data. Higher Sportmonks API usage. Edge function may time out.
- **Fix:** Batch API calls (parallel with `Promise.all`) and batch DB upserts (single `.upsert()` call with arrays).

---

### BUG-013: Stale player deletion on partial API data

- **Location:** `functions/sync-fixtures/index.ts:375-386`
- **Description:** After syncing a team's squad, the function deletes all `v2_league_season_team_players` entries for that team that are NOT in the current API response. If the Sportmonks squad API returns partial data (e.g., due to a transient error, incomplete response, or API pagination issue), legitimate players are deleted from the roster.
- **Impact:** Players disappear from team rosters. Player-pick scenarios break because the player is no longer associated with the team. Users cannot select affected players for predictions.
- **Fix:** Add a sanity check (e.g., only delete if the API returned a reasonable number of players, or if the response included all pages). Alternatively, soft-delete with a `last_seen_at` timestamp.

---

### BUG-014: `void_fixture_scenarios` triggers O(N×19) standings recalculations

- **Location:** `migrations/20260408000013_scenario_resolution_functions.sql`
- **Description:** When `void_fixture_scenarios` updates all scenarios for a fixture to `is_voided = true`, the `trg_scenario_recalc_standings` trigger fires once PER ROW (it is a `FOR EACH ROW` trigger). For 19 active scenario templates across N gangs, this triggers `19 × N` calls to `recalculate_full_standings`. Each call recomputes fixture stats, fixture ranks, season aggregates, and season ranks.
- **Impact:** Severe performance degradation when voiding fixtures. For a fixture with 50 gangs, this is 950 full standings recalculations. Could cause timeouts or lock contention.
- **Fix:** Disable the trigger within `void_fixture_scenarios`, perform the voiding, then call `recalculate_full_standings` once per gang. Or use a statement-level trigger that deduplicates.

---

### BUG-015: `bowler_three_wickets` and `fifty_scored` don't aggregate across innings

- **Location:** `functions/_shared/sportmonks-extractors.ts:527, 550`
- **Description:** Both functions check per-entry values (`batting.some(b => b.score >= 50)` and `bowling.some(b => b.wickets >= 3)`) without aggregating a single player's stats across multiple innings entries. This is inconsistent with `extractTopScorer` and `extractTopWicketTaker`, which DO aggregate across innings (fixed in a prior commit). In a super over, a player's stats are split across two entries.
- **Impact:** Edge case only (super over). A player with 30 runs in main innings + 25 in super over (55 total) would not be counted as having scored a fifty. Practically near-zero probability in T20, but logically inconsistent.
- **Fix:** Aggregate per-player stats before checking thresholds, matching the pattern used by `extractTopScorer`/`extractTopWicketTaker`.

---

### BUG-016: `first_wicket_over` stored as INT, should be DECIMAL

- **Location:** `migrations/20260406000001_initial_schema.sql` — `v2_fixture_results.first_wicket_over`
- **Description:** The column is typed as `INT` but cricket overs are fractional. Over `2.3` means 2 overs and 3 balls. Storing as INT truncates this to `2`, losing the ball information. The scenario template range options (`["1","2","3","4-5","6+"]`) suggest whole-over buckets, so resolution may work by coincidence, but the stored value is imprecise.
- **Impact:** Loss of precision in stored data. If resolution logic ever needs ball-level accuracy, the data is not available.
- **Fix:** Change column type to `DECIMAL(3,1)` to match `home_team_overs`/`away_team_overs` in `v2_fixture_live_scores`.

---

### BUG-017: Protected status prevents daily sync from fixing abandoned fixtures

- **Location:** `functions/sync-fixtures/index.ts:100-102`
- **Description:** The `isProtectedStatus` function prevents the daily sync from overwriting `live`, `completed`, or `resolved` statuses. If a `live` fixture is cancelled/abandoned in Sportmonks and the `live-poll` edge function misses the transition (e.g., cron not running, edge function error), the daily sync will skip the fixture because `live` is a protected status. The fixture remains stuck as `live` indefinitely.
- **Impact:** Stuck fixtures. Users see a match as "live" forever. Predictions on that fixture are never resolved or voided.
- **Fix:** Allow the daily sync to transition `live` → `abandoned`/`no_result` if the Sportmonks status clearly indicates the match is over. Only protect `completed` and `resolved` from being overwritten.

---

### BUG-018: `v2_profiles` SELECT policy has expensive self-join without status filter

- **Location:** `migrations/20260406000002_rls_policies.sql`
- **Description:** The profiles SELECT policy joins `v2_gang_members` to itself (`gm1 JOIN gm2 ON gm2.gang_id = gm1.gang_id`) to determine if the current user shares a gang with the profile owner. The join does NOT filter on `status = 'approved'`, meaning any membership status (pending, rejected, removed, left) creates profile visibility. Additionally, this N-to-N self-join is expensive and runs on every profile query.
- **Impact:** Privacy leak — users who were rejected or removed from a gang can still see other members' profiles. Performance degradation on profile queries as gang membership grows.
- **Fix:** Add `AND gm1.status = 'approved' AND gm2.status = 'approved'` to the join condition. Consider using the `is_gang_member()` helper or a materialized view for performance.

---

## Low

### BUG-019: No CHECK constraint on `prediction_deadline_mins`

- **Location:** `migrations/20260406000001_initial_schema.sql` — `v2_gang_league_seasons.prediction_deadline_mins`
- **Description:** The column has no CHECK constraint. A negative value would set the prediction deadline to AFTER the match starts, allowing predictions during a live match.
- **Fix:** Add `CHECK (prediction_deadline_mins > 0 AND prediction_deadline_mins <= 1440)`.

---

### BUG-020: No `home_team_id != away_team_id` CHECK constraint

- **Location:** `migrations/20260406000001_initial_schema.sql` — `v2_league_season_fixtures`
- **Description:** Nothing prevents a fixture from having the same team as both home and away.
- **Fix:** Add `CHECK (home_team_id != away_team_id)`.

---

### BUG-021: Cron jobs for scenario seeding and deadline reminders are commented out

- **Location:** `migrations/20260407000010_seed_scenarios_cron.sql`, `migrations/20260408000014_deadline_reminders_cron.sql`
- **Description:** Both `pg_cron` schedule calls are commented out in the migration files. No alternative scheduling mechanism is configured in `config.toml` or elsewhere. The `run_seed_scenarios_cron()` and `run_deadline_reminders_cron()` functions exist but are never invoked automatically.
- **Impact:** Scenarios are not seeded for new fixtures (except during `create_gang`). Deadline reminder notifications are never sent.
- **Fix:** Uncomment the cron schedules or configure equivalent scheduling in production.

---

### BUG-022: No pg_cron schedules for edge functions

- **Location:** `config.toml`, migrations
- **Description:** None of the three edge functions (`live-poll-resolve-fixtures`, `sync-fixtures`, `sync-fixtures-pre-match`) have cron schedules defined in `config.toml` or migrations. They must be manually configured in production.
- **Impact:** Edge functions don't run automatically without manual production setup.
- **Fix:** Document the required cron schedules and/or add them to `config.toml` for local development.

---

### BUG-023: No TTL or cleanup for `v2_notifications`

- **Location:** `migrations/20260406000001_initial_schema.sql`
- **Description:** The `v2_notifications` table has no mechanism to clean up old notifications. Unlike `v2_rate_limits` (which has a daily cleanup cron), notifications accumulate indefinitely.
- **Impact:** Unbounded table growth over the season. Query performance degrades as notifications pile up.
- **Fix:** Add a pg_cron job to delete read notifications older than N days, or add a `expires_at` column.

---

### BUG-024: `striker_name` field stores player API IDs, not names

- **Location:** `functions/_shared/sportmonks-extractors.ts:622-623`
- **Description:** `extractLiveScorecard` sets `strikerName = String(striker.player_id)` — storing a numeric Sportmonks API ID in a field semantically named "name". The frontend reportedly maps these IDs to names, but the field name is misleading.
- **Impact:** Confusing data model. Any consumer of `v2_fixture_live_scores.striker_name` expecting an actual name will get a numeric string.
- **Fix:** Rename the column to `striker_player_api_id` (and similarly for `non_striker_name` → `non_striker_player_api_id`), or resolve the name server-side.

---

### BUG-025: Migration filename ordering inconsistent

- **Location:** `migrations/20260406000012_delete_account_rpc.sql`
- **Description:** This file has timestamp `20260406` but was logically written after migrations `20260408000013` through `20260408000015`. Supabase runs migrations in filename sort order, so `20260406000012` executes before `20260408000013`. This works for this specific migration (it only depends on tables from 001-004) but creates confusion about the intended logical order.
- **Impact:** Developer confusion. No functional issue currently.
- **Fix:** No action needed for existing data. For future migrations, use strictly chronological timestamps.

---

### BUG-026: `seed.sql` is empty

- **Location:** `supabase/seed.sql`
- **Description:** The seed file contains only a comment. All reference data (sports, leagues, seasons, scenario templates) is inserted in migration `20260406000005_seed_data.sql`. Running `supabase db reset` applies migrations (which includes the seed data), so this works, but it conflates reference data with schema migrations.
- **Impact:** No functional issue. Deviates from Supabase convention of separating seed data from migrations.
- **Fix:** Consider moving seed data from migration 005 to `seed.sql` for cleaner separation, or document the convention.

---

### BUG-027: ISO datetime string comparison without normalization

- **Location:** `functions/sync-fixtures-pre-match/index.ts:96`
- **Description:** The function compares `apiStartDatetime !== storedStartDatetime` as raw strings. If one includes fractional seconds (`.000000Z`) and the other doesn't, they're treated as different even though they represent the same instant. This causes unnecessary "rescheduled" log entries and DB writes.
- **Fix:** Parse both values with `new Date()` and compare timestamps numerically.

---

### BUG-028: API token passed as URL query parameter

- **Location:** `functions/_shared/sportmonks.ts:258`
- **Description:** The Sportmonks API token is set as a URL query parameter (`api_token=...`). While it's redacted in logs, the URL can appear in server access logs, error reporting tools, CDN logs, or browser dev tools (if ever called client-side).
- **Fix:** Use an `Authorization` header instead, if supported by the Sportmonks API.

---

### BUG-029: Large batch notification insert could hit size limits

- **Location:** `functions/live-poll-resolve-fixtures/index.ts:1080`
- **Description:** `createResultsNotifications` builds a single `.insert(notifications)` call for all users across all gangs who predicted on a fixture. For a popular fixture, this could be thousands of rows in a single insert, potentially exceeding Supabase's request payload limits.
- **Fix:** Batch inserts into chunks of 500-1000 rows.

---

## Test Coverage Gaps

### GAP-001: Missing extractor tests

- **Location:** `functions/_shared/sportmonks-extractors.test.ts`
- **Missing tests for:**
  - `extractTossWinner` — null/undefined toss data
  - `extractMatchWinner` — null/undefined winner, tied match
  - `extractPlayerOfMatch` — null/undefined man-of-match
  - `extractSuperOver` — true/false/null cases
  - `extractTotalMatchRuns` — multi-innings aggregation
  - `extractTotalMatchSixes` — multi-innings aggregation
  - `extractTotalMatchWickets` — multi-innings aggregation
  - `extractLiveScorecard` — the most complex extractor with zero test coverage

### GAP-002: Private functions not testable

- **Location:** `functions/_shared/sportmonks-extractors.ts`
- **Description:** `parseScoreString` and `detectRunsRowRegressions` are not exported and cannot be unit tested. They should be extracted into a testable module.
