# Bragg — System Admin Dashboard Plan

> **Status:** Draft
> **Scope:** Read-only admin dashboard for platform visibility and operational health
> **Access:** System admin role only (not gang-level admin)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Platform Overview (Home)](#2-platform-overview-home)
3. [Fixture Pipeline](#3-fixture-pipeline)
4. [Scenario Resolution Tracking](#4-scenario-resolution-tracking)
5. [User Insights](#5-user-insights)
6. [Gang Insights](#6-gang-insights)
7. [Prediction Insights](#7-prediction-insights)
8. [Leaderboard & Standings Monitoring](#8-leaderboard--standings-monitoring)
9. [Reference Data Browser](#9-reference-data-browser)
10. [Notification Monitoring](#10-notification-monitoring)
11. [Operational Health & Alerts](#11-operational-health--alerts)
12. [Data Integrity Checks](#12-data-integrity-checks)
13. [Rate Limiting](#13-rate-limiting)
14. [Moderation & Support](#14-moderation--support)
15. [Access Control](#15-access-control)
16. [Future Considerations](#16-future-considerations)

---

## 1. Overview

A read-only system admin dashboard for Bragg that provides complete visibility into the platform's database state, user activity, operational health, and data integrity. Accessible only to users with a system admin role.

**Goals:**
- At-a-glance platform health and key metrics
- Visual status of the fixture lifecycle (upcoming → live → completed → resolved)
- Deep user and gang insights (growth, engagement, retention)
- Prediction analytics (volume, timing, accuracy)
- Scenario resolution tracking and anomaly detection
- Operational monitoring for cron jobs and Sportmonks API
- Data integrity checks and alerting
- Moderation/support tools (blocked users, deleted accounts, pending requests)

**Constraints:**
- Read-only (no mutations in v1)
- Uses service role client (bypasses RLS to see all data)
- Hosted under `/admin/...` route with middleware auth check

---

## 2. Platform Overview (Home)

The landing page — an at-a-glance snapshot of the entire platform.

### 2.1 Key Metric Cards

| Metric | Source |
|--------|--------|
| Active users | `v2_profiles WHERE is_deleted = false` |
| Deleted accounts | `v2_profiles WHERE is_deleted = true` |
| Onboarded users | `WHERE onboarding_completed = true AND is_deleted = false` |
| Not-yet-onboarded users | `WHERE onboarding_completed = false AND is_deleted = false` |
| Active gangs | `v2_gangs WHERE is_deleted = false` |
| Deleted gangs | `v2_gangs WHERE is_deleted = true` |
| Total predictions (all time) | `COUNT(*) FROM v2_predictions` |
| Predictions today | `WHERE submitted_at >= today` |
| Active season | `v2_seasons WHERE is_active = true` — name, dates, days remaining |
| Season progress | Fixtures resolved / total fixtures (percentage bar) |
| Fixtures by status | Counts per status: upcoming, live, completed, resolved, abandoned, no_result |
| Live fixtures right now | Count + match names if any are live |

### 2.2 Cron Job Health Panel

| Cron | Schedule | Metrics |
|------|----------|---------|
| `sync-fixtures` | Daily 23:30 UTC | Last run, fixtures/teams/players synced, errors, duration |
| `sync-fixtures-pre-match` | Every 15 min | Last run, fixtures checked/updated/confirmed, errors, duration |
| `live-poll-resolve-fixtures` | Every 15s | Last run, fixtures polled, scenarios resolved, fully resolved, errors, duration |
| `seed-scenarios` | Every 30 min | pairs_found, pairs_seeded, errors |
| `deadline-reminders` | Every 15 min | reminders_sent, pairs_checked |
| `cleanup-rate-limits` | Daily 03:00 UTC | Last run timestamp |

> **Note:** There is currently no persistent cron run log table. Implementation will need either a `v2_cron_run_log` table or integration with `cron.job_run_details` / edge function invocation logs.

### 2.3 Data Freshness Indicators

| Check | Stale Condition |
|-------|-----------------|
| Last fixture sync | > 26 hours since last `sync-fixtures` run |
| Live score freshness | Any live fixture with `last_polled_at` > 60 seconds ago |
| Scenario seeding coverage | Upcoming fixtures within 14h window with unseeded (gang, fixture) pairs |
| Pre-match sync | Fixtures starting within 30 min with `pre_match_synced = false` |

---

## 3. Fixture Pipeline

Visual and tabular views of every fixture in the active season, showing progression through the status lifecycle.

### 3.1 Pipeline Visualization

A Kanban-style or funnel view with columns for each status:
- **Upcoming** — count and list
- **Live** — count and list (highlighted)
- **Completed** — count and list
- **Resolved** — count and list
- **Abandoned / No Result** — count and list

### 3.2 Fixture Table (all fixtures in active season)

| Column | Source |
|--------|--------|
| Match # | `match_number` |
| Round | `round` |
| Home Team | code + brand color from `v2_league_teams` |
| Away Team | code + brand color from `v2_league_teams` |
| Start Datetime (IST) | `start_datetime` |
| Venue | `venue_name` |
| Status | `status` (color-coded) |
| Status Changed At | `status_changed_at` |
| Pre-match Synced | boolean indicator |
| Has Results | `EXISTS(v2_fixture_results)` |
| Live Score Age | `now() - v2_fixture_live_scores.last_polled_at` |
| Scenarios Seeded | count across all gangs |
| Scenarios Resolved % | `resolved / (resolved + pending)` excluding voided |
| Total Predictions | count of `v2_predictions` for this fixture |
| Time in Current Status | `now() - status_changed_at` |

Sortable by any column. Filterable by status.

### 3.3 Fixture Detail Drill-Down

Clicking a fixture shows:

**Metadata:** All columns from `v2_league_season_fixtures`.

**Results:** Full `v2_fixture_results` row with player/team names resolved via joins:
- Toss winner, match winner, top scorer, top wicket taker, most sixes player, player of match
- Innings scores (home/away), powerplay runs/wickets
- Total match runs, sixes, wickets, catches
- First wicket over, fifty scored, bowler three wickets, super over
- `resolved_at` timestamp

**Live Scores:** Full `v2_fixture_live_scores` row:
- Team scores, overs, batting team, run rate
- Striker/non-striker/bowler info, partnership
- `last_polled_at`, max overs seen

**Scenario Resolution Table (per gang):**
- All 19 scenarios: slug, title, is_resolved, is_voided, correct_answer, resolution_phase
- Color-coded: green = resolved, red = voided, yellow = pending

**Prediction Summary (per gang):**
- Count of predictions, count of users who predicted
- Participation rate (predicted / approved members)

### 3.4 Fixture Alerts

| Severity | Alert | Condition |
|----------|-------|-----------|
| Critical | Stuck in completed | `status = 'completed'` for > 120 minutes |
| High | Live but not polling | `status = 'live'` and `last_polled_at` > 2 min ago or NULL |
| High | Upcoming, no scenarios seeded | Within 14h window, no `v2_fixture_scenarios` for any active gang |
| Medium | Pre-match not synced near start | `pre_match_synced = false` and starting within 30 min |
| Medium | Missing results for resolved fixture | `status = 'resolved'` but no `v2_fixture_results` row |
| Low | Results without `resolved_at` | `v2_fixture_results` exists but `resolved_at IS NULL` and fixture resolved |

---

## 4. Scenario Resolution Tracking

### 4.1 Resolution Overview (Active Season)

| Metric | Query |
|--------|-------|
| Total scenarios created | `COUNT(*)` in active season |
| Resolved | `WHERE is_resolved = true AND is_voided = false` |
| Voided | `WHERE is_voided = true` |
| Pending | `WHERE is_resolved = false AND is_voided = false` |
| Resolution rate | resolved / (resolved + pending) % |

### 4.2 Resolution by Phase

Group scenarios by `resolution_phase` (toss, first_wicket, team_powerplay_end, mid_match, team_innings_end, end, post_match):
- Count resolved per phase
- Count pending per phase
- Flag phases consistently failing to resolve

### 4.3 Resolution by Slug

For each of the 19 active scenario slugs:
- Total instances (all gangs × all fixtures)
- Resolved / voided / pending counts
- Most common correct_answer value (answer distribution)
- Accuracy rate across all predictions

### 4.4 Scenario Anomalies

| Alert | Detail |
|-------|--------|
| Resolved with NULL correct_answer | Data integrity issue |
| Resolved but fixture still 'upcoming' | Timing bug |
| Non-voided scenarios for voided fixture | `fixture status IN ('abandoned', 'no_result')` but `is_voided = false` |
| Re-resolved scenarios | Scenarios where `re_resolve_scenario` was invoked (stat revision) |
| Orphaned scenarios | Referencing a soft-deleted gang |
| Wrong scenario count per (gang, fixture) | Should be exactly 19 active scenarios |

---

## 5. User Insights

### 5.1 Summary Metrics

| Metric | Detail |
|--------|--------|
| Total registered | All `v2_profiles` |
| Active (onboarded, not deleted) | Standard active user count |
| Not onboarded | Registered but `onboarding_completed = false` — drop-off signal |
| Deleted accounts | `is_deleted = true` with `deleted_at` |
| Users by terms version | `GROUP BY terms_version` |

### 5.2 User Growth

- **Daily signups chart** — from `v2_profiles.created_at`
- **Cumulative user count** — over time
- **Onboarding funnel** — registered → onboarded → first prediction → active predictor
- **Onboarding completion rate** — per daily/weekly cohort

### 5.3 User Activity

| Metric | Detail |
|--------|--------|
| Users who predicted at least once | `DISTINCT user_id FROM v2_predictions` |
| Users who never predicted | Onboarded users with zero predictions |
| Active today / this week | Distinct users with predictions in period |
| Average scenarios predicted per match | How many of 19 scenarios users fill per fixture |
| Users in multiple gangs | Distribution of gang membership counts |
| Users approaching gang limit (38-39) | Capacity warning |

### 5.4 Retention Signals

| Metric | Detail |
|--------|--------|
| Match participation rate | Per fixture: users predicted / total approved members |
| Match-over-match dropoff | Predicted match N but not match N+1 |
| Gang joiners who never predict | `approved` members with zero predictions |
| Days from signup to first prediction | Activation speed |
| Account deletion trend | Deletions over time with reasons (if available) |

### 5.5 User Detail Lookup

Search by email, display_name, or user_id:
- **Profile:** display_name, email, date_of_birth, terms_version, onboarding_completed, is_deleted, created_at
- **Gang memberships:** list with gang name, role, status
- **Prediction stats:** total predictions, accuracy, points from `v2_gang_season_standings`
- **Recent activity:** last 10 predictions with fixture, scenario slug, value, is_correct, points_earned

---

## 6. Gang Insights

### 6.1 Summary Metrics

| Metric | Detail |
|--------|--------|
| Active gangs | `is_deleted = false` |
| Deleted gangs | `is_deleted = true` |
| Created today / this week | Growth rate |
| Auto-accept enabled | `auto_accept = true` |
| Enrolled in active season | From `v2_gang_league_seasons` |

### 6.2 Gang Size Distribution

- Average / median approved members per gang
- **Size histogram:** 1, 2–5, 6–10, 11–15, 16–20
- Solo gangs (1 member) — may indicate abandoned
- Full gangs (20 members) — at capacity
- Gangs with pending join requests

### 6.3 Gang Activity

| Metric | Detail |
|--------|--------|
| Gangs with predictions in last match | At least one member predicted |
| Average match participation per gang | % of members predicting per fixture |
| Inactive gangs | No predictions in last N fixtures |
| Custom prediction deadline | `prediction_deadline_mins != 45` |

### 6.4 Gang Health Indicators

| Alert | Condition |
|-------|-----------|
| Blocked members | `v2_gang_members WHERE is_blocked = true` |
| High churn | Many `status IN ('left', 'removed')` |
| Admin account deleted | `created_by` references deleted profile (should have auto-promoted) |
| Not enrolled in active season | Active gang without `v2_gang_league_seasons` row |

### 6.5 Gang Detail Lookup

Search by gang name or invite code:
- **Metadata:** name, invite_code, created_by, auto_accept, is_deleted, created_at
- **Members:** user_id, display_name, role, status, is_blocked, timestamps
- **League season:** prediction_deadline_mins, is_active
- **Season standings:** ranked member list with points, accuracy, matches predicted
- **Fixture standings:** per-fixture member points

---

## 7. Prediction Insights

### 7.1 Volume Metrics

| Metric | Detail |
|--------|--------|
| Total predictions (all time) | Global count |
| Average predictions per fixture | Across all gangs |
| Average scenarios filled per user per fixture | Out of 19 |
| Most / least predicted fixture | By volume |

### 7.2 Timing Patterns

| Metric | Detail |
|--------|--------|
| Time before deadline | Distribution: >12h, 6–12h, 2–6h, 1–2h, <1h |
| Early birds vs last-minute | Percentage breakdown |
| Re-submission rate | Users who update predictions before deadline |

### 7.3 Accuracy Distribution

| Metric | Detail |
|--------|--------|
| Global accuracy rate | `correct / resolved` across all predictions |
| Accuracy per scenario slug | Which scenarios are hardest / easiest |
| User accuracy histogram | Distribution of user accuracy percentages |
| Points distribution per match | Histogram of points per user per fixture |
| Perfect scores | Users who got all 19 correct in a match |
| Zero-point matches | Users who got 0 correct |

### 7.4 Scenario-Level Breakdown

Per scenario slug:
- Participation rate (how often users predict this vs skip it)
- Accuracy rate
- Answer distribution (most popular choices)
- Correct answer distribution across matches

---

## 8. Leaderboard & Standings Monitoring

### 8.1 Season Standings Health

| Check | Detail |
|-------|--------|
| Missing standings | Users with predictions but no standings row |
| Orphaned standings | Standings for deleted gangs or users |
| NULL ranks | Standings rows with rank = NULL but user has predictions |
| Accuracy sanity | Values outside 0–100% range |
| Points consistency | `v2_gang_season_standings.total_points` vs `SUM(v2_gang_fixture_standings.points_earned)` |

### 8.2 Fixture Standings Health

| Check | Detail |
|-------|--------|
| predicted_count mismatch | Standings value vs actual prediction count |
| correct_count mismatch | Standings value vs actual correct predictions |
| resolved_count mismatch | Standings value vs actual resolved (non-voided) predictions |
| points_earned mismatch | Standings value vs actual `SUM(points_earned)` |

---

## 9. Reference Data Browser

### 9.1 Sports / Leagues / Seasons

- All `v2_sports` rows (currently: Cricket)
- All `v2_leagues` rows (currently: IPL)
- All `v2_seasons` rows: name, year, start_date, end_date, is_active, days remaining
- Season timeline visualization

### 9.2 Teams

- All `v2_league_teams` in active league: name, code, brand color, logo preview, is_active, api_id
- Player count per team (from `v2_league_season_team_players`)

### 9.3 Players

- Total player count
- Players per team in active season
- Unassigned players (in `v2_players` but not in `v2_league_season_team_players`)
- Player details: name, role, batting_style, bowling_style, is_active, api_id
- Searchable / filterable table

### 9.4 Scenario Templates

- All 20 templates: slug, title, input_type, options, points, resolution_phase, is_active
- Highlight inactive (currently: `total_match_catches`)
- Total active points budget (should be 210)

---

## 10. Notification Monitoring

### 10.1 Volume

| Metric | Detail |
|--------|--------|
| Total notifications | All time |
| By type | `GROUP BY type` — breakdown across all 8 types |
| Today / this week | Recent volume |
| Unread (global) | `is_read = false` count |
| Average per user | Total / active users |

### 10.2 Delivery Health

| Check | Detail |
|-------|--------|
| Deadline reminder coverage | Members who hadn't predicted vs reminders sent per fixture |
| Results notification coverage | Gangs with predictions vs `results_available` notifications per fixture |
| Duplicate notifications | Unexpected duplicates despite dedup index |
| Orphaned notifications | Referencing deleted gangs or non-existent fixtures |

---

## 11. Operational Health & Alerts

### 11.1 Edge Function Monitoring

Per function (`sync-fixtures`, `sync-fixtures-pre-match`, `live-poll-resolve-fixtures`):
- Last invocation time
- HTTP status (200, 207, 500)
- Duration (`durationMs`)
- Error count and messages
- Sportmonks rate limit hits (429 responses)

### 11.2 Sportmonks API Health

| Metric | Detail |
|--------|--------|
| API success rate | Successful calls / total calls |
| Rate limit frequency | 429 response count |
| Response latency | Average call duration |
| Data regression events | Count of regression warnings from live poll |
| Reconciliation events | Count of re-resolved scenarios (stat revisions) |

### 11.3 Consolidated Alert Board

All active alerts, ordered by severity:

| Priority | Alert | Condition |
|----------|-------|-----------|
| Critical | Fixture stuck in completed > 120 min | Needs manual resolution |
| Critical | Edge function returning 500 | Platform reliability broken |
| Critical | Sportmonks rate limited | Data sync blocked |
| High | Live fixture stale data > 2 min | Users seeing outdated scores |
| High | Unseeded scenarios within 12h of match | Users cannot predict |
| High | Cron not running (missed expected window) | Silent failure |
| Medium | Pre-match sync unconfirmed before start | Potentially wrong start times |
| Medium | Standings data mismatches | Incorrect leaderboards |
| Low | Gang approaching member limit (18–19) | Capacity planning |
| Low | User approaching gang limit (38–39) | Capacity planning |

---

## 12. Data Integrity Checks

### 12.1 Referential Integrity

| Check | Detail |
|-------|--------|
| Predictions → deleted gangs | `v2_predictions.gang_id` where gang `is_deleted = true` |
| Predictions → missing scenarios | `scenario_id NOT IN v2_fixture_scenarios` |
| Scenarios → deleted gangs | `v2_fixture_scenarios.gang_id` where gang deleted |
| Standings → deleted gangs | Both fixture and season standings |
| Members → missing profiles | `user_id NOT IN v2_profiles` |
| Gang league seasons → deleted gangs | Orphaned enrollment rows |

### 12.2 Business Logic Consistency

| Check | Detail |
|-------|--------|
| Gangs with > 20 approved members | Trigger-enforced, verify |
| Users in > 40 active gangs | Trigger-enforced, verify |
| Predictions after deadline | Should be RLS-blocked, verify |
| Duplicate predictions | `(user_id, scenario_id)` uniqueness |
| Match number gaps/duplicates | Within a season |
| Resolved fixture without results | `status = 'resolved'` but no `v2_fixture_results` |
| Results without resolved fixture | `v2_fixture_results` where fixture not resolved |

### 12.3 Scenario Consistency

| Check | Detail |
|-------|--------|
| Active gang missing scenarios | Enrolled gang without scenarios for fixture in seeding window |
| Wrong scenario count | `(gang, fixture)` should have exactly 19 active scenarios |
| Voided scenarios for non-voided fixture | `is_voided = true` but fixture not abandoned/no_result |
| Non-voided scenarios for voided fixture | Fixture abandoned but scenarios not voided |

---

## 13. Rate Limiting

| Metric | Detail |
|--------|--------|
| Rate limit table size | `COUNT(*) FROM v2_rate_limits` |
| Active entries | `WHERE window_start >= now() - interval '1 hour'` |
| Users hitting limits | Users with high count values |
| Last cleanup run | From pg_cron log |

> **Note:** The app currently uses in-memory LRU rate limiting. This table is a prepared upgrade path. Monitor both once the table-based approach is activated.

---

## 14. Moderation & Support

### 14.1 Blocked Users

- List: `v2_gang_members WHERE is_blocked = true`
- Show: user display_name, gang name, blocked by (gang admin), when

### 14.2 Deleted Accounts

- List: `v2_profiles WHERE is_deleted = true ORDER BY deleted_at DESC`
- Show: display_name, email, deleted_at, gangs affected, auto-promotion events triggered

### 14.3 Deleted Gangs

- List: `v2_gangs WHERE is_deleted = true ORDER BY deleted_at DESC`
- Show: name, created_by, deleted_at, member count, deletion trigger (admin action vs cascade)

### 14.4 Pending Join Requests

- Global view: `v2_gang_members WHERE status = 'pending'`
- Show: gang name, user info, requested_at
- Flag stale requests (pending > 7 days)

### 14.5 Member Departures

- Recent: `v2_gang_members WHERE status IN ('left', 'removed') ORDER BY departed_at DESC`
- Pattern detection: gangs losing members frequently

---

## 15. Access Control

### 15.1 System Admin Role

There is currently no system admin role in the database. Options for implementation:

| Approach | Pros | Cons |
|----------|------|------|
| `is_system_admin` boolean on `v2_profiles` | Simple, queryable | Requires migration |
| Separate `v2_system_admins` table | Clean separation | Extra table/join |
| Environment variable allowlist (user IDs/emails) | No migration, fast | Not queryable, config-dependent |
| Supabase custom claims on `auth.users` | JWT-based, middleware-friendly | Harder to manage |

### 15.2 Dashboard Access Rules

- Read-only (no mutations in v1)
- Service role client (bypass RLS) for cross-gang, cross-user visibility
- Hosted under `/admin/...` route group
- Middleware auth check: verify session + system admin role
- Audit log of dashboard access (who viewed what, when) — future consideration

---

## 16. Future Considerations

Items from the PRD marked as TBD that would benefit from admin dashboard support:

| Item | Dashboard Support |
|------|-------------------|
| Manual scenario resolution | Admin UI to set `correct_answer` on stuck scenarios (post-120min) |
| Scenario template management | Toggle `is_active`, add new templates |
| Reference data management | Create new sports, leagues, seasons |
| Past seasons browser | Browse historical season data |
| Account hard deletes | Trigger permanent deletion (data retention compliance) |
| Operational alerting | Consecutive-failure tracking, PagerDuty/Slack integration |
| Data regression monitoring | Aggregate `detectRunsRowRegressions` warnings |
| Bulk operations | Re-seed scenarios, re-resolve fixtures, recalculate standings |
