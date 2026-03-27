-- Bragg — 008 Scenario Publishing
-- Admin must publish scenarios before members can predict

ALTER TABLE match_group_settings
  ADD COLUMN scenarios_published BOOLEAN NOT NULL DEFAULT false;

-- Backfill: mark existing settings as published (for any matches already in progress)
UPDATE match_group_settings SET scenarios_published = true;
