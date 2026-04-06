# Bragg — Product Requirements Document (V2)

## Overview

### What we're building

Bragg (intentionally spelled — "brag" + bragging rights) is a free, mobile-first social prediction game for cricket. Friends form private groups (called **gangs**), predict outcomes across 19 scenarios per match (match winner, top scorer, powerplay runs, etc.), and compete on live leaderboards as each match unfolds.

There's no real money, no betting, no prizes. The entire point is bragging rights — predict right, climb the leaderboard, earn screenshot-worthy wins you can share in the group chat.

### Target persona

**Who:** Groups of friends (colleagues, college mates, family) who follow sports together and want a structured way to compete with each other.

**Characteristics:**
- 18+ (legally required, enforced at onboarding)
- Sports fans — casual to hardcore
- Already have a group chat where they debate match predictions
- Want to settle arguments with receipts, not just opinions
- Mobile-first users — they open the app on their phones before and during matches

**Not the target:**
- Fantasy league players looking for complex stats gameplay
- Gamblers or anyone looking for real-money stakes
- Solo users without a friend group

### Launch target

**IPL 2026** (starts March 2026). The first season is the test. Scalability for multi-league support is built into the schema but only IPL is enabled for launch.

### Product feel

**Vibe:**
- Confident, a little cheeky — the name is literally "Bragg"
- Copy is casual and punchy: "Predict right. Prove it. Bragg." Not corporate, not sterile
- Mobile-first, thumb-friendly, fast
- Leaderboards and stats are the star — numbers should feel satisfying
- Every interaction should feel like a small win or small burn

**Design principles:**
- **Dark mode by default** — it's a game app, not a productivity tool
- **Cricket team colors** — bold, saturated, tied to franchise identity
- **Minimal friction** — magic link auth, no passwords, no OTP, no captcha
- **Progressive disclosure** — simple on the surface, rich data when you drill in
- **Real-time where it matters** — live scores update, leaderboards recalculate, notifications push

**Tone of voice:**
- Direct and energetic, never apologetic
- Celebrates winners; doesn't coddle losers
- Treats users as adults who can handle cricket banter
- Avoids fantasy-sports jargon

### How it works (elevator pitch)

1. **Form a gang** — create a private group, share the invite link, get your friends to join
2. **Predict** — 12 hours before each IPL match, 19 scenarios become available. Pick your answers, lock them in before the deadline (45 min before match)
3. **Watch** — live scorecard updates every 15 seconds, scenarios resolve progressively as the match unfolds (toss, first wicket, powerplay, innings end, match end)
4. **Compete** — match leaderboard updates live; season standings roll up across all matches. Screenshot your #1 spot. Talk trash in the group chat.

---

## UI Screens

### Shared Components

#### Global Nav Bar (shown on all authenticated pages)

- App logo and name (links to dashboard)
- Notification bell with unread count badge
  - Opens a side panel (animates from right) with unread notifications
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
    - Gang deleted → message that this gang no longer exists
- Global Footer

### Gang Page (`/group/[groupId]`)

_(URL paths use `/group/` for legacy compatibility; DB schema and product terminology use "gang")_

- Global Nav Bar
- Gang header: gang name, member count (out of max)
- Invite actions: copy invite link, share/send invite (uses native share on mobile)
- Link to Season Standings page
- Link to Gang Settings (admin only)
- Pending join requests section (visible to admin only, shown below gang header)
- **Upcoming Matches**
  - Shows the next 3 upcoming fixtures chronologically (status = `upcoming` or `live`)
  - Match cards showing teams, match number, date, time, venue
  - Prediction deadline displayed
  - CTA to predict for each match
  - Prediction status: shows which members have predicted (for the next match)
- **Live Matches**
  - Live scorecard with scores, overs, batting team (auto-polls for updates)
  - "Stale data" indicator shown if `last_polled_at` is more than 1 minute old
  - Current run rate
  - Last 6 balls breakdown
  - Both batsmen displayed with individual scores, on-strike batsman indicated
  - Current bowler
  - Current partnership
  - Predictions locked indicator
  - CTA to view match leaderboard
- **Recent Results**
  - Shows the last 3 matches with `status IN ('completed', 'resolved', 'abandoned', 'no_result')` chronologically
  - Shows user's prediction summary (predicted count, correct count, points earned)
  - Each card links to the Match Leaderboard page
  - "Results pending" state shown for `completed` (not yet fully resolved) matches
  - "Match voided" state shown for `abandoned`/`no_result` matches
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
  - Submit button to save predictions (users can update predictions until the deadline)
  - Error and success feedback
- Before prediction window opens: shows message with exact opening time and link back to gang page
- Predictions disabled when locked (deadline passed or match live)
- Global Footer

### Match Leaderboard Page (`/group/[groupId]/match/[matchId]`)

- Global Nav Bar
- Match header: match number, teams, date, time, venue
- Live scorecard (auto-polls for updates during live matches): scores, overs, batting team, current run rate, last 6 balls, both batsmen with individual scores and on-strike indicator, current bowler, current partnership
- **Match Leaderboard**
  - Gated: only visible after predictions are locked (deadline passed OR match live) — before that, shows a countdown placeholder
  - Ranked list of members: rank, display name, correct/resolved count, predicted count, points
  - Current user highlighted
  - Empty state if no one has predicted
