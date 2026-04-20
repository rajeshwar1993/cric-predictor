# Bragg — Native App Product Requirements Document

> This document is the single source of truth for the Bragg native mobile application. It covers platform choice, complete feature mapping from the web app, native-specific enhancements, architecture, and a phased implementation roadmap.

---

## 1. Executive Summary

### What

A native mobile application for **Bragg** — the social cricket prediction game — targeting Android and iOS. The native app replaces the mobile web experience with a purpose-built app that leverages platform capabilities (push notifications, haptics, offline support, biometric auth, widgets) while sharing the same Supabase backend.

### Why

- **80%+ of Bragg usage is mobile** — the web app is already mobile-first, but runs in a browser tab competing with 50 other tabs
- **Push notifications are table stakes** — the FCM web push spec (already drafted) is a workaround for what native apps do natively. Native push is more reliable, richer, and doesn't require service worker gymnastics
- **App Store presence** — discoverability, credibility, and the "just install it" sharing flow (link → App Store → install → open with deep link)
- **Performance** — native rendering eliminates browser overhead. The live scorecard polling (every 15s), leaderboard polling (every 30s), and prediction form interactions will feel snappier
- **Retention** — home screen icon, notification badges, and background refresh keep users engaged between matches

### Goals

1. **Feature parity** with the web app for all user-facing features (excluding admin dashboard)
2. **Native-first enhancements** that aren't possible on web (push, haptics, widgets, biometrics, share sheets, offline)
3. **Shared backend** — zero changes to Supabase schema, RLS, Edge Functions, or cron jobs
4. **Ship before IPL 2027** — the next season is the deadline

### Non-Goals

- Admin dashboard (stays web-only — admins need large screens and complex data tables)
- Multi-sport support (schema supports it, but app launches with IPL cricket only)
- Real-money betting, fantasy league mechanics, or premium tiers
- Tablet-optimized layouts (phone-first; tablets get scaled phone layouts initially)

---

## 2. Platform & Framework Decision

### Recommendation: Flutter

**Flutter** is the recommended framework. Here's the evaluation:

| Criteria | Flutter | React Native | Native (Kotlin + Swift) |
|----------|---------|--------------|------------------------|
| **Single codebase** | Yes (Dart) | Yes (TypeScript) | No (2 codebases) |
| **Performance** | Compiled to native ARM, own rendering engine (Skia/Impeller) | JS bridge + native views, improving with New Architecture | Best possible |
| **UI consistency** | Pixel-identical across platforms (own rendering) | Platform-specific rendering differences | Platform-native look |
| **Supabase SDK** | Official `supabase_flutter` package (mature, maintained) | Official `supabase-js` (same as web app) | Official SDKs exist but less community |
| **Push notifications** | `firebase_messaging` (mature) | `@react-native-firebase/messaging` (mature) | Native FCM SDKs |
| **Development speed** | Fast (hot reload, widget system) | Fast (hot reload, familiar JS ecosystem) | Slowest (2x everything) |
| **Team ramp-up** | New language (Dart) but easy to learn | Familiar if team knows React/TS | Requires platform specialists |
| **Custom UI** | Excellent — Bragg's dark, branded UI benefits from full rendering control | Good but platform components may fight the design system | Full control per platform |
| **Animation/Motion** | Excellent built-in animation framework | Reanimated is powerful but external | Platform animation APIs |
| **Long-term maintenance** | One codebase, Google-backed | One codebase, Meta-backed | Two codebases, highest maintenance |
| **App size** | ~15-20 MB | ~20-30 MB | ~5-10 MB |

**Why Flutter wins for Bragg specifically:**

1. **Electric Street design system** — Bragg has a highly custom, branded dark UI. Flutter's widget-based rendering means pixel-perfect reproduction of the design system across both platforms. React Native would require fighting platform defaults.
2. **Supabase integration** — `supabase_flutter` handles auth (magic link deep links), realtime subscriptions, and Postgres queries with the same patterns as the web SDK.
3. **Animation needs** — live scorecard updates, leaderboard rank changes, notification pulses, prediction form interactions — Flutter's animation framework handles these natively without external libraries.
4. **Single developer productivity** — if the team is small, Flutter's hot reload and widget composition model enables rapid iteration.

**Trade-off acknowledged:** The web app team knows TypeScript/React. Dart is a new language. However, Dart is syntactically similar to TypeScript/Java, and the Flutter learning curve is well-documented. The UI consistency and custom rendering control outweigh the language switch.

### Alternative consideration: React Native with Expo

If the team strongly prefers staying in the TypeScript ecosystem, **React Native with Expo** is the runner-up. Key advantages:
- Shared TypeScript types with web app (database types, action result types)
- Familiar React mental model (hooks, components, state)
- Expo's managed workflow simplifies build/deploy
- `supabase-js` is the exact same SDK as the web app

If choosing React Native, use the **New Architecture** (Fabric renderer + TurboModules) and **Expo Router** for file-based routing.

---

## 3. Current Web App Feature Inventory

Below is a complete enumeration of every feature in the current web app, organized by domain.

### 3.1 Authentication & Onboarding

| # | Feature | Description |
|---|---------|-------------|
| A1 | Magic link login | Passwordless email auth via Supabase. User enters email, receives magic link, clicks to authenticate. |
| A2 | Auth callback handling | Exchange auth code for session, set cookies, detect onboarding/terms state, redirect appropriately. |
| A3 | Onboarding flow | First-time setup: display name (2-30 chars), date of birth (18+ verification), terms acceptance. |
| A4 | Terms version tracking | Cookie-based detection of outdated terms. Blocks app access until user accepts new version. |
| A5 | Accept terms flow | Standalone page for accepting updated terms. Checkbox + submit, then redirect to dashboard. |
| A6 | Sign out | Clears session, cookies, fires analytics event, redirects to landing page. |
| A7 | Session persistence | Supabase session via httpOnly cookies. Auto-refresh on expiry. |
| A8 | Deleted account restoration | If a soft-deleted user logs back in, `is_deleted` flag is flipped and account is restored. |

### 3.2 Dashboard

| # | Feature | Description |
|---|---------|-------------|
| D1 | Gang cards grid | Grid of user's approved gangs. Each card shows gang name, member count (X/20), user role badge (ADMIN/MEMBER). |
| D2 | Empty state | New user with no gangs sees create/join forms prominently. |
| D3 | Create gang form | Inline form: gang name input (3-50 chars), creates gang + auto-enrolls in active season + seeds scenarios. |
| D4 | Join gang form | Inline form: 6-char alphanumeric invite code input. Handles auto-accept vs pending states. |
| D5 | Pending invite banner | Shows when user arrived via invite link while logged out. Displays gang name, join/dismiss options. Auto-expires 24h. |

### 3.3 Gang Page (Main Hub)

| # | Feature | Description |
|---|---------|-------------|
| G1 | Gang header | Gang name (H1, uppercase), member count "X/20 members". |
| G2 | Invite sharing | Copy invite link button + native share (Web Share API on mobile). |
| G3 | Navigation links | Season standings link, gang settings link (admin only). |
| G4 | Pending join requests | Admin-only section. List of pending users with approve/reject buttons. |
| G5 | Upcoming matches | Next 3 upcoming fixtures. Match card: team names, match number, date, time, venue, prediction deadline, "X/Y predicted" counter, avatar pills (member initials who predicted), "Predict" CTA. |
| G6 | Live matches section | Auto-polls every 15s. Shows live scorecard with scores, overs, CRR, last 6 balls (colored pills), both batsmen with scores + on-strike indicator, current bowler, partnership, stale data warning (>1min), "View Leaderboard" CTA. |
| G7 | Recent results | Last 3 completed/resolved/abandoned/no_result matches. User's prediction summary (predicted/correct/points). Links to match leaderboard. "Results pending" and "Match voided" states. |
| G8 | Member list | All members with avatar (initials), name, role badge, season points. Sorted by season standings. |
| G9 | Leave gang | Non-admin only. Type-to-confirm dialog (type gang name). User loses access, can rejoin with code. |

