-- Bragg — 031 Add team_key and team_logo to teams table
-- Stores API identifier and logo URL from api-cricket.com get_teams endpoint

ALTER TABLE teams ADD COLUMN team_key TEXT;
ALTER TABLE teams ADD COLUMN team_logo TEXT;
