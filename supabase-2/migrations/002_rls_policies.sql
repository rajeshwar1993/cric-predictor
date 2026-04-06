-- =============================================================================
-- 002_rls_policies.sql
-- Bragg v2 — Row-Level Security policies and helper functions
-- Enables RLS on all 19 v2 tables, creates SECURITY DEFINER helper functions,
-- and defines per-table policies per PRD.V2.md RLS section.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enable RLS on ALL v2 tables
-- ---------------------------------------------------------------------------

ALTER TABLE v2_sports                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_leagues                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_seasons                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_league_teams              ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_players                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_league_season_fixtures    ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_scenario_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_fixture_results           ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_fixture_live_scores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_league_season_team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_gangs                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_gang_members              ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_gang_league_seasons       ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_fixture_scenarios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_predictions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_gang_fixture_standings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_gang_season_standings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_notifications             ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- Helper Functions (SECURITY DEFINER — bypass RLS for internal checks)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- is_gang_member(gang_id, user_id) → BOOLEAN
-- Returns true if the user is an approved member AND their profile is not
-- soft-deleted.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_gang_member(p_gang_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM v2_gang_members gm
    JOIN v2_profiles p ON p.id = gm.user_id
    WHERE gm.gang_id = p_gang_id
      AND gm.user_id = p_user_id
      AND gm.status  = 'approved'
      AND p.is_deleted = false
  );
$$;

-- ---------------------------------------------------------------------------
-- is_gang_admin(gang_id, user_id) → BOOLEAN
-- Returns true if the user has role='admin' and status='approved' in
-- v2_gang_members, AND their profile is not soft-deleted.
-- Uses v2_gang_members.role, NOT v2_gangs.created_by.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_gang_admin(p_gang_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM v2_gang_members gm
    JOIN v2_profiles p ON p.id = gm.user_id
    WHERE gm.gang_id = p_gang_id
      AND gm.user_id = p_user_id
      AND gm.role    = 'admin'
      AND gm.status  = 'approved'
      AND p.is_deleted = false
  );
$$;

-- ---------------------------------------------------------------------------
-- get_gang_by_invite_code(code) → v2_gangs
-- Bypasses RLS to look up a gang by invite code (needed before membership
-- exists, e.g., the Join Page).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_gang_by_invite_code(p_code TEXT)
RETURNS v2_gangs
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

