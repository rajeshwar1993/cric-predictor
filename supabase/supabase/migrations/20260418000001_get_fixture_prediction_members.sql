-- =============================================================================
-- 20260418000001_get_fixture_prediction_members.sql
-- Bragg v2 — RPC to return which gang members have predicted per fixture
--
-- BUG-001: The RLS SELECT policy on v2_predictions enforces deadline-based
-- visibility, which means the prediction count shown on match cards is
-- understated before the deadline (only the caller's own predictions are
-- visible). This SECURITY DEFINER RPC bypasses the RLS restriction to
-- return the *identity* of members who have predicted — without exposing
-- *what* they predicted (no scenario choices or option selections).
--
-- The function:
--   1. Validates the caller (auth.uid()) is an approved member of the gang
--      via is_gang_member(). If not, returns an empty result set (no error
--      thrown — avoids leaking information about gang existence).
--   2. Queries v2_predictions joined to v2_profiles for display names.
--   3. Returns DISTINCT ON (fixture_id, user_id) to deduplicate users who
--      have multiple scenario predictions per fixture.
--   4. Uses COALESCE for display_name fallback: first 10 chars of email.
--
-- Accepts an array of fixture_ids so the DAL can batch all upcoming
-- fixtures in a single RPC call instead of N+1 calls.
--
-- PRD references:
--   - docs/bugs/BUG-001-prediction-count-and-pills.md
--   - v2_predictions RLS (20260406000002_rls_policies.sql)
--   - is_gang_member helper (20260406000002_rls_policies.sql)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- get_fixture_prediction_members(gang_id, fixture_ids[]) → TABLE
-- ---------------------------------------------------------------------------
-- Returns (fixture_id, user_id, display_name) for every gang member who has
-- at least one prediction row for any of the given fixtures in the given
-- gang. One row per user per fixture (deduplicated).
--
-- SECURITY DEFINER: bypasses RLS on v2_predictions and v2_profiles so the
-- count/identity is accurate regardless of deadline visibility rules.
--
-- Returns empty set (no exception) if the caller is not an approved member
-- of the gang — this prevents information leakage about gang existence.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_fixture_prediction_members(
  p_gang_id     UUID,
  p_fixture_ids UUID[]
)
RETURNS TABLE (
  fixture_id   UUID,
  user_id      UUID,
  display_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate caller is an approved member of this gang.
  -- Return empty set (not an error) if membership check fails.
  IF NOT is_gang_member(p_gang_id, auth.uid()) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT DISTINCT ON (pred.fixture_id, pred.user_id)
      pred.fixture_id,
      pred.user_id,
      COALESCE(p.display_name, LEFT(p.email, 10)) AS display_name
    FROM v2_predictions pred
    JOIN v2_profiles p ON p.id = pred.user_id
    WHERE pred.gang_id = p_gang_id
      AND pred.fixture_id = ANY(p_fixture_ids)
    ORDER BY pred.fixture_id, pred.user_id;
END;
$$;

COMMENT ON FUNCTION get_fixture_prediction_members(UUID, UUID[]) IS
  'Returns (fixture_id, user_id, display_name) for gang members who have predicted on the given fixtures. Bypasses RLS deadline visibility to provide accurate prediction counts. Does NOT expose prediction content. Caller must be an approved gang member (auth.uid()).';

GRANT EXECUTE ON FUNCTION get_fixture_prediction_members(UUID, UUID[]) TO authenticated;
