# Bragg — Launch Checklist

**IPL 2026 starts:** March 28, 2026 (RCB vs SRH, 7:30 PM IST)
**Target:** MVP live for Match 1. Full feature set by Match 5-7.

---

## Phase 0 — Infrastructure & Accounts (Do FIRST)

### Accounts & Services
- [ ] Register domain name (avoid "IPL" in the domain for trademark safety — e.g., bragg.cricket, bragg.app, getbragg.in, braggapp.in)
- [ ] Create GitHub repository
- [ ] Create Vercel account → connect to GitHub repo
- [ ] Create Supabase project (free tier)
- [ ] Sign up for CricketData.org (free tier, 100 hits/day)
- [ ] Note down all API keys → create `.env.local`

### Supabase Configuration
- [ ] Run full database migration SQL (from Technical Architecture doc)
- [ ] Enable Magic Link auth: Dashboard → Authentication → Providers → Email → enable Magic Link
- [ ] Customize email template: Dashboard → Authentication → Email Templates → Magic Link (brand it — default template looks spammy)
- [ ] Configure redirect URLs: Dashboard → Authentication → URL Configuration → add production domain + localhost
- [ ] Enable Realtime on tables: `predictions`, `scenarios`, `matches`, `group_members`, `notifications`
- [ ] Verify Edge Functions support on your plan (cron scheduling needs Pro plan for <1min intervals — check limits)

### DNS & Deployment
- [ ] Point domain DNS to Vercel (auto-SSL)
- [ ] Verify deployment works with `npm run build` + Vercel preview deploy
- [ ] Test magic link flow on deployed URL (not just localhost)

---

## Phase 1 — Match 1 MVP (Ship by March 28)

Realistic scope: Auth + groups + manual prediction form + manual scoring. No API, no live leaderboard yet.

### Must Have
- [ ] Landing page with SEO (SSR)
- [ ] Login page (magic link)
- [ ] Auth callback handler
- [ ] Middleware protecting `/dashboard` and `/group/*`
- [ ] Dashboard: empty state → create group → group list
- [ ] Create group → get invite link → copy to clipboard
- [ ] Join group via invite link → pending → admin approves
- [ ] Group home showing member list + next match card
- [ ] Seed first week of IPL fixtures (hardcoded JSON, at least 5-7 matches)
- [ ] Basic prediction form: at minimum Match Winner + Toss Winner + First Innings Score + Total Runs (the 4 easiest — can be all text-based selects)
- [ ] Prediction deadline enforcement (45 min before match start)
- [ ] After match: admin can manually enter results via simple form
- [ ] Basic match leaderboard showing who got what right/wrong
- [ ] Basic season standings table (total points + rank)

### Nice to Have for Match 1
- [ ] All 16 system scenarios in prediction form
- [ ] Custom scenario creation
- [ ] WhatsApp share button for invite link
- [ ] Privacy policy + terms pages
- [ ] Disclaimer footer

### Explicitly NOT for Match 1
- API integration
- Live polling / cron
- "On track" indicators
- Push notifications
- Shareable image cards
- Multi-group switcher

---

## Phase 2 — Full Prediction Experience (Match 2-4, March 29 - April 2)

- [ ] All 16 system scenarios with proper UI (team picks, player picks, range brackets)
- [ ] Custom scenario creation → admin approval flow
- [ ] Quick Predict mode (top 5 only)
- [ ] Partial submission support ("Not Predicted" display)
- [ ] Free edit with "Last updated X min ago"
- [ ] All 5 prediction status indicators (✅ ❌ 🟡 🔴 ⏳)
- [ ] Full leaderboard with correct/wrong/pending pills
- [ ] Season standings with points-per-match + "Joined in Match X"
- [ ] Pick reveal after deadline (all predictions visible)
- [ ] Multi-admin: owner can promote co-admins
- [ ] Notification bell (in-app) for pending approvals + match alerts
- [ ] Abandoned match handling
- [ ] Three group home states (next match / live / no match today)
- [ ] Empty states for all screens
- [ ] Error states with retry buttons
- [ ] Rate limits (10 groups/user, 50 members/group, 10 custom scenarios/member/match)

---

## Phase 3 — API Integration + Live Leaderboard (Match 5-7, April 3-8)

### API Setup
- [ ] Test CricketData.org endpoints against a LIVE non-IPL match before using for IPL
- [ ] Verify scorecard response contains: per-player runs, 4s, 6s, bowling wickets, fall of wickets with over numbers
- [ ] Map CricketData.org match IDs to your seeded IPL matches
- [ ] Build `/lib/cricket-api.ts` client with typed responses
- [ ] Upgrade to S plan ($5.99/month)

### Cron Setup
- [ ] Create Supabase Edge Function for cron
- [ ] Implement state machine: upcoming → live (poll) → completed (resolve) → stop
- [ ] Add activation window: only poll 2 PM - 1 AM IST on match days
- [ ] Add `last_polled_at` check to prevent overlapping executions
- [ ] Test with live match: verify scorecard parses correctly
- [ ] Verify progressive resolution works (toss → powerplay → innings → final)
- [ ] Verify auto-lock works when match goes live

### Live Leaderboard
- [ ] Supabase Realtime subscriptions wired to leaderboard component
- [ ] Live score ticker showing cached scorecard data
- [ ] "On track" / "In danger" indicators computed client-side
- [ ] Test with 2+ friends watching a live match in the same group
- [ ] Verify double-header (2 matches same day) works correctly

---