-- ---------------------------------------------------------------------------
-- get_members_who_predicted(gang_id, fixture_id) → SETOF UUID
-- Returns user_ids of members who have at least one prediction for the given
-- fixture in the given gang. Internally validates that the caller
-- (auth.uid()) is an approved gang member; returns empty set otherwise.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_members_who_predicted(p_gang_id UUID, p_fixture_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is an approved member of this gang
  IF NOT is_gang_member(p_gang_id, auth.uid()) THEN
    RETURN;  -- empty set
  END IF;

  RETURN QUERY
    SELECT DISTINCT pred.user_id
    FROM v2_predictions pred
    WHERE pred.gang_id    = p_gang_id
      AND pred.fixture_id = p_fixture_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- prediction_deadline(fixture_id, gang_id) → TIMESTAMPTZ
-- Computes the prediction cutoff: fixture start_datetime minus the gang's
-- prediction_deadline_mins setting.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prediction_deadline(p_fixture_id UUID, p_gang_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.start_datetime - (gls.prediction_deadline_mins * INTERVAL '1 minute')
  FROM v2_league_season_fixtures f
  JOIN v2_gang_league_seasons gls
    ON gls.gang_id   = p_gang_id
   AND gls.league_id = f.league_id
   AND gls.season_id = f.season_id
  WHERE f.id = p_fixture_id
  LIMIT 1;
$$;


-- =============================================================================
-- RLS Policies
-- =============================================================================

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Reference Tables — SELECT for all authenticated, no user writes
-- v2_sports, v2_leagues, v2_seasons, v2_league_teams, v2_players,
-- v2_league_season_fixtures, v2_scenario_templates
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- ----- v2_sports -----
DROP POLICY IF EXISTS "v2_sports: select for authenticated" ON v2_sports;
CREATE POLICY "v2_sports: select for authenticated"
  ON v2_sports FOR SELECT
  TO authenticated
  USING (true);

-- ----- v2_leagues -----
DROP POLICY IF EXISTS "v2_leagues: select for authenticated" ON v2_leagues;
CREATE POLICY "v2_leagues: select for authenticated"
  ON v2_leagues FOR SELECT
  TO authenticated
  USING (true);

-- ----- v2_seasons -----
DROP POLICY IF EXISTS "v2_seasons: select for authenticated" ON v2_seasons;
CREATE POLICY "v2_seasons: select for authenticated"
  ON v2_seasons FOR SELECT
  TO authenticated
  USING (true);

-- ----- v2_league_teams -----
DROP POLICY IF EXISTS "v2_league_teams: select for authenticated" ON v2_league_teams;
CREATE POLICY "v2_league_teams: select for authenticated"
  ON v2_league_teams FOR SELECT
  TO authenticated
  USING (true);

-- ----- v2_players -----
DROP POLICY IF EXISTS "v2_players: select for authenticated" ON v2_players;
CREATE POLICY "v2_players: select for authenticated"
  ON v2_players FOR SELECT
  TO authenticated
  USING (true);

-- ----- v2_league_season_fixtures -----
DROP POLICY IF EXISTS "v2_league_season_fixtures: select for authenticated" ON v2_league_season_fixtures;
CREATE POLICY "v2_league_season_fixtures: select for authenticated"
  ON v2_league_season_fixtures FOR SELECT
  TO authenticated
  USING (true);

-- ----- v2_scenario_templates -----
DROP POLICY IF EXISTS "v2_scenario_templates: select for authenticated" ON v2_scenario_templates;
CREATE POLICY "v2_scenario_templates: select for authenticated"
  ON v2_scenario_templates FOR SELECT
  TO authenticated
  USING (true);


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- System-managed Tables — SELECT for all authenticated, no user writes
-- v2_fixture_results, v2_fixture_live_scores, v2_league_season_team_players
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- ----- v2_fixture_results -----
DROP POLICY IF EXISTS "v2_fixture_results: select for authenticated" ON v2_fixture_results;
CREATE POLICY "v2_fixture_results: select for authenticated"
  ON v2_fixture_results FOR SELECT
  TO authenticated
  USING (true);

-- ----- v2_fixture_live_scores -----
DROP POLICY IF EXISTS "v2_fixture_live_scores: select for authenticated" ON v2_fixture_live_scores;
CREATE POLICY "v2_fixture_live_scores: select for authenticated"
  ON v2_fixture_live_scores FOR SELECT
  TO authenticated
  USING (true);

-- ----- v2_league_season_team_players -----
DROP POLICY IF EXISTS "v2_league_season_team_players: select for authenticated" ON v2_league_season_team_players;
CREATE POLICY "v2_league_season_team_players: select for authenticated"
  ON v2_league_season_team_players FOR SELECT
  TO authenticated
  USING (true);


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- v2_profiles
--   SELECT: own profile always; others if in same gang (any member status)
--   INSERT: none (created by trigger on auth.users)
--   UPDATE: own profile only
--   DELETE: none (soft-delete via update)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

DROP POLICY IF EXISTS "v2_profiles: select own or same gang" ON v2_profiles;
CREATE POLICY "v2_profiles: select own or same gang"
  ON v2_profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM v2_gang_members gm1
      JOIN v2_gang_members gm2 ON gm2.gang_id = gm1.gang_id
      WHERE gm1.user_id = auth.uid()
        AND gm2.user_id = v2_profiles.id
    )
  );

DROP POLICY IF EXISTS "v2_profiles: update own" ON v2_profiles;
CREATE POLICY "v2_profiles: update own"
  ON v2_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- v2_gangs
--   SELECT: approved members only; filter out is_deleted = true
--   INSERT: any authenticated user
--   UPDATE: admin only (name, auto_accept, soft-delete)
--   DELETE: none (soft-delete via update)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

