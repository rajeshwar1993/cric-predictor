# Phase 6 — Leaderboards & Profile

**Goal:** Users can view the match leaderboard for any resolved match, the prediction reveal table after lock, the season standings for their gang, and their own profile with aggregated stats.

**Exit criteria:**
- Match Leaderboard page shows ranked members for a specific match
- Prediction Reveal Table shows who picked what per scenario (post-lock only)
- Season Standings page shows cumulative rankings for the current season
- Profile page shows editable display name, read-only email/DOB, stats overview, and account deletion
- Member list on Gang Page shows real points (previously placeholder from Phase 2)

---

## LB-DAL-001: Leaderboard DAL functions

**Phase:** Phase 6 — Leaderboards & Profile
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As the developer,
> I want DAL functions for fetching match leaderboards, season standings, prediction reveal matrices, and user stats,
> So that UI components have a clean data source.

**Context / Why:**
All leaderboard/standings data already exists in materialized tables (`v2_gang_fixture_standings`, `v2_gang_season_standings`). This story just creates thin DAL wrappers for UI consumption.

**Acceptance criteria:**
- [ ] File: `src/lib/dal/leaderboards.ts`
- [ ] `getMatchLeaderboard(gangId: string, fixtureId: string)`:
  - Returns rows from `v2_gang_fixture_standings` ordered by `rank ASC`
  - Joined with `v2_profiles` and `v2_gang_members` to include `display_name` and `member_status`
  - Returns shape: `Array<{ userId, displayName, rank, predictedCount, resolvedCount, correctCount, pointsEarned, lastSubmittedAt, memberStatus }>`
- [ ] `getSeasonStandings(gangId: string, seasonId: string)`:
  - Returns rows from `v2_gang_season_standings` ordered by `rank ASC`
  - Joined with `v2_profiles` and `v2_gang_members`
  - Returns shape including `matchesPredicted, totalPoints, totalCorrect, totalResolved, accuracyPct, pointsPerMatch, rank, memberStatus`
- [ ] `getPredictionRevealMatrix(gangId: string, fixtureId: string)`:
  - Returns all predictions for all approved gang members for the fixture, plus the scenarios
  - Shape: `{ members: Array<{ userId, displayName, rank, memberStatus }>, scenarios: Array<{ id, slug, title, points, correctAnswer?, isResolved, isVoided }>, predictions: Map<userId, Map<scenarioId, { value, isCorrect, pointsEarned }>> }`
  - RLS handles visibility: returns empty if caller tries to read before predictions lock
- [ ] `getUserOverallStats(userId: string)`:
  - Aggregates across all of the user's `v2_gang_season_standings` rows:
    - `totalGangs` — count of gangs user has predictions in
    - `totalMatchesPredicted` — sum
    - `totalPoints` — sum
    - `overallAccuracyPct` — weighted average (sum total_correct / sum total_resolved * 100)
- [ ] `getMemberListWithPoints(gangId: string, seasonId: string)`:
  - Replaces the placeholder points in Phase 2's member list
  - Returns all gang members joined with their `v2_gang_season_standings` row
  - Includes left/removed members for grayed-out display
- [ ] All queries use server-side Supabase client (RLS-scoped)

**Out of scope:** UI components (separate stories)

**Dependencies:** FND-DB-001, FND-DB-002, FND-DB-004, LIVE-CRON-001 (data must exist)
**Blocks:** LB-UI-001, LB-UI-002, LB-UI-003, LB-UI-004

