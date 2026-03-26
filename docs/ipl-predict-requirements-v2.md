# IPL Predict — Product Requirements Document v2

## Overview

A social prediction game for IPL 2026 where friends create private groups, submit structured + custom match predictions, and compete on live leaderboards throughout the season.

**Goal:** Ship fast, keep it fun, proper auth, admin-controlled groups.

---

## Core User Flow

1. User lands on homepage → clicks "Create a Group" or "Join with Code"
2. Redirected to login → enters **name + email** → receives **magic link** via email
3. Clicks magic link → authenticated → redirected to dashboard (or join page)
4. **Creating a group:** names it, gets invite link, auto-added as admin (approved)
5. **Joining a group:** opens invite link → signs in → request goes to **pending** → admin approves → member gains access
6. Before each match, system scenarios (winner, toss, etc.) are auto-seeded. Any approved member can **add custom scenarios** (e.g., "Kohli scores 50+")
7. Admin can **remove any scenario** and **set/override the prediction deadline** (defaults to toss time)
8. Members submit picks before deadline. **During the match**, the live leaderboard updates every minute — showing confirmed correct/wrong picks and "on track" indicators
9. After match, final resolution scores all remaining scenarios. Leaderboards update: per-match results + cumulative season standings

---

## Authentication

- **Supabase Magic Link** (built-in OTP via email)
- User provides: **display name** + **email**
- On first sign-in, a `profiles` row is auto-created via database trigger
- No password, no OAuth for v1
- Session managed via Supabase cookies + Next.js middleware
- Protected routes: `/dashboard`, `/group/*`

---

## Group Membership (Admin Approval)

| Action | Who | Result |
|--------|-----|--------|
| Create group | Any authenticated user | Creator = **owner** + auto-approved member |
| Share invite link | Anyone with the link | Link format: `app.com/join/{invite_code}` |
| Request to join | Any authenticated user via invite link | Status = **pending** |
| Approve member | Any admin | Status → **approved**, can now predict |
| Reject member | Any admin | Status → **rejected** |
| Remove member | Any admin | Status → **removed** |
| Promote to co-admin | Owner or existing admin | Role → **admin** (can approve/reject, resolve scenarios, set deadlines) |
| Demote admin | Owner only | Role → **member** |
| Re-request after rejection | The rejected user | Status → **pending** again |

**Roles:**

- **Owner:** the group creator. Has all admin powers plus can promote/demote admins. Cannot be demoted. One per group.
- **Admin:** can approve/reject members, remove scenarios, resolve custom scenarios, set deadline overrides. Multiple admins per group.
- **Member:** can submit predictions, add custom scenarios (subject to admin approval), view leaderboards.

- Pending members see a "waiting for approval" screen
- Admins see a notification/badge for pending requests
- Only **approved** members (including admins and owner) can view scenarios, submit predictions, and see leaderboards

### Multi-Group Support

A user can join multiple groups and admin multiple groups simultaneously. This is a core design principle, not an edge case.

**Predictions are independent per group.** A user can pick CSK in their office group and MI in their college group for the same match. Predictions are tied to group-specific scenarios, so there's no conflict.

**UX implications:**

- **Live match group switcher:** During a match, users need a quick tab bar or dropdown showing each group they're in with their current rank — e.g., "Office Gang (2nd) | College Boys (1st) | Family (4th)". One tap switches the leaderboard.
- **Prediction copying:** Filling 16 scenarios × 3 groups = 48 picks is tedious. Offer a "Copy picks from [Group X]" shortcut when submitting for a second group, with the option to tweak individual picks before confirming.
- **Unified admin dashboard:** An admin of multiple groups sees a single pending approvals view — "3 pending in Office Gang, 1 pending in Family" — not buried inside each group. Co-admins within a group share the approval workload.
- **Notifications:** "Predictions open for CSK vs MI" notification should list all groups the user is in for that match, not send separate notifications per group.

**Technical implications:**

- API polling is global, not per-group. One scorecard fetch per match resolves scenarios across ALL groups simultaneously. 100 groups watching the same match = same ~210 API calls as 1 group.
- Supabase Realtime subscriptions must be filtered per group (`group_id = currentGroupId`) to avoid receiving updates from all groups at once.
- Custom scenario resolution is per-group — any admin in the group can resolve custom scenarios. System scenarios auto-resolve across all groups in one cron pass.

### Group Lifecycle & Season Persistence

**Groups are permanent.** They persist from creation through the entire IPL season and beyond. Nothing is deleted or reset after a match. Members stay, leaderboards accumulate, and the full prediction history is retained.

**Season standings are the retention hook.** Individual match results are fun, but the season-long leaderboard — "I'm 3rd overall but only 15 points behind 1st with 12 matches left" — is what keeps users coming back for 70+ matches.

