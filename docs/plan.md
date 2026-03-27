# Bragg — Development Plan

**Target:** All features ready for Match 1 (March 28, 2026, 7:30 PM IST)
**Today:** March 26, 2026
**Timeline:** ~48 hours aggressive build

---

## Phase 0 — Infrastructure Setup (2-3 hours)

### 0.1 Accounts & Services
- [ ] Create Supabase project (free tier)
- [ ] Create Vercel account + connect to GitHub repo
- [ ] Sign up for api-cricket.com (Starter plan $20/mo, 8K req/day)
- [ ] Register domain name (e.g., bragg.cricket, bragg.app, getbragg.in)
- [ ] Collect all API keys → create `.env.local`

### 0.2 Project Scaffold
- [ ] Initialize Next.js 16.2 project in `web-app/` with TypeScript, Tailwind v4, App Router, Turbopack
- [ ] Install dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `shadcn/ui`, `next-themes`, `zod`, `lucide-react`
- [ ] Configure shadcn/ui with dark theme (Stadium Nightscape as default/only theme)
- [ ] Set up design tokens in `globals.css` matching the design system spec
- [ ] Load Google Fonts: Chakra Petch, DM Sans, JetBrains Mono
- [ ] Set up project structure with Data Access Layer (see tech_plan.md sections 1 and 9)
- [ ] Set up DAL modules: `src/lib/dal/` (groups, members, matches, scenarios, predictions, standings, notifications, players, teams)
- [ ] Set up cricket API abstraction: `src/lib/cricket-api/` (index.ts, client.ts, mock.ts, types.ts)
- [ ] Create mock data fixtures: `src/lib/mock-data/` (matches, squads, scorecards with phase snapshots)
- [ ] Configure `proxy.ts` (Next.js 16 middleware replacement) for auth session management
- [ ] Set up Supabase clients (browser + server)
- [ ] Set up `.env.local` with `NEXT_PUBLIC_MOCK_MODE=true` for local dev

### 0.2.1 Local Dev Environment
- [ ] Install Supabase CLI + Docker
- [ ] Run `supabase init` in `/supabase` directory
- [ ] Run `supabase start` — verify local Postgres, Auth (Inbucket), Realtime, Studio all work
- [ ] Create `supabase/seed.sql` with test users, test group, sample matches, sample predictions
- [ ] Run `supabase db reset` — verify all migrations + seed data load correctly
- [ ] Verify `npm run dev` connects to Supabase local and mock cricket API

### 0.3 Database Setup
- [ ] Run full database migration SQL in Supabase (all tables, enums, views, functions)
- [ ] Enable RLS on all tables + apply all policies
- [ ] Enable Magic Link auth in Supabase dashboard
- [ ] Customize magic link email template
- [ ] Configure redirect URLs (localhost + production domain)
- [ ] Enable Realtime on: `predictions`, `scenarios`, `matches`, `group_members`, `notifications`
- [ ] Seed `points_config` table with all 16 system scenario definitions

### 0.4 Data Seeding
- [ ] Seed 10 IPL team records in `teams` table (code, name, short_name, color, text_on_color)
- [ ] Seed IPL 2026 fixture list in `matches` table (at minimum first 2 weeks of matches)
- [ ] Seed player squads in `players` table (~25 players per team via CricketData.org API or manual)
- [ ] Seed `points_config` already covered in 0.3

**Exit criteria:** `npm run dev` shows a blank app, Supabase tables exist with seed data, auth flow works end-to-end on localhost.

---

## Phase 1 — Auth + Groups (6-8 hours)

### 1.1 Landing Page
- [ ] SSR landing page with SEO metadata + OG tags
- [ ] Hero section: app name (gradient text), tagline, two CTAs
- [ ] "How it works" section (3 steps)
- [ ] Footer with disclaimer: "Not affiliated with BCCI, IPL, or any franchise" (US-12.3, P0 — on every page)
- [ ] Design system applied: Stadium Nightscape theme

### 1.2 Authentication
- [ ] Login page with magic link form (display name + email)
- [ ] Auth callback route handler (`/auth/callback`)
- [ ] `proxy.ts` protecting `/dashboard` and `/group/*` routes
- [ ] Auto-create `profiles` row on first sign-in (DB trigger)
- [ ] Sign out functionality
- [ ] Auth hook for client components (`useAuth`)

### 1.3 Dashboard
- [ ] Empty state: "Create your first group" hero + invite code input
- [ ] Create group flow → generates invite link
- [ ] Join group via invite code input
- [ ] List user's groups with role badges (owner/admin/member)
- [ ] Group cards showing: name, member count, role, latest match status

### 1.4 Join Flow
- [ ] SSR invite page (`/join/[code]`) with OG tags for social sharing
- [ ] Auth gate: redirect to login if not authenticated, then back to join page
- [ ] Request to join → pending state
- [ ] "Waiting for approval" screen for pending members
- [ ] Copy invite link to clipboard button

