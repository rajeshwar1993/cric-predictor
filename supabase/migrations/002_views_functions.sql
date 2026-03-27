-- Bragg — 002 Views & Functions

-- Views with security_invoker = true for RLS respect

CREATE OR REPLACE VIEW season_standings
WITH (security_invoker = true)
AS
SELECT
  gm.group_id,
  p.id as user_id,
  p.display_name,
  gm.role,
  COUNT(DISTINCT s.match_id) FILTER (WHERE pr.id IS NOT NULL) as matches_predicted,
  COALESCE(SUM(pr.points_earned), 0) as total_points,
  ROUND(
    COALESCE(SUM(pr.points_earned), 0)::numeric /
    NULLIF(COUNT(DISTINCT s.match_id) FILTER (WHERE pr.id IS NOT NULL), 0),
    2
  ) as points_per_match,
  ROUND(
    COALESCE(
      COUNT(CASE WHEN pr.is_correct = true THEN 1 END)::numeric /
      NULLIF(COUNT(CASE WHEN pr.is_correct IS NOT NULL THEN 1 END), 0) * 100,
      0
    ),
    1
  ) as accuracy_pct,
  ROW_NUMBER() OVER (
    PARTITION BY gm.group_id
    ORDER BY COALESCE(SUM(pr.points_earned), 0) DESC
  ) as rank
FROM group_members gm
JOIN profiles p ON p.id = gm.user_id
LEFT JOIN scenarios s ON s.group_id = gm.group_id
  AND s.is_removed = false
  AND s.approval_status IN ('auto_approved', 'approved')
LEFT JOIN predictions pr ON pr.scenario_id = s.id AND pr.user_id = p.id
WHERE gm.status = 'approved'
GROUP BY gm.group_id, p.id, p.display_name, gm.role;


CREATE OR REPLACE VIEW match_leaderboard
WITH (security_invoker = true)
AS
SELECT
  s.group_id,
  s.match_id,
  p.id as user_id,
  p.display_name,
  COUNT(DISTINCT pr.id) as predicted_count,
  COUNT(CASE WHEN pr.is_correct = true THEN 1 END) as correct_count,
  COUNT(CASE WHEN pr.is_correct IS NOT NULL THEN 1 END) as resolved_count,
  COALESCE(SUM(pr.points_earned), 0) as match_points,
  MIN(pr.submitted_at) as earliest_submission,
  ROW_NUMBER() OVER (
    PARTITION BY s.group_id, s.match_id
    ORDER BY COALESCE(SUM(pr.points_earned), 0) DESC, MIN(pr.submitted_at) ASC
  ) as rank
FROM scenarios s
JOIN predictions pr ON pr.scenario_id = s.id
JOIN profiles p ON p.id = pr.user_id
WHERE s.is_removed = false
  AND s.approval_status IN ('auto_approved', 'approved')
GROUP BY s.group_id, s.match_id, p.id, p.display_name;


-- DB Functions

