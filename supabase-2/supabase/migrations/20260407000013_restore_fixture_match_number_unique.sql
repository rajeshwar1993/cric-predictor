-- Restore the unique constraint on (season_id, match_number).
-- Playoff TBC fixtures are filtered out during sync instead.

ALTER TABLE v2_league_season_fixtures
  ADD CONSTRAINT v2_league_season_fixtures_season_id_match_number_key
  UNIQUE (season_id, match_number);
