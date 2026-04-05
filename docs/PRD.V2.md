# Bragg — Product Requirements Document (V2)

## UI Screens

### Shared Components

#### Global Nav Bar (shown on all authenticated pages)

- App logo and name (links to dashboard)
- Notification bell with unread count badge
  - Opens a side panel (animates from left) with unread notifications
  - Each notification is clickable and redirects to the relevant page
  - Mark individual notification as read
  - Mark all notifications as read
  - Real-time notification updates via Supabase
- User menu (avatar with initials)
  - Opens a side panel (animates from left)
  - Navigation links to Dashboard and Profile page
  - Sign out option at the bottom

#### Destructive Action Confirmation

- All destructive actions require a type-to-confirm dialog
- Warning message shown explaining consequences
- User must type a specific value (shown as input placeholder) to enable the action:
  - Delete gang → type gang name (irreversible)
  - Delete account → type email address (irreversible)
  - Leave gang → type gang name (you will lose access; can rejoin with invite code)
  - Remove member → type member's display name (member is removed and grayed out in standings; data is preserved)

#### Global Footer (shown on all pages except standalone pages: Login, Onboarding, Accept Terms, 404, Error)

- Disclaimer text
- Link to Privacy Policy
- Link to Terms & Conditions

### Landing Page (`/`)

- Authenticated users redirected to dashboard
- **Hero Section**
  - App logo and name
  - CTA to create a gang (redirects to login if unauthenticated)
  - CTA to join a gang (redirects to login if unauthenticated)
- **How It Works Section**
  - Three-step explainer: form a gang, make predictions, compete on leaderboard
- **Prediction Preview Section**
  - Mock match card showing sample prediction scenarios with point values and options
- **CTA Section**
  - Repeated create gang and join gang CTAs
- Global Footer

### Login Page (`/login`)

- Email input for magic link authentication (no passwords)
- Send magic link button
- Confirmation state after sending: shows which email the link was sent to
- Resend magic link with cooldown
- Option to go back and use a different email
- Handles expired/failed magic link errors
- Supports redirect after authentication
- Disclaimer text

### Onboarding Page (`/onboarding`)

- Display name input (2–30 characters)
- Date of birth input with age verification (must be 18+)
- Terms of Service and Privacy Policy acceptance checkbox (with links)
- Submit to complete profile and redirect to dashboard
- Skipped automatically if user has already completed onboarding
- Redirects to login if unauthenticated

### Dashboard (`/dashboard`)

- Global Nav Bar
- Pending Invite Banner
  - Shows when user arrived via an invite link while logged out
  - Displays gang name with option to join or dismiss
  - Auto-expires after 24 hours
- Empty State (no gangs yet)
  - Create gang form (gang name input)
  - Join gang form (invite code input)
- Gangs List (has gangs)
  - Grid of gang cards showing gang name, member count, and user's role (admin/member)
  - Each card links to the gang page
  - Join gang form (invite code input)
  - Create new gang form
- Global Footer

### Join Page (`/join/[code]`)

- **Unauthenticated user**
  - App logo and name
  - Shows gang name they've been invited to
  - Login form (magic link) to sign in and join
  - Stores invite code in localStorage for post-login pickup
- **Authenticated user**
  - Global Nav Bar
  - Shows gang name they've been invited to
  - Join gang button
  - Handles states after action:
    - Auto-accept on → "You're in!" (joined immediately)
    - Auto-accept off → "Request sent, waiting for admin approval"
    - Already approved → redirects to gang page
    - Rejected → option to request again
    - Gang full → message that gang has reached max members
    - Blocked → message that user is not able to join this gang
- Global Footer

### Gang Page (`/group/[groupId]`)

- Global Nav Bar
- Gang header: gang name, member count (out of max)
- Invite actions: copy invite link, share/send invite (uses native share on mobile)
- Link to Season Standings page
- Link to Gang Settings (admin only)
- Pending join requests section (visible to admin only, shown below gang header)
- **Upcoming Matches**
  - Match cards showing teams, match number, date, time, venue
  - Prediction deadline displayed
  - CTA to predict for each match
  - Prediction status: shows which members have predicted (for the next match)
- **Live Matches**
  - Live scorecard with scores, overs, batting team (auto-polls for updates)
  - Current run rate
  - Last 6 balls breakdown
  - Both batsmen displayed with individual scores, on-strike batsman indicated
  - Current bowler
  - Current partnership
  - Predictions locked indicator
  - CTA to view match leaderboard
- **Recent Results**
  - Completed match cards with user's prediction summary (predicted count, correct count, points earned)
  - Each card links to the Match Leaderboard page
  - Results pending state
- **Member List / Leaderboard**
  - List of all members with display name, avatar initial, and role (admin/member)
  - Overall points displayed per member
  - Sorted by points (acts as season leaderboard)
- Leave gang option at the bottom (members only, not shown to admin)
- Global Footer

### Predict Page (`/group/[groupId]/predict/[matchId]`)

- Global Nav Bar
- Match header: match number, teams with badges, date, time, venue
- Prediction deadline or locked status indicator
- Last updated timestamp (if previously submitted)
- Scenarios grouped by match phase
- Each scenario card shows:
  - Scenario title and point value
  - Input picker for selecting an answer
  - "Picked" indicator when answered
- Sticky submit bar at bottom:
  - Progress counter (X/total picked)
  - Submit button to lock in predictions
  - Error and success feedback
- Before prediction window opens: shows message with exact opening time and link back to gang page
- Predictions disabled when locked (deadline passed or match live)
- Global Footer

### Match Leaderboard Page (`/group/[groupId]/match/[matchId]`)

- Global Nav Bar
- Match header: match number, teams, date, time, venue
- Live scorecard (auto-polls for updates during live matches): scores, overs, batting team, current run rate, last 6 balls, both batsmen with individual scores and on-strike indicator, current bowler, current partnership
- **Match Leaderboard**
  - Ranked list of members: rank, display name, correct/resolved count, predicted count, points
  - Current user highlighted
  - Empty state if no one has predicted
- **Prediction Reveal Table**
  - Matrix of all members' predictions per scenario
  - Shows correct/incorrect status per cell
  - Members ordered by leaderboard rank
  - Hidden until predictions lock (shows countdown placeholder before lock)
  - Auto-polls for updates during live matches
  - Empty states: solo gang (nudge to invite), no predictions
- Global Footer

### Season Standings Page (`/group/[groupId]/standings`)

- Global Nav Bar
- Season standings table:
  - Defaults to current active season (future: season selector dropdown)
  - Ranked list of members: rank, display name, total points, matches predicted, points per match average, accuracy percentage
  - Current user highlighted
  - Empty state if no predictions yet
- Global Footer

### Profile Page (`/profile`)

- Global Nav Bar
- **Profile Info**
  - Display name (editable)
  - Email address (read-only)
  - Date of birth (read-only)
- **Stats Overview** (computed on read from `v2_gang_season_standings`)
  - Total gangs joined
  - Total matches predicted
  - Overall accuracy percentage
  - Total points across all gangs
- **Account Actions**
  - Delete account
- Global Footer

### Accept Terms Page (`/accept-terms`)

- App logo and name
- Updated terms/privacy content (or links to full pages)
- Acceptance checkbox
- Submit button to accept and continue
- Blocking — cannot access app until accepted

### Gang Settings Page (`/group/[groupId]/settings`)