**Post-season, the group and all data remain** as a historical record. The group can carry over to future tournaments (T20 World Cup, next IPL) if the app expands — the schema supports this since scenarios are linked to matches, not hardcoded to IPL.

### Season Summary (Post-IPL)

When the IPL season ends, each group gets a Season Summary card with:

- **Season Champion** — #1 on the leaderboard with total points and accuracy %
- **Most Accurate Predictor** — highest accuracy % (minimum threshold of matches predicted)
- **Best Single Match** — who scored the most points in a single match
- **Bold Predictor Award** — most correct underdog/unlikely picks
- **Consistency King** — most matches where the user scored above group average
- **Participation Award** — who predicted the most matches (engagement metric)

This card is shareable as an image for WhatsApp/Instagram stories — end-of-season virality moment.

---

## Scenarios (System + Custom)

### System Scenarios (auto-seeded per group per match)

| Category | Input Type | Points | Auto-Scorable | Resolves |
|----------|-----------|--------|----------------|----------|
| Match Winner | Pick team | 10 | Yes | End of match |
| Toss Winner | Pick team | 5 | Yes | Toss |
| Top Scorer | Pick player | 15 | Yes | End of match |
| Top Wicket-Taker | Pick player | 15 | Yes | End of match |
| Total Match Runs | Range bracket | 10 | Yes | End of match |
| First Innings Score | Range bracket | 10 | Yes | Innings break |
| Player of the Match | Pick player | 20 | Yes | Post-match |
| Powerplay Score (batting first) | Range: <40, 40-55, 55-70, 70+ | 10 | Yes | Over 6 |
| Wickets in Powerplay | 0, 1, 2, 3+ | 10 | Yes | Over 6 |
| Will Any Batsman Score 50+? | Yes / No | 10 | Yes | Mid-match onwards |
| Total 6s in Match | Range: <15, 15-25, 25-35, 35+ | 10 | Yes | End of match (live tracker) |
| Total Wickets in Match | Range: <12, 12-15, 15-18, 18+ | 10 | Yes | End of match (live tracker) |
| Will Any Bowler Take 3+ Wickets? | Yes / No | 10 | Yes | Mid-match onwards |
| Super Over? | Yes / No | 25 | No | End of match |
| Most Sixes | Pick player | 10 | No | End of match |
| First Wicket Over | Pick over 1-6 | 10 | No | First wicket falls |

**16 system scenarios per match.** 13 are auto-scorable from the `/match_scorecard` response. 3 remain admin-manual (super over, most sixes player, first wicket over — the latter could be auto-resolved from fall-of-wickets data if reliable).

**Point values across the app are restricted to: 5, 10, 15, 20, or 25.** This applies to both system and custom scenarios. No arbitrary values allowed.

### Resolution Cadence During a Live Match

This is designed so the leaderboard moves at every phase of the game:

| Match Phase | Scenarios That Resolve | ~When |
|-------------|----------------------|-------|
| Toss | Toss Winner | Pre-match |
| First wicket | First Wicket Over | Overs 1-6 usually |
| End of powerplay (over 6) | Powerplay Score, Wickets in Powerplay | ~25 min in |
| Mid-match | Will Any Batsman Score 50+?, Will Any Bowler Take 3+ Wickets? | ~1-2 hrs in |
| Innings break | First Innings Score | Halfway |
| End of match | Match Winner, Top Scorer, Top Wicket-Taker, Total Match Runs, Total 6s, Total Wickets, Most Sixes, Super Over | Final ball |
| Post-match | Player of the Match | After presentation |

Running trackers (Total 6s, Total Wickets) update the "on track" / "in danger" indicators every minute throughout.

System scenarios are seeded when the first member opens the prediction page for a match (via `seed_system_scenarios()` DB function). All 16 are created per group per match.

### Custom Scenarios (member-created)

- Any **approved member** can propose a custom scenario for an upcoming match
- Creator specifies: **title**, **options** (2+ choices), and **suggested points**
- Points must be one of: **5, 10, 15, 20, or 25** — no arbitrary values allowed
- Examples: "Kohli scores 50+", "CSK wins by 20+ runs", "First boundary is a six"
- **Admin approval required:** custom scenarios go to admin who can approve (with option to adjust points), or reject. This prevents leaderboard gaming.
- Admin can **soft-delete** (remove) any scenario — system or custom — at any time
- Custom scenarios are resolved **manually** by an admin after the match
- There is **no minimum or maximum** number of scenarios per match. System scenarios are auto-seeded (16), and members can add as many custom scenarios as they want (subject to admin approval)

### Prediction Submission

- Users can **submit any subset** of the available scenarios — no requirement to answer all 16+
- Unanswered scenarios show as **"Not Predicted"** on the leaderboard and score 0 (no penalty)
- **Quick Predict mode:** a simplified view showing only the 5 easiest scenarios (Match Winner, Toss Winner, First Innings Score, Total Match Runs, Total 6s) for casual users who don't want to fill all 16
- Users can **freely edit** their predictions until the deadline. The prediction form shows their previous picks with a "Last updated X min ago" timestamp. No change limits.

