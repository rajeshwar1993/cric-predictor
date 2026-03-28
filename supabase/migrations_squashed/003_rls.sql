-- Bragg — 003 Row Level Security Policies

-- ──────────────────────────────────────────────
-- Profiles
-- ──────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_profile" ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "read_group_member_profiles" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.user_id = profiles.id
      AND (
        -- Approved members: visible to all group members
        (gm.status = 'approved' AND is_group_member(gm.group_id, auth.uid()))
        OR
        -- Pending members: visible to admins/owners of the group
        (gm.status = 'pending' AND EXISTS (
          SELECT 1 FROM group_members admin_gm
          WHERE admin_gm.group_id = gm.group_id
            AND admin_gm.user_id = auth.uid()
            AND admin_gm.status = 'approved'
            AND admin_gm.role IN ('owner', 'admin')
        ))
      )
  )
);

CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ──────────────────────────────────────────────
-- Groups
-- ──────────────────────────────────────────────
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_groups" ON groups FOR SELECT
  USING (is_group_member(groups.id, auth.uid()));

-- Creators can read back their group (needed for INSERT...RETURNING)
CREATE POLICY "read_own_created_groups" ON groups FOR SELECT
  USING (auth.uid() = created_by);

-- Invite lookup handled by get_group_by_invite_code() SECURITY DEFINER function

CREATE POLICY "create_groups" ON groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- ──────────────────────────────────────────────
-- Group Members
-- ──────────────────────────────────────────────
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_members" ON group_members FOR SELECT
  USING (is_group_member(group_members.group_id, auth.uid()));

CREATE POLICY "read_own_membership" ON group_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "insert_join_request" ON group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_manage_members" ON group_members FOR UPDATE
  USING (is_group_admin(group_members.group_id, auth.uid()));

-- ──────────────────────────────────────────────
-- Matches (public read)
-- ──────────────────────────────────────────────
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_matches" ON matches FOR SELECT USING (true);

-- ──────────────────────────────────────────────
-- Match Group Settings
-- ──────────────────────────────────────────────
ALTER TABLE match_group_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_settings" ON match_group_settings FOR SELECT
  USING (is_group_member(match_group_settings.group_id, auth.uid()));

CREATE POLICY "admin_manage_settings" ON match_group_settings FOR ALL
  USING (is_group_admin(match_group_settings.group_id, auth.uid()));

-- ──────────────────────────────────────────────
-- Scenarios
-- ──────────────────────────────────────────────
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

-- Members see approved scenarios + their own pending ones
CREATE POLICY "read_approved_scenarios" ON scenarios FOR SELECT USING (
  is_group_member(scenarios.group_id, auth.uid())
  AND (
    (approval_status IN ('auto_approved', 'approved') AND is_removed = false)
    OR (created_by = auth.uid() AND approval_status = 'pending')
  )
);

-- Admins see all scenarios (including removed/pending) for management
CREATE POLICY "admin_read_all_scenarios" ON scenarios FOR SELECT
  USING (is_group_admin(scenarios.group_id, auth.uid()));

CREATE POLICY "create_scenario" ON scenarios FOR INSERT
  WITH CHECK (is_group_member(scenarios.group_id, auth.uid()));

CREATE POLICY "admin_manage_scenarios" ON scenarios FOR UPDATE
  USING (is_group_admin(scenarios.group_id, auth.uid()));

-- ──────────────────────────────────────────────
-- Predictions (deadline-aware)
-- ──────────────────────────────────────────────
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_predictions" ON predictions FOR SELECT
  USING (auth.uid() = user_id);

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
        OR now() > prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)
      )
  )
);

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
      AND COALESCE(mgs.scenarios_published, false) = true
      AND now() < prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)
  )
);

CREATE POLICY "update_own_prediction" ON predictions FOR UPDATE USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM scenarios s
    JOIN matches m ON m.id = s.match_id
    LEFT JOIN match_group_settings mgs ON mgs.group_id = s.group_id AND mgs.match_id = s.match_id
    WHERE s.id = predictions.scenario_id
      AND is_group_member(s.group_id, auth.uid())
      AND m.status = 'upcoming'
      AND COALESCE(mgs.is_locked, false) = false
      AND now() < prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)
  )
);

-- ──────────────────────────────────────────────
-- Notifications
-- ──────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_notifications" ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- Public Read Tables
-- ──────────────────────────────────────────────
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_players" ON players FOR SELECT USING (true);

ALTER TABLE match_squads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_match_squads" ON match_squads FOR SELECT USING (true);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_teams" ON teams FOR SELECT USING (true);

ALTER TABLE points_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_points_config" ON points_config FOR SELECT USING (true);