### 1.5 Group Home
- [ ] Group name as H1 + invite link copy button + admin badge
- [ ] Member list display
- [ ] Three group home states:
  - State 1: Next match countdown + match card + "Predict Now" CTA + season standings
  - State 2: Live match (placeholder — will be built in Phase 2)
  - State 3: No upcoming match — last match recap + next match preview

### 1.6 Admin — Member Management (US-10.1, P0)
- [ ] Admin panel page (`/group/[groupId]/admin`) with Members tab
- [ ] Pending approvals list with approve/reject buttons
- [ ] Member list with role badges and actions (promote/demote/remove)
- [ ] Notification badge for pending requests
- [ ] Promote member to co-admin (owner only)
- [ ] Demote admin to member (owner only)
- [ ] Remove member
- [ ] Re-request after rejection flow

**Exit criteria:** Full auth flow works. Users can create groups, share invite links, join groups, get approved, see group home with upcoming match card.

---

## Phase 2 — Predictions + Leaderboard (8-10 hours)

### 2.1 Match Card Component
- [ ] Match card with team badges, venue, deadline countdown
- [ ] Match number badge + deadline badge
- [ ] Full-width "Predict Now" CTA

### 2.2 Prediction Page
- [ ] Auto-seed system scenarios when first member opens prediction page
- [ ] Scenario cards: team pick, player pick, range bracket, yes/no
- [ ] 16 system scenarios with proper UI per input type
- [ ] Quick Predict mode toggle (top 5 scenarios only)
- [ ] Partial submission support (any subset of 16)
- [ ] Bottom sticky bar: "Submit Predictions" + "X/16 answered" counter
- [ ] Free edit until deadline with "Last updated X min ago"
- [ ] Deadline enforcement (server-side check)
- [ ] Player-pick dropdowns (populated from squad data)

### 2.3 Custom Scenarios
- [ ] "Propose a Scenario" card at bottom of prediction page
- [ ] Creator specifies: title, options (2+), points (5/10/15/20/25)
- [ ] Admin approval flow (pending → approved/rejected)
- [ ] Admin can soft-delete any scenario

### 2.4 Admin — Scenario & Settings Tabs (US-10.2, US-10.3)
- [ ] Scenarios tab: approve/reject custom scenarios (with optional point adjustment), remove scenarios
- [ ] Settings tab: set/override prediction deadline per match, manually lock predictions, group name edit
- [ ] Admin can remove any scenario (system or custom)

### 2.5 Match Leaderboard
- [ ] Match leaderboard table: rank, name, scenario indicators (pills), match points
- [ ] All 5 prediction status indicators: ✅ ❌ 🟡 🔴 ⏳
- [ ] Current user row highlighted
- [ ] Tiebreaker: earlier submission ranks higher
- [ ] Pick visibility: hidden before deadline, revealed after
- [ ] Expandable row: click user to see their full picks vs actual results

### 2.6 Season Standings
- [ ] Full standings table: rank, name, total points, matches predicted, points/match, accuracy %, role badge
- [ ] Current user row highlighted
- [ ] "Joined in Match X" badge for mid-season joiners
- [ ] Filter: all time vs last 10 matches

### 2.7 Manual Result Entry
- [ ] Admin form to enter match results (for Match 1 fallback)
- [ ] Fields for all match data: winner, toss, scores, top scorer, etc.
- [ ] Trigger `resolve_match_predictions()` after entry
- [ ] Admin can resolve custom scenarios manually

### 2.8 Notifications (In-App)
- [ ] Notification bell icon in header with unread count badge
- [ ] Notification types that work without cron (Phase 2): join requests, approvals, results in, custom scenario actions — these are triggered by Server Actions
- [ ] Notification types that require cron (Phase 3): predictions open, deadline approaching — these fire from the Edge Function
- [ ] Mark as read functionality
- [ ] Supabase Realtime subscription for live notification updates

**Exit criteria:** Full prediction flow works. Users can predict all 16 scenarios, admin can enter results manually, leaderboard shows correct rankings, season standings accumulate.

---

## Phase 3 — API Integration + Live Features (6-8 hours)

### 3.1 CricketData.org API Client
- [ ] Build `/lib/cricket-api.ts` with typed request/response interfaces
- [ ] Implement endpoints: `/matches`, `/match_info`, `/match_scorecard`, `/match_squad`, `/series_info`
- [ ] Error handling: retry on failure, graceful fallback
- [ ] API key management via environment variables
- [ ] Test against live match data

### 3.2 Cron — Supabase Edge Function
- [ ] Edge Function that runs every minute via `pg_cron`
- [ ] Activation window: 2 PM — 1 AM IST on match days
- [ ] State machine: upcoming → live (poll) → completed (resolve) → stop
- [ ] `last_polled_at` check to prevent overlapping executions
- [ ] Pre-match: fetch squad 30 min before match
- [ ] Auto-lock predictions when match goes live
- [ ] Detect abandoned/no-result matches

### 3.3 Progressive Scenario Resolution
- [ ] Parse scorecard to extract all match data fields
- [ ] Progressive resolution: toss → first wicket → powerplay → mid-match → innings break → final result → POTM
- [ ] Write live snapshot to `matches` table (current scores, cached scorecard JSON)
- [ ] Update `scenarios.correct_answer` and `predictions.is_correct` / `points_earned`

