-- =============================================================================
-- 006_migrate_from_v1.sql
-- Bragg v2 — One-time v1 to v2 data migration
--
-- Migrates:
--   1. profiles       -> v2_profiles
--   2. groups         -> v2_gangs (with new 6-char invite codes)
--   3. group_members  -> v2_gang_members (role mapping, status filtering)
--   4. Auto-enroll migrated gangs in IPL 2026 (v2_gang_league_seasons)
--
-- Then drops all v1 tables, functions, views, triggers.
--
-- Idempotent: safe to re-run. Uses ON CONFLICT DO NOTHING for all inserts
-- and IF EXISTS for all drops. Wrapped in a DO block for atomicity and
-- RAISE NOTICE logging.
--
-- PRD reference: docs/PRD.V2.md § "One-time migration strategy"
-- Story reference: docs/stories/phase-0-foundation.md § FND-DB-006
-- =============================================================================


-- =============================================================================
-- Step 0: Temporarily disable v2 triggers that would interfere with bulk inserts
-- =============================================================================
-- The check_max_gang_members and check_max_user_gangs triggers fire on every
-- INSERT into v2_gang_members and would slow down bulk migration. We disable
-- them before migration and re-enable after.

DO $$
BEGIN
  -- Disable max-members-per-gang trigger
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_check_max_gang_members'
      AND tgrelid = 'v2_gang_members'::regclass
  ) THEN
    ALTER TABLE v2_gang_members DISABLE TRIGGER trg_check_max_gang_members;
    RAISE NOTICE '[PREP] Disabled trigger trg_check_max_gang_members';
  END IF;

  -- Disable max-gangs-per-user trigger
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_check_max_user_gangs'
      AND tgrelid = 'v2_gang_members'::regclass
  ) THEN
    ALTER TABLE v2_gang_members DISABLE TRIGGER trg_check_max_user_gangs;
    RAISE NOTICE '[PREP] Disabled trigger trg_check_max_user_gangs';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[PREP] Could not disable triggers (may not exist): %', SQLERRM;
END;
$$;


-- =============================================================================
-- Step 1: Migrate profiles -> v2_profiles
-- =============================================================================
-- v1 columns: id, display_name, email, avatar_url, created_at
-- Added by migration 007: date_of_birth, accepted_terms_at, onboarding_completed
--
-- v2 columns: id, display_name, email, date_of_birth, terms_version,
--             terms_accepted_at, onboarding_completed, is_deleted, deleted_at,
--             created_at
--
-- Note: v1 has no terms_version column. We map accepted_terms_at -> terms_accepted_at
-- and set terms_version = '1.0' if accepted_terms_at is set, NULL otherwise.
-- avatar_url is dropped (v2 uses initials-only avatars).

DO $$
DECLARE
  v_profile_count INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE NOTICE '[SKIP] v1 profiles table does not exist — already migrated or fresh install';
    RETURN;
  END IF;

  -- Temporarily disable the onboarding_fields CHECK constraint on v2_profiles
  -- so we can insert profiles that may have onboarding_completed = true but
  -- NULL display_name/date_of_birth/terms_version (v1 marked old users as
  -- onboarding_completed = true in migration 007 even if those fields were NULL).
  BEGIN
    ALTER TABLE v2_profiles DROP CONSTRAINT IF EXISTS chk_onboarding_fields;
    RAISE NOTICE '[PROFILES] Temporarily dropped chk_onboarding_fields constraint';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[PROFILES] Could not drop chk_onboarding_fields: %', SQLERRM;
  END;

  INSERT INTO v2_profiles (
    id,
    display_name,
    email,
    date_of_birth,
    terms_version,
    terms_accepted_at,
    onboarding_completed,
    is_deleted,
    created_at
  )
  SELECT
    p.id,
    p.display_name,
    p.email,
    p.date_of_birth,
    -- Map accepted_terms_at presence to a terms_version
    CASE WHEN p.accepted_terms_at IS NOT NULL THEN '1.0' ELSE NULL END,
    p.accepted_terms_at,
    COALESCE(p.onboarding_completed, false),
    false,  -- is_deleted
    p.created_at
  FROM profiles p
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_profile_count = ROW_COUNT;
  RAISE NOTICE '[PROFILES] Migrated % profiles from v1 -> v2_profiles', v_profile_count;

  -- Re-add the CHECK constraint
  BEGIN
    ALTER TABLE v2_profiles ADD CONSTRAINT chk_onboarding_fields CHECK (
      onboarding_completed = false
      OR (
        display_name IS NOT NULL
        AND date_of_birth IS NOT NULL
        AND terms_version IS NOT NULL
      )
    );
    RAISE NOTICE '[PROFILES] Re-added chk_onboarding_fields constraint';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[PROFILES] Could not re-add chk_onboarding_fields (may already exist): %', SQLERRM;
  END;
