# Phase 8 — Polish

**Goal:** Build the real landing page, add loading states, polish empty/error states, do accessibility and performance audits, validate SEO meta tags, and run a full smoke test of critical flows. Ship-ready quality.

**Exit criteria:**
- Landing page (`/`) is the real polished marketing page (not the Phase 0 placeholder)
- All data-heavy pages show loading skeletons
- All pages have proper error boundaries
- SEO meta tags and Open Graph configured for public pages
- Accessibility audit passes (axe-core, keyboard navigation, screen reader)
- Web Vitals targets met (LCP < 2.5s, INP < 200ms, CLS < 0.1) per PRD
- End-to-end smoke test passes for critical user flows
- Launch checklist completed

---

## POL-UI-001: Landing page (full implementation)

**Phase:** Phase 8 — Polish
**Priority:** P0
**Estimated effort:** Large (2–3 days)
**Status:** Not started

**User story:**
> As a visitor,
> I want a polished landing page that explains what Bragg is, how it works, and invites me to create or join a gang,
> So that I understand the product and want to sign up.

**Context / Why:**
Phase 0 (FND-002) had a placeholder landing page. This is the real marketing front door.

**Acceptance criteria:**
- [ ] Page: `src/app/page.tsx` (server component)
- [ ] Authenticated users redirected to `/dashboard` (via middleware or page-level check)
- [ ] Includes Global Footer (no nav bar — landing is standalone-ish)
- [ ] Sections per PRD:
  1. **Hero Section:**
     - App logo and "Bragg" wordmark with gradient text
     - Tagline: "Predict right. Prove it. Bragg." (per PRD Product Feel)
     - Sub-tagline: "The IPL prediction game for bragging rights..."
     - CTA buttons: "Start Your Gang" → `/login?redirectTo=/dashboard`, "Got an Invite?" → `/login`
     - Ambient background effects: stadium floodlight glows, diagonal energy lines, grain overlay (per existing design-system)
     - Fade-in animations with staggered delays
  2. **How It Works Section:**
     - 3 cards: "Rally Your Squad", "Lock In Your Picks", "Own the Leaderboard"
     - Each with step number, icon, title, description
  3. **Prediction Preview Section:**
     - Mock match card (RCB vs CSK or similar)
     - 4 sample scenarios with options
     - "+15 more scenarios" indicator
  4. **CTA Section:**
     - Repeated "Start Your Gang" / "Got an Invite?" CTAs
  5. **Global Footer**
- [ ] Mobile-first responsive design
- [ ] Dark mode styling
- [ ] Tone: punchy, Bragg voice (per PRD)
- [ ] Copy is final and approved
- [ ] All images/icons optimized
- [ ] Meta tags + Open Graph (title, description, image)
- [ ] Page metadata: `<title>Bragg — Cricket Predictions Built for Bragging Rights</title>`

**Out of scope:**
- Auth flow (Phase 1)
- Dashboard (Phase 2)

**Dependencies:** FND-006, AUTH-UI-005 (footer reused on landing)
**Blocks:** None (final touch)

