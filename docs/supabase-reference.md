# Bragg — Supabase Project Reference

> Complete reference for the Supabase backend. Covers every table, enum, RLS policy, function, trigger, index, edge function, and cron job in the project. This document is the single source of truth for an AI agent to understand the Supabase layer.

---

## Project Structure

```
supabase/supabase/
├── config.toml                          # Supabase CLI configuration
├── seed.sql                             # Placeholder (actual seeds in migrations)
├── migrations/                          # 16 ordered SQL migration files
│   ├── 20260406000001_initial_schema.sql
│   ├── 20260406000002_rls_policies.sql
│   ├── 20260406000003_indexes.sql
│   ├── 20260406000004_triggers.sql
│   ├── 20260406000005_seed_data.sql
│   ├── 20260406000006_migrate_from_v1.sql
│   ├── 20260406000012_delete_account_rpc.sql
│   ├── 20260407000007_seed_scenarios_function.sql
│   ├── 20260407000008_create_gang_rpc.sql
│   ├── 20260407000009_delete_gang_rpc.sql
│   ├── 20260407000010_seed_scenarios_cron.sql
│   ├── 20260407000011_add_fixture_round.sql
│   ├── 20260407000012_grant_table_permissions.sql
│   ├── 20260408000013_scenario_resolution_functions.sql
│   ├── 20260408000014_deadline_reminders_cron.sql
│   └── 20260408000015_rate_limits_table.sql
├── functions/                           # Supabase Edge Functions (Deno)
│   ├── _shared/
│   │   ├── sportmonks.ts                # Sportmonks API client
│   │   └── sportmonks-extractors.ts     # Scenario resolution extractors
│   ├── live-poll-resolve-fixtures/
│   │   └── index.ts                     # Live polling + scenario resolution
│   ├── sync-fixtures/
│   │   └── index.ts                     # Daily fixture + player sync
│   └── sync-fixtures-pre-match/
│       └── index.ts                     # Pre-match delta sync
└── .temp/                               # CLI-managed temp files
```

---

## 1. Enums

| Enum | Values |
|------|--------|
| `v2_match_status` | `upcoming`, `live`, `completed`, `resolved`, `abandoned`, `no_result` |
| `v2_member_role` | `admin`, `member` |
| `v2_member_status` | `pending`, `approved`, `rejected`, `removed`, `left` |
| `v2_scenario_type` | `system` |
| `v2_scenario_input_type` | `team_pick`, `player_pick`, `range`, `yes_no` |
| `v2_resolution_phase` | `toss`, `first_wicket`, `team_powerplay_end`, `mid_match`, `team_innings_end`, `end`, `post_match` |
| `v2_notification_type` | `join_request`, `join_approved`, `join_rejected`, `new_member`, `deadline_reminder`, `results_available`, `gang_deleted`, `admin_promoted` |

**Extensions enabled:** `pgcrypto`

---

## 2. Tables

### 2.1 `v2_sports` — Sport definitions

| Column | Type | Constraints / Default |
|--------|------|----------------------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `api_id` | TEXT | NOT NULL |
| `name` | TEXT | NOT NULL |
| `code` | TEXT | NOT NULL |
| `is_active` | BOOLEAN | default `true` |
| `created_at` | TIMESTAMPTZ | default `now()` |

### 2.2 `v2_leagues` — Leagues within a sport

| Column | Type | Constraints / Default |
|--------|------|----------------------|
| `id` | UUID | PK |
| `api_id` | TEXT | NOT NULL |
| `sport_id` | UUID | FK → `v2_sports(id)` ON DELETE RESTRICT |
| `name` | TEXT | NOT NULL |
| `code` | TEXT | NOT NULL, UNIQUE |
| `is_active` | BOOLEAN | default `true` |
| `created_at` | TIMESTAMPTZ | default `now()` |

### 2.3 `v2_seasons` — Season/edition of a league

| Column | Type | Constraints / Default |
|--------|------|----------------------|
| `id` | UUID | PK |
| `api_id` | TEXT | NOT NULL |
| `league_id` | UUID | FK → `v2_leagues(id)` ON DELETE RESTRICT |
| `name` | TEXT | NOT NULL |
| `year` | INT | NOT NULL |
| `start_date` | DATE | |
| `end_date` | DATE | |
| `is_active` | BOOLEAN | default `true` |
| `created_at` | TIMESTAMPTZ | default `now()` |

**Unique constraints:**
- `(league_id, year)`
- Partial unique index: `(league_id) WHERE is_active = true` — enforces one active season per league

### 2.4 `v2_profiles` — User accounts

| Column | Type | Constraints / Default |
|--------|------|----------------------|
| `id` | UUID | PK, references `auth.users(id)` ON DELETE CASCADE |
| `display_name` | TEXT | nullable |
| `email` | TEXT | NOT NULL |
| `date_of_birth` | DATE | nullable |
| `terms_version` | TEXT | |
| `terms_accepted_at` | TIMESTAMPTZ | nullable |
| `onboarding_completed` | BOOLEAN | default `false` |
| `is_deleted` | BOOLEAN | default `false` |
| `deleted_at` | TIMESTAMPTZ | nullable |
| `created_at` | TIMESTAMPTZ | default `now()` |

**CHECK constraint:** `onboarding_completed = false OR (display_name IS NOT NULL AND date_of_birth IS NOT NULL AND terms_version IS NOT NULL)`

### 2.5 `v2_gangs` — User-created prediction groups

| Column | Type | Constraints / Default |
|--------|------|----------------------|
| `id` | UUID | PK |
| `name` | TEXT | NOT NULL |
| `invite_code` | TEXT | NOT NULL, UNIQUE |
| `created_by` | UUID | FK → `v2_profiles(id)` ON DELETE RESTRICT |
| `auto_accept` | BOOLEAN | default `false` |
| `is_deleted` | BOOLEAN | default `false` |
| `deleted_at` | TIMESTAMPTZ | nullable |
| `created_at` | TIMESTAMPTZ | default `now()` |