## Phase 4 — Polish (Week 2+)

- [ ] Multi-group switcher during live matches
- [ ] "Copy picks from another group" shortcut
- [ ] Unified admin dashboard across groups
- [ ] Shareable leaderboard image cards (canvas/html2canvas)
- [ ] WhatsApp deep-link sharing
- [ ] Streak badges
- [ ] Mobile responsive polish (test on actual phones)
- [ ] Performance audit (Lighthouse)

---

## Phase 5 — Season Summary (End of IPL, May 2026)

- [ ] Season Summary card generation
- [ ] Shareable summary image
- [ ] Season archive view

---

## Data Preparation

### Before First Match
- [ ] Seed complete IPL 2026 fixture list (74 league matches + playoff placeholders)
- [ ] Source: ESPNcricinfo or IPL official site
- [ ] Format: match_number, team_a (code), team_b (code), date, time_ist, venue
- [ ] Seed 10 IPL team records with codes, names, colors
- [ ] Seed player lists per team (full squad, ~25 players each — for player-pick dropdowns before playing XI is announced)
- [ ] Map at least the first week of matches to CricketData.org match IDs once they appear

### Ongoing During Season
- [ ] Check CricketData.org for new match IDs as schedule releases (they add 1-2 weeks ahead)
- [ ] Update fixture list if BCCI changes dates/venues (common during IPL)
- [ ] Monitor for player transfers/injuries that affect squad lists

---

## Legal & Compliance

- [ ] Privacy Policy page — data collected (name, email), storage (Supabase), purpose (app functionality), deletion rights
- [ ] Terms of Service page — 18+ age requirement, no real money, entertainment only, no affiliation with BCCI/IPL, data accuracy disclaimer
- [ ] Footer disclaimer on every page: "Not affiliated with BCCI, IPL, or any franchise"
- [ ] No official IPL logos, team logos, or player photos used anywhere
- [ ] Team color badges (circles with team code) are fine — these are factual, not trademarked visual assets

---

## Testing Checklist

### Auth Flow
- [ ] Magic link on mobile Gmail app (magic links sometimes break in in-app browsers)
- [ ] Magic link on desktop
- [ ] Magic link on Outlook app
- [ ] Login → redirect to invite link (if user opened /join/[code] before logging in)
- [ ] Session persistence (refresh page, user stays logged in)
- [ ] Sign out → protected routes redirect to login

### Group Flow
- [ ] Create group → verify invite code generated
- [ ] Open invite link in incognito → lands on login → after auth → pending state
- [ ] Admin approves → member gains access
- [ ] Admin rejects → member sees rejected state
- [ ] Rejected member re-requests → goes back to pending
- [ ] Owner promotes member to co-admin
- [ ] Co-admin approves a pending request
- [ ] Owner demotes co-admin back to member

### Prediction Flow
- [ ] Submit predictions → verify saved in DB
- [ ] Edit predictions → verify updated
- [ ] Submit partial (only 3 of 16 scenarios) → verify "Not Predicted" shows for skipped
- [ ] Submit after deadline → verify rejected with error
- [ ] Quick Predict mode → shows only top 5
- [ ] Custom scenario → goes to pending → admin approves → visible to group
- [ ] Custom scenario → admin rejects → not visible

### Leaderboard
- [ ] After manual result entry → match leaderboard shows correct scores
- [ ] Season standings accumulate across matches
- [ ] "Points per match" column shows correct values
- [ ] Tiebreaker works (earlier submission ranks higher)
- [ ] Mid-season joiner shows "Joined in Match X" badge

### Edge Cases
- [ ] User in 3 groups predicting the same match with different picks
- [ ] Double-header day: two matches, both showing correctly
- [ ] Abandoned match: verify predictions voided correctly
- [ ] Match that never starts: verify all predictions discarded
- [ ] User opens prediction page before playing XI is announced → player-pick dropdowns show full squad (not empty)

---

## Monitoring (During First Live Match)

- [ ] Watch Supabase Dashboard: connection count, Realtime subscriptions, Edge Function logs
- [ ] Watch Vercel: function execution times, error logs
- [ ] Manually verify cron is running: check `last_polled_at` on matches table every few minutes
- [ ] Check API quota usage on CricketData.org dashboard
- [ ] Have a fallback plan: if API fails, manually enter results via admin form
- [ ] Keep Supabase SQL editor open — if anything breaks, you can fix data directly

---

## Monthly Costs (Estimated)

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Free (Hobby) | $0 |
| Supabase | Free tier (or Pro $25/month if Edge Function cron needs it) | $0 - $25 |
| CricketData.org | S plan | $5.99 |
| Domain | .in or .app | $10-15/year |
| **Total** | | **$6 - $31/month** |

---

## Documents in This Package

| Document | Purpose |
|----------|---------|
| `ipl-predict-requirements-v2.md` | Product Requirements Document — all product decisions, scenarios, flows |
| `ipl-predict-technical-architecture.md` | Database schema, API integration, cron logic, Realtime setup, route structure |
| `ipl-predict-design-system-spec.md` | Color tokens, typography, spacing, component specs, page layouts |
| `ipl-predict-design-system.jsx` | Interactive design system preview (run as React artifact) |
| `ipl-predict-user-flow.mermaid` | Visual user flow diagram |
| `ipl-predict-scaffold.tar.gz` | Starter code (auth, join page, Supabase clients, types) — NOTE: schema in this file is outdated, use the Technical Architecture doc SQL instead |

---

*Last updated: March 26, 2026*
