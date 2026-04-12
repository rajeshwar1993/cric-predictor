# Bragg — End-to-End (E2E) Test Plan

## Overview

A comprehensive, multi-user E2E test suite that runs against the **staging environment** (`https://bragg-staging.vercel.app/`). Tests simulate 6–8 concurrent users exercising every feature of the app as real users would — creating gangs, joining via invite codes, making predictions, checking leaderboards, managing members, and more.

The suite is designed as a **multi-act play**: users are created once at the start, and subsequent test suites build on the state left by previous ones (gang memberships, predictions, standings). This mirrors real usage patterns and catches state-dependent bugs that isolated tests miss.

## Environment & Configuration

**Target:** Staging only — never runs against production.

| Variable | Purpose |
|---|---|
| `E2E_BASE_URL` | `https://bragg-staging.vercel.app/` |
| `E2E_SUPABASE_URL` | Supabase STG project URL (`bragg-staging`) |
| `E2E_SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin operations (user creation, cleanup, data seeding) |

**Playwright config changes:**
- Remove the `webServer` block (no local dev server — tests hit staging directly)
- Set `baseURL` from `E2E_BASE_URL` env var
- Add `mobile` project (iPhone 14 viewport) alongside `chromium` desktop
- Set `timeout: 60_000` per test (staging can be slow)
- Set `expect.timeout: 15_000` for assertions
- Enable `trace: 'retain-on-failure'` and `screenshot: 'only-on-failure'`
- Output: `./e2e/test-results/`

## Authentication Strategy

Magic link login cannot be automated in E2E (requires email inbox access). Instead:

1. **Before the test suite runs**, a global setup script uses the Supabase Admin API (`supabase.auth.admin.createUser()`) to create 8 test users with known email/password pairs. The `email_confirm` flag is set to `true` to skip email verification.
2. Each test authenticates by calling `supabase.auth.signInWithPassword()` to obtain a valid session (access token + refresh token).
3. The session is injected into the browser context via `page.context().addCookies()`, setting the Supabase auth cookies (`sb-<ref>-auth-token`, `sb-<ref>-auth-token-code-verifier`) so the app recognizes the user as logged in.
4. A shared `authenticate(page, userIndex)` helper handles this for every test.
5. **After the entire suite completes**, a global teardown script deletes all test users and their associated data via the Admin API.

**Test user naming convention:**
```
e2e-user-0@bragg-test.local  →  display_name: "TestUser Alpha"
e2e-user-1@bragg-test.local  →  display_name: "TestUser Bravo"
e2e-user-2@bragg-test.local  →  display_name: "TestUser Charlie"
e2e-user-3@bragg-test.local  →  display_name: "TestUser Delta"
e2e-user-4@bragg-test.local  →  display_name: "TestUser Echo"
e2e-user-5@bragg-test.local  →  display_name: "TestUser Foxtrot"
e2e-user-6@bragg-test.local  →  display_name: "TestUser Golf"
e2e-user-7@bragg-test.local  →  display_name: "TestUser Hotel"
```

## Global Setup & Teardown

**`e2e/global-setup.ts`** (runs once before all tests):
1. Connect to Supabase STG with service role key.
2. Clean up any leftover test data from previous failed runs (delete users matching `e2e-user-*@bragg-test.local`, cascade-delete their profiles/gangs/predictions).
3. Create 8 test users via `supabase.auth.admin.createUser({ email, password, email_confirm: true })`.
4. Store user IDs and credentials in a shared state file (`e2e/.auth-state.json`) for tests to read.

**`e2e/global-teardown.ts`** (runs once after all tests):
1. Delete all test users via `supabase.auth.admin.deleteUser(userId)` (cascades to `v2_profiles` via FK).
2. Clean up any gangs created by test users (soft-deleted or not) via service role queries.
3. Remove the auth state file.

## Shared Utilities (`e2e/helpers/`)

**`e2e/helpers/auth.ts`** — Authentication helper:
- `authenticate(page: Page, userIndex: number)`: Reads credentials from auth state, signs in via Supabase JS client, injects session cookies into the browser context, navigates to dashboard.
- `getSupabaseAdmin()`: Returns a Supabase client with service role key for admin operations within tests.

**`e2e/helpers/fixtures.ts`** — Test data helpers:
- `seedTestFixture(opts)`: Creates/ensures a fixture exists in STG with a known `start_datetime` and `status` (upcoming, live, completed) for prediction testing. Uses service role to insert into `v2_league_season_fixtures`.
- `seedFixtureScenarios(gangId, fixtureId)`: Calls `seed_fixture_scenarios_for_gang` RPC to populate scenarios for a gang+fixture pair.
- `setFixtureStatus(fixtureId, status)`: Updates fixture status (e.g., move from `upcoming` → `live` → `completed`) for testing deadline/visibility behavior.
- `resolveScenario(scenarioId, correctAnswer)`: Calls `resolve_scenario` RPC to simulate match resolution.
- `getFixtureScenarios(gangId, fixtureId)`: Fetches scenarios for assertions.

**`e2e/helpers/gangs.ts`** — Gang data helpers:
- `getGangInviteCode(gangId)`: Fetches invite code via service role.
- `getGangMembers(gangId)`: Fetches all members with status/role.
- `cleanupTestGangs()`: Deletes gangs created by test users.

**`e2e/helpers/assertions.ts`** — Common assertion patterns:
- `expectToastMessage(page, message)`: Waits for a Sonner toast with the expected text.
- `expectRedirectTo(page, path)`: Asserts navigation to a specific path.
- `expectMemberCount(page, count)`: Asserts visible member count in gang UI.

## Test Suite Structure

Tests are organized into numbered suites that run **sequentially** (each suite depends on state from previous suites). Within each suite, individual tests may run in parallel where safe.

```
e2e/
├── global-setup.ts
├── global-teardown.ts
├── helpers/
│   ├── auth.ts
│   ├── fixtures.ts
│   ├── gangs.ts
│   └── assertions.ts
├── 01-onboarding.spec.ts
├── 02-gang-creation.spec.ts
├── 03-gang-join-invite.spec.ts
├── 04-gang-management.spec.ts
├── 05-predictions.spec.ts
├── 06-leaderboards.spec.ts
├── 07-notifications.spec.ts
├── 08-profile.spec.ts
├── 09-edge-cases.spec.ts
└── 10-cleanup-and-deletion.spec.ts
```

## Suite 01: Onboarding (`01-onboarding.spec.ts`)

Tests the first-time user experience after authentication.

| # | Test | Steps | Expected |
|---|---|---|---|
| 1.1 | **First login redirects to onboarding** | Authenticate User 0, navigate to `/dashboard` | Redirected to `/onboarding` |
| 1.2 | **Onboarding form validation — empty fields** | Submit onboarding form with no input | Validation errors shown for display name, DOB, terms checkbox |
| 1.3 | **Onboarding form validation — underage** | Enter DOB making user < 18 years old | Error: must be 18+ |
| 1.4 | **Onboarding form validation — display name too short** | Enter 1-char display name | Validation error on name length |
| 1.5 | **Successful onboarding** | Enter valid display name ("TestUser Alpha"), valid DOB (18+), accept terms, submit | Redirected to `/dashboard`, onboarding cookie set |
| 1.6 | **Complete onboarding for all 8 users** | Repeat onboarding for Users 1–7 with their respective display names | All users land on `/dashboard` |
| 1.7 | **Onboarding is not shown again** | User 0 navigates to `/onboarding` directly | Redirected to `/dashboard` (already onboarded) |
| 1.8 | **Dashboard shows empty state** | User 0 on dashboard with no gangs | Empty state message shown (e.g., "Create or join a gang") |

## Suite 02: Gang Creation (`02-gang-creation.spec.ts`)

| # | Test | Steps | Expected |
|---|---|---|---|
| 2.1 | **Create gang — form validation** | User 0 opens create gang dialog, submits empty name | Validation error: name required (3–50 chars) |
| 2.2 | **Create gang — name too short** | Submit gang name "AB" (2 chars) | Validation error |
| 2.3 | **Create Gang A** | User 0 creates gang "E2E Alpha Squad" | Gang created, redirected to gang page, invite code visible, User 0 is admin |
| 2.4 | **Create Gang B** | User 1 creates gang "E2E Bravo Bunch" | Gang created, User 1 is admin |
| 2.5 | **Create Gang C** | User 2 creates gang "E2E Charlie Crew" | Gang created, User 2 is admin |
| 2.6 | **Gang page shows correct initial state** | User 0 views Gang A page | Shows: gang name, 1 member (self), invite code/share button, no upcoming matches (unless fixtures seeded) |
| 2.7 | **Dashboard shows created gang** | User 0 returns to dashboard | Gang A card visible with member count = 1 |
| 2.8 | **Invite code is 6 characters alphanumeric** | Read invite code from Gang A UI | Matches `/^[A-Z0-9]{6}$/` |

## Suite 03: Gang Join & Invite Codes (`03-gang-join-invite.spec.ts`)

Tests the full invite → join → approval flow across multiple users and gangs.

| # | Test | Steps | Expected |
|---|---|---|---|
| 3.1 | **Join via invite code — Gang A** | User 1 navigates to `/join/<Gang-A-invite-code>` | Join page shows gang name "E2E Alpha Squad", join button visible |
| 3.2 | **Submit join request (manual approval)** | User 1 clicks join on Gang A (auto_accept=false by default) | Toast: request sent. User 1 sees "pending" state |
| 3.3 | **Admin sees pending request** | User 0 views Gang A page | Pending requests section shows User 1's request |
| 3.4 | **Admin approves join request** | User 0 approves User 1's request | User 1 now approved, member count = 2 |
| 3.5 | **Approved member sees gang** | User 1 refreshes dashboard | Gang A card visible on dashboard |
| 3.6 | **Join Gang A — Users 2, 3, 4, 5** | Users 2–5 join Gang A via invite code, User 0 approves each | Gang A has 6 members |
| 3.7 | **Join via direct URL** | User 3 navigates to `/join/<Gang-B-invite-code>` | Join page for Gang B loads correctly |
| 3.8 | **Join Gang B — Users 0, 3, 4** | Users 0, 3, 4 join Gang B, User 1 approves | Gang B has 4 members |
| 3.9 | **Join Gang C — Users 0, 1** | Users 0, 1 join Gang C, User 2 approves | Gang C has 3 members |
| 3.10 | **Invalid invite code** | User 6 navigates to `/join/ZZZZZZ` (non-existent code) | Error state: "Gang not found" or similar |
| 3.11 | **Already a member** | User 1 navigates to `/join/<Gang-A-invite-code>` again | Shown that they're already a member, or redirected to gang page |
| 3.12 | **Auto-accept mode** | User 0 enables auto_accept on Gang A via settings. User 6 joins via invite code | User 6 is immediately approved (no pending state), member count increases |
| 3.13 | **Share invite — copy to clipboard** | User 0 clicks share/copy invite button on Gang A | Clipboard contains the invite URL |

## Suite 04: Gang Management (`04-gang-management.spec.ts`)

Tests admin actions: settings, member management, blocking, and gang deletion.

| # | Test | Steps | Expected |
|---|---|---|---|
| 4.1 | **Non-admin cannot access settings** | User 1 (member of Gang A) navigates to `/group/<gang-a-id>/settings` | Access denied or redirected (not admin) |
| 4.2 | **Admin updates gang name** | User 0 changes Gang A name to "E2E Alpha Squad Updated" | Name updates, visible on gang page and dashboard |
| 4.3 | **Admin updates prediction deadline** | User 0 changes prediction deadline from 45 to 30 minutes on Gang A | Setting saved, reflected in settings page |
| 4.4 | **Admin toggles auto-accept** | User 0 toggles auto_accept off on Gang A | Setting saved, subsequent joins require approval |
| 4.5 | **Admin removes a member** | User 0 removes User 5 from Gang A | User 5 no longer in member list, member count decreases |
| 4.6 | **Removed member cannot see gang** | User 5 navigates to dashboard | Gang A no longer visible |
| 4.7 | **Admin blocks a member** | User 0 blocks User 4 from Gang A | User 4 shown as blocked, cannot access gang |
| 4.8 | **Blocked user cannot rejoin** | User 4 navigates to `/join/<Gang-A-invite-code>` | Blocked message shown, cannot rejoin |
| 4.9 | **Admin unblocks a member** | User 0 unblocks User 4 | User 4's blocked status removed |
| 4.10 | **Member leaves gang voluntarily** | User 3 leaves Gang A | Member count decreases, User 3 no longer sees Gang A on dashboard |
| 4.11 | **Admin rejects a join request** | User 7 requests to join Gang A (auto_accept off). User 0 rejects the request | User 7 sees rejection, not added to gang |
| 4.12 | **Restore gang name** | User 0 renames Gang A back to "E2E Alpha Squad" | Name restored |

## Suite 05: Predictions (`05-predictions.spec.ts`)

Tests the prediction workflow. Requires seeded test fixtures with known start times and scenarios.

**Pre-suite setup (via service role):**
- Seed 2 test fixtures (Fixture X: upcoming in 2 hours, Fixture Y: upcoming in 24 hours) with known home/away teams.
- Seed scenarios for Gang A + Gang B for both fixtures via `seed_fixture_scenarios_for_gang` RPC.

| # | Test | Steps | Expected |
|---|---|---|---|
| 5.1 | **Upcoming match visible on gang page** | User 0 views Gang A page | Fixture X visible in upcoming matches section with team logos, time, prediction status |
| 5.2 | **Navigate to prediction page** | User 0 clicks "Predict" on Fixture X from Gang A | `/group/<gang-a>/predict/<fixture-x>` loads with scenario cards |
| 5.3 | **All active scenario types rendered** | Count scenario cards on prediction page | 19 active scenarios shown (team_pick, player_pick, yes_no, range types) |
| 5.4 | **Team pick scenario** | User 0 selects a team for "Toss Winner" scenario | Team card selected, highlighted |
| 5.5 | **Player pick scenario** | User 0 selects a player for "Top Scorer" | Player card selected from player list |
| 5.6 | **Yes/No scenario** | User 0 selects "Yes" for "Fifty Scored?" | Toggle/button selected |
| 5.7 | **Range scenario** | User 0 selects a range bracket for "Total Match Runs" | Range bracket selected |
| 5.8 | **Submit predictions — partial** | User 0 fills 10 of 19 scenarios, submits | Predictions saved, toast confirmation, "last submitted" timestamp shown |
| 5.9 | **Re-submit predictions — update answers** | User 0 changes 3 answers, submits again | Updated predictions saved, new timestamp shown |
| 5.10 | **Submit predictions — all scenarios** | User 0 completes all 19 scenarios, submits | All predictions saved |
| 5.11 | **Multiple users predict on same fixture** | Users 1, 2 submit predictions for Fixture X in Gang A | Each user's predictions saved independently |
| 5.12 | **Cross-gang predictions** | User 0 submits predictions for Fixture X in Gang B (different gang, same fixture) | Predictions saved separately per gang |
| 5.13 | **Prediction status badge on match card** | User 0 views Gang A page | Fixture X match card shows "Predicted" badge |
| 5.14 | **Pre-deadline: own predictions only visible** | User 1 checks match leaderboard for Fixture X (before deadline) | Can see own predictions, cannot see User 0's or User 2's |
| 5.15 | **Post-deadline: all predictions revealed** | Move Fixture X past deadline (via service role: set `start_datetime` to past). Users view match page | All gang members' predictions visible in the prediction matrix |
| 5.16 | **Prediction window closed** | Move Fixture X to `live` status. User tries to predict | "Prediction window closed" message, submit button disabled |

## Suite 06: Leaderboards & Standings (`06-leaderboards.spec.ts`)

Tests scoring, match leaderboards, and season standings after scenario resolution.

**Pre-suite setup (via service role):**
- Move Fixture X to `completed` status.
- Resolve all scenarios for Fixture X with known correct answers via `resolve_scenario` RPC.
- This triggers the standings recalculation triggers automatically.

| # | Test | Steps | Expected |
|---|---|---|---|
| 6.1 | **Match leaderboard loads** | User 0 navigates to `/group/<gang-a>/match/<fixture-x>` | Match leaderboard page loads with rankings |
| 6.2 | **Scores calculated correctly** | Check leaderboard rows | Points match expected values based on correct answers vs submitted predictions |
| 6.3 | **Rank ordering** | Check rank column | Users ordered by points DESC; ties broken by earliest submission |
| 6.4 | **Prediction reveal matrix** | View prediction details on match page | Each scenario shows each user's pick + whether it was correct (green/red) |
| 6.5 | **Correct/incorrect indicators** | Check individual prediction cells | Correct picks marked green, incorrect marked red, unsubmitted shown as dash |
| 6.6 | **Season standings** | User 0 navigates to `/group/<gang-a>/standings` | Season standings table shows cumulative points, matches predicted, accuracy % |
| 6.7 | **Season standings rank** | Check rank column in season standings | Users ranked by total points across all resolved matches |
| 6.8 | **Points per match stat** | Check season standings detail | Points per match = total_points / matches_predicted |
| 6.9 | **Departed member ranking** | User 3 left Gang A earlier. Check season standings | User 3 (if they had predictions) shown at bottom with departed indicator |
| 6.10 | **Cross-gang standings isolation** | User 0 checks Gang B standings | Standings only reflect predictions made in Gang B, not Gang A |
| 6.11 | **Recent results section** | User 0 views Gang A page | Fixture X appears in "Recent Results" section with final score |

## Suite 07: Notifications (`07-notifications.spec.ts`)

Tests the notification system across all notification types.

| # | Test | Steps | Expected |
|---|---|---|---|
| 7.1 | **Notification bell visible** | User 0 views any authenticated page | Notification bell icon in navbar |
| 7.2 | **Unread badge count** | User 0 has unread notifications (from join approvals, etc.) | Badge shows unread count > 0 |
| 7.3 | **Notification panel opens** | User 0 clicks notification bell | Panel/sheet opens showing notification list |
| 7.4 | **Join request notification** | Check User 0's notifications | Contains "join request" notification from when users requested to join Gang A |
| 7.5 | **Join approved notification** | Check User 1's notifications | Contains "approved" notification for Gang A membership |
| 7.6 | **Results available notification** | Check User 0's notifications | Contains "results available" notification for Fixture X (triggered after all scenarios resolved) |
| 7.7 | **Mark single notification as read** | User 0 marks one notification as read | Notification visual state changes, unread count decreases by 1 |
| 7.8 | **Mark all as read** | User 0 clicks "Mark all as read" | All notifications marked read, badge disappears or shows 0 |
| 7.9 | **Notification links to relevant page** | User 0 clicks a "results available" notification | Navigates to the match leaderboard page |

## Suite 08: Profile (`08-profile.spec.ts`)

| # | Test | Steps | Expected |
|---|---|---|---|
| 8.1 | **Profile page loads** | User 0 navigates to `/profile` | Profile page shows display name, stats |
| 8.2 | **Profile stats shown** | Check stats section | Shows total gangs, total predictions, accuracy, total points (aggregated across gangs) |
| 8.3 | **Edit display name — validation** | User 0 tries to set empty display name | Validation error |
| 8.4 | **Edit display name — success** | User 0 changes display name to "TestUser Alpha V2" | Name updated, reflected on profile page |
| 8.5 | **Display name uniqueness within gang** | User 1 tries to change name to "TestUser Alpha V2" (same as User 0, both in Gang A) | Error: display name already taken in gang |
| 8.6 | **Revert display name** | User 0 changes name back to "TestUser Alpha" | Name reverted |
| 8.7 | **Sign out** | User 0 clicks sign out from user menu | Redirected to `/login`, session cleared |
| 8.8 | **Re-authenticate after sign out** | Authenticate User 0 again | Lands on dashboard, all gangs still visible |

## Suite 09: Edge Cases & Error States (`09-edge-cases.spec.ts`)

| # | Test | Steps | Expected |
|---|---|---|---|
| 9.1 | **Unauthenticated access to protected route** | Clear cookies, navigate to `/dashboard` | Redirected to `/login` |
| 9.2 | **Non-member accesses gang page** | User 7 (not in Gang A) navigates to `/group/<gang-a-id>` | Access denied or error page |
| 9.3 | **Non-existent gang page** | Navigate to `/group/00000000-0000-0000-0000-000000000000` | 404 or error state |
| 9.4 | **Non-existent prediction page** | Navigate to `/group/<gang-a>/predict/00000000-0000-0000-0000-000000000000` | Error state |
| 9.5 | **Mobile viewport — dashboard** | Load dashboard at 375px width | Layout is usable, no horizontal overflow, gang cards stack vertically |
| 9.6 | **Mobile viewport — prediction page** | Load prediction page at 375px width | Scenario cards stack, submit bar visible, all inputs tappable |
| 9.7 | **Mobile viewport — leaderboard** | Load match leaderboard at 375px width | Table scrollable or stacked, readable at small size |
| 9.8 | **Rate limiting on predictions** | Submit predictions rapidly (>60 times in a minute) via automation | Rate limit error returned after threshold |
| 9.9 | **Terms acceptance flow** | Via service role, set User 7's `terms_version` to an outdated major version. User 7 navigates to dashboard | Redirected to `/accept-terms`. After accepting, redirected to dashboard |
| 9.10 | **Privacy & Terms pages load** | Navigate to `/privacy` and `/terms` | Both pages load with content, no errors |
| 9.11 | **Landing page loads** | Navigate to `/` (unauthenticated) | Hero section, how-it-works, prediction preview, CTA all visible |

## Suite 10: Cleanup & Deletion (`10-cleanup-and-deletion.spec.ts`)

Tests destructive actions — run last since they alter state irreversibly.

| # | Test | Steps | Expected |
|---|---|---|---|
| 10.1 | **Delete gang — confirmation required** | User 2 (admin of Gang C) opens delete gang dialog | Confirmation dialog shown with warning |
| 10.2 | **Delete gang — confirmed** | User 2 confirms deletion of Gang C | Gang soft-deleted, User 2 redirected to dashboard, Gang C no longer visible |
| 10.3 | **Deleted gang not visible to members** | User 0 (member of Gang C) checks dashboard | Gang C no longer listed |
| 10.4 | **Gang deleted notification** | Check User 0's and User 1's notifications | Contains "gang deleted" notification for Gang C |
| 10.5 | **Delete account — confirmation flow** | User 7 navigates to `/profile/delete` | Delete account page with warning and confirmation step |
| 10.6 | **Delete account — confirmed** | User 7 confirms account deletion | Account soft-deleted, redirected to login, cannot re-authenticate with same credentials |
| 10.7 | **Deleted user's gang admin transfer** | If User 7 was admin of any gang, check that admin role transferred to next eligible member | Admin promoted, notification sent |

## Data Seeding Requirements

The E2E suite requires specific test data in the staging environment:

1. **Reference data must exist** — Sports (Cricket), Leagues (IPL), Seasons (IPL 2026), Teams (10 IPL teams), Players (at least a subset), Scenario Templates (19 active). These should already be present from migrations.

2. **Test fixtures** — At least 2 fixtures must be seeded (or already exist) with:
   - Known `home_team_id` / `away_team_id` from the 10 IPL teams
   - Controllable `start_datetime` (set to future for prediction window tests, then adjusted for deadline/live tests)
   - Controllable `status` (upcoming → live → completed → resolved)
   - The suite's global setup should seed these fixtures via service role if they don't exist, using unique `api_id` values prefixed with `e2e-` to avoid collisions with real Sportmonks data.

3. **Scenario resolution data** — For leaderboard tests, the suite resolves scenarios via RPC with predetermined correct answers to verify scoring.

## Running the Suite

```bash
# From web-app/ directory
# Run full suite against staging
npx playwright test --config=playwright.config.ts

