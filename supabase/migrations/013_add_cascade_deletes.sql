-- Bragg — 013 Add ON DELETE CASCADE to Foreign Keys
-- Prevents orphaned rows when parent records are deleted.

-- group_members → groups
ALTER TABLE group_members DROP CONSTRAINT group_members_group_id_fkey;
ALTER TABLE group_members ADD CONSTRAINT group_members_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- group_members → profiles
ALTER TABLE group_members DROP CONSTRAINT group_members_user_id_fkey;
ALTER TABLE group_members ADD CONSTRAINT group_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- match_group_settings → groups
ALTER TABLE match_group_settings DROP CONSTRAINT match_group_settings_group_id_fkey;
ALTER TABLE match_group_settings ADD CONSTRAINT match_group_settings_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- match_group_settings → matches
ALTER TABLE match_group_settings DROP CONSTRAINT match_group_settings_match_id_fkey;
ALTER TABLE match_group_settings ADD CONSTRAINT match_group_settings_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

-- scenarios → groups
ALTER TABLE scenarios DROP CONSTRAINT scenarios_group_id_fkey;
ALTER TABLE scenarios ADD CONSTRAINT scenarios_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- scenarios → matches
ALTER TABLE scenarios DROP CONSTRAINT scenarios_match_id_fkey;
ALTER TABLE scenarios ADD CONSTRAINT scenarios_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

-- predictions → profiles
ALTER TABLE predictions DROP CONSTRAINT predictions_user_id_fkey;
ALTER TABLE predictions ADD CONSTRAINT predictions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- predictions → scenarios
ALTER TABLE predictions DROP CONSTRAINT predictions_scenario_id_fkey;
ALTER TABLE predictions ADD CONSTRAINT predictions_scenario_id_fkey
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE;

-- notifications → groups (nullable FK, set null on delete)
ALTER TABLE notifications DROP CONSTRAINT notifications_group_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL;

-- notifications → matches (nullable FK, set null on delete)
ALTER TABLE notifications DROP CONSTRAINT notifications_match_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL;

-- notifications → profiles
ALTER TABLE notifications DROP CONSTRAINT notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
