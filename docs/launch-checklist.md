# Bragg v2 — Launch Readiness Checklist

Target: IPL 2026, Match 1

Review this checklist the week before Match 1. Every item must be explicitly marked **done** or **deferred with owner + ETA**. No item may be left unchecked.

---

## 1. Technical

### Codebase

- [ ] All phases (0-8) complete — every story in `docs/stories/` is marked done
- [ ] All P0 stories done with no outstanding blockers
- [ ] E2E smoke tests passing on STG (POL-QA-001)
- [ ] `npm run lint` passes with zero errors and zero warnings
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds without errors

### Performance

- [ ] Web Vitals targets met (verify via Lighthouse on production URL):
  - LCP < 2.5s
  - INP < 200ms
  - CLS < 0.1
- [ ] No render-blocking resources on critical paths (landing, dashboard, gang page)
- [ ] Images optimized — all team logos and static assets served via Next.js Image or CDN

### Accessibility

- [ ] Accessibility audit passed (axe-core, zero critical violations)
- [ ] Keyboard navigation works on all interactive elements
- [ ] Screen reader tested (VoiceOver on macOS/iOS)
- [ ] Color contrast meets WCAG 2.1 AA minimum (4.5:1 for body text, 3:1 for large text)

### Security

- [ ] Per-user rate limiting deployed on all mutation server actions (POL-SEC-001)
- [ ] Service role key NOT exposed in client bundle (verify via bundle analyzer or `grep` on `.next/static`)
- [ ] HTTPS enforced — no mixed content warnings
- [ ] Supabase RLS enabled on all `v2_*` tables
- [ ] Table-level GRANT permissions applied (migration `20260407000012_grant_table_permissions.sql`)
- [ ] No `dangerouslySetInnerHTML` usage in codebase
- [ ] Auth callback URL restricted to production domain in Supabase dashboard

### Infrastructure

- [ ] Error monitoring live — PostHog capturing errors from production
- [ ] Database backup enabled (Supabase managed, point-in-time recovery)
- [ ] DNS configured for production domain
- [ ] SSL certificates valid and auto-renewing
- [ ] Vercel deployment connected to `main` branch with auto-deploy
- [ ] Environment variables set in Vercel (see `docs/deployment.md` section 3)

---

## 2. Data

### Fixtures & Teams

- [ ] IPL 2026 fixtures imported successfully via `sync-fixtures` edge function
- [ ] All 10 IPL teams present in `v2_league_teams` with:
  - Team name and short code
  - Team colors (primary, secondary)
  - Logo URLs resolving correctly
  - Sportmonks `api_id` mapped
- [ ] ~250 players imported in `v2_players` with team mappings in `v2_league_season_team_players`
- [ ] `v2_seasons` has one row: IPL 2026 with `is_active = true`

### Scenario Templates

- [ ] 20 scenario templates seeded in `v2_scenario_templates`:
  - 19 with `is_active = true`
  - 1 (`total_match_catches`) with `is_active = false`
- [ ] Template placeholders (`{Home Team}`, `{Away Team}`) resolve correctly in seeded scenarios

### Migration

- [ ] v1 user data migrated (profiles, gangs, memberships) via migration `20260406000006_migrate_from_v1.sql`
- [ ] Migrated users can log in and see their gangs
- [ ] No orphaned data (memberships without gangs, predictions without scenarios)

---

## 3. Operational

### Cron Jobs

All 6 scheduled jobs must be active in `pg_cron`. Verify with:

```sql
SELECT jobid, schedule, command, nodename, active
FROM cron.job
ORDER BY jobid;
```

| Job | Schedule | Type | Verified |
|-----|----------|------|----------|
| `sync-fixtures` | `30 23 * * *` (5 AM IST) | Edge Function via pg_net | [ ] |
| `sync-fixtures-pre-match` | `*/15 * * * *` (every 15 min) | Edge Function via pg_net | [ ] |
| `seed-scenarios` | `*/30 * * * *` (every 30 min) | Postgres function (DB-only) | [ ] |
| `live-poll-resolve-fixtures` | `15 seconds` | Edge Function via pg_net | [ ] |
| `deadline-reminders` | `*/15 * * * *` (every 15 min) | Postgres function (DB-only) | [ ] |
| `rate-limit-cleanup` | `0 0 * * *` (daily midnight UTC) | Postgres function (DB-only) | [ ] |

- [ ] All 6 jobs show `active = true`
- [ ] Edge functions deployed: `sync-fixtures`, `sync-fixtures-pre-match`, `live-poll-resolve-fixtures`
- [ ] Edge function secrets set: `SB_SERVICE_ROLE_KEY`, `SPORTMONKS_API_TOKEN`

