# Production Launch Checklist

**App:** Bragg — IPL 2026 Social Prediction Game
**Date created:** March 28, 2026

---

## Critical Blockers (Must Fix Before Launch)

- [ ] **Cricket API credentials** — obtain API key and league key from api-cricket.com (v2.0). Without this, match polling, live scores, and auto-resolution will not work. Manual admin entry is the only fallback.
- [ ] **Legal placeholders** — replace `[INSERT_CONTACT_EMAIL]`, `[INSERT_GRIEVANCE_OFFICER_NAME]`, `[INSERT_GRIEVANCE_OFFICER_EMAIL]` in:
  - `src/app/privacy/page.tsx` (3 placeholders)
  - `src/app/terms/page.tsx` (1 placeholder)
  - `docs/privacy-policy.md` (3 placeholders)
  - `docs/terms-and-conditions.md` (1 placeholder)
- [ ] **Credentials in git** — `.env.staging` contains real Supabase service role key and PostHog key. Remove from git, add to `.gitignore`, and rotate the exposed credentials.

---

## 1. Supabase (Database & Auth)

### Production Project
- [ ] Create a production Supabase project (separate from staging)
- [ ] Note the production URL and anon key
- [ ] Note the service role key (store securely — never in git)

### Migrations
- [ ] Apply all 20 migrations to production: `supabase db push --linked`
- [ ] Verify all tables created: `profiles`, `groups`, `group_members`, `matches`, `match_group_settings`, `scenarios`, `predictions`, `notifications`, `players`, `match_squads`, `teams`, `points_config`
- [ ] Verify RLS enabled on all tables
- [ ] Verify Realtime enabled on: `predictions`, `scenarios`, `matches`, `group_members`, `notifications`

### Seed Data
- [ ] Seed IPL 2026 teams (10 teams with codes, names, colours)
- [ ] Seed IPL 2026 fixtures (at least first week of matches)
- [ ] Seed player squads (~25 per team)
- [ ] Seed points_config with system scenario definitions
- [ ] **DO NOT** run `seed.sql` on production — it has a safety guard but is for local dev only

### Auth Configuration
- [ ] Enable Magic Link (email OTP) in Supabase Auth settings
- [ ] Set site URL to production domain: `https://bragg-lemon.vercel.app` (or custom domain)
- [ ] Add redirect URLs: `https://bragg-lemon.vercel.app/auth/callback`
- [ ] Customise magic link email template (brand it as "Bragg")
- [ ] Set magic link expiry (default 1 hour is fine)
- [ ] Verify email rate limits are sensible (default: 4 emails/hour)

### Edge Functions
- [ ] Deploy match-cron: `supabase functions deploy match-cron`
- [ ] Set edge function secrets: `CRICKET_API_KEY`, `CRICKET_API_BASE_URL`, `CRICKET_API_LEAGUE_KEY`
- [ ] Verify pg_cron schedule is active (runs every minute during match hours)
- [ ] Test a dry run with a past/test match to confirm polling works

---

## 2. Vercel (Hosting & Deployment)

### Environment Variables
Set all of these in **Vercel Dashboard > Project Settings > Environment Variables** (Production scope):

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-prod-project.supabase.co` | From Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | From Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Sensitive — never expose client-side |
| `CRICKET_API_KEY` | Your api-cricket.com key | From api-cricket.com account |
| `CRICKET_API_BASE_URL` | `https://apiv2.api-cricket.com/cricket/` | v2.0 endpoint |
| `CRICKET_API_LEAGUE_KEY` | Your league key | For IPL-specific data |
| `NEXT_PUBLIC_APP_URL` | `https://bragg-lemon.vercel.app` | Or your custom domain |
| `NEXT_PUBLIC_APP_NAME` | `Bragg` | |
| `NEXT_PUBLIC_MOCK_MODE` | `false` | **CRITICAL** — must be false in production |
| `ENABLE_DEBUG_LOGS` | `false` | Disable console logging in production |
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_...` | Production PostHog project key |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` | Or EU host if preferred |

### Deployment
- [ ] Set root directory to `web-app` in Vercel project settings
- [ ] Verify `vercel.json` is correct (framework: nextjs, build: npm run build)
- [ ] Trigger a production deploy
- [ ] Verify build passes with all env vars set
- [ ] Check build output — all routes render (static + dynamic)

