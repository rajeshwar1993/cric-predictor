-- Bragg — 019 Enforce scenarios_published in prediction INSERT RLS
-- Members should only be able to insert predictions for matches where
-- scenarios have been published by the admin.

DROP POLICY IF EXISTS "insert_own_prediction" ON predictions;

CREATE POLICY "insert_own_prediction" ON predictions FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM scenarios s
    JOIN matches m ON m.id = s.match_id
    LEFT JOIN match_group_settings mgs ON mgs.group_id = s.group_id AND mgs.match_id = s.match_id
    WHERE s.id = predictions.scenario_id
      AND is_group_member(s.group_id, auth.uid())
      AND m.status = 'upcoming'
      AND COALESCE(mgs.is_locked, false) = false
      AND COALESCE(mgs.scenarios_published, false) = true
      AND now() < COALESCE(
        mgs.prediction_deadline,
        (m.date + m.time_ist - interval '45 minutes') AT TIME ZONE 'Asia/Kolkata'
      )
  )
);
