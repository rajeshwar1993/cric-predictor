-- =============================================================================
-- ADM-001: Add system admin flag to profiles
-- =============================================================================

-- Add is_system_admin flag to profiles (defaults to false for all existing rows)
ALTER TABLE v2_profiles
  ADD COLUMN is_system_admin BOOLEAN NOT NULL DEFAULT false;

-- Partial index for quick admin lookups (only indexes the true rows)
CREATE INDEX idx_v2_profiles_is_system_admin
  ON v2_profiles (is_system_admin) WHERE is_system_admin = true;

-- Note: No new RLS policy needed. The existing user-facing SELECT policies
-- on v2_profiles return specific columns via the app's DAL functions.
-- The is_system_admin column is only read by the service role client
-- (which bypasses RLS entirely), so it is never exposed to regular users.