# Run a specific suite
npx playwright test e2e/01-onboarding.spec.ts

# Run with UI mode for debugging
npx playwright test --ui

# Run only mobile viewport tests
npx playwright test --project=mobile
```

**CI integration:**
- Triggered manually or on-demand (not on every PR — staging dependency makes it slow)
- Requires `E2E_SUPABASE_URL` and `E2E_SUPABASE_SERVICE_ROLE_KEY` as CI secrets
- Recommended: run after a staging deployment completes
- Artifacts: Playwright HTML report + traces uploaded on failure

## Test Isolation & Idempotency

- **Global setup cleans before creating** — removes any leftover `e2e-user-*` accounts from prior runs, ensuring a clean slate even after a mid-run crash.
- **Test fixtures use unique `api_id` prefixes** (`e2e-fixture-001`, `e2e-fixture-002`) so they don't collide with real data.
- **Gangs created during tests** are tracked and cleaned up in global teardown.
- **Suite ordering is enforced** via numeric filename prefixes and Playwright's `fullyParallel: false` at the project level (individual tests within a suite may run in parallel where annotated).

## Coverage Matrix

| Feature Area | Create | Read | Update | Delete | Error States | Mobile |
|---|---|---|---|---|---|---|
| Auth / Onboarding | 01 | 01 | — | 10 | 01, 09 | — |
| Gangs | 02 | 02 | 04 | 10 | 02, 09 | 09 |
| Invite / Join | 03 | 03 | 03 | — | 03, 09 | — |
| Member Management | 03 | 04 | 04 | 04 | 04 | — |
| Predictions | 05 | 05 | 05 | — | 05, 09 | 09 |
| Leaderboards | — | 06 | — | — | 06 | 09 |
| Standings | — | 06 | — | — | — | — |
| Notifications | — | 07 | 07 | — | — | — |
| Profile | — | 08 | 08 | 10 | 08 | — |
| Landing / Public | — | 09 | — | — | 09 | — |

---

# Implementation Plan

This section provides a step-by-step implementation guide for the E2E test suite described above. It is organized into **phases** that should be completed sequentially, with specific file-level implementation details, code patterns, and acceptance criteria for each step.

## Phase 0: Prerequisites & Environment Setup

Before writing any test code, ensure the staging environment is ready.

### 0.1 — Verify Staging Reference Data

The E2E suite depends on reference data already being present in the staging Supabase database (seeded via migrations):

| Table | Required Data |
|---|---|
| `v2_sports` | Cricket (1 row) |
| `v2_leagues` | IPL (1 row, linked to Cricket sport) |
| `v2_seasons` | IPL 2026 (1 row, linked to IPL league) |
| `v2_league_teams` | 10 IPL teams with `code` values (e.g., CSK, MI, RCB, etc.) |
| `v2_players` | At least 22 players (11 per team for 2 test fixture teams) linked via `v2_league_season_team_players` |
| `v2_scenario_templates` | 19 active templates with `is_active=true`, linked to Cricket sport |

**Verification query** (run via Supabase SQL editor or service role client):

```sql
SELECT 'sports' AS tbl, COUNT(*) FROM v2_sports
UNION ALL SELECT 'leagues', COUNT(*) FROM v2_leagues
UNION ALL SELECT 'seasons', COUNT(*) FROM v2_seasons
UNION ALL SELECT 'teams', COUNT(*) FROM v2_league_teams
UNION ALL SELECT 'players', COUNT(*) FROM v2_players
UNION ALL SELECT 'templates', COUNT(*) FROM v2_scenario_templates WHERE is_active = true;
```

If any counts are zero, seed data from migrations must be applied first.

### 0.2 — E2E Environment Variables

Create a dedicated env file at `web-app/.env.e2e` (gitignored):

```env
# E2E test environment — staging only
E2E_BASE_URL=https://bragg-staging.vercel.app
E2E_SUPABASE_URL=<staging-supabase-project-url>
E2E_SUPABASE_ANON_KEY=<staging-anon-key>
E2E_SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key>
```

Add to `web-app/.gitignore`:
```
.env.e2e
e2e/.auth-state.json
```

### 0.3 — Install Additional Dependencies

```bash
cd web-app
npm install --save-dev @supabase/supabase-js dotenv
```

`@supabase/supabase-js` is likely already installed as a production dependency — the dev install is for the E2E helpers that run outside the Next.js runtime (global setup/teardown, Playwright test helpers) and need a standalone Supabase client without the `server-only` guard.

`dotenv` is needed to load `.env.e2e` in the Playwright config and global setup scripts.

---

## Phase 1: Playwright Configuration

### 1.1 — Update `playwright.config.ts`

**File:** `web-app/playwright.config.ts`

Replace the current scaffold with the full staging-aware config:

```typescript
import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

