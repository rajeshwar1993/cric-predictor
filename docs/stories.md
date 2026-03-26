# Bragg — User Stories

**Priority Levels:**
- **P0** = Core app — must ship before Match 1 starts (Phases 0-2). App is usable with manual result entry.
- **P1** = Live features + polish — ship during first week of IPL (Phases 3-4). Includes API integration, cron, live leaderboard, mobile polish, notifications. Fallback: admin manual entry works without these.
- **P2** = Mid-season enhancements (group switcher, copy picks, shareable images, standings filter)
- **P3** = End-of-season (season summary cards)

---

## Epic 1: Authentication & User Profile

### US-1.1: Magic Link Sign Up (P0)
**As a** new user,
**I want to** sign up with my display name and email via a magic link,
**So that** I can create an account without remembering a password.

**Acceptance Criteria:**
- User enters display name (2-30 chars) and email on the login page
- System sends a magic link email via Supabase Auth
- After clicking the magic link, user is redirected to `/auth/callback` which exchanges the token for a session
- A `profiles` row is auto-created with display name and email (via DB trigger)
- User is redirected to dashboard (or the original protected page they were trying to access)
- If the email was not received, user can resend (throttled to 1/min)

### US-1.2: Magic Link Sign In (P0)
**As a** returning user,
**I want to** sign in with just my email via a magic link,
**So that** I can quickly access my groups without remembering a password.

**Acceptance Criteria:**
- User enters email on the login page
- System sends a magic link email
- After clicking, session is established and user is redirected to dashboard
- Existing `profiles` row is preserved (no duplicate creation)

### US-1.3: Session Persistence (P0)
**As a** logged-in user,
**I want** my session to persist across page refreshes and browser restarts,
**So that** I don't have to log in every time.

**Acceptance Criteria:**
- Session is stored via Supabase auth cookies
- `proxy.ts` refreshes expired tokens on every request
- Refreshing the page keeps the user logged in
- Session is invalidated only on explicit sign out

### US-1.4: Route Protection (P0)
**As a** system,
**I want** protected routes (`/dashboard`, `/group/*`) to redirect unauthenticated users to `/login`,
**So that** only authenticated users can access the app.

**Acceptance Criteria:**
- `proxy.ts` checks for valid session on protected routes
- Unauthenticated users are redirected to `/login` with a `next` parameter preserving the original URL
- After authentication, user is redirected back to the original URL
- Public routes (`/`, `/login`, `/join/[code]`, `/privacy`, `/terms`) are accessible without auth

### US-1.5: Sign Out (P0)
**As a** logged-in user,
**I want to** sign out of the app,
**So that** my session is ended on this device.

**Acceptance Criteria:**
- Sign out button in user menu/avatar dropdown
- Clicking sign out clears the session and redirects to landing page
- All protected routes redirect to login after sign out

---

## Epic 2: Group Management

### US-2.1: Create Group (P0)
**As an** authenticated user,
**I want to** create a prediction group and name it,
**So that** I can invite my friends to predict together.

**Acceptance Criteria:**
- User enters a group name (2-50 chars)
- System creates the group with a unique 12-char hex invite code
- User is auto-added as **owner** with status **approved**
- User is redirected to the group home page
- Invite link is generated: `app.com/join/{invite_code}`
- Max 10 groups per user enforced

### US-2.2: Share Invite Link (P0)
**As a** group owner/admin,
**I want to** copy the invite link to my clipboard,
**So that** I can share it via WhatsApp/SMS.

**Acceptance Criteria:**
- Copy-to-clipboard button on group home page
- Visual confirmation "Link copied!" on click
- Invite link format: `{APP_URL}/join/{invite_code}`

### US-2.3: Join Group via Invite Link (P0)
**As a** user who received an invite link,
**I want to** open the link and request to join the group,
**So that** I can participate in predictions with friends.

**Acceptance Criteria:**
- Opening `/join/{code}` shows the group name + "You've been invited to join [Group Name]"
- SSR page with OG tags (title: "Join [Group Name] on Bragg", description, app image) for rich link previews on WhatsApp/social
- If not logged in: login form is embedded on the page; after auth, user is auto-redirected back
- If logged in: clicking "Request to Join" creates a `group_members` row with status = `pending`
- User sees "Waiting for admin approval" screen
- If user is already a member, redirect to group home
- If invite code is invalid, show error message

### US-2.4: Admin Approve/Reject Join Request (P0)
**As a** group admin/owner,
**I want to** approve or reject pending join requests,
**So that** I control who enters my group.

**Acceptance Criteria:**
- Admin sees pending requests in admin panel with user name + email
- "Approve" button → status changes to `approved`, `approved_at` is set
- "Reject" button → status changes to `rejected`
- Approved member can now access the group, predict, and view leaderboards
- Rejected member sees "Your request was not approved"
- In-app notification sent to the member on approval/rejection

