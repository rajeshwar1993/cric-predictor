-- Bragg — 004 Seed Data
-- Points config, IPL teams, IPL 2026 fixtures (first 2 weeks)

-- Points Config (system scenario definitions)
INSERT INTO points_config (system_category, label, description, default_options, points, is_auto_scorable, resolution_phase) VALUES
  ('match_winner', 'Who will win?', 'Predict the match winner', '[]'::jsonb, 10, true, 'end'),
  ('toss_winner', 'Who wins the toss?', 'Predict the toss winner', '[]'::jsonb, 5, true, 'toss'),
  ('top_scorer', 'Top Scorer?', 'Predict the highest run scorer', '[]'::jsonb, 15, true, 'end'),
  ('top_wicket_taker', 'Top Wicket-Taker?', 'Predict the highest wicket taker', '[]'::jsonb, 15, true, 'end'),
  ('player_of_match', 'Player of the Match?', 'Predict Player of the Match', '[]'::jsonb, 20, true, 'post_match'),
  ('first_innings_score', 'First Innings Score?', 'Predict the first innings total', '["<150", "150-169", "170-189", "190+"]'::jsonb, 10, true, 'innings_break'),
  ('total_match_runs', 'Total Match Runs?', 'Predict total runs in the match', '["<300", "300-349", "350-399", "400+"]'::jsonb, 10, true, 'end'),
  ('powerplay_score', 'Powerplay Score (First 6 Overs)?', 'Predict first batting powerplay score', '["<40", "40-55", "56-70", "71+"]'::jsonb, 10, true, 'powerplay'),
  ('powerplay_wickets', 'Powerplay Wickets?', 'Predict wickets in first powerplay', '["0", "1", "2", "3+"]'::jsonb, 10, true, 'powerplay'),
  ('total_sixes', 'Total Sixes?', 'Predict total sixes in the match', '["<15", "15-25", "26-35", "36+"]'::jsonb, 10, true, 'end'),
  ('total_wickets', 'Total Wickets?', 'Predict total wickets in the match', '["12-15", "16-18", "19-21", "22+"]'::jsonb, 10, true, 'end'),
  ('batsman_fifty', 'Will any batsman score 50+?', 'Predict if any batsman scores a half century', '["Yes", "No"]'::jsonb, 10, true, 'mid_match'),
  ('bowler_three_wkt', 'Will any bowler take 3+ wickets?', 'Predict if any bowler takes 3 or more wickets', '["Yes", "No"]'::jsonb, 10, true, 'mid_match'),
  ('had_super_over', 'Will there be a Super Over?', 'Predict if match goes to Super Over', '["Yes", "No"]'::jsonb, 20, true, 'end'),
  ('most_sixes', 'Most Sixes Player?', 'Predict the player who hits most sixes', '[]'::jsonb, 15, true, 'end'),
  ('first_wicket_over', 'First Wicket in which Over?', 'Predict when the first wicket falls', '["1-2", "3-4", "5-6", "7+"]'::jsonb, 10, true, 'first_wicket')
ON CONFLICT (system_category) DO NOTHING;

-- IPL Teams
INSERT INTO teams (code, name, short_name, color, text_on_color) VALUES
  ('CSK', 'Chennai Super Kings', 'Chennai', '#F9CD05', 'dark'),
  ('MI', 'Mumbai Indians', 'Mumbai', '#004BA0', 'light'),
  ('RCB', 'Royal Challengers Bengaluru', 'Bengaluru', '#EC1C24', 'dark'),
  ('KKR', 'Kolkata Knight Riders', 'Kolkata', '#3B215D', 'light'),
  ('DC', 'Delhi Capitals', 'Delhi', '#004C93', 'light'),
  ('SRH', 'Sunrisers Hyderabad', 'Hyderabad', '#F26522', 'dark'),
  ('RR', 'Rajasthan Royals', 'Rajasthan', '#EA1A85', 'dark'),
  ('PBKS', 'Punjab Kings', 'Punjab', '#ED1B24', 'dark'),
  ('GT', 'Gujarat Titans', 'Gujarat', '#1C1C2B', 'light'),
  ('LSG', 'Lucknow Super Giants', 'Lucknow', '#A72056', 'light')
ON CONFLICT (code) DO NOTHING;

-- Match fixtures are synced from the API via the sync-data edge function.
-- No hardcoded fixtures here.