**PRD references:**
- [Landing Page](../PRD.V2.md#landing-page-)
- [Product feel](../PRD.V2.md#product-feel)
- [Non-Functional Requirements § SEO](../PRD.V2.md#non-functional-requirements)

**Technical notes:**
- Split into subcomponents: `HeroSection`, `HowItWorks`, `PredictionPreview`, `CtaSection`
- Use `next/image` for optimized images
- Animations: Tailwind animation classes or Framer Motion if needed
- Open Graph image: generate a branded preview image (1200x630)

**Analytics events:**
- `LANDING_PAGE_VIEWED` (autocapture)
- `LANDING_CTA_CLICKED` — `{ cta: 'start_gang' | 'got_invite' }`

**Unit tests:**
- [ ] Renders all sections
- [ ] Authenticated users redirected
- [ ] CTAs link to correct auth routes

**Test plan:**
- [ ] Desktop + mobile visual check
- [ ] Test animations on load
- [ ] Share link in WhatsApp/Twitter, verify OG preview
- [ ] Run Lighthouse, verify performance scores

**Open questions:**
- Do we have final copy for the tagline and CTAs? (Check with PM; use PRD copy as default)

---

## POL-UI-002: Loading states and skeletons

**Phase:** Phase 8 — Polish
**Priority:** P0
**Estimated effort:** Medium (1–2 days)
**Status:** Not started

**User story:**
> As a user on a slow connection,
> I want to see loading skeletons while pages load,
> So that I know the app is working and not broken.

**Context / Why:**
Data-heavy pages (Dashboard, Gang Page, Match Leaderboard, Standings, Profile) all need loading states. Next.js provides `loading.tsx` for route-level, plus `<Suspense>` for component-level.

**Acceptance criteria:**
- [ ] Route-level loading files for all authenticated routes:
  - `src/app/dashboard/loading.tsx`
  - `src/app/group/[groupId]/loading.tsx`
  - `src/app/group/[groupId]/match/[matchId]/loading.tsx`
  - `src/app/group/[groupId]/predict/[matchId]/loading.tsx`
  - `src/app/group/[groupId]/standings/loading.tsx`
  - `src/app/group/[groupId]/settings/loading.tsx`
  - `src/app/profile/loading.tsx`
- [ ] Each loading file renders skeleton UI matching the expected page layout
- [ ] Skeletons use Tailwind `animate-pulse` on gray blocks
- [ ] Reusable skeleton primitives in `src/components/ui/skeleton.tsx` (shadcn default)
- [ ] Feature-specific skeletons where needed (e.g., `match-card-skeleton`, `leaderboard-row-skeleton`)
- [ ] No layout shift between skeleton and real content (CLS target < 0.1)
- [ ] Also handles Suspense boundaries for streaming SSR

**Out of scope:**
- Real data fetching (already done in each phase)

**Dependencies:** All UI pages built
**Blocks:** None (final polish)

**PRD references:**
- [Non-Functional Requirements § Performance](../PRD.V2.md#non-functional-requirements)

**Technical notes:**
- Use `aspect-ratio` and fixed heights to prevent layout shift
- Skeletons should match the actual component's dimensions
- Skeleton-first design: build skeletons before the real component if needed

**Analytics events:** None

**Unit tests:**
- [ ] Each loading.tsx renders without error

**Test plan:**
- [ ] Throttle network in DevTools, navigate between pages
- [ ] Verify skeletons appear and layout is stable
- [ ] Check CLS in Lighthouse

**Open questions:** None

---

## POL-UI-003: Error boundaries for critical routes

**Phase:** Phase 8 — Polish
**Priority:** P0
**Estimated effort:** Small (4–6 hours)
**Status:** Not started

**User story:**
> As a user who hits a rendering error,
> I want a contextual error message with a recover option,
> So that I can continue using the app without reloading from scratch.

**Context / Why:**
Next.js supports `error.tsx` files at each route level. Adding these to critical routes gives users recovery options closer to where the error happened.

**Acceptance criteria:**
- [ ] Route-level error files for:
  - `src/app/dashboard/error.tsx`
  - `src/app/group/[groupId]/error.tsx`
  - `src/app/group/[groupId]/predict/[matchId]/error.tsx`
  - `src/app/group/[groupId]/match/[matchId]/error.tsx`
  - Global fallback: `src/app/error.tsx` (already created in Phase 1 AUTH-UI-010)
- [ ] Each error.tsx:
  - Shows a friendly error message (not stack trace)
  - "Try Again" button → calls Next.js `reset` function
  - "Go to Dashboard" link as fallback
  - Logs the error to PostHog with `ERROR_BOUNDARY_CAUGHT` event
  - Matches brand voice
- [ ] No sensitive information leaked (no stack trace or error digest to users)

**Out of scope:**
- Global error boundary (done in Phase 1)

**Dependencies:** AUTH-UI-010, FND-005
**Blocks:** None

**PRD references:**
- [Analytics § Error Reporting](../PRD.V2.md#analytics)
- [Error Page (500)](../PRD.V2.md#error-page-500)

**Technical notes:**
- `error.tsx` must be a client component (`"use client"`)
- Error digest from Next.js can be logged server-side but not shown to user
- Use `useEffect` to capture to PostHog

**Analytics events:**
- `ERROR_BOUNDARY_CAUGHT` — `{ route, error_message, digest }`

**Unit tests:**
- [ ] Each error.tsx renders with reset button
- [ ] Clicking reset triggers the function
- [ ] PostHog event fires on mount

**Test plan:**
- [ ] Inject a test error in each route, verify error page renders
- [ ] Verify PostHog captures the error

**Open questions:** None

---

## POL-UI-004: SEO meta tags and Open Graph

**Phase:** Phase 8 — Polish
**Priority:** P1
**Estimated effort:** Small (3–5 hours)
**Status:** Not started

**User story:**
> As someone sharing a Bragg link on social media,
> I want the link preview to show a branded image and compelling description,
> So that the shared link looks professional.

**Context / Why:**
Per PRD, landing page and join invite pages need meta tags and Open Graph for rich previews.

**Acceptance criteria:**
- [ ] `src/app/layout.tsx` — root metadata with defaults (title template, description, keywords)
- [ ] Landing page (`/`) — overrides title, description, OG image
- [ ] Join page (`/join/[code]`) — dynamic `generateMetadata` returning:
  - Title: "Join {gangName} on Bragg"
  - Description: "You've been called up to {gangName} — the IPL prediction game built for bragging rights."
  - OG type: website
  - OG image: branded image (can be generic for launch; dynamic per-gang image is a stretch goal)
- [ ] Dashboard, Gang Page, etc. — use default title template `%s | Bragg`
- [ ] `robots.txt` configured (allow indexing for public pages, disallow `/group/*`, `/dashboard`, `/profile`, `/predict/*`)
- [ ] `sitemap.xml` generated by Next.js for public routes
- [ ] Favicon + app icons in multiple sizes
- [ ] Apple touch icon
- [ ] Twitter card meta tags

**Out of scope:**
- Dynamic per-gang OG images
- Multi-language support

**Dependencies:** POL-UI-001
**Blocks:** None

**PRD references:**
- [Non-Functional Requirements § SEO](../PRD.V2.md#non-functional-requirements)
- [Join Page](../PRD.V2.md#join-page-joincode)

**Technical notes:**
- Use Next.js `Metadata` API
- Root layout exports default metadata
- Page-level `export const metadata` or `generateMetadata`

**Analytics events:** None

**Unit tests:**
- [ ] `generateMetadata` for join page returns correct shape

**Test plan:**
- [ ] Share landing page URL in WhatsApp, Twitter, LinkedIn — verify preview
- [ ] Share a join link, verify gang name appears in preview
- [ ] Run `curl` or Open Graph checker tool to verify meta tags

**Open questions:**
- Do we need localized meta tags? (No — English only per PRD)

---

## POL-OPS-001: STG deploy + environment validation

**Phase:** Phase 8 — Polish
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As the developer,
> I want the full app deployed to STG with all environment variables configured correctly,
> So that I can run end-to-end tests against a production-like environment.

**Context / Why:**
Before final QA, everything needs to work on STG. This story is a checklist of deploy steps and smoke checks.

**Acceptance criteria:**
- [ ] `web-app-2` deployed to Vercel (or similar) linked to STG Supabase
- [ ] Environment variables set:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — STG values
  - `SUPABASE_SERVICE_ROLE_KEY` — server-side only
  - `SPORTMONKS_API_TOKEN`, `SPORTMONKS_BASE_URL`
  - `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
  - `APP_URL` — STG deployment URL
  - `CURRENT_TERMS_VERSION` — current value
- [ ] Supabase edge functions deployed (`sync-fixtures`, `sync-fixtures-pre-match`, `live-poll-resolve-fixtures`)
- [ ] `pg_cron` schedules configured and verified with `SELECT * FROM cron.job`
- [ ] Service role key NOT exposed in client bundle (verify via bundle analyzer)
- [ ] HTTPS enforced (no mixed content warnings)
- [ ] All routes accessible from a smoke test browser session
- [ ] PostHog events confirmed flowing (check dashboard)
- [ ] Sportmonks API token verified against a known fixture
- [ ] Migration status: all migrations applied successfully

**Out of scope:**
- Production deploy (post-launch)

**Dependencies:** All previous phases
**Blocks:** POL-QA-001

**PRD references:**
- [Tech Stack](../PRD.V2.md#tech-stack)
- [Security](../PRD.V2.md#security)

**Technical notes:**
- Document env var setup in `supabase-2/README.md` and `web-app-2/README.md`
- Use Vercel's encrypted env vars or similar

**Analytics events:** None

**Unit tests:** None (manual verification)

**Test plan:**
- [ ] Fresh deploy to Vercel STG
- [ ] Run `supabase functions deploy` for each edge function
- [ ] Apply migrations to STG via `supabase db push`
- [ ] Run data migration script
- [ ] Access landing page, verify no errors in browser console
- [ ] Trigger each cron manually, verify success

**Open questions:** None

---

## POL-QA-001: End-to-end smoke test

**Phase:** Phase 8 — Polish
**Priority:** P0
**Estimated effort:** Medium (1–2 days)
**Status:** Not started

**User story:**
> As the developer,
> I want to run a full end-to-end test covering the critical user journeys,
> So that I'm confident the app works before launch.

**Context / Why:**
Catches integration issues that unit tests miss.

**Acceptance criteria:**
- [ ] Automated E2E tests using Playwright (or similar) covering:
  1. **Signup flow:** visit landing → click CTA → login → enter email → open magic link (manual or mock) → complete onboarding → land on dashboard
  2. **Create gang flow:** from dashboard → enter gang name → submit → land on new gang page
  3. **Join gang flow:** from dashboard → enter invite code → submit (auto-accept on) → land on gang page
  4. **Predict flow:** from gang page → click upcoming match → fill all scenarios → submit → verify success
  5. **Admin approve flow:** second user requests to join (manual approval) → admin sees in settings → approves → second user sees gang
  6. **Live resolution flow:** simulate a match going live → verify scorecard updates → simulate match end → verify resolution → verify standings update
  7. **Delete gang flow:** admin goes to settings → delete gang → confirms → verifies gang is gone from dashboard
  8. **Sign out flow:** user menu → sign out → verify redirect to landing

- [ ] Manual test cases (not automated) documented in `docs/test-plan.md`:
  - Mobile device testing (iOS Safari, Android Chrome)
  - Cross-browser (Chrome, Firefox, Safari, Edge)
  - Accessibility (keyboard only, screen reader)
  - Localization (verify timezone handling for IST, UTC, PST users)
- [ ] All smoke tests passing on STG
- [ ] Any blockers found → create follow-up stories

**Out of scope:**
- Full automated test suite (just smoke-level coverage)

**Dependencies:** POL-OPS-001
**Blocks:** POL-LAUNCH-001

**PRD references:**
- Entire PRD — all critical paths must work

**Technical notes:**
- Playwright config: `e2e/` folder in `web-app-2/`
- Test data: seed specific test fixtures + users
- Use Supabase test project or reset DB between runs
- Magic link: either mock by querying `auth.users` token directly, or use Supabase's test helper

**Analytics events:** Verify events fire correctly in tests

**Unit tests:** N/A (this is the E2E suite)

**Test plan:**
- [ ] Run full E2E suite, all passing
- [ ] Manual mobile test on iOS + Android
- [ ] Manual accessibility pass with VoiceOver/NVDA

**Open questions:**
- Which E2E framework? (Recommendation: Playwright — best Next.js + Supabase support)

---

## POL-LAUNCH-001: Launch readiness checklist

**Phase:** Phase 8 — Polish
**Priority:** P0
**Estimated effort:** Small (4–6 hours + ongoing)
**Status:** Not started

**User story:**
> As the product owner,
> I want a launch readiness checklist covering all pre-launch validations,
> So that I'm confident Bragg is ready for IPL Match 1.

**Context / Why:**
Final gate before production. Covers technical, business, and legal checks.

**Acceptance criteria:**
- [ ] Document: `docs/launch-checklist.md`
- [ ] Sections:
  - **Technical:**
    - [ ] All phases (0-8) complete
    - [ ] All P0 stories done
    - [ ] E2E smoke tests passing (POL-QA-001)
    - [ ] Web Vitals targets met (verify via Lighthouse)
    - [ ] Accessibility audit passed (axe-core, keyboard, screen reader)
    - [ ] Error monitoring live (PostHog verified)
    - [ ] Database backup enabled (Supabase managed)
    - [ ] DNS configured for production domain
    - [ ] SSL certificates valid
  - **Data:**
    - [ ] IPL 2026 fixtures imported successfully
    - [ ] All 10 teams with logos and colors
    - [ ] ~250 players imported with team mappings
    - [ ] v1 user data migrated (profiles, gangs, memberships)
    - [ ] Scenario templates seeded (19 active + 1 inactive)
  - **Operational:**
    - [ ] All 6 cron jobs scheduled in pg_cron
    - [ ] Sportmonks API quota confirmed (daily usage estimated)
    - [ ] Supabase quota confirmed (DB, edge functions, realtime)
    - [ ] PostHog project + dashboard ready
    - [ ] System admin access documented
  - **Business/Legal:**
    - [ ] Privacy policy reviewed and live
    - [ ] Terms of service reviewed and live
    - [ ] Gambling disclaimers present on all required pages
    - [ ] Age gate working (18+)
    - [ ] Terms version committed to code constant
  - **Content:**
    - [ ] Landing page copy final
    - [ ] All empty states have Bragg-voice copy
    - [ ] Error messages are friendly and actionable
    - [ ] Match announcement message / blog post (optional)
  - **Post-launch monitoring:**
    - [ ] Alerting set up for cron failures
    - [ ] Analytics dashboard to watch during Match 1
    - [ ] Rollback plan documented
    - [ ] On-call rotation for launch day (even if just one person)

**Out of scope:**
- Marketing campaign (outside engineering scope)

**Dependencies:** All previous stories
**Blocks:** Nothing (this is the final gate)

**PRD references:** Entire PRD

**Technical notes:**
- This is more of a coordination story than a coding story
- Checklist should be reviewed the week before Match 1

**Analytics events:** None

**Unit tests:** None

**Test plan:**
- [ ] Walk through the entire checklist, mark each item as complete or explicitly defer
- [ ] Any unresolved items must have a clear owner and ETA

**Open questions:**
- Who owns the launch day on-call? (TBD — assign before launch day)

---

## Summary

Phase 8 delivers the final polish that takes Bragg from "feature-complete" to "ship-ready". It's lower in story count but critical — skipping this phase would mean launching with rough edges.

**Story count:** 7 stories (1 UI landing, 1 loading states, 1 error boundaries, 1 SEO, 1 ops, 1 QA, 1 launch checklist)
**Estimated total effort:** ~6–10 working days

**Ship readiness:**
- ✅ Real landing page
- ✅ Loading skeletons
- ✅ Error boundaries
- ✅ SEO + Open Graph
- ✅ STG deployed with all env vars
- ✅ E2E smoke tests passing
- ✅ Launch checklist complete

**🚀 READY TO LAUNCH**