### US-2.5: Re-request After Rejection (P1)
**As a** rejected user,
**I want to** re-request to join a group,
**So that** I get another chance if the admin rejected me by mistake.

**Acceptance Criteria:**
- Rejected user sees a "Request Again" button on the join page
- Clicking it sets status back to `pending`
- Admin sees the new request in pending approvals

### US-2.6: Remove Member (P1)
**As a** group admin/owner,
**I want to** remove a member from the group,
**So that** I can manage my group roster.

**Acceptance Criteria:**
- Admin sees "Remove" option next to each member (except owner)
- Removing sets status to `removed`
- Removed member loses access to the group immediately
- Removed member's past predictions and points remain in leaderboards

### US-2.7: Promote to Co-Admin (P1)
**As a** group owner,
**I want to** promote a member to co-admin,
**So that** they can help manage the group.

**Acceptance Criteria:**
- Owner sees "Promote to Admin" option next to members
- Promoted member's role changes to `admin`
- Admin can now: approve/reject members, resolve custom scenarios, set deadlines, remove scenarios
- Multiple admins allowed per group

### US-2.8: Demote Admin (P1)
**As a** group owner,
**I want to** demote an admin back to member,
**So that** I can revoke their admin privileges if needed.

**Acceptance Criteria:**
- Owner sees "Demote to Member" option next to admins
- Only the owner can demote; admins cannot demote each other
- Demoted user's role changes to `member`

### US-2.9: View My Groups (P0)
**As an** authenticated user,
**I want to** see all groups I belong to on my dashboard,
**So that** I can navigate between them.

**Acceptance Criteria:**
- Dashboard shows a list/grid of group cards
- Each card shows: group name, member count, user's role badge, latest match status
- Clicking a card navigates to group home
- Groups are ordered by most recent activity

### US-2.10: Join Group via Code Input (P0)
**As a** user with an invite code,
**I want to** enter the code on my dashboard,
**So that** I can join a group without needing the full link.

**Acceptance Criteria:**
- Text input on dashboard: "Have an invite code?"
- Entering a valid code and submitting triggers the join flow (same as invite link)
- Invalid code shows error message

---

## Epic 3: Match & Fixture Management

### US-3.1: View Upcoming Matches (P0)
**As a** group member,
**I want to** see upcoming IPL matches on the group home page,
**So that** I know when to submit predictions.

**Acceptance Criteria:**
- Group home shows the next upcoming match as a match card
- Match card displays: match number, teams (with team color badges), venue, date/time, countdown to deadline
- "Predict Now" CTA button on the match card
- If within deadline window, CTA says "Predict Now" or "Edit Predictions"
- If past deadline, CTA says "View Predictions"

### US-3.2: Match Card Display (P0)
**As a** user,
**I want to** see a rich match card with team badges and key info,
**So that** the match context is clear at a glance.

**Acceptance Criteria:**
- Match number badge (top-left)
- Deadline badge (top-right, red if within 1 hour)
- Team A badge (44px circle with team color + code) — left
- "VS" divider — center
- Team B badge — right
- Venue text — below teams
- Full-width CTA button — bottom

### US-3.3: Group Home — Three States (P0)
**As a** group member,
**I want** the group home to adapt based on the match schedule,
**So that** I always see the most relevant content.

**Acceptance Criteria:**
- **State 1 — "Next match in X hours":** Countdown timer, match card, "Predict Now" CTA, season standings below
- **State 2 — "Match is live":** Live score ticker, live leaderboard, predictions locked indicator
- **State 3 — "No upcoming match":** Last match recap card, season standings, next match preview with prediction CTA

---

## Epic 4: Predictions

### US-4.1: Submit Predictions (P0)
**As a** group member,
**I want to** submit my predictions for each scenario before the match,
**So that** I can compete on the leaderboard.

**Acceptance Criteria:**
- Prediction page shows all approved scenarios for the match (system + custom)
- Scenarios are grouped by resolution phase (Toss → Powerplay → Mid-Match → Innings Break → End of Match → Post-Match → Custom)
- Each scenario card shows: title, points, selectable options
- User selects one option per scenario
- Bottom sticky bar shows "X/16 answered" counter + "Submit Predictions" button
- Submitting saves all predictions to the database
- Confirmation message on success
- Server-side deadline check: submissions after deadline are rejected

### US-4.2: Auto-Seed System Scenarios (P0)
**As a** system,
**I want** system scenarios to be auto-seeded when the first member opens the prediction page,
**So that** all groups have the standard 16 scenarios without manual setup.