// Load E2E env vars
dotenv.config({ path: path.resolve(__dirname, '.env.e2e') })

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',

  // Suites run sequentially (state-dependent); individual tests within a
  // suite may opt into parallel execution via test.describe.configure().
  fullyParallel: false,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // Sequential suite execution

  reporter: [
    ['html', { outputFolder: './e2e/test-results/html-report' }],
    ['list'],
  ],

  // Global setup creates test users; teardown deletes them.
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://bragg-staging.vercel.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },

  // Per-test timeout — staging can be slow
  timeout: 60_000,
  expect: { timeout: 15_000 },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 14'] },
    },
  ],

  // No webServer block — tests hit staging directly.
})
```

**Key changes from current config:**
- `fullyParallel: false` + `workers: 1` (sequential suite ordering)
- Removed `webServer` block (staging, not local dev)
- Added `globalSetup` / `globalTeardown`
- Added `mobile` project (iPhone 14)
- Timeouts: 60s per test, 15s for assertions/actions
- Trace + screenshot + video retained on failure
- `dotenv` loads `.env.e2e`

### 1.2 — Delete Placeholder Test

**File to delete:** `web-app/e2e/example.spec.ts`

---

## Phase 2: Shared Utilities & Helpers

### 2.1 — E2E Supabase Admin Client (`e2e/helpers/supabase-admin.ts`)

A standalone Supabase client for admin operations. This runs outside the Next.js runtime, so it cannot use `@/lib/supabase/service-role.ts` (which imports `server-only` and `@/lib/env`).

```typescript
// e2e/helpers/supabase-admin.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let adminClient: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    const url = process.env.E2E_SUPABASE_URL
    const key = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error(
        'E2E_SUPABASE_URL and E2E_SUPABASE_SERVICE_ROLE_KEY must be set'
      )
    }
    adminClient = createClient(url, key)
  }
  return adminClient
}
```

**Design decision:** We do NOT type this with `Database` generics because the E2E helpers run outside the `web-app/src/` TypeScript project. If needed, a subset of types can be extracted into `e2e/helpers/types.ts`.

### 2.2 — Test User Constants (`e2e/helpers/test-users.ts`)

```typescript
// e2e/helpers/test-users.ts
export const TEST_USER_COUNT = 8
export const TEST_USER_EMAIL_DOMAIN = 'bragg-test.local'
export const TEST_USER_PASSWORD = 'E2eTestP@ssw0rd!2026'