### 2.6 `v2_gang_members` — Gang membership

| Column | Type | Constraints / Default |
|--------|------|----------------------|
| `gang_id` | UUID | FK → `v2_gangs(id)` ON DELETE CASCADE |
| `user_id` | UUID | FK → `v2_profiles(id)` ON DELETE CASCADE |
| `role` | `v2_member_role` | default `'member'` |
| `status` | `v2_member_status` | default `'pending'` |
| `is_blocked` | BOOLEAN | default `false` |
| `requested_at` | TIMESTAMPTZ | default `now()` |
| `approved_at` | TIMESTAMPTZ | nullable |
| `departed_at` | TIMESTAMPTZ | nullable |

**PK:** `(gang_id, user_id)`

### 2.7 `v2_gang_league_seasons` — Gang enrollment in league seasons

| Column | Type | Constraints / Default |
|--------|------|----------------------|
| `gang_id` | UUID | FK → `v2_gangs(id)` |
| `league_id` | UUID | FK → `v2_leagues(id)` |
| `season_id` | UUID | FK → `v2_seasons(id)` |
| `prediction_deadline_mins` | INT | default `45` |
| `is_active` | BOOLEAN | default `true` |
| `created_at` | TIMESTAMPTZ | default `now()` |

**PK:** `(gang_id, league_id, season_id)`

### 2.8 `v2_league_teams` — Teams within a league

| Column | Type | Constraints / Default |
|--------|------|----------------------|
| `id` | UUID | PK |
| `api_id` | TEXT | NOT NULL |
| `league_id` | UUID | FK → `v2_leagues(id)` ON DELETE RESTRICT |
| `name` | TEXT | NOT NULL |
| `code` | TEXT | NOT NULL |
| `color` | TEXT | NOT NULL |
| `logo_url` | TEXT | nullable |
| `is_active` | BOOLEAN | default `true` |
| `created_at` | TIMESTAMPTZ | default `now()` |

**Unique constraint:** `(league_id, code)`

### 2.9 `v2_players` — Player database

| Column | Type | Constraints / Default |
|--------|------|----------------------|
| `id` | UUID | PK |
| `api_id` | TEXT | NOT NULL |
| `name` | TEXT | NOT NULL |
| `role` | TEXT | nullable |
| `batting_style` | TEXT | nullable |
| `bowling_style` | TEXT | nullable |
| `is_active` | BOOLEAN | default `true` |
| `created_at` | TIMESTAMPTZ | default `now()` |

### 2.10 `v2_league_season_fixtures` — Match schedule

| Column | Type | Constraints / Default |
|--------|------|----------------------|
| `id` | UUID | PK |
| `api_id` | TEXT | NOT NULL |
| `league_id` | UUID | FK → `v2_leagues(id)` |
| `season_id` | UUID | FK → `v2_seasons(id)` |
| `round` | TEXT | NOT NULL (added in migration 011) |
| `match_number` | INT | NOT NULL |
| `home_team_id` | UUID | FK → `v2_league_teams(id)` |
| `away_team_id` | UUID | FK → `v2_league_teams(id)` |
| `start_datetime` | TIMESTAMPTZ | NOT NULL |
| `venue_id` | UUID | nullable (reserved for future venues table) |
| `venue_name` | TEXT | NOT NULL |
| `status` | `v2_match_status` | default `'upcoming'` |
| `status_changed_at` | TIMESTAMPTZ | default `now()` |
| `pre_match_synced` | BOOLEAN | default `false` |
| `created_at` | TIMESTAMPTZ | default `now()` |

**Unique constraint:** `(season_id, round)` — `round` values from Sportmonks are naturally unique within a season (e.g., "1st Match", "Qualifier 1", "Final").

### 2.11 `v2_fixture_results` — Resolved match stats

| Column | Type | Constraints / Default |
|--------|------|----------------------|
| `fixture_id` | UUID | PK, FK → `v2_league_season_fixtures(id)` ON DELETE CASCADE |
| `toss_winner_id` | UUID | FK → `v2_league_teams`, nullable |
| `match_winner_id` | UUID | FK → `v2_league_teams`, nullable |
| `top_scorer_id` | UUID | FK → `v2_players`, nullable |
| `top_wicket_taker_id` | UUID | FK → `v2_players`, nullable |
| `most_sixes_player_id` | UUID | FK → `v2_players`, nullable |
| `player_of_match_id` | UUID | FK → `v2_players`, nullable |
| `home_team_innings_score` | INT | nullable |
| `away_team_innings_score` | INT | nullable |
| `home_team_powerplay_runs` | INT | nullable |
| `away_team_powerplay_runs` | INT | nullable |
| `home_team_powerplay_wickets_lost` | INT | nullable |
| `away_team_powerplay_wickets_lost` | INT | nullable |
| `total_match_runs` | INT | nullable |
| `total_match_sixes` | INT | nullable |
| `total_match_wickets` | INT | nullable |
| `total_match_catches` | INT | nullable |
| `first_wicket_over` | INT | nullable |
| `fifty_scored` | BOOLEAN | nullable |
| `bowler_three_wickets` | BOOLEAN | nullable |
| `super_over` | BOOLEAN | nullable |
| `resolved_at` | TIMESTAMPTZ | nullable |
| `created_at` | TIMESTAMPTZ | default `now()` |

### 2.12 `v2_fixture_live_scores` — Live scorecard data