- Global Nav Bar
- Gang name (editable)
- Auto-accept join requests toggle
- Custom prediction deadline for current active season (relative minutes before match start, overrides default 45 min; future: per-season selector)
- Member management: list of members with option to remove or block
- Delete gang option
- Admin-only page (non-admin access redirects to gang page, checked at page level)
- Global Footer

### Privacy Policy Page (`/privacy`)

- Static content page with privacy policy text
- Global Footer

### Terms & Conditions Page (`/terms`)

- Static content page with terms and conditions text
- Global Footer

### Not Found Page (404)

- Standalone (no nav bar)
- "Page not found" message
- Link back to dashboard

### Error Page (500)

- Standalone (no nav bar)
- Generic error message
- Option to retry or go to dashboard

## Business Logic

### Authentication

- Magic link only (no passwords)
- User enters email → receives a magic link via email (expires in 1 hour)
- Resend cooldown: 60 seconds between requests
- Email rate limiting enforced by Supabase
- On clicking magic link: auth callback exchanges code for session
- Post-auth routing:
  - New user (not onboarded) → redirected to onboarding page
  - Existing user (onboarded) → redirected to dashboard (or original `redirectTo` destination)
- Onboarded status tracked via cookie for fast checks
- Sign out clears session and cookies, redirects to landing page
- Account deletion: soft-delete (marked in DB, data handling TBD)
- Redirect URLs sanitized to prevent open redirect attacks (must be relative paths)

### Onboarding

- Triggered after first-ever login (profile not yet completed)
- Required fields: display name (2–30 characters), date of birth, terms acceptance
- Age verification: must be 18 or older (validated client-side and server-side)
- Once completed, `onboarding_completed` flag is set on the profile
- Users who have already onboarded are automatically redirected to dashboard
- Post-onboarding redirect honours the original destination (e.g., join page) if one was stored
- Onboarded cookie (`bragg_onboarded`, 1 year max age):
  - Set on: auth callback (if already onboarded) and on completing onboarding
  - Cleared on: sign out and during auth callback if user hasn't onboarded (prevents stale cookie from previous user)
- `bragg_terms_version` cookie set during onboarding when user first accepts terms

### Terms & Privacy Re-Acceptance

- `CURRENT_TERMS_VERSION` constant in codebase (e.g., "2.0")
- `terms_version` field stored on user profile
- Cookie `bragg_terms_version` set on acceptance (avoids DB check on every request)
- Middleware compares major version of cookie value against major version of `CURRENT_TERMS_VERSION` — cookie check only, no DB call
- Major version change (e.g., 2.x → 3.0) → redirect to `/accept-terms` (blocking, cannot use app until accepted)
- Minor version change (e.g., 2.0 → 2.1) → allowed through, no re-acceptance required
- `/accept-terms` page updates DB + sets new cookie
- Cookie cleared on sign out (same as other auth cookies)

### Gangs

- **Creation**
  - Any authenticated user can create a gang (name: 3–50 characters)
  - Creator becomes an admin
  - Unique invite code generated automatically (6 characters, uppercase letters and numbers only)
  - Automatically enrolled in current active season (IPL 2026 for now; future: admin selects leagues/seasons)
- **Roles**
  - Admin: full control — approve/reject/remove members, manage gang settings
  - Member: can predict, view leaderboards
- **Invitations & Joining**
  - Invite link format: `/join/[code]` (shareable URL)
  - Copy link button (desktop) and native share (mobile)
  - Share message includes inviter name, gang name, and invite code
  - Join request requires admin approval by default
  - Auto-accept can be enabled from gang settings
  - Handles duplicate requests (already pending, already a member)
  - Previously rejected users can request again
  - If already a member → redirected to gang page
  - Unauthenticated invite flow:
    - Invite code + gang name stored in localStorage (expires after 24 hours)
    - User signs in/up → lands on dashboard → pending invite banner appears
    - User can accept or dismiss the banner
  - Notification sent to the admin when a join request is received
  - If auto-accept is enabled, admin gets a "X joined your gang" notification instead
- **Limits**
  - Max 20 members per gang (code constant)
  - Max 40 gangs per user (across created + joined)
- **Member Management** (admin only)
  - Approve or reject pending join requests
  - Remove members
  - Block members (blocked members cannot rejoin even with auto-accept)
- **Leaving & Deletion**
  - Members can voluntarily leave a gang (status set to `left`)
  - Admin cannot leave — must delete the gang
  - Left and removed members are grayed out in standings; their data (predictions, scores) is preserved
  - Left/removed members no longer appear in the active member list
  - Left members can rejoin with an invite code (unless blocked)
  - Deleting a gang soft-deletes it (marked as deleted in DB, details TBD)

### Matches

- **Statuses:** upcoming → live → completed → resolved (also: abandoned, no_result)
  - `completed`: match has ended per Sportmonks (`Finished`) but some scenarios (e.g., Player of the Match) may still be unresolved
  - `resolved`: all scenarios for the match have been resolved; polling stops
- **Home/Away vs batting order:** The home team does not always bat first. Team-specific scenarios (innings score, powerplay) must filter by `team_id` matching `localteam_id` or `visitorteam_id`, **not** by inning number.
- **Data source:** match schedule auto-imported from Sportmonks API via cron function
- **Live updates:**
  - Polled from cricket API and stored as live snapshot
  - Data stored: scores, overs, batting team, current run rate, last 6 balls, both batsmen with individual scores and on-strike indicator, current bowler, current partnership
  - Client auto-polls for updates on live match pages
- **Prediction window:**
  - Opens: 12 hours before match start time
  - Closes: 45 minutes before match start time (default, configurable per gang as relative minutes before match)
  - Scenarios automatically available when prediction window opens
- **Result resolution:**
  - Match results stored in `v2_fixture_results` (match winner, toss winner, etc.)
  - Triggers prediction resolution via DB function
  - Polling strategy:
    - Unified polling via `live-poll-resolve-fixtures` cron (every 15 seconds)
    - Uses fixture endpoint (`/fixtures/{id}?include=...`) for both `live` and `completed` states (`livescores` drops Finished fixtures, so fixture endpoint is the reliable source)
    - Continues polling until all scenarios are resolved or 120-minute cutoff is reached
  - Once all scenarios resolved, status changes to `resolved` and polling stops
  - `resolved_at` timestamp set on fixture results when all scenarios are resolved
  - **Fallback:** if 120 minutes pass after `completed` and some scenarios remain unresolved, system admin is notified and manually resolves the remaining scenarios (system admin flow — TBD in separate discussion)
  - Abandoned/no_result matches: `v2_fixture_results` row created with `resolved_at` set but `match_winner_id` null; all predictions voided (no points awarded or deducted)

### Scenarios

- **Types**
  - System scenarios only (auto-seeded per gang per match when prediction window opens)
- **Structure:**
  - Each scenario has: title, slug, input type, point value, resolution phase, options (for range type)
  - Point values: 5 (easy), 10 (medium), 15 (hard), 20 (hardest)
  - Input types: team pick, player pick, range, yes/no, number
  - {Home Team} and {Away Team} in titles are dynamically replaced with actual team names
- **Resolution:**
  - Runs as a periodic function while match is live
  - Continues until match is completed or all scenarios are resolved
  - Correct answer set on each scenario; predictions scored automatically
  - Scenarios can be soft-removed (not deleted)