- **Prediction Reveal Table**
  - Matrix of all members' predictions per scenario
  - Shows correct/incorrect status per cell
  - Members ordered by leaderboard rank
  - Hidden until predictions are locked (deadline passed OR match live) — shows countdown placeholder before lock
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
- Member management: list of members with options to remove, block, or unblock
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
- Deleted account re-signin: if a user with `is_deleted = true` signs in again with the same email, the profile is restored (sets `is_deleted = false`, clears `deleted_at`) and their data is preserved
- Admin account deletion: implemented as a single Postgres RPC that runs in one transaction. For each gang the deleting user admins:
  - Find the earliest-joined approved member (by `approved_at` ASC) whose profile has `is_deleted = false`
  - If found: promote them to admin (set `role = 'admin'`, update `v2_gangs.created_by` to new admin)
  - If no eligible candidate: auto soft-delete the gang
  - Send `gang_deleted` notifications to all approved members with `is_deleted = false`
  - Any failure rolls back the entire transaction (profile deletion and all gang changes)
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
  - Unique invite code generated automatically (6 characters, uppercase letters and numbers only). On unique constraint collision, server action retries with a new code (up to 5 attempts, then errors out).
  - Automatically enrolled in current active season (IPL 2026 for now; future: admin selects leagues/seasons)
- **Roles**
  - Admin: full control — approve/reject/remove members, manage gang settings
  - Member: can predict, view leaderboards
- **Display name uniqueness:** Display names must be unique within a gang. On join/approve, the server action checks the prospective member's display name against existing approved members; if collision, the join is rejected with a clear error.
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
  - Unblock members (sets `is_blocked = false`; allows them to request to join again)
- **Leaving & Deletion**
  - Members can voluntarily leave a gang (status set to `left`)
  - Admin cannot leave — must delete the gang
  - Left and removed members are grayed out in standings; their data (predictions, scores) is preserved
  - Left/removed members no longer appear in the active member list
  - Left members can rejoin with an invite code (unless blocked)
  - Deleting a gang soft-deletes it (marked as deleted in DB, details TBD); all approved members with `is_deleted = false` on their profile receive a `gang_deleted` notification (sent via gang deletion server action using service role in same transaction as the soft-delete)

### Matches

- **Statuses and transitions:**
  - `upcoming` → `live`, `abandoned`, `no_result`
  - `live` → `completed`, `abandoned`, `no_result`
  - `completed` → `resolved`, `abandoned` (fallback), `no_result`
  - `resolved` → terminal (no further transitions)
  - `abandoned` → terminal
  - `no_result` → terminal
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
  - Scenarios are seeded per gang at least 12 hours before match start (via `seed-scenarios` cron); they become visible and predictable when the prediction window opens
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
  - Abandoned/no_result matches: `v2_fixture_results` row created with `resolved_at` set but `match_winner_id` null; all scenarios for this fixture are marked `is_voided = true` across all gangs. Voided scenarios are excluded from standings aggregations (`matches_predicted`, `total_correct`, `total_resolved`, `points_earned`).

### Scenarios

- **Types**
  - System scenarios only (auto-seeded per gang per match when prediction window opens)
- **Structure:**
  - Each scenario has: title, slug, input type, point value, resolution phase, options (for range type)
  - Point values: 5 (easy), 10 (medium), 15 (hard), 20 (hardest)
  - Input types: team pick, player pick, range, yes/no
  - {Home Team} and {Away Team} in titles are dynamically replaced with actual team names
- **Resolution:**
  - Runs as a periodic function during both `live` and `completed` match states
  - Continues until all scenarios are resolved (status transitions to `resolved`) or the 120-minute post-match cutoff is reached
  - Correct answer set on each scenario; predictions scored automatically
- **Resolution phases:**
  - `toss` — after toss
  - `first_wicket` — when first wicket falls
  - `team_powerplay_end` — when a team's powerplay (first 6 overs) ends; resolves that team's powerplay scenarios
  - `mid_match` — during the match (can resolve as soon as condition is met)
  - `team_innings_end` — when a team's innings ends; resolves that team's innings scenarios
  - `end` — after match ends
  - `post_match` — after official awards (POTM)

#### System Scenario Definitions (20 scenarios total; 19 active + 1 inactive; max 210 active points, 220 including inactive)

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

**Range scenario resolution note:** For all `range` type scenarios, the raw numeric value (e.g., `first_innings_score = 185`) is extracted from the API, stored as-is in `v2_fixture_results` (numeric column), and then mapped to the matching bracket string (e.g., `"180-199"`) before being set as `correct_answer` on the scenario. User predictions (which store bracket strings as their `value`) are compared directly to the bracket string.

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
| 20 | `super_over` | Fixture: `super_over` | Direct boolean field. Populated by Sportmonks once match ends with a super over. Other scenarios already resolved during the main match are not re-resolved. |

### Predictions

- **Submission**
  - User selects answers for scenarios and submits all at once (batch upsert)
  - Can update predictions multiple times before the deadline (last submission wins)
  - Submit button is disabled until at least one scenario is answered; server action also rejects empty submissions
  - Submission is additive — partial submissions are allowed (user can answer 5 scenarios, submit, then come back and answer 5 more)
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
  - Abandoned/no_result matches: scenarios marked `is_voided = true`; predictions rows remain intact but are excluded from standings aggregations

### Scoring & Leaderboards

