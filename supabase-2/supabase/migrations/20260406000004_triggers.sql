-- =============================================================================
-- 004_triggers.sql
-- Bragg v2 — Database triggers and stored procedures
-- Creates all trigger functions and triggers for:
--   1. Profile creation on auth.users insert
--   2. Max members per gang enforcement (20)
--   3. Max gangs per user enforcement (40)
--   4. Fixture status_changed_at tracking
--   5. Gang standings rank recalculation on member status change
--   6. Fixture standings upsert on prediction insert/update
--   7. Full standings recalculation on scenario resolution/void
--
-- All functions use PL/pgSQL. Triggers use DROP IF EXISTS + CREATE for
-- idempotency. Functions use CREATE OR REPLACE.
-- =============================================================================


-- =============================================================================
-- 1. Profile Creation Trigger
-- =============================================================================
-- When a new user signs up via Supabase Auth, automatically create a
-- v2_profiles row with their id and email. The remaining profile fields
-- (display_name, date_of_birth, terms_version) are populated during
-- onboarding.
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO v2_profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_new_user() IS
  'Creates a v2_profiles row when a new auth.users row is inserted. '
  'Populates id and email; other fields set during onboarding.';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();


-- =============================================================================
-- 2. Max Members Per Gang Trigger
-- =============================================================================
-- Enforces a hard limit of 20 approved members per gang. Fires on INSERT
-- (auto-accept direct-to-approved path) and UPDATE (manual approval path)
-- when the new row's status is 'approved'. Raises P0001 if the gang already
-- has 20 approved members.
-- =============================================================================

CREATE OR REPLACE FUNCTION check_max_gang_members()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_approved_count INT;
BEGIN
  -- Count existing approved members in this gang, excluding the current row
  -- (handles UPDATE from pending->approved without double-counting)
  SELECT COUNT(*)
  INTO v_approved_count
  FROM v2_gang_members
  WHERE gang_id = NEW.gang_id
    AND status = 'approved'
    AND (gang_id, user_id) != (NEW.gang_id, NEW.user_id);

  IF v_approved_count >= 20 THEN
    RAISE EXCEPTION 'MAX_MEMBERS_REACHED: Gang has reached maximum member capacity'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION check_max_gang_members() IS
  'Enforces MAX_MEMBERS_PER_GANG = 20. Counts approved members excluding '
  'the current row, raises P0001 if limit reached.';

DROP TRIGGER IF EXISTS trg_check_max_gang_members ON v2_gang_members;
CREATE TRIGGER trg_check_max_gang_members
  BEFORE INSERT OR UPDATE ON v2_gang_members
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION check_max_gang_members();


-- =============================================================================
-- 3. Max Gangs Per User Trigger
-- =============================================================================
-- Enforces a hard limit of 40 active gang memberships (approved or pending)
-- per user. Only fires when the row is transitioning INTO an active state
-- (i.e., NEW.status is 'approved' or 'pending' and OLD.status was not).
-- Correctly handles rejoin (left -> pending) by excluding the current row
-- from the count.
-- =============================================================================

CREATE OR REPLACE FUNCTION check_max_user_gangs()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_active_count INT;
BEGIN
  -- Only check when transitioning INTO an active state
  -- For INSERT: OLD is NULL, so OLD.status IS NULL which is NOT IN ('approved','pending')
  -- For UPDATE: only fire if OLD.status was not already active
  IF TG_OP = 'UPDATE'
     AND OLD.status IN ('approved', 'pending') THEN
    -- Already in an active state, no need to re-check
    RETURN NEW;
  END IF;

  -- Count user's other active memberships, excluding current row
  SELECT COUNT(*)
  INTO v_active_count
  FROM v2_gang_members
  WHERE user_id = NEW.user_id
    AND (gang_id, user_id) != (NEW.gang_id, NEW.user_id)
    AND status IN ('approved', 'pending');

  IF v_active_count >= 40 THEN
    RAISE EXCEPTION 'MAX_GANGS_REACHED: You have reached the maximum number of gang memberships'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION check_max_user_gangs() IS
  'Enforces MAX_GANGS_PER_USER = 40. Counts active (approved/pending) '
  'memberships excluding the current row, raises P0001 if limit reached. '
  'Only fires when transitioning into an active state.';

