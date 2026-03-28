-- Bragg — 011 Auto-create match_group_settings on group creation
-- When a group is created, insert match_group_settings rows for all
-- upcoming matches so predictions can be submitted immediately.

CREATE OR REPLACE FUNCTION create_group_with_owner(
  p_name TEXT,
  p_created_by UUID
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  invite_code TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_group RECORD;
BEGIN
  -- Insert group
  INSERT INTO groups (name, created_by)
  VALUES (p_name, p_created_by)
  RETURNING groups.id, groups.name, groups.invite_code, groups.created_by, groups.created_at
  INTO v_group;

  -- Add creator as owner
  INSERT INTO group_members (group_id, user_id, status, role, approved_at)
  VALUES (v_group.id, p_created_by, 'approved', 'owner', now());

  -- Auto-create match_group_settings for all upcoming matches
  -- This ensures predictions can be submitted (RLS INSERT policy
  -- joins on this table and needs a row to exist)
  INSERT INTO match_group_settings (group_id, match_id, is_locked, scenarios_published)
  SELECT v_group.id, m.id, false, true
  FROM matches m
  WHERE m.status = 'upcoming'
  ON CONFLICT (group_id, match_id) DO NOTHING;

  RETURN QUERY SELECT v_group.id, v_group.name, v_group.invite_code, v_group.created_by, v_group.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill: create missing match_group_settings for existing groups
INSERT INTO match_group_settings (group_id, match_id, is_locked, scenarios_published)
SELECT g.id, m.id, false, true
FROM groups g
CROSS JOIN matches m
WHERE m.status = 'upcoming'
ON CONFLICT (group_id, match_id) DO NOTHING;
