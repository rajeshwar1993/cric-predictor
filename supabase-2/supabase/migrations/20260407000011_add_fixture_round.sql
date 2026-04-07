-- Add round column to v2_league_season_fixtures.
-- Sportmonks `round` field is unique per season (e.g., "1st Match", "Qualifier 1", "Final").
-- Replace (season_id, match_number) unique constraint with (season_id, round)
-- so playoff fixtures don't collide with regular season match_numbers.
-- match_number INT is kept for display sorting.

-- Step 1: Add round column
ALTER TABLE v2_league_season_fixtures
  ADD COLUMN IF NOT EXISTS round TEXT;

-- Step 2: Backfill round from match_number for existing rows
UPDATE v2_league_season_fixtures
  SET round = match_number || 'th Match'
  WHERE round IS NULL;

-- Step 3: Make round NOT NULL
ALTER TABLE v2_league_season_fixtures
  ALTER COLUMN round SET NOT NULL;

-- Step 4: Drop old unique constraint
ALTER TABLE v2_league_season_fixtures
  DROP CONSTRAINT IF EXISTS v2_league_season_fixtures_season_id_match_number_key;

-- Step 5: Add new unique constraint on (season_id, round)
ALTER TABLE v2_league_season_fixtures
  ADD CONSTRAINT v2_league_season_fixtures_season_round_key
  UNIQUE (season_id, round);

COMMENT ON COLUMN v2_league_season_fixtures.round IS 'Sportmonks round string e.g. "1st Match", "Qualifier 1", "Final". Unique per season.';