### Prediction Deadline

- **Default:** 45 minutes before scheduled match start time (reliable, published in advance — avoids dependency on unpredictable toss timing)
- **Admin override:** can set a custom deadline per match via `match_group_settings`
- **Admin manual lock:** can instantly lock predictions regardless of deadline
- **Auto-lock:** the cron auto-locks when match status changes to "live" — catches late starts, rain delays, etc.
- Late submissions are rejected at server level (checked against deadline + match status)

### Abandoned / No-Result Matches

- If a match is **abandoned after play started** (e.g., rain during the match): predictions that were already resolved stay resolved and count. Unresolved scenarios are voided (0 points, not counted in accuracy %).
- If a match **never starts** (abandoned before first ball): all predictions for that match are discarded entirely. The match is excluded from season standings calculations.
- Match status enum includes: `upcoming | live | completed | abandoned | no_result`

---

## Mid-Season Joiners

When a member joins a group mid-season (e.g., week 4 of IPL), they start at 0 points while others may have 200+. To keep them engaged:

- **"Joined in Match X" badge** on the season standings next to their name
- **"Points per match predicted" column** alongside total points — this normalizes for late joiners and shows who's actually performing best per match
- Late joiners can't retroactively predict past matches — they start competing from the next upcoming match

---

## Group Home States

The group page adapts based on whether a match is happening:

**State 1 — "Next match in X hours" (default, most of the day)**
- Countdown timer to next match with teams displayed
- CTA: "Submit your predictions" (or "Edit your predictions" if already submitted)
- Current season standings below
- Recent match recap card (last match result + who won the most points)

**State 2 — "Match is live"**
- Live leaderboard front and center with scenario indicators updating every minute
- Match score ticker at the top (from cached scorecard snapshot)
- Predictions locked indicator

**State 3 — "No upcoming match today"**
- Last match recap card with full picks vs results breakdown
- Season standings
- "Next match: [Team] vs [Team] on [Date]" with prediction CTA if within deadline window

---

## Live Leaderboard (During Match)

The headline feature: during a live match, users see a group leaderboard that updates approximately every minute, showing which predictions are confirmed correct, which are busted, and which are still alive.

### How It Works

1. **Supabase Edge Function cron** polls `/match_scorecard` once per minute during match hours
2. Cron parses the scorecard and **progressively resolves scenarios** as data becomes available (toss → first wicket → innings break → final result)
3. Each resolved scenario updates `predictions.is_correct` and `predictions.points_earned` in the database
4. **Supabase Realtime** is enabled on the `predictions` table — any row update triggers a push to subscribed clients
5. Frontend subscribes to Realtime on the group's predictions. When points change, the leaderboard component re-renders automatically

### Leaderboard States

**Pre-Match:** Shows who has submitted predictions (count only, picks hidden to prevent copying)

**During Match — Scenario Status per User:**

| State | Indicator | Meaning |
|-------|-----------|---------|
| ✅ Correct | Green check + points | Scenario resolved, prediction was right |
| ❌ Wrong | Red cross + 0 pts | Scenario resolved, prediction was wrong |
| 🟡 On Track | Yellow dot | Current match data favours this pick |
| 🔴 In Danger | Red dot | Current data goes against this pick |
| ⏳ Pending | Grey dot | Not enough data yet to evaluate |

**When each scenario updates during a live match:**

| Phase | Scenarios | Leaderboard Effect |
|-------|-----------|-------------------|
| Toss (~7 PM) | Toss Winner → ✅/❌ | First points awarded, board comes alive |
| Overs 1-6 (~7:30 PM) | First Wicket Over → ✅/❌, Powerplay Score → ✅/❌, Wickets in Powerplay → ✅/❌ | Three scenarios resolve in quick succession |
| Mid-match (~8-9 PM) | Batsman 50+ → ✅/❌ when someone hits 50 or all out below, Bowler 3+ Wickets → ✅/❌ when achieved or innings ends | Dramatic moments — a single ball can flip a scenario |
| Running trackers | Total 6s → 🟡/🔴, Total Wickets → 🟡/🔴, Top Scorer → 🟡/🔴, Top Wicket-Taker → 🟡/🔴, Match Winner → 🟡/🔴 | Every minute update shifts "on track" indicators |
| Innings break (~9 PM) | First Innings Score → ✅/❌ | Mid-point resolution bump |
| Final ball (~10:30 PM) | Match Winner → ✅/❌, Total Match Runs → ✅/❌, Total 6s → ✅/❌, Total Wickets → ✅/❌, Most Sixes → ✅/❌ | Big points swing at the end |
| Post-match ceremony | Player of the Match → ✅/❌ | Final scenario resolves |