| Column | Type | Constraints / Default |
|--------|------|----------------------|
| `fixture_id` | UUID | PK |
| `home_team_score` | TEXT | nullable, e.g., "185/4" |
| `away_team_score` | TEXT | nullable |
| `home_team_overs` | DECIMAL(4,1) | nullable |
| `away_team_overs` | DECIMAL(4,1) | nullable |
| `batting_team_id` | UUID | nullable |
| `current_run_rate` | DECIMAL(4,2) | nullable |
| `last_6_balls` | TEXT | nullable, e.g., "1 4 W 0 6 2" |
| `striker_name` | TEXT | nullable |
| `striker_score` | TEXT | nullable, e.g., "45(32)" |
| `non_striker_name` | TEXT | nullable |
| `non_striker_score` | TEXT | nullable |
| `current_bowler` | TEXT | nullable |
| `current_partnership` | TEXT | nullable, e.g., "78(52)" |
| `raw_scorecard_json` | JSONB | nullable |
| `last_polled_at` | TIMESTAMPTZ | nullable |
| `home_team_max_overs_seen` | DECIMAL(4,1) | nullable (defensive against API cache anomalies) |
| `away_team_max_overs_seen` | DECIMAL(4,1) | nullable |
| `updated_at` | TIMESTAMPTZ | default `now()` |

### 2.13 `v2_scenario_templates` — System scenario definitions

| Column | Type | Constraints / Default |
|--------|------|----------------------|
| `id` | UUID | PK |
| `sport_id` | UUID | FK → `v2_sports(id)` |
| `slug` | TEXT | NOT NULL, UNIQUE |
| `title` | TEXT | NOT NULL |
| `input_type` | `v2_scenario_input_type` | |
| `options` | JSONB | nullable |
| `points` | INT | NOT NULL |
| `resolution_phase` | `v2_resolution_phase` | NOT NULL |
| `is_active` | BOOLEAN | default `true` |
| `created_at` | TIMESTAMPTZ | default `now()` |

### 2.14 `v2_fixture_scenarios` — Prediction questions per gang per fixture

| Column | Type | Constraints / Default |
|--------|------|----------------------|
| `id` | UUID | PK |
| `template_id` | UUID | FK → `v2_scenario_templates(id)`, nullable |
| `league_id` | UUID | FK → `v2_leagues(id)` |
| `season_id` | UUID | FK → `v2_seasons(id)` |
| `fixture_id` | UUID | FK → `v2_league_season_fixtures(id)` ON DELETE CASCADE |
| `gang_id` | UUID | FK → `v2_gangs(id)` ON DELETE CASCADE |
| `type` | `v2_scenario_type` | default `'system'` |
| `slug` | TEXT | NOT NULL |
| `title` | TEXT | NOT NULL |
| `input_type` | `v2_scenario_input_type` | |
| `options` | JSONB | nullable |
| `points` | INT | NOT NULL |
| `resolution_phase` | `v2_resolution_phase` | NOT NULL |
| `correct_answer` | TEXT | nullable |
| `is_resolved` | BOOLEAN | default `false` |
| `is_voided` | BOOLEAN | default `false` |
| `created_at` | TIMESTAMPTZ | default `now()` |

**Unique constraint:** `(gang_id, fixture_id, slug)`

### 2.15 `v2_predictions` — User predictions

| Column | Type | Constraints / Default |
|--------|------|----------------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `v2_profiles(id)` ON DELETE CASCADE |
| `scenario_id` | UUID | FK → `v2_fixture_scenarios(id)` ON DELETE CASCADE |
| `gang_id` | UUID | FK → `v2_gangs(id)` |
| `league_id` | UUID | FK → `v2_leagues(id)` |
| `season_id` | UUID | FK → `v2_seasons(id)` |
| `fixture_id` | UUID | FK → `v2_league_season_fixtures(id)` ON DELETE CASCADE |
| `value` | TEXT | NOT NULL |
| `is_correct` | BOOLEAN | nullable |
| `points_earned` | INT | default `0` |
| `submitted_at` | TIMESTAMPTZ | default `now()` |
| `created_at` | TIMESTAMPTZ | default `now()` |

**Unique constraint:** `(user_id, scenario_id)`

### 2.16 `v2_league_season_team_players` — Player-to-team mapping per season

| Column | Type | Constraints / Default |
|--------|------|----------------------|
| `league_id` | UUID | FK → `v2_leagues(id)` |
| `season_id` | UUID | FK → `v2_seasons(id)` |
| `team_id` | UUID | FK → `v2_league_teams(id)` |
| `player_id` | UUID | FK → `v2_players(id)` |
| `created_at` | TIMESTAMPTZ | default `now()` |

**PK:** `(season_id, team_id, player_id)`

### 2.17 `v2_gang_fixture_standings` — Match leaderboard per gang (materialized)

| Column | Type | Constraints / Default |
|--------|------|----------------------|
| `gang_id` | UUID | FK → `v2_gangs(id)` |
| `season_id` | UUID | FK → `v2_seasons(id)` |
| `fixture_id` | UUID | FK → `v2_league_season_fixtures(id)` |
| `user_id` | UUID | FK → `v2_profiles(id)` |
| `predicted_count` | INT | default `0` |
| `resolved_count` | INT | default `0` |
| `correct_count` | INT | default `0` |
| `points_earned` | INT | default `0` |
| `last_submitted_at` | TIMESTAMPTZ | |
| `rank` | INT | nullable |
| `updated_at` | TIMESTAMPTZ | default `now()` |

**PK:** `(gang_id, fixture_id, user_id)`

### 2.18 `v2_gang_season_standings` — Season leaderboard per gang (materialized)

| Column | Type | Constraints / Default |
|--------|------|----------------------|
| `gang_id` | UUID | FK → `v2_gangs(id)` |
| `season_id` | UUID | FK → `v2_seasons(id)` |
| `user_id` | UUID | FK → `v2_profiles(id)` |
| `matches_predicted` | INT | default `0` |
| `total_points` | INT | default `0` |
| `total_correct` | INT | default `0` |
| `total_resolved` | INT | default `0` |
| `accuracy_pct` | DECIMAL(5,2) | default `0` |
| `points_per_match` | DECIMAL(5,2) | default `0` |
| `rank` | INT | nullable |
| `updated_at` | TIMESTAMPTZ | default `now()` |

