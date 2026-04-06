# Phase 4 — Predictions

**Goal:** Users can view the predict page for any upcoming match in their gang, see all 19 active scenarios, make their picks, and submit. Deadline enforcement works. Gang page shows who has predicted for the next match.

**Exit criteria:**
- User can navigate from Gang Page to Predict Page for an upcoming match
- Predict Page shows all 19 active scenarios grouped by resolution phase
- Each input type (team pick, player pick, range, yes/no) works correctly
- User can submit predictions, return, and update them before the deadline
- After deadline OR match live, predict page is locked
- Before prediction window opens (more than 12 hours before match), user sees a "come back later" message
- Gang Page shows "who has predicted" status for the next upcoming match

---

## PRED-DAL-001: Prediction and scenario DAL functions

**Phase:** Phase 4 — Predictions
**Priority:** P0
**Estimated effort:** Medium (4–6 hours)
**Status:** Not started

**User story:**
> As the developer,
> I want DAL functions for fetching scenarios, existing predictions, players, and "who has predicted" status,
> So that the UI and server actions have a consistent data access layer.

**Context / Why:**
Centralizes DB queries for the prediction flow. Keeps UI and server action code clean and testable.

**Acceptance criteria:**
- [ ] File: `src/lib/dal/predictions.ts` and `src/lib/dal/scenarios.ts`
- [ ] `getScenariosForFixture(gangId: string, fixtureId: string)`:
  - Returns all `v2_fixture_scenarios` for (gang, fixture) where `is_voided = false`
  - Ordered by `resolution_phase` enum order (toss, first_wicket, team_powerplay_end, mid_match, team_innings_end, end, post_match)
  - Then within phase, by `points DESC`
- [ ] `getUserPredictions(userId: string, scenarioIds: string[])`:
  - Returns `v2_predictions` rows for the user and scenario list
  - Used to pre-fill the form with the user's existing picks
- [ ] `getPlayersForFixture(fixtureId: string)`:
  - Fetches both teams' rosters via `v2_league_season_team_players` joined with `v2_players` and `v2_league_teams`
  - Returns `Player[]` with `{ id, name, teamId, teamCode, role }`
  - Includes both home and away teams
- [ ] `getMembersWhoPredictedForFixture(gangId: string, fixtureId: string)`:
  - Wraps the `get_members_who_predicted(gang_id, fixture_id)` SECURITY DEFINER RPC
  - Returns array of user IDs (only IDs, no prediction values — per PRD RLS)
- [ ] `getFixtureWithDeadline(gangId: string, fixtureId: string)`:
  - Returns fixture row joined with gang's `prediction_deadline_mins` from `v2_gang_league_seasons`
  - Computes and returns `deadline: Date` and `windowOpensAt: Date` (12 hours before start)
- [ ] All functions use server-side Supabase client (RLS-scoped)
- [ ] Each function has typed return values based on `src/types/database.ts`

**Out of scope:** UI components and server actions (separate stories)

**Dependencies:** FND-DB-001, FND-DB-002, FND-004
**Blocks:** PRED-API-001, all PRED-UI stories

