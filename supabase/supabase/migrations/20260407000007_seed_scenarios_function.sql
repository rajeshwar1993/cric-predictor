-- =============================================================================
-- 007_seed_scenarios_function.sql
-- Bragg v2 — Scenario seeding Postgres functions
--
-- Story:  docs/stories/phase-2-gangs.md § GANG-DB-001
-- PRD:    docs/PRD.V2.md § "seed-scenarios"
--
-- Two functions:
--   1. seed_fixture_scenarios_for_gang(p_gang_id, p_fixture_id)
--      Seeds v2_fixture_scenarios from v2_scenario_templates for a single
--      (gang, fixture) pair. Replaces {Home Team}/{Away Team} placeholders
--      with real team codes. Idempotent via ON CONFLICT DO NOTHING.
--
--   2. seed_fixture_scenarios_for_all_active_gangs(p_fixture_id)
--      Calls the per-gang function for every non-deleted, active gang
--      enrolled in the fixture's league season.
--
-- Both are SECURITY DEFINER so they can write through RLS.
-- Uses CREATE OR REPLACE for idempotency.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. seed_fixture_scenarios_for_gang
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION seed_fixture_scenarios_for_gang(
  p_gang_id   UUID,
  p_fixture_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_league_id     UUID;
  v_season_id     UUID;
  v_home_team_id  UUID;
  v_away_team_id  UUID;
  v_home_code     TEXT;
  v_away_code     TEXT;
  v_sport_id      UUID;
BEGIN
  -- -----------------------------------------------------------------------
  -- Step 1: Look up the fixture → home_team_id, away_team_id, season_id, league_id
  -- -----------------------------------------------------------------------
  SELECT
    f.league_id,
    f.season_id,
    f.home_team_id,
    f.away_team_id
  INTO
    v_league_id,
    v_season_id,
    v_home_team_id,
    v_away_team_id
  FROM v2_league_season_fixtures f
  WHERE f.id = p_fixture_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fixture not found: %', p_fixture_id;
  END IF;

  -- -----------------------------------------------------------------------
  -- Step 2: Look up team codes from v2_league_teams
  -- -----------------------------------------------------------------------
  SELECT lt.code INTO v_home_code
  FROM v2_league_teams lt
  WHERE lt.id = v_home_team_id;

  SELECT lt.code INTO v_away_code
  FROM v2_league_teams lt
  WHERE lt.id = v_away_team_id;

  -- -----------------------------------------------------------------------
  -- Step 3: Resolve the sport_id for the league
  -- -----------------------------------------------------------------------
  SELECT l.sport_id INTO v_sport_id
  FROM v2_leagues l
  WHERE l.id = v_league_id;

  -- -----------------------------------------------------------------------
  -- Step 4: Insert one v2_fixture_scenarios row per active template
  -- -----------------------------------------------------------------------
  INSERT INTO v2_fixture_scenarios (
    id,
    template_id,
    league_id,
    season_id,
    fixture_id,
    gang_id,
    type,
    slug,
    title,
    input_type,
    options,
    points,
    resolution_phase
  )
  SELECT
    gen_random_uuid(),
    t.id,
    v_league_id,
    v_season_id,
    p_fixture_id,
    p_gang_id,
    'system'::v2_scenario_type,
    t.slug,
    REPLACE(REPLACE(t.title, '{Home Team}', v_home_code), '{Away Team}', v_away_code),
    t.input_type,
    t.options,
    t.points,
    t.resolution_phase
  FROM v2_scenario_templates t
  WHERE t.is_active = true
    AND t.sport_id = v_sport_id
  ON CONFLICT (gang_id, fixture_id, slug) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION seed_fixture_scenarios_for_gang(UUID, UUID)
  IS 'Seeds v2_fixture_scenarios from active templates for a single (gang, fixture) pair. Idempotent.';


-- ---------------------------------------------------------------------------
-- 2. seed_fixture_scenarios_for_all_active_gangs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION seed_fixture_scenarios_for_all_active_gangs(
  p_fixture_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_league_id  UUID;
  v_season_id  UUID;
  r            RECORD;
BEGIN
  -- -----------------------------------------------------------------------
  -- Step 1: Look up fixture to get league_id and season_id
  -- -----------------------------------------------------------------------
  SELECT f.league_id, f.season_id
  INTO v_league_id, v_season_id
  FROM v2_league_season_fixtures f
  WHERE f.id = p_fixture_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fixture not found: %', p_fixture_id;
  END IF;

  -- -----------------------------------------------------------------------
  -- Step 2: Loop over every eligible gang and call per-gang function
  --   Filters:
  --     - v2_gangs.is_deleted = false
  --     - v2_gang_league_seasons.is_active = true
  --     - Matching league_id and season_id from the fixture
  -- -----------------------------------------------------------------------
  FOR r IN
    SELECT gls.gang_id
    FROM v2_gang_league_seasons gls
    JOIN v2_gangs g ON g.id = gls.gang_id
    WHERE gls.league_id = v_league_id
      AND gls.season_id = v_season_id
      AND gls.is_active = true
      AND g.is_deleted = false
  LOOP
    PERFORM seed_fixture_scenarios_for_gang(r.gang_id, p_fixture_id);
  END LOOP;
END;
$$;

COMMENT ON FUNCTION seed_fixture_scenarios_for_all_active_gangs(UUID)
  IS 'Seeds fixture scenarios for all active, non-deleted gangs enrolled in the fixture''s league season.';