**Post-Match:** Full leaderboard with all scenarios resolved. Each user's picks shown side-by-side with actual results. Shareable as image card.

### Three Leaderboard Views

| View | Scope | Updates |
|------|-------|---------|
| **Live Match Board** | Single match, single group | Every minute during match |
| **Match Result Board** | Single match, single group | Once after match ends — shows final picks vs results |
| **Season Standings** | All matches, single group | After each match resolves — cumulative points, rank, accuracy % |

### Data Flow

```
Cron (every 1 min)
  → GET /match_scorecard
  → Parse: team scores, batting stats, bowling stats, fall of wickets
  → Write to matches table (snapshot: current_score_a, current_score_b, etc.)
  → For each resolvable scenario:
      → UPDATE scenarios SET correct_answer = X, is_resolved = true
      → UPDATE predictions SET is_correct, points_earned
  → Supabase Realtime pushes changes to subscribed clients
  → Frontend leaderboard re-renders
```

### Privacy During Live Match

- **Before deadline:** Users can only see their own picks. Other users' picks are completely hidden. Only a "X/16 predicted" count is shown per member to encourage participation.
- **After deadline passes (predictions locked):** All picks for all members become visible to the entire group. Everyone can see who picked what — this is the big reveal moment that sparks conversation.
- The leaderboard with points, rank, and scenario indicators (✅/❌/🟡/🔴/⏳) is visible to all members throughout the match.

---

## Onboarding (First-Time User)

**New user, no groups (empty dashboard):**
- Hero message: "Welcome to IPL Predict! Create your first group and invite friends."
- Two prominent CTAs: "Create a Group" (primary) and "Have an invite code?" (secondary input field)
- Brief "How it works" — 3 steps: Create → Predict → Compete (reused from landing page)

**New user arriving via invite link (not logged in):**
- Shows group name + "You've been invited to join [Group Name]"
- Login form embedded on the same page
- After auth, auto-redirects to pending state or group home

**First time in a group (approved, no predictions yet):**
- "Your first match is [Team A] vs [Team B] — predictions open!"
- Highlighted "Predict Now" CTA on the upcoming match card
- Optional: one-time tooltip walkthrough pointing to key UI elements

---

## Notifications (In-App for v1)

No push notifications or email notifications in v1. All notifications are in-app via a bell icon in the header.

**Notification types:**

| Trigger | Recipient | Message |
|---------|-----------|---------|
| New join request | Group admins | "[Name] wants to join [Group]" |
| Request approved | The member | "You've been approved to join [Group]!" |
| Request rejected | The member | "Your request to join [Group] was not approved" |
| Predictions open | All group members | "Predictions open for [Team A] vs [Team B] — deadline [time]" |
| Deadline approaching | Members who haven't predicted | "[Group]: 30 min left to predict [Team A] vs [Team B]" |
| Match results in | All group members | "[Group]: Results are in for [Team A] vs [Team B] — check the leaderboard!" |
| Custom scenario proposed | Group admins | "[Name] proposed a scenario for [Match] — review it" |
| Custom scenario approved | The proposer | "Your scenario '[title]' was approved!" |

**Implementation:** `notifications` table with `user_id`, `type`, `message`, `group_id`, `is_read`, `created_at`. Query on page load + Supabase Realtime subscription for live updates. Badge count on bell icon.

---

## Empty States & Error States

Every screen needs a defined empty state and error state. The developer should design these before the "happy path" UI.

**Empty states:**

| Screen | Empty State |
|--------|------------|
| Dashboard (no groups) | "Create your first group" hero + invite code input |
| Group home (no members approved yet) | "Share the invite link to get started" + copy link CTA |
| Group home (no matches predicted) | "No predictions yet — be the first!" + predict CTA |
| Prediction page (no custom scenarios) | "No custom scenarios yet — propose one!" + add button |
| Match leaderboard (no one predicted) | "No predictions submitted for this match" |
| Season standings (new group, no matches played) | "Season standings will appear after the first match" |
| Admin pending approvals (none pending) | "No pending requests — all caught up!" |

**Error states:**

| Error | User sees | Recovery |
|-------|----------|----------|
| API fails to fetch squad | "Playing XI not available yet — you can still predict team/range scenarios" | Player-pick scenarios show "Coming soon" with a retry button |
| Magic link email not received | "Didn't get the email? Check spam, or try again" + resend button (throttled to 1/min) |
| Prediction submit fails | Inline error "Failed to save — please try again" + retry button. Form state preserved. |
| Supabase Realtime disconnects | Silent reconnect. If offline >30 sec, show banner "Reconnecting..." |
| Match data stale (cron failed) | "Last updated X min ago" in footer of leaderboard. No blocking error. |

---

## Rate Limits & Abuse Prevention

