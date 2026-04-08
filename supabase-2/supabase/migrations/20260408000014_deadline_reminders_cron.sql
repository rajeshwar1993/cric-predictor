-- =============================================================================
-- NOTIF-CRON-001: Deadline Reminders Cron
-- =============================================================================
-- Postgres function that sends deadline_reminder notifications to gang members
-- who haven't predicted yet, ~1 hour before the prediction window closes.
--
-- Called by pg_cron every 15 minutes.
-- Uses SECURITY DEFINER to bypass RLS for cross-table inserts.
-- =============================================================================

CREATE OR REPLACE FUNCTION run_deadline_reminders_cron()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reminders_sent     INT := 0;
  v_pairs_checked      INT := 0;
  v_pair               RECORD;
  v_member             RECORD;
  v_match_name         TEXT;
BEGIN
  -- -----------------------------------------------------------------------
  -- Step 1: Find (fixture, gang) pairs where the computed deadline is ~1h
  -- away. The 20-minute window accounts for cron scheduling lag.
  --
  -- Computed deadline = start_datetime - prediction_deadline_mins minutes
  -- We want: (deadline - 1 hour) falls within (now() - 20 min, now()]
  -- Rearranged: deadline BETWEEN (now() + 40 min) AND (now() + 1 hour + 20 min)
  --   i.e., deadline is roughly 1 hour from now, give or take 20 min
  -- -----------------------------------------------------------------------
  FOR v_pair IN
    SELECT
      f.id        AS fixture_id,
      gls.gang_id AS gang_id,
      f.start_datetime - (gls.prediction_deadline_mins * INTERVAL '1 minute') AS deadline,
      ht.code     AS home_code,
      at.code     AS away_code
    FROM v2_league_season_fixtures f
    JOIN v2_gang_league_seasons gls
      ON gls.season_id = f.season_id
      AND gls.league_id = f.league_id
      AND gls.is_active = true
    JOIN v2_gangs g
      ON g.id = gls.gang_id
      AND g.is_deleted = false
    JOIN v2_league_teams ht ON ht.id = f.home_team_id
    JOIN v2_league_teams at ON at.id = f.away_team_id
    WHERE f.status = 'upcoming'
      AND (f.start_datetime - (gls.prediction_deadline_mins * INTERVAL '1 minute'))
          BETWEEN (now() + INTERVAL '40 minutes')
              AND (now() + INTERVAL '1 hour 20 minutes')
  LOOP
    v_pairs_checked := v_pairs_checked + 1;
    v_match_name := v_pair.home_code || ' vs ' || v_pair.away_code;

    RAISE NOTICE 'Checking pair: fixture=%, gang=%, deadline=%, match=%',
      v_pair.fixture_id, v_pair.gang_id, v_pair.deadline, v_match_name;

    -- -------------------------------------------------------------------
    -- Step 2: For each approved, non-deleted member who hasn't predicted
    -- -------------------------------------------------------------------
    FOR v_member IN
      SELECT m.user_id
      FROM v2_gang_members m
      JOIN v2_profiles p ON p.id = m.user_id AND p.is_deleted = false
      WHERE m.gang_id = v_pair.gang_id
        AND m.status = 'approved'
        AND NOT EXISTS (
          SELECT 1
          FROM v2_predictions pred
          WHERE pred.gang_id = v_pair.gang_id
            AND pred.fixture_id = v_pair.fixture_id
            AND pred.user_id = m.user_id
        )
    LOOP
      -- -----------------------------------------------------------------
      -- Step 3: Insert deadline_reminder notification with dedup
      -- The unique partial index uniq_notifications_dedup prevents duplicates
      -- -----------------------------------------------------------------
      INSERT INTO v2_notifications (user_id, type, gang_id, fixture_id, message)
      VALUES (
        v_member.user_id,
        'deadline_reminder',
        v_pair.gang_id,
        v_pair.fixture_id,
        'Predictions close in 1 hour for ' || v_match_name
      )
      ON CONFLICT DO NOTHING;

      -- Check if the insert actually happened (not a duplicate)
      IF FOUND THEN
        v_reminders_sent := v_reminders_sent + 1;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Deadline reminders complete: sent=%, pairs_checked=%',
    v_reminders_sent, v_pairs_checked;

  RETURN jsonb_build_object(
    'reminders_sent', v_reminders_sent,
    'pairs_checked', v_pairs_checked
  );
END;
$$;

COMMENT ON FUNCTION run_deadline_reminders_cron() IS
  'Sends deadline_reminder notifications to gang members who have not predicted yet, ~1h before the prediction window closes.';

-- =============================================================================
-- pg_cron schedule (commented out — enable in production)
-- =============================================================================
-- SELECT cron.schedule(
--   'deadline-reminders',
--   '*/15 * * * *',
--   $$SELECT run_deadline_reminders_cron()$$
-- );
