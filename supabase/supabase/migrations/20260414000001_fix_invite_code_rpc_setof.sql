-- ---------------------------------------------------------------------------
-- Fix get_gang_by_invite_code: change RETURNS v2_gangs → RETURNS SETOF v2_gangs
--
-- PostgREST returns a single JSON object for non-SETOF functions, but the
-- application code (DAL + server action) expects an array. This mismatch
-- causes the join page to always show "invalid invite code" even for valid
-- codes.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_gang_by_invite_code(text);

CREATE OR REPLACE FUNCTION get_gang_by_invite_code(p_code TEXT)
RETURNS SETOF v2_gangs
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM v2_gangs
  WHERE invite_code = p_code
  LIMIT 1;
$$;