**Acceptance Criteria:**
- `seed_system_scenarios()` DB function is called when prediction page loads and no scenarios exist for this group+match
- All 16 system scenarios are created with correct options (team picks use match teams, ranges use default brackets)
- System scenarios have `approval_status = 'auto_approved'`
- Idempotent: calling multiple times doesn't create duplicates

### US-4.3: Scenario Input Types (P0)
**As a** user,
**I want** each scenario to have the appropriate input type,
**So that** selecting my prediction is intuitive.

**Acceptance Criteria:**
- **Team pick** (Match Winner, Toss Winner): Two team-colored buttons with team codes
- **Player pick** (Top Scorer, Top Wicket-Taker, POTM, Most Sixes): Searchable dropdown of players from both squads
- **Range bracket** (Total Match Runs, First Innings Score, Powerplay Score, Total 6s, Total Wickets): Row of selectable bracket buttons
- **Yes/No** (Batsman 50+, Bowler 3+, Super Over): Two buttons
- **Over pick** (First Wicket Over): Buttons for overs 1-6

### US-4.4: Partial Submission (P0)
**As a** user,
**I want to** submit predictions for only some scenarios,
**So that** I can participate even if I don't want to answer all 16.

**Acceptance Criteria:**
- No requirement to answer all scenarios
- Unanswered scenarios show as "Not Predicted" on leaderboard
- Unanswered scenarios score 0 points (no penalty)
- Counter shows "X/16 answered" to encourage completion

### US-4.5: Quick Predict Mode (P1)
**As a** casual user,
**I want** a simplified prediction view with only the top 5 easiest scenarios,
**So that** I can participate quickly without filling all 16.

**Acceptance Criteria:**
- Toggle at top of prediction page: "All Scenarios" / "Quick Predict"
- Quick Predict shows only: Match Winner, Toss Winner, First Innings Score, Total Match Runs, Total 6s
- User can switch between modes at any time
- Predictions made in Quick Predict mode persist when switching to All Scenarios

### US-4.6: Edit Predictions (P0)
**As a** user,
**I want to** edit my predictions any number of times before the deadline,
**So that** I can change my mind based on new information (e.g., toss, playing XI).

**Acceptance Criteria:**
- Prediction form shows previously submitted picks
- "Last updated X min ago" timestamp displayed
- User can change any pick and resubmit
- No limit on number of edits
- All edits update `submitted_at` timestamp (used for tiebreaking)
- Editing after deadline is rejected

### US-4.7: Prediction Deadline Enforcement (P0)
**As a** system,
**I want** predictions to be locked at the deadline,
**So that** no one can submit or edit after the cutoff.

**Acceptance Criteria:**
- Default deadline: 45 minutes before scheduled match start
- Admin can override deadline per match (earlier or later)
- Admin can manually lock predictions at any time
- Auto-lock triggers when match status changes to "live" (cron)
- Late submissions are rejected server-side with error message
- UI shows countdown to deadline; after deadline, form is disabled with "Predictions Locked" message

### US-4.8: Pick Visibility & Privacy (P0)
**As a** group member,
**I want** other members' picks to be hidden until the deadline passes,
**So that** no one can copy predictions.

**Acceptance Criteria:**
- Before deadline: users can only see their own picks; other users show "X/16 predicted" count only
- After deadline: all picks for all members become visible to the group
- Leaderboard with points and indicators is visible throughout the match

### US-4.9: Create Custom Scenario (P1)
**As a** group member,
**I want to** propose a custom scenario (e.g., "Kohli scores 50+"),
**So that** my group can have fun, unique predictions.

**Acceptance Criteria:**
- "Propose a Scenario" card at bottom of prediction page
- User enters: title, 2+ options, suggested points (5/10/15/20/25)
- Custom scenario goes to `pending` approval status
- Admin is notified of new custom scenario proposal
- Max 10 custom scenarios per member per match
- Max 30 custom scenarios per group per match

### US-4.10: Admin Approve/Reject Custom Scenario (P1)
**As a** group admin,
**I want to** approve or reject proposed custom scenarios,
**So that** I control the quality of predictions in my group.

**Acceptance Criteria:**
- Admin panel shows pending custom scenarios with title, options, suggested points
- "Approve" button (optionally adjust points before approving)
- "Reject" button
- Approved scenario becomes visible to all members and can be predicted
- Rejected scenario is hidden and the proposer is notified

### US-4.11: Admin Remove Scenario (P1)
**As a** group admin,
**I want to** remove any scenario (system or custom),
**So that** I can clean up irrelevant predictions.