**PK:** `(gang_id, season_id, user_id)`

### 2.19 `v2_notifications` — User notifications

| Column | Type | Constraints / Default |
|--------|------|----------------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `v2_profiles(id)` ON DELETE CASCADE |
| `type` | `v2_notification_type` | NOT NULL |
| `message` | TEXT | NOT NULL |
| `gang_id` | UUID | FK → `v2_gangs(id)` ON DELETE CASCADE, nullable |
| `fixture_id` | UUID | FK → `v2_league_season_fixtures(id)` ON DELETE CASCADE, nullable |
| `is_read` | BOOLEAN | default `false` |
| `created_at` | TIMESTAMPTZ | default `now()` |

**Unique partial index:** `(user_id, gang_id, fixture_id, type) WHERE type IN ('deadline_reminder', 'results_available')` — prevents duplicate notifications.

**Realtime:** Enabled for Supabase Realtime (INSERT/UPDATE/DELETE events).

### 2.20 `v2_rate_limits` — Rate limiting storage

| Column | Type | Constraints / Default |
|--------|------|----------------------|
| `user_id` | UUID | |
| `action` | TEXT | |
| `window_start` | TIMESTAMPTZ | |
| `count` | INT | |

**PK:** `(user_id, action, window_start)`
**Index:** `idx_v2_rate_limits_window_start` on `(window_start)`
**Cron cleanup:** Daily at 03:00 UTC, deletes rows older than 24 hours.

---

## 3. Indexes

| Table | Index Name | Columns / Condition |
|-------|-----------|-------------------|
| `v2_profiles` | `idx_profiles_email` | `(email)` |
| `v2_gangs` | `idx_gangs_created_by` | `(created_by)` |
| `v2_gangs` | `idx_gangs_deleted` | `(is_deleted)` |
| `v2_gang_members` | `idx_gang_members_status` | `(gang_id, status)` |
| `v2_gang_members` | `idx_gang_members_user` | `(user_id, status)` |
| `v2_gang_league_seasons` | `idx_gang_league_seasons_season` | `(season_id)` |
| `v2_league_season_fixtures` | `idx_fixtures_season_status` | `(season_id, status, start_datetime)` |
| `v2_league_season_fixtures` | `idx_fixtures_status_start` | `(status, start_datetime)` |
| `v2_fixture_scenarios` | `idx_scenarios_gang_fixture` | `(gang_id, fixture_id)` |
| `v2_fixture_scenarios` | `idx_scenarios_gang_season` | `(gang_id, season_id)` |
| `v2_fixture_scenarios` | `idx_scenarios_fixture_unresolved` | `(fixture_id) WHERE is_resolved = false` |
| `v2_fixture_scenarios` | `idx_scenarios_gang_fixture_active` | `(gang_id, fixture_id) WHERE is_voided = false` |
| `v2_predictions` | `idx_predictions_gang_fixture_user` | `(gang_id, fixture_id, user_id)` |
| `v2_predictions` | `idx_predictions_scenario` | `(scenario_id)` |
| `v2_predictions` | `idx_predictions_gang_season_user` | `(gang_id, season_id, user_id)` |
| `v2_gang_fixture_standings` | `idx_fixture_standings_season` | `(gang_id, season_id)` |
| `v2_gang_season_standings` | `idx_season_standings_user` | `(user_id)` |
| `v2_notifications` | `idx_notifications_user` | `(user_id, created_at DESC)` |
| `v2_notifications` | `idx_notifications_unread` | `(user_id, is_read) WHERE is_read = false` |
| `v2_rate_limits` | `idx_v2_rate_limits_window_start` | `(window_start)` |

---

## 4. RLS Policies

RLS is enabled on all 20 tables. System operations (cron, edge functions) use service role key to bypass RLS.

### 4.1 RLS Helper Functions (SECURITY DEFINER)

| Function | Signature | Purpose |
|----------|-----------|---------|
| `is_gang_member` | `(p_gang_id UUID, p_user_id UUID) → BOOLEAN` | Returns `true` if user is an approved member with non-deleted profile |
| `is_gang_admin` | `(p_gang_id UUID, p_user_id UUID) → BOOLEAN` | Returns `true` if user has `role='admin'`, `status='approved'`, non-deleted profile |
| `get_gang_by_invite_code` | `(p_code TEXT) → v2_gangs` | Bypasses RLS to look up gang by invite code (needed before membership) |
| `get_members_who_predicted` | `(p_gang_id UUID, p_fixture_id UUID) → SETOF UUID` | Returns user_ids of members with predictions; verifies caller is approved member |
| `prediction_deadline` | `(p_fixture_id UUID, p_gang_id UUID) → TIMESTAMPTZ` | Computes deadline: `start_datetime - prediction_deadline_mins` |

### 4.2 Policy Matrix

#### Reference tables (public read): `v2_sports`, `v2_leagues`, `v2_seasons`, `v2_league_teams`, `v2_players`, `v2_league_season_fixtures`, `v2_scenario_templates`, `v2_fixture_results`, `v2_fixture_live_scores`, `v2_league_season_team_players`

| Operation | Policy |
|-----------|--------|
| SELECT | All authenticated users (`true`) |
| INSERT/UPDATE/DELETE | None (system only via service role) |

#### `v2_profiles`

| Operation | Policy |
|-----------|--------|
| SELECT | Own profile (`id = auth.uid()`) OR profiles of users in any of the caller's gangs |
| UPDATE | Own profile only (`id = auth.uid()`) |

#### `v2_gangs`

| Operation | Policy |
|-----------|--------|
| SELECT | Approved members only, filtered by `is_deleted = false` |
| INSERT | Any authenticated user |
| UPDATE | Admin only (`is_gang_admin(id, auth.uid())`) |

