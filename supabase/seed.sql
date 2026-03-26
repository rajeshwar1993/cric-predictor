-- Bragg — Dev Seed Data
-- Creates test users, a test group, and sample predictions.
-- Loaded by `supabase db reset` (after all migrations).

-- Test Users (Supabase local auth creates users via gotrue, but we can
-- insert directly into auth.users for seeding. The handle_new_user trigger
-- will auto-create profiles.)

-- User 1: testadmin@bragg.local (group owner)
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'testadmin@bragg.local',
  '{"display_name": "Test Admin"}'::jsonb,
  'authenticated', 'authenticated',
  crypt('password123', gen_salt('bf')),
  now(), now(), now(), '', ''
);

-- User 2: testmember@bragg.local
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'testmember@bragg.local',
  '{"display_name": "Test Member"}'::jsonb,
  'authenticated', 'authenticated',
  crypt('password123', gen_salt('bf')),
  now(), now(), now(), '', ''
);

-- User 3: testmember2@bragg.local
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'testmember2@bragg.local',
  '{"display_name": "Test Member 2"}'::jsonb,
  'authenticated', 'authenticated',
  crypt('password123', gen_salt('bf')),
  now(), now(), now(), '', ''
);

-- Test Group: "Office Cricket Gang"
INSERT INTO groups (id, name, invite_code, created_by) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Office Cricket Gang', 'testcode1234', '00000000-0000-0000-0000-000000000001');

-- Group Members
INSERT INTO group_members (group_id, user_id, status, role, approved_at) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'approved', 'owner', now()),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'approved', 'member', now()),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'approved', 'member', now());

-- Mark Match 1 as completed (for testing leaderboard)
UPDATE matches SET
  status = 'completed',
  toss_winner = 'RCB',
  match_winner = 'RCB',
  top_scorer = 'Virat Kohli',
  top_scorer_runs = 72,
  top_wicket_taker = 'Mohammed Siraj',
  top_wicket_taker_wickets = 3,
  player_of_match = 'Virat Kohli',
  first_innings_score = 186,
  first_innings_wickets = 5,
  total_match_runs = 357,
  total_match_wickets = 13,
  total_match_sixes = 18,
  powerplay_score = 52,
  powerplay_wickets = 1,
  had_super_over = false,
  most_sixes_player = 'Travis Head',
  first_wicket_over = 4,
  batsman_scored_fifty = true,
  bowler_took_three = true,
  resolved_at = now()
WHERE match_number = 1;

-- Seed system scenarios for all first 3 matches in the test group
SELECT seed_system_scenarios('10000000-0000-0000-0000-000000000001', m.id)
FROM matches m WHERE m.match_number IN (1, 2, 3);

-- Sample predictions for Match 1 (completed) — User 1
INSERT INTO predictions (user_id, scenario_id, value, submitted_at) VALUES
  ('00000000-0000-0000-0000-000000000001',
   (SELECT id FROM scenarios WHERE group_id = '10000000-0000-0000-0000-000000000001' AND match_id = (SELECT id FROM matches WHERE match_number = 1) AND system_category = 'match_winner'),
   'RCB', now() - interval '2 hours'),
  ('00000000-0000-0000-0000-000000000001',
   (SELECT id FROM scenarios WHERE group_id = '10000000-0000-0000-0000-000000000001' AND match_id = (SELECT id FROM matches WHERE match_number = 1) AND system_category = 'toss_winner'),
   'SRH', now() - interval '2 hours'),
  ('00000000-0000-0000-0000-000000000001',
   (SELECT id FROM scenarios WHERE group_id = '10000000-0000-0000-0000-000000000001' AND match_id = (SELECT id FROM matches WHERE match_number = 1) AND system_category = 'first_innings_score'),
   '170-189', now() - interval '2 hours');

-- Sample predictions for Match 1 — User 2
INSERT INTO predictions (user_id, scenario_id, value, submitted_at) VALUES
  ('00000000-0000-0000-0000-000000000002',
   (SELECT id FROM scenarios WHERE group_id = '10000000-0000-0000-0000-000000000001' AND match_id = (SELECT id FROM matches WHERE match_number = 1) AND system_category = 'match_winner'),
   'SRH', now() - interval '3 hours'),
  ('00000000-0000-0000-0000-000000000002',
   (SELECT id FROM scenarios WHERE group_id = '10000000-0000-0000-0000-000000000001' AND match_id = (SELECT id FROM matches WHERE match_number = 1) AND system_category = 'toss_winner'),
   'RCB', now() - interval '3 hours');

-- Resolve predictions for Match 1
SELECT resolve_match_predictions((SELECT id FROM matches WHERE match_number = 1));