- **Match Leaderboard** (per gang, per match)
  - Ranked by: total points earned in that match
  - Tiebreaker: whoever stopped editing earliest wins (since re-submissions overwrite `submitted_at`, this rewards users who committed to their picks and didn't tweak them — a user who submitted once at T=0 beats a user who submitted at T=0 and edited at T=10)
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
  - Rank recalculation JOINs with `v2_gang_members` on (gang_id, user_id) to get member status
  - Match rank ORDER BY: `CASE WHEN gm.status IN ('left', 'removed') THEN 1 ELSE 0 END ASC`, then `points_earned DESC`, then `last_submitted_at ASC NULLS LAST` (users who didn't predict rank last)
  - Season rank ORDER BY: `CASE WHEN gm.status IN ('left', 'removed') THEN 1 ELSE 0 END ASC`, then `total_points DESC`, then `accuracy_pct DESC`, then `matches_predicted DESC`
  - Left/removed members are always sorted to the bottom regardless of their points (grayed out in UI)
  - Triggered automatically on prediction submission and scenario resolution via Postgres triggers
  - Scope: only the affected (gang_id, fixture_id) or (gang_id, season_id) is recalculated
  - Additional trigger: `AFTER UPDATE OF status ON v2_gang_members FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) AND (OLD.status IN ('approved', 'left', 'removed') OR NEW.status IN ('approved', 'left', 'removed'))` recalculates ranks when a member's status transitions into or out of an active/departed state

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
  - **Admin promoted** (sent to a member who has been auto-promoted to admin because the previous sole admin deleted their account). Message: _"You've been promoted to admin of {gang_name} because the previous admin left Bragg."_ Clicking navigates to the gang page. Emitted by the `delete_account` RPC inside the same transaction as the promotion, one row per affected gang.
- **Limits**
  - Fetches latest 20 notifications

## Design System

All UI development must follow the Bragg design system:

- **Spec:** [`docs/design-system.md`](design-system.md) — the definitive reference for colors, typography, spacing, components, motion, accessibility, and copy voice. Read this before writing any UI code.
- **Visual reference:** [`docs/design-system-visual.html`](design-system-visual.html) — a rendered HTML preview of all design tokens, component patterns, and data display styles. Open in a browser for a live visual guide.

Both files must be consulted together when building or reviewing UI components. The spec (`design-system.md`) defines the rules and token values; the visual reference (`design-system-visual.html`) shows what they look like rendered. If a component's implementation doesn't match the visual reference, fix it.

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
- **Pageviews & Sessions:** PostHog autocapture (pageviews, funnels defined in dashboard). Session recording is **disabled by default at launch** and gated behind a PostHog feature flag (`session-recording-enabled`); it can be rolled out to a sampled % or specific users post-launch without a code change. When enabled, masking is applied so inputs and `[data-ph-mask]` elements are not captured.
- **Custom events tracked:**
  - **Auth:** magic link requested, magic link resent, callback success/failure, onboarding completed, signed out, account deleted
  - **Gangs:** created, join requested, invite copied, invite shared, member approved/rejected, member removed, member left, gang deleted
  - **Predictions:** submitted, pick changed, predict page viewed/revisited
  - **Notifications:** bell opened, notification clicked, marked read, all marked read
  - **Performance:** Web Vitals (LCP, INP, CLS), page load time, server action duration
  - **Security:** rate limit hit (user_id, action, count, window) — fires when a user exceeds a per-action rate limit
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
  - Server actions: per-user rate limits on mutations (gang creation, join requests, prediction submissions, profile edits) — specific limits TBD during implementation
- **Data privacy:**
  - No passwords stored (magic link auth)
  - Analytics use hashed identifiers for pre-auth events (no PII leak)
  - Date of birth stored but never displayed publicly
- **Service role key:** stored as environment variable on server only (edge functions and server actions); never exposed to client. Used to bypass RLS for system operations (cron functions, profile creation trigger, gang creation enrollment).
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
| `is_active` | BOOLEAN, default true | Current season flag (only one per league can be true) |
| `created_at` | TIMESTAMPTZ, default now() | |

**Unique constraints:**
- `(league_id, year)`
- Partial unique index: `(league_id) WHERE is_active = true` — enforces exactly one active season per league

### `v2_profiles` — User accounts

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID, PK | References `auth.users(id)`, cascade delete |
| `display_name` | TEXT, nullable | 2–30 characters; NOT NULL enforced via CHECK when `onboarding_completed = true` |
| `email` | TEXT, NOT NULL | From auth |
| `date_of_birth` | DATE, nullable | Age verification (18+); NOT NULL enforced via CHECK when `onboarding_completed = true` |
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
| `requested_at` | TIMESTAMPTZ, default now() | When the user most recently requested to join (updated on rejoin via server action) |
| `approved_at` | TIMESTAMPTZ, nullable | |
| `departed_at` | TIMESTAMPTZ, nullable | When member last left or was removed; cleared on rejoin |
| **PK** | (gang_id, user_id) | |

### `v2_gang_league_seasons` — Gang enrolled in a league season (with settings)

| Column | Type | Notes |
|--------|------|-------|
| `gang_id` | UUID, FK → v2_gangs | |
| `league_id` | UUID, FK → v2_leagues | |
| `season_id` | UUID, FK → v2_seasons | |
| `prediction_deadline_mins` | INT, default 45 | Minutes before match to close predictions |
| `is_active` | BOOLEAN, default true | Gang participating in this season (reserved for future admin opt-out UI; always true for now) |
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
| `venue_id` | UUID, nullable | Reserved for future venues table (no FK constraint yet) |
| `venue_name` | TEXT, NOT NULL | e.g., "M. Chinnaswamy Stadium, Bengaluru" |
| `status` | ENUM('upcoming', 'live', 'completed', 'resolved', 'abandoned', 'no_result'), default 'upcoming' | |
| `status_changed_at` | TIMESTAMPTZ, default now() | Updated automatically via trigger whenever `status` changes; used for 120-minute post-match cutoff |
| `pre_match_synced` | BOOLEAN, default false | Set to true after pre-match delta sync runs; reset by daily sync if fixture is rescheduled |
| `created_at` | TIMESTAMPTZ, default now() | |

**Unique constraint:** (season_id, match_number)

**Status change trigger:** A Postgres trigger `BEFORE UPDATE ON v2_league_season_fixtures FOR EACH ROW WHEN OLD.status IS DISTINCT FROM NEW.status` automatically updates `status_changed_at = now()`.

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
| `home_team_max_overs_seen` | DECIMAL(4,1), nullable | Max overs seen for home team across polls (defensive against Sportmonks cache anomalies; used to detect powerplay crossing) |
| `away_team_max_overs_seen` | DECIMAL(4,1), nullable | Max overs seen for away team across polls |
| `updated_at` | TIMESTAMPTZ, default now() | |

### `v2_scenario_templates` — System scenario definitions (reference table)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID, PK | |
| `sport_id` | UUID, FK → v2_sports | Templates are sport-specific |
| `slug` | TEXT, NOT NULL, UNIQUE | e.g., "match_winner" |
| `title` | TEXT, NOT NULL | Display title (with {Home Team}/{Away Team} placeholders) |
| `input_type` | ENUM('team_pick', 'player_pick', 'range', 'yes_no') | |
| `options` | JSONB, nullable | Bracket options for range type |
| `points` | INT, NOT NULL | Default points |
| `resolution_phase` | ENUM('toss', 'first_wicket', 'team_powerplay_end', 'mid_match', 'team_innings_end', 'end', 'post_match'), NOT NULL | When this resolves |
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
| `slug` | TEXT, NOT NULL | Copied from template on seeding |
| `title` | TEXT, NOT NULL | Copied from template, placeholders replaced with team names |
| `input_type` | ENUM('team_pick', 'player_pick', 'range', 'yes_no') | Copied from template |
| `options` | JSONB, nullable | Copied from template |
| `points` | INT, NOT NULL | Copied from template |
| `resolution_phase` | ENUM('toss', 'first_wicket', 'team_powerplay_end', 'mid_match', 'team_innings_end', 'end', 'post_match'), NOT NULL | Copied from template |
| `correct_answer` | TEXT, nullable | Set when resolved |
| `is_resolved` | BOOLEAN, default false | |
| `is_voided` | BOOLEAN, default false | Set to true for scenarios in abandoned/no_result matches; excluded from standings aggregations |
| `created_at` | TIMESTAMPTZ, default now() | |

**Unique constraint:** (gang_id, fixture_id, slug)

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

### `v2_league_season_team_players` — Player-to-team mapping per season

| Column | Type | Notes |
|--------|------|-------|
| `league_id` | UUID, FK → v2_leagues | |
| `season_id` | UUID, FK → v2_seasons | |
| `team_id` | UUID, FK → v2_league_teams | |
| `player_id` | UUID, FK → v2_players | |
| `created_at` | TIMESTAMPTZ, default now() | |
| **PK** | (season_id, team_id, player_id) | |

A player can be on different teams in different seasons (trades, auctions). Populated by `sync-fixtures` via `/teams/{id}/squad/{season_id}`. On each daily sync, for each (season_id, team_id) whose squad was fetched in this run, rows with that (season_id, team_id) whose `player_id` is not in the current squad response are deleted (scoped per team — other teams' rows are untouched).

### `v2_gang_fixture_standings` — Match leaderboard per gang (materialized)

| Column | Type | Notes |
|--------|------|-------|
| `gang_id` | UUID, FK → v2_gangs | |
| `season_id` | UUID, FK → v2_seasons | Denormalized for season-level queries |
| `fixture_id` | UUID, FK → v2_league_season_fixtures | |
| `user_id` | UUID, FK → v2_profiles | |
| `predicted_count` | INT, default 0 | Number of predictions the user submitted for this fixture (regardless of whether they're resolved yet) |
| `resolved_count` | INT, default 0 | Number of predictions resolved |
| `correct_count` | INT, default 0 | Number correct |
| `points_earned` | INT, default 0 | Total points for this match |
| `last_submitted_at` | TIMESTAMPTZ | Time of user's latest submission/edit (updates on every re-submission). Sorted ASC for tiebreaker — users who stopped editing earliest rank higher. |
| `rank` | INT, nullable | Computed on resolution |
| `updated_at` | TIMESTAMPTZ, default now() | |
| **PK** | (gang_id, fixture_id, user_id) | |

### `v2_gang_season_standings` — Season leaderboard per gang (materialized)

| Column | Type | Notes |
|--------|------|-------|
| `gang_id` | UUID, FK → v2_gangs | |
| `season_id` | UUID, FK → v2_seasons | |
| `user_id` | UUID, FK → v2_profiles | |
| `matches_predicted` | INT, default 0 | Number of non-voided fixtures where user submitted at least one prediction |
| `total_points` | INT, default 0 | Cumulative points |
| `total_correct` | INT, default 0 | Total correct predictions |
| `total_resolved` | INT, default 0 | Total resolved predictions |
| `accuracy_pct` | DECIMAL(5,2), default 0 | `(total_correct / total_resolved) * 100`, 0 if `total_resolved = 0`. Excludes voided scenarios. |
| `points_per_match` | DECIMAL(5,2), default 0 | `total_points / matches_predicted`, 0 if `matches_predicted = 0` |
| `rank` | INT, nullable | Computed by: points → accuracy → matches predicted |
| `updated_at` | TIMESTAMPTZ, default now() | |
| **PK** | (gang_id, season_id, user_id) | |

### `v2_notifications` — User notifications

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID, PK | |
| `user_id` | UUID, FK → v2_profiles | Recipient |
| `type` | ENUM('join_request', 'join_approved', 'join_rejected', 'new_member', 'deadline_reminder', 'results_available', 'gang_deleted', 'admin_promoted'), NOT NULL | `admin_promoted` is emitted by `delete_account` RPC when the departing user was the sole admin and the earliest approved member is auto-promoted. |
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
| `v2_league_season_fixtures` | `idx_fixtures_status_start` | `(status, start_datetime)` — for `seed-scenarios` and `live-poll-resolve-fixtures` queries that filter across all seasons |
| `v2_fixture_scenarios` | `idx_scenarios_gang_fixture` | `(gang_id, fixture_id)` |
| `v2_fixture_scenarios` | `idx_scenarios_gang_season` | `(gang_id, season_id)` |
| `v2_fixture_scenarios` | `idx_scenarios_fixture_unresolved` | `(fixture_id) WHERE is_resolved = false` — for cron to find unresolved scenarios across all gangs |
| `v2_fixture_scenarios` | `idx_scenarios_gang_fixture_active` | `(gang_id, fixture_id) WHERE is_voided = false` — for standings aggregation queries that exclude voided scenarios |
| `v2_predictions` | `idx_predictions_gang_fixture_user` | `(gang_id, fixture_id, user_id)` |
| `v2_predictions` | `idx_predictions_scenario` | `(scenario_id)` |
| `v2_predictions` | `idx_predictions_gang_season_user` | `(gang_id, season_id, user_id)` |
| `v2_gang_fixture_standings` | `idx_fixture_standings_season` | `(gang_id, season_id)` |
| `v2_gang_season_standings` | `idx_season_standings_user` | `(user_id)` |
| `v2_notifications` | `idx_notifications_user` | `(user_id, created_at DESC)` — for fetching latest N per user |
| `v2_notifications` | `idx_notifications_unread` | `(user_id, is_read) WHERE is_read = false` — partial index for unread count |
| `v2_notifications` | `uniq_notifications_dedup` | UNIQUE `(user_id, gang_id, fixture_id, type) WHERE type IN ('deadline_reminder', 'results_available')` — prevents duplicate inserts via `ON CONFLICT DO NOTHING` |

### Row-Level Security (RLS) Policies

All tables have RLS enabled. System operations (cron, edge functions) use service role key to bypass RLS.

Helper functions (SECURITY DEFINER):
- `is_gang_member(gang_id, user_id)` — returns true if user is an approved member of the gang
- `is_gang_admin(gang_id, user_id)` — returns true if the user has `role = 'admin'` in `v2_gang_members` (not based on `v2_gangs.created_by`, which is historical and can be outdated after admin transfer). Also filters out profiles where `is_deleted = true`.
- `get_gang_by_invite_code(code)` — looks up gang by invite code, bypasses RLS (needed for Join Page before membership)
- `get_members_who_predicted(gang_id, fixture_id)` — returns user_ids only, no prediction values (visible to all gang members before deadline). Function must internally call `is_gang_member(gang_id, auth.uid())` first and return empty if the caller is not an approved member.
- `prediction_deadline(fixture_id, gang_id)` — computes deadline from `start_datetime` minus `prediction_deadline_mins`, used in prediction RLS policies

#### Reference tables (public read, no user writes)

`v2_sports`, `v2_leagues`, `v2_seasons`, `v2_league_teams`, `v2_players`, `v2_league_season_fixtures`, `v2_scenario_templates`

- SELECT: all authenticated users
- INSERT/UPDATE/DELETE: none (system only via service role)

#### `v2_fixture_results`, `v2_fixture_live_scores`, `v2_league_season_team_players` — System-managed, public read

| Operation | Policy |
|-----------|--------|
| SELECT | All authenticated users (match data is public) |
| INSERT/UPDATE/DELETE | None (written by cron functions via service role) |

#### `v2_profiles`

| Operation | Policy |
|-----------|--------|
| SELECT | Own profile always. Others visible if in same gang regardless of member status (includes approved, pending, rejected, left, removed) — needed to display names in standings and reveal tables even after a member leaves. |
| INSERT | None (profile row auto-created via Postgres trigger on `auth.users` insert) |
| UPDATE | Own profile only |
| DELETE | None (soft-delete via update) |

**Profile creation trigger:** A Postgres trigger `AFTER INSERT ON auth.users` creates a `v2_profiles` row with `id` and `email` from auth. The `display_name`, `date_of_birth`, and `terms_version` fields are populated when the user completes onboarding.

**CHECK constraint:** `onboarding_completed = false OR (display_name IS NOT NULL AND date_of_birth IS NOT NULL AND terms_version IS NOT NULL)` — ensures these fields are set once the user finishes onboarding.

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
| INSERT | Any authenticated user (own row only, as pending). For rejoin (existing row with `status IN ('rejected', 'left', 'removed')`): server action performs an UPDATE to set status back to `pending` instead of INSERT (PK conflict would otherwise occur). Rejoin is blocked if `is_blocked = true`. |
| UPDATE | Admin can update others: approve (`pending → approved`, sets `approved_at`), reject (`pending → rejected`), remove (`approved → removed`, sets `departed_at`), block (sets `is_blocked = true`, independent of status — block can coexist with any status). User can update own: leave (`approved → left`, sets `departed_at`). |
| DELETE | None (status changes only) |

**Max members trigger:** A Postgres trigger `BEFORE INSERT OR UPDATE ON v2_gang_members WHEN NEW.status = 'approved'` checks the count of approved members in the gang. If count >= 20 (code constant `MAX_MEMBERS_PER_GANG`), it raises an exception with SQLSTATE `P0001` and message prefix `MAX_MEMBERS_REACHED`. Server action catches and maps to user-friendly error ("Gang has reached maximum member capacity"). Fires on both INSERT (auto-accept direct-to-approved path) and UPDATE (manual approval path).

**Max gangs per user trigger:** A Postgres trigger `BEFORE INSERT/UPDATE ON v2_gang_members` checks the user's total count of rows (excluding the current row) where `status IN ('approved', 'pending')`. Trigger only fires when NEW.status IN ('approved', 'pending') AND (OLD.status IS NULL OR OLD.status NOT IN ('approved', 'pending')) — i.e., only when the row is *transitioning into* an active state. If excluded count >= 40 (code constant `MAX_GANGS_PER_USER`), it raises an exception with SQLSTATE `P0001` and message prefix `MAX_GANGS_REACHED`. Server action catches and maps to user-friendly error. This correctly handles rejoin (left → pending) without counting the current row twice.

#### `v2_gang_league_seasons`

| Operation | Policy |
|-----------|--------|
| SELECT | Approved gang members |
| INSERT | None for users. Created by gang-creation server action (single transaction with `v2_gangs` insert) — enrolls the gang in the current active season of the default league. Uses service role. |
| UPDATE | Admin only (prediction_deadline_mins) |
| DELETE | None |

#### `v2_fixture_scenarios`

| Operation | Policy |
|-----------|--------|
| SELECT | Approved gang members |
| INSERT/UPDATE/DELETE | None (system only) |

#### `v2_predictions`

| Operation | Policy |
|-----------|--------|
| SELECT | Before deadline AND match is still `upcoming`: own only. After deadline OR match status in (`live`, `completed`, `resolved`, `abandoned`, `no_result`): all approved gang members. |
| INSERT | Approved gang members, own user_id, before deadline, match status = 'upcoming'. Prediction window open time (12h before) enforced at server action level, not RLS — early insertions via direct client access are accepted as harmless (still scored correctly, still bound by deadline). |
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
| INSERT | None for users. Server-side only via service role (server actions for join requests, cron functions for deadline reminders and match results) |
| DELETE | None (notifications are never deleted; only marked as read) |

#### Supabase Realtime

Enabled on: `v2_notifications` only. Live scores use client polling, not realtime.

## Cron Functions

**Seed data:** For launch (IPL 2026), the following tables are populated via SQL migration files (not a cron):
- `v2_sports` (Cricket)
- `v2_leagues` (IPL)
- `v2_seasons` (IPL 2026, `is_active = true`)
- `v2_league_teams` (10 IPL franchises with names, codes, colors, logo URLs, Sportmonks api_ids)
- `v2_scenario_templates` (20 scenario definitions; `total_match_catches` set to `is_active = false`)

Admin UI for managing these is a Pending Item (not needed for launch).

**Season activity:** `live-poll-resolve-fixtures`, `seed-scenarios`, and `deadline-reminders` operate on fixtures based on fixture status and timing — they do NOT filter by `v2_seasons.is_active`. This ensures in-progress matches are resolved even if the season has been marked inactive. Only `sync-fixtures` is scoped to the current active season (it's a schedule importer, not a resolver).

**Execution model:** All scheduled jobs are managed via Supabase `pg_cron`. Functions that make HTTP calls to Sportmonks (`sync-fixtures`, `sync-fixtures-pre-match`, `live-poll-resolve-fixtures`) are implemented as Supabase Edge Functions and triggered from pg_cron via `pg_net` (HTTP POST to the edge function endpoint). Functions that only touch the database (`seed-scenarios`, `deadline-reminders`) can be implemented as Postgres functions called directly from pg_cron. `update-standings` is not a cron — it runs as Postgres triggers on data changes.


### `sync-fixtures` — Daily fixture and player sync

- **Schedule:** Once a day at 5 AM IST (pg_cron uses UTC, so schedule as `30 23 * * *` for 05:00 IST = 23:30 UTC previous day)
- **Purpose:** Import match schedule and player rosters from Sportmonks for the current active season
- **Action:**
  - Fetch fixtures for current active season from Sportmonks (`/fixtures?filter[season_id]={id}`)
  - Upsert `v2_league_teams` for any new/updated teams (match by `api_id`)
  - Upsert `v2_league_season_fixtures` (match by `api_id`); silently updates existing fixtures including `start_datetime` changes
  - Reset `pre_match_synced = false` if `start_datetime` changes for a future fixture
  - For each unique team, fetch `/teams/{id}/squad/{season_id}` → upsert players into `v2_players` (match by `api_id`) and populate `v2_league_season_team_players` mapping
- **Writes to:** `v2_league_season_fixtures`, `v2_league_teams`, `v2_players`, `v2_league_season_team_players`
- **Assumptions:**
  - `v2_sports`, `v2_leagues`, `v2_seasons` already exist (created manually via admin dashboard for new seasons)

### `sync-fixtures-pre-match` — Pre-match delta sync

- **Schedule:** Every 15 minutes
- **Purpose:** Catch last-minute timing changes before a match starts
- **Action:**
  - Find fixtures where `start_datetime` is within the next 15–30 minutes AND `pre_match_synced = false`
  - For each → fetch the specific fixture from Sportmonks → if `start_datetime` has changed, update it (flag stays `false`, will re-run next cycle to confirm); if unchanged, set `pre_match_synced = true`
- **Writes to:** `v2_league_season_fixtures`
- **Flag reset rule:** Any change to `start_datetime` (from any source — daily sync, pre-match sync, or manual admin edit) resets `pre_match_synced = false`. This ensures re-syncing whenever the time moves.
- **Future enhancement:** Send notification to members if `start_datetime` changes

### `seed-scenarios` — Scenario seeding per gang per fixture

- **Schedule:** Every 30 minutes
- **Purpose:** Create `v2_fixture_scenarios` rows for every active gang enrolled in a season, for upcoming fixtures
- **Action:**
  - Find fixtures where `start_datetime - 14 hours <= now()` AND `start_datetime > now()` AND `status = 'upcoming'`
  - For each fixture → find all active gangs enrolled in the fixture's season (via `v2_gang_league_seasons`), filtering out gangs where `v2_gangs.is_deleted = true`
  - For each (gang, fixture) pair that doesn't already have scenarios → copy active templates from `v2_scenario_templates` (`is_active = true`) into `v2_fixture_scenarios`
  - Replace `{Home Team}` / `{Away Team}` placeholders in titles with actual team names
  - Idempotent — won't create duplicates (unique constraint on `gang_id, fixture_id, slug`)
  - Each (gang, fixture) pair is seeded within a single transaction (bulk insert); failure on one pair doesn't affect other pairs
- **Writes to:** `v2_fixture_scenarios`
- **Also triggered by:** Gang creation via a single Postgres RPC `create_gang(gang_name, creator_id)` that runs in one transaction:
  1. Insert `v2_gangs` row
  2. Insert creator as admin in `v2_gang_members`
  3. Insert `v2_gang_league_seasons` enrolling gang in current active season
  4. Seed `v2_fixture_scenarios` for upcoming fixtures within the 14-hour window (same logic as the cron)
  5. Return the new gang id
  - Any failure rolls back the entire transaction. The 30-minute cron acts as a fallback for edge cases.
  - Server action catches invite code collision exceptions and retries with a new code (up to 5 attempts).
- **Note:** 14h buffer ensures scenarios are seeded before the 12h prediction window opens, accounting for cron lag

### `live-poll-resolve-fixtures` — Unified live polling and scenario resolution

- **Schedule:** Every 15 seconds via `pg_cron` (Supabase supports sub-minute intervals with `'15 seconds'` syntax)
- **Purpose:** Keep live scorecards updated and resolve scenarios progressively during and after match. Handles both live match polling and post-match polling (for delayed fields like Player of the Match).
- **Action:**
  1. **Identify fixtures to poll:** query `v2_league_season_fixtures` where:
     - `status IN ('upcoming', 'live')` AND `start_datetime` within active window (started less than 6 hours ago OR starts within next 1 hour), OR
     - `status = 'completed'` AND `now() - status_changed_at < INTERVAL '120 minutes'` (waiting for delayed resolutions like POTM)
  2. **For each fixture, fetch from Sportmonks:** `/fixtures/{id}?include=batting,bowling,runs,manofmatch,tosswon,localteam,visitorteam`
  3. **Status transitions:**
     - `upcoming` → `live` when API returns in-progress status (`1st Innings`, `2nd Innings`, etc.)
     - `live` → `completed` when API returns `Finished`
     - `completed` → `resolved` when all scenarios for the fixture are resolved
     - → `abandoned` / `no_result` when API returns those statuses. On this transition, the cron sets `is_voided = true` on all scenarios for the fixture (across all gangs) and triggers standings recomputation.
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
  8. **Final resolution:** when all scenarios for a fixture are resolved → set fixture status to `resolved`, set `resolved_at` on fixture results, stop polling this fixture. Create a `results_available` notification for every approved member of every gang that has predictions on this fixture.
  9. **120-minute cutoff:** if fixture has been in `completed` status for 120+ minutes with unresolved scenarios → stop polling, notify system admin for manual resolution (flow TBD)
- **Writes to:** `v2_fixture_live_scores`, `v2_fixture_results`, `v2_fixture_scenarios`, `v2_predictions`, `v2_league_season_fixtures`, `v2_gang_fixture_standings`, `v2_gang_season_standings`, `v2_notifications`
- **Notes:**
  - Resolution is idempotent — skip scenarios where `is_resolved = true`
  - Single unified function polls both live and recently-completed fixtures (same endpoint, same includes, different filter criteria)

### `update-standings` — Standings recalculation (DB trigger, not cron)

- **Trigger:** Not a cron. Runs automatically via Postgres triggers:
  - `AFTER INSERT/UPDATE ON v2_predictions` → updates `predicted_count`, `last_submitted_at` on `v2_gang_fixture_standings`
  - `AFTER UPDATE ON v2_fixture_scenarios WHEN (NEW.is_resolved = true AND OLD.is_resolved = false) OR (NEW.is_voided = true AND OLD.is_voided = false)` → recalculates full standings (excluding voided scenarios from aggregations)
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
  - For each (fixture, gang) pair where `fixture.status = 'upcoming'` AND the gang is enrolled in the fixture's season: compute gang-specific deadline as `start_datetime - gang_league_season.prediction_deadline_mins`. If `(deadline - INTERVAL '1 hour')` falls within `(now() - INTERVAL '20 minutes', now()]`, the gang's fixture is in the reminder window (20-min window allows for cron lag; dedup via unique index prevents duplicates).
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
- Sportmonks quota: confirm plan limits before launch; daily polling volume (~4/min × 180 min live × 1 match/day = ~720 live calls/day plus fixture syncs) should be within quota

**Per-function retry strategy:**

| Function | Retry Strategy | Alert Admin |
|----------|---------------|-------------|
| `sync-fixtures` | In-function retries: 3 attempts with 15-minute backoff between attempts | After all retries fail |
| `sync-fixtures-pre-match` | No retries (runs every 15 min, next cycle acts as retry) | After 3 consecutive failures |
| `seed-scenarios` | No retries (next cycle acts as retry) | After 3 consecutive failures |
| `live-poll-resolve-fixtures` | No retries (next cycle in 15s) | After 10 consecutive failures (~2.5 min down) |
| `update-standings` | DB transaction — rollback on error, log | After any failure (rare, indicates DB issue) |
| `deadline-reminders` | No retries (next cycle in 15 min) | After 3 consecutive failures |

## Implementation Plan

### Folder structure

Parallel implementation alongside existing codebase (both kept running during development):

```
cric-predictor/
├── web-app/           # existing — kept for reference
├── web-app-2/         # new — clean implementation per PRD V2
├── supabase/          # existing — kept for reference
├── supabase-2/        # new — clean schema + migrations + edge functions
├── docs/              # shared
└── api-tester/        # shared
```

Post-launch: delete `web-app` and `supabase`, rename `web-app-2` → `web-app` and `supabase-2` → `supabase`.

### Supabase-2 migration files

1. `001_initial_schema.sql` — all `v2_*` tables, enums, triggers, RLS policies, indexes, helper functions
2. `002_seed_data.sql` — seed reference data:
   - `v2_sports` (Cricket)
   - `v2_leagues` (IPL)
   - `v2_seasons` (IPL 2026, `is_active = true`)
   - `v2_league_teams` (10 IPL franchises)
   - `v2_scenario_templates` (20 scenarios, 19 active + 1 inactive)
3. `003_migrate_from_v1.sql` — one-time data migration from old schema

### One-time migration strategy

**Preserved:**
- `auth.users` (Supabase-managed, untouched)
- Old `profiles` table (data migrated to `v2_profiles`, then old table dropped)

**Dropped:**
- All old v1 tables (except auth): `groups`, `group_members`, `matches`, `scenarios`, `predictions`, `notifications`, `teams`, `players`, `match_squads`, `points_config`, `match_group_settings`, plus old views/functions/triggers

**Migrated:**

*Profile data* (`profiles` → `v2_profiles`):
- `id`, `email`, `display_name`, `date_of_birth`, `onboarding_completed`, `created_at`
- `terms_version` / `terms_accepted_at` from old schema if present, otherwise NULL
- `is_deleted = false`

*Gangs* (`groups` → `v2_gangs`):
- `id`, `name`, `created_by`, `created_at`
- Generate new 6-char `invite_code` for each gang (old 12-char hex links will break — accepted trade-off)
- `auto_accept = false`
- `is_deleted = false`

*Gang members* (`group_members` → `v2_gang_members`):
- Only migrate rows with status `approved` or `pending` (skip `removed`, `rejected`)
- Role mapping: old `owner` → new `admin`; old `admin` or `member` → new `member` (new schema allows only one admin per gang)
- `joined_at` → `requested_at`
- Preserve `approved_at`
- `is_blocked = false`, `departed_at = NULL`

*Gang enrollment* (new `v2_gang_league_seasons`):
- For every migrated gang, auto-insert a row enrolling the gang in the active IPL 2026 season
- `prediction_deadline_mins = 45` (default)

**Not migrated:**
- Old predictions (different scenario schema, can't map meaningfully)
- Old notifications (transient)
- Old matches, scenarios, teams, players, squads (completely new data from Sportmonks)

### Environment

- Migration runs on **STG Supabase environment** first
- Script must be idempotent — safe to run multiple times during development (clean, test, clean again)
- Big-bang migration: single script runs during a maintenance window, downtime acceptable for STG

## Pending Items

Open items to address in future iterations:

### Notification triggers and cadence
- Finalize the complete list of notification trigger conditions
- Decide on notification message templates
- Revisit whether multiple deadline reminders are needed (currently single reminder 1h before deadline)
- Consider additional reminder cadences (3h, 1h, 30m before deadline)

### System Admin
- Separate role from Gang Admin — for the Bragg platform team
- Needed for:
  - Creating new sports, leagues, and seasons (admin dashboard)
  - Manual scenario resolution fallback (when 120-min cron cutoff is reached)
  - Viewing platform-wide stats and error alerts
  - Managing scenario templates (activating `total_match_catches` once `wicket_id` mapping is available)
- Dedicated admin dashboard UI needs to be designed (separate PRD section)

### `total_match_catches` scenario (INACTIVE)
- Currently marked `is_active = false` in `v2_scenario_templates`
- Blocker: Sportmonks `catch_stump_player_id` combines catches and stumpings; need full `wicket_id` → dismissal type mapping
- Next step: contact Sportmonks support to get `wicket_id` reference table, then either filter stumpings out or rename the scenario to "Total catches & stumpings"

### Bot protection (CAPTCHA)
- Skipped for launch (low-value target, existing rate limits sufficient)
- Revisit if signup abuse is observed post-launch
- Supabase Auth supports hCaptcha/Turnstile out of the box

### Past seasons visibility
- Currently only the active season is shown in the UI
- When a season ends (`is_active = false`), its standings are preserved but no UI path is defined to view them
- Need a season selector / history view design

### Account deletion and gang deletion data handling
- Currently both are soft-delete (marked in DB); actual data cleanup policy is TBD
- Questions to resolve: Are predictions from deleted accounts preserved? What happens to standings when all members of a gang delete their accounts? Data retention period before hard delete?