#### `v2_gang_members`

| Operation | Policy |
|-----------|--------|
| SELECT | Own row (`user_id = auth.uid()`), OR admin sees all (`is_gang_admin`), OR approved members see other approved members |
| INSERT | Own row only (`user_id = auth.uid()`) |
| UPDATE | Admin can update others, OR user can update own row |

#### `v2_gang_league_seasons`

| Operation | Policy |
|-----------|--------|
| SELECT | Approved gang members |
| UPDATE | Admin only |

#### `v2_fixture_scenarios`

| Operation | Policy |
|-----------|--------|
| SELECT | Approved gang members |

#### `v2_predictions`

| Operation | Policy |
|-----------|--------|
| SELECT | Approved member AND (own predictions OR `now() >= prediction_deadline(fixture_id, gang_id)` OR fixture status NOT `'upcoming'`) |
| INSERT | Own `user_id`, approved member, `now() < prediction_deadline`, fixture status = `'upcoming'` |
| UPDATE | Same conditions as INSERT |

#### `v2_gang_fixture_standings`, `v2_gang_season_standings`

| Operation | Policy |
|-----------|--------|
| SELECT | Approved gang members |

#### `v2_notifications`

| Operation | Policy |
|-----------|--------|
| SELECT | Own only (`user_id = auth.uid()`) |
| UPDATE | Own only |

---

## 5. Triggers and Trigger Functions

### 5.1 `handle_new_user()` — Auto-create profile

- **Event:** `AFTER INSERT ON auth.users`
- **Action:** Creates a `v2_profiles` row with `id` and `email` from the new auth user.

### 5.2 `check_max_gang_members()` — Max 20 members per gang

- **Event:** `BEFORE INSERT OR UPDATE ON v2_gang_members` WHEN `NEW.status = 'approved'`
- **Action:** Counts approved members in gang. If `>= 20`, raises exception `P0001` (`MAX_MEMBERS_REACHED`).

### 5.3 `check_max_user_gangs()` — Max 40 gangs per user

- **Event:** `BEFORE INSERT OR UPDATE ON v2_gang_members` WHEN `NEW.status IN ('approved', 'pending')`
- **Action:** Counts user's active memberships (approved + pending, excluding current row). If `>= 40`, raises `P0001` (`MAX_GANGS_REACHED`).

### 5.4 `update_status_changed_at()` — Auto-update status timestamp

- **Event:** `BEFORE UPDATE ON v2_league_season_fixtures` WHEN `OLD.status IS DISTINCT FROM NEW.status`
- **Action:** Sets `status_changed_at = now()`.

### 5.5 `upsert_fixture_standings()` — On prediction submit

- **Event:** `AFTER INSERT OR UPDATE ON v2_predictions`
- **Action:** Upserts `v2_gang_fixture_standings` for `(gang_id, fixture_id, user_id)`, updating `predicted_count` and `last_submitted_at`.

### 5.6 `recalculate_full_standings()` — On scenario resolution/void

- **Event:** `AFTER UPDATE ON v2_fixture_scenarios` WHEN `is_resolved` or `is_voided` transitions to `true`
- **Action (4 steps):**
  1. Update fixture-level stats (`resolved_count`, `correct_count`, `points_earned`) excluding voided scenarios
  2. Compute fixture-level ranks (points DESC, `last_submitted_at` ASC; left/removed members sorted to bottom)
  3. Aggregate into season standings (`matches_predicted`, `total_points`, `total_correct`, `total_resolved`, `accuracy_pct`, `points_per_match`)
  4. Compute season-level ranks (total_points DESC, accuracy_pct DESC, matches_predicted DESC; left/removed to bottom)

### 5.7 `recalculate_gang_standings_ranks()` — On member status change

- **Event:** `AFTER UPDATE OF status ON v2_gang_members` when status transitions to/from active states
- **Action:** Recalculates ranks for fixture and season standings in the affected gang, sorting left/removed members to the bottom.

---

## 6. Stored Functions (RPCs)

### 6.1 `create_gang(p_gang_name TEXT, p_creator_id UUID) → UUID`

- **Security:** DEFINER
- **Logic:**
  1. Validate gang name: 3–50 characters after trim
  2. Advisory lock on `p_creator_id` (prevents max-gangs race conditions)
  3. Generate unique 6-char invite code via `generate_invite_code()` (A-Z, 0-9; up to 5 retries on collision)
  4. Insert into `v2_gangs`
  5. Insert creator as admin (status='approved') into `v2_gang_members`
  6. Find active season → enroll gang in `v2_gang_league_seasons`
  7. Seed scenarios for upcoming fixtures within 14-hour window
  8. Return new `gang_id`

### 6.2 `delete_gang(p_gang_id UUID, p_caller_id UUID) → VOID`

- **Security:** DEFINER
- **Logic:**
  1. Verify caller is gang admin (raises `42501` if not)
  2. Lock gang row with `FOR UPDATE`
  3. Verify gang exists and is not deleted (raises `P0001` if not)
  4. Soft-delete gang (`is_deleted=true`, `deleted_at=now()`)
  5. Insert `gang_deleted` notifications for all approved members with non-deleted profiles

### 6.3 `delete_account(p_user_id UUID) → VOID`

- **Security:** DEFINER
- **Logic:**
  1. Advisory lock on `p_user_id`
  2. Verify user exists in `v2_profiles`
  3. For each gang where user is sole admin:
     a. Find earliest-joined approved member with non-deleted profile
     b. If found: promote to admin, update `v2_gangs.created_by`, send `admin_promoted` notification
     c. If not found: soft-delete gang, send `gang_deleted` notifications to remaining members
  4. Soft-delete the user's profile

### 6.4 `seed_fixture_scenarios_for_gang(p_gang_id UUID, p_fixture_id UUID) → VOID`

