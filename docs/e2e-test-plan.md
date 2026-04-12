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