| Limit | Value | Reason |
|-------|-------|--------|
| Max groups per user | 10 | Prevents spam group creation |
| Max members per group | 50 | Performance on free Supabase tier |
| Max custom scenarios per member per match | 10 | Prevents flooding |
| Max custom scenarios per group per match | 30 | Total cap including all members |
| Magic link resend throttle | 1 per 60 seconds | Prevents email abuse |
| Prediction edits | Unlimited before deadline | No limit needed — casual game |

These are soft limits enforced at the application level (server actions), not database constraints.

---

## Cron Activation Window

The Edge Function cron runs every minute but should NOT poll 24/7.

**Activation logic:**
1. Cron fires every minute
2. First check: query `matches` table for any match where `date = today` and `status IN ('upcoming', 'live')`
3. If no matches today: exit immediately (cost: ~1ms)
4. If match is upcoming and current time is within 1 hour of `time_ist`: fetch squad if not already cached
5. If match is live: poll `/match_scorecard`, parse, resolve
6. If match completed in last 30 min: do final resolution pass, then stop polling

**Effective polling window:** ~2 PM to 1 AM IST on match days (covers afternoon + evening double headers). On non-match days, the cron runs but exits in <1ms with zero API calls.

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js 16.2 (App Router, Turbopack) | SSR for SEO on landing + invite pages, client components for game UI |
| **Auth** | Supabase Magic Link | Zero-password, built-in email delivery |
| **Database** | Supabase (Postgres) | Relational data, SQL views for leaderboards, RLS for security |
| **Realtime** | Supabase Realtime | Live updates on predictions, scenarios, member approvals |
| **Hosting** | Vercel | Native Next.js hosting, free tier |
| **Styling** | Tailwind CSS v4 | Utility-first, fast iteration |
| **Cricket Data** | CricketData.org API | $5.99/month (S plan, 2,000 hits/day), REST JSON, IPL coverage |
| **Cron Jobs** | Supabase Edge Functions | Poll match results, auto-resolve predictions |

---

## Cricket Data API (CricketData.org)

**Base URL:** `api.cricapi.com/v1/`
**Plan:** S tier — $5.99/month, 2,000 hits/day. Free tier (100 hits/day) for prototyping.

### Available Endpoints

| Endpoint | Returns |
|----------|---------|
| `/matches` | List of upcoming, live, and recent matches |
| `/match_info` | Match details — teams, venue, date, status, toss |
| `/match_scorecard` | Full batting & bowling scorecard per innings |
| `/match_squad` | Playing XI / squad for a match |
| `/match_bbb` | Ball-by-ball data |
| `/match_points` | Fantasy points per player |
| `/series` | List of tournaments/series |
| `/series_info` | Series details, fixtures, squads |
| `/players` | Player search and profiles |

### Scenario Auto-Resolution Mapping

| System Scenario | Data Source | Auto-Scorable? |
|----------------|------------|----------------|
| Match Winner | `match_info` — result string | ✅ Yes |
| Toss Winner | `match_info` — toss field | ✅ Yes |
| Top Scorer | `match_scorecard` — sort batting by runs | ✅ Yes (computed) |
| Top Wicket-Taker | `match_scorecard` — sort bowling by wickets | ✅ Yes (computed) |
| Player of the Match | `match_scorecard` (Fantasy Scorecard API) | ✅ Yes |
| First Innings Score | `match_scorecard` — 1st innings total | ✅ Yes |
| Total Match Runs | `match_scorecard` — sum both innings | ✅ Yes (computed) |
| Powerplay Score (batting first) | `match_scorecard` — score at over 6 from fall-of-wickets / over data | ✅ Yes |
| Wickets in Powerplay | `match_scorecard` — count fall-of-wickets where over ≤ 6 | ✅ Yes |
| Will Any Batsman Score 50+? | `match_scorecard` — check max(batting runs) ≥ 50 | ✅ Yes |
| Total 6s in Match | `match_scorecard` — sum 6s column across all batsmen, both innings | ✅ Yes |
| Total Wickets in Match | `match_scorecard` — sum wickets from both innings bowling stats | ✅ Yes |
| Will Any Bowler Take 3+ Wickets? | `match_scorecard` — check max(bowling wickets) ≥ 3 | ✅ Yes |
| Super Over? | No dedicated field — infer from 3rd innings in scorecard | ❌ Manual |
| Most Sixes (player) | `match_scorecard` — sort by 6s column (if per-player 6s available) | ⚠️ Maybe (depends on data) |
| First Wicket Over | `match_scorecard` — fall-of-wickets data, 1st entry | ⚠️ Maybe (depends on data) |

**13 of 16 system scenarios are fully auto-scorable.** 2 are likely auto-scorable if the scorecard data includes per-player sixes and fall-of-wickets with over numbers. 1 (super over) remains manual.

### API Polling Strategy

