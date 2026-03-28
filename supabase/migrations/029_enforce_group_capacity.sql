-- Bragg — 011 Enforce Group Capacity at DB Level
-- Prevents race conditions where concurrent approvals exceed MAX_MEMBERS_PER_GROUP.
-- The trigger fires BEFORE INSERT or UPDATE on group_members, checking the count
-- atomically within the same transaction.

CREATE OR REPLACE FUNCTION enforce_group_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_max_members CONSTANT INT := 10;  -- Must match LIMITS.MAX_MEMBERS_PER_GROUP
  v_current_count INT;
BEGIN
  -- Only enforce when a member is being approved (or inserted as approved)
  IF NEW.status != 'approved' THEN
    RETURN NEW;
  END IF;

  -- If this is an UPDATE and the old status was already approved, allow it
  -- (e.g., role changes from member → admin don't change the count)
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  -- Count current approved members (excluding the row being modified)
  SELECT COUNT(*) INTO v_current_count
  FROM group_members
  WHERE group_id = NEW.group_id
    AND status = 'approved'
    AND user_id != NEW.user_id;

  IF v_current_count >= v_max_members THEN
    RAISE EXCEPTION 'Group capacity exceeded: maximum % approved members allowed', v_max_members
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists (idempotent)
DROP TRIGGER IF EXISTS trg_enforce_group_capacity ON group_members;

CREATE TRIGGER trg_enforce_group_capacity
  BEFORE INSERT OR UPDATE ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION enforce_group_capacity();