- **Resolution phases:**
  - `toss` — after toss
  - `first_wicket` — when first wicket falls
  - `team_powerplay_end` — when a team's powerplay (first 6 overs) ends; resolves that team's powerplay scenarios
  - `mid_match` — during the match (can resolve as soon as condition is met)
  - `team_innings_end` — when a team's innings ends; resolves that team's innings scenarios
  - `end` — after match ends
  - `post_match` — after official awards (POTM)

#### System Scenario Definitions (20 scenarios total; 19 active + 1 inactive, max 220 active points)

Only active templates (`is_active = true`) are seeded into `v2_fixture_scenarios` during scenario seeding.

| # | Slug | Title | Input Type | Points | Resolution Phase | Options |
|---|------|-------|------------|--------|-----------------|---------|
| 1 | `toss_winner` | Who wins the toss? | team_pick | 5 | toss | — |
| 2 | `match_winner` | Who wins the match? | team_pick | 10 | end | — |
| 3 | `top_scorer` | Top run scorer of the match? | player_pick | 15 | end | — |
| 4 | `top_wicket_taker` | Top wicket-taker of the match? | player_pick | 15 | end | — |
| 5 | `most_sixes_player` | Who hits the most sixes? | player_pick | 15 | end | — |
| 6 | `player_of_match` | Player of the Match? | player_pick | 20 | post_match | — |
| 7 | `home_team_innings_score` | {Home Team} innings score? | range | 10 | team_innings_end | <140, 140-159, 160-179, 180-199, 200+ |
| 8 | `away_team_innings_score` | {Away Team} innings score? | range | 10 | team_innings_end | <140, 140-159, 160-179, 180-199, 200+ |
| 9 | `home_team_powerplay_runs` | {Home Team} powerplay runs? | range | 10 | team_powerplay_end | <30, 30-39, 40-49, 50-59, 60+ |
| 10 | `away_team_powerplay_runs` | {Away Team} powerplay runs? | range | 10 | team_powerplay_end | <30, 30-39, 40-49, 50-59, 60+ |
| 11 | `home_team_powerplay_wickets_lost` | {Home Team} powerplay wickets lost? | range | 10 | team_powerplay_end | 0, 1, 2, 3, 4+ |
| 12 | `away_team_powerplay_wickets_lost` | {Away Team} powerplay wickets lost? | range | 10 | team_powerplay_end | 0, 1, 2, 3, 4+ |
| 13 | `total_match_runs` | Total runs in the match? | range | 10 | end | <300, 300-339, 340-369, 370-399, 400+ |
| 14 | `total_match_sixes` | Total sixes in the match? | range | 10 | end | <10, 10-15, 16-20, 21-25, 26+ |
| 15 | `total_match_wickets` | Total wickets in the match? | range | 10 | end | <5, 5-8, 9-12, 13-15, 16+ |
| 16 | `total_match_catches` _(INACTIVE)_ | Total catches in the match? | range | 10 | end | <3, 3-5, 6-8, 9-11, 12+ |
| 17 | `first_wicket_over` | When does the first wicket fall? | range | 10 | first_wicket | 1, 2, 3, 4-5, 6+ |
| 18 | `fifty_scored` | Will anyone score 50+? | yes_no | 5 | mid_match | — |
| 19 | `bowler_three_wickets` | Will any bowler take 3+ wickets? | yes_no | 15 | mid_match | — |
| 20 | `super_over` | Will there be a super over? | yes_no | 10 | end | — |

#### Scenario Resolution Mapping (Sportmonks API)

All data available via single call: `GET /fixtures/{id}?include=batting,bowling,runs,manofmatch`

