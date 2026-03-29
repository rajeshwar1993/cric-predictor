-- Bragg — 036 Prediction Window
--
-- Introduces a lower-bound time gate for predictions:
-- Predictions are only accepted starting at 8:00 AM IST on the match date.
--
-- This migration:
-- 1. Creates prediction_window_open() SQL helper function
-- 2. Updates INSERT RLS policy to add window open check
-- 3. Updates UPDATE RLS policy to add window open check
-- 4. Does NOT modify SELECT policy (read visibility is unchanged)
-- 5. Does NOT modify any existing data
--
-- TIMEZONE SEMANTICS:
--   (m.date + '08:00:00'::time) AT TIME ZONE 'Asia/Kolkata'
--   Interprets the naive timestamp as IST, returns TIMESTAMPTZ in UTC.
--   8:00 AM IST = 2:30 AM UTC. now() is also UTC. Comparison is correct.
--   India does NOT observe DST. IST = UTC+05:30 always.

-- ─── Step 1: Helper function ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION prediction_window_open(
  p_match_date DATE
)
RETURNS TIMESTAMPTZ AS $$
  SELECT (p_match_date + '08:00:00'::time) AT TIME ZONE 'Asia/Kolkata';
$$ LANGUAGE sql IMMUTABLE;

COMMENT ON FUNCTION prediction_window_open IS
  'Returns the prediction window open time (8:00 AM IST) for a given match date. '
  'Used in RLS policies to enforce the lower bound of the prediction window.';

-- ─── Step 2: Update INSERT policy ──────────────────────────────────────

DROP POLICY IF EXISTS "insert_own_prediction" ON predictions;

CREATE POLICY "insert_own_prediction" ON predictions FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM scenarios s
    JOIN matches m ON m.id = s.match_id
    LEFT JOIN match_group_settings mgs
      ON mgs.group_id = s.group_id AND mgs.match_id = s.match_id
    WHERE s.id = predictions.scenario_id
      AND is_group_member(s.group_id, auth.uid())
      AND m.status = 'upcoming'
      AND COALESCE(mgs.is_locked, false) = false
      AND COALESCE(mgs.scenarios_published, false) = true
      AND now() >= prediction_window_open(m.date)
      AND now() < prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)
  )
);

-- ─── Step 3: Update UPDATE policy ──────────────────────────────────────

DROP POLICY IF EXISTS "update_own_prediction" ON predictions;

CREATE POLICY "update_own_prediction" ON predictions FOR UPDATE USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM scenarios s
    JOIN matches m ON m.id = s.match_id
    LEFT JOIN match_group_settings mgs
      ON mgs.group_id = s.group_id AND mgs.match_id = s.match_id
    WHERE s.id = predictions.scenario_id
      AND is_group_member(s.group_id, auth.uid())
      AND m.status = 'upcoming'
      AND COALESCE(mgs.is_locked, false) = false
      AND now() >= prediction_window_open(m.date)
      AND now() < prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)
  )
);

-- ─── Rollback SQL (run manually if needed) ─────────────────────────────
--
-- To reverse this migration, run the following:
--
-- DROP POLICY IF EXISTS "insert_own_prediction" ON predictions;
-- CREATE POLICY "insert_own_prediction" ON predictions FOR INSERT WITH CHECK (
--   auth.uid() = user_id
--   AND EXISTS (
--     SELECT 1 FROM scenarios s
--     JOIN matches m ON m.id = s.match_id
--     LEFT JOIN match_group_settings mgs ON mgs.group_id = s.group_id AND mgs.match_id = s.match_id
--     WHERE s.id = predictions.scenario_id
--       AND is_group_member(s.group_id, auth.uid())
--       AND m.status = 'upcoming'
--       AND COALESCE(mgs.is_locked, false) = false
--       AND COALESCE(mgs.scenarios_published, false) = true
--       AND now() < prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)
--   )
-- );
--
-- DROP POLICY IF EXISTS "update_own_prediction" ON predictions;
-- CREATE POLICY "update_own_prediction" ON predictions FOR UPDATE USING (
--   auth.uid() = user_id
--   AND EXISTS (
--     SELECT 1 FROM scenarios s
--     JOIN matches m ON m.id = s.match_id
--     LEFT JOIN match_group_settings mgs ON mgs.group_id = s.group_id AND mgs.match_id = s.match_id
--     WHERE s.id = predictions.scenario_id
--       AND is_group_member(s.group_id, auth.uid())
--       AND m.status = 'upcoming'
--       AND COALESCE(mgs.is_locked, false) = false
--       AND now() < prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)
--   )
-- );
--
-- DROP FUNCTION IF EXISTS prediction_window_open(DATE);