### Domain (if using custom domain)
- [ ] Purchase domain (e.g., `bragg.app`, `bragg.cricket`, `getbragg.in`)
- [ ] Add domain in Vercel Dashboard > Project Settings > Domains
- [ ] Configure DNS records (Vercel provides the values)
- [ ] Wait for SSL certificate provisioning (automatic)
- [ ] Update `NEXT_PUBLIC_APP_URL` env var to the custom domain
- [ ] Update `metadataBase` in `src/app/layout.tsx` if domain changes
- [ ] Update Supabase auth redirect URLs to include the custom domain
- [ ] Update `supabase/config.toml` site_url and redirect URLs

---

## 3. PostHog (Analytics)

- [ ] Create a production PostHog project (separate from staging/dev)
- [ ] Note the production project API key
- [ ] Set `NEXT_PUBLIC_POSTHOG_KEY` in Vercel with the production key
- [ ] Verify events are flowing after first deploy (check PostHog dashboard)
- [ ] Set up key dashboards:
  - Daily active users
  - Predictions submitted per match
  - Onboarding completion rate
  - Squad creation funnel
  - Error rate
- [ ] Configure data retention period (recommended: 12 months)

---

## 4. Cricket API

- [ ] Sign up at api-cricket.com and obtain API key
- [ ] Verify API access for IPL 2026 data (matches, scorecards, squads)
- [ ] Check API rate limits and plan tier:
  - Free tier: 100 requests/day (not enough for live matches)
  - Paid tier: sufficient for 1-minute polling during matches
- [ ] Map first week's IPL matches to Cricket API match IDs
- [ ] Test API responses with a sample match endpoint
- [ ] Verify scorecard format matches the parser in `src/lib/scorecard-parser.ts`

---

## 5. Security Audit

### Credentials
- [ ] Remove `.env.staging` from git history (or rotate all credentials in it)
- [ ] Add `.env.staging` and `.env.production` to `.gitignore`
- [ ] Verify no secrets are in client-side code (`NEXT_PUBLIC_` vars are safe; service role key is NOT)
- [ ] Verify Supabase service role key is only used server-side

### Headers (already configured in `next.config.ts`)
- [x] `X-Frame-Options: DENY`
- [x] `X-Content-Type-Options: nosniff`
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [x] Content Security Policy with PostHog, Supabase, and Cricket API whitelisted

### Auth
- [x] Open redirect prevention in auth callback (`sanitizeRedirect`)
- [x] Protected routes require authentication (middleware)
- [x] Onboarding gate prevents access to app without completing profile
- [x] RLS on all database tables

### Database
- [x] Row Level Security enabled on all 12+ tables
- [x] Predictions hidden until deadline passes (RLS enforced)
- [x] Admin actions gated by role checks in server actions
- [x] SECURITY DEFINER functions properly scoped

---

## 6. Legal & Compliance

- [ ] Replace all `[INSERT_*]` placeholders (see Critical Blockers above)
- [ ] Set up the contact email addresses (privacy@, legal@, or a single address)
- [ ] Designate a Grievance Officer (required by DPDPA and IT Intermediary Guidelines)
- [ ] Verify the footer disclaimer appears on every page: "Not affiliated with BCCI, IPL, or any franchise."
- [ ] Verify age gate (18+) enforced during onboarding with date of birth check
- [ ] Verify terms acceptance checkbox exists in onboarding flow
- [ ] Verify Privacy Policy and Terms pages are accessible from footer links
- [ ] Verify PostHog tracking is disabled on `/privacy` and `/terms` pages

---

## 7. Smoke Test (Post-Deploy)

Run through the complete user journey on the production URL:

### Auth Flow
- [ ] Visit landing page — loads correctly, CTAs work
- [ ] Click "Start Your Squad" — redirects to login
- [ ] Enter email — magic link sent (check email deliverability)
- [ ] Click magic link — redirected to onboarding
- [ ] Complete onboarding (name, DOB, terms checkbox) — redirected to dashboard

### Squad Flow
- [ ] Create a squad — success, redirected to squad page
- [ ] Copy invite link — link works
- [ ] Open invite link in incognito — shows join page with login prompt
- [ ] Second user joins via code — "You're in the queue!" shown
- [ ] Admin sees pending request in Admin HQ — approves member
- [ ] Second user sees squad in their dashboard