**Acceptance Criteria:**
- Admin sees "Remove" option on any scenario card
- Removing sets `is_removed = true` (soft delete)
- Removed scenario disappears from the prediction page
- Existing predictions for removed scenarios are excluded from leaderboard calculations
- Cannot be undone (admin must re-create the scenario)

---

## Epic 5: Leaderboard & Standings

### US-5.1: Match Leaderboard — Post Match (P0)
**As a** group member,
**I want to** see the match leaderboard after a match,
**So that** I know how everyone performed.

**Acceptance Criteria:**
- **Pre-match state (before deadline):** Shows who has submitted predictions — "X/16 predicted" per member, picks completely hidden
- **Post-deadline / post-match state:**
- Table columns: Rank, Name, scenario status pills, Match Points
- All 5 status indicators shown per scenario: ✅ Correct, ❌ Wrong, ⏳ Pending (for unresolved), — Not Predicted
- Rows sorted by match points (descending), tiebroken by earliest `submitted_at`
- Current user's row highlighted with accent color
- #1 rank in gold, #2 in cyan, #3+ in default text color
- Points displayed in JetBrains Mono

### US-5.2: Match Leaderboard — Live (P1)
**As a** group member during a live match,
**I want to** see the leaderboard update in real time,
**So that** I can follow the action and see how my predictions are doing.

**Acceptance Criteria:**
- Leaderboard updates automatically via Supabase Realtime
- All 5 status indicators: ✅ Correct, ❌ Wrong, 🟡 On Track, 🔴 In Danger, ⏳ Pending
- Resolved scenarios show confirmed points
- "On track" / "In danger" indicators update every minute based on live match data
- Leaderboard rows animate to new positions when rankings change
- Live score ticker at top of page

### US-5.3: Expandable Leaderboard Row (P1)
**As a** group member,
**I want to** click on a user's leaderboard row to see their full picks vs actual results,
**So that** I can see exactly what they predicted.

**Acceptance Criteria:**
- Clicking a row expands it to show all scenarios
- Each scenario shows: title, user's pick, actual result, status indicator, points earned
- "Not Predicted" shown for unanswered scenarios
- Collapse on second click

### US-5.4: Season Standings (P0)
**As a** group member,
**I want to** see cumulative season standings across all matches,
**So that** I can track the season-long competition.

**Acceptance Criteria:**
- Full-width table: Rank, Name, Total Points, Matches Predicted, Points/Match, Accuracy %, Role Badge
- Current user row highlighted
- Rows sorted by total points descending
- "Joined in Match X" badge for mid-season joiners
- Points per match column normalizes for late joiners
- Accuracy % = (correct predictions / total resolved predictions) × 100

### US-5.5: Season Standings Filter (P2)
**As a** group member,
**I want to** filter standings by "All Time" or "Last 10 Matches",
**So that** I can see recent form vs overall performance.

**Acceptance Criteria:**
- Toggle: "All Time" / "Last 10 Matches"
- "Last 10 Matches" recalculates all stats for only the most recent 10 matches
- Default view is "All Time"

### US-5.6: Live Score Ticker (P1)
**As a** user viewing a live match leaderboard,
**I want to** see the current match score at the top,
**So that** I have context for the leaderboard indicators.

**Acceptance Criteria:**
- Inline component: LIVE badge (red dot + "LIVE") + Team A code + score + overs + divider + Team B code + score + overs
- Updates via Supabase Realtime on `matches` table
- Shows "Yet to bat" for team that hasn't batted yet
- Disappears when match is not live

### US-5.7: "On Track" / "In Danger" Indicators (P1)
**As a** user during a live match,
**I want to** see whether my predictions are currently looking good or bad,
**So that** I can follow along with excitement.

**Acceptance Criteria:**
- Computed client-side using live match data from `matches.live_scorecard_json`
- Logic per scenario type as defined in PRD (see "On Track Indicator Logic" section)
- Updates every time the `matches` table row is updated via Realtime
- Shown as 🟡 (yellow/cyan dot) for On Track, 🔴 (red dot) for In Danger
- Pending scenarios that can't be evaluated yet show ⏳

---

## Epic 6: Result Resolution

### US-6.1: Manual Result Entry (P0)
**As a** group admin,
**I want to** manually enter match results,
**So that** leaderboards can be scored even without API integration.

**Acceptance Criteria:**
- Admin panel shows result entry form for completed matches
- Fields: match winner, toss winner, top scorer (+ runs), top wicket-taker (+ wickets), POTM, first innings score, total match runs, total wickets, total sixes, powerplay score, powerplay wickets, super over (yes/no), most sixes player, first wicket over, batsman scored 50+ (yes/no), bowler took 3+ (yes/no)
- Submitting writes results to `matches` table and triggers `resolve_match_predictions()` function
- Leaderboards update after resolution