The cron (Supabase Edge Function) runs every minute during match hours. It acts as a simple state machine based on where the match is in its lifecycle.

**Pre-Match (daily + 30 min before toss)**

| When | Endpoint | Calls | Purpose |
|------|----------|-------|---------|
| Daily 8 AM IST | `/matches` | 1 | Update fixture list, detect schedule changes |
| ~30 min before toss | `/match_squad` | 1 per match | Fetch playing XI for player-pick dropdowns. Cache in DB — one call per match, not per user |

**During Match (1 poll per minute via `/match_scorecard`)**

A single `/match_scorecard` call returns the full running state: team scores, every batsman's runs, every bowler's wickets, fall of wickets, and more. No need for ball-by-ball (`/match_bbb`) which is per-over and burns 40x more calls.

Each poll parses the scorecard and progressively resolves scenarios:

| Scenario | Live Behaviour | Resolved When |
|----------|---------------|---------------|
| Toss Winner | ✅ Resolved immediately at toss | Toss |
| First Wicket Over | ✅ From fall-of-wickets data | First wicket falls |
| Powerplay Score (batting first) | ✅ Score at over 6 | Over 6 |
| Wickets in Powerplay | ✅ Count wickets fallen by over 6 | Over 6 |
| Will Any Batsman Score 50+? | 🟡 Track highest individual score | When 50 hit or all out |
| Will Any Bowler Take 3+ Wickets? | 🟡 Track highest wickets count | When 3 taken or innings end |
| First Innings Score | ✅ Resolved at innings break | Innings break |
| Match Winner | 🟡 "On track" / "In danger" indicator | Final ball |
| Top Scorer | 🟡 Shows current leader vs your pick | Final ball |
| Top Wicket-Taker | 🟡 Shows current leader vs your pick | Final ball |
| Total Match Runs | 🟡 Running total vs your bracket | Final ball |
| Total 6s in Match | 🟡 Running sum of 6s vs your bracket | Final ball |
| Total Wickets in Match | 🟡 Running wicket count vs your bracket | Final ball |
| Most Sixes (player) | 🟡 Current 6s leader if data available | Final ball |
| POTM | ⏳ No data until post-match | Post-match |
| Super Over | ⏳ Unknown until match ends | Post-match |

The cron writes interim results to the `scenarios` table. Confirmed picks get `is_correct` set and `points_earned` updated. "On track" / "In danger" indicators are computed client-side using the rules below.

### "On Track" Indicator Logic (per scenario type)

| Scenario | 🟡 On Track | 🔴 In Danger |
|----------|------------|-------------|
| **Match Winner** | Team you picked is currently leading or batting with required rate achievable | Team you picked is currently losing or required rate is above 12 RPO |
| **Top Scorer** | Your picked player is currently the highest scorer or within 15 runs of the lead | Your picked player is out and another player has more runs |
| **Top Wicket-Taker** | Your picked player has the most wickets or is tied for most | Another player has 2+ more wickets than your pick |
| **Total Match Runs (range)** | Current projected total (current runs × 20/overs bowled, extrapolated for both innings) falls within your bracket | Projected total is outside your bracket by 20+ runs |
| **First Innings Score (range)** | Current run rate × 20 overs falls within your bracket (only during first innings) | Projected score is outside your bracket |
| **Total 6s (range)** | Current 6s count extrapolated to full match falls within your bracket | Extrapolated count is outside your bracket |
| **Total Wickets (range)** | Current wickets extrapolated to full match falls within your bracket | Extrapolated count is outside your bracket |
| **Batsman 50+? (Yes)** | Any batsman currently on 30+ and still batting | All batsmen out below 50, or highest score is below 20 with 8+ wickets down |
| **Batsman 50+? (No)** | No batsman has crossed 50 yet and highest current score is below 30 | A batsman has crossed 40 and is still batting |
| **Bowler 3+ Wickets? (Yes)** | Any bowler has 2+ wickets with overs remaining in their spell | No bowler has more than 1 wicket and most bowlers have completed 3+ overs |
| **Bowler 3+ Wickets? (No)** | No bowler has more than 1 wicket | A bowler already has 2 wickets with overs remaining |
| **Most Sixes (player)** | Your picked player has the most 6s or is tied | Another player has 2+ more 6s |
| **Super Over / POTM / First Wicket Over** | ⏳ No indicator — shown as "Pending" until resolvable |

**Post-Match (once status = completed)**

Final `/match_scorecard` call resolves all remaining system scenarios. `resolve_match_predictions()` DB function runs once to score everything. POTM and super over stay admin-manual if not parseable.

**Error Handling:** If an API call fails, skip and retry on the next 1-minute cycle. Since data is "near live" (few minutes behind), a single missed poll is invisible to users. No retry queues needed.

### API Quota Budget (S plan: 2,000 hits/day)

