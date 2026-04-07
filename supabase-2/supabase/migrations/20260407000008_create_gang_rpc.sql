-- =============================================================================
-- 008_create_gang_rpc.sql
-- Bragg v2 — create_gang RPC and helper functions
-- Creates:
--   1. generate_invite_code() — generates a 6-char uppercase alphanumeric string
--   2. create_gang(p_gang_name, p_creator_id) — atomic gang creation RPC
--
-- Story: GANG-DB-002
-- Dependencies: GANG-DB-001 (seed_fixture_scenarios_for_gang must exist),
--               FND-DB-001 through FND-DB-005 (schema, triggers, seed data)
-- =============================================================================


-- =============================================================================
-- 1. generate_invite_code()
-- =============================================================================
-- Generates a 6-character uppercase alphanumeric string by randomly picking
-- from [A-Z0-9] for each position. Used by create_gang to produce unique
-- invite codes.
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT := '';
  v_i INT;
  v_rand INT;
BEGIN
  FOR v_i IN 1..6 LOOP
    -- Pick a random number 0-35 (26 letters + 10 digits)
    v_rand := floor(random() * 36)::int;
    IF v_rand < 26 THEN
      -- Letter: A-Z
      v_code := v_code || chr(ascii('A') + v_rand);
    ELSE
      -- Digit: 0-9
      v_code := v_code || chr(ascii('0') + (v_rand - 26));
    END IF;
  END LOOP;

  RETURN v_code;
END;
$$;

COMMENT ON FUNCTION generate_invite_code() IS
  'Generates a 6-character uppercase alphanumeric invite code (A-Z, 0-9). '
  'Used by create_gang for unique invite code generation.';


-- =============================================================================
-- 2. create_gang(p_gang_name, p_creator_id)
-- =============================================================================
-- Atomic RPC that:
--   1. Validates gang name (3-50 chars after trim)
--   2. Acquires advisory lock on creator_id to prevent concurrent races
--   3. Generates a unique 6-char invite code (up to 5 retries on collision)
--   4. INSERTs into v2_gangs
--   5. INSERTs creator into v2_gang_members as admin (approved)
--   6. Finds the active season and enrolls the gang
--   7. Seeds scenarios for upcoming fixtures within the 14-hour window
--   8. Returns the new gang id
--
-- Marked SECURITY DEFINER to bypass RLS on writes.
-- =============================================================================

CREATE OR REPLACE FUNCTION create_gang(
  p_gang_name  TEXT,
  p_creator_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trimmed_name   TEXT;
  v_invite_code    TEXT;
  v_gang_id        UUID;
  v_retry          INT := 0;
  v_max_retries    INT := 5;
  v_code_inserted  BOOLEAN := false;
  v_season_id      UUID;
  v_league_id      UUID;
  v_fixture        RECORD;
BEGIN
  -- -------------------------------------------------------------------------
  -- Step 1: Validate gang name
  -- -------------------------------------------------------------------------
  v_trimmed_name := trim(p_gang_name);

  IF length(v_trimmed_name) < 3 OR length(v_trimmed_name) > 50 THEN
    RAISE EXCEPTION 'INVALID_GANG_NAME: Gang name must be between 3 and 50 characters'
      USING ERRCODE = 'P0001';
  END IF;

  -- -------------------------------------------------------------------------
  -- Step 2: Advisory lock on creator_id
  -- -------------------------------------------------------------------------
  -- Prevents concurrent max-gangs races for the same user.
  PERFORM pg_advisory_xact_lock(hashtext(p_creator_id::text));

  -- -------------------------------------------------------------------------
  -- Step 3: Generate unique invite code with collision retry
  -- -------------------------------------------------------------------------
  v_gang_id := gen_random_uuid();

  WHILE NOT v_code_inserted AND v_retry < v_max_retries LOOP
    v_invite_code := generate_invite_code();

    -- Attempt insert; ON CONFLICT DO NOTHING returns no rows on collision
    INSERT INTO v2_gangs (id, name, invite_code, created_by, auto_accept, is_deleted)
    VALUES (v_gang_id, v_trimmed_name, v_invite_code, p_creator_id, false, false)
    ON CONFLICT (invite_code) DO NOTHING;

    IF FOUND THEN
      v_code_inserted := true;
    ELSE
      v_retry := v_retry + 1;
      -- Generate a new gang_id for the next attempt since the previous
      -- insert was a no-op
      v_gang_id := gen_random_uuid();
    END IF;
  END LOOP;

  IF NOT v_code_inserted THEN
    RAISE EXCEPTION 'INVITE_CODE_GENERATION_FAILED: Could not generate a unique invite code after % attempts', v_max_retries
      USING ERRCODE = 'P0001';
  END IF;

  -- -------------------------------------------------------------------------
  -- Step 4: Add creator as admin member (approved)
  -- -------------------------------------------------------------------------
  -- Triggers trg_check_max_gang_members and trg_check_max_user_gangs fire
  -- automatically to enforce limits.
  INSERT INTO v2_gang_members (gang_id, user_id, role, status, requested_at, approved_at)
  VALUES (v_gang_id, p_creator_id, 'admin', 'approved', now(), now());

  -- -------------------------------------------------------------------------
  -- Step 5: Find active season
  -- -------------------------------------------------------------------------
  SELECT id, league_id
  INTO v_season_id, v_league_id
  FROM v2_seasons
  WHERE is_active = true
  LIMIT 1;

  IF v_season_id IS NULL THEN
    RAISE EXCEPTION 'NO_ACTIVE_SEASON: No active season found. Cannot create gang without an active season.'
      USING ERRCODE = 'P0001';
  END IF;

  -- -------------------------------------------------------------------------
  -- Step 6: Enroll gang in the active season
  -- -------------------------------------------------------------------------
  INSERT INTO v2_gang_league_seasons (gang_id, league_id, season_id, prediction_deadline_mins, is_active)
  VALUES (v_gang_id, v_league_id, v_season_id, 45, true);

  -- -------------------------------------------------------------------------
  -- Step 7: Seed scenarios for fixtures within the 14-hour window
  -- -------------------------------------------------------------------------
  -- Fixtures that are upcoming and within 14 hours of start_datetime
  -- (i.e., scenarios should already be seeded for them).
  FOR v_fixture IN
    SELECT id
    FROM v2_league_season_fixtures
    WHERE season_id = v_season_id
      AND status = 'upcoming'
      AND start_datetime - INTERVAL '14 hours' <= now()
      AND start_datetime > now()
  LOOP
    PERFORM seed_fixture_scenarios_for_gang(v_gang_id, v_fixture.id);
  END LOOP;

  -- -------------------------------------------------------------------------
  -- Step 8: Return the new gang id
  -- -------------------------------------------------------------------------
  RETURN v_gang_id;
END;
$$;

COMMENT ON FUNCTION create_gang(TEXT, UUID) IS
  'Atomic gang creation RPC. Validates name, generates unique invite code, '
  'creates gang, enrolls creator as admin, enrolls gang in active season, '
  'and seeds scenarios for upcoming fixtures in the 14-hour window. '
  'SECURITY DEFINER to bypass RLS. Uses advisory lock on creator_id to '
  'prevent concurrent max-gangs races.';
