-- Bragg — 001 Initial Schema
-- Tables, enums, extensions, indexes

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE match_status AS ENUM ('upcoming', 'live', 'completed', 'abandoned', 'no_result');
CREATE TYPE member_status AS ENUM ('pending', 'approved', 'rejected', 'removed');
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE scenario_type AS ENUM ('system', 'custom');
CREATE TYPE scenario_approval AS ENUM ('auto_approved', 'pending', 'approved', 'rejected');

-- profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- groups
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- group_members
CREATE TABLE group_members (
  group_id UUID NOT NULL REFERENCES groups(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  status member_status NOT NULL DEFAULT 'pending',
  role member_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  PRIMARY KEY (group_id, user_id)
);

-- teams
CREATE TABLE teams (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  color TEXT NOT NULL,
  text_on_color TEXT NOT NULL DEFAULT 'dark',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- matches
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  match_number INT NOT NULL UNIQUE,
  team_a TEXT NOT NULL REFERENCES teams(code),
  team_b TEXT NOT NULL REFERENCES teams(code),
  date DATE NOT NULL,
  time_ist TIME NOT NULL,
  venue TEXT NOT NULL,
  status match_status NOT NULL DEFAULT 'upcoming',
  toss_winner TEXT,
  match_winner TEXT,
  top_scorer TEXT,
  top_scorer_runs INT,
  top_wicket_taker TEXT,
  top_wicket_taker_wickets INT,
  player_of_match TEXT,
  first_innings_score INT,
  first_innings_wickets INT,
  total_match_runs INT,
  total_match_wickets INT,
  total_match_sixes INT,
  powerplay_score INT,
  powerplay_wickets INT,
  had_super_over BOOLEAN,
  most_sixes_player TEXT,
  first_wicket_over INT,
  batsman_scored_fifty BOOLEAN,
  bowler_took_three BOOLEAN,
  current_score_a TEXT,
  current_score_b TEXT,
  current_overs_a DECIMAL(4,1),
  current_overs_b DECIMAL(4,1),
  current_batting_team TEXT,
  live_scorecard_json JSONB,
  last_polled_at TIMESTAMPTZ,
  api_match_id TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- match_group_settings
CREATE TABLE match_group_settings (
  group_id UUID NOT NULL REFERENCES groups(id),
  match_id INT NOT NULL REFERENCES matches(id),
  prediction_deadline TIMESTAMPTZ,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (group_id, match_id)
);

-- players
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_player_id TEXT UNIQUE,
  name TEXT NOT NULL,
  team_code TEXT NOT NULL REFERENCES teams(code),
  role TEXT,
  batting_style TEXT,
  bowling_style TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- match_squads
CREATE TABLE match_squads (
  match_id INT NOT NULL REFERENCES matches(id),
  player_id UUID NOT NULL REFERENCES players(id),
  team_code TEXT NOT NULL REFERENCES teams(code),
  is_playing_xi BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, player_id)
);

-- scenarios
CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id),
  match_id INT NOT NULL REFERENCES matches(id),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type scenario_type NOT NULL DEFAULT 'custom',
  system_category TEXT,
  title TEXT NOT NULL,
  description TEXT,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer TEXT,
  points INT NOT NULL DEFAULT 10 CHECK (points IN (5,10,15,20,25)),
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  approval_status scenario_approval NOT NULL DEFAULT 'pending',
  is_removed BOOLEAN NOT NULL DEFAULT false,
  removed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, match_id, system_category) NULLS NOT DISTINCT
);

-- predictions
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  scenario_id UUID NOT NULL REFERENCES scenarios(id),
  value TEXT NOT NULL,
  is_correct BOOLEAN,
  points_earned INT DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, scenario_id)
);

-- notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  group_id UUID REFERENCES groups(id),
  match_id INT REFERENCES matches(id),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- points_config
CREATE TABLE points_config (
  system_category TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  default_options JSONB NOT NULL DEFAULT '[]',
  points INT NOT NULL,
  is_auto_scorable BOOLEAN NOT NULL DEFAULT true,
  resolution_phase TEXT
);

-- Indexes
CREATE INDEX idx_groups_invite_code ON groups(invite_code);
CREATE INDEX idx_group_members_status ON group_members(group_id, status);
CREATE INDEX idx_group_members_user ON group_members(user_id, status);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_date ON matches(date);
CREATE INDEX idx_scenarios_group_match ON scenarios(group_id, match_id);
CREATE INDEX idx_scenarios_approval ON scenarios(group_id, approval_status);
CREATE INDEX idx_predictions_scenario ON predictions(scenario_id);
CREATE INDEX idx_predictions_user ON predictions(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_players_team ON players(team_code);
CREATE INDEX idx_players_api_id ON players(api_player_id);
CREATE INDEX idx_match_squads_match ON match_squads(match_id);