| Item | Calls |
|------|-------|
| Daily fixture refresh | 1 |
| Squad fetch (per match) | 1 |
| Live match polling (1/min × ~210 min per T20) | ~210 |
| Double header day (2 matches) | ~420 |
| Pre-match + post-match overhead | ~30 |
| **Daily peak (double header)** | **~450** |

Well within the 2,000 daily limit. The $12.99 plan (10,000 hits/day) provides headroom if polling frequency increases later.

### Known Limitations

- No formal SLA or uptime guarantee
- Data is "near live" — few minutes behind real-time. Leaderboard updates may lag TV by 2-3 minutes. Acceptable for a prediction app (not a live scoring app)
- Documentation is JS-rendered, hard to navigate; use code samples + Postman
- No WebSocket on S plan — we use polling + Supabase Realtime instead
- If reliability becomes an issue mid-season, migrate to Sportmonks (€29/month, 14-day free trial, 99.9% claimed uptime, public status page)

---

## Data Model

```
profiles (linked to auth.users)
  - id, display_name, email, avatar_url, created_at

groups
  - id, name, invite_code, created_by, created_at

group_members (approval workflow)
  - group_id, user_id, status (pending|approved|rejected|removed),
    role (owner|admin|member), joined_at, approved_at

matches (IPL 2026 fixtures)
  - id, match_number, team_a, team_b, date, time_ist, venue,
    status (upcoming|live|completed|abandoned|no_result)
  - Results: toss_winner, match_winner, top_scorer, top_wicket_taker,
    player_of_match, first_innings_score, total_match_runs, etc.
  - Live snapshot (updated every minute during match):
    current_score_a, current_score_b, current_overs_a, current_overs_b,
    current_batting_team, live_scorecard_json (cached full scorecard),
    last_polled_at

match_group_settings (per group per match)
  - group_id, match_id, prediction_deadline, is_locked

scenarios (system + custom, unified)
  - id, group_id, match_id, created_by, type (system|custom),
    system_category, title, description, options (jsonb),
    correct_answer, points (enum: 5|10|15|20|25),
    is_resolved, is_removed,
    approval_status (auto_approved|pending|approved|rejected) — system = auto_approved, custom = pending until admin approves

predictions
  - id, user_id, scenario_id, value, is_correct, points_earned,
    submitted_at

Views: season_standings, match_leaderboard
Functions: seed_system_scenarios(), resolve_match_predictions()
```

---

## Project Structure

```
ipl-predict/
├── middleware.ts                    # Auth guard for protected routes
├── next.config.ts
├── package.json
├── tsconfig.json
├── postcss.config.mjs
├── .env.local.example
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Full schema with RLS + functions
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (fonts, metadata)
│   │   ├── globals.css             # Tailwind v4 + design tokens
│   │   ├── page.tsx                # Landing page (SSR, SEO)
│   │   ├── login/page.tsx          # Magic link login
│   │   ├── auth/callback/route.ts  # Magic link redirect handler
│   │   ├── join/[code]/
│   │   │   ├── page.tsx            # SSR invite page (OG tags)
│   │   │   └── join-client.tsx     # Auth gate + pending state
│   │   ├── dashboard/              # TODO: User's groups, create group
│   │   ├── group/[groupId]/        # TODO: Group home, members, admin
│   │   └── matches/                # TODO: Match schedule browser
│   ├── components/
│   │   ├── auth/login-form.tsx     # Reusable magic link form
│   │   ├── ui/                     # TODO: Shared UI components
│   │   ├── game/                   # TODO: Prediction form, leaderboard
│   │   └── layout/                 # TODO: Nav, sidebar
│   ├── hooks/
│   │   └── use-auth.ts             # Supabase auth + profile hook
│   ├── lib/
│   │   ├── actions.ts              # Server actions (groups, scenarios, predictions)
│   │   ├── constants.ts            # Teams, routes, app config
│   │   └── supabase/
│   │       ├── client.ts           # Browser Supabase client
│   │       └── server.ts           # Server Supabase client
│   └── types/
│       └── index.ts                # All TypeScript interfaces
└── public/                         # Static assets
```

---

## Phased Build Plan

### Phase 1 — Auth + Groups (Days 1-2)
- [x] Supabase project setup + schema migration
- [x] Next.js 16.2 scaffold with Tailwind v4
- [x] Magic link auth (login form, callback, middleware)
- [x] Auth hook with profile loading
- [x] Join page with auth gate + pending state
- [ ] Dashboard: list all my groups (with role: owner/admin/member), create group, join via code
- [ ] Group home: member list, pending approvals (admin), season standings
- [ ] Admin: promote/demote co-admins (owner only)
- [ ] Share invite link (copy to clipboard)
- [ ] Three group home states (next match countdown / match live / no match today)

