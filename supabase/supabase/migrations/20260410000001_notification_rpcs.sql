-- =============================================================================
-- 20260410000001_notification_rpcs.sql
-- Bragg v2 — Gang notification RPCs (NTF-001)
--
-- The RLS policies on `v2_notifications` (see 20260406000002_rls_policies.sql)
-- allow authenticated users to SELECT/UPDATE their own rows but intentionally
-- deny INSERT/DELETE to everyone except the service role. The server actions
-- in `gangs.ts` previously tried to insert notifications directly, which
-- silently fails under RLS in production.
--
-- This migration adds SECURITY DEFINER RPCs that:
--   1. Resolve the caller via auth.uid() (never trust client-supplied ids).
--   2. Verify the caller has authority to create the notification.
--   3. Resolve display / gang names server-side (never trust client strings
--      — a gang member could otherwise inject arbitrary message copy into
--      an admin's inbox).
--   4. Insert the notification row on behalf of the caller.
--
-- Each RPC mirrors the pattern used by `delete_gang` and `delete_account`.
-- They are granted EXECUTE to the `authenticated` role only.
--
-- Raises SQLSTATE 42501 'NOT_AUTHENTICATED' if auth.uid() is NULL.
-- Raises SQLSTATE 42501 'NOT_AUTHORIZED'    if caller lacks authority.
-- Raises SQLSTATE P0001 if the target gang does not exist.
--
-- PRD references:
--   - docs/stories/NTF-001-notification-bell-panel.md
--   - v2_notifications (RLS: SELECT/UPDATE only for authenticated users)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Drop any previously-applied 3-arg overloads
-- ---------------------------------------------------------------------------
-- Earlier revisions of this migration accepted a client-supplied display /
-- gang name as the third argument. Postgres identifies functions by
-- (name, argument types), so `CREATE OR REPLACE FUNCTION` with fewer
-- parameters creates a NEW function instead of replacing the old one.
-- If a shared environment already applied the 3-arg version it would
-- linger as a callable overload and bypass the server-side name
-- resolution that closes the injection vector. Drop the old overloads
-- explicitly so `supabase db push` against such an env converges cleanly.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS create_join_request_notification(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS create_new_member_notification(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS create_join_approved_notification(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS create_join_rejected_notification(UUID, UUID, TEXT);


-- ---------------------------------------------------------------------------
-- create_join_request_notification
-- ---------------------------------------------------------------------------
-- Inserts a `join_request` notification for the gang admin when a user
-- joins a gang with auto_accept=false. The caller is the requester and
-- must therefore have a row in v2_gang_members for the target gang (any
-- status — pending or approved — because the join flow may have just
-- created a pending row).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_join_request_notification(
  p_admin_user_id UUID,
  p_gang_id       UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id           UUID;
  v_has_row             BOOLEAN;
  v_gang_exists         BOOLEAN;
  v_requester_name      TEXT;
BEGIN
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED'
      USING ERRCODE = '42501';
  END IF;

  -- Gang must exist (and not be soft-deleted) before we notify about it.
  SELECT EXISTS (
    SELECT 1 FROM v2_gangs
    WHERE id = p_gang_id
      AND is_deleted = false
  ) INTO v_gang_exists;

  IF NOT v_gang_exists THEN
    RAISE EXCEPTION 'GANG_NOT_FOUND: No gang found for gang_id %', p_gang_id
      USING ERRCODE = 'P0001';
  END IF;

  -- Caller must have a membership row in this gang (pending counts — the
  -- join flow creates a pending row just before sending this notification).
  SELECT EXISTS (
    SELECT 1
    FROM v2_gang_members
    WHERE gang_id = p_gang_id
      AND user_id = v_caller_id
      AND status IN ('pending', 'approved')
  ) INTO v_has_row;

  IF NOT v_has_row THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED'
      USING ERRCODE = '42501';
  END IF;

  -- Recipient must actually be an approved admin of the target gang.
  -- Without this check, any gang member could forge a notification to an
  -- arbitrary user by passing their id as p_admin_user_id.
  IF NOT is_gang_admin(p_gang_id, p_admin_user_id) THEN
    RAISE EXCEPTION 'RECIPIENT_NOT_ADMIN'
      USING ERRCODE = '42501';
  END IF;

  -- Resolve the requester's display name server-side from their profile.
  -- Never accept a client-supplied display name here: that would let any
  -- authenticated gang member inject arbitrary text into an admin's inbox.
  SELECT COALESCE(display_name, 'Someone')
  INTO v_requester_name
  FROM v2_profiles
  WHERE id = v_caller_id;

  INSERT INTO v2_notifications (id, user_id, type, gang_id, fixture_id, message, is_read)
  VALUES (
    gen_random_uuid(),
    p_admin_user_id,
    'join_request',
    p_gang_id,
    NULL,
    COALESCE(v_requester_name, 'Someone') || ' wants to join your gang.',
    false
  );
END;
$$;

COMMENT ON FUNCTION create_join_request_notification(UUID, UUID) IS
  'Inserts a join_request notification for the gang admin. Caller must be a pending/approved member of the target gang (auth.uid()). The requester''s display name is resolved server-side from v2_profiles.';

GRANT EXECUTE ON FUNCTION create_join_request_notification(UUID, UUID) TO authenticated;


-- ---------------------------------------------------------------------------
-- create_new_member_notification
-- ---------------------------------------------------------------------------
-- Inserts a `new_member` notification for the gang admin when a user
-- joins a gang with auto_accept=true. The caller is the new member and
-- must be an approved member of the target gang.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_new_member_notification(
  p_admin_user_id UUID,
  p_gang_id       UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id   UUID;
  v_gang_exists BOOLEAN;
  v_member_name TEXT;
BEGIN
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED'
      USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM v2_gangs
    WHERE id = p_gang_id
      AND is_deleted = false
  ) INTO v_gang_exists;

  IF NOT v_gang_exists THEN
    RAISE EXCEPTION 'GANG_NOT_FOUND: No gang found for gang_id %', p_gang_id
      USING ERRCODE = 'P0001';
  END IF;

  -- Caller must be an approved member of this gang.
  IF NOT is_gang_member(p_gang_id, v_caller_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED'
      USING ERRCODE = '42501';
  END IF;

  -- Recipient must actually be an approved admin of the target gang.
  -- Without this check, any gang member could forge a notification to an
  -- arbitrary user by passing their id as p_admin_user_id.
  IF NOT is_gang_admin(p_gang_id, p_admin_user_id) THEN
    RAISE EXCEPTION 'RECIPIENT_NOT_ADMIN'
      USING ERRCODE = '42501';
  END IF;

  -- Resolve the new member's display name server-side to prevent a
  -- client-supplied string from being rendered into an admin's inbox.
  SELECT COALESCE(display_name, 'A new member')
  INTO v_member_name
  FROM v2_profiles
  WHERE id = v_caller_id;

  INSERT INTO v2_notifications (id, user_id, type, gang_id, fixture_id, message, is_read)
  VALUES (
    gen_random_uuid(),
    p_admin_user_id,
    'new_member',
    p_gang_id,
    NULL,
    COALESCE(v_member_name, 'A new member') || ' has joined your gang.',
    false
  );
END;
$$;

COMMENT ON FUNCTION create_new_member_notification(UUID, UUID) IS
  'Inserts a new_member notification for the gang admin. Caller must be an approved member of the target gang (auth.uid()). The new member''s display name is resolved server-side from v2_profiles.';

GRANT EXECUTE ON FUNCTION create_new_member_notification(UUID, UUID) TO authenticated;


-- ---------------------------------------------------------------------------
-- create_join_approved_notification
-- ---------------------------------------------------------------------------
-- Inserts a `join_approved` notification for the requester when a gang
-- admin approves their join request. The caller must be an approved admin
-- of the target gang.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_join_approved_notification(
  p_user_id UUID,
  p_gang_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_gang_name TEXT;
BEGIN
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED'
      USING ERRCODE = '42501';
  END IF;

  -- Caller must be an approved admin of this gang.
  IF NOT is_gang_admin(p_gang_id, v_caller_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED'
      USING ERRCODE = '42501';
  END IF;

  -- Recipient must actually have a membership row (pending or approved) in
  -- the target gang. Without this check, an admin could forge a
  -- join_approved notification to any user by passing an arbitrary id.
  IF NOT EXISTS (
    SELECT 1 FROM v2_gang_members
    WHERE gang_id = p_gang_id
      AND user_id = p_user_id
      AND status IN ('pending', 'approved')
  ) THEN
    RAISE EXCEPTION 'RECIPIENT_NOT_MEMBER'
      USING ERRCODE = '42501';
  END IF;

  -- Resolve the gang name server-side. A client-supplied gang name would
  -- let an admin craft misleading copy ("your request to join Get rich
  -- quick has been approved!") that bears no relation to the real gang.
  SELECT name
  INTO v_gang_name
  FROM v2_gangs
  WHERE id = p_gang_id
    AND is_deleted = false;

  INSERT INTO v2_notifications (id, user_id, type, gang_id, fixture_id, message, is_read)
  VALUES (
    gen_random_uuid(),
    p_user_id,
    'join_approved',
    p_gang_id,
    NULL,
    'Your request to join ' || COALESCE(v_gang_name, 'the gang') || ' has been approved!',
    false
  );
END;
$$;

COMMENT ON FUNCTION create_join_approved_notification(UUID, UUID) IS
  'Inserts a join_approved notification for the requester. Caller must be an approved admin of the target gang (auth.uid()). The gang name is resolved server-side from v2_gangs.';

GRANT EXECUTE ON FUNCTION create_join_approved_notification(UUID, UUID) TO authenticated;


-- ---------------------------------------------------------------------------
-- create_join_rejected_notification
-- ---------------------------------------------------------------------------
-- Inserts a `join_rejected` notification for the requester when a gang
-- admin rejects their join request. The caller must be an approved admin
-- of the target gang.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_join_rejected_notification(
  p_user_id UUID,
  p_gang_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_gang_name TEXT;
BEGIN
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED'
      USING ERRCODE = '42501';
  END IF;

  -- Caller must be an approved admin of this gang.
  IF NOT is_gang_admin(p_gang_id, v_caller_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED'
      USING ERRCODE = '42501';
  END IF;

  -- Recipient must actually have a membership row (pending or approved) in
  -- the target gang. Without this check, an admin could forge a
  -- join_rejected notification to any user by passing an arbitrary id.
  IF NOT EXISTS (
    SELECT 1 FROM v2_gang_members
    WHERE gang_id = p_gang_id
      AND user_id = p_user_id
      AND status IN ('pending', 'approved')
  ) THEN
    RAISE EXCEPTION 'RECIPIENT_NOT_MEMBER'
      USING ERRCODE = '42501';
  END IF;

  -- Resolve the gang name server-side to prevent client-supplied copy.
  SELECT name
  INTO v_gang_name
  FROM v2_gangs
  WHERE id = p_gang_id
    AND is_deleted = false;

  INSERT INTO v2_notifications (id, user_id, type, gang_id, fixture_id, message, is_read)
  VALUES (
    gen_random_uuid(),
    p_user_id,
    'join_rejected',
    p_gang_id,
    NULL,
    'Your request to join ' || COALESCE(v_gang_name, 'the gang') || ' was declined.',
    false
  );
END;
$$;

COMMENT ON FUNCTION create_join_rejected_notification(UUID, UUID) IS
  'Inserts a join_rejected notification for the requester. Caller must be an approved admin of the target gang (auth.uid()). The gang name is resolved server-side from v2_gangs.';

GRANT EXECUTE ON FUNCTION create_join_rejected_notification(UUID, UUID) TO authenticated;
