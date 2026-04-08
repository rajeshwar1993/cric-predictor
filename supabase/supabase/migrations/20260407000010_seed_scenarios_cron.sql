-- =============================================================================
-- 010_seed_scenarios_cron.sql
-- Bragg v2 — Seed scenarios cron function
--
-- Story:  docs/stories/phase-3-match-sync.md § SYNC-CRON-003
-- PRD:    docs/PRD.V2.md § "seed-scenarios"
--
-- Function: run_seed_scenarios_cron() RETURNS JSONB
--   Runs every 30 minutes via pg_cron.
--   Finds all (gang, fixture) pairs where:
--     - fixture is upcoming and within 14 hours of start
--     - gang is active and not deleted
--     - scenarios have not yet been seeded
--   Calls seed_fixture_scenarios_for_gang() for each pair.
--   Per-pair failure does not abort the run.
--   Returns a JSON summary: { pairs_found, pairs_seeded, errors: [...] }
--
-- SECURITY DEFINER so it can write through RLS.
-- Uses gen_random_uuid() (not uuid_generate_v4).
-- =============================================================================

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
BEGIN
  -- -----------------------------------------------------------------------
  -- Loop over all (gang, fixture) pairs needing seeding.
  --
  -- Criteria:
  --   - Fixture status = 'upcoming'
  --   - Within 14-hour buffer: start_datetime - 14h <= now() < start_datetime
  --   - Gang is not deleted
  --   - Gang's league season enrollment is active
  --   - Scenarios not already seeded for this (gang, fixture)
  -- -----------------------------------------------------------------------
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

    -- Per-pair transaction: failure on one pair doesn't abort the cron
    BEGIN
      PERFORM seed_fixture_scenarios_for_gang(v_pair.gang_id, v_pair.fixture_id);
      v_pairs_seeded := v_pairs_seeded + 1;

      RAISE NOTICE 'seed_scenarios_cron: seeded gang=% fixture=%',
        v_pair.gang_id, v_pair.fixture_id;

    EXCEPTION WHEN OTHERS THEN
      -- Log the error but continue processing other pairs
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

  RETURN jsonb_build_object(
    'pairs_found', v_pairs_found,
    'pairs_seeded', v_pairs_seeded,
    'errors', v_errors
  );
END;
$$;

COMMENT ON FUNCTION run_seed_scenarios_cron()
  IS 'Cron function: seeds fixture scenarios for all eligible (gang, fixture) pairs within the 14-hour pre-match window. Returns JSON summary.';

-- ---------------------------------------------------------------------------
-- pg_cron schedule (uncomment to enable)
-- Runs every 30 minutes.
-- ---------------------------------------------------------------------------
-- SELECT cron.schedule(
--   'seed-scenarios-every-30m',
--   '*/30 * * * *',
--   $$SELECT run_seed_scenarios_cron()$$
-- );