DROP TRIGGER IF EXISTS trg_check_max_user_gangs ON v2_gang_members;
CREATE TRIGGER trg_check_max_user_gangs
  BEFORE INSERT OR UPDATE ON v2_gang_members
  FOR EACH ROW
  WHEN (NEW.status IN ('approved', 'pending'))
  EXECUTE FUNCTION check_max_user_gangs();


-- =============================================================================
-- 4. Fixture Status Changed Trigger
-- =============================================================================
-- Automatically updates status_changed_at whenever the fixture status column
-- changes. Used for the 120-minute post-match cutoff logic.
-- =============================================================================

CREATE OR REPLACE FUNCTION update_status_changed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.status_changed_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_status_changed_at() IS
  'Sets status_changed_at to now() when v2_league_season_fixtures.status changes.';

DROP TRIGGER IF EXISTS trg_update_status_changed_at ON v2_league_season_fixtures;
CREATE TRIGGER trg_update_status_changed_at
  BEFORE UPDATE ON v2_league_season_fixtures
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_status_changed_at();


-- =============================================================================
-- 5. Rank Recalculation on Member Status Change
-- =============================================================================
-- When a member's status transitions between active (approved) and departed
-- (left/removed) states, recalculate ranks across ALL standings for that
-- gang. This ensures left/removed members are always sorted to the bottom
-- and ranks update immediately on member departure or reinstatement.
-- =============================================================================