export const TEST_USERS = [
  { index: 0, email: 'e2e-user-0@bragg-test.local', displayName: 'TestUser Alpha' },
  { index: 1, email: 'e2e-user-1@bragg-test.local', displayName: 'TestUser Bravo' },
  { index: 2, email: 'e2e-user-2@bragg-test.local', displayName: 'TestUser Charlie' },
  { index: 3, email: 'e2e-user-3@bragg-test.local', displayName: 'TestUser Delta' },
  { index: 4, email: 'e2e-user-4@bragg-test.local', displayName: 'TestUser Echo' },
  { index: 5, email: 'e2e-user-5@bragg-test.local', displayName: 'TestUser Foxtrot' },
  { index: 6, email: 'e2e-user-6@bragg-test.local', displayName: 'TestUser Golf' },
  { index: 7, email: 'e2e-user-7@bragg-test.local', displayName: 'TestUser Hotel' },
] as const

export type TestUser = (typeof TEST_USERS)[number]
```

### 2.3 — Auth State File (`e2e/helpers/auth-state.ts`)

Manages the shared auth state file that global setup writes and tests read.

```typescript
// e2e/helpers/auth-state.ts
import fs from 'fs'
import path from 'path'

const AUTH_STATE_PATH = path.resolve(__dirname, '../.auth-state.json')

export interface AuthState {
  users: Array<{
    index: number
    email: string
    password: string
    userId: string
    displayName: string
  }>
  createdAt: string
}

export function writeAuthState(state: AuthState): void {
  fs.writeFileSync(AUTH_STATE_PATH, JSON.stringify(state, null, 2))
}

export function readAuthState(): AuthState {
  if (!fs.existsSync(AUTH_STATE_PATH)) {
    throw new Error(
      'Auth state file not found. Did global-setup.ts run successfully?'
    )
  }
  return JSON.parse(fs.readFileSync(AUTH_STATE_PATH, 'utf-8'))
}

export function deleteAuthState(): void {
  if (fs.existsSync(AUTH_STATE_PATH)) {
    fs.unlinkSync(AUTH_STATE_PATH)
  }
}
```

### 2.4 — Authentication Helper (`e2e/helpers/auth.ts`)

The core `authenticate(page, userIndex)` function. Uses Supabase JS to sign in with password, then injects session cookies into the Playwright browser context.

```typescript
// e2e/helpers/auth.ts
import { createClient } from '@supabase/supabase-js'
import { Page } from '@playwright/test'
import { readAuthState } from './auth-state'

/**
 * Authenticates a test user in the browser by:
 * 1. Signing in via Supabase signInWithPassword (server-side)
 * 2. Injecting the session tokens as cookies into the browser context
 * 3. Setting the onboarding and terms cookies (skipped for Suite 01 tests)
 * 4. Navigating to the target page
 */
export async function authenticate(
  page: Page,
  userIndex: number,
  options?: {
    skipOnboardingCookie?: boolean  // true for Suite 01 tests
    skipTermsCookie?: boolean       // true for Suite 09 terms test
    navigateTo?: string             // defaults to '/dashboard'
  }
): Promise<void> {
  const state = readAuthState()
  const user = state.users[userIndex]
  if (!user) throw new Error(`Test user ${userIndex} not found in auth state`)

  // Sign in via Supabase JS to get session tokens
  const supabase = createClient(
    process.env.E2E_SUPABASE_URL!,
    process.env.E2E_SUPABASE_ANON_KEY!
  )
  const { data, error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  })
  if (error || !data.session) {
    throw new Error(`Failed to sign in user ${userIndex}: ${error?.message}`)
  }

  const { access_token, refresh_token } = data.session

  // Derive the Supabase project ref from the URL
  // e.g., https://abcdefgh.supabase.co → abcdefgh
  const projectRef = new URL(process.env.E2E_SUPABASE_URL!).hostname.split('.')[0]

  // The Supabase SSR library stores auth as a single cookie (base64-encoded JSON)
  // Cookie name pattern: sb-<project-ref>-auth-token
  const cookieName = `sb-${projectRef}-auth-token`
  const cookieValue = JSON.stringify({
    access_token,
    refresh_token,
    token_type: 'bearer',
    expires_in: data.session.expires_in,
    expires_at: data.session.expires_at,
    user: data.session.user,
  })

  // Parse the base URL for cookie domain
  const baseUrl = new URL(process.env.E2E_BASE_URL!)

  // Inject Supabase auth cookie
  await page.context().addCookies([
    {
      name: cookieName,
      value: encodeURIComponent(`base64-${Buffer.from(cookieValue).toString('base64')}`),
      domain: baseUrl.hostname,
      path: '/',
      httpOnly: true,
      secure: baseUrl.protocol === 'https:',
      sameSite: 'Lax',
    },
  ])

  // Inject app-specific cookies unless explicitly skipped
  if (!options?.skipOnboardingCookie) {
    await page.context().addCookies([
      {
        name: 'bragg_onboarded',
        value: 'true',
        domain: baseUrl.hostname,
        path: '/',
        httpOnly: true,
        secure: baseUrl.protocol === 'https:',
        sameSite: 'Lax',
      },
    ])
  }

  if (!options?.skipTermsCookie) {
    await page.context().addCookies([
      {
        name: 'bragg_terms_version',
        value: '2.0',
        domain: baseUrl.hostname,
        path: '/',
        httpOnly: true,
        secure: baseUrl.protocol === 'https:',
        sameSite: 'Lax',
      },
    ])
  }

  // Navigate to target
  const target = options?.navigateTo ?? '/dashboard'
  await page.goto(target, { waitUntil: 'domcontentloaded' })
}
```

**Implementation notes:**
- The Supabase SSR library (used by `@supabase/ssr`) stores auth tokens in a single chunked cookie. The cookie format may use base64-encoding. During implementation, you MUST verify the exact cookie format by inspecting a real browser session on staging. The code above is a best-effort approximation — the actual encoding might use a different chunking strategy (e.g., `sb-<ref>-auth-token.0`, `sb-<ref>-auth-token.1` for large payloads).
- An alternative approach is to use `page.evaluate()` to call `supabase.auth.setSession()` directly in the browser context after navigating to the app. This may be more resilient to cookie format changes. Both approaches should be tested during Phase 2.

### 2.5 — Fixture Helpers (`e2e/helpers/fixtures.ts`)

```typescript
// e2e/helpers/fixtures.ts
import { getSupabaseAdmin } from './supabase-admin'

// Unique api_id prefix to avoid collision with real Sportmonks data
const E2E_FIXTURE_PREFIX = 'e2e-fixture'

interface SeedFixtureOptions {
  fixtureKey: string        // e.g., '001', '002'
  leagueId: string
  seasonId: string
  homeTeamId: string
  awayTeamId: string
  startDatetime: string     // ISO 8601
  status?: 'upcoming' | 'live' | 'completed' | 'resolved'
  matchNumber?: number
  venueName?: string
  round?: string
}

/**
 * Seeds (or upserts) a test fixture in the staging database.
 * Uses api_id with e2e- prefix for idempotent creation.
 * Returns the fixture ID.
 */
export async function seedTestFixture(opts: SeedFixtureOptions): Promise<string> {
  const admin = getSupabaseAdmin()
  const apiId = `${E2E_FIXTURE_PREFIX}-${opts.fixtureKey}`

  const { data, error } = await admin
    .from('v2_league_season_fixtures')
    .upsert(
      {
        api_id: apiId,
        league_id: opts.leagueId,
        season_id: opts.seasonId,
        home_team_id: opts.homeTeamId,
        away_team_id: opts.awayTeamId,
        start_datetime: opts.startDatetime,
        status: opts.status ?? 'upcoming',
        match_number: opts.matchNumber ?? 999,
        venue_name: opts.venueName ?? 'E2E Test Venue',
        round: opts.round ?? 'E2E Test Round',
      },
      { onConflict: 'api_id' }
    )
    .select('id')
    .single()

  if (error) throw new Error(`Failed to seed fixture ${apiId}: ${error.message}`)
  return data.id
}

/**
 * Seeds scenarios for a (gang, fixture) pair via the RPC function.
 */
export async function seedFixtureScenarios(
  gangId: string,
  fixtureId: string
): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error } = await admin.rpc('seed_fixture_scenarios_for_gang', {
    p_gang_id: gangId,
    p_fixture_id: fixtureId,
  })
  if (error) throw new Error(`Failed to seed scenarios: ${error.message}`)
}

/**
 * Updates fixture status (e.g., upcoming → live → completed).
 */
export async function setFixtureStatus(
  fixtureId: string,
  status: 'upcoming' | 'live' | 'completed' | 'resolved'
): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from('v2_league_season_fixtures')
    .update({ status })
    .eq('id', fixtureId)
  if (error) throw new Error(`Failed to update fixture status: ${error.message}`)
}

/**
 * Updates fixture start_datetime (to control prediction deadline behavior).
 */
export async function setFixtureStartTime(
  fixtureId: string,
  startDatetime: string
): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from('v2_league_season_fixtures')
    .update({ start_datetime: startDatetime })
    .eq('id', fixtureId)
  if (error) throw new Error(`Failed to update fixture start time: ${error.message}`)
}

/**
 * Resolves a single scenario via the RPC function.
 */
export async function resolveScenario(
  scenarioId: string,
  correctAnswer: string
): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error } = await admin.rpc('resolve_scenario', {
    p_scenario_id: scenarioId,
    p_correct_answer: correctAnswer,
  })
  if (error) throw new Error(`Failed to resolve scenario: ${error.message}`)
}

/**
 * Marks a fixture as fully resolved via RPC.
 */
export async function markFixtureResolved(fixtureId: string): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error } = await admin.rpc('mark_fixture_resolved', {
    p_fixture_id: fixtureId,
  })
  if (error) throw new Error(`Failed to mark fixture resolved: ${error.message}`)
}

/**
 * Fetches all scenarios for a (gang, fixture) pair — used for assertions
 * and for resolving scenarios with known correct answers.
 */
export async function getFixtureScenarios(
  gangId: string,
  fixtureId: string
): Promise<Array<{ id: string; slug: string; title: string; input_type: string; points: number }>> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('v2_fixture_scenarios')
    .select('id, slug, title, input_type, points')
    .eq('gang_id', gangId)
    .eq('fixture_id', fixtureId)
    .order('sort_order')
  if (error) throw new Error(`Failed to fetch scenarios: ${error.message}`)
  return data
}