### Prediction Flow
- [ ] Navigate to a match prediction page
- [ ] Scenarios load correctly (16 system scenarios)
- [ ] Select picks for multiple scenarios
- [ ] Submit predictions — "Locked in!" shown
- [ ] Verify predictions appear in match leaderboard after deadline

### Admin Flow
- [ ] Enter match results manually (admin panel)
- [ ] Verify predictions resolve and leaderboard updates
- [ ] Verify season standings update

### Edge Cases
- [ ] Try submitting predictions after deadline — should be blocked
- [ ] Try joining a squad you're already in — correct error message
- [ ] Try accessing a squad you're not a member of — redirected
- [ ] Invalid invite code — correct error message

### Analytics Verification
- [ ] Check PostHog dashboard — page views flowing
- [ ] Check PostHog — `auth_callback_success` events after login
- [ ] Check PostHog — `prediction_submitted` events after picks
- [ ] Check PostHog — `group_created` events after squad creation

---

## 8. Performance & Monitoring

- [ ] Check Vercel Analytics — page load times acceptable (<3s)
- [ ] Check Vercel Functions — no function timeouts
- [ ] Monitor Supabase Dashboard during first live match:
  - Active connections count
  - Realtime subscription count
  - Database query performance
  - Edge function execution logs
- [ ] Monitor Cricket API quota usage during first match
- [ ] Set up alerts for:
  - High error rate (PostHog or Vercel)
  - Edge function failures
  - Database connection pool exhaustion

---

## 9. First Match Day Checklist (IPL Match 1)

### Before the Match (T-2 hours)
- [ ] Verify match fixture exists in database with correct date/time
- [ ] Verify system scenarios are seeded for the match
- [ ] Verify match-cron edge function is running
- [ ] Confirm Cricket API returns data for this match ID
- [ ] Check that users can submit predictions

### During the Match
- [ ] Monitor Supabase Dashboard (connections, Realtime, Edge Function logs)
- [ ] Monitor Cricket API quota usage
- [ ] Verify cron runs every minute (check `last_polled_at` on match row)
- [ ] Verify progressive scenario resolution (toss → powerplay → innings → final)
- [ ] Watch for Realtime disconnects (>30s gaps)

### After the Match
- [ ] Verify all scenarios resolved correctly
- [ ] Verify leaderboard shows final scores
- [ ] Verify season standings updated
- [ ] If auto-resolution failed: use admin panel to enter results manually
- [ ] Check PostHog for any error spikes

### Fallback Plan
- [ ] If Cricket API fails entirely: admin enters all results manually via Admin HQ
- [ ] If Supabase Realtime disconnects: users can refresh for updated data
- [ ] If edge function crashes: restart via Supabase Dashboard, then manual entry as backup

---

## 10. Post-Launch (First Week)

- [ ] Monitor daily active users in PostHog
- [ ] Monitor error rates — fix any recurring issues
- [ ] Respond to user feedback (if feedback channel set up)
- [ ] Verify match-cron works reliably across multiple matches
- [ ] Scale Supabase plan if approaching free tier limits:
  - Database: 500MB storage
  - Realtime: 200 concurrent connections
  - Edge Functions: 500K invocations/month
- [ ] Scale Cricket API plan if approaching rate limits
- [ ] Review PostHog analytics for drop-off points in user flow
- [ ] Back up database (Supabase provides daily backups on Pro plan)

---

## Quick Reference: Production Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY]

# Cricket API
CRICKET_API_KEY=[API_KEY]
CRICKET_API_BASE_URL=https://apiv2.api-cricket.com/cricket/
CRICKET_API_LEAGUE_KEY=[LEAGUE_KEY]

# App
NEXT_PUBLIC_APP_URL=https://bragg-lemon.vercel.app
NEXT_PUBLIC_APP_NAME=Bragg
NEXT_PUBLIC_MOCK_MODE=false
ENABLE_DEBUG_LOGS=false

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=[PRODUCTION_PROJECT_KEY]
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

---

## Quick Reference: Key Commands

```bash
# Deploy to Vercel (auto on git push, or manual)
vercel --prod

# Apply migrations to production Supabase
supabase db push --linked

# Deploy edge function
supabase functions deploy match-cron

# Run production build locally
npm run build && npm start

# Run tests before deploy
npm test -- --run
```
