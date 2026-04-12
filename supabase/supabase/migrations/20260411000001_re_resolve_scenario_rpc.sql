-- =============================================================================
-- 20260411000001_re_resolve_scenario_rpc.sql
-- LIVE-DB-002 — Re-resolution RPC for stat reversals
--
-- Companion to resolve_scenario. Used by the live-poll-resolve-fixtures cron's
-- match-end reconciliation pass when Sportmonks revises stats AFTER a scenario
-- has already been resolved (e.g., a third-umpire wicket review reverses a
-- wicket, a no-ball reclassification revokes a boundary, etc.).
--
-- Unlike resolve_scenario, this function:
--   - REQUIRES is_resolved = true (errors otherwise)
--   - Updates correct_answer in place (no is_resolved transition)
--   - Re-scores all predictions for the scenario
--   - Explicitly calls recalculate_full_standings, because the existing
--     trg_scenario_recalc_standings trigger only fires on is_resolved
--     transitions and would otherwise miss this case
--   - Returns the previous correct_answer so the cron can log the change
--   - No-ops (returns NULL) if the new answer matches the existing one
--
-- IMPORTANT: For range scenarios, the caller must convert the raw numeric
-- value to the matching bracket string BEFORE calling this function.
-- =============================================================================

CREATE OR REPLACE FUNCTION re_resolve_scenario(
  p_scenario_id    UUID,
  p_correct_answer TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points     INT;
  v_old_answer TEXT;
  v_gang_id    UUID;
  v_fixture_id UUID;
BEGIN
  -- Load current state. Guard: only act on already-resolved scenarios.
  SELECT points, correct_answer, gang_id, fixture_id
    INTO v_points, v_old_answer, v_gang_id, v_fixture_id
  FROM v2_fixture_scenarios
  WHERE id = p_scenario_id
    AND is_resolved = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Scenario % is not resolved (use resolve_scenario for unresolved scenarios)',
      p_scenario_id;
  END IF;

  -- No-op if the answer hasn't changed. Returning NULL signals "no change"
  -- to the caller so it can skip logging/notifications.
  IF v_old_answer IS NOT DISTINCT FROM p_correct_answer THEN
    RETURN NULL;
  END IF;

  -- Update the scenario's correct_answer (is_resolved stays true).
  UPDATE v2_fixture_scenarios
  SET correct_answer = p_correct_answer
  WHERE id = p_scenario_id;

  -- Re-score every prediction for this scenario against the new answer.
  UPDATE v2_predictions
  SET is_correct = (value = p_correct_answer),
      points_earned = CASE
        WHEN value = p_correct_answer THEN v_points
        ELSE 0
      END
  WHERE scenario_id = p_scenario_id;

  -- The trg_scenario_recalc_standings trigger only fires on is_resolved
  -- false→true transitions. For re-resolution we must call the recalc
  -- function explicitly so fixture and season standings reflect the new
  -- per-prediction is_correct/points_earned values.
  PERFORM recalculate_full_standings(v_gang_id, v_fixture_id);

  RETURN v_old_answer;
END;
$$;

COMMENT ON FUNCTION re_resolve_scenario(UUID, TEXT) IS
  'Re-resolves an already-resolved scenario with a new correct_answer. Used '
  'by the live-poll-resolve-fixtures cron after Sportmonks revises stats '
  '(e.g., a third-umpire wicket review). Re-scores all predictions, '
  'recalculates standings, and returns the previous correct_answer. '
  'Returns NULL if the new answer matches the existing one. '
  'Errors if the scenario is not yet resolved (use resolve_scenario for that).';