**PRD references:**
- [v2_gang_fixture_standings](../PRD.V2.md#v2_gang_fixture_standings--match-leaderboard-per-gang-materialized)
- [v2_gang_season_standings](../PRD.V2.md#v2_gang_season_standings--season-leaderboard-per-gang-materialized)
- [Match Leaderboard Page](../PRD.V2.md#match-leaderboard-page-groupgroupidmatchmatchid)
- [Season Standings Page](../PRD.V2.md#season-standings-page-groupgroupidstandings)
- [Profile Page § Stats Overview](../PRD.V2.md#profile-page-profile)

**Technical notes:**
- Prediction reveal query: `SELECT p.*, s.slug, s.title FROM v2_predictions p JOIN v2_fixture_scenarios s ON p.scenario_id = s.id WHERE p.gang_id = ? AND p.fixture_id = ?`
- RLS on `v2_predictions` will automatically filter based on deadline/match status — DAL doesn't need to double-check
- For the matrix, transform into nested map structure client-side for efficient rendering
- `getUserOverallStats`: use SQL aggregation, not loading all rows into JS

**Analytics events:** None (DAL)

**Unit tests:**
- [ ] Match leaderboard returns ranked list
- [ ] Season standings returns ranked list
- [ ] Prediction reveal returns full matrix
- [ ] User stats computed correctly (accuracy weighted, not simple average)
- [ ] Member list with points joins correctly, handles left/removed

**Test plan:**
- [ ] Seed test standings, run each function, verify shape
- [ ] Test RLS: caller outside gang gets empty results

**Open questions:** None

---

## LB-API-001: updateProfile server action

**Phase:** Phase 6 — Leaderboards & Profile
**Priority:** P0
**Estimated effort:** Small (2–3 hours)
**Status:** Not started

**User story:**
> As a user,
> I want to update my display name,
> So that it reflects my current identity.

**Context / Why:**
Profile page has an editable display name. Email and DOB are read-only.

**Acceptance criteria:**
- [ ] Server action `updateProfile(updates: { displayName?: string })` in `src/lib/actions/profile.ts`
- [ ] Requires authenticated user
- [ ] Validates:
  - `displayName` is 2–30 chars after trim
- [ ] **Display name collision check:** for each gang the user is an approved member of, query other approved members to check if the new name collides; if any collision, return error "Display name already taken in one of your gangs: {gangName}"
- [ ] Updates `v2_profiles.display_name` via RLS-scoped UPDATE
- [ ] Fires `PROFILE_UPDATED` PostHog event with changed fields
- [ ] `revalidatePath('/profile')` and `/dashboard` (avatar initials might change)
- [ ] Returns success / error

**Out of scope:**
- Editing email or DOB (not allowed)
- Delete account (AUTH-API-006 already built)

**Dependencies:** FND-004, FND-DB-001
**Blocks:** LB-UI-004

**PRD references:**
- [Profile Page § Profile Info](../PRD.V2.md#profile-page-profile)
- [Gangs § Display name uniqueness](../PRD.V2.md#gangs)

**Technical notes:**
- Collision check happens only within the user's active gangs (approved status); unrelated gangs don't matter
- RLS on `v2_profiles` UPDATE allows user to update own row

**Analytics events:**
- `PROFILE_UPDATED` — `{ fields_changed: string[] }`, distinct_id: user.id

**Unit tests:**
- [ ] Valid name → updates row
- [ ] Invalid length → error
- [ ] Collision with another gang member → error with gang name
- [ ] No change (same name) → success no-op

**Test plan:**
- [ ] Edit name from Profile page, verify updates everywhere (nav avatar, gang member lists)
- [ ] Try to pick a name that conflicts in a gang, verify error with helpful message

**Open questions:** None

---

## LB-UI-001: Match Leaderboard page

**Phase:** Phase 6 — Leaderboards & Profile
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As a gang member,
> I want to see the leaderboard and prediction reveal for a specific match,
> So that I can see how I did and what everyone else predicted.

**Context / Why:**
Per PRD, contains the match header, live scorecard, ranked leaderboard, and prediction reveal table. Leaderboard and reveal table are gated until predictions are locked.

**Acceptance criteria:**
- [ ] Page: `src/app/group/[groupId]/match/[matchId]/page.tsx` (server component)
- [ ] URL params: `groupId, matchId`
- [ ] Includes Global Nav Bar and Global Footer
- [ ] Auth + membership check (redirect to dashboard if not a member)
- [ ] Data fetching:
  - Gang details
  - Fixture details
  - Match leaderboard (LB-DAL-001)
  - Prediction reveal matrix (LB-DAL-001)
  - User's row highlighted
- [ ] Layout:
  - **Match header** — match number, teams, date, time, venue
  - **Live scorecard** — for `live` status only; reuses LIVE-UI-001
  - **Match Leaderboard** (LB-UI-002)
  - **Prediction Reveal Table** (LB-UI-003)
- [ ] Handle fixture statuses:
  - `upcoming` (window open, pre-deadline): show countdown placeholder instead of leaderboard + reveal table
  - `live`: show live scorecard + leaderboard (per PRD, locked state unlocks visibility)
  - `completed` / `resolved`: full leaderboard + reveal table
  - `abandoned` / `no_result`: show "Match voided" message and hide leaderboard
- [ ] Page metadata: `<title>{Home} vs {Away} — Leaderboard | Bragg</title>`

**Out of scope:**
- Leaderboard component (LB-UI-002)
- Reveal table (LB-UI-003)

**Dependencies:** LB-DAL-001, LB-UI-002, LB-UI-003, LIVE-UI-001, AUTH-UI-004, AUTH-UI-005
**Blocks:** None

**PRD references:**
- [Match Leaderboard Page](../PRD.V2.md#match-leaderboard-page-groupgroupidmatchmatchid)

**Technical notes:**
- Gate logic: compute `isLocked = (now() >= deadline) OR (fixture.status !== 'upcoming')`
- Pre-lock placeholder: show countdown timer to deadline
- Leaderboard visible during live match (per PRD — unlocked when match goes live)

**Analytics events:**
- Autocapture handles pageview

**Unit tests:**
- [ ] Pre-lock: shows countdown, no leaderboard
- [ ] Post-lock: shows leaderboard and reveal table
- [ ] Voided match: shows voided message
- [ ] Live match: shows scorecard + leaderboard

**Test plan:**
- [ ] Visit during each fixture state
- [ ] Verify gating is correct

**Open questions:** None

---

## LB-UI-002: Match Leaderboard component (table)

**Phase:** Phase 6 — Leaderboards & Profile
**Priority:** P0
**Estimated effort:** Medium (4–6 hours)
**Status:** Not started

**User story:**
> As a gang member viewing the match leaderboard page,
> I want to see a ranked table of all members for this specific match,
> So that I know how I stack up.

**Acceptance criteria:**
- [ ] Component: `src/components/leaderboards/match-leaderboard-table.tsx`
- [ ] Props: `entries: MatchLeaderboardEntry[], currentUserId: string`
- [ ] Columns:
  - Rank (gold/silver/bronze color for top 3)
  - Display name (with `(you)` label if current user)
  - Correct / Resolved count (e.g., `5/12`)
  - Predicted count
  - Points
- [ ] Current user row highlighted
- [ ] Left/removed members shown at bottom, grayed out
- [ ] Empty state: "Nobody's made a call yet — be the first one in!"
- [ ] Mobile-responsive: hide less-important columns on narrow screens (keep rank, name, points)
- [ ] Accessible table semantics

**Out of scope:** Data fetching (LB-DAL-001), page shell (LB-UI-001)

**Dependencies:** LB-DAL-001, FND-006
**Blocks:** LB-UI-001

**PRD references:**
- [Match Leaderboard Page § Match Leaderboard](../PRD.V2.md#match-leaderboard-page-groupgroupidmatchmatchid)

**Technical notes:**
- Use semantic `<table>` or CSS grid
- Color tokens from design system: gold/silver/bronze/muted
- Current user row: `bg-cyan-soft border-l-2 border-l-cyan`

**Analytics events:** None

**Unit tests:**
- [ ] Renders list of entries
- [ ] Current user highlighted
- [ ] Empty state when no entries
- [ ] Left/removed at bottom, grayed
- [ ] Mobile column hiding

**Test plan:**
- [ ] View after a match with varied results
- [ ] Test with 0, 1, 20 members

**Open questions:** None

---

## LB-UI-003: Prediction Reveal Table component

**Phase:** Phase 6 — Leaderboards & Profile
**Priority:** P0
**Estimated effort:** Large (1–2 days)
**Status:** Not started

**User story:**
> As a gang member,
> I want to see a matrix of all members' picks per scenario after predictions are locked,
> So that I can see what everyone picked and who got it right.

**Context / Why:**
One of the most satisfying views in the app — full transparency of picks for banter. Per PRD, hidden until lock, shows correct/incorrect status per cell.

**Acceptance criteria:**
- [ ] Component: `src/components/leaderboards/prediction-reveal-table.tsx`
- [ ] Props: `members, scenarios, predictions, currentUserId`
- [ ] Layout:
  - Rows = members (ordered by leaderboard rank)
  - Columns = scenarios (grouped by phase for readability)
  - Cells = user's pick for that scenario with visual indicator (✓ green for correct, ✗ red for incorrect, ─ gray for unresolved, empty/dash for not picked)
- [ ] Pick display:
  - Team pick → team code
  - Player pick → short name (first initial + last name)
  - Range → bracket label
  - Yes/no → "Yes" or "No"
- [ ] Sticky first column (member names) on horizontal scroll
- [ ] Sticky header row (scenario titles) on vertical scroll
- [ ] Correct answer row at the top (once resolved) showing the actual answer
- [ ] Current user row highlighted
- [ ] Left/removed members at bottom, grayed
- [ ] Empty states per PRD:
  - **Solo gang**: "Invite more members to see predictions" (nudge to invite)
  - **No predictions**: "Nobody predicted this match"
- [ ] Gated: hidden until lock (deadline passed or match live)
- [ ] Auto-polls during live matches for updates (via re-fetch of DAL)
- [ ] Mobile: table scrolls horizontally with sticky left column

**Out of scope:** Data fetching (LB-DAL-001), page shell (LB-UI-001)

**Dependencies:** LB-DAL-001, FND-006
**Blocks:** LB-UI-001

**PRD references:**
- [Match Leaderboard Page § Prediction Reveal Table](../PRD.V2.md#match-leaderboard-page-groupgroupidmatchmatchid)

**Technical notes:**
- CSS grid with sticky positioning (`position: sticky; left: 0; top: 0;`)
- Scenario grouping: show phase labels as column group headers
- Client component to support polling
- Poll interval: 15 seconds during live matches
- Short name for player pick: compute from `display_name` or `full_name` (first initial + last name) — might need a lookup since predictions store player UUID

**Analytics events:**
- None direct (autocapture)

**Unit tests:**
- [ ] Renders matrix with correct dimensions
- [ ] Cells show correct/incorrect status
- [ ] Empty state: solo gang
- [ ] Empty state: no predictions
- [ ] Current user row highlighted
- [ ] Correct answer row shown for resolved scenarios

**Test plan:**
- [ ] Test with a fully resolved match and varied picks
- [ ] Test during live match with progressive resolution
- [ ] Test on mobile with horizontal scroll

**Open questions:**
- Should unresolved cells show the user's pick (yes, so others know what they picked) but no correct/incorrect indicator? (Yes — per PRD, shows picks with status "per cell")

---

## LB-UI-004: Season Standings page

**Phase:** Phase 6 — Leaderboards & Profile
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As a gang member,
> I want to see the cumulative season leaderboard for my gang,
> So that I can see who's winning over the whole season.

**Acceptance criteria:**
- [ ] Page: `src/app/group/[groupId]/standings/page.tsx` (server component)
- [ ] Includes Global Nav Bar and Global Footer
- [ ] Auth + membership check
- [ ] Defaults to current active season (per PRD)
- [ ] Data fetching:
  - Gang details
  - Season standings via LB-DAL-001 `getSeasonStandings(gangId, seasonId)`
- [ ] Renders a ranked table:
  - Rank
  - Display name
  - Total points
  - Matches predicted
  - Points per match
  - Accuracy %
- [ ] Current user highlighted
- [ ] Left/removed members at bottom, grayed
- [ ] Empty state: "The leaderboard's empty — make your first pick to get on the board!"
- [ ] Mobile-responsive (hide some columns on narrow screens)
- [ ] Future-ready for season selector dropdown (placeholder or disabled in phase 6)
- [ ] Page metadata: `<title>Standings — {gangName} | Bragg</title>`
- [ ] **Update GANG-UI-005 (Gang Page shell):** replace the Phase 2 placeholder Standings link in the gang header with a real `<Link href="/group/{groupId}/standings">` pointing to this page

**Out of scope:**
- Multi-season support (UI has placeholder; multi-season is a pending item)

**Dependencies:** LB-DAL-001, AUTH-UI-004, AUTH-UI-005, FND-006
**Blocks:** None

**PRD references:**
- [Season Standings Page](../PRD.V2.md#season-standings-page-groupgroupidstandings)

**Technical notes:**
- Active season lookup: `v2_seasons WHERE is_active = true`
- Gang Page (GANG-UI-005) should link to this page (currently a placeholder in Phase 2)

**Analytics events:**
- Autocapture

**Unit tests:**
- [ ] Renders ranked list
- [ ] Empty state
- [ ] Current user highlighted
- [ ] Left/removed at bottom

**Test plan:**
- [ ] View after several matches have resolved
- [ ] Verify ranks and stats match expected values

**Open questions:** None

---

## LB-UI-005: Profile page

**Phase:** Phase 6 — Leaderboards & Profile
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As a user,
> I want a profile page where I can edit my display name, see my stats, and delete my account,
> So that I can manage my identity on the platform.

**Acceptance criteria:**
- [ ] Page: `src/app/profile/page.tsx` (server component with client sub-components)
- [ ] Includes Global Nav Bar and Global Footer
- [ ] Data fetching:
  - Current user profile
  - Overall stats via LB-DAL-001 `getUserOverallStats(userId)`
- [ ] Sections:
  1. **Profile Info:**
     - Display name (editable, with save button or inline edit)
     - Email (read-only)
     - Date of birth (read-only, formatted)
     - Edit → calls LB-API-001 `updateProfile`
  2. **Stats Overview:**
     - Total gangs joined
     - Total matches predicted
     - Overall accuracy percentage
     - Total points across all gangs
  3. **Account Actions:**
     - "Delete Account" button → opens Destructive Action Dialog (AUTH-UI-006)
     - Confirm value: user's email
     - Calls AUTH-API-006 `deleteAccount` on confirm
- [ ] Loading + error states for display name edit
- [ ] After successful deletion → user is signed out and redirected to `/` (handled by AUTH-API-006)
- [ ] Mobile-responsive
- [ ] Page metadata: `<title>Profile | Bragg</title>`

**Out of scope:**
- Deletion server action (AUTH-API-006)
- Update profile server action (LB-API-001)

**Dependencies:** LB-DAL-001, LB-API-001, AUTH-API-006, AUTH-UI-006, AUTH-UI-004, AUTH-UI-005, FND-006
**Blocks:** None

**PRD references:**
- [Profile Page](../PRD.V2.md#profile-page-profile)

**Technical notes:**
- Client component for the editable display name field
- Stats are read-only server-rendered
- Delete account uses the shared Destructive Action Dialog with email as confirm value

**Analytics events:**
- Autocapture for pageview
- `PROFILE_UPDATED` fires from server action
- `AUTH_ACCOUNT_DELETED` fires from server action

**Unit tests:**
- [ ] Page renders profile data
- [ ] Display name edit triggers updateProfile
- [ ] Delete button opens dialog
- [ ] Confirm dialog requires exact email match

**Test plan:**
- [ ] Edit display name, verify update + avatar initial updates in nav
- [ ] Verify stats match actual predictions + standings
- [ ] Delete account flow end-to-end

**Open questions:**
- Should we show a breakdown of stats per gang (not just overall)? (Out of scope for launch — overall only)

---

## LB-UI-006: Gang Page Member List points update

**Phase:** Phase 6 — Leaderboards & Profile
**Priority:** P0
**Estimated effort:** Small (2–3 hours)
**Status:** Not started

**User story:**
> As a gang member,
> I want the member list on the gang page to show real season points,
> So that I can see the season standings at a glance without leaving the page.

**Context / Why:**
Phase 2's GANG-UI-009 was a placeholder showing "0 pts". This story wires in real data from `v2_gang_season_standings`.

**Acceptance criteria:**
- [ ] Update `src/components/gangs/member-list.tsx` to accept and display points
- [ ] Update the Gang Page (GANG-UI-005) to fetch season standings via LB-DAL-001 and pass to the member list
- [ ] Sort by points DESC (active members first per PRD rank logic)
- [ ] Left/removed members at bottom, grayed
- [ ] Show points as "{total_points} pts" next to member name
- [ ] Link each member row to their own profile (optional — skip for launch if scope creep)

**Out of scope:** Profile link (not in PRD for launch)

**Dependencies:** LB-DAL-001, GANG-UI-005, GANG-UI-009
**Blocks:** None

**PRD references:**
- [Gang Page § Member List / Leaderboard](../PRD.V2.md#gang-page-groupgroupid)

**Technical notes:**
- Minor refactor of existing component + server component data fetching
- Uses `getMemberListWithPoints(gangId, seasonId)` from DAL

**Analytics events:** None

**Unit tests:**
- [ ] Member list shows real points after resolution
- [ ] Sort order: active members by points DESC, then left/removed at bottom

**Test plan:**
- [ ] After a match resolves, verify member list on gang page shows updated points

**Open questions:** None

---

## Summary

Phase 6 completes all leaderboards, standings, and the profile page. This is the "rewards" layer — users see their wins, compare against friends, and talk trash.

**Story count:** 7 stories (1 DAL, 1 API, 5 UI)
**Estimated total effort:** ~10–15 working days

**Ship readiness:**
- ✅ Match leaderboard page
- ✅ Prediction reveal table
- ✅ Season standings page
- ✅ Profile page with editable name, stats, delete account
- ✅ Member list on gang page shows real points
- ⏳ Notifications UI comes in Phase 7
- ⏳ Final polish in Phase 8