### 3.4 Prediction System

| # | Feature | Description |
|---|---------|-------------|
| P1 | Prediction page | Match header (number, teams, date, time, venue). Deadline countdown or locked status. Last updated timestamp. |
| P2 | Scenario grouping | 19 scenarios grouped by resolution phase: Toss, First Wicket, Powerplay, During Match, Innings End, Match End, Post Match. |
| P3 | Scenario card | Title, point value badge ("10 PTS"), input picker, "Picked" indicator when answered. Shows saved value as default. |
| P4 | Team picker | Radio/select for choosing between home/away team (toss_winner, match_winner). |
| P5 | Player picker | Searchable select from both teams' squads (top_scorer, top_wicket_taker, most_sixes_player, player_of_match). |
| P6 | Range picker | Radio options for bracket selection (innings score ranges, powerplay ranges, etc.). |
| P7 | Yes/No picker | Toggle for binary scenarios (fifty_scored, bowler_three_wickets, super_over). |
| P8 | Prediction window | Opens 12 hours before match. Closes `prediction_deadline_mins` before start (default 45 min, configurable per gang). |
| P9 | Window not open state | "Predictions open at {time}" message with countdown when window hasn't opened. |
| P10 | Predictions locked state | "Predictions locked" when deadline passed or fixture status != 'upcoming'. |
| P11 | Sticky submit bar | Fixed bottom bar with progress counter (X/19 picked) and submit button. |
| P12 | Submission flow | Upserts predictions. "Locked!" confirmation toast (2s). Auto-navigate back to gang page. |
| P13 | Edit predictions | Users can re-submit until deadline. Existing picks pre-populated. |
| P14 | Rate limiting | 60 predictions/hour per user. |

### 3.5 Leaderboards & Standings