/**
 * Cleans up all E2E test fixtures (identified by api_id prefix).
 */
export async function cleanupTestFixtures(): Promise<void> {
  const admin = getSupabaseAdmin()

  // Delete scenarios first (FK constraint)
  const { data: fixtures } = await admin
    .from('v2_league_season_fixtures')
    .select('id')
    .like('api_id', `${E2E_FIXTURE_PREFIX}%`)

  if (fixtures?.length) {
    const fixtureIds = fixtures.map((f) => f.id)

    // Delete predictions for these scenarios
    await admin
      .from('v2_predictions')
      .delete()
      .in(
        'scenario_id',
        admin
          .from('v2_fixture_scenarios')
          .select('id')
          .in('fixture_id', fixtureIds)
      )

    // Delete scenarios
    await admin
      .from('v2_fixture_scenarios')
      .delete()
      .in('fixture_id', fixtureIds)

    // Delete fixture results
    await admin
      .from('v2_fixture_results')
      .delete()
      .in('fixture_id', fixtureIds)

    // Delete fixture standings
    await admin
      .from('v2_gang_fixture_standings')
      .delete()
      .in('fixture_id', fixtureIds)

    // Delete fixtures
    await admin
      .from('v2_league_season_fixtures')
      .delete()
      .like('api_id', `${E2E_FIXTURE_PREFIX}%`)
  }
}
```

**Implementation note on cleanup:** The cascade-delete approach above uses multiple queries. During implementation, verify the FK cascade rules in the schema — if `ON DELETE CASCADE` is set on `v2_fixture_scenarios.fixture_id`, some of these manual deletes may be unnecessary. Check migrations.

### 2.6 — Gang Helpers (`e2e/helpers/gangs.ts`)

```typescript
// e2e/helpers/gangs.ts
import { getSupabaseAdmin } from './supabase-admin'

/**
 * Fetches the invite code for a gang (admin-level query bypassing RLS).
 */
export async function getGangInviteCode(gangId: string): Promise<string> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('v2_gangs')
    .select('invite_code')
    .eq('id', gangId)
    .single()
  if (error) throw new Error(`Failed to get invite code: ${error.message}`)
  return data.invite_code
}

/**
 * Fetches all members of a gang with their status and role.
 */
export async function getGangMembers(
  gangId: string
): Promise<Array<{ user_id: string; role: string; status: string }>> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('v2_gang_members')
    .select('user_id, role, status')
    .eq('gang_id', gangId)
  if (error) throw new Error(`Failed to get members: ${error.message}`)
  return data
}

/**
 * Enrolls a gang in the IPL 2026 league season (required for scenario seeding).
 * This must be called after gang creation in Suite 02.
 */
export async function enrollGangInLeagueSeason(
  gangId: string,
  leagueId: string,
  seasonId: string
): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from('v2_gang_league_seasons')
    .upsert(
      { gang_id: gangId, league_id: leagueId, season_id: seasonId, is_active: true },
      { onConflict: 'gang_id,league_id,season_id' }
    )
  if (error) throw new Error(`Failed to enroll gang: ${error.message}`)
}

/**
 * Cleans up all gangs created by E2E test users.
 */
export async function cleanupTestGangs(testUserIds: string[]): Promise<void> {
  const admin = getSupabaseAdmin()

  // Find gangs created by test users
  const { data: gangs } = await admin
    .from('v2_gangs')
    .select('id')
    .in('created_by', testUserIds)

  if (gangs?.length) {
    const gangIds = gangs.map((g) => g.id)

    // Delete gang league seasons
    await admin.from('v2_gang_league_seasons').delete().in('gang_id', gangIds)

    // Delete gang members
    await admin.from('v2_gang_members').delete().in('gang_id', gangIds)

    // Delete gang season standings
    await admin.from('v2_gang_season_standings').delete().in('gang_id', gangIds)

    // Delete notifications referencing these gangs
    await admin.from('v2_notifications').delete().in('gang_id', gangIds)

    // Delete gangs (hard delete for cleanup)
    await admin.from('v2_gangs').delete().in('id', gangIds)
  }
}
```

### 2.7 — Assertion Helpers (`e2e/helpers/assertions.ts`)

```typescript
// e2e/helpers/assertions.ts
import { expect, Page } from '@playwright/test'

/**
 * Waits for a Sonner toast to appear with the expected text.
 * The app uses `sonner` (rendered via <Toaster> in root layout).
 */
export async function expectToastMessage(
  page: Page,
  message: string | RegExp
): Promise<void> {
  const toast = page.locator('[data-sonner-toast]')
  if (typeof message === 'string') {
    await expect(toast.filter({ hasText: message })).toBeVisible({ timeout: 10_000 })
  } else {
    await expect(toast.filter({ hasText: message })).toBeVisible({ timeout: 10_000 })
  }
}

/**
 * Asserts the page navigated to the expected path.
 */
export async function expectRedirectTo(page: Page, path: string): Promise<void> {
  await page.waitForURL(`**${path}*`, { timeout: 15_000 })
  expect(new URL(page.url()).pathname).toBe(path)
}

/**
 * Asserts the visible member count in the gang UI.
 */
export async function expectMemberCount(page: Page, count: number): Promise<void> {
  // Implementation depends on the actual UI — look for the member count badge
  // on the gang page header or member list section.
  // This is a placeholder pattern — update selectors during implementation.
  const memberSection = page.getByTestId('member-count').or(
    page.getByText(new RegExp(`${count}\\s+member`))
  )
  await expect(memberSection).toBeVisible()
}

/**
 * Waits for a page to finish loading (no pending navigation, network idle).
 * Useful after authentication redirects.
 */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
}
```

### 2.8 — Shared State Between Suites (`e2e/helpers/shared-state.ts`)

Since suites run sequentially and depend on state from previous suites (e.g., Gang A's ID created in Suite 02 is needed in Suite 03), we need a mechanism to share runtime state across spec files.

```typescript
// e2e/helpers/shared-state.ts
import fs from 'fs'
import path from 'path'

const STATE_PATH = path.resolve(__dirname, '../.shared-state.json')

interface SharedState {
  gangs: {
    gangA?: { id: string; inviteCode: string }
    gangB?: { id: string; inviteCode: string }
    gangC?: { id: string; inviteCode: string }
  }
  fixtures: {
    fixtureX?: { id: string }
    fixtureY?: { id: string }
  }
  leagueSeason?: {
    leagueId: string
    seasonId: string
  }
}

export function getSharedState(): SharedState {
  if (!fs.existsSync(STATE_PATH)) {
    return { gangs: {}, fixtures: {} }
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'))
}

export function updateSharedState(partial: Partial<SharedState>): void {
  const current = getSharedState()
  const merged = {
    ...current,
    ...partial,
    gangs: { ...current.gangs, ...partial.gangs },
    fixtures: { ...current.fixtures, ...partial.fixtures },
  }
  fs.writeFileSync(STATE_PATH, JSON.stringify(merged, null, 2))
}

export function deleteSharedState(): void {
  if (fs.existsSync(STATE_PATH)) {
    fs.unlinkSync(STATE_PATH)
  }
}
```

**Add to `.gitignore`:** `e2e/.shared-state.json`

---

## Phase 3: Global Setup & Teardown

### 3.1 — Global Setup (`e2e/global-setup.ts`)

```typescript
// e2e/global-setup.ts
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.e2e') })

import { getSupabaseAdmin } from './helpers/supabase-admin'
import { TEST_USERS, TEST_USER_PASSWORD } from './helpers/test-users'
import { writeAuthState, deleteAuthState } from './helpers/auth-state'
import { cleanupTestGangs } from './helpers/gangs'
import { cleanupTestFixtures } from './helpers/fixtures'
import { deleteSharedState } from './helpers/shared-state'

async function globalSetup() {
  console.log('\n🔧 E2E Global Setup: Starting...')
  const admin = getSupabaseAdmin()

  // ── Step 1: Clean up leftover data from previous runs ──────────────
  console.log('  Cleaning up leftover test data...')

  // Find any existing test users
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const testUserEmails = TEST_USERS.map((u) => u.email)
  const staleUsers = existingUsers?.users?.filter((u) =>
    testUserEmails.includes(u.email ?? '')
  ) ?? []

  if (staleUsers.length > 0) {
    const staleUserIds = staleUsers.map((u) => u.id)

    // Clean up gangs created by stale users
    await cleanupTestGangs(staleUserIds)

    // Clean up test fixtures
    await cleanupTestFixtures()

    // Delete stale users (cascades to v2_profiles via FK)
    for (const user of staleUsers) {
      await admin.auth.admin.deleteUser(user.id)
    }
    console.log(`  Cleaned up ${staleUsers.length} stale test users`)
  }

  // Clean up shared state files
  deleteAuthState()
  deleteSharedState()

  // ── Step 2: Create 8 test users ────────────────────────────────────
  console.log('  Creating test users...')
  const createdUsers: Array<{
    index: number
    email: string
    password: string
    userId: string
    displayName: string
  }> = []

  for (const testUser of TEST_USERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: testUser.email,
      password: TEST_USER_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: testUser.displayName },
    })

    if (error) {
      throw new Error(
        `Failed to create test user ${testUser.email}: ${error.message}`
      )
    }

    createdUsers.push({
      index: testUser.index,
      email: testUser.email,
      password: TEST_USER_PASSWORD,
      userId: data.user.id,
      displayName: testUser.displayName,
    })
  }

  console.log(`  Created ${createdUsers.length} test users`)

  // ── Step 3: Write auth state for tests to read ─────────────────────
  writeAuthState({
    users: createdUsers,
    createdAt: new Date().toISOString(),
  })

  // ── Step 4: Look up league/season IDs for later use ────────────────
  // (Store in auth state or shared state so fixture seeding can use them)
  const { data: league } = await admin
    .from('v2_leagues')
    .select('id')
    .limit(1)
    .single()
  const { data: season } = await admin
    .from('v2_seasons')
    .select('id')
    .limit(1)
    .single()

  if (league && season) {
    const { updateSharedState } = await import('./helpers/shared-state')
    updateSharedState({
      leagueSeason: { leagueId: league.id, seasonId: season.id },
    })
  }

  console.log('✅ E2E Global Setup: Complete\n')
}

export default globalSetup
```

### 3.2 — Global Teardown (`e2e/global-teardown.ts`)

```typescript
// e2e/global-teardown.ts
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.e2e') })