- **Security:** DEFINER
- **Logic:** Looks up fixture's teams, copies active scenario templates into `v2_fixture_scenarios`, replaces `{Home Team}`/`{Away Team}` placeholders with team codes. Idempotent via `ON CONFLICT DO NOTHING`.

### 6.5 `seed_fixture_scenarios_for_all_active_gangs(p_fixture_id UUID) → VOID`

- **Security:** DEFINER
- **Logic:** Finds all non-deleted gangs enrolled in the fixture's league/season, calls `seed_fixture_scenarios_for_gang()` for each.

### 6.6 `run_seed_scenarios_cron() → JSONB`

- **Security:** DEFINER
- **Schedule:** Every 30 minutes (pg_cron — currently commented out in migration)
- **Logic:** Finds all (gang, fixture) pairs where fixture is upcoming and within the 14-hour seeding window, and scenarios haven't been seeded yet. Calls `seed_fixture_scenarios_for_gang()` for each. Per-pair failures don't abort the run.
- **Returns:** `{pairs_found, pairs_seeded, errors: [...]}`

### 6.7 `resolve_scenario(p_scenario_id UUID, p_correct_answer TEXT) → VOID`

- **Security:** DEFINER
- **Logic:** Sets `correct_answer` and `is_resolved=true` on the scenario. Updates all predictions: `is_correct = (value = correct_answer)`, `points_earned = (if correct then points else 0)`. Idempotent (skips if already resolved). Triggers standings recalculation automatically.

### 6.8 `void_fixture_scenarios(p_fixture_id UUID) → VOID`

- **Security:** DEFINER
- **Logic:** Sets `is_voided=true` on ALL scenarios for the fixture across all gangs. Creates/updates `v2_fixture_results` with `resolved_at=now()` and `match_winner_id=NULL`. Triggers standings recalculation excluding voided scenarios.

### 6.9 `mark_fixture_resolved(p_fixture_id UUID) → VOID`

- **Security:** DEFINER
- **Logic:** Sets fixture `status='resolved'`. Creates/updates `v2_fixture_results` with `resolved_at=now()`. Idempotent.

### 6.10 `all_scenarios_resolved(p_fixture_id UUID) → BOOLEAN`

- **Security:** DEFINER
- **Logic:** Returns `true` if all non-voided scenarios for the fixture have `is_resolved=true` (or no active scenarios exist).

### 6.11 `run_deadline_reminders_cron() → JSONB`

- **Security:** DEFINER
- **Schedule:** Every 15 minutes (pg_cron — currently commented out in migration)
- **Logic:** Finds (fixture, gang) pairs where the prediction deadline is ~1 hour away (20-minute window: deadline between `now() + 40 min` and `now() + 1h 20min`). For each pair, finds approved non-deleted members who haven't predicted and inserts `deadline_reminder` notifications (deduped via unique partial index).
- **Returns:** `{reminders_sent, pairs_checked}`

### 6.12 `generate_invite_code() → TEXT`

- Generates 6-character uppercase alphanumeric string (A-Z, 0-9).

---

## 7. Table-Level Grants

All tables in the `public` schema have `SELECT, INSERT, UPDATE, DELETE` granted to:
- `anon`
- `authenticated`
- `service_role`

Default privileges are set for future tables as well. (RLS is the actual access control layer.)

---

## 8. Edge Functions

### 8.1 `live-poll-resolve-fixtures` — Live polling and scenario resolution

- **Trigger:** pg_cron every 15 seconds
- **Purpose:** Fetches live match data from Sportmonks, updates live scorecards, detects status transitions, progressively resolves scenarios, and sends notifications.

**Query window:**
- `status IN ('upcoming', 'live')` AND `start_datetime` within active window (-1h to +6h)
- `status = 'completed'` AND `status_changed_at > now() - 120 min`

**Per-fixture flow:**
1. Fetch from Sportmonks: `/fixtures/{id}?include=batting,bowling,runs,manofmatch,tosswon,localteam,visitorteam`
2. Detect status transitions: `upcoming → live → completed → resolved` (or `→ abandoned / no_result`)
3. Upsert live scorecard data to `v2_fixture_live_scores`
4. Track `max_overs_seen` per team (defensive against non-monotonic API values)
5. Capture powerplay snapshot when `max_overs` first crosses 6.0
6. Load unresolved, non-voided scenarios → for each, call extractor to check if resolved
7. Map API IDs (team/player) to internal UUIDs (cached per run via `IdMapper`)
8. For range scenarios: map numeric values to bracket strings via `mapToBracket()`
9. Upsert results to `v2_fixture_results`, call `resolve_scenario()` RPC
10. When all scenarios resolved: call `mark_fixture_resolved()`, send `results_available` notifications
11. For `abandoned`/`no_result`: call `void_fixture_scenarios()` to void all scenarios

**Error handling:** Per-fixture try/catch; partial success returns HTTP 207.

**Environment variables:** `SB_SERVICE_ROLE_KEY` (preferred) / `SUPABASE_SERVICE_ROLE_KEY` (fallback), `SUPABASE_URL`

### 8.2 `sync-fixtures` — Daily fixture and player sync

- **Trigger:** pg_cron at 23:30 UTC (5 AM IST) daily
- **Purpose:** Imports IPL fixtures and player rosters from Sportmonks for the active season.

**Flow:**
1. Get active season from `v2_seasons`
2. Load existing team and fixture maps from DB
3. Fetch all fixtures for season from Sportmonks (with localteam, visitorteam, venue includes)
4. For each fixture: upsert teams (INSERT only, preserves seed data), upsert fixture (preserves protected statuses: live, completed, resolved), reset `pre_match_synced=false` on reschedule
5. For each unique team: fetch squad from Sportmonks → upsert players (updates role, batting_style, bowling_style) → link players to team in `v2_league_season_team_players` → delete stale player-team links (handles mid-season trades)

**Writes to:** `v2_league_season_fixtures`, `v2_league_teams`, `v2_players`, `v2_league_season_team_players`