### Phase 2 — Predictions + Live Leaderboard (Days 3-5)
- [ ] Hardcode IPL 2026 fixtures JSON + seed script
- [ ] Prediction page: system scenarios auto-seeded
- [ ] Custom scenario creation → admin approval flow (points restricted to 5/10/15/20/25)
- [ ] Admin: remove scenarios, set deadline override (default: 45 min before match start)
- [ ] Partial prediction submission (any subset of scenarios, "Not Predicted" for skipped)
- [ ] Quick Predict mode (top 5 easiest scenarios only)
- [ ] Free edit until deadline with "Last updated X min ago" display
- [ ] Manual result entry + scenario resolution (any admin)
- [ ] Abandoned / no-result match handling (void unresolved, discard if never started)
- [ ] Match leaderboard component (live + post-match states)
- [ ] Season standings view with "Points per match" column + "Joined in Match X" badge
- [ ] Supabase Realtime subscription on predictions table for live updates
- [ ] "On track" / "In danger" client-side indicators (per scenario logic as defined in PRD)
- [ ] Pick visibility rules (hidden until scenario resolves)

### Phase 3 — CricketData.org API + Live Cron (Days 6-8)
- [ ] Sign up for free tier, test endpoints against live matches
- [ ] Build API client (`/lib/cricket-api.ts`) wrapping match_info + match_scorecard
- [ ] Supabase Edge Function: 1-min cron during match hours
- [ ] Cron state machine: pre-match (squad fetch) → live (scorecard poll + progressive resolution) → post-match (final resolution)
- [ ] Auto-lock predictions when match status flips to "live"
- [ ] Detect abandoned / no-result matches and handle (void unresolved, discard if never started)
- [ ] Parse scorecard to extract: toss winner, team scores, top scorer, top wicket-taker, first innings score, total runs, fall of wickets, powerplay data, 6s count, wicket count
- [ ] Write live snapshot to `matches` table (current scores, cached scorecard JSON)
- [ ] Progressive scenario resolution: toss → first wicket over → powerplay → 50+ / 3-wicket → innings break → final result → POTM
- [ ] Fetch Playing XI from `/match_squad` for player-pick dropdowns
- [ ] Error handling: skip failed polls, retry on next cycle
- [ ] Upgrade to S plan ($5.99/month) once integration is validated

### Phase 4 — Polish + Multi-Group UX (Week 2+)
- [ ] Live match group switcher (tab bar showing rank per group)
- [ ] "Copy picks from another group" shortcut
- [ ] Unified admin dashboard (pending approvals across all groups)
- [ ] Shareable leaderboard image cards (WhatsApp/Instagram stories)
- [ ] Push notifications for deadline reminders (one per match, lists all groups)
- [ ] Streak badges and fun stats ("🔥 3 correct winners in a row")
- [ ] Mobile-responsive polish
- [ ] WhatsApp deep-link sharing

### Phase 5 — Season Summary (End of IPL)
- [ ] Season Summary card per group (champion, most accurate, best single match, etc.)
- [ ] Shareable season summary image for WhatsApp/Instagram
- [ ] Season archive — historical view of all predictions and results
- [ ] "Create new season" flow if expanding to other tournaments

---

## Open Questions

1. **Notification on approval:** Should the pending user get an email when approved? (Could use Supabase Edge Function + Resend)
2. **Custom scenario minimum participation:** Should a custom scenario require at least 2 members to have submitted predictions before it counts toward the leaderboard? Prevents one person creating a scenario only they answer.
3. **Public groups:** Worth adding for discoverability? Would let solo users join random groups and compete with strangers.
4. **Cross-group stats:** Should users see their personal stats across all groups? "Your overall accuracy is 62% across 4 groups" — could be a profile-level feature.
5. **Group carry-over:** When IPL ends, should groups auto-transition to the next tournament (e.g., T20 World Cup)? Or stay IPL-only until next season?
6. **Legal:** Consult a lawyer before adding any monetization (entry fees, ads, premium features). Current free model has low risk but any revenue model needs legal review for gambling/gaming classification.

## Resolved Decisions

- ~~Multiple admins~~ → **Resolved:** Owner can promote members to co-admin. Multiple admins share the approval and resolution workload.
- ~~Custom scenario abuse~~ → **Resolved:** Points restricted to 5/10/15/20/25. Custom scenarios require admin approval before going live.
- ~~Toss time deadline~~ → **Resolved:** Default deadline is 45 minutes before scheduled match start time. Auto-lock on match going live.
- ~~Abandoned matches~~ → **Resolved:** Resolved predictions count, unresolved are voided. If match never started, all predictions discarded.
- ~~Mid-season joiners~~ → **Resolved:** "Joined in Match X" badge + points-per-match column for normalized comparison.
- ~~Edit predictions~~ → **Resolved:** Free edits until deadline, "Last updated X min ago" shown, no change limits.

---

*Last updated: March 26, 2026*
