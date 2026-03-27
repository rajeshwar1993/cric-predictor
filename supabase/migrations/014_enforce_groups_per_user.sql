-- Bragg — 014 Enforce Max Groups Per User
-- Prevents race conditions where concurrent group creates exceed MAX_GROUPS_PER_USER.

CREATE OR REPLACE FUNCTION enforce_max_groups_per_user()
RETURNS TRIGGER AS $$
DECLARE
  v_max_groups CONSTANT INT := 10;  -- Must match LIMITS.MAX_GROUPS_PER_USER
  v_current_count INT;
BEGIN
  SELECT COUNT(*) INTO v_current_count
  FROM groups
  WHERE created_by = NEW.created_by;

  -- current_count includes the row being inserted (BEFORE trigger fires before insert,
  -- but the count excludes the new row since it's not yet committed).
  IF v_current_count >= v_max_groups THEN
    RAISE EXCEPTION 'User group limit exceeded: maximum % groups allowed per user', v_max_groups
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_max_groups_per_user ON groups;

CREATE TRIGGER trg_enforce_max_groups_per_user
  BEFORE INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_groups_per_user();