### 8.3 `sync-fixtures-pre-match` — Pre-match delta sync

- **Trigger:** pg_cron every 15 minutes
- **Purpose:** Catches last-minute timing changes for matches 15–30 minutes away.

**Flow:**
1. Query fixtures where `pre_match_synced=false` AND `start_datetime` between `now + 15 min` and `now + 30 min`
2. For each: fetch fixture from Sportmonks
3. If `start_datetime` changed: update it, keep `pre_match_synced=false` (re-verify next cycle)
4. If unchanged: set `pre_match_synced=true`

### 8.4 Shared: `_shared/sportmonks.ts` — Sportmonks API Client

**Exported as `sportmonksClient` object with methods:**

| Method | Endpoint | Returns |
|--------|----------|---------|
| `getLeagueSeasons(leagueId)` | `/leagues/{id}?include=seasons` | `SmSeason[]` |
| `getTeamSquad(teamId, seasonId)` | `/teams/{id}/squad/{seasonId}` | `SmPlayer[]` |
| `getSeasonFixtures(seasonId, includes?)` | `/fixtures?filter[season_id]={id}` | `SmFixture[]` |
| `getFixture(fixtureId, includes?)` | `/fixtures/{id}` | `SmFixture` |
| `getLiveScores(includes?)` | `/livescores` | `SmFixture[]` |

**Configuration:** Base URL `https://cricket.sportmonks.com/api/v2.0`, max retries 2, exponential backoff (1s, 2s). Token from `SPORTMONKS_API_TOKEN` env var.

**Retry logic:** 429 → immediate return with `rateLimited: true`. 5xx → retry with backoff. 4xx → no retry.

**Common includes:** `batting,bowling,runs,manofmatch,tosswon,localteam,visitorteam`

### 8.5 Shared: `_shared/sportmonks-extractors.ts` — Scenario Resolution Extractors

**Core function:** `extractForScenario(slug, fixture, context?) → ExtractResult`

Routes to the appropriate extractor per scenario slug. Returns `{ resolved: true, value }` or `{ resolved: false, reason? }`.

**Extractor logic per slug:**

| Slug | Source | Resolution Condition |
|------|--------|---------------------|
| `toss_winner` | `fixture.toss_won_team_id` | Field is non-null |
| `match_winner` | `fixture.winner_team_id` | Field is non-null |
| `top_scorer` | Batting entries: max `score` | Match finished; tiebreaker: fewer balls |
| `top_wicket_taker` | Bowling entries: max `wickets` | Match finished; tiebreaker: fewer runs |
| `most_sixes_player` | Batting entries: sum `six_x` per player across innings | Match finished; tiebreaker: fewer balls |
| `player_of_match` | `fixture.man_of_match_id` | Field is non-null (may take hours) |
| `home_team_innings_score` | Runs entry for home team | Overs >= 20 OR wickets >= 10 OR match finished |
| `away_team_innings_score` | Runs entry for away team | Same as above |
| `home/away_team_powerplay_runs` | Runs snapshot at 6.0 overs | `previousMaxOvers < 6 AND currentOvers >= 6` |
| `home/away_team_powerplay_wickets_lost` | Wickets at powerplay milestone | Same timing as powerplay runs |
| `total_match_runs` | Sum all `runs.score` | Match finished |
| `total_match_sixes` | Sum all `batting.six_x` | Match finished |
| `total_match_wickets` | Sum all `runs.wickets` | Match finished |
| `first_wicket_over` | Min `fow_balls` in first innings | First batting entry with dismissal; `floor(fow_balls) + 1` |
| `fifty_scored` | Any `batting.score >= 50` | "Yes" mid-match; "No" only after match finished |
| `bowler_three_wickets` | Any `bowling.wickets >= 3` | "Yes" mid-match; "No" only after match finished |
| `super_over` | `fixture.super_over` boolean | Match finished |

**Bracket mapping:** `mapToBracket(value, options)` handles formats: exact numbers ("0"), ranges ("140-159"), less-than ("<140"), plus ("200+").

**Live scorecard extraction:** `extractLiveScorecard(fixture)` returns structured data for `v2_fixture_live_scores` including scores, overs, batting team, active batsmen, current bowler, run rate.

---

## 9. Seed Data

Seeded via migration `20260406000005_seed_data.sql`:

### Sports (1 row)
- Cricket (`api_id='cricket'`, `code='cricket'`)

### Leagues (1 row)
- Indian Premier League (`api_id='1'`, `code='ipl'`)

### Seasons (1 row)
- IPL 2026 (`api_id='1795'`, year=2026, start=2026-03-28, end=2026-06-01, `is_active=true`)

### Teams (10 rows)

| Code | Name | API ID | Color |
|------|------|--------|-------|
| CSK | Chennai Super Kings | 62 | team-specific |
| DC | Delhi Capitals | 816 | team-specific |
| PBKS | Punjab Kings | 63 | team-specific |
| KKR | Kolkata Knight Riders | 61 | team-specific |
| MI | Mumbai Indians | 60 | team-specific |
| RR | Rajasthan Royals | 64 | team-specific |
| RCB | Royal Challengers Bengaluru | 65 | team-specific |
| SRH | Sunrisers Hyderabad | 255 | team-specific |
| GT | Gujarat Titans | 2687 | team-specific |
| LSG | Lucknow Super Giants | 2688 | team-specific |

Each includes CDN `logo_url`.

### Scenario Templates (20 rows — 19 active, 1 inactive)