END;
$$;


-- =============================================================================
-- Step 2: Migrate groups -> v2_gangs (with new 6-char invite codes)
-- =============================================================================
-- v1 columns: id, name, invite_code (12-char hex), created_by, created_at
--
-- v2 columns: id, name, invite_code (6-char uppercase alphanumeric),
--             created_by, auto_accept, is_deleted, deleted_at, created_at
--
-- We skip groups with 0 approved members (empty gangs serve no purpose).
-- We generate new unique 6-char invite codes using an inline helper function.

DO $$
DECLARE
  v_gang_count INT;
  v_group_rec RECORD;
  v_invite_code TEXT;
  v_attempts INT;
  v_chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_code_exists BOOLEAN;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'groups'
  ) THEN
    RAISE NOTICE '[SKIP] v1 groups table does not exist — already migrated or fresh install';
    RETURN;
  END IF;

  v_gang_count := 0;

  -- Loop through groups that have at least 1 approved member
  FOR v_group_rec IN
    SELECT g.id, g.name, g.created_by, g.created_at
    FROM groups g
    WHERE EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = g.id AND gm.status = 'approved'
    )
    -- Skip groups whose creator no longer exists in v2_profiles
    -- (the FK on created_by references v2_profiles)
    AND EXISTS (
      SELECT 1 FROM v2_profiles vp WHERE vp.id = g.created_by
    )
  LOOP
    -- Generate a unique 6-char invite code
    v_attempts := 0;
    LOOP
      v_attempts := v_attempts + 1;
      -- Generate random 6-char code from uppercase letters + digits
      v_invite_code := '';
      FOR i IN 1..6 LOOP
        v_invite_code := v_invite_code || substr(v_chars, floor(random() * 36)::int + 1, 1);
      END LOOP;

      -- Check uniqueness against v2_gangs
      SELECT EXISTS (
        SELECT 1 FROM v2_gangs WHERE invite_code = v_invite_code
      ) INTO v_code_exists;

      EXIT WHEN NOT v_code_exists OR v_attempts > 100;
    END LOOP;

    IF v_attempts > 100 THEN
      RAISE WARNING '[GANGS] Could not generate unique invite code for group % after 100 attempts', v_group_rec.id;
      CONTINUE;
    END IF;

    BEGIN
      INSERT INTO v2_gangs (
        id, name, invite_code, created_by, auto_accept, is_deleted, created_at
      )
      VALUES (
        v_group_rec.id,
        v_group_rec.name,
        v_invite_code,
        v_group_rec.created_by,
        false,   -- auto_accept
        false,   -- is_deleted
        v_group_rec.created_at
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '[GANGS] Skipped group % due to error: %', v_group_rec.id, SQLERRM;
    END;
  END LOOP;

  -- Count the actual number of rows migrated (more reliable than accumulating)
  SELECT COUNT(*) INTO v_gang_count
  FROM v2_gangs vg
  WHERE EXISTS (
    SELECT 1 FROM groups g WHERE g.id = vg.id
  );

  RAISE NOTICE '[GANGS] Migrated % gangs from v1 groups -> v2_gangs (empty groups skipped)', v_gang_count;
END;
$$;


-- =============================================================================
-- Step 3: Migrate group_members -> v2_gang_members
-- =============================================================================
-- v1 columns: group_id, user_id, status (pending/approved/rejected/removed),
--             role (owner/admin/member), joined_at, approved_at
--
-- v2 columns: gang_id, user_id, role (admin/member),
--             status (pending/approved/rejected/removed/left),
--             is_blocked, requested_at, approved_at, departed_at
--
-- Rules:
--   - Only migrate rows with status 'approved' or 'pending'
--   - Role mapping: owner -> admin; admin or member -> member
--   - Only ONE admin per gang (the original owner)
--   - joined_at -> requested_at
--   - is_blocked = false, departed_at = NULL
--   - Only migrate members whose gang was migrated to v2_gangs
--   - Only migrate members whose profile was migrated to v2_profiles

DO $$
DECLARE
  v_member_count INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'group_members'
  ) THEN
    RAISE NOTICE '[SKIP] v1 group_members table does not exist — already migrated or fresh install';
    RETURN;
  END IF;

  INSERT INTO v2_gang_members (
    gang_id,
    user_id,
    role,
    status,
    is_blocked,
    requested_at,
    approved_at,
    departed_at
  )
  SELECT
    gm.group_id,               -- gang_id = group_id (preserved)
    gm.user_id,
    -- Role mapping: only 'owner' becomes 'admin'; everything else -> 'member'
    CASE
      WHEN gm.role = 'owner' THEN 'admin'::v2_member_role
      ELSE 'member'::v2_member_role
    END,
    -- Status mapping: 'approved' and 'pending' map directly
    gm.status::text::v2_member_status,
    false,                      -- is_blocked
    gm.joined_at,               -- requested_at = joined_at
    gm.approved_at,
    NULL                        -- departed_at
  FROM group_members gm
  WHERE gm.status IN ('approved', 'pending')
    -- Only migrate members for gangs that were actually migrated
    AND EXISTS (SELECT 1 FROM v2_gangs vg WHERE vg.id = gm.group_id)
    -- Only migrate members whose profile exists in v2
    AND EXISTS (SELECT 1 FROM v2_profiles vp WHERE vp.id = gm.user_id)
  ON CONFLICT (gang_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_member_count = ROW_COUNT;
  RAISE NOTICE '[MEMBERS] Migrated % gang members from v1 group_members -> v2_gang_members', v_member_count;
END;
$$;


-- =============================================================================
-- Step 4: Auto-enroll migrated gangs in IPL 2026
-- =============================================================================
-- For every migrated v2_gang, insert a row into v2_gang_league_seasons
-- linking it to the IPL league and the active IPL 2026 season.
-- prediction_deadline_mins = 45, is_active = true

DO $$
DECLARE
  v_league_id UUID;
  v_season_id UUID;
  v_enrollment_count INT;
BEGIN
  -- Look up IPL league
  SELECT id INTO v_league_id FROM v2_leagues WHERE code = 'ipl';
  IF v_league_id IS NULL THEN
    RAISE NOTICE '[SKIP] IPL league not found in v2_leagues — cannot enroll gangs';
    RETURN;
  END IF;

  -- Look up active IPL 2026 season
  SELECT id INTO v_season_id
  FROM v2_seasons
  WHERE league_id = v_league_id AND is_active = true
  LIMIT 1;

  IF v_season_id IS NULL THEN
    RAISE NOTICE '[SKIP] Active IPL season not found in v2_seasons — cannot enroll gangs';
    RETURN;
  END IF;

  RAISE NOTICE '[ENROLL] Using league_id=% season_id=%', v_league_id, v_season_id;

  INSERT INTO v2_gang_league_seasons (
    gang_id, league_id, season_id, prediction_deadline_mins, is_active
  )
  SELECT
    vg.id,
    v_league_id,
    v_season_id,
    45,     -- prediction_deadline_mins
    true    -- is_active
  FROM v2_gangs vg
  -- Only enroll gangs that came from v1 (have a matching v1 group id)
  -- On a fresh install with no v1 tables, this subquery returns nothing
  WHERE EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'groups'
  )
  ON CONFLICT (gang_id, league_id, season_id) DO NOTHING;

  GET DIAGNOSTICS v_enrollment_count = ROW_COUNT;
  RAISE NOTICE '[ENROLL] Enrolled % gangs in IPL 2026 (v2_gang_league_seasons)', v_enrollment_count;