**PRD references:**
- [v2_fixture_scenarios](../PRD.V2.md#v2_fixture_scenarios--prediction-questions-for-a-fixture-seeded-from-templates)
- [v2_predictions](../PRD.V2.md#v2_predictions--user-predictions-for-scenarios)
- [v2_players](../PRD.V2.md#v2_players--player-database)
- [Helper functions § get_members_who_predicted](../PRD.V2.md#row-level-security-rls-policies)

**Technical notes:**
- Resolution phase ordering: use a CASE expression in ORDER BY to map enum values to sort positions
- `getPlayersForFixture` — join `v2_league_season_team_players` on season_id and team_id for both home and away
- `getFixtureWithDeadline` returns `{ fixture, deadline, windowOpensAt, isOpen: boolean, isLocked: boolean }`

**Analytics events:** None (DAL layer)

**Unit tests:**
- [ ] `getScenariosForFixture` returns correct ordering
- [ ] `getUserPredictions` returns only the specified user's rows
- [ ] `getPlayersForFixture` returns players from both teams
- [ ] `getMembersWhoPredictedForFixture` returns only user IDs
- [ ] `getFixtureWithDeadline` computes deadline correctly

**Test plan:**
- [ ] Seed test data, call each function, verify output shape
- [ ] Verify RLS is enforced (caller without gang membership gets empty)

**Open questions:** None

---

## PRED-API-001: submitPredictions server action

**Phase:** Phase 4 — Predictions
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As a gang member,
> I want to submit my predictions for a match in one batch,
> So that I can save all my picks at once.

**Context / Why:**
The primary write operation for the predict page. Must enforce the prediction window, match status, and gang membership.

**Acceptance criteria:**
- [ ] Server action `submitPredictions(gangId: string, fixtureId: string, picks: Array<{ scenarioId: string, value: string }>)` in `src/lib/actions/predictions.ts`
- [ ] Requires authenticated user
- [ ] Validates:
  - User is an approved member of the gang
  - Fixture status is `upcoming`
  - Current time is within the prediction window:
    - `now() >= fixture.start_datetime - INTERVAL '12 hours'` (window opens 12h before)
    - `now() < fixture.start_datetime - INTERVAL '{prediction_deadline_mins} minutes'` (deadline not passed)
  - Gang is enrolled in the fixture's season via `v2_gang_league_seasons`
  - Each `scenarioId` belongs to the (gang, fixture) in `v2_fixture_scenarios`
  - Each `value` is non-empty and reasonable (no server-side bracket validation yet — trust the client)
  - At least one valid pick in the batch
- [ ] Upserts each pick into `v2_predictions`:
  - `user_id, scenario_id` as the unique key
  - Denormalized `gang_id, league_id, season_id, fixture_id` filled in
  - Updates `submitted_at = now()` on each row (even on update — overwrites previous submission timestamp)
  - On first insert per (user, scenario), `created_at` defaults to now
- [ ] Returns success / error with user-friendly messages
- [ ] Fires PostHog event `PREDICTION_SUBMITTED` with `{ gang_id, fixture_id, prediction_count }`
- [ ] `revalidatePath('/group/{gangId}/predict/{fixtureId}')` and `/group/{gangId}` on success
- [ ] Error mapping:
  - Prediction window closed → "Predictions are locked for this match"
  - Window not yet open → "Predictions open X minutes from now" (compute exact time)
  - Not a gang member → "You're not in this gang"
  - Fixture not upcoming → "Match has already started"
  - Empty pick set → "Pick at least one scenario"

**Out of scope:**
- UI form (PRED-UI-002)
- Scenario seeding (Phase 3)

**Dependencies:** PRED-DAL-001, FND-DB-001 through FND-DB-004, FND-004, FND-005
**Blocks:** PRED-UI-002

**PRD references:**
- [Predictions § Submission](../PRD.V2.md#predictions)
- [Predictions § Validation](../PRD.V2.md#predictions)
- [Matches § Prediction window](../PRD.V2.md#matches)
- [v2_predictions RLS](../PRD.V2.md#v2_predictions)

**Technical notes:**
- Window open check is at server action level only (per PRD I6 — RLS doesn't enforce the open side)
- Deadline check IS in RLS via `prediction_deadline(fixture_id, gang_id)`
- Use a single upsert with `ON CONFLICT (user_id, scenario_id) DO UPDATE SET value = EXCLUDED.value, submitted_at = now()` for bulk efficiency
- The `v2_predictions` denormalized fields (`league_id`, `season_id`, etc.) must be populated — query them from the scenario + fixture once

**Analytics events:**
- `PREDICTION_SUBMITTED` — `{ gang_id, fixture_id, prediction_count, is_update: boolean }`

**Unit tests:**
- [ ] Happy path: valid picks, within window → success
- [ ] Window not yet open → error
- [ ] Deadline passed → error (RLS blocks INSERT/UPDATE)
- [ ] Non-member → error
- [ ] Empty pick list → error
- [ ] Scenario belongs to a different gang → skipped or error
- [ ] Duplicate submission (upsert) → updates existing rows, submitted_at refreshed
- [ ] Denormalized fields populated correctly

**Test plan:**
- [ ] Submit predictions via test harness, verify DB rows
- [ ] Try to submit outside window, verify error
- [ ] Update predictions, verify `submitted_at` changed

**Open questions:** None

---

## PRED-UI-001: Predict Page shell

**Phase:** Phase 4 — Predictions
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As a gang member,
> I want a dedicated page for predicting a specific match,
> So that I can see the match details, scenarios, and submit my picks.

**Context / Why:**
The predict page is the primary content creation flow for users. Server component does auth and data fetching; client component handles form state.

**Acceptance criteria:**
- [ ] Page: `src/app/group/[groupId]/predict/[matchId]/page.tsx` (server component)
- [ ] URL params: `groupId`, `matchId`
- [ ] Includes Global Nav Bar and Global Footer
- [ ] Auth check via middleware (covered by AUTH-MW-001)
- [ ] Membership check: user must be approved member of the gang
- [ ] Data fetching via DAL:
  - Gang details
  - Fixture + deadline
  - Scenarios for (gang, fixture), grouped by `resolution_phase`
  - User's existing predictions (if any)
  - Players for fixture (for player_pick scenarios)
- [ ] Renders sections:
  - **Match header** — match number, teams (with colored badges), date/time in user's timezone, venue, deadline or locked status indicator
  - **Before window opens state** — if `now() < windowOpensAt`, shows message "Predictions open at {formatted time}" + link back to gang page; does NOT show scenarios
  - **Open window state** — renders the Prediction Form (PRED-UI-002)
  - **Locked state** — if `now() >= deadline` OR match status != `upcoming`, shows "Predictions Locked" banner and disables the form (form still visible for read-only viewing of the user's picks)
- [ ] Last updated timestamp: if user has existing predictions, shows "Last updated: {submitted_at}"
- [ ] Page metadata: `<title>Predict — {Team A} vs {Team B} | Bragg</title>`

**Out of scope:**
- Form component (PRED-UI-002)
- Scenario card (PRED-UI-003)
- Input components (PRED-UI-004 through PRED-UI-007)

**Dependencies:** PRED-DAL-001, AUTH-MW-001, AUTH-UI-004, AUTH-UI-005, GANG-UI-005
**Blocks:** None (entry point for the predict flow)

**PRD references:**
- [Predict Page](../PRD.V2.md#predict-page-groupgroupidpredictmatchid)

**Technical notes:**
- Use React Server Component
- Three distinct render branches: pre-window, open, locked
- Date formatting in user's local timezone with TZ label
- Fires `PREDICT_PAGE_VIEWED` on server render (or client-side on mount for accuracy)

**Analytics events:**
- `PREDICT_PAGE_VIEWED` — `{ gang_id, fixture_id, is_first_visit: boolean, has_existing_predictions: boolean }`
- `PREDICT_PAGE_REVISITED` — fired if user has existing predictions (distinct event)

**Unit tests:**
- [ ] Page renders with match header
- [ ] Pre-window state shown when now < windowOpensAt
- [ ] Locked state shown when now > deadline
- [ ] Open state renders PredictionForm with scenarios
- [ ] Non-member redirected

**Test plan:**
- [ ] Visit predict page during each state (pre-window, open, locked)
- [ ] Verify date/time formatting matches user timezone
- [ ] Verify scenarios grouped by phase

**Open questions:** None

---

## PRED-UI-002: Prediction form component

**Phase:** Phase 4 — Predictions
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As a gang member on the predict page,
> I want a form where I can select answers for all scenarios and submit them all at once,
> So that making predictions is fast and organized.

**Context / Why:**
The client-side form manages all the scenario picks, submits the batch, and handles state.

**Acceptance criteria:**
- [ ] Component: `src/components/predictions/prediction-form.tsx` (client component)
- [ ] Props: `gangId, fixtureId, scenarios, existingPredictions, players, isLocked, homeTeam, awayTeam`
- [ ] State: `picks: Record<scenarioId, value>` initialized from existing predictions
- [ ] Renders scenarios grouped by `resolution_phase`:
  - Section headings: "Toss", "First Strike", "Powerplay", "Mid-Match", "Innings Break", "Final Ball", "After Stumps"
  - Custom scenarios (none for launch) would be last
- [ ] Each scenario rendered via Scenario Card (PRED-UI-003)
- [ ] Sticky submit bar at bottom of screen:
  - Progress counter: "{pickedCount}/{totalCount} picked"
  - Submit button: "Save Predictions" (disabled if pickedCount = 0 OR isLocked)
  - Error/success feedback inline
- [ ] Submit flow:
  - Calls `submitPredictions(gangId, fixtureId, picksArray)` server action
  - `useTransition` for loading state
  - Success → show "Saved!" feedback, keep form state (user can keep editing)
  - Error → show error message, keep picks intact
- [ ] If `isLocked = true`:
  - All inputs disabled
  - Submit bar hidden
  - Shows "Predictions Locked" banner at top
- [ ] Keyboard-accessible, mobile-first layout
- [ ] Fires `PREDICTION_PICK_CHANGED` event on each pick change

**Out of scope:** Individual input types (PRED-UI-004 through PRED-UI-007)

**Dependencies:** PRED-UI-003, PRED-API-001
**Blocks:** PRED-UI-001

**PRD references:**
- [Predict Page](../PRD.V2.md#predict-page-groupgroupidpredictmatchid)
- [Predictions § Submission](../PRD.V2.md#predictions)

**Technical notes:**
- Group by `resolution_phase` using a `Map<Phase, Scenario[]>`
- Section labels from PRD description
- Scroll to submit bar on first pick (optional UX enhancement)
- Sticky bar: `fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur`

**Analytics events:**
- `PREDICTION_PICK_CHANGED` — `{ gang_id, fixture_id, scenario_slug }` (per change)
- `PREDICTION_SUBMITTED` fires from server action

**Unit tests:**
- [ ] Renders scenarios grouped by phase
- [ ] Pick state updates on input change
- [ ] Submit disabled when no picks
- [ ] Submit disabled when locked
- [ ] Loading state during submit
- [ ] Shows success feedback on save

**Test plan:**
- [ ] Pick scenarios from each phase, submit, verify DB rows
- [ ] Revisit page, verify picks pre-filled
- [ ] Update a pick, submit, verify row updated
- [ ] Visit after deadline, verify locked state

**Open questions:**
- Should we auto-save on each pick change? (For launch: no — explicit save via button. Could add later.)

---

## PRED-UI-003: Scenario Card component (generic wrapper)

**Phase:** Phase 4 — Predictions
**Priority:** P0
**Estimated effort:** Small (3–5 hours)
**Status:** Not started

**User story:**
> As a gang member,
> I want each scenario displayed as a card with the question, point value, and appropriate input type,
> So that I can easily understand and answer each one.

**Context / Why:**
Generic wrapper that routes to the correct input type based on `scenario.input_type`.

**Acceptance criteria:**
- [ ] Component: `src/components/predictions/scenario-card.tsx`
- [ ] Props: `scenario, teamA, teamB, players, value, onChange, disabled`
- [ ] Layout:
  - Title (scenario question)
  - Point value on the right ("10 pts")
  - Input component selected based on `scenario.input_type`:
    - `team_pick` → TeamPick (PRED-UI-004)
    - `player_pick` → PlayerPick (PRED-UI-005)
    - `range` → RangePick (PRED-UI-006)
    - `yes_no` → YesNoPick (PRED-UI-007)
  - "Picked" indicator when `value != null`
- [ ] Card styling: dark card bg, border, rounded corners
- [ ] Passes `disabled` prop through to input components

**Out of scope:** Individual input components

**Dependencies:** PRED-UI-004, PRED-UI-005, PRED-UI-006, PRED-UI-007, FND-006
**Blocks:** PRED-UI-002

**PRD references:**
- [Predict Page](../PRD.V2.md#predict-page-groupgroupidpredictmatchid)
- [Scenarios § Structure](../PRD.V2.md#scenarios)

**Technical notes:**
- Switch statement on `input_type` to render the correct input
- "Picked" indicator: small cyan dot + text

**Analytics events:** None directly (form tracks picks)

**Unit tests:**
- [ ] Renders with title and points
- [ ] Routes to correct input component based on input_type
- [ ] Shows picked indicator when value set
- [ ] Disabled state propagates

**Test plan:**
- [ ] Render each input type in isolation
- [ ] Verify "picked" indicator appears after selection

**Open questions:** None

---

## PRED-UI-004: Team Pick input

**Phase:** Phase 4 — Predictions
**Priority:** P0
**Estimated effort:** Small (2–3 hours)
**Status:** Not started

**User story:**
> As a gang member,
> I want to pick one of the two teams playing as my answer,
> So that I can answer scenarios like "Who wins the match?" and "Who wins the toss?"

**Acceptance criteria:**
- [ ] Component: `src/components/predictions/team-pick.tsx`
- [ ] Props: `teamA, teamB, value, onChange, disabled`
- [ ] Two buttons side by side: one per team (home and away)
- [ ] Each button shows team short code + team color accent
- [ ] Selected button is visually highlighted (ring, bg fill)
- [ ] `value` stored as team UUID (from `v2_league_teams.id`)
- [ ] On click → calls `onChange(teamId)`
- [ ] Disabled state: buttons grayed out, not clickable
- [ ] Keyboard-accessible

**Out of scope:** None

**Dependencies:** FND-006
**Blocks:** PRED-UI-003

**PRD references:**
- [Scenario Resolution Mapping § team_pick scenarios](../PRD.V2.md#scenario-resolution-mapping-sportmonks-api)

**Technical notes:**
- Use shadcn `Button` with custom variant
- Team color from `v2_league_teams.color`

**Analytics events:** None (form tracks)

**Unit tests:**
- [ ] Renders with two team buttons
- [ ] Clicking a button calls onChange
- [ ] Selected button visually distinct
- [ ] Disabled state prevents clicks

**Test plan:**
- [ ] Pick home team, verify state, switch to away
- [ ] Disabled state rendering

**Open questions:** None

---

## PRED-UI-005: Player Pick input

**Phase:** Phase 4 — Predictions
**Priority:** P0
**Estimated effort:** Medium (4–6 hours)
**Status:** Not started

**User story:**
> As a gang member,
> I want to search and pick any player from the two playing teams,
> So that I can answer scenarios like "Top scorer?" and "Player of the Match?"

**Context / Why:**
With 50 players (25 per team × 2 teams), a searchable dropdown is necessary.

**Acceptance criteria:**
- [ ] Component: `src/components/predictions/player-pick.tsx`
- [ ] Props: `players, value, onChange, disabled, title` (title used for placeholder)
- [ ] Searchable combobox:
  - Shows selected player by name
  - Click opens a dropdown with all players
  - Search input filters players by name (case-insensitive contains)
  - Players grouped by team (optional — or flat list)
  - Click on player → closes dropdown, sets value
- [ ] `value` stored as player UUID (from `v2_players.id`)
- [ ] Empty state when no players match search
- [ ] Disabled state
- [ ] Keyboard navigation (arrow keys, enter, escape)

**Out of scope:** None

**Dependencies:** FND-006
**Blocks:** PRED-UI-003

**PRD references:**
- [Scenario Resolution Mapping § player_pick scenarios](../PRD.V2.md#scenario-resolution-mapping-sportmonks-api)

**Technical notes:**
- Use shadcn `Command` + `Popover` or `Combobox` primitives
- Fetch players from parent (passed as prop from DAL query)
- Player display: `{name} ({teamCode})`
- Max height with scroll for long lists

**Analytics events:** None (form tracks)

**Unit tests:**
- [ ] Renders with placeholder when no value
- [ ] Search filters list
- [ ] Selecting a player sets value
- [ ] Disabled state prevents interaction

**Test plan:**
- [ ] Search for a player, select them, verify state
- [ ] Test on mobile (touch interactions)

**Open questions:**
- Should we show team indicator icon next to player name? (Recommend yes for clarity — team code in parens)

---

## PRED-UI-006: Range (bracket) input

**Phase:** Phase 4 — Predictions
**Priority:** P0
**Estimated effort:** Small (3–5 hours)
**Status:** Not started

**User story:**
> As a gang member,
> I want to pick one of the predefined brackets for range scenarios,
> So that I can answer questions like "Home team innings score?" with the expected option.

**Context / Why:**
Range scenarios have 5 pre-defined bracket options (e.g., `["<140", "140-159", "160-179", "180-199", "200+"]`).

**Acceptance criteria:**
- [ ] Component: `src/components/predictions/range-pick.tsx`
- [ ] Props: `options: string[], value, onChange, disabled`
- [ ] Renders as a horizontal row (or grid on mobile) of pill-style buttons
- [ ] Each button shows the bracket label
- [ ] Selected button highlighted
- [ ] `value` stored as the bracket string (e.g., `"140-159"`)
- [ ] Responsive: 5 across on desktop, wraps to 2 rows on mobile if needed
- [ ] Disabled state

**Out of scope:** None

**Dependencies:** FND-006
**Blocks:** PRED-UI-003

**PRD references:**
- [System Scenario Definitions](../PRD.V2.md#system-scenario-definitions-20-scenarios-total-19-active--1-inactive-max-210-active-points-220-including-inactive) — all range scenarios and their options
- [Scenario Resolution Mapping § Range scenario resolution note](../PRD.V2.md#scenario-resolution-mapping-sportmonks-api)

**Technical notes:**
- Use shadcn `Button` with small variant
- Grid layout: `grid grid-cols-5 gap-2 sm:gap-3` (or flex-wrap on very small screens)

**Analytics events:** None (form tracks)

**Unit tests:**
- [ ] Renders all options
- [ ] Clicking one sets value
- [ ] Selected option visually distinct

**Test plan:**
- [ ] Pick each option on a range scenario, verify state
- [ ] Test mobile layout (small screen)

**Open questions:** None

---

## PRED-UI-007: Yes/No input

**Phase:** Phase 4 — Predictions
**Priority:** P0
**Estimated effort:** Small (1–2 hours)
**Status:** Not started

**User story:**
> As a gang member,
> I want to pick yes or no for boolean scenarios,
> So that I can answer questions like "Will anyone score 50+?"

**Acceptance criteria:**
- [ ] Component: `src/components/predictions/yes-no-pick.tsx`
- [ ] Props: `value, onChange, disabled`
- [ ] Two buttons: "Yes" / "No"
- [ ] `value` stored as `"yes"` or `"no"` string
- [ ] Selected button highlighted
- [ ] Disabled state

**Out of scope:** None

**Dependencies:** FND-006
**Blocks:** PRED-UI-003

**PRD references:**
- [Scenario Resolution Mapping § yes_no scenarios](../PRD.V2.md#scenario-resolution-mapping-sportmonks-api)

**Technical notes:**
- Two buttons side by side, equal width
- Green accent for "Yes", red/muted for "No" (or neutral)

**Analytics events:** None

**Unit tests:**
- [ ] Renders two buttons
- [ ] Clicking Yes sets value to "yes"
- [ ] Clicking No sets value to "no"
- [ ] Disabled state

**Test plan:**
- [ ] Pick yes, switch to no, verify state

**Open questions:** None

---

## PRED-UI-008: Prediction status indicator (Gang Page)

**Phase:** Phase 4 — Predictions
**Priority:** P0
**Estimated effort:** Small (3–5 hours)
**Status:** Not started

**User story:**
> As a gang member,
> I want to see which of my gang members have predicted for the next upcoming match,
> So that I can nudge friends who haven't yet and feel competitive.

**Context / Why:**
Per PRD, the Gang Page shows "which members have predicted" for the next upcoming match (only). Only shows user IDs — not prediction values.

**Acceptance criteria:**
- [ ] Component: `src/components/matches/prediction-status-indicator.tsx`
- [ ] Server component — fetches via `getMembersWhoPredictedForFixture(gangId, fixtureId)` DAL (which wraps `get_members_who_predicted` RPC)
- [ ] Only shown on the Gang Page's next upcoming match (first card in Upcoming Matches section)
- [ ] Displays small avatar chips for each approved gang member:
  - Green check + name if they've predicted
  - Gray dot + name if they haven't
- [ ] Sorted: predicted first, then non-predicted (or alphabetical — per PRD not specified, choose alphabetical)
- [ ] Only displays if window is open AND pre-deadline (per PRD — visible before lock)
- [ ] Hidden after deadline (Match Leaderboard page takes over from there)
- [ ] Responsive: wraps on mobile
- [ ] Works across gang member sizes (max 20)

**Out of scope:**
- Showing WHAT members predicted (that's the Prediction Reveal Table in Phase 6)

**Dependencies:** PRED-DAL-001, FND-006, SYNC-UI-001
**Blocks:** None (Upcoming Matches section updates to include it)

**PRD references:**
- [Gang Page § Upcoming Matches](../PRD.V2.md#gang-page-groupgroupid)
- [Predictions § Visibility](../PRD.V2.md#predictions)
- [Helper functions § get_members_who_predicted](../PRD.V2.md#row-level-security-rls-policies)

**Technical notes:**
- `get_members_who_predicted` is SECURITY DEFINER and validates the caller is a gang member
- Use lucide `Check` icon for predicted, `Circle` for not predicted
- This component is added to the Upcoming Matches section built in SYNC-UI-001 — only for the first match card

**Analytics events:** None

**Unit tests:**
- [ ] Fetches and renders list of members with predicted status
- [ ] Only renders for the first upcoming match
- [ ] Hidden after deadline

**Test plan:**
- [ ] Have 3 members, 1 predicts, verify indicator shows correctly
- [ ] Wait until deadline passes, verify indicator hidden

**Open questions:** None

---

## Summary

Phase 4 delivers the full prediction flow. After this phase, users can make predictions for upcoming matches across all 19 active scenario types.

**Story count:** 10 stories (1 DAL, 1 API, 8 UI)
**Estimated total effort:** ~10–15 working days

**Ship readiness:**
- ✅ Predict page with scenario grouping
- ✅ All 4 input types work (team pick, player pick, range, yes/no)
- ✅ Window open/close enforcement
- ✅ Submit & update predictions
- ✅ Prediction status on gang page
- ⏳ Live scoring and resolution in Phase 5
- ⏳ Leaderboards in Phase 6
