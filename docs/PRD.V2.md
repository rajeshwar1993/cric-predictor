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
  - Ranked list of members: rank, display name, role icon, total points, matches predicted, points per match average, accuracy percentage
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
- Custom prediction deadline (relative minutes before match start, overrides default 45 min)
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

- **Statuses:** upcoming → live → completed (also: abandoned, no_result)
- **Data source:** match schedule auto-imported from CricketData.org API via cron function (details TBD in DB section)
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
  - Sets `resolved_at` timestamp on fixture results
  - Abandoned/no_result matches: `v2_fixture_results` row created with `resolved_at` set but `match_winner_id` null; all predictions voided (no points awarded or deducted)

### Scenarios

- **Types**
  - System scenarios only (auto-seeded per gang per match when prediction window opens)
- **Structure:**
  - Each scenario has: title, category, input type, point value, resolution phase
  - Point values range from 5–20
  - Input types: team pick, player pick, range, yes/no, number
- **Resolution:**
  - Runs as a periodic function while match is live
  - Continues until match is completed or all scenarios are resolved
  - Correct answer set on each scenario; predictions scored automatically
  - Scenarios can be soft-removed (not deleted)

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
  - Tiebreaker: earliest submission timestamp wins
  - Shows: rank, display name, correct/resolved count, predicted count, points
  - Current user highlighted
  - Materialized in `v2_gang_fixture_standings` — updated on prediction submit and scenario resolution
- **Season Standings** (per gang, across all matches)
  - Ranked by: total cumulative points → accuracy percentage → matches predicted (tiebreakers in order)
  - Shows: rank, display name, role, total points, matches predicted, points per match average, accuracy percentage
  - Current user highlighted
  - Materialized in `v2_gang_season_standings` — updated on scenario resolution
- **Scoring rules**
  - Binary scoring: correct = scenario's point value, incorrect = 0
  - No partial credit
  - Points only count for resolved scenarios (unresolved scenarios don't affect rankings)

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
- **Database:** Supabase Postgres (with DB views, RPC functions, RLS)
- **Auth:** Supabase Auth (magic link OTP)
- **Realtime:** Supabase Realtime (notifications)
- **Cricket Data:** CricketData.org API
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
  - Live score polling interval: TBD
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
| `removed_at` | TIMESTAMPTZ, nullable | When member was removed |
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
| `status` | ENUM('upcoming', 'live', 'completed', 'abandoned', 'no_result'), default 'upcoming' | |
| `created_at` | TIMESTAMPTZ, default now() | |

**Unique constraint:** (season_id, match_number)

### `v2_fixture_results` — Resolved match stats

| Column | Type | Notes |
|--------|------|-------|
| `fixture_id` | UUID, PK, FK → v2_league_season_fixtures | One-to-one |
| `toss_winner_id` | UUID, FK → v2_league_teams, nullable | |
| `match_winner_id` | UUID, FK → v2_league_teams, nullable | |
| `resolved_at` | TIMESTAMPTZ, nullable | When results were finalized |
| `created_at` | TIMESTAMPTZ, default now() | |

_(TODO: add scenario-specific result fields once scenarios are finalized)_

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

### `v2_scenarios` — Prediction questions for a fixture

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID, PK | |
| `league_id` | UUID, FK → v2_leagues | For future league-level predictions |
| `fixture_id` | UUID, FK → v2_league_season_fixtures | Which match |
| `gang_id` | UUID, FK → v2_gangs | Scenarios are per gang per fixture |
| `type` | ENUM('system'), default 'system' | System only for now |
| `slug` | TEXT, nullable | e.g., "match_winner", "top_scorer" |
| `title` | TEXT, NOT NULL | Display title |
| `input_type` | ENUM('team_pick', 'player_pick', 'range', 'yes_no', 'number') | |
| `range_min` | INT, nullable | Min value for range/number input |
| `range_max` | INT, nullable | Max value for range/number input |
| `points` | INT, NOT NULL | 5–20 |
| `resolution_phase` | TEXT, nullable | When this resolves during match |
| `correct_answer` | TEXT, nullable | Set when resolved |
| `is_resolved` | BOOLEAN, default false | |
| `is_removed` | BOOLEAN, default false | Soft-delete |
| `created_at` | TIMESTAMPTZ, default now() | |

**Unique constraint:** (gang_id, fixture_id, slug) WHERE slug IS NOT NULL

### `v2_predictions` — User predictions for scenarios

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID, PK | |
| `user_id` | UUID, FK → v2_profiles | |
| `scenario_id` | UUID, FK → v2_scenarios | |
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