END;
$$;


-- =============================================================================
-- Step 5: Re-enable v2 triggers
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_check_max_gang_members'
      AND tgrelid = 'v2_gang_members'::regclass
  ) THEN
    ALTER TABLE v2_gang_members ENABLE TRIGGER trg_check_max_gang_members;
    RAISE NOTICE '[CLEANUP] Re-enabled trigger trg_check_max_gang_members';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_check_max_user_gangs'
      AND tgrelid = 'v2_gang_members'::regclass
  ) THEN
    ALTER TABLE v2_gang_members ENABLE TRIGGER trg_check_max_user_gangs;
    RAISE NOTICE '[CLEANUP] Re-enabled trigger trg_check_max_user_gangs';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[CLEANUP] Could not re-enable triggers: %', SQLERRM;
END;
$$;


-- =============================================================================
-- Step 6: Drop v1 views
-- =============================================================================

DROP VIEW IF EXISTS season_standings CASCADE;
DROP VIEW IF EXISTS match_leaderboard CASCADE;


-- =============================================================================
-- Step 7: Drop v1 functions and triggers
-- =============================================================================
-- Drop triggers first (they depend on functions), then functions.
-- Note: handle_new_user() is shared — v2 004_triggers.sql already
-- CREATE OR REPLACE'd it to point at v2_profiles. We do NOT drop it here;
-- we only drop the v1 trigger if it still references old tables. The v2
-- trigger was already recreated by 004_triggers.sql.