import { getSupabaseAdmin } from './helpers/supabase-admin'
import { readAuthState, deleteAuthState } from './helpers/auth-state'
import { cleanupTestGangs } from './helpers/gangs'
import { cleanupTestFixtures } from './helpers/fixtures'
import { deleteSharedState } from './helpers/shared-state'

async function globalTeardown() {
  console.log('\n🧹 E2E Global Teardown: Starting...')
  const admin = getSupabaseAdmin()

  try {
    const state = readAuthState()
    const userIds = state.users.map((u) => u.userId)

    // ── Step 1: Clean up test fixtures and their data ──────────────
    console.log('  Cleaning up test fixtures...')
    await cleanupTestFixtures()

    // ── Step 2: Clean up gangs created by test users ───────────────
    console.log('  Cleaning up test gangs...')
    await cleanupTestGangs(userIds)

    // ── Step 3: Delete notifications for test users ────────────────
    console.log('  Cleaning up notifications...')
    await admin
      .from('v2_notifications')
      .delete()
      .in('user_id', userIds)

    // ── Step 4: Delete test user profiles ──────────────────────────
    console.log('  Deleting test user profiles...')
    await admin
      .from('v2_profiles')
      .delete()
      .in('id', userIds)

    // ── Step 5: Delete test users via Admin API ────────────────────
    console.log('  Deleting test users...')
    for (const user of state.users) {
      await admin.auth.admin.deleteUser(user.userId)
    }
    console.log(`  Deleted ${state.users.length} test users`)
  } catch (err) {
    console.error('  Warning: teardown error (non-fatal):', err)
  }

  // ── Step 6: Clean up state files ─────────────────────────────────
  deleteAuthState()
  deleteSharedState()

  console.log('✅ E2E Global Teardown: Complete\n')
}

export default globalTeardown
```

---

## Phase 4: Test Suites (Implementation Order)

Each suite is a single `.spec.ts` file. Below is the implementation plan for each, including key implementation details, locator strategies, and edge cases to handle.

### General Implementation Patterns

**Every spec file follows this structure:**
```typescript
import { test, expect } from '@playwright/test'
import { authenticate } from './helpers/auth'
import { readAuthState } from './helpers/auth-state'
import { getSharedState, updateSharedState } from './helpers/shared-state'

test.describe.configure({ mode: 'serial' }) // Tests within suite run sequentially

test.describe('Suite Name', () => {
  // ... tests
})
```

**Locator strategy priority:**
1. `data-testid` attributes (most stable — add to components as needed)
2. `getByRole()` with accessible name (e.g., `page.getByRole('button', { name: 'Create Gang' })`)
3. `getByText()` / `getByPlaceholder()` for form elements
4. CSS selectors as last resort

**Adding `data-testid` to components:**
During E2E implementation, you will need to add `data-testid` attributes to various components. Track these in a list and add them in a single PR before or alongside the E2E suite. Key components that will need testids:
- Onboarding form inputs and submit button
- Gang creation dialog and form
- Gang card on dashboard
- Invite code display, share/copy button
- Join gang button, pending state indicator
- Member list, pending requests section, approve/reject buttons
- Prediction scenario cards (by input type), submit button
- Match leaderboard table rows
- Season standings table
- Notification bell, panel, individual items, mark-as-read buttons
- Profile page stats, edit form
- Toast container (Sonner already uses `data-sonner-toast`)

### 4.1 — Suite 01: Onboarding (`e2e/01-onboarding.spec.ts`)

**Implementation steps:**

1. **Tests 1.1–1.4 (validation):** Authenticate User 0 with `skipOnboardingCookie: true`. Verify redirect to `/onboarding`. Test form validation by submitting empty, underage DOB, short display name.

2. **Test 1.5 (successful onboarding):** Fill valid display name, DOB (2000-01-01), check terms checkbox, submit. Assert redirect to `/dashboard` and that `bragg_onboarded` cookie is set.

3. **Test 1.6 (all users onboard):** Loop through Users 1–7, each authenticated with `skipOnboardingCookie: true`. Complete onboarding for each. This is the slowest test — consider parallel execution within this test by using Promise.all on independent user setups (each in its own browser context).

4. **Tests 1.7–1.8 (post-onboarding):** Verify onboarding redirect and empty dashboard state.

**Critical implementation detail:** After `completeOnboarding` server action succeeds, the app sets the `bragg_onboarded` cookie server-side via the response. The E2E test must wait for the redirect to complete and verify the cookie is present — do NOT manually set it after onboarding succeeds.

**Selectors needed:**
- Onboarding form: `getByRole('textbox', { name: /display name/i })`, `getByLabel(/date of birth/i)`, `getByRole('checkbox', { name: /terms/i })`, `getByRole('button', { name: /continue|submit/i })`
- Validation errors: `getByText(/required|too short|must be 18/i)`
- Empty dashboard: `getByText(/create.*gang|join.*gang|no gangs/i)`

**Estimated test count:** 8 tests, ~3–5 minutes total.

### 4.2 — Suite 02: Gang Creation (`e2e/02-gang-creation.spec.ts`)

**Implementation steps:**

1. **Tests 2.1–2.2 (validation):** Open create gang dialog, test empty and too-short names.

2. **Tests 2.3–2.5 (create 3 gangs):** User 0 creates Gang A, User 1 creates Gang B, User 2 creates Gang C. After each creation:
   - Capture the gang ID from the URL (e.g., `/group/<uuid>`)
   - Capture the invite code from the gang page UI
   - Store both in shared state via `updateSharedState()`
   - **IMPORTANT:** Enroll each gang in IPL 2026 league season via `enrollGangInLeagueSeason()` — this is required for fixture scenario seeding to work in Suite 05.

3. **Tests 2.6–2.8 (verification):** Check gang page state, dashboard card, and invite code format.

**Capturing gang ID from URL:**
```typescript
// After gang creation redirects to /group/<id>
await page.waitForURL('**/group/**')
const gangId = new URL(page.url()).pathname.split('/').pop()!
```

**Capturing invite code:**
```typescript
// The invite code is displayed on the gang page — find it via testid or text pattern
const inviteCode = await page.getByTestId('invite-code').textContent()
// Verify format
expect(inviteCode).toMatch(/^[A-Z0-9]{6}$/)
```

**Shared state update:**
```typescript
updateSharedState({
  gangs: { gangA: { id: gangId, inviteCode: inviteCode! } }
})
```

**Estimated test count:** 8 tests, ~2–3 minutes.

### 4.3 — Suite 03: Gang Join & Invite Codes (`e2e/03-gang-join-invite.spec.ts`)

**Implementation steps:**

1. **Tests 3.1–3.5 (basic join flow):** User 1 navigates to `/join/<Gang-A-invite-code>`. Submits join request. User 0 (admin) views Gang A → pending requests → approves. User 1 verifies gang appears on dashboard.

2. **Tests 3.6–3.9 (bulk joins):** Automate multiple joins across gangs. For efficiency, consider a helper function:
   ```typescript
   async function joinAndApprove(
     joinerIndex: number,
     adminIndex: number,
     gangKey: 'gangA' | 'gangB' | 'gangC'
   ): Promise<void> { ... }
   ```

3. **Tests 3.10–3.11 (error states):** Invalid invite code and already-a-member scenarios.

4. **Tests 3.12–3.13 (auto-accept, share):** Toggle auto_accept via admin settings, then verify immediate approval. Test clipboard copy (requires `page.context().grantPermissions(['clipboard-read', 'clipboard-write'])`).

**Clipboard testing:**
```typescript
await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
await page.getByTestId('share-invite-button').click()
const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
expect(clipboardText).toContain('/join/')
```

**Parallel execution opportunity:** Tests 3.6 and 3.8/3.9 involve multiple independent join operations. Within a single test, you can open multiple browser contexts to join concurrently:
```typescript
const browser = page.context().browser()!
const contexts = await Promise.all(
  [2, 3, 4, 5].map(() => browser.newContext())
)
// ... authenticate each, join, close contexts
```

**Estimated test count:** 13 tests, ~5–8 minutes.

### 4.4 — Suite 04: Gang Management (`e2e/04-gang-management.spec.ts`)

**Implementation steps:**

1. **Test 4.1 (non-admin access):** User 1 navigates to `/group/<gang-a-id>/settings`. Assert access denied (redirect or error).

2. **Tests 4.2–4.4 (settings updates):** User 0 updates gang name, prediction deadline, auto_accept toggle. Assert settings saved and reflected.

3. **Tests 4.5–4.9 (member management):** Remove User 5, block User 4, unblock User 4. Verify visibility changes for affected users.

4. **Tests 4.10–4.11 (leave and reject):** User 3 leaves voluntarily. User 7 requests to join, User 0 rejects.

5. **Test 4.12 (restore name):** Rename Gang A back so later suites have consistent state.

**State dependencies:** This suite modifies gang membership. Track final member states:
- Gang A after Suite 04: Users 0, 1, 2, 6 (active). Users 3, 5 departed. User 4 unblocked (but departed/not-member). User 7 rejected.
- Keep this membership map accurate for Suite 05/06 assertions.

**Estimated test count:** 12 tests, ~4–6 minutes.

### 4.5 — Suite 05: Predictions (`e2e/05-predictions.spec.ts`)

**Pre-suite setup (runs in `test.beforeAll`):**

```typescript
test.beforeAll(async () => {
  const state = getSharedState()
  const { leagueId, seasonId } = state.leagueSeason!

  // Look up 2 team IDs from v2_league_teams
  const admin = getSupabaseAdmin()
  const { data: teams } = await admin
    .from('v2_league_teams')
    .select('id, code')
    .limit(2)

  const [teamA, teamB] = teams!

  // Seed Fixture X (upcoming, 2 hours from now)
  const fixtureXId = await seedTestFixture({
    fixtureKey: '001',
    leagueId, seasonId,
    homeTeamId: teamA.id,
    awayTeamId: teamB.id,
    startDatetime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  })

  // Seed Fixture Y (upcoming, 24 hours from now)
  const fixtureYId = await seedTestFixture({
    fixtureKey: '002',
    leagueId, seasonId,
    homeTeamId: teamB.id,
    awayTeamId: teamA.id,
    startDatetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  })

  updateSharedState({
    fixtures: {
      fixtureX: { id: fixtureXId },
      fixtureY: { id: fixtureYId },
    },
  })

  // Seed scenarios for Gang A and Gang B
  await seedFixtureScenarios(state.gangs.gangA!.id, fixtureXId)
  await seedFixtureScenarios(state.gangs.gangA!.id, fixtureYId)
  await seedFixtureScenarios(state.gangs.gangB!.id, fixtureXId)
  await seedFixtureScenarios(state.gangs.gangB!.id, fixtureYId)
})
```

**Implementation steps:**

1. **Tests 5.1–5.3:** Navigate to gang page, verify fixture visibility, navigate to prediction page, count scenario cards.

2. **Tests 5.4–5.7 (scenario types):** Test each input type:
   - `team_select`: Click a team card
   - `player_select`: Open player picker, select a player
   - `yes_no`: Toggle yes/no button
   - `number_range` / `over_range`: Select a bracket from the range options

3. **Tests 5.8–5.10 (submit flow):** Partial submit, re-submit with changes, full submit. Assert toast messages and "last submitted" timestamp.

4. **Tests 5.11–5.12 (multi-user, cross-gang):** Other users predict; User 0 predicts in Gang B.

5. **Tests 5.13–5.16 (status/deadline):** Check prediction badge. Use `setFixtureStartTime()` to move fixture past deadline. Use `setFixtureStatus()` to set `live`. Verify prediction window closes.

**Scenario interaction patterns** (these are the most complex locators — will require `data-testid` on each scenario card type):
```typescript
// team_select
await page.getByTestId(`scenario-${slug}`).getByRole('button', { name: teamCode }).click()