CREATE OR REPLACE FUNCTION recalculate_gang_standings_ranks(p_gang_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recalculate ranks for ALL fixture standings rows in this gang.
  -- Left/removed members sort to the bottom; among active members,
  -- rank by points DESC then last_submitted_at ASC (NULLS LAST).
  UPDATE v2_gang_fixture_standings fs
  SET rank = sub.new_rank,
      updated_at = now()
  FROM (
    SELECT
      fs2.gang_id,
      fs2.fixture_id,
      fs2.user_id,
      RANK() OVER (
        PARTITION BY fs2.gang_id, fs2.fixture_id
        ORDER BY
          CASE WHEN gm.status IN ('left', 'removed') THEN 1 ELSE 0 END ASC,
          fs2.points_earned DESC,
          fs2.last_submitted_at ASC NULLS LAST
      ) AS new_rank
    FROM v2_gang_fixture_standings fs2
    JOIN v2_gang_members gm
      ON gm.gang_id = fs2.gang_id AND gm.user_id = fs2.user_id
    WHERE fs2.gang_id = p_gang_id
  ) sub
  WHERE fs.gang_id = sub.gang_id
    AND fs.fixture_id = sub.fixture_id
    AND fs.user_id = sub.user_id;

  -- Recalculate ranks for ALL season standings rows in this gang.
  -- Left/removed members sort to the bottom; among active members,
  -- rank by total_points DESC, accuracy_pct DESC, matches_predicted DESC.
  UPDATE v2_gang_season_standings ss
  SET rank = sub.new_rank,
      updated_at = now()
  FROM (
    SELECT
      ss2.gang_id,
      ss2.season_id,
      ss2.user_id,
      RANK() OVER (
        PARTITION BY ss2.gang_id, ss2.season_id
        ORDER BY
          CASE WHEN gm.status IN ('left', 'removed') THEN 1 ELSE 0 END ASC,
          ss2.total_points DESC,
          ss2.accuracy_pct DESC,
          ss2.matches_predicted DESC
      ) AS new_rank
    FROM v2_gang_season_standings ss2
    JOIN v2_gang_members gm
      ON gm.gang_id = ss2.gang_id AND gm.user_id = ss2.user_id
    WHERE ss2.gang_id = p_gang_id
  ) sub
  WHERE ss.gang_id = sub.gang_id
    AND ss.season_id = sub.season_id
    AND ss.user_id = sub.user_id;
END;
$$;

COMMENT ON FUNCTION recalculate_gang_standings_ranks(UUID) IS
  'Recalculates rank for all fixture and season standings rows in a gang. '
  'Called when a member status transitions between active and departed states. '
  'Left/removed members are always sorted to the bottom.';

-- Wrapper trigger function that extracts gang_id from the row and calls
-- the recalculation function.
CREATE OR REPLACE FUNCTION trg_recalculate_gang_standings_ranks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM recalculate_gang_standings_ranks(NEW.gang_id);
  RETURN NULL; -- AFTER trigger, return value ignored
END;
$$;

COMMENT ON FUNCTION trg_recalculate_gang_standings_ranks() IS
  'Trigger wrapper that calls recalculate_gang_standings_ranks(gang_id) '
  'when a gang member status changes between active/departed states.';

DROP TRIGGER IF EXISTS trg_member_status_recalc_ranks ON v2_gang_members;
CREATE TRIGGER trg_member_status_recalc_ranks
  AFTER UPDATE OF status ON v2_gang_members
  FOR EACH ROW
  WHEN (
    (OLD.status IS DISTINCT FROM NEW.status)
    AND (
      OLD.status IN ('approved', 'left', 'removed')
      OR NEW.status IN ('approved', 'left', 'removed')
    )
  )
  EXECUTE FUNCTION trg_recalculate_gang_standings_ranks();


-- =============================================================================
-- 6. Standings Update on Prediction Insert/Update
-- =============================================================================
-- When a user submits or updates a prediction, upsert their fixture standings
-- row with the updated predicted_count and last_submitted_at. This keeps the
-- materialized match leaderboard current for pre-resolution display.
-- =============================================================================

CREATE OR REPLACE FUNCTION upsert_fixture_standings(
  p_gang_id    UUID,
  p_fixture_id UUID,
  p_user_id    UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season_id UUID;
  v_predicted INT;
  v_last_submitted TIMESTAMPTZ;
BEGIN
  -- Look up the season_id from the fixture
  SELECT season_id INTO v_season_id
  FROM v2_league_season_fixtures
  WHERE id = p_fixture_id;

  -- Count total predictions (including unresolved) for this user/gang/fixture
  SELECT COUNT(*), MAX(submitted_at)
  INTO v_predicted, v_last_submitted
  FROM v2_predictions
  WHERE gang_id = p_gang_id
    AND fixture_id = p_fixture_id
    AND user_id = p_user_id;

  -- Upsert fixture standings row
  INSERT INTO v2_gang_fixture_standings (
    gang_id, season_id, fixture_id, user_id,
    predicted_count, last_submitted_at, updated_at
  )
  VALUES (
    p_gang_id, v_season_id, p_fixture_id, p_user_id,
    v_predicted, v_last_submitted, now()
  )
  ON CONFLICT (gang_id, fixture_id, user_id)
  DO UPDATE SET
    predicted_count   = EXCLUDED.predicted_count,
    last_submitted_at = EXCLUDED.last_submitted_at,
    updated_at        = now();
END;
$$;

COMMENT ON FUNCTION upsert_fixture_standings(UUID, UUID, UUID) IS
  'Upserts v2_gang_fixture_standings for a user''s prediction activity. '
  'Updates predicted_count and last_submitted_at. Called on prediction '
  'insert/update.';

-- Wrapper trigger function for prediction insert/update
CREATE OR REPLACE FUNCTION trg_upsert_fixture_standings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM upsert_fixture_standings(NEW.gang_id, NEW.fixture_id, NEW.user_id);
  RETURN NULL; -- AFTER trigger, return value ignored
END;
$$;

COMMENT ON FUNCTION trg_upsert_fixture_standings() IS
  'Trigger wrapper that calls upsert_fixture_standings on prediction '
  'insert or update.';

DROP TRIGGER IF EXISTS trg_prediction_upsert_standings ON v2_predictions;
CREATE TRIGGER trg_prediction_upsert_standings
  AFTER INSERT OR UPDATE ON v2_predictions
  FOR EACH ROW
  EXECUTE FUNCTION trg_upsert_fixture_standings();


-- =============================================================================
-- 7. Full Standings Recalculation on Scenario Resolution/Void
-- =============================================================================
-- When a scenario is resolved (is_resolved flips to true) or voided
-- (is_voided flips to true), recalculate the full standings for the
-- affected gang and fixture. This includes:
--   a) Recalculating correct_count, resolved_count, points_earned per user
--      in v2_gang_fixture_standings (excluding voided scenarios)
--   b) Computing fixture-level ranks
--   c) Aggregating into v2_gang_season_standings
--   d) Computing season-level ranks
-- =============================================================================