DROP POLICY IF EXISTS "v2_gangs: select for approved members" ON v2_gangs;
CREATE POLICY "v2_gangs: select for approved members"
  ON v2_gangs FOR SELECT
  TO authenticated
  USING (
    is_deleted = false
    AND is_gang_member(id, auth.uid())
  );

DROP POLICY IF EXISTS "v2_gangs: insert for authenticated" ON v2_gangs;
CREATE POLICY "v2_gangs: insert for authenticated"
  ON v2_gangs FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "v2_gangs: update for admin" ON v2_gangs;
CREATE POLICY "v2_gangs: update for admin"
  ON v2_gangs FOR UPDATE
  TO authenticated
  USING (is_gang_admin(id, auth.uid()))
  WITH CHECK (is_gang_admin(id, auth.uid()));


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- v2_gang_members
--   SELECT: approved sees approved; admin sees all statuses; own row always
--   INSERT: any authenticated user (own row only, as pending)
--   UPDATE: admin can update others (approve/reject/remove/block);
--           user can update own (leave)
--   DELETE: none
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

DROP POLICY IF EXISTS "v2_gang_members: select for members" ON v2_gang_members;
CREATE POLICY "v2_gang_members: select for members"
  ON v2_gang_members FOR SELECT
  TO authenticated
  USING (
    -- Own row: always visible
    user_id = auth.uid()
    -- Admin: sees all statuses in the gang
    OR is_gang_admin(gang_id, auth.uid())
    -- Approved member: sees other approved members
    OR (
      status = 'approved'
      AND is_gang_member(gang_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "v2_gang_members: insert own as pending" ON v2_gang_members;
CREATE POLICY "v2_gang_members: insert own as pending"
  ON v2_gang_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "v2_gang_members: update by admin or self" ON v2_gang_members;
CREATE POLICY "v2_gang_members: update by admin or self"
  ON v2_gang_members FOR UPDATE
  TO authenticated
  USING (
    -- Admin can update any member in the gang
    is_gang_admin(gang_id, auth.uid())
    -- User can update own row (for leaving)
    OR user_id = auth.uid()
  )
  WITH CHECK (
    is_gang_admin(gang_id, auth.uid())
    OR user_id = auth.uid()
  );


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- v2_gang_league_seasons
--   SELECT: approved gang members
--   INSERT: none for users (service role via server action)
--   UPDATE: admin only (prediction_deadline_mins)
--   DELETE: none
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

DROP POLICY IF EXISTS "v2_gang_league_seasons: select for approved members" ON v2_gang_league_seasons;
CREATE POLICY "v2_gang_league_seasons: select for approved members"
  ON v2_gang_league_seasons FOR SELECT
  TO authenticated
  USING (
    is_gang_member(gang_id, auth.uid())
  );

DROP POLICY IF EXISTS "v2_gang_league_seasons: update for admin" ON v2_gang_league_seasons;
CREATE POLICY "v2_gang_league_seasons: update for admin"
  ON v2_gang_league_seasons FOR UPDATE
  TO authenticated
  USING (is_gang_admin(gang_id, auth.uid()))
  WITH CHECK (is_gang_admin(gang_id, auth.uid()));


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- v2_fixture_scenarios
--   SELECT: approved gang members
--   INSERT/UPDATE/DELETE: none (system only via service role)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

DROP POLICY IF EXISTS "v2_fixture_scenarios: select for approved members" ON v2_fixture_scenarios;
CREATE POLICY "v2_fixture_scenarios: select for approved members"
  ON v2_fixture_scenarios FOR SELECT
  TO authenticated
  USING (
    is_gang_member(gang_id, auth.uid())
  );


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- v2_predictions
--   SELECT: before deadline AND fixture status='upcoming' → own only;
--           after deadline OR fixture status NOT 'upcoming' → all approved
--           gang members' rows
--   INSERT: approved gang member, own user_id, before deadline,
--           fixture status='upcoming'
--   UPDATE: same as INSERT (own predictions before deadline)
--   DELETE: none
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

DROP POLICY IF EXISTS "v2_predictions: select with deadline visibility" ON v2_predictions;
CREATE POLICY "v2_predictions: select with deadline visibility"
  ON v2_predictions FOR SELECT
  TO authenticated
  USING (
    -- Must be an approved gang member to see any predictions
    is_gang_member(gang_id, auth.uid())
    AND (
      -- Own predictions: always visible to the owner
      user_id = auth.uid()
      -- Others' predictions: visible after deadline or when fixture is no longer upcoming
      OR now() >= prediction_deadline(fixture_id, gang_id)
      OR EXISTS (
        SELECT 1
        FROM v2_league_season_fixtures f
        WHERE f.id = v2_predictions.fixture_id
          AND f.status IN ('live', 'completed', 'resolved', 'abandoned', 'no_result')
      )
    )
  );

DROP POLICY IF EXISTS "v2_predictions: insert before deadline" ON v2_predictions;
CREATE POLICY "v2_predictions: insert before deadline"
  ON v2_predictions FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be own prediction
    user_id = auth.uid()
    -- Must be approved gang member
    AND is_gang_member(gang_id, auth.uid())
    -- Must be before deadline
    AND now() < prediction_deadline(fixture_id, gang_id)
    -- Fixture must still be upcoming
    AND EXISTS (
      SELECT 1
      FROM v2_league_season_fixtures f
      WHERE f.id = fixture_id
        AND f.status = 'upcoming'
    )
  );

DROP POLICY IF EXISTS "v2_predictions: update own before deadline" ON v2_predictions;
CREATE POLICY "v2_predictions: update own before deadline"
  ON v2_predictions FOR UPDATE
  TO authenticated
  USING (
    -- Must be own prediction
    user_id = auth.uid()
    -- Must be approved gang member
    AND is_gang_member(gang_id, auth.uid())
    -- Must be before deadline
    AND now() < prediction_deadline(fixture_id, gang_id)
    -- Fixture must still be upcoming
    AND EXISTS (
      SELECT 1
      FROM v2_league_season_fixtures f
      WHERE f.id = v2_predictions.fixture_id
        AND f.status = 'upcoming'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND is_gang_member(gang_id, auth.uid())
    AND now() < prediction_deadline(fixture_id, gang_id)
    AND EXISTS (
      SELECT 1
      FROM v2_league_season_fixtures f
      WHERE f.id = fixture_id
        AND f.status = 'upcoming'
    )
  );


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- v2_gang_fixture_standings
--   SELECT: approved gang members
--   INSERT/UPDATE/DELETE: none (system-managed via triggers)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

DROP POLICY IF EXISTS "v2_gang_fixture_standings: select for approved members" ON v2_gang_fixture_standings;
CREATE POLICY "v2_gang_fixture_standings: select for approved members"
  ON v2_gang_fixture_standings FOR SELECT
  TO authenticated
  USING (
    is_gang_member(gang_id, auth.uid())
  );


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- v2_gang_season_standings
--   SELECT: approved gang members
--   INSERT/UPDATE/DELETE: none (system-managed via triggers)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

DROP POLICY IF EXISTS "v2_gang_season_standings: select for approved members" ON v2_gang_season_standings;
CREATE POLICY "v2_gang_season_standings: select for approved members"
  ON v2_gang_season_standings FOR SELECT
  TO authenticated
  USING (
    is_gang_member(gang_id, auth.uid())
  );


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- v2_notifications
--   SELECT: own only
--   UPDATE: own only (mark as read)
--   INSERT/DELETE: none for users (service role only)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

DROP POLICY IF EXISTS "v2_notifications: select own" ON v2_notifications;
CREATE POLICY "v2_notifications: select own"
  ON v2_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "v2_notifications: update own" ON v2_notifications;
CREATE POLICY "v2_notifications: update own"
  ON v2_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- =============================================================================
-- Supabase Realtime — enabled on v2_notifications only
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE v2_notifications;