| # | Slug | Points | Input Type | Phase | Options |
|---|------|--------|-----------|-------|---------|
| 1 | `toss_winner` | 5 | team_pick | toss | — |
| 2 | `match_winner` | 10 | team_pick | end | — |
| 3 | `top_scorer` | 15 | player_pick | end | — |
| 4 | `top_wicket_taker` | 15 | player_pick | end | — |
| 5 | `most_sixes_player` | 15 | player_pick | end | — |
| 6 | `player_of_match` | 20 | player_pick | post_match | — |
| 7 | `home_team_innings_score` | 10 | range | team_innings_end | <140, 140-159, 160-179, 180-199, 200+ |
| 8 | `away_team_innings_score` | 10 | range | team_innings_end | <140, 140-159, 160-179, 180-199, 200+ |
| 9 | `home_team_powerplay_runs` | 10 | range | team_powerplay_end | <30, 30-39, 40-49, 50-59, 60+ |
| 10 | `away_team_powerplay_runs` | 10 | range | team_powerplay_end | <30, 30-39, 40-49, 50-59, 60+ |
| 11 | `home_team_powerplay_wickets_lost` | 10 | range | team_powerplay_end | 0, 1, 2, 3, 4+ |
| 12 | `away_team_powerplay_wickets_lost` | 10 | range | team_powerplay_end | 0, 1, 2, 3, 4+ |
| 13 | `total_match_runs` | 10 | range | end | <300, 300-339, 340-369, 370-399, 400+ |
| 14 | `total_match_sixes` | 10 | range | end | <10, 10-15, 16-20, 21-25, 26+ |
| 15 | `total_match_wickets` | 10 | range | end | <5, 5-8, 9-12, 13-15, 16+ |
| 16 | `total_match_catches` | 10 | range | end | <3, 3-5, 6-8, 9-11, 12+ | **INACTIVE** |
| 17 | `first_wicket_over` | 10 | range | first_wicket | 1, 2, 3, 4-5, 6+ |
| 18 | `fifty_scored` | 5 | yes_no | mid_match | — |
| 19 | `bowler_three_wickets` | 15 | yes_no | mid_match | — |
| 20 | `super_over` | 10 | yes_no | end | — |

**Max active points per match:** 210 (220 including inactive)

---

## 10. V1 → V2 Migration

Migration `20260406000006_migrate_from_v1.sql` handles the one-time data migration:

1. **Temporarily disables** max-members and max-gangs triggers
2. **Migrates profiles:** `profiles → v2_profiles` (maps `accepted_terms_at → terms_accepted_at`, sets `terms_version='1.0'` if terms were accepted)
3. **Migrates groups:** `groups → v2_gangs` (generates new 6-char invite codes, skips empty groups)
4. **Migrates members:** `group_members → v2_gang_members` (role mapping: `owner → admin`, others → `member`; only migrates `approved`/`pending` status)
5. **Auto-enrolls** migrated gangs in IPL 2026 season (45-min prediction deadline)
6. **Re-enables** triggers
7. **Drops** all v1 views, triggers, functions, tables, enums, indexes, and the `private` schema

---

## 11. Cron Jobs Summary

| Job | Schedule | Type | Status |
|-----|----------|------|--------|
| `sync-fixtures` | Daily 23:30 UTC | Edge Function | Active (manual pg_cron setup required) |
| `sync-fixtures-pre-match` | Every 15 min | Edge Function | Active (manual pg_cron setup required) |
| `live-poll-resolve-fixtures` | Every 15 sec | Edge Function | Active (manual pg_cron setup required) |
| `seed-scenarios` | Every 30 min | Postgres function (`run_seed_scenarios_cron`) | **Commented out** in migration |
| `deadline-reminders` | Every 15 min | Postgres function (`run_deadline_reminders_cron`) | **Commented out** in migration |
| `cleanup-rate-limits` | Daily 03:00 UTC | SQL (`DELETE FROM v2_rate_limits WHERE window_start < now() - interval '24 hours'`) | **Active** |

---

## 12. Config (config.toml)

| Setting | Value |
|---------|-------|
| Project ID | `bragg-v2` |
| API port | 54321 |
| DB port | 54322 |
| Shadow DB port | 54320 |
| Postgres version | 17 |
| Studio port | 54323 |
| Realtime | Enabled |
| JWT expiry | 3600s (1 hour) |
| Min password length | 6 |
| Email confirmations | Disabled |
| Anonymous signins | Disabled |
| Email rate limit | 2/hour |
| Edge runtime policy | per_worker |
| Deno major version | 2 |
| Max file size (storage) | 50 MiB |
| Max API rows | 1000 |

---

## 13. Environment Variables Required

| Variable | Used By | Purpose |
|----------|---------|---------|
| `SPORTMONKS_API_TOKEN` | All edge functions | Sportmonks Cricket API authentication |
| `SB_SERVICE_ROLE_KEY` | All edge functions (preferred) | Supabase service role key |
| `SUPABASE_SERVICE_ROLE_KEY` | All edge functions (fallback) | Supabase service role key |
| `SUPABASE_URL` | All edge functions | Supabase project URL |

---

## 14. Key Design Decisions

1. **Materialized standings:** `v2_gang_fixture_standings` and `v2_gang_season_standings` are maintained via triggers (not computed on read) for performance.
2. **Per-gang scenarios:** `v2_fixture_scenarios` are scoped per gang per fixture, allowing gang-level customization and independent resolution.
3. **Powerplay capture via live polling:** Powerplay data is not available post-match from Sportmonks — it must be captured during live polling when `max_overs` crosses 6.0. The `max_overs_seen` fields provide monotonic tracking against API cache anomalies.
4. **Advisory locks:** `create_gang` and `delete_account` RPCs use advisory locks to prevent race conditions on concurrent calls.
5. **Soft deletes everywhere:** Gangs and profiles are soft-deleted; member status tracks departure (never hard-deleted).
6. **Invite code collision handling:** `create_gang` retries up to 5 times on unique constraint violations.
7. **Idempotent operations:** All cron functions and resolution functions are idempotent — safe to re-run without side effects.
8. **Team-based filtering:** Team-specific scenarios filter by `team_id`, not inning number, because home team doesn't always bat first.