CREATE OR REPLACE FUNCTION recalculate_full_standings(
  p_gang_id    UUID,
  p_fixture_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season_id UUID;
BEGIN
  -- Look up the season_id from the fixture
  SELECT season_id INTO v_season_id
  FROM v2_league_season_fixtures
  WHERE id = p_fixture_id;

  -- -------------------------------------------------------------------------
  -- Step 1: Recalculate fixture-level stats for all users in this gang/fixture
  -- -------------------------------------------------------------------------
  -- Update correct_count, resolved_count, points_earned from predictions
  -- joined with non-voided scenarios.
  UPDATE v2_gang_fixture_standings fs
  SET
    resolved_count = COALESCE(agg.resolved_count, 0),
    correct_count  = COALESCE(agg.correct_count, 0),
    points_earned  = COALESCE(agg.points_earned, 0),
    updated_at     = now()
  FROM (
    SELECT
      p.user_id,
      COUNT(*) FILTER (WHERE sc.is_resolved = true AND sc.is_voided = false) AS resolved_count,
      COUNT(*) FILTER (WHERE p.is_correct = true AND sc.is_voided = false) AS correct_count,
      COALESCE(SUM(p.points_earned) FILTER (WHERE sc.is_voided = false), 0) AS points_earned
    FROM v2_predictions p
    JOIN v2_fixture_scenarios sc ON sc.id = p.scenario_id
    WHERE p.gang_id = p_gang_id
      AND p.fixture_id = p_fixture_id
    GROUP BY p.user_id
  ) agg
  WHERE fs.gang_id = p_gang_id
    AND fs.fixture_id = p_fixture_id
    AND fs.user_id = agg.user_id;

  -- -------------------------------------------------------------------------
  -- Step 2: Compute fixture-level ranks
  -- -------------------------------------------------------------------------
  -- Active members (approved) rank above departed (left/removed).
  -- Within each group: points DESC, last_submitted_at ASC NULLS LAST.
  UPDATE v2_gang_fixture_standings fs
  SET rank = sub.new_rank,
      updated_at = now()
  FROM (
    SELECT
      fs2.gang_id,
      fs2.fixture_id,
      fs2.user_id,
      RANK() OVER (
        PARTITION BY fs2.gang_id, fs2.fixture_id
        ORDER BY
          CASE WHEN gm.status IN ('left', 'removed') THEN 1 ELSE 0 END ASC,
          fs2.points_earned DESC,
          fs2.last_submitted_at ASC NULLS LAST
      ) AS new_rank
    FROM v2_gang_fixture_standings fs2
    JOIN v2_gang_members gm
      ON gm.gang_id = fs2.gang_id AND gm.user_id = fs2.user_id
    WHERE fs2.gang_id = p_gang_id
      AND fs2.fixture_id = p_fixture_id
  ) sub
  WHERE fs.gang_id = sub.gang_id
    AND fs.fixture_id = sub.fixture_id
    AND fs.user_id = sub.user_id;

  -- -------------------------------------------------------------------------
  -- Step 3: Aggregate into season standings
  -- -------------------------------------------------------------------------
  -- For each user in this gang/season, aggregate all fixture standings.
  -- matches_predicted = count of non-voided fixtures where user has predictions
  -- Excludes voided scenarios from all aggregations.
  INSERT INTO v2_gang_season_standings (
    gang_id, season_id, user_id,
    matches_predicted, total_points, total_correct, total_resolved,
    accuracy_pct, points_per_match, updated_at
  )
  SELECT
    p_gang_id,
    v_season_id,
    fs.user_id,
    -- matches_predicted: count distinct fixtures where user predicted
    -- and the fixture has at least one non-voided scenario
    COUNT(DISTINCT fs.fixture_id) AS matches_predicted,
    COALESCE(SUM(fs.points_earned), 0) AS total_points,
    COALESCE(SUM(fs.correct_count), 0) AS total_correct,
    COALESCE(SUM(fs.resolved_count), 0) AS total_resolved,
    -- accuracy_pct: (total_correct / total_resolved) * 100, 0 if no resolved
    CASE
      WHEN COALESCE(SUM(fs.resolved_count), 0) = 0 THEN 0
      ELSE ROUND(
        (COALESCE(SUM(fs.correct_count), 0)::DECIMAL
         / SUM(fs.resolved_count)) * 100,
        2
      )
    END AS accuracy_pct,
    -- points_per_match: total_points / matches_predicted, 0 if none
    CASE
      WHEN COUNT(DISTINCT fs.fixture_id) = 0 THEN 0
      ELSE ROUND(
        COALESCE(SUM(fs.points_earned), 0)::DECIMAL
        / COUNT(DISTINCT fs.fixture_id),
        2
      )
    END AS points_per_match,
    now()
  FROM v2_gang_fixture_standings fs
  WHERE fs.gang_id = p_gang_id
    AND fs.season_id = v_season_id
  GROUP BY fs.user_id
  ON CONFLICT (gang_id, season_id, user_id)
  DO UPDATE SET
    matches_predicted = EXCLUDED.matches_predicted,
    total_points      = EXCLUDED.total_points,
    total_correct     = EXCLUDED.total_correct,
    total_resolved    = EXCLUDED.total_resolved,
    accuracy_pct      = EXCLUDED.accuracy_pct,
    points_per_match  = EXCLUDED.points_per_match,
    updated_at        = now();

  -- -------------------------------------------------------------------------
  -- Step 4: Compute season-level ranks
  -- -------------------------------------------------------------------------
  -- Active members rank above departed. Among each group:
  -- total_points DESC, accuracy_pct DESC, matches_predicted DESC.
  UPDATE v2_gang_season_standings ss
  SET rank = sub.new_rank,
      updated_at = now()
  FROM (
    SELECT
      ss2.gang_id,
      ss2.season_id,
      ss2.user_id,
      RANK() OVER (
        PARTITION BY ss2.gang_id, ss2.season_id
        ORDER BY
          CASE WHEN gm.status IN ('left', 'removed') THEN 1 ELSE 0 END ASC,
          ss2.total_points DESC,
          ss2.accuracy_pct DESC,
          ss2.matches_predicted DESC
      ) AS new_rank
    FROM v2_gang_season_standings ss2
    JOIN v2_gang_members gm
      ON gm.gang_id = ss2.gang_id AND gm.user_id = ss2.user_id
    WHERE ss2.gang_id = p_gang_id
      AND ss2.season_id = v_season_id
  ) sub
  WHERE ss.gang_id = sub.gang_id
    AND ss.season_id = sub.season_id
    AND ss.user_id = sub.user_id;
END;
$$;

COMMENT ON FUNCTION recalculate_full_standings(UUID, UUID) IS
  'Full standings recalculation for a gang/fixture. Recalculates fixture-level '
  'stats (correct_count, resolved_count, points_earned) excluding voided '
  'scenarios, computes fixture ranks, aggregates to season standings, and '
  'computes season ranks. Called when a scenario is resolved or voided.';

-- Wrapper trigger function for scenario resolution/void
CREATE OR REPLACE FUNCTION trg_recalculate_full_standings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM recalculate_full_standings(NEW.gang_id, NEW.fixture_id);
  RETURN NULL; -- AFTER trigger, return value ignored
END;
$$;

COMMENT ON FUNCTION trg_recalculate_full_standings() IS
  'Trigger wrapper that calls recalculate_full_standings(gang_id, fixture_id) '
  'when a scenario is resolved or voided.';

DROP TRIGGER IF EXISTS trg_scenario_recalc_standings ON v2_fixture_scenarios;
CREATE TRIGGER trg_scenario_recalc_standings
  AFTER UPDATE ON v2_fixture_scenarios
  FOR EACH ROW
  WHEN (
    (NEW.is_resolved = true AND OLD.is_resolved = false)
    OR (NEW.is_voided = true AND OLD.is_voided = false)
  )
  EXECUTE FUNCTION trg_recalculate_full_standings();