// player_select
await page.getByTestId(`scenario-${slug}`).getByRole('combobox').click()
await page.getByRole('option', { name: /playerName/i }).click()

// yes_no
await page.getByTestId(`scenario-${slug}`).getByRole('button', { name: 'Yes' }).click()

// number_range / over_range
await page.getByTestId(`scenario-${slug}`).getByRole('button', { name: /150-170/ }).click()
```

**Estimated test count:** 16 tests, ~8–12 minutes.

### 4.6 — Suite 06: Leaderboards & Standings (`e2e/06-leaderboards.spec.ts`)

**Pre-suite setup (runs in `test.beforeAll`):**

```typescript
test.beforeAll(async () => {
  const state = getSharedState()
  const fixtureXId = state.fixtures.fixtureX!.id
  const gangAId = state.gangs.gangA!.id

  // Move fixture to completed
  await setFixtureStatus(fixtureXId, 'completed')

  // Resolve all scenarios with known correct answers
  const scenarios = await getFixtureScenarios(gangAId, fixtureXId)
  for (const scenario of scenarios) {
    // Use deterministic correct answers based on input_type
    let correctAnswer: string
    switch (scenario.input_type) {
      case 'team_select':
        correctAnswer = '<home-team-code>'  // Use actual team code
        break
      case 'player_select':
        correctAnswer = '<known-player-id>' // Use actual player ID
        break
      case 'yes_no':
        correctAnswer = 'Yes'
        break
      case 'number_range':
        correctAnswer = '150-170'           // Use actual bracket from options
        break
      case 'over_range':
        correctAnswer = '6.1-8.0'           // Use actual bracket from options
        break
      default:
        correctAnswer = 'Unknown'
    }
    await resolveScenario(scenario.id, correctAnswer)
  }

  // Also resolve for Gang B (same fixture, different scenario rows)
  const gangBScenarios = await getFixtureScenarios(state.gangs.gangB!.id, fixtureXId)
  for (const scenario of gangBScenarios) {
    // Same correct answers (same match, different gang)
    // ... same switch logic
    await resolveScenario(scenario.id, correctAnswer)
  }

  // Mark fixture resolved
  await markFixtureResolved(fixtureXId)
})
```

**Implementation steps:**

1. **Tests 6.1–6.5 (match leaderboard):** Navigate to match page, verify scores, rankings, prediction reveal matrix, correct/incorrect indicators.

2. **Tests 6.6–6.8 (season standings):** Navigate to standings page, verify cumulative points, accuracy, points per match.

3. **Tests 6.9–6.10 (edge cases):** Departed member ranking, cross-gang isolation.

4. **Test 6.11 (recent results):** Verify fixture appears in recent results on gang page.

**Score verification:** The correct scores depend on what each user predicted vs the resolved correct answers. Since we control both (predictions in Suite 05, resolutions in this setup), we can calculate expected scores and assert exact values. Build a helper:
```typescript
function calculateExpectedScore(
  predictions: Record<string, string>,   // slug → user's answer
  correctAnswers: Record<string, string>, // slug → correct answer
  pointsMap: Record<string, number>       // slug → points value
): number {
  return Object.entries(predictions).reduce((total, [slug, value]) => {
    if (correctAnswers[slug] === value) return total + (pointsMap[slug] ?? 0)
    return total
  }, 0)
}
```

**Estimated test count:** 11 tests, ~3–5 minutes.

### 4.7 — Suite 07: Notifications (`e2e/07-notifications.spec.ts`)

**Implementation steps:**

1. **Tests 7.1–7.3:** Verify notification bell in navbar, unread badge, panel opens.

2. **Tests 7.4–7.6:** Check for specific notification types:
   - `join_request` (User 0 received when users joined Gang A)
   - `join_approved` (User 1 received)
   - `results_available` (all Gang A members received after Fixture X resolved)

3. **Tests 7.7–7.8:** Mark single as read, mark all as read.

4. **Test 7.9:** Click notification to navigate to relevant page.

**Notification types in the system** (from `v2_notification_type` enum): `join_request`, `join_approved`, `join_rejected`, `new_member`, `deadline_reminder`, `results_available`, `gang_deleted`, `admin_promoted`.

**Selectors:**
```typescript
page.getByTestId('notification-bell')
page.getByTestId('notification-badge')
page.getByTestId('notification-panel')
page.getByTestId('notification-item').filter({ hasText: /results available/i })
page.getByRole('button', { name: /mark all.*read/i })
```

**Estimated test count:** 9 tests, ~2–3 minutes.

### 4.8 — Suite 08: Profile (`e2e/08-profile.spec.ts`)

**Implementation steps:**

1. **Tests 8.1–8.2:** Navigate to `/profile`, verify display name and stats (gangs count, predictions, accuracy, points).

2. **Tests 8.3–8.6:** Edit display name validation, success, uniqueness check, revert.

3. **Tests 8.7–8.8:** Sign out (verify redirect to `/login`), re-authenticate.

**Uniqueness test (8.5):** The display name uniqueness constraint is per-gang. User 1 changing their name to match User 0's name should fail if they share a gang.

**Sign-out test (8.7):**
```typescript
await page.getByTestId('user-menu').click()
await page.getByRole('button', { name: /sign out/i }).click()
await expectRedirectTo(page, '/login')
// Verify cookies cleared
const cookies = await page.context().cookies()
const authCookie = cookies.find(c => c.name.startsWith('sb-'))
expect(authCookie).toBeUndefined()
```

**Estimated test count:** 8 tests, ~2–3 minutes.

### 4.9 — Suite 09: Edge Cases (`e2e/09-edge-cases.spec.ts`)

**Implementation steps:**

1. **Tests 9.1–9.4 (auth & access errors):** Clear cookies → protected route → redirect. Non-member accessing gang. Non-existent gang/fixture pages.

2. **Tests 9.5–9.7 (mobile viewport):** These run under the `mobile` project only. Use `test.skip()` in the chromium project:
   ```typescript
   test('mobile — dashboard', async ({ page, browserName }) => {
     test.skip(browserName !== 'webkit', 'Mobile-only test')
     // or check viewport width
   })
   ```
   Alternatively, tag these tests and filter by project.

3. **Test 9.8 (rate limiting):** Submit predictions >60 times rapidly. Expect a 429-type error from the rate limiter. Use a loop with `page.evaluate()` to call the submit API directly for speed.

4. **Test 9.9 (terms version):** Via service role, update User 7's `terms_version` to `1.0` in `v2_profiles`. Also delete the `bragg_terms_version` cookie. Navigate to dashboard → assert redirect to `/accept-terms`.

5. **Tests 9.10–9.11 (public pages):** Navigate unauthenticated to `/privacy`, `/terms`, `/` and verify content loads.

**Terms test setup:**
```typescript
test.beforeAll(async () => {
  const admin = getSupabaseAdmin()
  const state = readAuthState()
  const user7Id = state.users[7].userId
  await admin
    .from('v2_profiles')
    .update({ terms_version: '1.0' })
    .eq('id', user7Id)
})
```

**Estimated test count:** 11 tests, ~3–5 minutes.

### 4.10 — Suite 10: Cleanup & Deletion (`e2e/10-cleanup-and-deletion.spec.ts`)

**Implementation steps:**

1. **Tests 10.1–10.3 (gang deletion):** User 2 (admin of Gang C) opens delete dialog, confirms. Verify Gang C soft-deleted. Check User 0 and User 1 no longer see it.

2. **Test 10.4 (deletion notification):** Check User 0's and User 1's notifications for `gang_deleted` notification for Gang C.

3. **Tests 10.5–10.6 (account deletion):** User 7 navigates to `/profile/delete`, confirms. Verify redirect to login. Attempt re-auth → should fail.

4. **Test 10.7 (admin transfer):** If User 7 was admin of any gang, verify admin role transferred. (In our test plan, User 7 was not an admin of any gang, so this test may be marked as a no-op or use a different user setup.)

**Account deletion re-auth check:**
```typescript
const supabase = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_ANON_KEY!)
const { error } = await supabase.auth.signInWithPassword({
  email: user7.email,
  password: user7.password,
})
// Depending on implementation: either signIn fails entirely,
// or succeeds but the app redirects to a "account deleted" state.
// Check the delete_account RPC behavior — soft-delete sets is_deleted=true
// but the Supabase auth user may still exist.
```

**Estimated test count:** 7 tests, ~2–3 minutes.

---

## Phase 5: Test Data IDs & Component Testids

### 5.1 — Add `data-testid` Attributes to Components

Create a tracking list of all `data-testid` values needed. Add them to the corresponding React components in a single focused PR before (or alongside) the E2E suite.

| Testid | Component File | Purpose |
|---|---|---|
| `onboarding-form` | `components/onboarding/onboarding-form.tsx` | Form container |
| `display-name-input` | `components/onboarding/onboarding-form.tsx` | Display name field |
| `dob-input` | `components/onboarding/onboarding-form.tsx` | Date of birth field |
| `terms-checkbox` | `components/onboarding/onboarding-form.tsx` | Terms acceptance |
| `onboarding-submit` | `components/onboarding/onboarding-form.tsx` | Submit button |
| `create-gang-dialog` | `components/gangs/create-gang-dialog.tsx` | Creation dialog |
| `gang-name-input` | `components/gangs/create-gang-dialog.tsx` | Gang name field |
| `create-gang-submit` | `components/gangs/create-gang-dialog.tsx` | Create button |
| `gang-card` | `components/gangs/gang-card.tsx` | Dashboard gang card |
| `invite-code` | `components/gangs/gang-header.tsx` | Displayed invite code |
| `share-invite-button` | `components/gangs/gang-header.tsx` | Copy/share button |
| `member-count` | `components/gangs/gang-header.tsx` | Member count display |
| `member-list` | `components/gangs/member-list.tsx` | Members section |
| `pending-requests` | `components/gangs/pending-requests.tsx` | Pending join requests |
| `approve-button` | `components/gangs/pending-requests.tsx` | Approve join |
| `reject-button` | `components/gangs/pending-requests.tsx` | Reject join |
| `join-gang-button` | `components/gangs/join-page-auth.tsx` | Join CTA on /join page |
| `leave-gang-button` | `components/gangs/leave-gang-button.tsx` | Leave gang CTA |
| `delete-gang-section` | `components/gangs/delete-gang-section.tsx` | Delete gang UI |
| `scenario-{slug}` | `components/predictions/scenario-card.tsx` | Per-scenario card |
| `submit-predictions` | `components/predictions/prediction-form.tsx` | Submit button |
| `prediction-status` | `components/matches/match-card.tsx` | "Predicted" badge |
| `match-leaderboard` | `components/leaderboards/match-leaderboard.tsx` | Leaderboard table |
| `season-standings` | `components/leaderboards/standings-table.tsx` | Standings table |
| `notification-bell` | `components/notifications/notification-bell.tsx` | Bell icon |
| `notification-badge` | `components/notifications/notification-bell.tsx` | Unread count |
| `notification-panel` | `components/notifications/notification-panel.tsx` | Notification sheet |
| `notification-item` | `components/notifications/notification-item.tsx` | Single notification |
| `mark-all-read` | `components/notifications/notification-panel.tsx` | Mark all read |
| `user-menu` | `components/layout/header.tsx` or `user-nav.tsx` | User avatar/menu |
| `sign-out-button` | `components/layout/user-nav.tsx` | Sign out |
| `profile-stats` | `components/profile/profile-stats.tsx` | Stats section |
| `edit-display-name` | `components/profile/edit-profile-form.tsx` | Edit name form |
| `delete-account-confirm` | `components/profile/delete-account.tsx` | Delete confirmation |

**Implementation rule:** Testids are only for E2E testing and should not change app behavior. Use the convention `data-testid="kebab-case-name"`.

---

## Phase 6: CI Integration

### 6.1 — GitHub Actions Workflow

**File:** `.github/workflows/e2e-staging.yml`

```yaml
name: E2E Tests (Staging)

