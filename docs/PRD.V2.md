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

#### Global Footer (shown on all pages)

- Disclaimer text
- Link to Privacy Policy
- Link to Terms & Conditions

### Landing Page (`/`)

- **Hero Section**
  - App logo and name
  - CTA to create a squad (redirects to login if unauthenticated)
  - CTA to join a squad (redirects to login if unauthenticated)
- **How It Works Section**
  - Three-step explainer: form a squad, make predictions, compete on leaderboard
- **Prediction Preview Section**
  - Mock match card showing sample prediction scenarios with point values and options
- **CTA Section**
  - Repeated create squad and join squad CTAs
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
  - Displays squad name with option to join or dismiss
  - Auto-expires after 24 hours
- Empty State (no squads yet)
  - Create squad form (squad name input)
  - Join squad form (invite code input)
- Squads List (has squads)
  - Grid of squad cards showing squad name, member count, and user's role (owner/admin/member)
  - Each card links to the squad page
  - Join squad form (invite code input)
  - Create new squad form
- Global Footer

### Join Page (`/join/[code]`)

- **Unauthenticated user**
  - App logo and name
  - Shows squad name they've been invited to
  - Login form (magic link) to sign in and join
  - Stores invite code in localStorage for post-login pickup
- **Authenticated user**
  - Global Nav Bar
  - Shows squad name they've been invited to
  - Join squad button (sends join request, requires admin approval)
  - Handles states:
    - Already approved → redirects to squad page
    - Pending → waiting for admin approval message
    - Rejected → option to request again
    - Squad full → message that squad has reached max members
- Global Footer

### Squad Page (`/group/[groupId]`)

- Global Nav Bar
- Squad header: squad name, member count (out of max)
- Invite actions: copy invite link, share/send invite (uses native share on mobile)
- Pending join requests section (visible to owner/admin only, shown below squad header)
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
  - Results pending state
- **Member List / Leaderboard**
  - List of all members with display name, avatar initial, and role (owner/admin/member)
  - Overall points displayed per member
  - Sorted by points (acts as season leaderboard)
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
- Predictions disabled when locked (deadline passed, match live, or admin-locked)
- Global Footer

### Match Leaderboard Page (`/group/[groupId]/match/[matchId]`)

- Global Nav Bar
- Match header: match number, teams, date, time, venue
- Live scorecard (auto-polls for updates during live matches)
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
  - Empty states: solo squad (nudge to invite), no predictions
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
- **Stats Overview**
  - Total squads joined
  - Total matches predicted
  - Overall accuracy percentage
  - Total points across all squads
- **Account Actions**
  - Sign out
  - Delete account
- Global Footer
