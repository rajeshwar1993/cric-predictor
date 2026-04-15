-- =============================================================================
-- Add v2_cron_run_status logging to PG cron functions
-- Re-creates seed-scenarios and deadline-reminders with UPSERT logging,
-- and wraps cleanup-rate-limits in a function with logging.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. run_seed_scenarios_cron() — add logging before RETURN
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION run_seed_scenarios_cron()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pair         RECORD;
  v_pairs_found  INT := 0;
  v_pairs_seeded INT := 0;
  v_errors       JSONB := '[]'::JSONB;
  v_start_time   TIMESTAMPTZ := clock_timestamp();
  v_result       JSONB;
BEGIN
  FOR v_pair IN
    SELECT g.id AS gang_id, f.id AS fixture_id
    FROM v2_league_season_fixtures f
    JOIN v2_gang_league_seasons gls
      ON gls.season_id = f.season_id
      AND gls.is_active = true
    JOIN v2_gangs g
      ON g.id = gls.gang_id
      AND g.is_deleted = false
    WHERE f.status = 'upcoming'
      AND f.start_datetime - INTERVAL '14 hours' <= now()
      AND f.start_datetime > now()
      AND NOT EXISTS (
        SELECT 1 FROM v2_fixture_scenarios fs
        WHERE fs.gang_id = g.id AND fs.fixture_id = f.id
      )
  LOOP
    v_pairs_found := v_pairs_found + 1;

    BEGIN
      PERFORM seed_fixture_scenarios_for_gang(v_pair.gang_id, v_pair.fixture_id);
      v_pairs_seeded := v_pairs_seeded + 1;

      RAISE NOTICE 'seed_scenarios_cron: seeded gang=% fixture=%',
        v_pair.gang_id, v_pair.fixture_id;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'seed_scenarios_cron: FAILED gang=% fixture=% error=%',
        v_pair.gang_id, v_pair.fixture_id, SQLERRM;

      v_errors := v_errors || jsonb_build_object(
        'gang_id', v_pair.gang_id,
        'fixture_id', v_pair.fixture_id,
        'error', SQLERRM
      );
    END;
  END LOOP;

  RAISE NOTICE 'seed_scenarios_cron: done — found=% seeded=% errors=%',
    v_pairs_found, v_pairs_seeded, jsonb_array_length(v_errors);

  v_result := jsonb_build_object(
    'pairs_found', v_pairs_found,
    'pairs_seeded', v_pairs_seeded,
    'errors', v_errors
  );

  -- Log run status
  INSERT INTO v2_cron_run_status (job_key, status, started_at, completed_at, duration_ms, summary, error_count, updated_at)
  VALUES (
    'seed-scenarios',
    CASE WHEN jsonb_array_length(v_errors) > 0 THEN 'failed' ELSE 'succeeded' END,
    v_start_time,
    clock_timestamp(),
    (EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000)::INT,
    v_result,
    jsonb_array_length(v_errors),
    clock_timestamp()
  )
  ON CONFLICT (job_key) DO UPDATE SET
    status = EXCLUDED.status,
    started_at = EXCLUDED.started_at,
    completed_at = EXCLUDED.completed_at,
    duration_ms = EXCLUDED.duration_ms,
    summary = EXCLUDED.summary,
    error_count = EXCLUDED.error_count,
    updated_at = EXCLUDED.updated_at;

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. run_deadline_reminders_cron() — add logging before RETURN
-- ---------------------------------------------------------------------------

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
  v_start_time         TIMESTAMPTZ := clock_timestamp();
  v_result             JSONB;
BEGIN
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
      INSERT INTO v2_notifications (user_id, type, gang_id, fixture_id, message)
      VALUES (
        v_member.user_id,
        'deadline_reminder',
        v_pair.gang_id,
        v_pair.fixture_id,
        'Predictions close in 1 hour for ' || v_match_name
      )
      ON CONFLICT DO NOTHING;

      IF FOUND THEN
        v_reminders_sent := v_reminders_sent + 1;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Deadline reminders complete: sent=%, pairs_checked=%',
    v_reminders_sent, v_pairs_checked;

  v_result := jsonb_build_object(
    'reminders_sent', v_reminders_sent,
    'pairs_checked', v_pairs_checked
  );

  -- Log run status
  INSERT INTO v2_cron_run_status (job_key, status, started_at, completed_at, duration_ms, summary, error_count, updated_at)
  VALUES (
    'deadline-reminders',
    'succeeded',
    v_start_time,
    clock_timestamp(),
    (EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000)::INT,
    v_result,
    0,
    clock_timestamp()
  )
  ON CONFLICT (job_key) DO UPDATE SET
    status = EXCLUDED.status,
    started_at = EXCLUDED.started_at,
    completed_at = EXCLUDED.completed_at,
    duration_ms = EXCLUDED.duration_ms,
    summary = EXCLUDED.summary,
    error_count = EXCLUDED.error_count,
    updated_at = EXCLUDED.updated_at;

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. run_cleanup_rate_limits() — new wrapper with logging
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION run_cleanup_rate_limits()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_time   TIMESTAMPTZ := clock_timestamp();
  v_deleted      INT;
  v_result       JSONB;
BEGIN
  DELETE FROM v2_rate_limits
  WHERE window_start < now() - INTERVAL '24 hours';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  v_result := jsonb_build_object('rows_deleted', v_deleted);

  -- Log run status
  INSERT INTO v2_cron_run_status (job_key, status, started_at, completed_at, duration_ms, summary, error_count, updated_at)
  VALUES (
    'cleanup-rate-limits',
    'succeeded',
    v_start_time,
    clock_timestamp(),
    (EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000)::INT,
    v_result,
    0,
    clock_timestamp()
  )
  ON CONFLICT (job_key) DO UPDATE SET
    status = EXCLUDED.status,
    started_at = EXCLUDED.started_at,
    completed_at = EXCLUDED.completed_at,
    duration_ms = EXCLUDED.duration_ms,
    summary = EXCLUDED.summary,
    error_count = EXCLUDED.error_count,
    updated_at = EXCLUDED.updated_at;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION run_cleanup_rate_limits() IS
  'Wrapper for rate limit cleanup with v2_cron_run_status logging. Replaces inline SQL cron.';

-- ---------------------------------------------------------------------------
-- 4. Update cron schedule to use wrapper function instead of inline SQL
-- ---------------------------------------------------------------------------
-- Note: On staging/prod, run manually in SQL Editor:
--   SELECT cron.unschedule('cleanup-rate-limits');
--   SELECT cron.schedule('cleanup-rate-limits', '0 3 * * *', $$SELECT run_cleanup_rate_limits()$$);