on:
  workflow_dispatch:  # Manual trigger
  deployment_status:  # Auto-trigger after staging deploy

concurrency:
  group: e2e-staging
  cancel-in-progress: true

jobs:
  e2e:
    if: >
      github.event_name == 'workflow_dispatch' ||
      (github.event_name == 'deployment_status' &&
       github.event.deployment_status.state == 'success' &&
       github.event.deployment_status.environment == 'staging')
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: web-app/package-lock.json

      - name: Install dependencies
        working-directory: web-app
        run: npm ci

      - name: Install Playwright browsers
        working-directory: web-app
        run: npx playwright install --with-deps chromium webkit

      - name: Run E2E tests
        working-directory: web-app
        env:
          E2E_BASE_URL: https://bragg-staging.vercel.app
          E2E_SUPABASE_URL: ${{ secrets.E2E_SUPABASE_URL }}
          E2E_SUPABASE_ANON_KEY: ${{ secrets.E2E_SUPABASE_ANON_KEY }}
          E2E_SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.E2E_SUPABASE_SERVICE_ROLE_KEY }}
        run: npx playwright test --project=chromium

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-results
          path: |
            web-app/e2e/test-results/
          retention-days: 14
```

### 6.2 — Required CI Secrets

Add these to the GitHub repo settings → Secrets → Actions:

| Secret | Value |
|---|---|
| `E2E_SUPABASE_URL` | Staging Supabase project URL |
| `E2E_SUPABASE_ANON_KEY` | Staging anon (publishable) key |
| `E2E_SUPABASE_SERVICE_ROLE_KEY` | Staging service role key |

---

## Phase 7: Final File Tree

```
web-app/
├── playwright.config.ts              ← Updated (Phase 1)
├── .env.e2e                          ← New (gitignored, Phase 0)
├── .gitignore                        ← Updated (add .env.e2e, auth/shared state files)
├── e2e/
│   ├── global-setup.ts               ← New (Phase 3)
│   ├── global-teardown.ts            ← New (Phase 3)
│   ├── helpers/
│   │   ├── supabase-admin.ts         ← New (Phase 2)
│   │   ├── test-users.ts             ← New (Phase 2)
│   │   ├── auth-state.ts             ← New (Phase 2)
│   │   ├── auth.ts                   ← New (Phase 2)
│   │   ├── fixtures.ts               ← New (Phase 2)
│   │   ├── gangs.ts                  ← New (Phase 2)
│   │   ├── assertions.ts             ← New (Phase 2)
│   │   └── shared-state.ts           ← New (Phase 2)
│   ├── 01-onboarding.spec.ts         ← New (Phase 4)
│   ├── 02-gang-creation.spec.ts      ← New (Phase 4)
│   ├── 03-gang-join-invite.spec.ts   ← New (Phase 4)
│   ├── 04-gang-management.spec.ts    ← New (Phase 4)
│   ├── 05-predictions.spec.ts        ← New (Phase 4)
│   ├── 06-leaderboards.spec.ts       ← New (Phase 4)
│   ├── 07-notifications.spec.ts      ← New (Phase 4)
│   ├── 08-profile.spec.ts            ← New (Phase 4)
│   ├── 09-edge-cases.spec.ts         ← New (Phase 4)
│   ├── 10-cleanup-and-deletion.spec.ts ← New (Phase 4)
│   ├── .auth-state.json              ← Runtime (gitignored)
│   ├── .shared-state.json            ← Runtime (gitignored)
│   └── test-results/                 ← Runtime (gitignored)
├── .github/
│   └── workflows/
│       └── e2e-staging.yml           ← New (Phase 6)
```

**Files deleted:** `e2e/example.spec.ts`

**Files modified in web-app/src/:** ~30 component files to add `data-testid` attributes (Phase 5).

---

## Implementation Order & Time Estimates

| Phase | Description | Dependencies | Files |
|---|---|---|---|
| **Phase 0** | Env setup, verify staging data | None | `.env.e2e`, `.gitignore` |
| **Phase 1** | Playwright config | Phase 0 | `playwright.config.ts` |
| **Phase 2** | Shared helpers (8 files) | Phase 0 | `e2e/helpers/*` |
| **Phase 3** | Global setup/teardown | Phase 2 | `e2e/global-setup.ts`, `e2e/global-teardown.ts` |
| **Phase 4.1** | Suite 01: Onboarding | Phase 3 | `e2e/01-onboarding.spec.ts` |
| **Phase 4.2** | Suite 02: Gang Creation | Phase 4.1 | `e2e/02-gang-creation.spec.ts` |
| **Phase 4.3** | Suite 03: Join & Invite | Phase 4.2 | `e2e/03-gang-join-invite.spec.ts` |
| **Phase 4.4** | Suite 04: Gang Management | Phase 4.3 | `e2e/04-gang-management.spec.ts` |
| **Phase 4.5** | Suite 05: Predictions | Phase 4.4 | `e2e/05-predictions.spec.ts` |
| **Phase 4.6** | Suite 06: Leaderboards | Phase 4.5 | `e2e/06-leaderboards.spec.ts` |
| **Phase 4.7** | Suite 07: Notifications | Phase 4.6 | `e2e/07-notifications.spec.ts` |
| **Phase 4.8** | Suite 08: Profile | Phase 4.7 | `e2e/08-profile.spec.ts` |
| **Phase 4.9** | Suite 09: Edge Cases | Phase 4.8 | `e2e/09-edge-cases.spec.ts` |
| **Phase 4.10** | Suite 10: Cleanup | Phase 4.9 | `e2e/10-cleanup-and-deletion.spec.ts` |
| **Phase 5** | Component testids | Can parallel with Phase 4 | ~30 component files |
| **Phase 6** | CI workflow | Phase 4 complete | `.github/workflows/e2e-staging.yml` |

**Recommended approach:** Implement Phases 0–3 first, then build suites one at a time (Phase 4.1 → 4.2 → ...), running each against staging as you go. Phase 5 (testids) can be done incrementally — add testids for Suite N just before implementing Suite N.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Staging data drift** — reference data (teams, players, templates) changes between runs | Tests fail on missing/changed IDs | Global setup validates reference data existence before creating users. Fixture helpers use upsert with `api_id` prefix. |
| **Cookie format changes** — Supabase SSR updates its cookie encoding | Auth injection breaks | Pin `@supabase/ssr` version. Add a smoke test in global setup that verifies one user can authenticate. If it fails, log the actual cookie format for debugging. |
| **Flaky staging** — cold starts, slow responses | Timeouts, intermittent failures | 60s test timeout, 15s assertion timeout, retry on CI (2 retries), `waitForLoadState('networkidle')` after navigation. |
| **Test pollution** — a failed run leaves stale data | Next run fails on duplicate data | Global setup cleans up stale `e2e-user-*` accounts before creating new ones. Fixture cleanup by `api_id` prefix. |
| **Parallel execution conflicts** — multiple CI runs overlap | Data conflicts | `concurrency` group in GitHub Actions ensures only one E2E run at a time. |
| **Supabase rate limits** — too many admin API calls in setup | Setup fails | Batch operations where possible. Add delays between user creation calls if rate-limited. |
| **Mobile viewport differences** — real device vs emulated viewport | False passes | Mobile tests use `devices['iPhone 14']` viewport, which matches common screen size. Supplement with real device testing for launch.