### US-6.2: Admin Resolve Custom Scenarios (P1)
**As a** group admin,
**I want to** manually resolve custom scenarios after the match,
**So that** custom predictions are scored.

**Acceptance Criteria:**
- Admin panel shows unresolved custom scenarios for completed matches
- For each, admin selects the correct answer from the scenario's options
- Submitting updates `scenarios.correct_answer`, `is_resolved = true`, and scores all predictions

### US-6.3: Auto-Resolution via API (P1)
**As a** system,
**I want** match results to be automatically fetched and scenarios resolved via the CricketData.org API,
**So that** leaderboards update without manual intervention.

**Acceptance Criteria:**
- Cron polls `/match_scorecard` every minute during live match
- Progressively resolves scenarios as data becomes available
- 13 of 16 system scenarios are fully auto-scorable
- Remaining 3 (super over, most sixes, first wicket over) resolved if data available, otherwise flagged for admin manual resolution
- `predictions.is_correct` and `points_earned` updated for each resolved scenario
- Supabase Realtime pushes updates to clients

### US-6.4: Abandoned Match Handling (P1)
**As a** system,
**I want** abandoned matches to be handled correctly,
**So that** partially played matches don't corrupt leaderboards.

**Acceptance Criteria:**
- If abandoned after play: resolved predictions keep their points, unresolved are voided (0 points, excluded from accuracy %)
- If never started: all predictions discarded, match excluded from season standings
- `void_abandoned_match()` DB function handles this
- Match status updated to `abandoned` or `no_result`

---

## Epic 7: API Integration & Cron

### US-7.1: CricketData.org API Client (P1)
**As a** system,
**I want** a typed API client for CricketData.org,
**So that** I can reliably fetch match data.

**Acceptance Criteria:**
- TypeScript client in `/lib/cricket-api.ts`
- Typed interfaces for all API responses
- Endpoints implemented: `/matches`, `/match_info`, `/match_scorecard`, `/match_squad`, `/series_info`
- API key from environment variable
- Error handling: returns null on failure (cron skips and retries next cycle)
- Response parsing: extracts all fields needed for scenario resolution

### US-7.2: Cron Edge Function (P1)
**As a** system,
**I want** a cron job that polls match data every minute during match hours,
**So that** live leaderboards stay updated.

**Acceptance Criteria:**
- Supabase Edge Function triggered by `pg_cron` every minute
- Activation window: only active 2 PM — 1 AM IST on match days
- On non-match days or outside window: exits immediately (< 1ms)
- State machine: `upcoming` → `live` → `completed`
- Pre-match: fetches squad 30 min before match
- Live: polls scorecard, writes snapshot, resolves scenarios progressively
- Completed: final resolution pass, then stops polling
- `last_polled_at` updated on each poll to prevent overlapping executions
- Handles double-header days (two matches)

### US-7.3: Auto-Lock on Match Going Live (P1)
**As a** system,
**I want** predictions to auto-lock when the match goes live,
**So that** late starts and delays are handled correctly.

**Acceptance Criteria:**
- Cron checks `match_info` status for upcoming matches
- When status changes to live, updates `matches.status = 'live'`
- All `match_group_settings` for this match get `is_locked = true`
- Prediction form immediately shows "Locked" state on next Realtime update

### US-7.4: Fetch Playing XI (P1)
**As a** system,
**I want** to fetch the playing XI from the API before the match,
**So that** player-pick dropdowns show the actual playing 11 (not full squad).

**Acceptance Criteria:**
- Cron fetches `/match_squad` 30 minutes before match
- Player data is cached in the database
- Prediction page player dropdowns update to show playing XI
- If playing XI not available, fall back to full squad

---

## Epic 8: Multi-Group Experience

### US-8.1: Multiple Group Membership (P0)
**As a** user,
**I want to** be a member of multiple groups simultaneously,
**So that** I can play with my office friends, college friends, and family.

**Acceptance Criteria:**
- User can create/join up to 10 groups
- Each group is fully independent (separate predictions, leaderboards, standings)
- Dashboard shows all groups
- User can be different roles in different groups (owner of one, member of another)

### US-8.2: Independent Predictions Per Group (P0)
**As a** user in multiple groups,
**I want** my predictions to be independent per group,
**So that** I can make different picks in different groups.

**Acceptance Criteria:**
- Predictions are tied to group-specific scenarios (each group has its own set of scenarios per match)
- Picking CSK in Group A and MI in Group B for the same match is allowed
- Leaderboards are completely separate per group

### US-8.3: Live Match Group Switcher (P2)
**As a** user in multiple groups during a live match,
**I want** a quick tab bar to switch between groups' leaderboards,
**So that** I can follow all my groups at once.

