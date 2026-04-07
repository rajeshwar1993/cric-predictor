-- =============================================================================
-- 012_delete_account_rpc.sql
-- Bragg v2 — Account deletion RPC (AUTH-DB-001)
--
-- Atomic account deletion function that handles admin auto-promotion and gang
-- cleanup in a single transaction. When a user deletes their account:
--   1. For each gang where the user is admin:
--      a. Promote the earliest-joined approved member (with non-deleted profile)
--         to admin, update v2_gangs.created_by, and insert an admin_promoted
--         notification for the promoted user.
--      b. If no eligible candidate exists, soft-delete the gang and insert
--         gang_deleted notifications for all remaining approved members with
--         non-deleted profiles.
--   2. Soft-delete the user's profile (is_deleted=true, deleted_at=now()).
--
-- Uses an advisory lock on user_id to prevent concurrent deletion races.
-- Raises SQLSTATE P0001 if the user_id does not exist in v2_profiles.
--
-- PRD references:
--   - Authentication > Admin account deletion
--   - v2_profiles > is_deleted
-- =============================================================================

CREATE OR REPLACE FUNCTION delete_account(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_exists  BOOLEAN;
  v_admin_gang      RECORD;
  v_candidate_id    UUID;
  v_gang_name       TEXT;
  v_member          RECORD;
BEGIN
  -- -----------------------------------------------------------------------
  -- Advisory lock: prevent concurrent deletion of the same account
  -- -----------------------------------------------------------------------
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  -- -----------------------------------------------------------------------
  -- Step 1: Verify user exists
  -- -----------------------------------------------------------------------
  SELECT EXISTS (
    SELECT 1 FROM v2_profiles WHERE id = p_user_id
  ) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    RAISE EXCEPTION 'USER_NOT_FOUND: No profile found for user_id %', p_user_id
      USING ERRCODE = 'P0001';
  END IF;

  -- -----------------------------------------------------------------------
  -- Step 2: Process gangs where user is admin
  -- -----------------------------------------------------------------------
  FOR v_admin_gang IN
    SELECT gm.gang_id
    FROM v2_gang_members gm
    WHERE gm.user_id = p_user_id
      AND gm.role    = 'admin'
      AND gm.status  = 'approved'
  LOOP
    -- Fetch the gang name (needed for notification messages)
    SELECT g.name INTO v_gang_name
    FROM v2_gangs g
    WHERE g.id = v_admin_gang.gang_id;

    -- Find the earliest-joined approved member with a non-deleted profile,
    -- excluding the user being deleted
    SELECT gm.user_id INTO v_candidate_id
    FROM v2_gang_members gm
    JOIN v2_profiles p ON p.id = gm.user_id
    WHERE gm.gang_id  = v_admin_gang.gang_id
      AND gm.user_id != p_user_id
      AND gm.status   = 'approved'
      AND p.is_deleted = false
    ORDER BY gm.approved_at ASC
    LIMIT 1;

    IF v_candidate_id IS NOT NULL THEN
      -- -----------------------------------------------------------------
      -- 2a: Promote the candidate to admin
      -- -----------------------------------------------------------------

      -- Update gang_members role
      UPDATE v2_gang_members
      SET role = 'admin'
      WHERE gang_id = v_admin_gang.gang_id
        AND user_id = v_candidate_id;

      -- Update gang ownership
      UPDATE v2_gangs
      SET created_by = v_candidate_id
      WHERE id = v_admin_gang.gang_id;

      -- Insert admin_promoted notification for the promoted user
      INSERT INTO v2_notifications (user_id, type, gang_id, fixture_id, message, is_read)
      VALUES (
        v_candidate_id,
        'admin_promoted',
        v_admin_gang.gang_id,
        NULL,
        'You''ve been promoted to admin of ' || v_gang_name || ' because the previous admin left Bragg.',
        false
      );

    ELSE
      -- -----------------------------------------------------------------
      -- 2b: No eligible candidate — soft-delete the gang
      -- -----------------------------------------------------------------

      UPDATE v2_gangs
      SET is_deleted = true,
          deleted_at = now()
      WHERE id = v_admin_gang.gang_id;

      -- Insert gang_deleted notifications for all remaining approved
      -- members whose profile is not deleted (excluding the deleting user)
      FOR v_member IN
        SELECT gm.user_id
        FROM v2_gang_members gm
        JOIN v2_profiles p ON p.id = gm.user_id
        WHERE gm.gang_id  = v_admin_gang.gang_id
          AND gm.user_id != p_user_id
          AND gm.status   = 'approved'
          AND p.is_deleted = false
      LOOP
        INSERT INTO v2_notifications (user_id, type, gang_id, fixture_id, message, is_read)
        VALUES (
          v_member.user_id,
          'gang_deleted',
          v_admin_gang.gang_id,
          NULL,
          'The gang ' || v_gang_name || ' has been deleted because the admin left Bragg.',
          false
        );
      END LOOP;

    END IF;

  END LOOP;

  -- -----------------------------------------------------------------------
  -- Step 3: Soft-delete the user's profile
  -- -----------------------------------------------------------------------
  UPDATE v2_profiles
  SET is_deleted = true,
      deleted_at = now()
  WHERE id = p_user_id;

END;
$$;

COMMENT ON FUNCTION delete_account(UUID) IS 'Atomic account deletion: handles admin auto-promotion, gang cleanup, and profile soft-delete in one transaction.';
