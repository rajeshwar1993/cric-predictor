-- Bragg — 009 RLS Audit Fixes
-- Fixes from security audit: helper functions, policy hardening, index cleanup

-- 1. RLS helper functions (bypass RLS for membership checks, prevents infinite recursion)
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

-- 2. Invite code lookup (bypasses RLS so non-members can find a group to join)
CREATE OR REPLACE FUNCTION get_group_by_invite_code(p_invite_code TEXT)
RETURNS TABLE(id UUID, name TEXT, invite_code TEXT, created_by UUID, created_at TIMESTAMPTZ) AS $$
  SELECT g.id, g.name, g.invite_code, g.created_by, g.created_at
  FROM public.groups g
  WHERE g.invite_code = p_invite_code;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. Fix scenarios constraint: replace NULLS NOT DISTINCT with partial unique index
ALTER TABLE scenarios DROP CONSTRAINT IF EXISTS scenarios_group_id_match_id_system_category_key;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_system_scenario
  ON scenarios(group_id, match_id, system_category)
  WHERE system_category IS NOT NULL;

-- 4. Update seed_system_scenarios to use partial index
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

-- 5. Remove duplicate invite_code index
DROP INDEX IF EXISTS idx_groups_invite_code;

-- 6. Fix RLS policies — profiles
DROP POLICY IF EXISTS "read_group_member_profiles" ON profiles;
CREATE POLICY "read_group_member_profiles" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.user_id = profiles.id
      AND gm.status = 'approved'
      AND is_group_member(gm.group_id, auth.uid())
  )
);

-- 7. Fix RLS policies — groups
DROP POLICY IF EXISTS "read_groups" ON groups;
CREATE POLICY "read_groups" ON groups FOR SELECT USING (
  is_group_member(groups.id, auth.uid())
);

DROP POLICY IF EXISTS "read_group_by_invite" ON groups;
-- Invite lookup now handled by get_group_by_invite_code() SECURITY DEFINER function

DROP POLICY IF EXISTS "read_own_created_groups" ON groups;
CREATE POLICY "read_own_created_groups" ON groups FOR SELECT USING (auth.uid() = created_by);

-- 8. Fix RLS policies — group_members
DROP POLICY IF EXISTS "read_members" ON group_members;
CREATE POLICY "read_members" ON group_members FOR SELECT USING (
  is_group_member(group_members.group_id, auth.uid())
);

DROP POLICY IF EXISTS "admin_manage_members" ON group_members;
CREATE POLICY "admin_manage_members" ON group_members FOR UPDATE USING (
  is_group_admin(group_members.group_id, auth.uid())
);

-- 9. Fix RLS policies — match_group_settings
DROP POLICY IF EXISTS "read_settings" ON match_group_settings;
CREATE POLICY "read_settings" ON match_group_settings FOR SELECT USING (
  is_group_member(match_group_settings.group_id, auth.uid())
);

DROP POLICY IF EXISTS "admin_manage_settings" ON match_group_settings;
CREATE POLICY "admin_manage_settings" ON match_group_settings FOR ALL USING (
  is_group_admin(match_group_settings.group_id, auth.uid())
);

-- 10. Fix RLS policies — scenarios
DROP POLICY IF EXISTS "read_approved_scenarios" ON scenarios;
CREATE POLICY "read_approved_scenarios" ON scenarios FOR SELECT USING (
  is_group_member(scenarios.group_id, auth.uid())
  AND (
    (approval_status IN ('auto_approved', 'approved') AND is_removed = false)
    OR (created_by = auth.uid() AND approval_status = 'pending')
  )
);

DROP POLICY IF EXISTS "create_scenario" ON scenarios;
CREATE POLICY "create_scenario" ON scenarios FOR INSERT WITH CHECK (
  is_group_member(scenarios.group_id, auth.uid())
);

DROP POLICY IF EXISTS "admin_manage_scenarios" ON scenarios;
DROP POLICY IF EXISTS "admin_read_all_scenarios" ON scenarios;
CREATE POLICY "admin_read_all_scenarios" ON scenarios FOR SELECT USING (
  is_group_admin(scenarios.group_id, auth.uid())
);
CREATE POLICY "admin_manage_scenarios" ON scenarios FOR UPDATE USING (
  is_group_admin(scenarios.group_id, auth.uid())
);

-- 11. Fix RLS policies — predictions
DROP POLICY IF EXISTS "read_others_after_deadline" ON predictions;
CREATE POLICY "read_others_after_deadline" ON predictions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scenarios s
    JOIN matches m ON m.id = s.match_id
    LEFT JOIN match_group_settings mgs ON mgs.group_id = s.group_id AND mgs.match_id = s.match_id
    WHERE s.id = predictions.scenario_id
      AND is_group_member(s.group_id, auth.uid())
      AND (
        m.status IN ('live', 'completed', 'abandoned', 'no_result')
        OR mgs.is_locked = true
        OR now() > COALESCE(
          mgs.prediction_deadline,
          (m.date + m.time_ist - interval '45 minutes') AT TIME ZONE 'Asia/Kolkata'
        )
      )
  )
);

DROP POLICY IF EXISTS "insert_own_prediction" ON predictions;
CREATE POLICY "insert_own_prediction" ON predictions FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM scenarios s
    JOIN matches m ON m.id = s.match_id
    LEFT JOIN match_group_settings mgs ON mgs.group_id = s.group_id AND mgs.match_id = s.match_id
    WHERE s.id = predictions.scenario_id
      AND is_group_member(s.group_id, auth.uid())
      AND m.status = 'upcoming'
      AND COALESCE(mgs.is_locked, false) = false
      AND now() < COALESCE(
        mgs.prediction_deadline,
        (m.date + m.time_ist - interval '45 minutes') AT TIME ZONE 'Asia/Kolkata'
      )
  )
);

DROP POLICY IF EXISTS "update_own_prediction" ON predictions;
CREATE POLICY "update_own_prediction" ON predictions FOR UPDATE USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM scenarios s
    JOIN matches m ON m.id = s.match_id
    LEFT JOIN match_group_settings mgs ON mgs.group_id = s.group_id AND mgs.match_id = s.match_id
    WHERE s.id = predictions.scenario_id
      AND m.status = 'upcoming'
      AND COALESCE(mgs.is_locked, false) = false
      AND now() < COALESCE(
        mgs.prediction_deadline,
        (m.date + m.time_ist - interval '45 minutes') AT TIME ZONE 'Asia/Kolkata'
      )
  )
);
