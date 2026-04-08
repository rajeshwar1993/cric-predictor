-- =============================================================================
-- 013_scenario_resolution_functions.sql
-- LIVE-DB-001 — Scenario resolution Postgres functions
--
-- Functions for the live-poll cron to resolve scenarios, void fixtures,
-- mark fixtures resolved, and check completion status.
--
-- All functions are SECURITY DEFINER to bypass RLS.
-- =============================================================================


-- =============================================================================
-- resolve_scenario
-- =============================================================================
-- Sets the correct answer on a scenario, marks it resolved, and updates all
-- predictions for that scenario with is_correct and points_earned.
-- Standings recalculation triggers fire automatically (trg_scenario_recalc_standings).
--
-- IMPORTANT: For range scenarios, the caller must convert the raw numeric value
-- to the matching bracket string BEFORE calling this function. This function
-- compares prediction values as exact string matches.
-- =============================================================================

CREATE OR REPLACE FUNCTION resolve_scenario(
  p_scenario_id   UUID,
  p_correct_answer TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points INT;
BEGIN
  -- Get the point value for this scenario
  SELECT points INTO v_points
  FROM v2_fixture_scenarios
  WHERE id = p_scenario_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scenario % not found', p_scenario_id;
  END IF;

  -- Mark the scenario as resolved with the correct answer
  UPDATE v2_fixture_scenarios
  SET correct_answer = p_correct_answer,
      is_resolved = true
  WHERE id = p_scenario_id
    AND is_resolved = false;  -- Guard: never re-resolve

  -- If already resolved, skip prediction updates
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Update all predictions for this scenario
  UPDATE v2_predictions
  SET is_correct = (value = p_correct_answer),
      points_earned = CASE
        WHEN value = p_correct_answer THEN v_points
        ELSE 0
      END
  WHERE scenario_id = p_scenario_id;

  -- NOTE: The trg_scenario_recalc_standings trigger on v2_fixture_scenarios
  -- fires automatically after the is_resolved update, recalculating
  -- fixture standings and season standings for the affected gang.
END;
$$;

COMMENT ON FUNCTION resolve_scenario(UUID, TEXT) IS
  'Resolves a scenario by setting its correct_answer and is_resolved=true, '
  'then updating all predictions for that scenario with is_correct and '
  'points_earned. Standings triggers fire automatically. Idempotent: '
  'skips if scenario is already resolved.';


-- =============================================================================
-- void_fixture_scenarios
-- =============================================================================
-- Called when a fixture is abandoned or has no result.
-- Sets is_voided=true on ALL scenarios for the fixture (across all gangs).
-- Creates or updates the v2_fixture_results row with resolved_at = now()
-- and match_winner_id = null.
-- Standings triggers fire automatically.
-- =============================================================================

CREATE OR REPLACE FUNCTION void_fixture_scenarios(
  p_fixture_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Void all scenarios for this fixture (across all gangs)
  UPDATE v2_fixture_scenarios
  SET is_voided = true
  WHERE fixture_id = p_fixture_id
    AND is_voided = false;

  -- Create or update fixture_results row
  INSERT INTO v2_fixture_results (fixture_id, match_winner_id, resolved_at)
  VALUES (p_fixture_id, NULL, now())
  ON CONFLICT (fixture_id)
  DO UPDATE SET
    resolved_at = now(),
    match_winner_id = NULL;

  -- NOTE: The trg_scenario_recalc_standings trigger fires for each
  -- scenario row that transitions is_voided from false to true,
  -- recalculating standings with voided scenarios excluded.
END;
$$;

COMMENT ON FUNCTION void_fixture_scenarios(UUID) IS
  'Voids all scenarios for an abandoned/no-result fixture. Sets is_voided=true '
  'on all v2_fixture_scenarios rows, creates/updates v2_fixture_results with '
  'null match_winner and resolved_at. Standings triggers fire automatically.';


-- =============================================================================
-- mark_fixture_resolved
-- =============================================================================
-- Called when all scenarios for a fixture have been resolved.
-- Sets the fixture status to 'resolved' and creates/updates fixture_results
-- with resolved_at.
-- =============================================================================

CREATE OR REPLACE FUNCTION mark_fixture_resolved(
  p_fixture_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update fixture status to 'resolved'
  -- The status_changed_at trigger fires automatically
  UPDATE v2_league_season_fixtures
  SET status = 'resolved'
  WHERE id = p_fixture_id
    AND status != 'resolved';  -- Guard: don't re-resolve

  -- Create or update fixture_results with resolved_at
  INSERT INTO v2_fixture_results (fixture_id, resolved_at)
  VALUES (p_fixture_id, now())
  ON CONFLICT (fixture_id)
  DO UPDATE SET
    resolved_at = now();
END;
$$;

COMMENT ON FUNCTION mark_fixture_resolved(UUID) IS
  'Marks a fixture as fully resolved after all scenarios are resolved. '
  'Sets v2_league_season_fixtures.status to ''resolved'' and creates/updates '
  'v2_fixture_results with resolved_at timestamp.';


-- =============================================================================
-- all_scenarios_resolved
-- =============================================================================
-- Returns true if ALL active (non-voided) scenarios for a fixture have
-- is_resolved = true. Returns true if there are no active scenarios
-- (all voided or none exist).
-- =============================================================================

CREATE OR REPLACE FUNCTION all_scenarios_resolved(
  p_fixture_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unresolved_count INT;
BEGIN
  SELECT COUNT(*)
  INTO v_unresolved_count
  FROM v2_fixture_scenarios
  WHERE fixture_id = p_fixture_id
    AND is_voided = false
    AND is_resolved = false;

  RETURN v_unresolved_count = 0;
END;
$$;

COMMENT ON FUNCTION all_scenarios_resolved(UUID) IS
  'Returns true if all non-voided scenarios for a fixture are resolved. '
  'Returns true if there are no active scenarios (all voided or none exist).';