### API Quotas

- [ ] Sportmonks API quota confirmed:
  - Daily sync: ~1-2 calls/day
  - Pre-match sync: ~4-8 calls/match day
  - Live polling: ~720 calls/match (4/min x 180 min)
  - Total per match day: ~730 calls (verify plan supports this)
- [ ] Supabase quota confirmed:
  - Database size within plan limit
  - Edge function invocations within plan limit
  - Realtime connections within plan limit (one per active user)

### Monitoring

- [ ] PostHog project created and receiving events
- [ ] PostHog dashboard configured with key metrics:
  - Daily active users
  - Predictions submitted per match
  - Gangs created
  - Error rates
  - Cron function execution logs
- [ ] System admin access documented (who can access Supabase dashboard, Vercel, PostHog)

---

## 4. Business / Legal

- [ ] Privacy policy reviewed and live at `/privacy`
- [ ] Terms of service reviewed and live at `/terms`
- [ ] Gambling disclaimers present on all required pages:
  - Landing page
  - Prediction submission page
  - Footer (site-wide)
- [ ] Age gate working (18+ verification during onboarding via date of birth)
- [ ] `CURRENT_TERMS_VERSION` constant committed to code and matches the live terms document
- [ ] Terms acceptance recorded in `v2_profiles.accepted_terms_version`

---

## 5. Content

- [ ] Landing page copy is final and reviewed (POL-UI-001)
- [ ] All empty states have Bragg-voice copy:
  - Dashboard with no gangs
  - Gang page with no upcoming matches
  - Gang page with no members (just the admin)
  - Prediction page with no scenarios (edge case)
  - Standings with no data yet
- [ ] Error messages are friendly and actionable:
  - Network errors
  - Auth failures
  - Rate limit hits
  - 404 page
  - Generic error boundary
- [ ] Loading skeletons present on all data-heavy pages (POL-UI-002)
- [ ] SEO meta tags and Open Graph configured for public pages (POL-SEO-001)

---

## 6. Post-Launch Monitoring

### Alerting

- [ ] Alerting configured for cron failures:
  - `sync-fixtures` failure → critical (no new fixtures)
  - `live-poll-resolve-fixtures` failure → critical (live scores stop updating)
  - `seed-scenarios` failure → high (predictions unavailable for upcoming matches)
  - `deadline-reminders` failure → low (users miss reminder but can still predict)
- [ ] Alert channel: PostHog + email (or preferred notification method)

### Analytics Dashboard

- [ ] Match 1 analytics dashboard ready to monitor during the match:
  - Active users (realtime)
  - Predictions submitted (cumulative)
  - Error rate
  - Cron execution status
  - API quota usage (Sportmonks)
  - Database connections and query latency

### Rollback Plan

- [ ] Rollback plan documented:
  - **Frontend:** Revert Vercel deployment to previous known-good commit
  - **Database:** Supabase point-in-time recovery available; note the timestamp before any migration
  - **Edge functions:** Redeploy previous version via `supabase functions deploy`
  - **Cron jobs:** Disable via `SELECT cron.unschedule('job-name')` if a cron is causing issues
  - **Full rollback:** If everything breaks, disable all crons, revert Vercel, restore DB, redeploy functions
- [ ] Rollback runbook printed / bookmarked / within arm's reach

### On-Call

- [ ] **On-call owner: Project owner (sole developer)**
- [ ] Solo on-call for Match 1 of IPL 2026
- [ ] Available from ~2 hours before toss through ~2 hours after match ends
- [ ] On-call owner has the following pinned and accessible:
  - [ ] PostHog dashboard
  - [ ] Supabase project dashboard (logs, cron status, DB usage)
  - [ ] Sportmonks API usage dashboard
  - [ ] Vercel deployment dashboard
  - [ ] Phone and laptop available and charged
  - [ ] Rollback runbook within arm's reach

### Communication

- [ ] Launch-day communication channel decided:
  - Where user reports will arrive (Twitter DMs, email, Discord, WhatsApp group, etc.)
  - Channel monitored for the duration of the on-call window
- [ ] Pre-launch announcement sent to early users / friends (optional)

---

## Sign-Off

| Area | Status | Sign-off date | Notes |
|------|--------|---------------|-------|
| Technical | | | |
| Data | | | |
| Operational | | | |
| Business/Legal | | | |
| Content | | | |
| Post-launch monitoring | | | |

**Launch decision:** [ ] GO / [ ] NO-GO

**Decision date:** _______________

**Decision maker:** Project owner
