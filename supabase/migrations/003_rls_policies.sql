-- Bragg — 003 RLS Policies

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_own_profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "read_group_member_profiles" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members gm1
    JOIN group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid() AND gm1.status = 'approved'
      AND gm2.user_id = profiles.id AND gm2.status = 'approved'
  )
);
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_groups" ON groups FOR SELECT USING (
  auth.uid() IN (
    SELECT user_id FROM group_members
    WHERE group_id = groups.id AND status = 'approved'
  )
);
-- Authenticated users can look up groups by invite code (for join flow)
CREATE POLICY "read_group_by_invite" ON groups FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "create_groups" ON groups FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Group Members
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_members" ON group_members FOR SELECT USING (
  auth.uid() IN (
    SELECT user_id FROM group_members gm
    WHERE gm.group_id = group_members.group_id AND gm.status = 'approved'
  )
);
CREATE POLICY "read_own_membership" ON group_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_join_request" ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin_manage_members" ON group_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM group_members AS admin_check
    WHERE admin_check.group_id = group_members.group_id
      AND admin_check.user_id = auth.uid()
      AND admin_check.role IN ('owner', 'admin')
      AND admin_check.status = 'approved'
  )
);

-- Matches (public read)
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_matches" ON matches FOR SELECT USING (true);

-- Match Group Settings
ALTER TABLE match_group_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_settings" ON match_group_settings FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = match_group_settings.group_id
      AND user_id = auth.uid()
      AND status = 'approved'
  )
);
CREATE POLICY "admin_manage_settings" ON match_group_settings FOR ALL USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = match_group_settings.group_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'approved'
  )
);

-- Scenarios
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_approved_scenarios" ON scenarios FOR SELECT USING (
  (approval_status IN ('auto_approved', 'approved') AND is_removed = false)
  OR (created_by = auth.uid() AND approval_status = 'pending')
);
CREATE POLICY "create_scenario" ON scenarios FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = scenarios.group_id
      AND user_id = auth.uid()
      AND status = 'approved'
  )
);
CREATE POLICY "admin_manage_scenarios" ON scenarios FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = scenarios.group_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'approved'
  )
);

-- Predictions (deadline-aware RLS)
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_own_predictions" ON predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "read_others_after_deadline" ON predictions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scenarios s
    JOIN matches m ON m.id = s.match_id
    LEFT JOIN match_group_settings mgs ON mgs.group_id = s.group_id AND mgs.match_id = s.match_id
    WHERE s.id = predictions.scenario_id
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
CREATE POLICY "insert_own_prediction" ON predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_prediction" ON predictions FOR UPDATE USING (auth.uid() = user_id);

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_own_notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
-- Notifications are inserted by server actions (authenticated user context)
-- Restrict to own user_id to prevent cross-user notification injection
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Players (public read)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_players" ON players FOR SELECT USING (true);

-- Match Squads (public read)
ALTER TABLE match_squads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_match_squads" ON match_squads FOR SELECT USING (true);

-- Teams (public read)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_teams" ON teams FOR SELECT USING (true);

-- Points Config (public read)
ALTER TABLE points_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_points_config" ON points_config FOR SELECT USING (true);