| # | Slug | API Source | Resolution Method |
|---|------|-----------|-------------------|
| 1 | `toss_winner` | Fixture: `toss_won_team_id` | Direct field. Map to internal team UUID via `v2_league_teams.api_id`. Available even when match status is `NS` — resolve as soon as field is populated (don't wait for `1st Innings` status). |
| 2 | `match_winner` | Fixture: `winner_team_id` | Direct field. Map to internal team UUID via `v2_league_teams.api_id`. |
| 3 | `top_scorer` | Batting include: `player_id`, `score` | Find max `score` across all batting entries (both innings). Map `player_id` to internal UUID via `v2_players.api_id`. Tiebreaker: fewer balls faced (`ball` field). |
| 4 | `top_wicket_taker` | Bowling include: `player_id`, `wickets` | Find max `wickets` across all bowling entries (both innings). Map `player_id` to internal UUID via `v2_players.api_id`. Tiebreaker: fewer runs conceded. |
| 5 | `most_sixes_player` | Batting include: `player_id`, `six_x` | Sum `six_x` per player across both innings. Find max. Map `player_id` to internal UUID. Tiebreaker: fewer balls faced. |
| 6 | `player_of_match` | Fixture: `man_of_match_id` | Direct field. Map to internal UUID via `v2_players.api_id`. |
| 7 | `home_team_innings_score` | Runs include: `score` where `team_id` = home team | Direct field from runs. Map raw score to bracket option. |
| 8 | `away_team_innings_score` | Runs include: `score` where `team_id` = away team | Direct field from runs. Map raw score to bracket option. |
| 9 | `home_team_powerplay_runs` | Live score capture | Captured during live polling (15s interval). Track `max(overs)` seen so far per team (defensive against cache anomalies where API returns non-monotonic values). Snapshot score+wickets when max first crosses 6.0. Stored in `v2_fixture_results`. Not available post-match from API. |
| 10 | `away_team_powerplay_runs` | Live score capture | Same as #9, for away team. |
| 11 | `home_team_powerplay_wickets_lost` | Live score capture | Captured during live polling when home team overs cross 6.0 — count wickets at that point. Stored in `v2_fixture_results`. |
| 12 | `away_team_powerplay_wickets_lost` | Live score capture | Same as #11, for away team. |
| 13 | `total_match_runs` | Runs include: `score` (all entries) | Sum `score` from all innings. Map to bracket option. |
| 14 | `total_match_sixes` | Batting include: `six_x` (all entries) | Sum `six_x` across all batting entries (both teams, both innings). Map to bracket. |
| 15 | `total_match_wickets` | Runs include: `wickets` (all entries) | Sum `wickets` from all innings. Map to bracket. |
| 16 | `total_match_catches` | **INACTIVE** — template marked `is_active = false`, not seeded to fixtures. Will be enabled once `wicket_id` mapping is available to distinguish catches from stumpings. | Count batting entries where `catch_stump_player_id` is not null (currently includes stumpings). |
| 17 | `first_wicket_over` | Batting include: `fow_balls` | Find minimum `fow_balls` across all batting entries in the first innings (where `fow_balls > 0`). Convert to over number: `floor(fow_balls) + 1` (e.g., 2.6 → over 3). Map to bracket. |
| 18 | `fifty_scored` | Batting include: `score` | Check if any batting entry has `score >= 50`. Boolean result. |
| 19 | `bowler_three_wickets` | Bowling include: `wickets` | Check if any bowling entry has `wickets >= 3`. Boolean result. |
| 20 | `super_over` | Fixture: `super_over` | Direct boolean field. |

### Predictions

- **Submission**
  - User selects answers for scenarios and submits all at once (batch upsert)
  - Can update predictions multiple times before the deadline (last submission wins)
  - Must pick at least one scenario to submit
  - Timestamp recorded on each submission
- **Validation**
  - User must be an approved member of the gang
  - Match must be in "upcoming" status
  - Prediction window must be open (12h before to configurable minutes before match)
  - Scenarios must belong to the correct gang + match
- **Visibility**
  - Before deadline: only the user can see their own predictions
  - After deadline: all gang members' predictions visible (prediction reveal table)
  - Who has predicted (but not what) is visible to all gang members before deadline
- **Scoring**
  - Binary: correct = full points, incorrect = 0 (no partial credit)
  - Points per scenario defined on the scenario (5–20 points)
  - Resolved automatically when scenario resolution runs during/after match
  - Each prediction gets `is_correct` flag and `points_earned` set on resolution
  - Abandoned/no_result matches: predictions voided, don't count toward leaderboards

### Scoring & Leaderboards

- **Match Leaderboard** (per gang, per match)
  - Ranked by: total points earned in that match
  - Tiebreaker: whoever's final submission was earliest wins (rewards committing to picks early)
  - Shows: rank, display name, correct/resolved count, predicted count, points
  - Current user highlighted
  - Materialized in `v2_gang_fixture_standings` — updated on prediction submit and scenario resolution
- **Season Standings** (per gang, across all matches)
  - Ranked by: total cumulative points → accuracy percentage → matches predicted (tiebreakers in order)
  - Shows: rank, display name, total points, matches predicted, points per match average, accuracy percentage
  - Current user highlighted
  - Materialized in `v2_gang_season_standings` — updated on scenario resolution
- **Scoring rules**
  - Binary scoring: correct = scenario's point value, incorrect = 0
  - No partial credit
  - Points only count for resolved scenarios (unresolved scenarios don't affect rankings)
- **Rank computation**
  - Uses SQL `RANK()` window function (ties share rank; next rank skips — e.g., 1, 2, 2, 4)
  - Match rank ORDER BY: active members first, then `points_earned DESC`, then `last_submitted_at ASC`
  - Season rank ORDER BY: active members first, then `total_points DESC`, then `accuracy_pct DESC`, then `matches_predicted DESC`
  - Left/removed members are always sorted to the bottom regardless of their points (grayed out in UI)
  - Triggered automatically on prediction submission and scenario resolution via Postgres triggers
  - Scope: only the affected (gang_id, fixture_id) or (gang_id, season_id) is recalculated

### Notifications _(TODO: revisit triggers and delivery)_

- **Delivery**
  - In-app only (no email/push)
  - Real-time updates via Supabase Realtime
  - Shown in notification bell side panel
  - Each notification has: type, message, read/unread status, optional gang/match reference
- **Actions**
  - Mark individual notification as read
  - Mark all as read
  - Clicking a notification navigates to the relevant page (gang or match)
- **Triggers:**
  - Join request received (sent to the admin)
  - Join request approved/rejected (sent to requester)
  - Prediction deadline approaching (sent to members who haven't predicted)
  - Match results available (sent to gang members)
- **Limits**
  - Fetches latest 20 notifications

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui components
- **Backend:** Next.js Server Actions, Supabase Edge Functions
- **Database:** Supabase Postgres (with materialized tables, RPC functions, RLS)
- **Auth:** Supabase Auth (magic link OTP)
- **Realtime:** Supabase Realtime (notifications)
- **Cricket Data:** Sportmonks API
- **Hosting:** Vercel
- **Analytics:** PostHog
- **Icons:** Lucide React

## Analytics

- **Provider:** PostHog
- **Pageviews & Sessions:** PostHog autocapture (pageviews, session recording, funnels defined in dashboard)
- **Custom events tracked:**
  - **Auth:** magic link requested, magic link resent, callback success/failure, onboarding completed, signed out, account deleted
  - **Gangs:** created, join requested, invite copied, invite shared, member approved/rejected, member removed, member left, gang deleted
  - **Predictions:** submitted, pick changed, predict page viewed/revisited
  - **Notifications:** bell opened, marked read, all cleared
  - **Performance:** Web Vitals (LCP, INP, CLS), page load time, server action duration
- **Error Reporting:**
  - All client-side errors captured (error boundaries, unhandled errors)
  - All Next.js server action errors captured
  - All Supabase Edge Function errors captured
  - All errors sent to PostHog with context (user ID, page, action, stack trace)
- **Identity:** users identified by Supabase user ID; pre-auth events use hashed email (no PII leak)

## Non-Functional Requirements

- **Mobile-first:** designed for mobile, responsive up to desktop
- **Browser support:** modern evergreen browsers (Chrome, Safari, Firefox, Edge)
- **Performance:**
  - Pages should load under 2 seconds on 4G
  - Web Vitals targets: LCP < 2.5s, INP < 200ms, CLS < 0.1
  - Live score polling interval: 15 seconds during live matches (required for precise powerplay capture)
- **Accessibility:** semantic HTML, ARIA labels, keyboard navigable
- **SEO:** meta tags and Open Graph on public pages (landing, join invite)
- **Offline:** no offline support required (online-only app)
- **Localization:** English only. All times displayed in user's local timezone with timezone abbreviation shown after the time.
- **Age restriction:** 18+ only (enforced at onboarding)
- **Gambling disclaimer:** visible on landing, login, and join pages — no real money, no betting

## Security

- **Authentication:**
  - All authenticated routes protected via middleware (redirects to login if no session)
  - Supabase session tokens managed via HTTP-only cookies
- **Authorization:**
  - Row-Level Security (RLS) on all Supabase tables — users can only access data they're authorized for
  - Server actions verify auth + membership + role before any mutation
  - Predictions only visible to the user before deadline; visible to gang after deadline (RLS enforced)
- **Input validation:**
  - All server actions validate input via Zod schemas
  - Client-side validation for immediate feedback, server-side as source of truth
- **Redirect protection:**
  - `redirectTo` params sanitized to relative paths only (prevents open redirect attacks)
- **Rate limiting:**
  - Magic link: 60-second cooldown + Supabase email rate limits
- **Data privacy:**
  - No passwords stored (magic link auth)
  - Analytics use hashed identifiers for pre-auth events (no PII leak)
  - Date of birth stored but never displayed publicly
- **CSRF:** protected by Supabase's built-in token handling
- **XSS:** React's default escaping + no `dangerouslySetInnerHTML` usage

## Database Schema

All tables prefixed with `v2_`. Hierarchy: Sport → League → Season → Match.

### `v2_sports` — Sport definitions

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID, PK | |
| `api_id` | TEXT, NOT NULL, UNIQUE | Data provider identifier |
| `name` | TEXT, NOT NULL, UNIQUE | e.g., "Cricket" |
| `code` | TEXT, NOT NULL, UNIQUE | URL-friendly slug |
| `is_active` | BOOLEAN, default true | |
| `created_at` | TIMESTAMPTZ, default now() | |

### `v2_leagues` — Leagues within a sport

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID, PK | |
| `api_id` | TEXT, NOT NULL, UNIQUE | Data provider identifier |
| `sport_id` | UUID, FK → v2_sports | |
| `name` | TEXT, NOT NULL | e.g., "Indian Premier League" |
| `code` | TEXT, NOT NULL, UNIQUE | URL-friendly slug |
| `is_active` | BOOLEAN, default true | |
| `created_at` | TIMESTAMPTZ, default now() | |

### `v2_seasons` — Season/edition of a league

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID, PK | |
| `api_id` | TEXT, NOT NULL, UNIQUE | Data provider identifier |
| `league_id` | UUID, FK → v2_leagues | |
| `name` | TEXT, NOT NULL | e.g., "IPL 2026" |
| `year` | INT, NOT NULL | |
| `start_date` | DATE | Season start |
| `end_date` | DATE | Season end |
| `is_active` | BOOLEAN, default true | Current season flag |
| `created_at` | TIMESTAMPTZ, default now() | |

**Unique constraint:** (league_id, year)

### `v2_profiles` — User accounts

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID, PK | References `auth.users(id)`, cascade delete |
| `display_name` | TEXT, NOT NULL | 2–30 characters |
| `email` | TEXT, NOT NULL | From auth |
| `date_of_birth` | DATE, NOT NULL | Age verification (18+) |
| `terms_version` | TEXT | Version of terms accepted (e.g., "2.0") |
| `terms_accepted_at` | TIMESTAMPTZ, nullable | When terms were last accepted |
| `onboarding_completed` | BOOLEAN, default false | Gate for onboarding flow |
| `is_deleted` | BOOLEAN, default false | Soft-delete for account deletion |
| `deleted_at` | TIMESTAMPTZ, nullable | When account was deleted |
| `created_at` | TIMESTAMPTZ, default now() | |

### `v2_gangs` — User-created groups

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID, PK | |
| `name` | TEXT, NOT NULL | 3–50 characters |
| `invite_code` | TEXT, NOT NULL, UNIQUE | 6 chars, uppercase + numbers |
| `created_by` | UUID, FK → v2_profiles | The admin |
| `auto_accept` | BOOLEAN, default false | Auto-accept join requests |
| `is_deleted` | BOOLEAN, default false | Soft-delete |
| `deleted_at` | TIMESTAMPTZ, nullable | |
| `created_at` | TIMESTAMPTZ, default now() | |

### `v2_gang_members` — Gang membership

| Column | Type | Notes |
|--------|------|-------|
| `gang_id` | UUID, FK → v2_gangs | |
| `user_id` | UUID, FK → v2_profiles | |
| `role` | ENUM('admin', 'member'), default 'member' | |
| `status` | ENUM('pending', 'approved', 'rejected', 'removed', 'left'), default 'pending' | |
| `is_blocked` | BOOLEAN, default false | Blocked members cannot rejoin even with auto-accept |
| `joined_at` | TIMESTAMPTZ, default now() | |
| `approved_at` | TIMESTAMPTZ, nullable | |
| `departed_at` | TIMESTAMPTZ, nullable | When member left or was removed |
| **PK** | (gang_id, user_id) | |

### `v2_gang_league_seasons` — Gang enrolled in a league season (with settings)

| Column | Type | Notes |
|--------|------|-------|
| `gang_id` | UUID, FK → v2_gangs | |
| `league_id` | UUID, FK → v2_leagues | |
| `season_id` | UUID, FK → v2_seasons | |
| `prediction_deadline_mins` | INT, default 45 | Minutes before match to close predictions |
| `is_active` | BOOLEAN, default true | Gang participating in this season |
| `created_at` | TIMESTAMPTZ, default now() | |
| **PK** | (gang_id, league_id, season_id) | |

### `v2_league_teams` — Teams within a league

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID, PK | |
| `api_id` | TEXT, NOT NULL, UNIQUE | Data provider identifier |
| `league_id` | UUID, FK → v2_leagues | Team belongs to a league |
| `name` | TEXT, NOT NULL | e.g., "Chennai Super Kings" |
| `code` | TEXT, NOT NULL | e.g., "CSK" |
| `color` | TEXT, NOT NULL | Hex color for UI |
| `logo_url` | TEXT, nullable | Team logo |
| `is_active` | BOOLEAN, default true | |
| `created_at` | TIMESTAMPTZ, default now() | |

**Unique constraint:** (league_id, code)

### `v2_league_season_fixtures` — Match schedule

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID, PK | |
| `api_id` | TEXT, NOT NULL, UNIQUE | Data provider identifier |
| `league_id` | UUID, FK → v2_leagues | |
| `season_id` | UUID, FK → v2_seasons | |
| `match_number` | INT, NOT NULL | Match number in the season |
| `home_team_id` | UUID, FK → v2_league_teams | |
| `away_team_id` | UUID, FK → v2_league_teams | |
| `start_datetime` | TIMESTAMPTZ, NOT NULL | Match start time with timezone |
| `venue_id` | UUID, nullable | Future use (FK to venues table) |
| `venue_name` | TEXT, NOT NULL | e.g., "M. Chinnaswamy Stadium, Bengaluru" |
| `status` | ENUM('upcoming', 'live', 'completed', 'resolved', 'abandoned', 'no_result'), default 'upcoming' | |
| `pre_match_synced` | BOOLEAN, default false | Set to true after pre-match delta sync runs; reset by daily sync if fixture is rescheduled |
| `created_at` | TIMESTAMPTZ, default now() | |

**Unique constraint:** (season_id, match_number)

### `v2_fixture_results` — Resolved match stats

| Column | Type | Notes |
|--------|------|-------|
| `fixture_id` | UUID, PK, FK → v2_league_season_fixtures | One-to-one |
| `toss_winner_id` | UUID, FK → v2_league_teams, nullable | |
| `match_winner_id` | UUID, FK → v2_league_teams, nullable | |
| `top_scorer_id` | UUID, FK → v2_players, nullable | |
| `top_wicket_taker_id` | UUID, FK → v2_players, nullable | |
| `most_sixes_player_id` | UUID, FK → v2_players, nullable | |
| `player_of_match_id` | UUID, FK → v2_players, nullable | |
| `home_team_innings_score` | INT, nullable | |
| `away_team_innings_score` | INT, nullable | |
| `home_team_powerplay_runs` | INT, nullable | |
| `away_team_powerplay_runs` | INT, nullable | |
| `home_team_powerplay_wickets_lost` | INT, nullable | |
| `away_team_powerplay_wickets_lost` | INT, nullable | |
| `total_match_runs` | INT, nullable | |
| `total_match_sixes` | INT, nullable | |
| `total_match_wickets` | INT, nullable | |
| `total_match_catches` | INT, nullable | |
| `first_wicket_over` | INT, nullable | |
| `fifty_scored` | BOOLEAN, nullable | |
| `bowler_three_wickets` | BOOLEAN, nullable | |
| `super_over` | BOOLEAN, nullable | |
| `resolved_at` | TIMESTAMPTZ, nullable | When results were finalized |
| `created_at` | TIMESTAMPTZ, default now() | |

### `v2_fixture_live_scores` — Live scorecard data

| Column | Type | Notes |
|--------|------|-------|
| `fixture_id` | UUID, PK, FK → v2_league_season_fixtures | One-to-one with fixture |
| `home_team_score` | TEXT, nullable | e.g., "185/4" |
| `away_team_score` | TEXT, nullable | |
| `home_team_overs` | DECIMAL(4,1), nullable | e.g., 18.3 |
| `away_team_overs` | DECIMAL(4,1), nullable | |
| `batting_team_id` | UUID, FK → v2_league_teams, nullable | Currently batting |
| `current_run_rate` | DECIMAL(4,2), nullable | |
| `last_6_balls` | TEXT, nullable | e.g., "1 4 W 0 6 2" |
| `striker_name` | TEXT, nullable | |
| `striker_score` | TEXT, nullable | e.g., "45(32)" |
| `non_striker_name` | TEXT, nullable | |
| `non_striker_score` | TEXT, nullable | |
| `current_bowler` | TEXT, nullable | |
| `current_partnership` | TEXT, nullable | e.g., "78(52)" |
| `raw_scorecard_json` | JSONB, nullable | Full API response for reference |
| `last_polled_at` | TIMESTAMPTZ, nullable | When last updated from API |
| `updated_at` | TIMESTAMPTZ, default now() | |

### `v2_scenario_templates` — System scenario definitions (reference table)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID, PK | |
| `sport_id` | UUID, FK → v2_sports | Templates are sport-specific |
| `slug` | TEXT, NOT NULL, UNIQUE | e.g., "match_winner" |
| `title` | TEXT, NOT NULL | Display title (with {Home Team}/{Away Team} placeholders) |
| `input_type` | ENUM('team_pick', 'player_pick', 'range', 'yes_no', 'number') | |
| `options` | JSONB, nullable | Bracket options for range type |
| `points` | INT, NOT NULL | Default points |
| `resolution_phase` | TEXT, NOT NULL | When this resolves |
| `is_active` | BOOLEAN, default true | |
| `created_at` | TIMESTAMPTZ, default now() | |

### `v2_fixture_scenarios` — Prediction questions for a fixture (seeded from templates)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID, PK | |
| `template_id` | UUID, FK → v2_scenario_templates, nullable | Source template |
| `league_id` | UUID, FK → v2_leagues | For future league-level predictions |
| `season_id` | UUID, FK → v2_seasons | Denormalized for season-level queries |
| `fixture_id` | UUID, FK → v2_league_season_fixtures | Which match |
| `gang_id` | UUID, FK → v2_gangs | Scenarios are per gang per fixture |
| `type` | ENUM('system'), default 'system' | System only for now |
| `slug` | TEXT, nullable | Copied from template on seeding |
| `title` | TEXT, NOT NULL | Copied from template, placeholders replaced with team names |
| `input_type` | ENUM('team_pick', 'player_pick', 'range', 'yes_no', 'number') | Copied from template |
| `options` | JSONB, nullable | Copied from template |
| `range_min` | INT, nullable | Min value for number input |
| `range_max` | INT, nullable | Max value for number input |
| `points` | INT, NOT NULL | Copied from template |
| `resolution_phase` | TEXT, nullable | Copied from template |
| `correct_answer` | TEXT, nullable | Set when resolved |
| `is_resolved` | BOOLEAN, default false | |
| `is_removed` | BOOLEAN, default false | Soft-delete |
| `created_at` | TIMESTAMPTZ, default now() | |

**Unique constraint:** (gang_id, fixture_id, slug) WHERE slug IS NOT NULL

Seeding copies template values into scenarios. Existing matches keep their original values even if templates are updated later.

### `v2_predictions` — User predictions for scenarios

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID, PK | |
| `user_id` | UUID, FK → v2_profiles | |
| `scenario_id` | UUID, FK → v2_fixture_scenarios | |
| `gang_id` | UUID, FK → v2_gangs | Denormalized for faster queries |
| `league_id` | UUID, FK → v2_leagues | Denormalized for faster queries |
| `season_id` | UUID, FK → v2_seasons | Denormalized for faster queries |
| `fixture_id` | UUID, FK → v2_league_season_fixtures | Denormalized for faster queries |
| `value` | TEXT, NOT NULL | The user's prediction |
| `is_correct` | BOOLEAN, nullable | NULL while unresolved |
| `points_earned` | INT, default 0 | |
| `submitted_at` | TIMESTAMPTZ, default now() | Last submission time (updates on re-submission) |
| `created_at` | TIMESTAMPTZ, default now() | First submission time |

**Unique constraint:** (user_id, scenario_id)

### `v2_players` — Player database

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID, PK | |
| `api_id` | TEXT, NOT NULL, UNIQUE | Data provider identifier |
| `name` | TEXT, NOT NULL | Full name |
| `role` | TEXT, nullable | e.g., "batsman", "bowler", "all-rounder", "wicket-keeper" |
| `batting_style` | TEXT, nullable | |
| `bowling_style` | TEXT, nullable | |
| `is_active` | BOOLEAN, default true | |
| `created_at` | TIMESTAMPTZ, default now() | |

### `v2_fixture_squads` — Playing squad for each fixture

| Column | Type | Notes |
|--------|------|-------|
| `fixture_id` | UUID, FK → v2_league_season_fixtures | |
| `player_id` | UUID, FK → v2_players | |
| `team_id` | UUID, FK → v2_league_teams | Which team the player is in for this fixture |
| `is_playing_xi` | BOOLEAN, default false | Playing XI vs bench |
| `created_at` | TIMESTAMPTZ, default now() | |
| **PK** | (fixture_id, player_id) | |

### `v2_gang_fixture_standings` — Match leaderboard per gang (materialized)

| Column | Type | Notes |
|--------|------|-------|
| `gang_id` | UUID, FK → v2_gangs | |
| `season_id` | UUID, FK → v2_seasons | Denormalized for season-level queries |
| `fixture_id` | UUID, FK → v2_league_season_fixtures | |
| `user_id` | UUID, FK → v2_profiles | |
| `predicted_count` | INT, default 0 | Number of predictions submitted |
| `resolved_count` | INT, default 0 | Number of predictions resolved |
| `correct_count` | INT, default 0 | Number correct |
| `points_earned` | INT, default 0 | Total points for this match |
| `last_submitted_at` | TIMESTAMPTZ | Latest submission time (for tiebreaker) |
| `rank` | INT, nullable | Computed on resolution |
| `updated_at` | TIMESTAMPTZ, default now() | |
| **PK** | (gang_id, fixture_id, user_id) | |

### `v2_gang_season_standings` — Season leaderboard per gang (materialized)

| Column | Type | Notes |
|--------|------|-------|
| `gang_id` | UUID, FK → v2_gangs | |
| `season_id` | UUID, FK → v2_seasons | |
| `user_id` | UUID, FK → v2_profiles | |
| `matches_predicted` | INT, default 0 | Number of fixtures predicted |
| `total_points` | INT, default 0 | Cumulative points |
| `total_correct` | INT, default 0 | Total correct predictions |
| `total_resolved` | INT, default 0 | Total resolved predictions |
| `accuracy_pct` | DECIMAL(5,2), default 0 | Percentage correct |
| `points_per_match` | DECIMAL(5,2), default 0 | Average points per match |
| `rank` | INT, nullable | Computed by: points → accuracy → matches predicted |
| `updated_at` | TIMESTAMPTZ, default now() | |
| **PK** | (gang_id, season_id, user_id) | |

### `v2_notifications` — User notifications

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID, PK | |
| `user_id` | UUID, FK → v2_profiles | Recipient |
| `type` | TEXT, NOT NULL | e.g., "join_request", "join_approved", "deadline_reminder", "results_available" |
| `message` | TEXT, NOT NULL | Display text |
| `gang_id` | UUID, FK → v2_gangs, nullable | Related gang |
| `fixture_id` | UUID, FK → v2_league_season_fixtures, nullable | Related fixture |
| `is_read` | BOOLEAN, default false | |
| `created_at` | TIMESTAMPTZ, default now() | |

### Database Indexes

| Table | Index | Columns |
|-------|-------|---------|
| `v2_profiles` | `idx_profiles_email` | `(email)` |
| `v2_gangs` | `idx_gangs_created_by` | `(created_by)` |
| `v2_gangs` | `idx_gangs_deleted` | `(is_deleted)` |
| `v2_gang_members` | `idx_gang_members_status` | `(gang_id, status)` |
| `v2_gang_members` | `idx_gang_members_user` | `(user_id, status)` |
| `v2_gang_league_seasons` | `idx_gang_league_seasons_season` | `(season_id)` |
| `v2_league_season_fixtures` | `idx_fixtures_season_status` | `(season_id, status, start_datetime)` |
| `v2_fixture_scenarios` | `idx_scenarios_gang_fixture` | `(gang_id, fixture_id)` |
| `v2_fixture_scenarios` | `idx_scenarios_gang_season` | `(gang_id, season_id)` |
| `v2_predictions` | `idx_predictions_gang_fixture_user` | `(gang_id, fixture_id, user_id)` |
| `v2_predictions` | `idx_predictions_scenario` | `(scenario_id)` |
| `v2_predictions` | `idx_predictions_gang_season_user` | `(gang_id, season_id, user_id)` |
| `v2_gang_fixture_standings` | `idx_fixture_standings_season` | `(gang_id, season_id)` |
| `v2_gang_season_standings` | `idx_season_standings_user` | `(user_id)` |
| `v2_notifications` | `idx_notifications_user` | `(user_id, is_read, created_at)` |

### Row-Level Security (RLS) Policies

All tables have RLS enabled. System operations (cron, edge functions) use service role key to bypass RLS.

Helper functions (SECURITY DEFINER):
- `is_gang_member(gang_id, user_id)` — returns true if user is an approved member of the gang
- `is_gang_admin(gang_id, user_id)` — returns true if user is the admin of the gang
- `get_gang_by_invite_code(code)` — looks up gang by invite code, bypasses RLS (needed for Join Page before membership)
- `get_members_who_predicted(gang_id, fixture_id)` — returns user_ids only, no prediction values (visible to all gang members before deadline)
- `prediction_deadline(fixture_id, gang_id)` — computes deadline from `start_datetime` minus `prediction_deadline_mins`, used in prediction RLS policies

#### Reference tables (public read, no user writes)

`v2_sports`, `v2_leagues`, `v2_seasons`, `v2_league_teams`, `v2_players`, `v2_fixture_squads`, `v2_league_season_fixtures`, `v2_fixture_results`, `v2_fixture_live_scores`, `v2_scenario_templates`

- SELECT: all authenticated users
- INSERT/UPDATE/DELETE: none (system only via service role)

#### `v2_profiles`

| Operation | Policy |
|-----------|--------|
| SELECT | Own profile always. Others visible if in same gang (approved members). |
| INSERT | None (created by auth trigger) |
| UPDATE | Own profile only |
| DELETE | None (soft-delete via update) |

#### `v2_gangs`

| Operation | Policy |
|-----------|--------|
| SELECT | Approved gang members only. Filter out `is_deleted = true`. |
| INSERT | Any authenticated user |
| UPDATE | Admin only (name, auto_accept, soft-delete) |
| DELETE | None (soft-delete via update) |

#### `v2_gang_members`

| Operation | Policy |
|-----------|--------|
| SELECT | Approved members see other approved members. Admins see all statuses (for member management). Users see own row regardless of status. |
| INSERT | Any authenticated user (own row only, as pending) |
| UPDATE | Admin can update others (approve/reject/remove/block). User can update own (leave). |
| DELETE | None (status changes only) |

#### `v2_gang_league_seasons`

| Operation | Policy |
|-----------|--------|
| SELECT | Approved gang members |
| INSERT | None (system-created on gang creation) |
| UPDATE | Admin only (prediction_deadline_mins) |
| DELETE | None |

#### `v2_fixture_scenarios`

| Operation | Policy |
|-----------|--------|
| SELECT | Approved gang members. Filter out `is_removed = true`. |
| INSERT/UPDATE/DELETE | None (system only) |

#### `v2_predictions`

| Operation | Policy |
|-----------|--------|
| SELECT | Before deadline: own only. After deadline/match live/completed: all approved gang members. |
| INSERT | Approved gang members, own user_id, before deadline, match status = 'upcoming'. Prediction window open time (12h before) enforced at server action level, not RLS. |
| UPDATE | Same as INSERT (own predictions before deadline) |
| DELETE | None |

Deadline check uses `prediction_deadline(fixture_id, gang_id)` helper function.

#### `v2_gang_fixture_standings`

| Operation | Policy |
|-----------|--------|
| SELECT | Approved gang members |
| INSERT/UPDATE/DELETE | None (system-managed) |

#### `v2_gang_season_standings`

| Operation | Policy |
|-----------|--------|
| SELECT | Approved gang members |
| INSERT/UPDATE/DELETE | None (system-managed) |

#### `v2_notifications`

| Operation | Policy |
|-----------|--------|
| SELECT | Own only |
| UPDATE | Own only (mark as read) |
| INSERT/DELETE | None (system only) |

#### Supabase Realtime

Enabled on: `v2_notifications` only. Live scores use client polling, not realtime.

## Cron Functions

### `sync-fixtures` — Daily fixture and player sync

- **Schedule:** Once a day at 5 AM IST
- **Purpose:** Import match schedule and player rosters from Sportmonks for the current active season
- **Action:**
  - Fetch fixtures for current active season from Sportmonks (`/fixtures?filter[season_id]={id}`)
  - Upsert `v2_league_teams` for any new/updated teams (match by `api_id`)
  - Upsert `v2_league_season_fixtures` (match by `api_id`); silently updates existing fixtures including `start_datetime` changes
  - Reset `pre_match_synced = false` if `start_datetime` changes for a future fixture
  - For each unique team, fetch `/teams/{id}/squad/{season_id}` → upsert players into `v2_players` (match by `api_id`)
- **Writes to:** `v2_league_season_fixtures`, `v2_league_teams`, `v2_players`
- **Assumptions:**
  - `v2_sports`, `v2_leagues`, `v2_seasons` already exist (created manually via admin dashboard for new seasons)

### `sync-fixtures-pre-match` — Pre-match delta sync

- **Schedule:** Every 15 minutes
- **Purpose:** Catch last-minute timing changes before a match starts
- **Action:**
  - Find fixtures where `start_datetime` is within the next 15–30 minutes AND `pre_match_synced = false`
  - For each → fetch the specific fixture from Sportmonks → update `start_datetime` if changed → set `pre_match_synced = true`
- **Writes to:** `v2_league_season_fixtures`
- **Future enhancement:** Send notification to members if `start_datetime` changes

### `seed-scenarios` — Scenario seeding per gang per fixture

- **Schedule:** Every 30 minutes
- **Purpose:** Create `v2_fixture_scenarios` rows for every active gang enrolled in a season, for upcoming fixtures
- **Action:**
  - Find fixtures where `start_datetime - 14 hours <= now()` AND `start_datetime > now()` AND `status = 'upcoming'`
  - For each fixture → find all active gangs enrolled in the fixture's season (via `v2_gang_league_seasons`)
  - For each (gang, fixture) pair that doesn't already have scenarios → copy active templates from `v2_scenario_templates` (`is_active = true`) into `v2_fixture_scenarios`
  - Replace `{Home Team}` / `{Away Team}` placeholders in titles with actual team names
  - Idempotent — won't create duplicates (unique constraint on `gang_id, fixture_id, slug`)
- **Writes to:** `v2_fixture_scenarios`
- **Also triggered by:** Gang creation — when a new gang is created, immediately seed scenarios for any upcoming fixtures already within the 14-hour window
- **Note:** 14h buffer ensures scenarios are seeded before the 12h prediction window opens, accounting for cron lag

### `live-poll-resolve-fixtures` — Unified live polling and scenario resolution

- **Schedule:** Every 15 seconds via `pg_cron` (Supabase supports sub-minute intervals with `'15 seconds'` syntax)
- **Purpose:** Keep live scorecards updated and resolve scenarios progressively during and after match. Handles both live match polling and post-match polling (for delayed fields like Player of the Match).
- **Action:**
  1. **Identify fixtures to poll:** query `v2_league_season_fixtures` where:
     - `status IN ('upcoming', 'live')` AND `start_datetime` within active window (started less than 6 hours ago OR starts within next 30 minutes), OR
     - `status = 'completed'` AND time since status change < 120 minutes (waiting for delayed resolutions like POTM)
  2. **For each fixture, fetch from Sportmonks:** `/fixtures/{id}?include=batting,bowling,runs,manofmatch,tosswon,localteam,visitorteam`
  3. **Status transitions:**
     - `upcoming` → `live` when API returns in-progress status (`1st Innings`, `2nd Innings`, etc.)
     - `live` → `completed` when API returns `Finished`
     - `completed` → `resolved` when all scenarios for the fixture are resolved
     - → `abandoned` / `no_result` when API returns those statuses
  4. **Update live scorecard** (only for `live` status): write current state to `v2_fixture_live_scores` (scores, overs, batting team, run rate, last 6 balls, both batsmen with on-strike indicator, current bowler, current partnership)
  5. **Track max overs per team:** defensive against cache anomalies (non-monotonic values seen in real data); only accept values >= stored max
  6. **Capture powerplay snapshot:** when max(overs) first crosses 6.0 for a team → write powerplay runs and wickets to `v2_fixture_results`
  7. **Progressive scenario resolution** (resolve whichever scenarios are now determinable):
     - `toss_winner` — resolve as soon as `toss_won_team_id` is populated (works even when status is `upcoming`/`NS`)
     - `first_wicket_over` — resolve when first batting entry with `fow_balls > 0` appears in innings 1
     - `home_team_powerplay_runs`, `home_team_powerplay_wickets_lost` — resolve when home team's max overs crosses 6.0
     - `away_team_powerplay_runs`, `away_team_powerplay_wickets_lost` — same for away team
     - `home_team_innings_score`, `away_team_innings_score` — resolve when that team's innings ends
     - `fifty_scored` — resolve as soon as any batting entry has `score >= 50`
     - `bowler_three_wickets` — resolve as soon as any bowling entry has `wickets >= 3`
     - `match_winner` — resolve when `winner_team_id` is populated (after status = `Finished`)
     - `top_scorer`, `top_wicket_taker`, `most_sixes_player` — resolve after match ends (from aggregated batting/bowling data)
     - `player_of_match` — resolve when `man_of_match_id` is populated (may take up to 1 hour after match ends)
     - `total_match_runs`, `total_match_sixes`, `total_match_wickets` — resolve after match ends
     - `super_over` — resolve from fixture field (available throughout)
     - For each resolved scenario: set `correct_answer`, `is_resolved = true`, update affected predictions' `is_correct` and `points_earned`
     - Trigger `update-standings` for affected gangs
  8. **Final resolution:** when all scenarios for a fixture are resolved → set fixture status to `resolved`, set `resolved_at` on fixture results, stop polling this fixture
  9. **120-minute cutoff:** if fixture has been in `completed` status for 120+ minutes with unresolved scenarios → stop polling, notify system admin for manual resolution (flow TBD)
- **Writes to:** `v2_fixture_live_scores`, `v2_fixture_results`, `v2_fixture_scenarios`, `v2_predictions`, `v2_league_season_fixtures`, `v2_gang_fixture_standings`, `v2_gang_season_standings`, `v2_notifications`
- **Notes:**
  - Resolution is idempotent — skip scenarios where `is_resolved = true`
  - Single unified function polls both live and recently-completed fixtures (same endpoint, same includes, different filter criteria)

### `update-standings` — Standings recalculation (DB trigger, not cron)

- **Trigger:** Not a cron. Runs automatically via Postgres triggers:
  - `AFTER INSERT/UPDATE ON v2_predictions` → updates `predicted_count`, `last_submitted_at` on `v2_gang_fixture_standings`
  - `AFTER UPDATE ON v2_fixture_scenarios WHEN NEW.is_resolved = true AND OLD.is_resolved = false` → recalculates full standings
- **Purpose:** Keep materialized `v2_gang_fixture_standings` and `v2_gang_season_standings` up-to-date
- **Action on prediction submission:**
  - Upsert `v2_gang_fixture_standings` row for (gang_id, fixture_id, user_id)
  - Update `predicted_count`, `last_submitted_at`
- **Action on scenario resolution:**
  - Recalculate all users' `correct_count`, `resolved_count`, `points_earned` in `v2_gang_fixture_standings` for the affected (gang_id, fixture_id)
  - Recompute `rank` sorted by (points DESC, last_submitted_at ASC)
  - Aggregate `v2_gang_fixture_standings` into `v2_gang_season_standings` for the affected (gang_id, season_id)
  - Recompute season `rank` sorted by (total_points DESC, accuracy_pct DESC, matches_predicted DESC)
- **Implementation:** Postgres stored procedures called by triggers
- **Writes to:** `v2_gang_fixture_standings`, `v2_gang_season_standings`
- **Note:** Using DB triggers ensures any path that resolves scenarios (edge function, manual admin, future tools) automatically updates standings

### `deadline-reminders` — Prediction deadline notifications

- **Schedule:** Every 15 minutes
- **Purpose:** Notify gang members who haven't predicted before the deadline closes
- **Action:**
  - Find upcoming fixtures where deadline is approximately 1 hour away (per-gang deadline computed from `start_datetime - prediction_deadline_mins` in `v2_gang_league_seasons`)
  - For each (gang, fixture) pair:
    - Get approved gang members
    - Filter out members who already have at least one prediction in `v2_predictions` for this (gang_id, fixture_id)
    - Filter out members who already received a `deadline_reminder` notification for this (gang_id, fixture_id)
    - For remaining members → create notification in `v2_notifications` (type: `deadline_reminder`)
- **Writes to:** `v2_notifications`
- **Duplicate prevention:** Query `v2_notifications` by (user_id, gang_id, fixture_id, type) — no flag column needed
- **Note:** Will revisit notification cadence (multiple reminders) in a separate discussion

### Error Handling & Retries

**General principles:**
- All cron functions are idempotent — safe to re-run without side effects
- Log all errors to PostHog (see Analytics section)
- Partial failures don't block other work — one fixture failing doesn't stop processing of others
- Alert system admin after 3 consecutive failures (not on single failures)
- On Sportmonks rate limit (HTTP 429): drop the request, log error, notify admin, wait for next cron cycle

**Per-function retry strategy:**

| Function | Retry Strategy | Alert Admin |
|----------|---------------|-------------|
| `sync-fixtures` | In-function retries: 3 attempts with 15-minute backoff between attempts | After all retries fail |
| `sync-fixtures-pre-match` | No retries (runs every 15 min, next cycle acts as retry) | After 3 consecutive failures |
| `seed-scenarios` | No retries (next cycle acts as retry) | After 3 consecutive failures |
| `live-poll-resolve-fixtures` | No retries (next cycle in 15s) | After 10 consecutive failures (~2.5 min down) |
| `update-standings` | DB transaction — rollback on error, log | After any failure (rare, indicates DB issue) |
| `deadline-reminders` | No retries (next cycle in 15 min) | After 3 consecutive failures |
