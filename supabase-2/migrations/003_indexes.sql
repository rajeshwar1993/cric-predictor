-- ============================================================================
-- Migration 003: Database Indexes
-- ============================================================================
-- Purpose: Create performance indexes for all v2 tables to support common
-- query patterns (leaderboards, gang lists, live scores, cron jobs).
--
-- These indexes match the patterns defined in the PRD "Database Indexes"
-- section. Partial indexes are used where queries filter on boolean flags
-- (e.g., unresolved scenarios, unread notifications).
--
-- Note: The following unique indexes are already created in 001_initial_schema.sql
-- and are NOT duplicated here:
--   - uniq_one_active_season_per_league on v2_seasons(league_id) WHERE is_active = true
--   - uniq_notifications_dedup on v2_notifications(user_id, gang_id, fixture_id, type)
--       WHERE type IN ('deadline_reminder', 'results_available')
-- ============================================================================

-- --------------------------------------------------------------------------
-- v2_profiles
-- --------------------------------------------------------------------------

-- Email lookup (login, invite-by-email)
CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON v2_profiles (email);

-- --------------------------------------------------------------------------
-- v2_gangs
-- --------------------------------------------------------------------------

-- "My gangs" query — list gangs created by a user
CREATE INDEX IF NOT EXISTS idx_gangs_created_by
  ON v2_gangs (created_by);

-- Soft-delete filter — exclude deleted gangs from all list queries
CREATE INDEX IF NOT EXISTS idx_gangs_deleted
  ON v2_gangs (is_deleted);

-- --------------------------------------------------------------------------
-- v2_gang_members
-- --------------------------------------------------------------------------

-- Gang member list — filter by gang and membership status
CREATE INDEX IF NOT EXISTS idx_gang_members_status
  ON v2_gang_members (gang_id, status);

-- User's gangs — find all gangs a user belongs to, filtered by status
CREATE INDEX IF NOT EXISTS idx_gang_members_user
  ON v2_gang_members (user_id, status);

-- --------------------------------------------------------------------------
-- v2_gang_league_seasons
-- --------------------------------------------------------------------------

-- Season lookup — find all gangs participating in a given season
CREATE INDEX IF NOT EXISTS idx_gang_league_seasons_season
  ON v2_gang_league_seasons (season_id);

-- --------------------------------------------------------------------------
-- v2_league_season_fixtures
-- --------------------------------------------------------------------------

-- Season fixtures list — filter by season, status, ordered by start time
CREATE INDEX IF NOT EXISTS idx_fixtures_season_status
  ON v2_league_season_fixtures (season_id, status, start_datetime);

-- Cross-season fixture queries — used by seed-scenarios and
-- live-poll-resolve-fixtures crons that filter across all seasons
CREATE INDEX IF NOT EXISTS idx_fixtures_status_start
  ON v2_league_season_fixtures (status, start_datetime);

-- --------------------------------------------------------------------------
-- v2_fixture_scenarios
-- --------------------------------------------------------------------------

-- Gang + fixture scenario lookup (prediction page, standings aggregation)
CREATE INDEX IF NOT EXISTS idx_scenarios_gang_fixture
  ON v2_fixture_scenarios (gang_id, fixture_id);

-- Gang + season scenario lookup (season-level aggregation)
CREATE INDEX IF NOT EXISTS idx_scenarios_gang_season
  ON v2_fixture_scenarios (gang_id, season_id);

-- Cron: find unresolved scenarios across all gangs for a given fixture
CREATE INDEX IF NOT EXISTS idx_scenarios_fixture_unresolved
  ON v2_fixture_scenarios (fixture_id)
  WHERE is_resolved = false;

-- Standings aggregation: active (non-voided) scenarios per gang + fixture
CREATE INDEX IF NOT EXISTS idx_scenarios_gang_fixture_active
  ON v2_fixture_scenarios (gang_id, fixture_id)
  WHERE is_voided = false;

-- --------------------------------------------------------------------------
-- v2_predictions
-- --------------------------------------------------------------------------

-- User predictions per gang + fixture (prediction page, standings calc)
CREATE INDEX IF NOT EXISTS idx_predictions_gang_fixture_user
  ON v2_predictions (gang_id, fixture_id, user_id);

-- Scenario-level prediction lookup (resolution, scoring)
CREATE INDEX IF NOT EXISTS idx_predictions_scenario
  ON v2_predictions (scenario_id);

-- User predictions per gang + season (season leaderboard aggregation)
CREATE INDEX IF NOT EXISTS idx_predictions_gang_season_user
  ON v2_predictions (gang_id, season_id, user_id);

-- --------------------------------------------------------------------------
-- v2_gang_fixture_standings
-- --------------------------------------------------------------------------

-- Fixture standings per gang + season (leaderboard queries)
CREATE INDEX IF NOT EXISTS idx_fixture_standings_season
  ON v2_gang_fixture_standings (gang_id, season_id);

-- --------------------------------------------------------------------------
-- v2_gang_season_standings
-- --------------------------------------------------------------------------

-- Season standings for a user across all gangs
CREATE INDEX IF NOT EXISTS idx_season_standings_user
  ON v2_gang_season_standings (user_id);

-- --------------------------------------------------------------------------
-- v2_notifications
-- --------------------------------------------------------------------------

-- Fetch latest N notifications per user (notification bell, notification page)
CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON v2_notifications (user_id, created_at DESC);

-- Unread notification count badge — partial index for fast count
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON v2_notifications (user_id, is_read)
  WHERE is_read = false;
