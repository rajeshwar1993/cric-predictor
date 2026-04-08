-- =============================================================================
-- 009_delete_gang_rpc.sql
-- Bragg v2 — Gang deletion RPC (GANG-DB-003)
--
-- Atomic gang deletion function that soft-deletes a gang and notifies all
-- approved members in a single transaction. When an admin deletes a gang:
--   1. Verify the caller is the gang admin (approved, role='admin').
--   2. Lock the gang row with FOR UPDATE to prevent concurrent deletions.
--   3. Soft-delete the gang (is_deleted=true, deleted_at=now()).
--   4. Insert gang_deleted notifications for all approved members whose
--      profiles are not deleted.
--
-- Raises SQLSTATE 42501 'NOT_GANG_ADMIN' if the caller is not the admin.
-- Raises SQLSTATE P0001 if the gang is not found or already deleted.
-- Any failure results in automatic rollback (single transaction).
--
-- PRD references:
--   - Gangs > Leaving & Deletion
--   - v2_gangs
--   - v2_notifications > type enum includes gang_deleted
-- =============================================================================

CREATE OR REPLACE FUNCTION delete_gang(p_gang_id UUID, p_caller_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin    BOOLEAN;
  v_gang        RECORD;
  v_gang_name   TEXT;
  v_member      RECORD;
BEGIN
  -- -----------------------------------------------------------------------
  -- Step 1: Verify caller is admin of the gang
  -- -----------------------------------------------------------------------
  SELECT EXISTS (
    SELECT 1
    FROM v2_gang_members
    WHERE gang_id = p_gang_id
      AND user_id = p_caller_id
      AND role    = 'admin'
      AND status  = 'approved'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'NOT_GANG_ADMIN'
      USING ERRCODE = '42501';
  END IF;

  -- -----------------------------------------------------------------------
  -- Step 2: Lock the gang row to prevent concurrent deletions
  -- -----------------------------------------------------------------------
  SELECT id, name, is_deleted
  INTO v_gang
  FROM v2_gangs
  WHERE id = p_gang_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'GANG_NOT_FOUND: No gang found for gang_id %', p_gang_id
      USING ERRCODE = 'P0001';
  END IF;

  IF v_gang.is_deleted THEN
    RAISE EXCEPTION 'GANG_ALREADY_DELETED: Gang % is already deleted', p_gang_id
      USING ERRCODE = 'P0001';
  END IF;

  v_gang_name := v_gang.name;

  -- -----------------------------------------------------------------------
  -- Step 3: Soft-delete the gang
  -- -----------------------------------------------------------------------
  UPDATE v2_gangs
  SET is_deleted = true,
      deleted_at = now()
  WHERE id = p_gang_id;

  -- -----------------------------------------------------------------------
  -- Step 4: Insert gang_deleted notifications for all approved members
  --         with non-deleted profiles
  -- -----------------------------------------------------------------------
  FOR v_member IN
    SELECT gm.user_id
    FROM v2_gang_members gm
    JOIN v2_profiles p ON p.id = gm.user_id
    WHERE gm.gang_id  = p_gang_id
      AND gm.status   = 'approved'
      AND p.is_deleted = false
  LOOP
    INSERT INTO v2_notifications (id, user_id, type, gang_id, fixture_id, message, is_read)
    VALUES (
      gen_random_uuid(),
      v_member.user_id,
      'gang_deleted',
      p_gang_id,
      NULL,
      'The gang ' || v_gang_name || ' has been deleted by the admin.',
      false
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

END;
$$;

COMMENT ON FUNCTION delete_gang(UUID, UUID) IS 'Atomic gang deletion: verifies admin role, soft-deletes the gang, and notifies all approved members in one transaction.';