DO $$
BEGIN
  -- Drop v1-specific triggers (if they still exist)
  -- on_auth_user_created is already re-pointed by v2 004_triggers.sql; skip it.
  DROP TRIGGER IF EXISTS trg_enforce_group_capacity ON group_members;
  DROP TRIGGER IF EXISTS trg_enforce_max_groups_per_user ON group_members;

  RAISE NOTICE '[DROP] Dropped v1 triggers';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[DROP] Error dropping v1 triggers (tables may already be gone): %', SQLERRM;
END;
$$;

-- Drop v1-only functions (functions not shared with v2)
-- Note: handle_new_user() is NOT dropped — v2 uses it (re-created in 004_triggers.sql)
DROP FUNCTION IF EXISTS is_group_member(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS is_group_admin(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_group_by_invite_code(TEXT) CASCADE;
DROP FUNCTION IF EXISTS seed_system_scenarios(UUID, INT) CASCADE;
DROP FUNCTION IF EXISTS resolve_match_predictions(INT) CASCADE;
DROP FUNCTION IF EXISTS void_abandoned_match(INT) CASCADE;
DROP FUNCTION IF EXISTS resolve_scenarios_by_category(INT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_group_with_owner(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS enforce_group_capacity() CASCADE;
DROP FUNCTION IF EXISTS enforce_max_groups_per_user() CASCADE;
DROP FUNCTION IF EXISTS prediction_deadline(DATE, TIME, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS get_members_who_predicted(UUID, INT) CASCADE;
-- private.invoke_edge_function — v1 cron helper; drop if exists
DROP FUNCTION IF EXISTS private.invoke_edge_function(TEXT, JSONB) CASCADE;


-- =============================================================================
-- Step 8: Drop v1 cron jobs (if pg_cron is available)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'invoke-sync-data') THEN
      PERFORM cron.unschedule('invoke-sync-data');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'invoke-match-live') THEN
      PERFORM cron.unschedule('invoke-match-live');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'invoke-match-cron') THEN
      PERFORM cron.unschedule('invoke-match-cron');
    END IF;
    RAISE NOTICE '[DROP] Unscheduled v1 cron jobs';
  ELSE
    RAISE NOTICE '[SKIP] pg_cron not installed — no cron jobs to unschedule';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[DROP] Error unscheduling cron jobs: %', SQLERRM;
END;
$$;


-- =============================================================================
-- Step 9: Drop v1 tables
-- =============================================================================
-- Order matters: drop dependent tables first, profiles last.
-- Using CASCADE to handle any remaining FK constraints, policies, or indexes.

-- Tables with no v2 equivalent (completely new data from Sportmonks in v2)
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS scenarios CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS match_group_settings CASCADE;
DROP TABLE IF EXISTS match_squads CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS points_config CASCADE;

-- Group-related tables (data already migrated to v2)
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;

-- Profiles — drop LAST (after v2_profiles is populated)
DROP TABLE IF EXISTS profiles CASCADE;


-- =============================================================================
-- Step 10: Drop v1 enums (if they still exist)
-- =============================================================================
-- These may fail if still referenced, but CASCADE in table drops above
-- should have removed all references.

DO $$
BEGIN
  DROP TYPE IF EXISTS match_status CASCADE;
  DROP TYPE IF EXISTS member_status CASCADE;
  DROP TYPE IF EXISTS member_role CASCADE;
  DROP TYPE IF EXISTS scenario_type CASCADE;
  DROP TYPE IF EXISTS scenario_approval CASCADE;
  RAISE NOTICE '[DROP] Dropped v1 enum types';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[DROP] Error dropping v1 enums (some may be shared with v2 or already gone): %', SQLERRM;
END;
$$;


-- =============================================================================
-- Step 11: Drop v1 indexes (cleanup any orphans)
-- =============================================================================
-- Most indexes are dropped automatically with their tables (CASCADE).
-- This is belt-and-suspenders for any that survived.

DROP INDEX IF EXISTS idx_group_members_status CASCADE;
DROP INDEX IF EXISTS idx_group_members_user CASCADE;
DROP INDEX IF EXISTS idx_matches_status CASCADE;
DROP INDEX IF EXISTS idx_matches_date CASCADE;
DROP INDEX IF EXISTS idx_scenarios_group_match CASCADE;
DROP INDEX IF EXISTS idx_scenarios_approval CASCADE;
DROP INDEX IF EXISTS idx_predictions_scenario CASCADE;
DROP INDEX IF EXISTS idx_predictions_user CASCADE;
DROP INDEX IF EXISTS idx_notifications_user CASCADE;
DROP INDEX IF EXISTS idx_players_team CASCADE;
DROP INDEX IF EXISTS idx_players_api_id CASCADE;
DROP INDEX IF EXISTS idx_match_squads_match CASCADE;
DROP INDEX IF EXISTS uniq_system_scenario CASCADE;


-- =============================================================================
-- Step 12: Drop the private schema if empty (was created for cron helper)
-- =============================================================================

DO $$
DECLARE
  v_obj_count INT;
BEGIN
  -- Count remaining objects in private schema
  SELECT COUNT(*) INTO v_obj_count
  FROM information_schema.routines
  WHERE routine_schema = 'private';

  IF v_obj_count = 0 THEN
    DROP SCHEMA IF EXISTS private CASCADE;
    RAISE NOTICE '[DROP] Dropped empty private schema';
  ELSE
    RAISE NOTICE '[SKIP] private schema has % remaining objects — not dropping', v_obj_count;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[DROP] Could not check/drop private schema: %', SQLERRM;
END;
$$;


-- =============================================================================
-- Step 13: Final verification summary
-- =============================================================================

DO $$
DECLARE
  v_profiles INT;
  v_gangs INT;
  v_members INT;
  v_enrollments INT;
  v_v1_tables_remaining INT;
BEGIN
  SELECT COUNT(*) INTO v_profiles FROM v2_profiles;
  SELECT COUNT(*) INTO v_gangs FROM v2_gangs;
  SELECT COUNT(*) INTO v_members FROM v2_gang_members;
  SELECT COUNT(*) INTO v_enrollments FROM v2_gang_league_seasons;

  -- Check if any v1 tables remain
  SELECT COUNT(*) INTO v_v1_tables_remaining
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'profiles', 'groups', 'group_members', 'matches', 'scenarios',
      'predictions', 'notifications', 'teams', 'players', 'match_squads',
      'points_config', 'match_group_settings'
    );

  RAISE NOTICE '=== MIGRATION SUMMARY ===';
  RAISE NOTICE '  v2_profiles:            %', v_profiles;
  RAISE NOTICE '  v2_gangs:               %', v_gangs;
  RAISE NOTICE '  v2_gang_members:        %', v_members;
  RAISE NOTICE '  v2_gang_league_seasons: %', v_enrollments;
  RAISE NOTICE '  v1 tables remaining:    %', v_v1_tables_remaining;

  IF v_v1_tables_remaining > 0 THEN
    RAISE WARNING 'Some v1 tables were not dropped! Check for leftover dependencies.';
  ELSE
    RAISE NOTICE '  All v1 tables successfully dropped.';
  END IF;

  RAISE NOTICE '=========================';
END;
$$;