-- 0. RLS helper: check group membership without triggering RLS (prevents infinite recursion)
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
      AND status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_group_admin(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
      AND status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- 0b. Invite code lookup (bypasses RLS so non-members can find a group to join)
CREATE OR REPLACE FUNCTION get_group_by_invite_code(p_invite_code TEXT)
RETURNS TABLE(id UUID, name TEXT, invite_code TEXT, created_by UUID, created_at TIMESTAMPTZ) AS $$
  SELECT g.id, g.name, g.invite_code, g.created_by, g.created_at
  FROM public.groups g
  WHERE g.invite_code = p_invite_code;
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- 1. Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();


-- 2. Seed system scenarios (idempotent)
CREATE OR REPLACE FUNCTION seed_system_scenarios(p_group_id UUID, p_match_id INT)
RETURNS void AS $$
BEGIN
  INSERT INTO scenarios (group_id, match_id, type, system_category, title, options, points, approval_status)
  VALUES
    (p_group_id, p_match_id, 'system', 'match_winner', 'Who will win?', '[]'::jsonb, 10, 'auto_approved'),
    (p_group_id, p_match_id, 'system', 'toss_winner', 'Who wins the toss?', '[]'::jsonb, 5, 'auto_approved'),
    (p_group_id, p_match_id, 'system', 'top_scorer', 'Top Scorer?', '[]'::jsonb, 15, 'auto_approved'),
    (p_group_id, p_match_id, 'system', 'top_wicket_taker', 'Top Wicket-Taker?', '[]'::jsonb, 15, 'auto_approved'),
    (p_group_id, p_match_id, 'system', 'player_of_match', 'Player of the Match?', '[]'::jsonb, 20, 'auto_approved'),
    (p_group_id, p_match_id, 'system', 'first_innings_score', 'First Innings Score?', '["<150", "150-169", "170-189", "190+"]'::jsonb, 10, 'auto_approved'),
    (p_group_id, p_match_id, 'system', 'total_match_runs', 'Total Match Runs?', '["<300", "300-349", "350-399", "400+"]'::jsonb, 10, 'auto_approved'),
    (p_group_id, p_match_id, 'system', 'powerplay_score', 'Powerplay Score (First 6 Overs)?', '["<40", "40-55", "56-70", "71+"]'::jsonb, 10, 'auto_approved'),
    (p_group_id, p_match_id, 'system', 'powerplay_wickets', 'Powerplay Wickets?', '["0", "1", "2", "3+"]'::jsonb, 10, 'auto_approved'),
    (p_group_id, p_match_id, 'system', 'total_sixes', 'Total Sixes?', '["<15", "15-25", "26-35", "36+"]'::jsonb, 10, 'auto_approved'),
    (p_group_id, p_match_id, 'system', 'total_wickets', 'Total Wickets?', '["12-15", "16-18", "19-21", "22+"]'::jsonb, 10, 'auto_approved'),
    (p_group_id, p_match_id, 'system', 'batsman_fifty', 'Will any batsman score 50+?', '["Yes", "No"]'::jsonb, 10, 'auto_approved'),
    (p_group_id, p_match_id, 'system', 'bowler_three_wkt', 'Will any bowler take 3+ wickets?', '["Yes", "No"]'::jsonb, 10, 'auto_approved'),
    (p_group_id, p_match_id, 'system', 'had_super_over', 'Will there be a Super Over?', '["Yes", "No"]'::jsonb, 20, 'auto_approved'),
    (p_group_id, p_match_id, 'system', 'most_sixes', 'Most Sixes Player?', '[]'::jsonb, 15, 'auto_approved'),
    (p_group_id, p_match_id, 'system', 'first_wicket_over', 'First Wicket in which Over?', '["1-2", "3-4", "5-6", "7+"]'::jsonb, 10, 'auto_approved')
  ON CONFLICT (group_id, match_id, system_category) WHERE system_category IS NOT NULL DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Resolve match predictions (SECURITY DEFINER to update all users' predictions)
CREATE OR REPLACE FUNCTION resolve_match_predictions(p_match_id INT)
RETURNS void AS $$
DECLARE
  v_match RECORD;
  v_scenario RECORD;
  v_correct_answer TEXT;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;

  FOR v_scenario IN
    SELECT * FROM scenarios
    WHERE match_id = p_match_id
      AND is_removed = false
      AND approval_status IN ('auto_approved', 'approved')
  LOOP
    v_correct_answer := NULL;

    CASE v_scenario.system_category
      WHEN 'match_winner' THEN v_correct_answer := v_match.match_winner;
      WHEN 'toss_winner' THEN v_correct_answer := v_match.toss_winner;
      WHEN 'top_scorer' THEN v_correct_answer := v_match.top_scorer;
      WHEN 'top_wicket_taker' THEN v_correct_answer := v_match.top_wicket_taker;
      WHEN 'player_of_match' THEN v_correct_answer := v_match.player_of_match;
      WHEN 'first_innings_score' THEN
        IF v_match.first_innings_score IS NOT NULL THEN
          IF v_match.first_innings_score < 150 THEN v_correct_answer := '<150';
          ELSIF v_match.first_innings_score >= 190 THEN v_correct_answer := '190+';
          ELSIF v_match.first_innings_score >= 170 THEN v_correct_answer := '170-189';
          ELSE v_correct_answer := '150-169';
          END IF;
        END IF;
      WHEN 'total_match_runs' THEN
        IF v_match.total_match_runs IS NOT NULL THEN
          IF v_match.total_match_runs < 300 THEN v_correct_answer := '<300';
          ELSIF v_match.total_match_runs >= 400 THEN v_correct_answer := '400+';
          ELSIF v_match.total_match_runs >= 350 THEN v_correct_answer := '350-399';
          ELSE v_correct_answer := '300-349';
          END IF;
        END IF;
      WHEN 'powerplay_score' THEN
        IF v_match.powerplay_score IS NOT NULL THEN
          IF v_match.powerplay_score < 40 THEN v_correct_answer := '<40';
          ELSIF v_match.powerplay_score >= 71 THEN v_correct_answer := '71+';
          ELSIF v_match.powerplay_score >= 56 THEN v_correct_answer := '56-70';
          ELSE v_correct_answer := '40-55';
          END IF;
        END IF;
      WHEN 'powerplay_wickets' THEN
        IF v_match.powerplay_wickets IS NOT NULL THEN
          IF v_match.powerplay_wickets >= 3 THEN v_correct_answer := '3+';
          ELSE v_correct_answer := v_match.powerplay_wickets::TEXT;
          END IF;
        END IF;
      WHEN 'total_sixes' THEN
        IF v_match.total_match_sixes IS NOT NULL THEN
          IF v_match.total_match_sixes < 15 THEN v_correct_answer := '<15';
          ELSIF v_match.total_match_sixes >= 36 THEN v_correct_answer := '36+';
          ELSIF v_match.total_match_sixes >= 26 THEN v_correct_answer := '26-35';
          ELSE v_correct_answer := '15-25';
          END IF;
        END IF;
      WHEN 'total_wickets' THEN
        IF v_match.total_match_wickets IS NOT NULL THEN
          IF v_match.total_match_wickets >= 22 THEN v_correct_answer := '22+';
          ELSIF v_match.total_match_wickets >= 19 THEN v_correct_answer := '19-21';
          ELSIF v_match.total_match_wickets >= 16 THEN v_correct_answer := '16-18';
          ELSE v_correct_answer := '12-15';
          END IF;
        END IF;
      WHEN 'batsman_fifty' THEN
        IF v_match.batsman_scored_fifty IS NOT NULL THEN
          v_correct_answer := CASE WHEN v_match.batsman_scored_fifty THEN 'Yes' ELSE 'No' END;
        END IF;
      WHEN 'bowler_three_wkt' THEN
        IF v_match.bowler_took_three IS NOT NULL THEN
          v_correct_answer := CASE WHEN v_match.bowler_took_three THEN 'Yes' ELSE 'No' END;
        END IF;
      WHEN 'had_super_over' THEN
        IF v_match.had_super_over IS NOT NULL THEN
          v_correct_answer := CASE WHEN v_match.had_super_over THEN 'Yes' ELSE 'No' END;
        END IF;
      WHEN 'most_sixes' THEN v_correct_answer := v_match.most_sixes_player;
      WHEN 'first_wicket_over' THEN
        IF v_match.first_wicket_over IS NOT NULL THEN
          IF v_match.first_wicket_over <= 2 THEN v_correct_answer := '1-2';
          ELSIF v_match.first_wicket_over <= 4 THEN v_correct_answer := '3-4';
          ELSIF v_match.first_wicket_over <= 6 THEN v_correct_answer := '5-6';
          ELSE v_correct_answer := '7+';
          END IF;
        END IF;
      ELSE
        -- Custom scenario — skip auto-resolution
        NULL;
    END CASE;

    IF v_correct_answer IS NOT NULL THEN
      UPDATE scenarios
      SET correct_answer = v_correct_answer, is_resolved = true
      WHERE id = v_scenario.id;

      UPDATE predictions
      SET is_correct = (value = v_correct_answer),
          points_earned = CASE WHEN value = v_correct_answer THEN v_scenario.points ELSE 0 END
      WHERE scenario_id = v_scenario.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Void abandoned match (SECURITY DEFINER to update all users' predictions)
CREATE OR REPLACE FUNCTION void_abandoned_match(p_match_id INT)
RETURNS void AS $$
BEGIN
  UPDATE predictions
  SET is_correct = false, points_earned = 0
  WHERE scenario_id IN (
    SELECT id FROM scenarios
    WHERE match_id = p_match_id AND is_resolved = false
  );

  UPDATE scenarios
  SET is_removed = true
  WHERE match_id = p_match_id AND is_resolved = false;

  UPDATE matches
  SET status = 'abandoned'
  WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
