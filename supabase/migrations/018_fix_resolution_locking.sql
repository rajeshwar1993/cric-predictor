-- Bragg — 018 Fix resolution locking to avoid deadlocks
-- Use SKIP LOCKED instead of FOR UPDATE to prevent concurrent cron runs
-- from blocking each other. Skipped rows will be picked up on the next tick.

CREATE OR REPLACE FUNCTION resolve_scenarios_by_category(
  p_match_id INT,
  p_category TEXT,
  p_correct_answer TEXT
)
RETURNS INT AS $$
DECLARE
  v_scenario RECORD;
  v_resolved_count INT := 0;
BEGIN
  IF p_correct_answer IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_scenario IN
    SELECT id, points FROM scenarios
    WHERE match_id = p_match_id
      AND system_category = p_category
      AND is_resolved = false
      AND is_removed = false
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE scenarios
    SET correct_answer = p_correct_answer, is_resolved = true
    WHERE id = v_scenario.id;

    UPDATE predictions
    SET is_correct = true, points_earned = v_scenario.points
    WHERE scenario_id = v_scenario.id
      AND value = p_correct_answer;

    UPDATE predictions
    SET is_correct = false, points_earned = 0
    WHERE scenario_id = v_scenario.id
      AND value != p_correct_answer;

    v_resolved_count := v_resolved_count + 1;
  END LOOP;

  RETURN v_resolved_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