**Acceptance Criteria:**
- Tab bar at top of match leaderboard page
- Shows each group name + user's current rank in that group
- One tap switches the leaderboard view
- #1 rank badge shown in gold

### US-8.4: Copy Picks from Another Group (P2)
**As a** user predicting for the same match in a second group,
**I want** to copy my picks from another group as a starting point,
**So that** I don't have to fill 16 scenarios from scratch.

**Acceptance Criteria:**
- "Copy picks from [Group X]" dropdown appears if user has already predicted in another group
- Copies all predictions from the source group
- User can tweak individual picks before submitting

---

## Epic 9: Notifications

### US-9.1: In-App Notification Bell (P1)
**As a** user,
**I want** a notification bell in the header showing unread count,
**So that** I'm aware of important updates.

**Acceptance Criteria:**
- Bell icon (40×40px) in the header/nav
- Unread count badge (red circle with number)
- Clicking opens a dropdown/panel with notification list
- Supabase Realtime subscription updates badge count live

### US-9.2: Notification Types (P1)
**As a** user,
**I want** notifications for key events,
**So that** I don't miss important actions.

**Acceptance Criteria:**
- Join request (for admins): "[Name] wants to join [Group]"
- Approved (for member): "You've been approved to join [Group]!"
- Rejected (for member): "Your request to join [Group] was not approved"
- Predictions open (all members): "Predictions open for [Team A] vs [Team B] — deadline [time]"
- Deadline approaching (members who haven't predicted): "30 min left to predict [Team A] vs [Team B]"
- Results in (all members): "Results are in for [Team A] vs [Team B] — check the leaderboard!"
- Custom scenario proposed (admins): "[Name] proposed a scenario for [Match] — review it"
- Custom scenario approved (proposer): "Your scenario '[title]' was approved!"
- **Consolidation rule:** "Predictions open" and "deadline approaching" notifications for the same match should list ALL groups the user is in for that match in a single notification (e.g., "Predictions open for CSK vs MI in Office Gang, College Boys, Family"), not send separate notifications per group

### US-9.3: Mark Notification as Read (P1)
**As a** user,
**I want to** mark notifications as read,
**So that** the badge count reflects unread items only.

**Acceptance Criteria:**
- Clicking a notification marks it as read
- "Mark all as read" button
- Badge count updates immediately

---

## Epic 10: Admin Panel

### US-10.1: Admin Panel — Members Tab (P0)
**As a** group admin,
**I want** a members management tab,
**So that** I can manage group membership.

**Acceptance Criteria:**
- List of all members with: name, email, role badge (owner/admin/member), join date
- Actions: promote to admin (owner only), demote to member (owner only), remove member
- Pending approvals section with approve/reject buttons

### US-10.2: Admin Panel — Scenarios Tab (P1)
**As a** group admin,
**I want** a scenarios management tab,
**So that** I can review and manage custom scenarios.

**Acceptance Criteria:**
- List of pending custom scenarios with: title, options, suggested points, proposer name
- Approve (with optional point adjustment) / Reject buttons
- List of active scenarios with option to remove

### US-10.3: Admin Panel — Settings Tab (P1)
**As a** group admin,
**I want** a settings tab to manage group configuration,
**So that** I can adjust settings per match.

**Acceptance Criteria:**
- Group name edit
- Deadline override per match (date/time picker)
- Manual lock button (instantly locks predictions)
- Manual result entry form (for match results)

### US-10.4: Unified Admin Dashboard Across Groups (P2)
**As an** admin of multiple groups,
**I want** a single view showing pending approvals across all my groups,
**So that** I don't have to navigate into each group separately to manage requests.

**Acceptance Criteria:**
- Dashboard or dedicated admin page shows aggregated pending approvals: "3 pending in Office Gang, 1 pending in Family"
- One-click approve/reject from the unified view
- Also shows pending custom scenarios across groups
- Only shows groups where the user has admin/owner role

---

## Epic 11: UI/UX & Design System

### US-11.1: Stadium Nightscape Theme (P0)
**As a** user,
**I want** the app to have the dark "Stadium Nightscape" theme,
**So that** it looks and feels like a premium cricket experience.

**Acceptance Criteria:**
- All design tokens from the design system spec are implemented as CSS variables
- Dark-first: `--bg-deep` (#06080F) as body background
- Electric cyan (#00E5FF) as primary accent
- Amber gold (#FFB800) as secondary accent
- All semantic colors match the spec
- All team colors match the spec
- Root layout includes SEO metadata (title, description) and default OG image for social sharing
- Landing page (`/`) is SSR with full SEO metadata and OG tags

### US-11.2: Typography System (P0)
**As a** user,
**I want** the app to use the correct fonts for different content types,
**So that** the hierarchy is clear and the sports aesthetic is maintained.

**Acceptance Criteria:**
- Chakra Petch for headlines, nav, team names, scenario titles
- DM Sans for body text, descriptions, form labels
- JetBrains Mono for scores, points, percentages, countdowns
- Type scale matches the spec (H1=32px through Badge=10-11px)

### US-11.3: Mobile Responsive Design (P1)
**As a** mobile user watching a match,
**I want** the app to work perfectly on my phone,
**So that** I can predict and follow the leaderboard one-handed.

**Acceptance Criteria:**
- All screens work at 375px width
- Touch targets are thumb-friendly (minimum 44px)
- Bottom sticky bars are usable on mobile
- No horizontal scrolling required
- Cards stack vertically on mobile

### US-11.4: Empty States (P1)
**As a** user seeing a screen with no data,
**I want** a helpful empty state instead of a blank page,
**So that** I understand what to do next.

**Acceptance Criteria:**
- Dashboard (no groups): "Create your first group" hero + invite code input
- Group home (no members): "Share the invite link" + copy link CTA
- Group home (no predictions): "No predictions yet — be the first!"
- Prediction page (no custom scenarios): "No custom scenarios yet — propose one!"
- Match leaderboard (no predictions): "No predictions submitted for this match"
- Season standings (new group): "Season standings will appear after the first match"
- Admin pending (none): "No pending requests — all caught up!"

### US-11.5: Error States (P1)
**As a** user encountering an error,
**I want** helpful error messages with recovery options,
**So that** I can resolve issues without leaving the app.

**Acceptance Criteria:**
- API failure: "Playing XI not available yet" with retry button
- Magic link not received: "Check spam" + resend button (throttled)
- Prediction submit failure: inline error + retry, form state preserved
- Realtime disconnect: banner "Reconnecting..." (auto-reconnect)
- Stale data: "Last updated X min ago" footer

### US-11.6: Page Transitions & Animations (P2)
**As a** user,
**I want** smooth transitions and animations,
**So that** the app feels alive and responsive.

**Acceptance Criteria:**
- Next.js View Transitions for smooth route changes
- Leaderboard rows animate to new positions on rank change
- Scenario resolution: pill animates from ⏳ to ✅/❌ with scale-up pulse
- Score ticker: counter/odometer animation on number changes
- Card reveals: stagger with fade-in + translate-up (50ms increments)
- All interactive elements: `transition: all 0.15s ease`

### US-11.7: Loading / Skeleton States (P1)
**As a** user waiting for data to load,
**I want** skeleton placeholders instead of blank screens,
**So that** the app feels responsive even on slow connections.

**Acceptance Criteria:**
- Match card skeleton while loading match data
- Leaderboard skeleton while fetching rows
- Prediction form skeleton while scenarios load
- Dashboard group cards skeleton
- Skeletons match the component dimensions to avoid layout shift
- Use shadcn/ui `Skeleton` component

### US-11.8: Onboarding Experience (P1)
**As a** first-time user,
**I want** contextual guidance when I'm new to the app or a group,
**So that** I understand how to get started.

**Acceptance Criteria:**
- **New user, no groups (empty dashboard):** Hero message "Welcome to Bragg! Create a group and start earning bragging rights." + two CTAs (create group, enter invite code) + "How it works" 3-step explanation
- **New user via invite link (not logged in):** Shows group name + "You've been invited" + embedded login form; after auth, auto-redirect to pending/group home
- **First time in a group (approved, no predictions):** "Your first match is [Team A] vs [Team B]" banner + highlighted "Predict Now" CTA on the upcoming match card

---

## Epic 12: Legal & Compliance

### US-12.1: Privacy Policy Page (P1)
**As a** user,
**I want** to read the privacy policy,
**So that** I understand how my data is handled.

**Acceptance Criteria:**
- Accessible at `/privacy`
- Covers: data collected (name, email), storage (Supabase), purpose, deletion rights
- Public route (no auth required)

### US-12.2: Terms of Service Page (P1)
**As a** user,
**I want** to read the terms of service,
**So that** I understand the rules of the platform.

**Acceptance Criteria:**
- Accessible at `/terms`
- Covers: 18+ requirement, no real money, entertainment only, no BCCI/IPL affiliation, data accuracy disclaimer
- Public route (no auth required)

### US-12.3: Footer Disclaimer (P0)
**As a** system,
**I want** a disclaimer on every page,
**So that** we're legally protected from IPL/BCCI trademark claims.

**Acceptance Criteria:**
- "Not affiliated with BCCI, IPL, or any franchise" in footer on every page
- No official IPL logos, team logos, or player photos used
- Team badges are solid color circles with team code text only

---

## Epic 13: Sharing & Virality

### US-13.1: WhatsApp Share for Invite Link (P1)
**As a** group owner,
**I want to** share the invite link directly to WhatsApp,
**So that** I can easily invite friends.

**Acceptance Criteria:**
- WhatsApp share button next to copy link button
- Opens WhatsApp with pre-filled message: "Think you know cricket? Prove it. Join my group on Bragg! {invite_link}"
- Uses `whatsapp://send?text=...` deep link

### US-13.2: Shareable Leaderboard Image (P2)
**As a** group member after a match,
**I want to** share the leaderboard as an image,
**So that** I can brag on WhatsApp/Instagram.

**Acceptance Criteria:**
- "Share Results" button on post-match leaderboard
- Generates an image card (via html2canvas or similar)
- Image shows: match info, top 5 leaderboard, group name, app branding
- Download or share via WhatsApp/Instagram

### US-13.3: Streak Badges & Fun Stats (P2)
**As a** group member,
**I want** to see streak badges and fun stats on the leaderboard,
**So that** achievements feel rewarding and competitive.

**Acceptance Criteria:**
- Streak badges shown on leaderboard (e.g., "3 correct winners in a row")
- Computed from consecutive match results
- Visible on season standings and match leaderboard
- Examples: correct winner streak, prediction accuracy streak, participation streak

### US-13.4: Season Summary Card & Archive (P3)
**As a** group member at the end of IPL,
**I want** a season summary card for my group,
**So that** we can celebrate and share the results.

**Acceptance Criteria:**
- Generated when IPL season ends
- Shows: Season Champion, Most Accurate, Best Single Match, Bold Predictor, Consistency King, Participation Award
- Shareable as image for WhatsApp/Instagram stories
- Accessible from group home page after season ends
- **Season archive view:** Historical view of all predictions and results from the season, accessible after season ends

---

## Epic 14: Data Management

### US-14.1: Seed IPL Fixtures (P0)
**As a** system,
**I want** IPL 2026 fixtures pre-loaded in the database,
**So that** match cards and prediction pages work from day one.

**Acceptance Criteria:**
- At minimum, first 2 weeks of matches seeded (14+ matches)
- Each match has: match_number, team_a, team_b, date, time_ist, venue
- Team records (10 teams) in `teams` table with: code, name, short_name, color, text_on_color
- All matches start with status = `upcoming`

### US-14.2: Seed Player Squads (P1)
**As a** system,
**I want** player squads pre-loaded for all 10 teams,
**So that** player-pick dropdowns work.

**Acceptance Criteria:**
- ~25 players per team (full IPL squad) stored in `players` table
- Each player: name, team_code, role (Batsman/Bowler/All-Rounder/WK-Batsman), api_player_id
- Data sourced from CricketData.org `/match_squad` endpoint for early matches, or manually entered
- `match_squads` table populated with playing XI when available (30 min before match via cron)
- Prediction page player dropdowns show playing XI if available, else full squad
- Fallback: if no player data exists, player-pick scenarios show a free-text input

### US-14.3: Map API Match IDs (P1)
**As a** system,
**I want** CricketData.org match IDs mapped to our seeded matches,
**So that** the cron can fetch data for the correct matches.

**Acceptance Criteria:**
- `matches.api_match_id` populated for at least the first week of matches
- Mapping done by matching team names + dates from CricketData.org `/matches` or `/series_info` endpoint
- Can be done manually or via a mapping script

---

## Story Dependency Map

```
US-11.1/11.2 (Theme/Fonts) ─────────────────────────────────────┐
US-14.1 (Seed Fixtures) ────────────────────────────────────────┤
                                                                 │
US-1.1/1.2 (Auth) → US-1.3/1.4 (Session/Routes) ──────────────┤
                                                                 ▼
US-2.1 (Create Group) → US-2.2 (Share) → US-2.3 (Join) → US-2.4 (Approve)
                                                                 │
US-14.2 (Seed Squads) ─────────────────────────────────────────┤
                                                                 ▼
US-3.1/3.3 (Group Home) → US-4.1/4.2/4.3 (Predictions + Scenarios)
                                                                 │
                                      ┌──────────────────────────┤
                                      ▼                          ▼
                              US-6.1 (Manual Results)    US-5.1/5.4 (Leaderboard/Standings)
                                      │
                                      ▼
                              US-5.1 (Leaderboard scoring)

US-7.1/7.2 (API/Cron) → US-7.3 (Auto-lock) → US-6.3 (Auto-resolution) → US-5.2 (Live Leaderboard)
                                                                                    │
US-9.1/9.2 (Notifications) ◄───────────────────────────────────────────────────────┘
```

---

*Last updated: March 26, 2026*
