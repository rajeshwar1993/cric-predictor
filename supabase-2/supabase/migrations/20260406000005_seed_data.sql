-- =============================================================================
-- 005_seed_data.sql
-- Bragg v2 — Seed reference data for IPL 2026
--
-- Source: docs/sportmonks-seed-ids.md (all Sportmonks IDs verified 2026-04-06)
-- PRD:    docs/PRD.V2.md § "System Scenario Definitions"
-- Story:  docs/stories/phase-0-foundation.md § FND-DB-005
--
-- Idempotent: all INSERTs use ON CONFLICT DO NOTHING.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. v2_sports (1 row)
-- ---------------------------------------------------------------------------
-- Sportmonks Cricket API is cricket-only (no /sports endpoint).
-- api_id set to 'cricket' to satisfy NOT NULL constraint.

INSERT INTO v2_sports (id, code, name, api_id)
VALUES (gen_random_uuid(), 'cricket', 'Cricket', 'cricket')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. v2_leagues (1 row)
-- ---------------------------------------------------------------------------
-- Sportmonks league_id = 1

INSERT INTO v2_leagues (id, api_id, sport_id, name, code)
VALUES (
  gen_random_uuid(),
  '1',
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'Indian Premier League',
  'ipl'
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. v2_seasons (1 row)
-- ---------------------------------------------------------------------------
-- Sportmonks season_id = 1795
-- start_date / end_date from fixture schedule

INSERT INTO v2_seasons (id, api_id, league_id, name, year, start_date, end_date, is_active)
VALUES (
  gen_random_uuid(),
  '1795',
  (SELECT id FROM v2_leagues WHERE code = 'ipl'),
  'IPL 2026',
  2026,
  '2026-03-28',
  '2026-06-01',
  true
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. v2_league_teams (10 rows)
-- ---------------------------------------------------------------------------
-- All api_id values from Sportmonks Cricket API.
-- Colors from web-app/src/lib/constants.ts (Sportmonks does not provide brand colors).
-- Logo URLs from Sportmonks CDN (image_path field).

-- CSK: api_id=2
INSERT INTO v2_league_teams (id, api_id, league_id, name, code, color, logo_url)
VALUES (
  gen_random_uuid(),
  '2',
  (SELECT id FROM v2_leagues WHERE code = 'ipl'),
  'Chennai Super Kings',
  'CSK',
  '#F9CD05',
  'https://cdn.sportmonks.com/images/cricket/teams/2/2.png'
)
ON CONFLICT DO NOTHING;

-- DC: api_id=3
INSERT INTO v2_league_teams (id, api_id, league_id, name, code, color, logo_url)
VALUES (
  gen_random_uuid(),
  '3',
  (SELECT id FROM v2_leagues WHERE code = 'ipl'),
  'Delhi Capitals',
  'DC',
  '#004C93',
  'https://cdn.sportmonks.com/images/cricket/teams/3/3.png'
)
ON CONFLICT DO NOTHING;

-- PBKS: api_id=4
INSERT INTO v2_league_teams (id, api_id, league_id, name, code, color, logo_url)
VALUES (
  gen_random_uuid(),
  '4',
  (SELECT id FROM v2_leagues WHERE code = 'ipl'),
  'Punjab Kings',
  'PBKS',
  '#ED1B24',
  'https://cdn.sportmonks.com/images/cricket/teams/4/4.png'
)
ON CONFLICT DO NOTHING;

-- KKR: api_id=5
INSERT INTO v2_league_teams (id, api_id, league_id, name, code, color, logo_url)
VALUES (
  gen_random_uuid(),
  '5',
  (SELECT id FROM v2_leagues WHERE code = 'ipl'),
  'Kolkata Knight Riders',
  'KKR',
  '#3B215D',
  'https://cdn.sportmonks.com/images/cricket/teams/5/5.png'
)
ON CONFLICT DO NOTHING;

-- MI: api_id=6
INSERT INTO v2_league_teams (id, api_id, league_id, name, code, color, logo_url)
VALUES (
  gen_random_uuid(),
  '6',
  (SELECT id FROM v2_leagues WHERE code = 'ipl'),
  'Mumbai Indians',
  'MI',
  '#004BA0',
  'https://cdn.sportmonks.com/images/cricket/teams/6/6.png'
)
ON CONFLICT DO NOTHING;

-- RR: api_id=7
INSERT INTO v2_league_teams (id, api_id, league_id, name, code, color, logo_url)
VALUES (
  gen_random_uuid(),
  '7',
  (SELECT id FROM v2_leagues WHERE code = 'ipl'),
  'Rajasthan Royals',
  'RR',
  '#EA1A85',
  'https://cdn.sportmonks.com/images/cricket/teams/7/7.png'
)
ON CONFLICT DO NOTHING;

-- RCB: api_id=8
INSERT INTO v2_league_teams (id, api_id, league_id, name, code, color, logo_url)
VALUES (
  gen_random_uuid(),
  '8',
  (SELECT id FROM v2_leagues WHERE code = 'ipl'),
  'Royal Challengers Bengaluru',
  'RCB',
  '#EC1C24',
  'https://cdn.sportmonks.com/images/cricket/teams/8/8.png'
)
ON CONFLICT DO NOTHING;

-- SRH: api_id=9
INSERT INTO v2_league_teams (id, api_id, league_id, name, code, color, logo_url)
VALUES (
  gen_random_uuid(),
  '9',
  (SELECT id FROM v2_leagues WHERE code = 'ipl'),
  'Sunrisers Hyderabad',
  'SRH',
  '#F26522',
  'https://cdn.sportmonks.com/images/cricket/teams/9/9.png'
)
ON CONFLICT DO NOTHING;

-- GT: api_id=1976
INSERT INTO v2_league_teams (id, api_id, league_id, name, code, color, logo_url)
VALUES (
  gen_random_uuid(),
  '1976',
  (SELECT id FROM v2_leagues WHERE code = 'ipl'),
  'Gujarat Titans',
  'GT',
  '#1C1C2B',
  'https://cdn.sportmonks.com/images/cricket/teams/24/1976.png'
)
ON CONFLICT DO NOTHING;

-- LSG: api_id=1979
INSERT INTO v2_league_teams (id, api_id, league_id, name, code, color, logo_url)
VALUES (
  gen_random_uuid(),
  '1979',
  (SELECT id FROM v2_leagues WHERE code = 'ipl'),
  'Lucknow Super Giants',
  'LSG',
  '#A72056',
  'https://cdn.sportmonks.com/images/cricket/teams/27/1979.png'
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. v2_scenario_templates (20 rows — 19 active + 1 inactive)
-- ---------------------------------------------------------------------------
-- All slugs, titles, input_types, options, points, and resolution_phases
-- per PRD.V2.md § "System Scenario Definitions".
-- Titles use {Home Team}/{Away Team} placeholders where applicable.
-- Options stored as JSONB arrays for range-type scenarios; NULL for others.

-- #1 toss_winner (team_pick, 5 pts, toss)
INSERT INTO v2_scenario_templates (id, sport_id, slug, title, input_type, options, points, resolution_phase, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'toss_winner',
  'Who wins the toss?',
  'team_pick',
  NULL,
  5,
  'toss',
  true
)
ON CONFLICT DO NOTHING;

-- #2 match_winner (team_pick, 10 pts, end)
INSERT INTO v2_scenario_templates (id, sport_id, slug, title, input_type, options, points, resolution_phase, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'match_winner',
  'Who wins the match?',
  'team_pick',
  NULL,
  10,
  'end',
  true
)
ON CONFLICT DO NOTHING;

-- #3 top_scorer (player_pick, 15 pts, end)
INSERT INTO v2_scenario_templates (id, sport_id, slug, title, input_type, options, points, resolution_phase, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'top_scorer',
  'Top run scorer of the match?',
  'player_pick',
  NULL,
  15,
  'end',
  true
)
ON CONFLICT DO NOTHING;

-- #4 top_wicket_taker (player_pick, 15 pts, end)
INSERT INTO v2_scenario_templates (id, sport_id, slug, title, input_type, options, points, resolution_phase, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'top_wicket_taker',
  'Top wicket-taker of the match?',
  'player_pick',
  NULL,
  15,
  'end',
  true
)
ON CONFLICT DO NOTHING;

-- #5 most_sixes_player (player_pick, 15 pts, end)
INSERT INTO v2_scenario_templates (id, sport_id, slug, title, input_type, options, points, resolution_phase, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'most_sixes_player',
  'Who hits the most sixes?',
  'player_pick',
  NULL,
  15,
  'end',
  true
)
ON CONFLICT DO NOTHING;

-- #6 player_of_match (player_pick, 20 pts, post_match)
INSERT INTO v2_scenario_templates (id, sport_id, slug, title, input_type, options, points, resolution_phase, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'player_of_match',
  'Player of the Match?',
  'player_pick',
  NULL,
  20,
  'post_match',
  true
)
ON CONFLICT DO NOTHING;

-- #7 home_team_innings_score (range, 10 pts, team_innings_end)
INSERT INTO v2_scenario_templates (id, sport_id, slug, title, input_type, options, points, resolution_phase, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'home_team_innings_score',
  '{Home Team} innings score?',
  'range',
  '["<140","140-159","160-179","180-199","200+"]'::jsonb,
  10,
  'team_innings_end',
  true
)
ON CONFLICT DO NOTHING;

-- #8 away_team_innings_score (range, 10 pts, team_innings_end)
INSERT INTO v2_scenario_templates (id, sport_id, slug, title, input_type, options, points, resolution_phase, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'away_team_innings_score',
  '{Away Team} innings score?',
  'range',
  '["<140","140-159","160-179","180-199","200+"]'::jsonb,
  10,
  'team_innings_end',
  true
)
ON CONFLICT DO NOTHING;

-- #9 home_team_powerplay_runs (range, 10 pts, team_powerplay_end)
INSERT INTO v2_scenario_templates (id, sport_id, slug, title, input_type, options, points, resolution_phase, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'home_team_powerplay_runs',
  '{Home Team} powerplay runs?',
  'range',
  '["<30","30-39","40-49","50-59","60+"]'::jsonb,
  10,
  'team_powerplay_end',
  true
)
ON CONFLICT DO NOTHING;

-- #10 away_team_powerplay_runs (range, 10 pts, team_powerplay_end)
INSERT INTO v2_scenario_templates (id, sport_id, slug, title, input_type, options, points, resolution_phase, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'away_team_powerplay_runs',
  '{Away Team} powerplay runs?',
  'range',
  '["<30","30-39","40-49","50-59","60+"]'::jsonb,
  10,
  'team_powerplay_end',
  true
)
ON CONFLICT DO NOTHING;

-- #11 home_team_powerplay_wickets_lost (range, 10 pts, team_powerplay_end)
INSERT INTO v2_scenario_templates (id, sport_id, slug, title, input_type, options, points, resolution_phase, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'home_team_powerplay_wickets_lost',
  '{Home Team} powerplay wickets lost?',
  'range',
  '["0","1","2","3","4+"]'::jsonb,
  10,
  'team_powerplay_end',
  true
)
ON CONFLICT DO NOTHING;

-- #12 away_team_powerplay_wickets_lost (range, 10 pts, team_powerplay_end)
INSERT INTO v2_scenario_templates (id, sport_id, slug, title, input_type, options, points, resolution_phase, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'away_team_powerplay_wickets_lost',
  '{Away Team} powerplay wickets lost?',
  'range',
  '["0","1","2","3","4+"]'::jsonb,
  10,
  'team_powerplay_end',
  true
)
ON CONFLICT DO NOTHING;

-- #13 total_match_runs (range, 10 pts, end)
INSERT INTO v2_scenario_templates (id, sport_id, slug, title, input_type, options, points, resolution_phase, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'total_match_runs',
  'Total runs in the match?',
  'range',
  '["<300","300-339","340-369","370-399","400+"]'::jsonb,
  10,
  'end',
  true
)
ON CONFLICT DO NOTHING;

-- #14 total_match_sixes (range, 10 pts, end)
INSERT INTO v2_scenario_templates (id, sport_id, slug, title, input_type, options, points, resolution_phase, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'total_match_sixes',
  'Total sixes in the match?',
  'range',
  '["<10","10-15","16-20","21-25","26+"]'::jsonb,
  10,
  'end',
  true
)
ON CONFLICT DO NOTHING;

-- #15 total_match_wickets (range, 10 pts, end)
INSERT INTO v2_scenario_templates (id, sport_id, slug, title, input_type, options, points, resolution_phase, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'total_match_wickets',
  'Total wickets in the match?',
  'range',
  '["<5","5-8","9-12","13-15","16+"]'::jsonb,
  10,
  'end',
  true
)
ON CONFLICT DO NOTHING;

-- #16 total_match_catches (INACTIVE — range, 10 pts, end)
-- Inactive until wicket_id mapping is available to distinguish catches from stumpings.
INSERT INTO v2_scenario_templates (id, sport_id, slug, title, input_type, options, points, resolution_phase, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'total_match_catches',
  'Total catches in the match?',
  'range',
  '["<3","3-5","6-8","9-11","12+"]'::jsonb,
  10,
  'end',
  false
)
ON CONFLICT DO NOTHING;

-- #17 first_wicket_over (range, 10 pts, first_wicket)
INSERT INTO v2_scenario_templates (id, sport_id, slug, title, input_type, options, points, resolution_phase, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'first_wicket_over',
  'When does the first wicket fall?',
  'range',
  '["1","2","3","4-5","6+"]'::jsonb,
  10,
  'first_wicket',
  true
)
ON CONFLICT DO NOTHING;

-- #18 fifty_scored (yes_no, 5 pts, mid_match)
INSERT INTO v2_scenario_templates (id, sport_id, slug, title, input_type, options, points, resolution_phase, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'fifty_scored',
  'Will anyone score 50+?',
  'yes_no',
  NULL,
  5,
  'mid_match',
  true
)
ON CONFLICT DO NOTHING;

-- #19 bowler_three_wickets (yes_no, 15 pts, mid_match)
INSERT INTO v2_scenario_templates (id, sport_id, slug, title, input_type, options, points, resolution_phase, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'bowler_three_wickets',
  'Will any bowler take 3+ wickets?',
  'yes_no',
  NULL,
  15,
  'mid_match',
  true
)
ON CONFLICT DO NOTHING;

-- #20 super_over (yes_no, 10 pts, end)
INSERT INTO v2_scenario_templates (id, sport_id, slug, title, input_type, options, points, resolution_phase, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM v2_sports WHERE code = 'cricket'),
  'super_over',
  'Will there be a super over?',
  'yes_no',
  NULL,
  10,
  'end',
  true
)
ON CONFLICT DO NOTHING;