| # | Feature | Description |
|---|---------|-------------|
| L1 | Match leaderboard page | Match header + live scorecard (during live matches). Gated until predictions locked. |
| L2 | Leaderboard countdown | Before prediction lock: countdown timer. After lock: leaderboard visible. |
| L3 | Match leaderboard table | Rank, avatar + name, correct/resolved, predicted count, points. Ranked by points DESC, earliest submission ASC. Current user highlighted. Departed members grayed out. |
| L4 | Live leaderboard polling | Auto-polls every 30s during live matches. Pauses when tab hidden. |
| L5 | Prediction reveal table | Matrix of all members' predictions per scenario. Shows correct/incorrect status per cell. Members ordered by rank. Hidden until predictions locked. Auto-polls during live matches. |
| L6 | Leaderboard share card | Available when fixture resolved. PNG export: rank badge, name, points, correct count, match context, gang context, Bragg branding. Other members anonymized. Mobile: `navigator.share()`. Desktop: download. Rank-specific copy (#1, #2-3, #4+). |
| L7 | Season standings page | Season selector. Ranked list: rank, name, total points, matches predicted, points/match, accuracy %. Current user highlighted. |

### 3.6 Gang Management

| # | Feature | Description |
|---|---------|-------------|
| M1 | Gang settings page | Admin only. Gang name edit (3-50 chars), auto-accept toggle, prediction deadline config (15-720 min). |
| M2 | Member management | Admin actions: remove member, block member, unblock member. Type-to-confirm for remove. |
| M3 | Delete gang | Admin only. Soft-delete. Type-to-confirm (gang name). Notifies all members. |

### 3.7 Profile & Account

| # | Feature | Description |
|---|---------|-------------|
| PR1 | Profile page | Avatar (initials), display name (editable inline), email (read-only), DOB (read-only), join date. |
| PR2 | Profile stats | Total gangs, matches predicted, accuracy %, total points across all gangs. Empty state if no predictions. |
| PR3 | Display name update | Inline edit. Cross-gang uniqueness check (case-insensitive). Rate limited (10/hr). |
| PR4 | Account deletion | Type-to-confirm (email). Atomic RPC: soft-deletes profile, auto-promotes admins, soft-deletes empty gangs, notifies affected admins, signs out. |

### 3.8 Notifications

| # | Feature | Description |
|---|---------|-------------|
| N1 | Notification bell | Nav bar icon. Unread count badge (red, max "99+"). Pulse animation on new notification. |
| N2 | Notification panel | Side panel from right. Title, "Mark all as read", latest 20 notifications, empty state. |
| N3 | Notification item | Unread: white text + lime accent. Read: gray + no accent. Type-specific icon. Message text. Relative timestamp. Clickable → navigates to relevant page. |
| N4 | Real-time updates | Supabase Realtime subscription on `v2_notifications`. Instant unread count update. Pulse on new INSERT. |
| N5 | Mark as read | Individual + mark all. Optimistic UI (instant visual, revert on error). Rate limited (60/min). |
| N6 | 8 notification types | deadline_reminder, results_available, join_request, join_approved, join_rejected, new_member, gang_deleted, admin_promoted. |

### 3.9 Public Pages

| # | Feature | Description |
|---|---------|-------------|
| PB1 | Landing page | Hero, how-it-works, prediction preview, CTA sections. Redirects authenticated users to dashboard. |
| PB2 | Join page | Public preview of gang (name). Unauthenticated: show login form. Authenticated: join button with state handling (auto-accept, pending, full, blocked, deleted). |
| PB3 | Privacy policy | Static content page. |
| PB4 | Terms of service | Static content page. |
| PB5 | 404 page | Custom not found page. |
| PB6 | Error boundary | Global error page with retry. |

### 3.10 Analytics & Monitoring

| # | Feature | Description |
|---|---------|-------------|
| AN1 | PostHog integration | User identification, event tracking (auth, gangs, predictions, notifications, performance, errors). |
| AN2 | Server action timing | `withTiming()` wrapper measures duration, fires analytics events. |
| AN3 | Web Vitals | LCP, INP, CLS reported to PostHog. |
| AN4 | Error capture | `captureServerError()` logs to PostHog + console. Structured metadata, no PII in error messages. |

### 3.11 Backend (Shared — No Changes Needed)

| # | Feature | Description |
|---|---------|-------------|
| B1 | Supabase Auth | Magic link auth with session management. |
| B2 | 19 database tables | Full schema with enums, constraints, indexes. |
| B3 | Row-level security | Complete RLS policies on all tables. Deadline-based prediction visibility. |
| B4 | 20 scenario templates | 19 active IPL scenarios across 7 resolution phases. |
| B5 | Scenario resolution | `resolve_scenario`, `re_resolve_scenario`, `void_fixture_scenarios`, `mark_fixture_resolved` RPCs. |
| B6 | Standings computation | Trigger-based automatic recalculation on prediction insert/update and scenario resolution. |
| B7 | 6 cron jobs | sync-fixtures (daily), sync-fixtures-pre-match (15min), live-poll-resolve (15s), seed-scenarios (30min), deadline-reminders (15min), cleanup-rate-limits (daily). |
| B8 | 4 Edge Functions | sync-fixtures, sync-fixtures-pre-match, live-poll-resolve-fixtures, cleanup-stale-fixtures. |
| B9 | Sportmonks integration | Cricket data: fixtures, teams, players, live scores, results. |
| B10 | Rate limiting | Per-user per-action fixed-window rate limiting. |
| B11 | Notification RPCs | 4 notification creation RPCs (join_request, new_member, join_approved, join_rejected). |
| B12 | Gang RPCs | create_gang, delete_gang, delete_account with advisory locks and atomic operations. |

---

## 4. Native App Feature Specification

### 4.1 Authentication & Onboarding

#### 4.1.1 Magic Link Auth (Native)

**Behavior:** Same passwordless flow, but with native deep link handling.

- Email input screen with "Send magic link" button
- Confirmation screen: "Check your email — we sent a link to {email}"
- Resend with cooldown (60s)
- "Use a different email" option

**Deep link handling:**
- Register custom URL scheme: `bragg://` and universal links (`https://bragg.app/auth/callback`)
- When user taps magic link in email → app opens → exchange code for session via `supabase.auth.exchangeCodeForSession()`
- If app not installed → universal link falls back to web → App Store redirect
- Handle edge cases: expired links, already-used links, link opened on different device

**Session persistence:**
- Store Supabase session tokens in platform-secure storage (iOS Keychain / Android EncryptedSharedPreferences)
- Auto-refresh token on expiry
- Persist across app restarts

**Enhancement — Biometric unlock (new):**
- After initial magic link auth, offer biometric enrollment (Face ID / Touch ID / Android fingerprint)
- On subsequent app opens, use biometric to unlock rather than requiring re-auth
- Store auth token in biometric-protected keychain
- Settings toggle to disable biometric unlock
- Fallback to magic link if biometric fails 3 times

#### 4.1.2 Onboarding

Same flow as web:
- Display name input (2-30 chars)
- Date of birth picker (native date picker, 18+ enforcement)
- Terms & Privacy acceptance (with in-app WebView links)
- Submit → redirect to dashboard

**Enhancement:**
- Native date picker (platform wheel/calendar instead of web input)
- Smooth transition animation from onboarding → dashboard

#### 4.1.3 Terms Update

Same flow as web:
- Detect outdated terms version on app launch
- Block access until accepted
- Checkbox + submit → redirect to dashboard

### 4.2 Dashboard

#### 4.2.1 Gang Cards

- Vertical scrollable list (not grid — better for one-handed mobile use)
- Each card: gang name, member count (X/20), role badge (ADMIN/MEMBER)
- Tap card → navigate to gang page
- Pull-to-refresh to reload gang list

**Enhancement — Card preview:**
- Show next upcoming match date/time on each gang card (if available)
- Show unread notification count per gang (badge on card)

#### 4.2.2 Create & Join

- **Create gang:** Bottom sheet with gang name input + create button
- **Join gang:** Bottom sheet with invite code input (6-char, uppercase, alphanumeric) + join button
- Handle all join states (auto-accept, pending, full, blocked, deleted, already member)

**Enhancement — QR code join (new):**
- Generate QR code from invite link for in-person sharing
- QR code scanner for joining (tap "Scan QR" in join sheet)
- Faster than typing 6-char codes when friends are physically together

#### 4.2.3 Pending Invite Banner

- Persistent banner at top of dashboard
- Shows gang name + "Join" and "Dismiss" buttons
- Source: deep link parameters stored in secure storage on app open
- Auto-expires after 24h

### 4.3 Gang Page

#### 4.3.1 Gang Header

- Gang name (large, uppercase, bold)
- Member count "X/20 members"
- Action buttons row: Share Invite, Season Standings
- Admin: additional Settings button

#### 4.3.2 Invite Sharing

- **Share button** → native share sheet (iOS UIActivityViewController / Android share intent)
- Shares: invite link (`https://bragg.app/join/{code}`) + custom message
- **Copy link** button with haptic feedback + "Copied!" toast

#### 4.3.3 Pending Join Requests (Admin)

- Collapsible section below header
- Badge count on section header
- Each request: avatar + display name + approve/reject buttons
- Swipe-to-approve, swipe-to-reject (platform gesture pattern)
- Haptic feedback on action

#### 4.3.4 Upcoming Matches

- Next 3 upcoming fixtures
- Match card:
  - Team badges (logos) + team names
  - Match number + round (e.g., "Match 12")
  - Date + time (localized to user's timezone)
  - Venue
  - Prediction deadline with countdown
  - "X/Y predicted" counter + avatar pills (member initials, max 4 + "+N")
  - "Predict" CTA button
- Tap card → navigate to prediction page

#### 4.3.5 Live Matches

- Auto-polls every 15s (foreground only)
- Live scorecard:
  - Team badges + scores (e.g., "MI 186/4")
  - Current overs
  - Batting team highlighted
  - Current run rate (CRR)
  - Last 6 balls as colored circles (4=blue, 6=lime, W=coral, dot=gray)
  - Both batsmen: name + score + strike indicator
  - Current bowler
  - Current partnership
  - Stale data indicator (>1min since last poll, yellow "Last updated Xm ago")
- "View Leaderboard" CTA
- **Enhancement:** Haptic pulse on wicket or boundary in the last 6 balls display

#### 4.3.6 Recent Results

- Last 3 completed/resolved/abandoned/no_result matches
- Card: team names, match number, user's prediction summary (predicted / correct / points)
- Status badges: "Results pending" (completed but unresolved), "Match voided" (abandoned/no_result)
- Tap → match leaderboard page

#### 4.3.7 Member List

- All approved members sorted by season points
- Each row: avatar (initials), display name, role badge, season points
- Departed members grayed out, sorted to bottom

#### 4.3.8 Leave Gang

- Visible to non-admin members only
- Tap → type-to-confirm dialog (type gang name)
- On leave: navigate to dashboard, remove gang from list

### 4.4 Prediction System

#### 4.4.1 Prediction Page

- Match header: team badges, match number, date, time, venue
- Status bar: deadline countdown (live timer) OR "Predictions locked" OR "Opens at {time}"
- Last updated timestamp if user has existing predictions
- Scrollable list of scenarios grouped by resolution phase
- Phase headers: TOSS, FIRST WICKET, POWERPLAY, DURING MATCH, INNINGS END, MATCH END, POST MATCH

#### 4.4.2 Scenario Cards

Each card shows:
- Scenario title (e.g., "Who wins the toss?")
- Point value badge ("5 PTS" in lime)
- Input picker (varies by type — see below)
- Check indicator when answered
- Previously saved answer pre-populated

#### 4.4.3 Input Pickers

**Team picker:**
- Two large tappable team badges side by side
- Selected team highlighted with lime border + check
- Haptic on selection

**Player picker:**
- Tappable field that opens a searchable bottom sheet
- Two-tab layout: Home Team / Away Team
- Player list with name + role (batter/bowler/all-rounder)
- Search bar at top
- Tap to select → sheet closes → selection shown on card

**Range picker:**
- Horizontal chip group (e.g., "<140", "140-159", "160-179", "180-199", "200+")
- Selected chip highlighted with lime background
- Haptic on selection

**Yes/No picker:**
- Two large toggle buttons side by side
- Selected button highlighted
- Haptic on selection

#### 4.4.4 Submission

- **Sticky bottom bar:** progress counter (X/19 picked) + "Submit Predictions" button
- Button disabled until at least 1 pick made
- Submit → loading state → success animation ("Locked!") → auto-navigate back
- **Enhancement:** confetti or satisfying animation on submit (celebratory haptic)
- Error handling: rate limit exceeded, deadline passed, network error

#### 4.4.5 Prediction Window Logic

- Opens 12 hours before match start
- Closes `prediction_deadline_mins` before start (default 45, per-gang configurable)
- Before window: "Predictions open at {time}" with countdown
- After deadline: "Predictions locked" — inputs disabled, submit hidden
- 30s safety buffer to prevent race conditions with RLS

### 4.5 Leaderboards & Standings

#### 4.5.1 Match Leaderboard

- Match header + live scorecard (during live matches)
- **Gated content:** countdown timer until predictions lock, then leaderboard appears
- Table: rank, avatar + name, correct/resolved, predicted count, points
- Current user row highlighted with lime left accent
- Departed members grayed out
- Auto-polls every 30s during live matches
- Pull-to-refresh for manual update

**Enhancement — Rank change animation:**
- When poll returns, animate rank changes (slide up/down with position change)
- Haptic on rank change for current user

#### 4.5.2 Prediction Reveal

- Matrix: members (rows) × scenarios (columns)
- Each cell shows the member's pick + correct/incorrect indicator
- Scrollable horizontally (scenarios) and vertically (members)
- Members sorted by rank
- Hidden until predictions locked
- Auto-polls during live matches

#### 4.5.3 Leaderboard Share Card

- Available only when fixture status = resolved
- Only on current user's row
- Tap "Share" → generates PNG card:
  - Rank badge (#1 = sunburst yellow, #2-3 = lime, others = neutral)
  - Display name + avatar
  - Points + correct predictions
  - Match context (teams, match number)
  - Gang context (gang name, member count)
  - Bragg branding + watermark
  - Other members anonymized
- Share via native share sheet
- Rank-specific copy: "#1 = Top of the table", "#2-3 = On the podium", "#4+ = In the mix"

**Enhancement — Instagram/WhatsApp Stories format:**
- Generate story-sized image (9:16 ratio) optimized for Instagram/WhatsApp Stories
- Include animated variant for platforms that support it

#### 4.5.4 Season Standings

- Season selector (dropdown, default = current active season)
- Ranked list: rank, avatar + name, total points, matches predicted, points/match, accuracy %
- Current user highlighted
- Pull-to-refresh
- Empty state: "Start predicting to see standings"

### 4.6 Gang Management

#### 4.6.1 Gang Settings (Admin Only)

- **Gang Info:** Gang name edit (3-50 chars), save button
- **Join Settings:** Auto-accept toggle switch
- **Prediction Settings:** Deadline minutes (15-720), numeric stepper or input
- **Member Management:** Full member list with admin actions
  - Remove member → type-to-confirm (member name)
  - Block member → confirmation dialog
  - Unblock member → confirmation dialog
- **Danger Zone:** Delete gang → type-to-confirm (gang name), red destructive style

#### 4.6.2 Member Actions

All admin actions trigger notifications to affected users:
- Approve join request → `join_approved` notification
- Reject join request → `join_rejected` notification
- Remove member → member status set to 'removed'
- Block member → member status set to 'blocked', can't rejoin

### 4.7 Profile & Account

#### 4.7.1 Profile Page

- Large avatar with initials (centered, prominent)
- Display name (tappable to edit inline)
- Email (read-only, gray text)
- Date of birth (read-only, formatted "28 Mar 2026")
- Member since (formatted "Joined {date}")

**Enhancement — Avatar customization (new):**
- Allow users to choose avatar background color from a preset palette
- Store as profile metadata (new column: `avatar_color`)
- Makes avatars more distinguishable in member lists and pills

#### 4.7.2 Profile Stats

Aggregated across all gangs:
- Total gangs joined
- Total matches predicted
- Overall accuracy %
- Total points
- Empty state if no predictions: "Start predicting to see your stats"

**Enhancement — Stats expansion (new):**
- Best scenario type (highest accuracy per scenario slug)
- Longest correct streak
- Total #1 finishes
- Personal records (highest single-match score, most correct in one match)

#### 4.7.3 Display Name Update

- Inline edit with save
- Cross-gang uniqueness check (case-insensitive)
- Rate limited (10/hr)
- Error: "Name already taken in {gang names}"

#### 4.7.4 Account Deletion

- "Delete Account" in danger zone section
- Type-to-confirm (email address)
- Warning text explaining consequences
- Atomic RPC: soft-deletes profile, promotes admins, soft-deletes empty gangs, notifies admins
- On delete: clear local storage, navigate to landing screen

#### 4.7.5 App Settings (New)

- **Notifications:** Push notification toggle (enable/disable)
- **Biometric unlock:** Toggle Face ID / Touch ID / fingerprint
- **Theme:** Dark only (no toggle — Bragg is dark-mode only)
- **About:** App version, open-source licenses, support link
- **Legal:** Privacy policy, Terms of service (in-app WebView)

### 4.8 Notifications

#### 4.8.1 Native Push Notifications

**This replaces the web FCM push notification spec entirely.** Native push is simpler and more reliable.

- Register for push notifications via APNs (iOS) / FCM (Android)
- Store device tokens in `v2_push_tokens` table
- All 8 notification types delivered as push:

| Type | Title | Body Example | Tap Action |
|------|-------|-------------|------------|
| `deadline_reminder` | Predictions closing soon | "Predictions close in 1 hour for MI vs CSK" | → Prediction page |
| `results_available` | Match results are in | "Results are ready for MI vs CSK — check your score!" | → Match leaderboard |
| `join_request` | New join request | "{name} wants to join {gang}" | → Gang page (pending requests) |
| `join_approved` | You're in! | "Your request to join {gang} was approved" | → Gang page |
| `join_rejected` | Request declined | "Your request to join {gang} was declined" | → Dashboard |
| `new_member` | New member joined | "{name} joined {gang}" | → Gang page |
| `gang_deleted` | Gang deleted | "{gang} has been deleted" | → Dashboard |
| `admin_promoted` | You're now admin | "You've been promoted to admin of {gang}" | → Gang page |

**Permission flow:**
- Do NOT prompt on first launch
- Prompt after first meaningful action (first prediction submitted or first gang joined)
- Soft prompt: bottom sheet explaining value ("Get notified when predictions are closing or results drop")
- "Enable" → trigger OS permission dialog
- "Not now" → dismiss, re-prompt after 7 days
- If OS permission denied → show hint in Settings on how to re-enable

**Token management:**
- Register token on permission grant
- Refresh token on app launch (FCM tokens rotate)
- Delete tokens on sign out or account deletion
- Support multiple devices per user
- Clean up stale tokens when push delivery fails

**Delivery architecture:**
- Supabase Database Webhook on `v2_notifications` INSERT → Edge Function `send-push-notification`
- Edge Function: look up user's FCM tokens → send via FCM HTTP v1 API
- On token error: delete stale token from `v2_push_tokens`

#### 4.8.2 In-App Notification Center

- **Bell icon** in app bar with unread count badge (red, max "99+")
- Tap → full-screen notification list (not side panel — better for mobile)
- "Mark all as read" button at top
- Latest 20 notifications, scrollable with pagination (load more)
- Each notification:
  - Type-specific icon (color-coded)
  - Message text
  - Relative timestamp ("2m ago")
  - Unread: bold text + lime left accent
  - Read: normal text + no accent
  - Tap → navigate to relevant page + mark as read
- Real-time: Supabase Realtime subscription updates count instantly
- Badge on app icon (iOS/Android) shows total unread count

**Enhancement — Notification grouping (new):**
- Group notifications by gang (e.g., "3 notifications from Gang X")
- Expandable groups
- Prevents notification fatigue when user is in multiple gangs

### 4.9 Public / Unauthenticated Screens

#### 4.9.1 Welcome Screen (replaces web landing page)

- Bragg logo + wordmark (animated entrance)
- Tagline: "Predict right. Prove it. Bragg."
- Two CTAs: "Create a Gang" and "Join a Gang"
- Both → navigate to login first if unauthenticated
- Subtle background animation (cricket-themed)

#### 4.9.2 Join via Deep Link

- User taps invite link → app opens (or App Store if not installed)
- If unauthenticated: welcome screen with gang name context + "Log in to join {gang}"
- If authenticated: join confirmation screen with gang name + join button
- Handle all states: auto-accept, pending, full, blocked, deleted, already member

#### 4.9.3 Legal Pages

- Privacy Policy and Terms of Service rendered in WebView
- Accessible from: onboarding, settings, profile

### 4.10 Analytics

#### 4.10.1 PostHog (or equivalent mobile analytics)

- Same event taxonomy as web app
- Additional mobile events:
  - `APP_OPENED` (cold start, background resume)
  - `APP_BACKGROUNDED`
  - `PUSH_PERMISSION_PROMPTED`, `PUSH_PERMISSION_GRANTED`, `PUSH_PERMISSION_DENIED`
  - `PUSH_NOTIFICATION_RECEIVED`, `PUSH_NOTIFICATION_TAPPED`
  - `BIOMETRIC_ENROLLED`, `BIOMETRIC_UNLOCKED`, `BIOMETRIC_FAILED`
  - `DEEP_LINK_OPENED` (with source: invite, notification, etc.)
  - `QR_CODE_SCANNED`
  - `SHARE_SHEET_OPENED`, `SHARE_COMPLETED`
- Screen tracking (auto-track screen views)
- Crash reporting integration
- Session tracking (duration, screens visited)

---

## 5. Native-Only Features (Not in Web App)

These are new features that leverage native platform capabilities and aren't possible or practical on the web.

### 5.1 Push Notifications with Rich Content

- **Rich notifications** (iOS): include team badges as notification thumbnails
- **Notification actions** (iOS/Android): "Predict Now" action button on deadline reminders (opens directly to prediction page)
- **Notification channels** (Android): separate channels for predictions, results, gang activity — users can configure notification preferences per channel in OS settings
- **Critical alerts** (iOS, optional): deadline reminders within 30 minutes of deadline bypass Do Not Disturb (requires Apple approval)

### 5.2 Haptic Feedback

- Light haptic on all taps (buttons, selections)
- Medium haptic on prediction pick selection
- Success haptic on prediction submission
- Notification haptic on new notification while app is open
- Error haptic on validation failures

### 5.3 Biometric Authentication

- Face ID (iOS), Touch ID (iOS), Fingerprint (Android), Face Unlock (Android)
- Opt-in after first magic link auth
- Settings toggle to disable
- Fallback to magic link after 3 failed attempts
- Session token stored in biometric-protected keychain/keystore

### 5.4 QR Code Invite Sharing

- Gang admin can show QR code from gang page
- Any user can scan QR to join
- Uses device camera — no external app needed
- QR encodes invite link: `https://bragg.app/join/{code}`

### 5.5 App Icon Badge

- Unread notification count shown on app icon
- Updated when push notification received
- Cleared when user opens notification center and marks all as read

### 5.6 Deep Linking

- Universal links (iOS) + App Links (Android)
- Supported deep links:
  - `bragg.app/join/{code}` → join gang flow
  - `bragg.app/auth/callback?code={code}` → magic link auth
  - `bragg.app/group/{gangId}` → gang page
  - `bragg.app/group/{gangId}/predict/{fixtureId}` → prediction page
  - `bragg.app/group/{gangId}/match/{fixtureId}` → match leaderboard
- Deferred deep linking: if app not installed, redirect to App Store, then resume deep link after install

### 5.7 Share Extensions

- Native share sheet for:
  - Invite links (with custom preview card)
  - Leaderboard share cards (PNG + text)
  - Match results (text summary + link)
- Preview card when sharing to WhatsApp/iMessage/etc. shows Bragg branding

### 5.8 Background App Refresh (Future Enhancement)

- Periodically refresh data in background (iOS Background App Refresh / Android WorkManager)
- Update standings and notification count even when app is not open
- Low priority, battery-conscious
- Not for live score polling (only when app is in foreground)

### 5.9 Match Day Live Activity / Dynamic Island (iOS, Future)

- **Live Activity** on lock screen during live matches
- Shows: team scores, current overs, user's current rank
- Updates via push notification payload (APNs push-to-update)
- **Dynamic Island** compact view: scores only
- Expanded view: scores + rank + correct predictions count
- Starts when match goes live, ends when resolved

### 5.10 Home Screen Widget (Future)

- Small widget: next match time + countdown
- Medium widget: next match teams + time + your gang's prediction status
- Large widget: mini leaderboard for current/last match
- Updated via background refresh
- Tap → deep link to relevant page

---

## 6. Architecture

### 6.1 High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                  Native App                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │   UI      │  │  State   │  │  Services    │  │
│  │  Screens  │←→│ Manage-  │←→│  (API,       │  │
│  │  Widgets  │  │  ment    │  │  Auth,       │  │
│  │           │  │          │  │  Push,       │  │
│  │           │  │          │  │  Storage)    │  │
│  └──────────┘  └──────────┘  └──────┬───────┘  │
│                                      │          │
└──────────────────────────────────────┼──────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                   │
              ┌─────▼─────┐    ┌──────▼──────┐    ┌──────▼──────┐
              │ Supabase   │    │ Supabase    │    │ Firebase    │
              │ Postgres   │    │ Realtime    │    │ Cloud       │
              │ + RLS      │    │ (notif)     │    │ Messaging   │
              │ + RPCs     │    │             │    │             │
              └─────┬──────┘    └─────────────┘    └─────────────┘
                    │
           ┌────────┼────────┐
           │        │        │
     ┌─────▼──┐  ┌──▼────┐  ┌▼──────────┐
     │ Edge   │  │pg_cron│  │ PostHog   │
     │ Funcs  │  │ jobs  │  │ Analytics │
     └────┬───┘  └───────┘  └───────────┘
          │
     ┌────▼──────┐
     │Sportmonks │
     │Cricket API│
     └───────────┘
```

### 6.2 Project Structure (Flutter)

```
lib/
├── main.dart                          # App entry point
├── app.dart                           # MaterialApp, routing, theme
├── config/
│   ├── supabase_config.dart           # Supabase client initialization
│   ├── theme.dart                     # Electric Street design system tokens
│   ├── routes.dart                    # Named routes / GoRouter config
│   └── constants.dart                 # App-wide constants
├── models/                            # Data models (mirroring DB types)
│   ├── profile.dart
│   ├── gang.dart
│   ├── gang_member.dart
│   ├── fixture.dart
│   ├── scenario.dart
│   ├── prediction.dart
│   ├── notification.dart
│   ├── standings.dart
│   └── live_score.dart
├── services/                          # Business logic + API calls
│   ├── auth_service.dart              # Magic link, session, biometric
│   ├── gang_service.dart              # CRUD, join, leave, settings
│   ├── prediction_service.dart        # Submit, fetch, window logic
│   ├── fixture_service.dart           # Upcoming, live, results
│   ├── leaderboard_service.dart       # Match + season standings
│   ├── notification_service.dart      # Fetch, mark read, realtime
│   ├── push_service.dart              # FCM token management, permissions
│   ├── profile_service.dart           # Profile CRUD, stats
│   ├── analytics_service.dart         # PostHog event tracking
│   └── deep_link_service.dart         # Handle incoming deep links
├── providers/                         # State management (Riverpod)
│   ├── auth_provider.dart
│   ├── gang_provider.dart
│   ├── prediction_provider.dart
│   ├── fixture_provider.dart
│   ├── notification_provider.dart
│   ├── leaderboard_provider.dart
│   └── profile_provider.dart
├── screens/                           # Full-screen pages
│   ├── welcome_screen.dart
│   ├── login_screen.dart
│   ├── onboarding_screen.dart
│   ├── accept_terms_screen.dart
│   ├── dashboard_screen.dart
│   ├── gang_screen.dart
│   ├── gang_settings_screen.dart
│   ├── predict_screen.dart
│   ├── match_leaderboard_screen.dart
│   ├── season_standings_screen.dart
│   ├── join_screen.dart
│   ├── profile_screen.dart
│   ├── notification_screen.dart
│   └── settings_screen.dart
├── widgets/                           # Reusable UI components
│   ├── common/                        # Buttons, cards, badges, dialogs
│   ├── gang/                          # Gang card, header, member list
│   ├── match/                         # Match card, live scorecard
│   ├── prediction/                    # Scenario card, pickers
│   ├── leaderboard/                   # Leaderboard row, share card
│   └── notification/                  # Notification item, badge
└── utils/
    ├── date_utils.dart                # Timezone, formatting
    ├── validators.dart                # Input validation
    ├── haptics.dart                   # Haptic feedback helper
    └── share_utils.dart               # Native share sheet helper
```

### 6.3 State Management

**Recommendation: Riverpod** (for Flutter) or **Zustand/TanStack Query** (for React Native)

**Principles:**
- **Server state vs client state:** Supabase data is server state — cache it, poll it, invalidate it. UI state (form inputs, bottom sheet open/closed) is ephemeral client state.
- **Optimistic updates:** Mark notification as read instantly, revert on error. Same pattern as web app.
- **Polling:** Live scores (15s), leaderboards (30s) — only when screen is visible. Pause on background.
- **Realtime:** Notifications via Supabase Realtime channel subscription. Same as web.
- **Cache invalidation:** After mutations (submit prediction, join gang, etc.), invalidate relevant providers.

### 6.4 Navigation

**Recommendation: GoRouter** (Flutter) or **Expo Router** (React Native)

**Route structure:**
```
/                           → Welcome (unauthenticated) / Dashboard (authenticated)
/login                      → Login
/onboarding                 → Onboarding
/accept-terms               → Terms acceptance
/dashboard                  → Gang list
/join/:code                 → Join gang
/group/:gangId              → Gang page
/group/:gangId/settings     → Gang settings (admin)
/group/:gangId/standings    → Season standings
/group/:gangId/predict/:id  → Prediction form
/group/:gangId/match/:id    → Match leaderboard
/profile                    → Profile
/settings                   → App settings
/notifications              → Notification list
```

**Auth guard:** Route middleware checks auth state. Unauthenticated users redirected to `/login`. Unboarded users redirected to `/onboarding`.

### 6.5 Supabase Client

- Use `supabase_flutter` package (official)
- Initialize in `main.dart` with project URL + anon key
- Same RLS, same queries, same RPCs as web app
- Auth: `supabase.auth.signInWithOtp(email)` + deep link callback
- Realtime: `supabase.channel('notifications').onPostgresChanges(...)` — same subscription pattern
- Storage: not currently used, but available for future avatar uploads

### 6.6 Offline Support

**Level 1 (MVP):**
- Cache last-fetched data in local storage (SQLite/Hive)
- Show cached data when offline with "Offline — data may be outdated" banner
- Queue mutations (prediction submissions) and retry when back online
- Disable prediction form if offline (predictions require server-side validation)

**Level 2 (Future):**
- Full offline-first architecture with conflict resolution
- Not needed for MVP — cricket prediction is inherently online (time-sensitive)

### 6.7 Security

- **No secrets in app bundle.** Supabase anon key is public (RLS enforces access control). Firebase config values are public.
- **Auth tokens** stored in platform-secure storage (iOS Keychain, Android EncryptedSharedPreferences)
- **Certificate pinning** for Supabase API calls (prevents MITM)
- **Root/jailbreak detection** — warn but don't block (not a banking app)
- **No local data encryption** beyond platform defaults — all sensitive data lives server-side behind RLS
- **Rate limiting** enforced server-side (same as web app)

---

## 7. Design System Adaptation

The Electric Street design system translates directly to native with minor platform adaptations.

### 7.1 Colors (Unchanged)

| Role | Name | Hex |
|------|------|-----|
| Primary | Bragg Lime | #C8E64A |
| Primary Dark | Lime Shade | #A8C42A |
| Destructive | Electric Coral | #FF6B6B |
| Info | Vivid Blue | #4F7DF9 |
| Achievement | Sunburst Yellow | #FFD93D |
| Special | Ultraviolet | #8B5CF6 |
| Background | Concrete Black | #111111 |
| Surface 1 | Dark Concrete | #1A1A1A |
| Surface 2 | Mid Concrete | #242424 |
| Surface 3 | Light Concrete | #2E2E2E |
| Border | Wire | #333333 |
| Text Primary | Pure White | #FFFFFF |
| Text Secondary | Warm Grey | #A3A3A3 |

### 7.2 Typography

| Style | Font | Size | Weight |
|-------|------|------|--------|
| Display | Space Grotesk | 44px | 700, uppercase |
| H1 | Space Grotesk | 34px | 700, uppercase |
| H2 | Space Grotesk | 26px | 700, uppercase |
| H3 | Space Grotesk | 20px | 600 |
| Body | DM Sans | 16px | 400 |
| Body Small | DM Sans | 14px | 400 |
| Caption | DM Sans | 12px | 500, uppercase |
| Stat | Space Grotesk | 28px | 700 |

### 7.3 Platform Adaptations

| Web Pattern | Native Adaptation |
|-------------|-------------------|
| Side panel (Sheet) | Bottom sheet |
| Hover states | Press states (with haptic) |
| Page transitions | Slide/fade transitions (platform default) |
| Scroll | Native scroll physics (iOS bounce, Android overscroll) |
| Toast (Sonner) | SnackBar / native toast |
| Dialog | Native dialog with dark theme |
| Input | Native input with dark theme |
| Safe area insets | `SafeArea` widget / `useSafeAreaInsets()` |
| `navigator.share()` | Native share sheet (UIActivityViewController / Android Intent) |
| Skeleton loading | Shimmer effect (native pattern) |

### 7.4 Status Bar & Navigation Bar

- Status bar: light content (white text) on dark background
- Navigation bar (Android): dark themed, matches app background
- No system navigation bar on iOS (gesture navigation)
- App should extend behind status bar (immersive dark header)

---

## 8. Backend Changes Required

### 8.1 New Table: `v2_push_tokens`

```sql
CREATE TABLE v2_push_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES v2_profiles(id) ON DELETE CASCADE,
  token       TEXT        NOT NULL,
  platform    TEXT        NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_label TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

CREATE INDEX idx_push_tokens_user ON v2_push_tokens(user_id);

-- RLS
ALTER TABLE v2_push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tokens" ON v2_push_tokens
  FOR ALL USING (auth.uid() = user_id);
```

### 8.2 New Edge Function: `send-push-notification`

- Triggered by Database Webhook on `v2_notifications` INSERT
- Looks up user's FCM tokens from `v2_push_tokens`
- Sends push via FCM HTTP v1 API
- Handles token errors (delete stale tokens)
- Constructs notification title/body based on notification type + metadata

### 8.3 New Column: `v2_profiles.avatar_color`

```sql
ALTER TABLE v2_profiles ADD COLUMN avatar_color TEXT DEFAULT '#C8E64A';
```

### 8.4 Deep Link Configuration

- Configure universal links (iOS) and app links (Android) in Supabase Auth settings
- Update magic link redirect URL to support app deep links
- Add app-specific redirect handling in auth callback

### 8.5 No Other Backend Changes

The existing Supabase backend (schema, RLS, RPCs, Edge Functions, cron jobs) works for the native app without modification. The native app uses the same Supabase client SDK and talks to the same Postgres database with the same RLS policies.

---

## 9. Improvements & Future-Proofing Recommendations

### 9.1 Architecture Improvements

| Area | Current State | Recommendation | Impact |
|------|--------------|----------------|--------|
| **DAL duplication** | `useMatchLeaderboard` hook duplicates server DAL query | Create a Postgres RPC `get_match_leaderboard(gang_id, fixture_id)` that both web and native call. Single source of truth. | Eliminates drift risk, works for native without porting DAL |
| **Rate limiting** | In-memory LRU (web) + DB table (unused) | Move to atomic Postgres RPC (`increment_and_check_rate_limit`) — works for both web and native without porting in-memory logic. | Multi-client consistency, no duplication |
| **Prediction visibility** | Complex RLS policy with deadline logic | Add a Postgres RPC `get_fixture_predictions(gang_id, fixture_id)` that handles visibility rules in SQL. Clients just call the RPC. | Simpler client code, visibility logic in one place |
| **Real-time leaderboard** | Client-side polling (30s) | Consider Supabase Realtime on `v2_gang_fixture_standings` for live matches. Reduce polling, get instant updates on scenario resolution. | Better UX, less server load, same result on web + native |
| **Server actions → RPCs** | Business logic split between Next.js server actions and Postgres RPCs | For operations that native needs, ensure logic lives in Postgres RPCs (not Next.js server actions). The native app can't call Next.js server actions. | Shared business logic across web + native |

### 9.2 Data Layer Consolidation

**Critical recommendation:** Move more business logic from Next.js server actions into Postgres RPCs. Server actions are Next.js-specific — the native app can't use them. Every server action that does more than "validate + call Supabase" needs an equivalent RPC.

**Actions that need RPCs:**

| Server Action | Current Logic | RPC Needed |
|--------------|---------------|------------|
| `submitPredictions` | Rate limit → validate picks → check window → upsert predictions | `submit_predictions(gang_id, fixture_id, picks JSONB)` — move validation + upsert into atomic RPC |
| `joinGangByCode` | Rate limit → validate code → check membership → check name uniqueness → insert member → notify | `join_gang_by_code(invite_code, user_id)` — move all checks into atomic RPC |
| `updateDisplayName` | Rate limit → check uniqueness → update profile → revalidate | `update_display_name(new_name)` — move uniqueness check into RPC |
| `approveJoinRequest` | Check admin → update status → notify | Already simple enough for direct Supabase update + RPC notification |
| `rejectJoinRequest` | Check admin → update status → notify | Same as above |
| `removeMember` | Check admin → update status | Direct Supabase update |
| `blockMember` | Check admin → update status | Direct Supabase update |
| `leaveGang` | Update own status | Direct Supabase update |
| `updateGangSettings` | Check admin → update gang | Direct Supabase update |

### 9.3 Multi-Sport Future-Proofing

The schema already supports multi-sport (v2_sports, v2_leagues, v2_seasons are generic). To prepare for post-IPL expansion:

- **Scenario templates per sport/league** — `v2_scenario_templates` should have a `sport_id` or `league_id` column (currently assumes IPL scenarios globally)
- **Resolution logic per sport** — the Edge Function `live-poll-resolve-fixtures` is IPL-specific. Abstract resolution extractors into per-sport modules.
- **Team colors/branding** — `v2_league_teams` should have `primary_color` and `secondary_color` columns for franchise theming
- **Sport-specific scorecard** — the live scorecard widget is cricket-specific. Design a pluggable scorecard interface per sport.

### 9.4 Social Features (Future Roadmap)

| Feature | Description | Priority |
|---------|-------------|----------|
| **In-gang chat** | Lightweight chat within gang, tied to match context. Not a full messaging platform — short, match-day banter. | Medium |
| **Reactions on predictions** | Emoji reactions on other members' predictions after reveal (😂, 🔥, 💀). | Medium |
| **Weekly digest** | Push notification summarizing weekly performance: rank changes, best/worst predictions, upcoming matches. | Low |
| **Prediction streaks** | Track consecutive correct predictions per scenario type. Show streak badges. | Low |
| **Head-to-head** | Compare predictions and performance between two members across all matches. | Low |
| **Season awards** | End-of-season awards: most accurate, most consistent, biggest upset caller, worst predictor. | Medium |

### 9.5 Performance & Reliability

| Area | Recommendation |
|------|---------------|
| **Live score polling** | Move from client polling (15s) to server-sent events or Supabase Realtime on `v2_fixture_live_scores`. Reduces unnecessary network requests when scorecard hasn't changed. |
| **Prediction form** | Pre-fetch scenario data and player lists when user navigates to gang page (before they tap "Predict"). Eliminates loading time on prediction page. |
| **Image caching** | Cache team badge images locally. They rarely change. |
| **Startup time** | Show cached dashboard data immediately, then refresh in background. Target <2s cold start to interactive content. |
| **Error recovery** | Automatic retry with exponential backoff for failed API calls. Show "Retry" button after 3 failures. |

### 9.6 Accessibility

- VoiceOver (iOS) and TalkBack (Android) support for all screens
- Minimum 44x44pt touch targets
- Dynamic type support (respect system font size)
- Color contrast: all text meets WCAG AA (already achieved by Electric Street palette on dark backgrounds)
- Screen reader announcements for live score updates and rank changes
- Reduce motion: honor system "Reduce Motion" preference

### 9.7 Monetization Considerations (Future)

No monetization at launch. But to avoid architectural rework later, consider:

- **User tiers table** — schema slot for `v2_user_subscriptions` if premium features are added
- **Feature flags** — a simple feature flag system (DB table or remote config) to gate features per user/gang
- **Analytics foundation** — track engagement metrics that matter for monetization decisions (DAU, MAU, prediction frequency, session duration, share rate)

**Potential monetization paths** (no decision needed now):
- Premium gangs (more than 20 members, custom scenarios)
- Cosmetic customization (avatar frames, gang themes)
- Ad-supported free tier with ad-free premium
- Multi-league access (free = 1 league, premium = all leagues)

---

## 10. Implementation Roadmap

### Phase 0: Foundation (2-3 weeks)

| Story | Description |
|-------|-------------|
| N-001 | Flutter project setup: folder structure, linting, CI/CD pipeline, env config |
| N-002 | Supabase client integration: auth, database, realtime, storage |
| N-003 | Design system implementation: theme, colors, typography, base components (buttons, cards, inputs, dialogs, badges, avatars, bottom sheets) |
| N-004 | Navigation setup: GoRouter, auth guard, deep link handling |
| N-005 | Analytics integration: PostHog SDK, screen tracking, event helpers |
| N-006 | Secure storage: keychain/keystore for auth tokens |

### Phase 1: Auth & Onboarding (1-2 weeks)

| Story | Description |
|-------|-------------|
| N-101 | Welcome screen: logo, tagline, create/join CTAs |
| N-102 | Login screen: email input, magic link send, confirmation state, resend |
| N-103 | Magic link deep link handling: intercept callback URL, exchange code, redirect |
| N-104 | Onboarding screen: display name, DOB picker, terms acceptance |
| N-105 | Accept terms screen: version detection, blocking flow |
| N-106 | Sign out: clear session, clear storage, navigate to welcome |

### Phase 2: Dashboard & Gangs (2 weeks)

| Story | Description |
|-------|-------------|
| N-201 | Dashboard screen: gang list, pull-to-refresh, empty state |
| N-202 | Gang card widget: name, member count, role badge, next match info |
| N-203 | Create gang bottom sheet: name input, create flow |
| N-204 | Join gang bottom sheet: code input, join flow, state handling |
| N-205 | Join via deep link: handle `/join/{code}` deep links |
| N-206 | Pending invite banner: deep link context persistence |

### Phase 3: Gang Page (2-3 weeks)

| Story | Description |
|-------|-------------|
| N-301 | Gang page layout: header, sections, scroll |
| N-302 | Gang header: name, member count, share invite, navigation links |
| N-303 | Invite sharing: native share sheet, copy link with haptic |
| N-304 | Pending join requests: admin section with approve/reject |
| N-305 | Upcoming matches: next 3 fixtures, match cards, prediction status, avatar pills |
| N-306 | Live matches: scorecard with 15s polling, batsmen, bowler, partnership, stale indicator |
| N-307 | Recent results: last 3 completed matches, user summary, status badges |
| N-308 | Member list: sorted by season points, avatar + name + role + points |
| N-309 | Leave gang: type-to-confirm dialog |

### Phase 4: Predictions (2 weeks)

| Story | Description |
|-------|-------------|
| N-401 | Prediction page layout: match header, status bar, scenario list |
| N-402 | Scenario card widget: title, points badge, picker, check indicator |
| N-403 | Team picker: two tappable team badges with haptic |
| N-404 | Player picker: searchable bottom sheet, two-tab layout |
| N-405 | Range picker: horizontal chip group with haptic |
| N-406 | Yes/No picker: two toggle buttons with haptic |
| N-407 | Sticky submit bar: progress counter, submit button, loading/success states |
| N-408 | Prediction window logic: open/locked/not-yet states, countdown |
| N-409 | Edit predictions: pre-populate saved picks, re-submit flow |

### Phase 5: Leaderboards (2 weeks)

| Story | Description |
|-------|-------------|
| N-501 | Match leaderboard page: header, scorecard, gated content |
| N-502 | Leaderboard table: rank, name, correct/predicted, points, polling |
| N-503 | Prediction reveal: member × scenario matrix, correct/incorrect indicators |
| N-504 | Leaderboard share card: PNG generation, native share |
| N-505 | Season standings page: season selector, ranked list, stats |
| N-506 | Rank change animations: slide transitions on poll update |

### Phase 6: Gang Management & Profile (1-2 weeks)

| Story | Description |
|-------|-------------|
| N-601 | Gang settings: name edit, auto-accept toggle, deadline config |
| N-602 | Member management: remove/block/unblock with confirmations |
| N-603 | Delete gang: type-to-confirm, destructive action |
| N-604 | Profile page: avatar, name edit, email, DOB, stats |
| N-605 | Display name update: inline edit, cross-gang uniqueness |
| N-606 | Account deletion: type-to-confirm, atomic RPC |
| N-607 | App settings: notifications toggle, biometric toggle, about, legal |

### Phase 7: Notifications & Push (2 weeks)

| Story | Description |
|-------|-------------|
| N-701 | Notification bell: badge count, tap to open list |
| N-702 | Notification list screen: items, mark read, type icons, timestamps |
| N-703 | Supabase Realtime subscription: live notification updates |
| N-704 | Push notification setup: FCM integration, token registration |
| N-705 | Push permission flow: soft prompt, OS dialog, cooldown |
| N-706 | Push delivery: Database Webhook → Edge Function → FCM |
| N-707 | Push tap handling: deep link to relevant screen |
| N-708 | Token lifecycle: refresh, cleanup, multi-device |

### Phase 8: Native Enhancements (1-2 weeks)

| Story | Description |
|-------|-------------|
| N-801 | Biometric auth: enrollment, unlock, settings toggle, fallback |
| N-802 | QR code invite: generate + scan |
| N-803 | Haptic feedback: light/medium/success/error across all interactions |
| N-804 | App icon badge: unread count on home screen icon |
| N-805 | Offline mode: cache last data, offline banner, retry on reconnect |

### Phase 9: Polish & Launch (2 weeks)

| Story | Description |
|-------|-------------|
| N-901 | App Store assets: icon, screenshots, description, keywords, privacy labels |
| N-902 | Play Store assets: icon, screenshots, description, feature graphic, privacy policy |
| N-903 | Performance audit: cold start time, scroll performance, memory usage |
| N-904 | Accessibility audit: VoiceOver/TalkBack, touch targets, dynamic type |
| N-905 | Crash reporting: Crashlytics or Sentry integration |
| N-906 | Beta testing: TestFlight (iOS), Internal Testing (Android) |
| N-907 | Launch: App Store + Play Store submission, review, release |

### Post-Launch (Backlog)

| Story | Description | Priority |
|-------|-------------|----------|
| N-P01 | Live Activity / Dynamic Island (iOS) | Medium |
| N-P02 | Home screen widget | Medium |
| N-P03 | In-gang reactions on predictions | Low |
| N-P04 | Head-to-head comparison | Low |
| N-P05 | Weekly digest push notification | Low |
| N-P06 | Avatar customization (color picker) | Low |
| N-P07 | Instagram/WhatsApp Stories share format | Medium |
| N-P08 | Prediction streaks | Low |
| N-P09 | Season awards | Medium |
| N-P10 | Background app refresh | Low |

---

## 11. Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| **App Store rating** | ≥ 4.5 stars | App Store Connect / Play Console |
| **Install → first prediction** | ≥ 40% conversion | PostHog funnel |
| **Push notification opt-in** | ≥ 60% of users | `PUSH_PERMISSION_GRANTED` / total users |
| **DAU during IPL** | ≥ 70% of registered users | PostHog DAU |
| **Prediction participation** | ≥ 80% of gang members predict per match | predictions / (members × fixtures) |
| **Cold start time** | < 2 seconds | Performance monitoring |
| **Crash-free rate** | ≥ 99.5% | Crashlytics / Sentry |
| **Share rate** | ≥ 20% of resolved matches trigger a share | `LEADERBOARD_SHARE_COMPLETED` / resolved fixtures viewed |

---

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **App Store review rejection** | Delays launch | Submit early with minimal viable features. Ensure compliance with gambling/contest guidelines (no real money, clear "bragging rights only" messaging). |
| **Magic link reliability on mobile** | Users can't log in if email app doesn't handle deep links | Support both custom URL scheme (`bragg://`) and universal links. Test with Gmail, Outlook, Yahoo, Apple Mail. Provide manual code entry fallback. |
| **Supabase SDK compatibility** | Breaking changes in `supabase_flutter` | Pin SDK versions. Follow Supabase release notes. Keep upgrade path tested. |
| **Battery drain from polling** | Users uninstall | Pause all polling when app backgrounded. Use efficient polling intervals (15s scores, 30s leaderboard only during live matches). |
| **Push notification fatigue** | Users disable push | Smart notification throttling: max 5 pushes per match. Group notifications. Respect OS notification channels. |
| **Cross-platform UI inconsistency** | Confusing UX | Flutter's own rendering engine ensures consistency. Test on both platforms per feature. |
| **Dart learning curve** | Slower development | Allocate 1 week for team ramp-up. Dart is similar to TypeScript/Java. |
| **Backend logic in server actions** | Can't reuse from native | Migrate critical logic to Postgres RPCs before native app development (see Section 9.2). |

---

## Appendix A: Backend RPC Migration Checklist

Before starting native app development, these Postgres RPCs should be created to consolidate logic currently in Next.js server actions:

- [ ] `submit_predictions(gang_id UUID, fixture_id UUID, picks JSONB)` — atomic prediction upsert with validation
- [ ] `join_gang_by_code(invite_code TEXT)` — full join flow with all checks
- [ ] `update_display_name(new_name TEXT)` — cross-gang uniqueness check + update
- [ ] `increment_and_check_rate_limit(action TEXT, max_count INT, window_seconds INT)` — atomic rate limiting
- [ ] `get_match_leaderboard(gang_id UUID, fixture_id UUID)` — single source of truth for leaderboard data
- [ ] `get_fixture_predictions(gang_id UUID, fixture_id UUID)` — prediction reveal with visibility rules
- [ ] `get_user_stats(user_id UUID)` — aggregated profile stats across all gangs

---

## Appendix B: Deep Link Matrix

| Link Pattern | Source | App Behavior |
|-------------|--------|-------------|
| `bragg.app/join/{code}` | Invite share | Auth check → join flow |
| `bragg.app/auth/callback?code={code}` | Magic link email | Exchange code → session → redirect |
| `bragg.app/group/{gangId}` | Notification tap, share | Navigate to gang page |
| `bragg.app/group/{gangId}/predict/{fixtureId}` | Deadline reminder push | Navigate to prediction page |
| `bragg.app/group/{gangId}/match/{fixtureId}` | Results available push | Navigate to match leaderboard |
| `bragg.app/dashboard` | Gang deleted push | Navigate to dashboard |

---

## Appendix C: Notification Channel Configuration (Android)

| Channel ID | Channel Name | Importance | Sound | Vibration |
|-----------|-------------|-----------|-------|-----------|
| `predictions` | Predictions | High | Default | Yes |
| `results` | Match Results | High | Default | Yes |
| `gang_activity` | Gang Activity | Default | Default | No |
| `system` | System | Low | None | No |

| Notification Type | Channel |
|-------------------|---------|
| `deadline_reminder` | predictions |
| `results_available` | results |
| `join_request` | gang_activity |
| `join_approved` | gang_activity |
| `join_rejected` | gang_activity |
| `new_member` | gang_activity |
| `gang_deleted` | system |
| `admin_promoted` | gang_activity |
