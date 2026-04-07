-- Drop the unique constraint on (season_id, match_number) since Sportmonks
-- playoff fixtures can share match_number with regular season fixtures.
-- The api_id UNIQUE constraint is sufficient for deduplication.

ALTER TABLE v2_league_season_fixtures
  DROP CONSTRAINT IF EXISTS v2_league_season_fixtures_season_id_match_number_key;
