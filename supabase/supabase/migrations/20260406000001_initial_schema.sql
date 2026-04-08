-- =============================================================================
-- 001_initial_schema.sql
-- Bragg v2 — Initial database schema migration
-- Creates all enums, tables, foreign keys, unique constraints, and CHECK
-- constraints per PRD.V2.md Database Schema section.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE v2_match_status AS ENUM (
    'upcoming', 'live', 'completed', 'resolved', 'abandoned', 'no_result'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_member_role AS ENUM (
    'admin', 'member'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_member_status AS ENUM (
    'pending', 'approved', 'rejected', 'removed', 'left'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_scenario_type AS ENUM (
    'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_scenario_input_type AS ENUM (
    'team_pick', 'player_pick', 'range', 'yes_no'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_resolution_phase AS ENUM (
    'toss', 'first_wicket', 'team_powerplay_end', 'mid_match', 'team_innings_end', 'end', 'post_match'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_notification_type AS ENUM (
    'join_request', 'join_approved', 'join_rejected', 'new_member',
    'deadline_reminder', 'results_available', 'gang_deleted', 'admin_promoted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- ===== v2_sports =====

CREATE TABLE IF NOT EXISTS v2_sports (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id          TEXT        NOT NULL UNIQUE,
  name            TEXT        NOT NULL UNIQUE,
  code            TEXT        NOT NULL UNIQUE,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE v2_sports IS 'Sport definitions (e.g., Cricket). Top of the hierarchy.';

-- ===== v2_leagues =====

CREATE TABLE IF NOT EXISTS v2_leagues (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id          TEXT        NOT NULL UNIQUE,
  sport_id        UUID        NOT NULL REFERENCES v2_sports(id) ON DELETE RESTRICT,
  name            TEXT        NOT NULL,
  code            TEXT        NOT NULL UNIQUE,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE v2_leagues IS 'Leagues within a sport (e.g., Indian Premier League).';

-- ===== v2_seasons =====

CREATE TABLE IF NOT EXISTS v2_seasons (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id          TEXT        NOT NULL UNIQUE,
  league_id       UUID        NOT NULL REFERENCES v2_leagues(id) ON DELETE RESTRICT,
  name            TEXT        NOT NULL,
  year            INT         NOT NULL,
  start_date      DATE,
  end_date        DATE,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (league_id, year)
);

-- Partial unique index: only one active season per league
CREATE UNIQUE INDEX IF NOT EXISTS uniq_one_active_season_per_league
  ON v2_seasons (league_id) WHERE is_active = true;

COMMENT ON TABLE v2_seasons IS 'Season/edition of a league (e.g., IPL 2026).';

-- ===== v2_profiles =====

CREATE TABLE IF NOT EXISTS v2_profiles (
  id                    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name          TEXT,
  email                 TEXT        NOT NULL,
  date_of_birth         DATE,
  terms_version         TEXT,
  terms_accepted_at     TIMESTAMPTZ,
  onboarding_completed  BOOLEAN     NOT NULL DEFAULT false,
  is_deleted            BOOLEAN     NOT NULL DEFAULT false,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_onboarding_fields CHECK (
    onboarding_completed = false
    OR (
      display_name IS NOT NULL
      AND date_of_birth IS NOT NULL
      AND terms_version IS NOT NULL
    )
  )
);

COMMENT ON TABLE v2_profiles IS 'User accounts. References auth.users. Soft-deletable.';

-- ===== v2_gangs =====

CREATE TABLE IF NOT EXISTS v2_gangs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  invite_code     TEXT        NOT NULL UNIQUE,
  created_by      UUID        NOT NULL REFERENCES v2_profiles(id) ON DELETE RESTRICT,
  auto_accept     BOOLEAN     NOT NULL DEFAULT false,
  is_deleted      BOOLEAN     NOT NULL DEFAULT false,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE v2_gangs IS 'User-created private groups for prediction competitions.';

-- ===== v2_gang_members =====

CREATE TABLE IF NOT EXISTS v2_gang_members (
  gang_id         UUID            NOT NULL REFERENCES v2_gangs(id) ON DELETE CASCADE,
  user_id         UUID            NOT NULL REFERENCES v2_profiles(id) ON DELETE CASCADE,
  role            v2_member_role  NOT NULL DEFAULT 'member',
  status          v2_member_status NOT NULL DEFAULT 'pending',
  is_blocked      BOOLEAN         NOT NULL DEFAULT false,
  requested_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
  approved_at     TIMESTAMPTZ,
  departed_at     TIMESTAMPTZ,

  PRIMARY KEY (gang_id, user_id)
);

COMMENT ON TABLE v2_gang_members IS 'Gang membership with role and status tracking.';

-- ===== v2_gang_league_seasons =====

CREATE TABLE IF NOT EXISTS v2_gang_league_seasons (
  gang_id                   UUID    NOT NULL REFERENCES v2_gangs(id) ON DELETE CASCADE,
  league_id                 UUID    NOT NULL REFERENCES v2_leagues(id) ON DELETE RESTRICT,
  season_id                 UUID    NOT NULL REFERENCES v2_seasons(id) ON DELETE RESTRICT,
  prediction_deadline_mins  INT     NOT NULL DEFAULT 45,
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (gang_id, league_id, season_id)
);

COMMENT ON TABLE v2_gang_league_seasons IS 'Gang enrolled in a league season, with prediction settings.';

-- ===== v2_league_teams =====

CREATE TABLE IF NOT EXISTS v2_league_teams (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id          TEXT        NOT NULL UNIQUE,
  league_id       UUID        NOT NULL REFERENCES v2_leagues(id) ON DELETE RESTRICT,
  name            TEXT        NOT NULL,
  code            TEXT        NOT NULL,
  color           TEXT        NOT NULL,
  logo_url        TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (league_id, code)
);

COMMENT ON TABLE v2_league_teams IS 'Teams within a league (e.g., Chennai Super Kings).';

-- ===== v2_players =====
-- (Defined before v2_fixture_results which references it)

CREATE TABLE IF NOT EXISTS v2_players (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id          TEXT        NOT NULL UNIQUE,
  name            TEXT        NOT NULL,
  role            TEXT,
  batting_style   TEXT,
  bowling_style   TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE v2_players IS 'Player database populated from data provider.';

-- ===== v2_league_season_fixtures =====

CREATE TABLE IF NOT EXISTS v2_league_season_fixtures (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id              TEXT            NOT NULL UNIQUE,
  league_id           UUID            NOT NULL REFERENCES v2_leagues(id) ON DELETE RESTRICT,
  season_id           UUID            NOT NULL REFERENCES v2_seasons(id) ON DELETE RESTRICT,
  match_number        INT             NOT NULL,
  home_team_id        UUID            NOT NULL REFERENCES v2_league_teams(id) ON DELETE RESTRICT,
  away_team_id        UUID            NOT NULL REFERENCES v2_league_teams(id) ON DELETE RESTRICT,
  start_datetime      TIMESTAMPTZ     NOT NULL,
  venue_id            UUID,
  venue_name          TEXT            NOT NULL,
  status              v2_match_status NOT NULL DEFAULT 'upcoming',
  status_changed_at   TIMESTAMPTZ     NOT NULL DEFAULT now(),
  pre_match_synced    BOOLEAN         NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),

  UNIQUE (season_id, match_number)
);

COMMENT ON TABLE v2_league_season_fixtures IS 'Match schedule for a league season.';

-- ===== v2_fixture_results =====

CREATE TABLE IF NOT EXISTS v2_fixture_results (
  fixture_id                        UUID    PRIMARY KEY REFERENCES v2_league_season_fixtures(id) ON DELETE CASCADE,
  toss_winner_id                    UUID    REFERENCES v2_league_teams(id) ON DELETE RESTRICT,
  match_winner_id                   UUID    REFERENCES v2_league_teams(id) ON DELETE RESTRICT,
  top_scorer_id                     UUID    REFERENCES v2_players(id) ON DELETE RESTRICT,
  top_wicket_taker_id               UUID    REFERENCES v2_players(id) ON DELETE RESTRICT,
  most_sixes_player_id              UUID    REFERENCES v2_players(id) ON DELETE RESTRICT,
  player_of_match_id                UUID    REFERENCES v2_players(id) ON DELETE RESTRICT,
  home_team_innings_score            INT,
  away_team_innings_score            INT,
  home_team_powerplay_runs           INT,
  away_team_powerplay_runs           INT,
  home_team_powerplay_wickets_lost   INT,
  away_team_powerplay_wickets_lost   INT,
  total_match_runs                   INT,
  total_match_sixes                  INT,
  total_match_wickets                INT,
  total_match_catches                INT,
  first_wicket_over                  INT,
  fifty_scored                       BOOLEAN,
  bowler_three_wickets               BOOLEAN,
  super_over                         BOOLEAN,
  resolved_at                        TIMESTAMPTZ,
  created_at                         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE v2_fixture_results IS 'Resolved match stats and outcome data. One-to-one with fixture.';

-- ===== v2_fixture_live_scores =====

CREATE TABLE IF NOT EXISTS v2_fixture_live_scores (
  fixture_id                UUID            PRIMARY KEY REFERENCES v2_league_season_fixtures(id) ON DELETE CASCADE,
  home_team_score           TEXT,
  away_team_score           TEXT,
  home_team_overs           DECIMAL(4,1),
  away_team_overs           DECIMAL(4,1),
  batting_team_id           UUID            REFERENCES v2_league_teams(id) ON DELETE RESTRICT,
  current_run_rate          DECIMAL(4,2),
  last_6_balls              TEXT,
  striker_name              TEXT,
  striker_score             TEXT,
  non_striker_name          TEXT,
  non_striker_score         TEXT,
  current_bowler            TEXT,
  current_partnership       TEXT,
  raw_scorecard_json        JSONB,
  last_polled_at            TIMESTAMPTZ,
  home_team_max_overs_seen  DECIMAL(4,1),
  away_team_max_overs_seen  DECIMAL(4,1),
  updated_at                TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE v2_fixture_live_scores IS 'Live scorecard data for in-progress matches. One-to-one with fixture.';

-- ===== v2_scenario_templates =====

CREATE TABLE IF NOT EXISTS v2_scenario_templates (
  id                UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id          UUID                    NOT NULL REFERENCES v2_sports(id) ON DELETE RESTRICT,
  slug              TEXT                    NOT NULL UNIQUE,
  title             TEXT                    NOT NULL,
  input_type        v2_scenario_input_type  NOT NULL,
  options           JSONB,
  points            INT                     NOT NULL,
  resolution_phase  v2_resolution_phase     NOT NULL,
  is_active         BOOLEAN                 NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ             NOT NULL DEFAULT now()
);

COMMENT ON TABLE v2_scenario_templates IS 'System scenario definitions (reference table). Templates for prediction questions.';

-- ===== v2_fixture_scenarios =====

CREATE TABLE IF NOT EXISTS v2_fixture_scenarios (
  id                UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       UUID                    REFERENCES v2_scenario_templates(id) ON DELETE RESTRICT,
  league_id         UUID                    NOT NULL REFERENCES v2_leagues(id) ON DELETE RESTRICT,
  season_id         UUID                    NOT NULL REFERENCES v2_seasons(id) ON DELETE RESTRICT,
  fixture_id        UUID                    NOT NULL REFERENCES v2_league_season_fixtures(id) ON DELETE CASCADE,
  gang_id           UUID                    NOT NULL REFERENCES v2_gangs(id) ON DELETE CASCADE,
  type              v2_scenario_type        NOT NULL DEFAULT 'system',
  slug              TEXT                    NOT NULL,
  title             TEXT                    NOT NULL,
  input_type        v2_scenario_input_type  NOT NULL,
  options           JSONB,
  points            INT                     NOT NULL,
  resolution_phase  v2_resolution_phase     NOT NULL,
  correct_answer    TEXT,
  is_resolved       BOOLEAN                 NOT NULL DEFAULT false,
  is_voided         BOOLEAN                 NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ             NOT NULL DEFAULT now(),

  UNIQUE (gang_id, fixture_id, slug)
);

COMMENT ON TABLE v2_fixture_scenarios IS 'Prediction questions for a fixture, seeded from templates. Per gang per fixture.';

-- ===== v2_predictions =====

CREATE TABLE IF NOT EXISTS v2_predictions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES v2_profiles(id) ON DELETE CASCADE,
  scenario_id     UUID        NOT NULL REFERENCES v2_fixture_scenarios(id) ON DELETE CASCADE,
  gang_id         UUID        NOT NULL REFERENCES v2_gangs(id) ON DELETE CASCADE,
  league_id       UUID        NOT NULL REFERENCES v2_leagues(id) ON DELETE RESTRICT,
  season_id       UUID        NOT NULL REFERENCES v2_seasons(id) ON DELETE RESTRICT,
  fixture_id      UUID        NOT NULL REFERENCES v2_league_season_fixtures(id) ON DELETE CASCADE,
  value           TEXT        NOT NULL,
  is_correct      BOOLEAN,
  points_earned   INT         NOT NULL DEFAULT 0,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, scenario_id)
);

COMMENT ON TABLE v2_predictions IS 'User predictions for fixture scenarios.';

-- ===== v2_league_season_team_players =====

CREATE TABLE IF NOT EXISTS v2_league_season_team_players (
  league_id       UUID        NOT NULL REFERENCES v2_leagues(id) ON DELETE RESTRICT,
  season_id       UUID        NOT NULL REFERENCES v2_seasons(id) ON DELETE RESTRICT,
  team_id         UUID        NOT NULL REFERENCES v2_league_teams(id) ON DELETE RESTRICT,
  player_id       UUID        NOT NULL REFERENCES v2_players(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (season_id, team_id, player_id)
);

COMMENT ON TABLE v2_league_season_team_players IS 'Player-to-team mapping per season. A player can move between teams across seasons.';

-- ===== v2_gang_fixture_standings =====

CREATE TABLE IF NOT EXISTS v2_gang_fixture_standings (
  gang_id           UUID        NOT NULL REFERENCES v2_gangs(id) ON DELETE CASCADE,
  season_id         UUID        NOT NULL REFERENCES v2_seasons(id) ON DELETE RESTRICT,
  fixture_id        UUID        NOT NULL REFERENCES v2_league_season_fixtures(id) ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES v2_profiles(id) ON DELETE CASCADE,
  predicted_count   INT         NOT NULL DEFAULT 0,
  resolved_count    INT         NOT NULL DEFAULT 0,
  correct_count     INT         NOT NULL DEFAULT 0,
  points_earned     INT         NOT NULL DEFAULT 0,
  last_submitted_at TIMESTAMPTZ,
  rank              INT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (gang_id, fixture_id, user_id)
);

COMMENT ON TABLE v2_gang_fixture_standings IS 'Match leaderboard per gang (materialized). Updated on prediction submission and resolution.';

-- ===== v2_gang_season_standings =====

CREATE TABLE IF NOT EXISTS v2_gang_season_standings (
  gang_id             UUID          NOT NULL REFERENCES v2_gangs(id) ON DELETE CASCADE,
  season_id           UUID          NOT NULL REFERENCES v2_seasons(id) ON DELETE RESTRICT,
  user_id             UUID          NOT NULL REFERENCES v2_profiles(id) ON DELETE CASCADE,
  matches_predicted   INT           NOT NULL DEFAULT 0,
  total_points        INT           NOT NULL DEFAULT 0,
  total_correct       INT           NOT NULL DEFAULT 0,
  total_resolved      INT           NOT NULL DEFAULT 0,
  accuracy_pct        DECIMAL(5,2)  NOT NULL DEFAULT 0,
  points_per_match    DECIMAL(5,2)  NOT NULL DEFAULT 0,
  rank                INT,
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),

  PRIMARY KEY (gang_id, season_id, user_id)
);

COMMENT ON TABLE v2_gang_season_standings IS 'Season leaderboard per gang (materialized). Aggregated from fixture standings.';

-- ===== v2_notifications =====

CREATE TABLE IF NOT EXISTS v2_notifications (
  id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID                NOT NULL REFERENCES v2_profiles(id) ON DELETE CASCADE,
  type            v2_notification_type NOT NULL,
  message         TEXT                NOT NULL,
  gang_id         UUID                REFERENCES v2_gangs(id) ON DELETE CASCADE,
  fixture_id      UUID                REFERENCES v2_league_season_fixtures(id) ON DELETE CASCADE,
  is_read         BOOLEAN             NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ         NOT NULL DEFAULT now()
);

COMMENT ON TABLE v2_notifications IS 'User notifications for gang activity, deadlines, and results.';

-- Partial unique index: prevent duplicate deadline/results notifications
CREATE UNIQUE INDEX IF NOT EXISTS uniq_notifications_dedup
  ON v2_notifications (user_id, gang_id, fixture_id, type)
  WHERE type IN ('deadline_reminder', 'results_available');
