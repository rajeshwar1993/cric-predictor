-- Bragg — 035 Function to check who has predicted (without revealing predictions)
-- Returns user_ids of group members who have submitted at least one prediction
-- for a given match. Uses SECURITY DEFINER to bypass RLS — only returns IDs,
-- not prediction values, so it doesn't leak any data.

CREATE OR REPLACE FUNCTION get_members_who_predicted(
  p_group_id UUID,
  p_match_id INT
)
RETURNS TABLE(user_id UUID) AS $$
  SELECT DISTINCT pr.user_id
  FROM predictions pr
  JOIN scenarios s ON s.id = pr.scenario_id
  WHERE s.group_id = p_group_id
    AND s.match_id = p_match_id
    AND s.is_removed = false
    AND s.approval_status IN ('auto_approved', 'approved');
$$ LANGUAGE sql SECURITY DEFINER STABLE;
