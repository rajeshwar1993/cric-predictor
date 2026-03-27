-- Bragg — 010 Atomic Group Creation
-- Creates a group and adds the creator as owner in a single transaction.
-- Prevents orphaned groups if the member insert fails.

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

  -- Add creator as owner (same transaction — both succeed or both roll back)
  INSERT INTO group_members (group_id, user_id, status, role, approved_at)
  VALUES (v_group.id, p_created_by, 'approved', 'owner', now());

  RETURN QUERY SELECT v_group.id, v_group.name, v_group.invite_code, v_group.created_by, v_group.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