### 3.4 Live Leaderboard
- [ ] Supabase Realtime subscriptions on `predictions` and `matches` tables
- [ ] Live score ticker component (team scores, overs, batting team)
- [ ] Leaderboard re-renders automatically on Realtime updates
- [ ] "On track" / "In danger" indicators computed client-side (per scenario logic from PRD)

### 3.5 Live Match Group Home (State 2)
- [ ] Live score ticker at top
- [ ] Live leaderboard front and center
- [ ] Predictions locked indicator
- [ ] Group switcher tab bar (if user is in multiple groups)

**Exit criteria:** During a live match, the leaderboard updates every minute. Score ticker shows live data. Scenarios resolve progressively. All automated.

---

## Phase 4 — Polish + Edge Cases (4-6 hours)

### 4.1 Empty, Error & Loading States
- [ ] Empty states for all screens (dashboard, group home, predictions, leaderboard, standings, admin)
- [ ] Error states with retry buttons
- [ ] Loading / skeleton states for all data-driven screens (US-11.7)
- [ ] Realtime disconnect banner ("Reconnecting...")
- [ ] "Last updated X min ago" on leaderboard when cron fails
- [ ] Onboarding experience: welcome banner, first-match guidance for new group members (US-11.8)

### 4.2 Multi-Group UX
- [ ] Live match group switcher (tab bar showing rank per group)
- [ ] "Copy picks from another group" shortcut
- [ ] Unified admin dashboard for pending approvals + scenarios across all groups (US-10.4)

### 4.3 Rate Limits
- [ ] Max 10 groups per user
- [ ] Max 50 members per group
- [ ] Max 10 custom scenarios per member per match
- [ ] Max 30 custom scenarios per group per match
- [ ] Magic link resend throttle (1 per 60 sec)

### 4.4 Abandoned Match Handling
- [ ] If abandoned after play: resolved predictions keep, unresolved voided
- [ ] If never started: all predictions discarded
- [ ] Match status enum handling throughout UI

### 4.5 Legal Pages
- [ ] Privacy Policy page (US-12.1)
- [ ] Terms of Service page (US-12.2)
- [ ] (Footer disclaimer already shipped in Phase 1.1)

### 4.6 Mobile Responsive Polish
- [ ] All screens tested at 375px width
- [ ] Thumb-friendly touch targets
- [ ] Bottom sticky bar usability on mobile

### 4.7 Share Features & Extras
- [ ] WhatsApp share button for invite link
- [ ] Shareable leaderboard image cards (html2canvas)
- [ ] WhatsApp deep-link sharing for results
- [ ] Streak badges on leaderboard (e.g., "3 correct winners in a row") (US-13.3)
- [ ] Performance audit (Lighthouse) + optimization

**Exit criteria:** App is polished, handles all edge cases, works on mobile, ready for real users.

---

## Phase 5 — Deployment + Match Day Prep (2-3 hours)

### 5.1 Deployment
- [ ] Point domain DNS to Vercel
- [ ] Verify production build (`npm run build`)
- [ ] Test magic link flow on production URL
- [ ] Verify Supabase Realtime works in production

### 5.2 Pre-Match Data
- [ ] Map CricketData.org match IDs to seeded IPL matches (at least first week)
- [ ] Verify CricketData.org scorecard response against a live non-IPL match
- [ ] Upgrade to S plan ($5.99/month)

### 5.3 Match Day Monitoring
- [ ] Watch Supabase Dashboard: connections, Realtime subs, Edge Function logs
- [ ] Watch Vercel: function execution times, error logs
- [ ] Monitor API quota on CricketData.org
- [ ] Fallback plan: admin manual result entry if API fails

**Exit criteria:** App is live on production domain, tested end-to-end, monitoring in place.

---

## Phase 6 — Season Summary (End of IPL, May 2026)

- [ ] Season Summary card per group
- [ ] Awards: champion, most accurate, best single match, bold predictor, consistency king, participation
- [ ] Shareable summary image for WhatsApp/Instagram
- [ ] Season archive view

---

## Priority Order (Critical Path)

**P0 (core app, Phases 0-2):** Auth, groups, predictions, manual results, leaderboard, standings. App is fully functional with admin manual result entry.

**P1 (live features + polish, Phases 3-4):** API integration, cron, live leaderboard, real-time score ticker, auto-resolution, notifications, mobile polish, loading states. These make the experience great but the app works without them.

**Deployment timeline:**

1. **Phase 0** — Infrastructure (must do first)
2. **Phase 1** — Auth + Groups + Footer disclaimer (P0)
3. **Phase 2** — Predictions + Leaderboard + Manual Results (P0)
4. **Phase 5.1** — Deploy to production (must do before Match 1)
5. **Phase 3** — API + Live features (P1 — can ship during Match 1 itself)
6. **Phase 4** — Polish (P1/P2 — ships incrementally during first week)

**Fallback for Match 1:** If Phase 3 isn't ready, admin enters results manually after the match. Leaderboard updates work; just no live updates during the match.

---

*Last updated: March 26, 2026*
