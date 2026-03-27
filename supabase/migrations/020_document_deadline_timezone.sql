-- Bragg — 020 Document & Centralize Deadline Timezone Logic
--
-- TIMEZONE SEMANTICS (for future maintainers):
--
--   matches.date   = DATE   (e.g., '2026-03-28')
--   matches.time_ist = TIME (e.g., '19:30:00') — always in IST
--
--   (m.date + m.time_ist) produces a naive TIMESTAMP: '2026-03-28 19:30:00'
--
--   Applying AT TIME ZONE 'Asia/Kolkata' to a naive timestamp means:
--   "this value IS in IST — convert it to TIMESTAMPTZ (UTC internally)"
--   Result: '2026-03-28 14:00:00+00' (19:30 IST = 14:00 UTC)
--
--   now() returns TIMESTAMPTZ in UTC.
--   So: now() > (deadline AT TIME ZONE 'Asia/Kolkata') compares UTC to UTC. Correct.
--
--   India does NOT observe DST. IST is always UTC+05:30. No edge cases.
--
-- This migration creates a helper function so the formula is defined once
-- and all RLS policies reference it instead of duplicating the calculation.

CREATE OR REPLACE FUNCTION prediction_deadline(
  p_match_date DATE,
  p_match_time TIME,
  p_custom_deadline TIMESTAMPTZ DEFAULT NULL
)
RETURNS TIMESTAMPTZ AS $$
  -- Custom deadline takes precedence if set by admin.
  -- Otherwise: match start (IST → UTC) minus 45 minutes.
  SELECT COALESCE(
    p_custom_deadline,
    (p_match_date + p_match_time - interval '45 minutes') AT TIME ZONE 'Asia/Kolkata'
  );
$$ LANGUAGE sql IMMUTABLE;

-- Now update the three prediction RLS policies to use the helper.

-- 1. SELECT: read others' predictions after deadline
DROP POLICY IF EXISTS "read_others_after_deadline" ON predictions;

CREATE POLICY "read_others_after_deadline" ON predictions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scenarios s
    JOIN matches m ON m.id = s.match_id
    LEFT JOIN match_group_settings mgs ON mgs.group_id = s.group_id AND mgs.match_id = s.match_id
    WHERE s.id = predictions.scenario_id
      AND is_group_member(s.group_id, auth.uid())
      AND (
        m.status IN ('live', 'completed', 'abandoned', 'no_result')
        OR mgs.is_locked = true
        OR now() > prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)
      )
  )
);

-- 2. INSERT: submit predictions before deadline
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
      AND now() < prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)
  )
);

-- 3. UPDATE: edit predictions before deadline
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
      AND now() < prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)
  )
);
