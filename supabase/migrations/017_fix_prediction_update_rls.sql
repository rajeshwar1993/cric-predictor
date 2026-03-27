-- Bragg — 017 Fix predictions UPDATE RLS to check group membership
-- Without this, a removed user can still update predictions they made
-- as long as the match is upcoming and deadline hasn't passed.

DROP POLICY IF EXISTS "update_own_prediction" ON predictions;

CREATE POLICY "update_own_prediction" ON predictions FOR UPDATE USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM scenarios s
    JOIN matches m ON m.id = s.match_id
    LEFT JOIN match_group_settings mgs ON mgs.group_id = s.group_id AND mgs.match_id = s.match_id
    WHERE s.id = predictions.scenario_id
      AND is_group_member(s.group_id, auth.uid())
      AND m.status = 'upcoming'
      AND COALESCE(mgs.is_locked, false) = false
      AND now() < COALESCE(
        mgs.prediction_deadline,
        (m.date + m.time_ist - interval '45 minutes') AT TIME ZONE 'Asia/Kolkata'
      )
  )
);
