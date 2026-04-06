# Phase 0 — Foundation

**Goal:** Parallel web-app-2 and supabase-2 folders exist, Next.js project is initialized, Supabase schema is deployed to STG with all v2 tables, triggers, RLS, indexes, seed data, and v1→v2 data migration. After this phase, the app starts but has no features yet.

**Exit criteria:**
- `web-app-2/` runs locally with empty placeholder landing page
- `supabase-2/` migrations apply cleanly to a fresh STG database
- Seed data is in place (sports, leagues, seasons, teams, scenario templates)
- v1 data has been migrated to v2 on STG (profiles + gangs + gang members)
- PostHog analytics initialized (events fire)
- Environment variables documented and validated

---

## FND-001: Create project folder structure

**Phase:** Phase 0 — Foundation
**Priority:** P0
**Estimated effort:** Small (< 1 hour)
**Status:** Not started

**User story:**
> As the developer,
> I want parallel `web-app-2` and `supabase-2` folders alongside the existing `web-app` and `supabase`,
> So that I can build the v2 implementation cleanly without breaking the current app.

**Context / Why:**
Per the PRD Implementation Plan section, we're keeping both old and new apps running during development for reference. Post-launch, the old folders will be deleted and new ones renamed.

**Acceptance criteria:**
- [ ] `web-app-2/` folder created at repo root
- [ ] `supabase-2/` folder created at repo root
- [ ] `supabase-2/migrations/` subfolder created
- [ ] `supabase-2/functions/` subfolder created
- [ ] Each folder has a `README.md` stub explaining its purpose and linking back to `docs/PRD.V2.md`
- [ ] Root `.gitignore` updated to include `web-app-2/node_modules`, `web-app-2/.next`, `supabase-2/.temp`, etc.
- [ ] Existing `web-app/` and `supabase/` folders are untouched

**Out of scope:**
- Initializing Next.js inside `web-app-2/` (FND-002)
- Initializing Supabase CLI config (FND-003)

**Dependencies:** None
**Blocks:** FND-002, FND-003, all subsequent stories

**PRD references:**
- [Implementation Plan § Folder structure](../PRD.V2.md#folder-structure)

**Technical notes:**
- Use `mkdir -p` to create nested folders
- README stubs should clearly state "v2 implementation of Bragg per docs/PRD.V2.md"

**Analytics events:** None
**Unit tests:** None (folder structure only)

**Test plan:**
- [ ] Verify folders exist with `ls -la`
- [ ] Verify `.gitignore` prevents tracking of node_modules
- [ ] Verify existing `web-app/` and `supabase/` are unchanged

**Open questions:** None

---

## FND-002: Initialize Next.js web-app-2

**Phase:** Phase 0 — Foundation
**Priority:** P0
**Estimated effort:** Small (1–2 hours)
**Status:** Not started

**User story:**
> As the developer,
> I want a clean Next.js 16 project in `web-app-2/` with TypeScript, Tailwind, and shadcn/ui,
> So that I can start building UI components on a modern stack that matches the PRD Tech Stack.

**Context / Why:**
Per PRD Tech Stack, we use Next.js (App Router), React, TypeScript, Tailwind CSS v4, and shadcn/ui. Initialize with the latest versions matching the existing web-app for consistency.

**Acceptance criteria:**
- [ ] Next.js project initialized in `web-app-2/` with App Router (`create-next-app` or manual)
- [ ] `.nvmrc` file created with `20` (Node 20 LTS) at `web-app-2/.nvmrc`
- [ ] `package.json` includes `"engines": { "node": ">=20.0.0" }`
- [ ] TypeScript configured (`tsconfig.json` with strict mode)
- [ ] Tailwind CSS v4 installed and configured (`tailwind.config.ts`, `globals.css`)
- [ ] shadcn/ui initialized via `npx shadcn@latest init` (with dark mode default, per PRD)
- [ ] ESLint + Prettier configured (match existing `web-app/` conventions)
- [ ] Folder structure:
  - `src/app/` — routes
  - `src/components/` — shared components
  - `src/components/ui/` — shadcn primitives
  - `src/lib/` — utilities, clients
  - `src/lib/actions/` — server actions
  - `src/lib/supabase/` — Supabase client helpers
  - `src/lib/analytics/` — PostHog helpers
  - `src/types/` — shared TS types
- [ ] Placeholder `/` route renders "Bragg V2 — Coming Soon"
- [ ] `npm run dev` starts the app on a different port than existing `web-app` (e.g., 3001) to allow parallel running
- [ ] `npm run build` succeeds with no errors
- [ ] `npm run lint` passes

**Out of scope:**
- Landing page content (covered by Landing Page story in later phase)
- Supabase client helpers (FND-004)
- Analytics (FND-005)
- Design system (FND-006)

**Dependencies:** FND-001
**Blocks:** FND-004, FND-005, FND-006, all UI stories

**PRD references:**
- [Tech Stack](../PRD.V2.md#tech-stack)
- [Non-Functional Requirements § Browser support](../PRD.V2.md#non-functional-requirements)

**Technical notes:**
- Use Next.js App Router, not Pages Router
- Set up `package.json` scripts: `dev`, `build`, `start`, `lint`, `typecheck`
- `port` set via `-p 3001` or `PORT=3001` in dev script
- Dark mode should be default (`"defaultTheme": "dark"` in shadcn)
- Include `lucide-react` as icon library (per PRD)

**Analytics events:** None yet (initialized in FND-005)
**Unit tests:**
- [ ] Verify `npm run build` succeeds as part of CI setup

**Test plan:**
- [ ] Run `npm install && npm run dev` in `web-app-2/`
- [ ] Verify app loads on http://localhost:3001
- [ ] Verify placeholder home page renders
- [ ] Verify `web-app/` (old) still runs on port 3000 in parallel

**Open questions:** None (decided: Node 20 LTS — v1 has no `.nvmrc` to match)

---

## FND-003: Initialize Supabase project structure

**Phase:** Phase 0 — Foundation
**Priority:** P0
**Estimated effort:** Small (1–2 hours)
**Status:** Not started

**User story:**
> As the developer,
> I want a clean Supabase project structure in `supabase-2/` with Supabase CLI configured,
> So that I can write migrations and edge functions for the v2 schema.

**Context / Why:**
The v2 database is large (20+ tables, many triggers, RLS policies). Proper migration tooling via Supabase CLI prevents drift and makes the setup reproducible across dev and STG environments.

**Acceptance criteria:**
- [ ] Supabase CLI initialized inside `supabase-2/` via `supabase init`
- [ ] `supabase-2/config.toml` set up with project-specific settings
- [ ] `supabase-2/migrations/` folder created with placeholder
- [ ] `supabase-2/functions/` folder created for edge functions
- [ ] `supabase-2/seed.sql` created (will be populated in FND-DB-005)
- [ ] STG Supabase project linked via `supabase link --project-ref <stg-ref>`
- [ ] `npm run db:migrate:stg` or equivalent script to deploy migrations
- [ ] Local dev Supabase setup documented (optional, if using local dev)
- [ ] `supabase-2/README.md` explains: how to run migrations, how to deploy functions, which project is STG

**Out of scope:**
- Writing actual migration files (FND-DB-001 onwards)
- Edge function implementation (covered in Phase 3+)

**Dependencies:** FND-001
**Blocks:** FND-DB-001, all DB stories, all edge function stories

**PRD references:**
- [Implementation Plan § Supabase-2 migration files](../PRD.V2.md#supabase-2-migration-files)
- [Tech Stack](../PRD.V2.md#tech-stack)

**Technical notes:**
- Supabase CLI version: use latest stable
- Do NOT link production Supabase at this stage — only STG
- Store STG project ref in a README or team-accessible location, not committed
- Consider using `supabase db push` for migration deployment to STG

**Analytics events:** None
**Unit tests:** None (infrastructure setup)

**Test plan:**
- [ ] Run `supabase status` and verify config loads
- [ ] Run `supabase db push --dry-run` and verify no errors
- [ ] Confirm STG project is linked (does not confuse with existing `supabase/` folder)

**Open questions:**
- Should we use local Supabase dev or go straight to STG? (Recommendation: straight to STG since we're doing a big-bang migration)

---

## FND-004: Supabase client setup

**Phase:** Phase 0 — Foundation
**Priority:** P0
**Estimated effort:** Small (2–3 hours)
**Status:** Not started

**User story:**
> As the developer,
> I want Supabase client helpers for server components, client components, middleware, and service-role operations,
> So that the rest of the app has a consistent, type-safe way to talk to the database.

**Context / Why:**
Per the PRD, we have several database access patterns: anon client (user-scoped with RLS), service role client (bypass RLS for cron/triggers), middleware client (cookie-based auth). Each needs its own helper to avoid confusion and security mistakes.

**Acceptance criteria:**
- [ ] `src/lib/supabase/server.ts` — server component client (reads cookies, applies RLS as user)
- [ ] `src/lib/supabase/client.ts` — browser client (for client components)
- [ ] `src/lib/supabase/middleware.ts` — middleware client (refreshes session cookies)
- [ ] `src/lib/supabase/service-role.ts` — service role client (for server actions that need elevated privileges; never imported by client code)
- [ ] TypeScript types generated from schema via `supabase gen types typescript --linked > src/types/database.ts` (even if schema is empty initially)
- [ ] Clients use `@supabase/ssr` package (latest version)
- [ ] Environment variable validation — app fails to start if `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` (server only) is missing
- [ ] Service role client is NEVER imported from any file in `src/app/` except server actions in `src/lib/actions/`
- [ ] Comment in `service-role.ts` warns about security: "NEVER import this from client components"
- [ ] `src/lib/supabase/service-role.ts` has `import 'server-only'` as its first line (hard guarantee: throws a build error if bundled into client code)
- [ ] `server-only` package added to `web-app-2/package.json` dependencies
- [ ] ESLint `no-restricted-imports` rule added to `.eslintrc` that blocks importing `@/lib/supabase/service-role` (and relative-path variants) from anywhere except:
  - `src/lib/actions/**` (server actions)
  - `src/lib/supabase/service-role.ts` itself
  - `supabase/functions/**` (Edge Functions, if they ever live in the same ESLint scope)
- [ ] Violating the rule fails `npm run lint` (and therefore CI)

**Out of scope:**
- Actual auth helper functions (`getUser`, `getSession`) — per-story as needed
- Specific DAL functions — per-feature

**Dependencies:** FND-002, FND-003
**Blocks:** All server action stories, all middleware stories, all DB-interacting stories

**PRD references:**
- [Tech Stack § Backend](../PRD.V2.md#tech-stack)
- [Security § Service role key](../PRD.V2.md#security)
- [Row-Level Security (RLS) Policies](../PRD.V2.md#row-level-security-rls-policies) (context for why multiple clients exist)

**Technical notes:**
- Use `@supabase/ssr` NOT deprecated `@supabase/auth-helpers-nextjs`
- Cookie management pattern: follow Supabase SSR docs
- Type generation script: add to `package.json` scripts (`"db:types": "supabase gen types typescript --linked > src/types/database.ts"`)
- Environment validation: use a small helper like `src/lib/env.ts` that throws on missing vars
- Two-layer defense for service-role key:
  1. `server-only` package — runtime/build guarantee that the module cannot be bundled into client code (Next.js recognizes this package and errors at build time).
  2. ESLint `no-restricted-imports` — lint-time guardrail that restricts *which* server files may import it, so even a server component or route handler can't accidentally grab the service-role client and forget RLS.
- Example ESLint config (in `.eslintrc.json` `overrides`):
  ```json
  {
    "files": ["src/**/*.{ts,tsx}"],
    "excludedFiles": ["src/lib/actions/**", "src/lib/supabase/service-role.ts"],
    "rules": {
      "no-restricted-imports": ["error", {
        "patterns": [
          { "group": ["**/lib/supabase/service-role", "@/lib/supabase/service-role"],
            "message": "service-role client may only be imported from src/lib/actions/**" }
        ]
      }]
    }
  }
  ```

**Analytics events:** None
**Unit tests:**
- [ ] Unit test for env validation (throws on missing var)
- [ ] Smoke test that each client exports a function (not an initialized instance to avoid singleton issues)

**Test plan:**
- [ ] Start the app with a missing env var — app should fail to start with clear error
- [ ] Import each client in a dummy route and verify no runtime errors
- [ ] Verify service-role client warns loudly if imported from `'use client'` context (TypeScript check or ESLint rule)

**Open questions:** None (decided: two-layer defense — `server-only` package + ESLint `no-restricted-imports` rule restricting to `src/lib/actions/**`)

---

## FND-005: PostHog analytics integration

**Phase:** Phase 0 — Foundation
**Priority:** P0
**Estimated effort:** Small (2–4 hours)
**Status:** Not started

**User story:**
> As the developer,
> I want PostHog initialized with autocapture and a shared server-side helper for custom events (session recording disabled by default, gated behind a feature flag),
> So that every feature can track user behavior and errors per the PRD Analytics section, without recording raw session video for all users at launch.

**Context / Why:**
PRD specifies PostHog for analytics (autocapture + custom events + error reporting). Setting this up early means every feature can fire events from day one without retrofitting later.

**Acceptance criteria:**
- [ ] PostHog JS SDK installed (`posthog-js`)
- [ ] PostHog Node SDK installed for server-side (`posthog-node`)
- [ ] `src/app/layout.tsx` wraps children in a PostHog provider for client-side autocapture
- [ ] Autocapture enabled (per PRD: pageviews, clicks, form submissions)
- [ ] Session recording **disabled by default** — initialized with `disable_session_recording: true`
- [ ] Session recording gated behind PostHog feature flag `session-recording-enabled`:
  - On app boot, after PostHog is identified (or with anonymous distinct_id), check flag via `posthog.onFeatureFlags(() => { if (posthog.isFeatureEnabled('session-recording-enabled')) posthog.startSessionRecording() })`
  - Flag is managed in the PostHog dashboard and can be rolled out to a sampled % or specific users post-launch (no code change required)
  - When recording *is* enabled via flag, use masking config: `session_recording: { maskAllInputs: true, maskTextSelector: '[data-ph-mask]' }` to avoid leaking magic link tokens / prediction picks
- [ ] `src/lib/analytics/events.ts` — centralized event name constants (TypeScript `as const`)
- [ ] `src/lib/analytics/client.ts` — client-side tracking helper (`trackEvent(name, props?)`)
- [ ] `src/lib/analytics/server.ts` — server-side tracking helper (for server actions / edge functions)
- [ ] `src/lib/analytics/error-handler.ts` — captures client errors, error boundary errors, unhandled rejections
- [ ] User identification: on sign-in, call `posthog.identify(userId)` (client-side); pre-auth events use `hashIdentifier(email)` helper (SHA-256, opaque)
- [ ] Server action errors automatically captured (wrapper util or try/catch pattern documented)
- [ ] Supabase Edge Function errors captured via server-side PostHog client
- [ ] `PostHog API key` required in env vars (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`)
- [ ] Events constants file pre-populated with all event names from PRD Analytics section (auth, gangs, predictions, notifications, performance). Later stories MAY add additional events by extending this file — FND-005 just seeds it.
- [ ] **Web Vitals reporter:** `src/components/analytics/web-vitals-reporter.tsx` — client component using `useReportWebVitals` hook from Next.js, fires `WEB_VITALS_LCP`, `WEB_VITALS_INP`, `WEB_VITALS_CLS` events with the metric value as a property. Mounted in root layout.
- [ ] **Server action timing wrapper:** `src/lib/analytics/timing.ts` — `withTiming(name, fn)` helper wraps a server action, measures duration, fires `SERVER_ACTION_DURATION` event with `{ action_name, duration_ms }`. Reusable across all server actions.
- [ ] **Page load time:** hook into Next.js navigation events to fire `PAGE_LOAD_TIME` on route change complete.

**Out of scope:**
- Firing specific events — done per-feature
- Dashboard setup in PostHog UI — separate operational task

**Dependencies:** FND-002, FND-004
**Blocks:** Any story that fires analytics events

**PRD references:**
- [Analytics](../PRD.V2.md#analytics) — full event list
- [Analytics § Error Reporting](../PRD.V2.md#analytics)
- [Analytics § Identity](../PRD.V2.md#analytics)

**Technical notes:**
- Events constants file should group by area (AUTH, GANG, PRED, etc.)
- Event names per PRD Analytics:
  - `AUTH_*` — magic_link_requested, magic_link_resent, callback_success, callback_failed, onboarding_completed, signed_out, account_deleted
  - `GANG_*` — created, join_requested, invite_copied, invite_shared, member_approved, member_rejected, member_removed, member_left, gang_deleted
  - `PREDICTION_*` — submitted, pick_changed, predict_page_viewed, predict_page_revisited
  - `NOTIFICATION_*` — bell_opened, clicked, marked_read, all_marked_read
  - `WEB_VITALS_*` — LCP, INP, CLS
  - `PAGE_LOAD_TIME`, `SERVER_ACTION_DURATION`
  - `ERROR_BOUNDARY_CAUGHT`, `ERROR_LOGGED`, `UNHANDLED_ERROR`
  - `RATE_LIMIT_HIT` — `{ user_id, action, count, window_start }` (Phase 8, POL-SEC-001)
- Pre-auth hashing: `crypto.subtle.digest('SHA-256', email)` → hex string (distinct_id)
- Session recording rollout plan (post-launch, no code change needed):
  1. Create feature flag `session-recording-enabled` in PostHog dashboard (default: off, 0% rollout)
  2. For debugging a specific user, target the flag to their `distinct_id` only
  3. For broad debugging of a funnel, roll out to 5–10% sample
  4. Masking config ensures inputs and `[data-ph-mask]` elements are hidden even when recording is active — apply `data-ph-mask` to any component rendering sensitive data (magic link token, pick selections)

**Analytics events:** N/A (this story SETS UP analytics)
**Unit tests:**
- [ ] Unit test: `trackEvent` calls PostHog client with correct arguments
- [ ] Unit test: `hashIdentifier` returns consistent SHA-256 hash
- [ ] Unit test: events constants file contains all required event names (snapshot test)

**Test plan:**
- [ ] Start the app, open DevTools Network tab
- [ ] Verify PostHog `capture` requests fire on page load
- [ ] Manually call `trackEvent('test_event', { foo: 'bar' })` in a component and verify it appears in PostHog dashboard
- [ ] Throw an intentional error, verify it's captured with stack trace

**Open questions:** None (decided: session recording disabled at launch, gated behind PostHog feature flag `session-recording-enabled` with input/text masking when enabled. PRD updated accordingly.)

---

## FND-006: Design system baseline + Storybook

**Phase:** Phase 0 — Foundation
**Priority:** P0
**Estimated effort:** Medium (1–2 days)
**Status:** Blocked — waiting on new `docs/design-system.md` (user to author)

**User story:**
> As the developer,
> I want the design system tokens, typography, base shadcn/ui primitives, AND Storybook set up per the (new) `docs/design-system.md`,
> So that all subsequent UI stories can reuse consistent components and styles, and every component ships with an isolated showcase in Storybook.

**Context / Why:**
Bragg is mobile-first and dark mode by default (per PRD Product Feel). A solid design system baseline prevents every UI story from redefining colors, spacing, and button styles. Storybook is the canonical showcase for every component and page — replacing the old `docs/design-system.jsx` approach. Every subsequent UI story ships a matching Storybook story (see [Global UI story requirements](./README.md#global-ui-story-requirements)).

> **Prerequisite (blocker):** A new `docs/design-system.md` must be authored by the user before this story starts. The existing `docs/design-system.md` is stale and is NOT the source of truth. FND-006 is **blocked** until the new doc exists.

**Acceptance criteria:**
- [ ] Design tokens defined as CSS custom properties in `src/app/globals.css`, sourced from the new `docs/design-system.md`:
  - Colors: dark background, accent, gold (for top ranks), danger, success, muted — exact values per design-system.md
  - Typography: display font, body font, stats font — per design-system.md
  - Spacing scale — per design-system.md
- [ ] Tailwind config references CSS variables (so theming is consistent)
- [ ] shadcn primitives installed: `Button`, `Input`, `Label`, `Card`, `Dialog`, `DropdownMenu`, `Avatar`, `Separator`, `Sheet` (for side panels). Additional primitives added per-story as needed.
- [ ] Custom components:
  - `src/components/ui/logo.tsx` — app logo with gradient text
  - `src/components/ui/loading-spinner.tsx`
  - `src/components/ui/empty-state.tsx` — reusable empty state layout
- [ ] `src/components/layout/page-wrapper.tsx` — standard page layout with max-width, padding, responsive
- [ ] Mobile-first responsive breakpoints: `sm` (640px), `md` (768px), `lg` (1024px)
- [ ] Dark mode is default (`html.dark` class always present or prefers-color-scheme ignored for launch)
- [ ] Matches the new `docs/design-system.md` tokens and specs
- [ ] **Storybook installed and configured:**
  - [ ] Storybook 8+ installed in `web-app-2/` (`npx storybook@latest init` with Next.js framework preset)
  - [ ] Storybook runs via `npm run storybook` on a non-conflicting port (e.g., 6006)
  - [ ] Tailwind + globals.css loaded in Storybook preview (`.storybook/preview.ts` imports `../src/app/globals.css`)
  - [ ] Dark mode is applied by default in Storybook (via `parameters.backgrounds` + `html.dark` class decorator)
  - [ ] Storybook `main.ts` points to `src/**/*.stories.@(ts|tsx|mdx)` so component stories live next to components
  - [ ] `@storybook/addon-a11y` installed for accessibility checks in the Storybook panel
  - [ ] `@storybook/test` + Storybook's play-function support available for interaction testing
  - [ ] `npm run build-storybook` succeeds and produces a static build (can be deployed later)
  - [ ] A sample Storybook story exists for each baseline primitive delivered by this story (Button, Input, Card, Logo, LoadingSpinner, EmptyState, PageWrapper) with `Default` + key variants

**Out of scope:**
- Feature-specific components (built per-story, each with their own Storybook story)
- Landing page hero, gang cards, scorecards — built in later phases
- Deploying Storybook to a hosted URL (post-launch; `build-storybook` output is sufficient for Phase 0)
- Authoring the new `docs/design-system.md` — user handles offline before this story starts

**Dependencies:** FND-002, new `docs/design-system.md` (authored by user, pre-implementation)
**Blocks:** All UI stories

**PRD references:**
- [Product feel](../PRD.V2.md#product-feel) — vibe, design principles
- [Non-Functional Requirements § Mobile-first, Accessibility](../PRD.V2.md#non-functional-requirements)
- `docs/design-system.md` (new version, authored by user before this story starts) — token values, typography, voice
- [Global UI story requirements](./README.md#global-ui-story-requirements) — Storybook mandatory for every UI story

**Technical notes:**
- Use Tailwind v4's new CSS-first config approach
- Custom fonts via `next/font` (Google Fonts) to avoid FOUC
- Accessibility: semantic HTML, ARIA labels, keyboard navigation (per PRD NFR)
- Follow the `/frontend-design` skill guidelines per CLAUDE.md
- Storybook is the canonical component showcase — it replaces the old `docs/design-system.jsx` pattern. Every subsequent component gets a story file next to the component (`Button.tsx` → `Button.stories.tsx`).
- Storybook story decorator should wrap stories in `<html class="dark">` context and the app's font providers so stories render identically to the app.
- Storybook should be runnable in CI for snapshot/interaction tests post-launch (not required at Phase 0).

**Analytics events:** None
**Unit tests:**
- [ ] Snapshot tests for each custom component (empty state, page wrapper)
- [ ] Accessibility test: axe-core integration on one sample component (in addition to Storybook a11y addon)
- [ ] Storybook `build-storybook` command runs in CI as a smoke test (fails CI if any story has a build error)

**Test plan:**
- [ ] Run `npm run storybook` and verify it opens on http://localhost:6006
- [ ] Verify every baseline primitive (Button, Input, Card, Logo, LoadingSpinner, EmptyState, PageWrapper) has a visible Storybook entry
- [ ] Toggle Controls in Storybook to verify variants render
- [ ] Verify dark mode is default in Storybook
- [ ] Verify mobile responsive breakpoints look correct (Storybook viewport addon or DevTools responsive mode)
- [ ] Run axe-core (Storybook a11y panel) and verify no critical accessibility violations
- [ ] Run `npm run build-storybook` — expect success

**Open questions:** None (decided: Storybook is the canonical showcase; user authors new `docs/design-system.md` offline before FND-006 starts)

---

## FND-DB-001: Create v2 schema migration (tables and enums)

**Phase:** Phase 0 — Foundation
**Priority:** P0
**Estimated effort:** Medium (1–2 days)
**Status:** Not started

**User story:**
> As the developer,
> I want a single SQL migration file that creates all v2 tables, enums, and foreign keys,
> So that a fresh Supabase environment can be initialized with the complete schema in one command.

**Context / Why:**
The PRD defines 17 v2 tables (plus `v2_scenario_templates` and `v2_league_season_team_players`). Creating them all in one atomic migration ensures nothing is missed and rollback is clean.

**Acceptance criteria:**
- [ ] Migration file: `supabase-2/migrations/001_initial_schema.sql`
- [ ] All enums created:
  - `v2_match_status` — upcoming, live, completed, resolved, abandoned, no_result
  - `v2_member_role` — admin, member
  - `v2_member_status` — pending, approved, rejected, removed, left
  - `v2_scenario_type` — system
  - `v2_scenario_input_type` — team_pick, player_pick, range, yes_no
  - `v2_resolution_phase` — toss, first_wicket, team_powerplay_end, mid_match, team_innings_end, end, post_match
  - `v2_notification_type` — join_request, join_approved, join_rejected, new_member, deadline_reminder, results_available, gang_deleted, admin_promoted
- [ ] All tables created per PRD Database Schema section:
  - `v2_sports`, `v2_leagues`, `v2_seasons`
  - `v2_profiles` (with CHECK constraint for onboarding_completed)
  - `v2_gangs`, `v2_gang_members`, `v2_gang_league_seasons`
  - `v2_league_teams`, `v2_league_season_fixtures`
  - `v2_fixture_results`, `v2_fixture_live_scores`
  - `v2_scenario_templates`, `v2_fixture_scenarios`, `v2_predictions`
  - `v2_players`, `v2_league_season_team_players`
  - `v2_gang_fixture_standings`, `v2_gang_season_standings`
  - `v2_notifications`
- [ ] All columns match PRD exactly: names, types, nullability, defaults
- [ ] All foreign keys defined with proper ON DELETE behavior (CASCADE where appropriate, default RESTRICT otherwise)
- [ ] All unique constraints created (including partial unique indexes for `uniq_one_active_season_per_league` and `uniq_notifications_dedup`)
- [ ] CHECK constraint on `v2_profiles`: `onboarding_completed = false OR (display_name IS NOT NULL AND date_of_birth IS NOT NULL AND terms_version IS NOT NULL)`
- [ ] Migration applies successfully to a fresh empty database
- [ ] Migration can be rolled back (down migration included or documented)

**Out of scope:**
- RLS policies (FND-DB-002)
- Indexes (FND-DB-003)
- Triggers (FND-DB-004)
- Seed data (FND-DB-005)
- v1 data migration (FND-DB-006)

**Dependencies:** FND-003
**Blocks:** FND-DB-002, FND-DB-003, FND-DB-004, FND-DB-005, FND-DB-006, all data-layer stories

**PRD references:**
- [Database Schema](../PRD.V2.md#database-schema) — every table
- [Scenarios § Structure](../PRD.V2.md#scenarios) — enum values

**Technical notes:**
- Use `uuid_generate_v4()` default for UUID PKs (requires `uuid-ossp` extension)
- Enable `pgcrypto` for any cryptographic functions needed
- Use `IF NOT EXISTS` guards where appropriate for idempotency
- Comment each table with a brief description (via `COMMENT ON TABLE`)
- Ensure all timestamp columns use `TIMESTAMPTZ` (not `TIMESTAMP`)
- Column order follows PRD for readability

**Analytics events:** None
**Unit tests:**
- [ ] Automated test: apply migration to fresh DB, verify all tables exist via `information_schema.tables`
- [ ] Verify enum values match PRD via `pg_enum` query
- [ ] Verify CHECK constraint on `v2_profiles` rejects an INSERT with `onboarding_completed=true` but missing `display_name`

**Test plan:**
- [ ] Reset STG DB: `supabase db reset`
- [ ] Apply migration: `supabase db push`
- [ ] Verify via Supabase Studio that all tables exist with expected columns
- [ ] Try an INSERT that violates the CHECK constraint — should fail

**Open questions:**
- Should we use `public` schema or a dedicated `v2` schema? (Recommendation: `public`, matching existing patterns, but with `v2_` prefix on all tables)

---

## FND-DB-002: RLS policies and helper functions

**Phase:** Phase 0 — Foundation
**Priority:** P0
**Estimated effort:** Medium (1–2 days)
**Status:** Not started

**User story:**
> As the developer,
> I want Row-Level Security enabled on all tables with policies matching the PRD, plus the helper functions for RLS checks,
> So that users can only access data they're authorized for and the frontend can rely on RLS as a security backstop.

**Context / Why:**
PRD specifies detailed RLS policies for every table. These MUST be in place before any user-facing feature ships — they're the authoritative security layer.

**Acceptance criteria:**
- [ ] Migration file: `supabase-2/migrations/002_rls_policies.sql`
- [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on all v2 tables
- [ ] Helper functions created (all `SECURITY DEFINER`):
  - `is_gang_member(gang_id UUID, user_id UUID) → BOOLEAN` — filters profiles where `is_deleted = false`
  - `is_gang_admin(gang_id UUID, user_id UUID) → BOOLEAN` — uses `v2_gang_members.role`, NOT `v2_gangs.created_by`; filters deleted profiles
  - `get_gang_by_invite_code(code TEXT) → v2_gangs` — bypasses RLS for pre-join lookup
  - `get_members_who_predicted(gang_id UUID, fixture_id UUID) → SETOF UUID` — validates `is_gang_member(gang_id, auth.uid())` internally, returns empty if caller is not a member
  - `prediction_deadline(fixture_id UUID, gang_id UUID) → TIMESTAMPTZ` — computes deadline from `start_datetime` minus gang's `prediction_deadline_mins`
- [ ] RLS policies for each table per PRD:
  - Reference tables (`v2_sports`, `v2_leagues`, `v2_seasons`, `v2_league_teams`, `v2_players`, `v2_league_season_fixtures`, `v2_scenario_templates`) — SELECT for all authenticated; INSERT/UPDATE/DELETE for service role only
  - System-managed tables (`v2_fixture_results`, `v2_fixture_live_scores`, `v2_league_season_team_players`) — SELECT for all authenticated; writes via service role only
  - `v2_profiles` — SELECT own or same-gang; UPDATE own; INSERT via trigger; no DELETE
  - `v2_gangs` — SELECT approved members only (filter `is_deleted = false`); INSERT any authenticated; UPDATE admin only; no DELETE
  - `v2_gang_members` — SELECT per PRD (approved sees approved, admin sees all, own always); INSERT per PRD; UPDATE per PRD; no DELETE
  - `v2_gang_league_seasons` — SELECT approved members; INSERT via service role; UPDATE admin only
  - `v2_fixture_scenarios` — SELECT approved members; writes via service role only
  - `v2_predictions` SELECT: (before deadline AND fixture.status = 'upcoming' → own rows only) OR (after deadline OR fixture.status IN ('live','completed','resolved','abandoned','no_result') → all approved gang members' rows); INSERT/UPDATE: approved gang member, own user_id, fixture.status = 'upcoming', before deadline (via `prediction_deadline` helper); no DELETE
  - `v2_gang_fixture_standings`, `v2_gang_season_standings` — SELECT approved members; writes via service role
  - `v2_notifications` — SELECT own; UPDATE own (mark read); writes via service role
- [ ] Supabase Realtime enabled on `v2_notifications` only

**Out of scope:**
- Triggers (FND-DB-004)
- Indexes (FND-DB-003)

**Dependencies:** FND-DB-001
**Blocks:** All data-layer stories

**PRD references:**
- [Row-Level Security (RLS) Policies](../PRD.V2.md#row-level-security-rls-policies) — every policy
- [Security § Authorization](../PRD.V2.md#security)

**Technical notes:**
- Use `auth.uid()` for current user ID in policies
- Helper functions marked `SECURITY DEFINER` to bypass RLS when checking membership
- Helper functions MUST filter out `is_deleted = true` profiles where noted
- `get_members_who_predicted` must internally check caller is gang member (per PRD note)
- Enable realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE v2_notifications;`

**Analytics events:** None
**Unit tests:**
- [ ] Test: as user A in gang X, SELECT from `v2_gang_members` returns only members of gang X
- [ ] Test: as non-admin, UPDATE on `v2_gangs` fails
- [ ] Test: `get_gang_by_invite_code` returns gang even for non-member
- [ ] Test: `get_members_who_predicted` returns empty for caller outside gang
- [ ] Test: `is_gang_admin` returns false if admin profile is `is_deleted = true`

**Test plan:**
- [ ] Apply migration to STG
- [ ] Manually test SELECT/INSERT/UPDATE on each table as different users (anon, authenticated, member, admin)
- [ ] Verify realtime subscription works on `v2_notifications`

**Open questions:**
- Do we need separate RLS policies for anon (logged out) users? (Probably not — all non-reference tables require auth)

---

## FND-DB-003: Database indexes

**Phase:** Phase 0 — Foundation
**Priority:** P0
**Estimated effort:** Small (2–4 hours)
**Status:** Not started

**User story:**
> As the developer,
> I want all indexes from the PRD created on the v2 schema,
> So that read queries (leaderboards, gang lists, live scores) perform well from day one.

**Context / Why:**
PRD defines a specific set of indexes matching query patterns used by UI and cron functions. Creating them upfront avoids performance cliffs during development.

**Acceptance criteria:**
- [ ] Migration file: `supabase-2/migrations/003_indexes.sql`
- [ ] All indexes from PRD "Database Indexes" section created:
  - `idx_profiles_email` on `v2_profiles(email)`
  - `idx_gangs_created_by` on `v2_gangs(created_by)`
  - `idx_gangs_deleted` on `v2_gangs(is_deleted)`
  - `idx_gang_members_status` on `v2_gang_members(gang_id, status)`
  - `idx_gang_members_user` on `v2_gang_members(user_id, status)`
  - `idx_gang_league_seasons_season` on `v2_gang_league_seasons(season_id)`
  - `idx_fixtures_season_status` on `v2_league_season_fixtures(season_id, status, start_datetime)`
  - `idx_fixtures_status_start` on `v2_league_season_fixtures(status, start_datetime)`
  - `idx_scenarios_gang_fixture` on `v2_fixture_scenarios(gang_id, fixture_id)`
  - `idx_scenarios_gang_season` on `v2_fixture_scenarios(gang_id, season_id)`
  - `idx_scenarios_fixture_unresolved` partial on `v2_fixture_scenarios(fixture_id) WHERE is_resolved = false`
  - `idx_scenarios_gang_fixture_active` partial on `v2_fixture_scenarios(gang_id, fixture_id) WHERE is_voided = false`
  - `idx_predictions_gang_fixture_user` on `v2_predictions(gang_id, fixture_id, user_id)`
  - `idx_predictions_scenario` on `v2_predictions(scenario_id)`
  - `idx_predictions_gang_season_user` on `v2_predictions(gang_id, season_id, user_id)`
  - `idx_fixture_standings_season` on `v2_gang_fixture_standings(gang_id, season_id)`
  - `idx_season_standings_user` on `v2_gang_season_standings(user_id)`
  - `idx_notifications_user` on `v2_notifications(user_id, created_at DESC)`
  - `idx_notifications_unread` partial on `v2_notifications(user_id, is_read) WHERE is_read = false`
  - `uniq_notifications_dedup` UNIQUE partial on `v2_notifications(user_id, gang_id, fixture_id, type) WHERE type IN ('deadline_reminder', 'results_available')`
  - Partial unique index: `(league_id) WHERE is_active = true` on `v2_seasons`
- [ ] Migration applies cleanly after FND-DB-001 and FND-DB-002

**Out of scope:** Triggers (FND-DB-004), seeds (FND-DB-005)

**Dependencies:** FND-DB-001
**Blocks:** FND-DB-005 and all read-heavy stories

**PRD references:**
- [Database Indexes](../PRD.V2.md#database-indexes)

**Technical notes:**
- Use `CREATE INDEX IF NOT EXISTS` for idempotency
- Partial indexes require the `WHERE` clause syntax
- Consider `CREATE INDEX CONCURRENTLY` on existing large tables (not needed for fresh DB)

**Analytics events:** None
**Unit tests:**
- [ ] Query `pg_indexes` to verify each index exists
- [ ] EXPLAIN ANALYZE on representative queries to verify indexes are used

**Test plan:**
- [ ] Apply migration
- [ ] Query `pg_indexes WHERE schemaname = 'public'` and verify count matches PRD list
- [ ] Spot-check partial index conditions

**Open questions:** None

---

## FND-DB-004: Database triggers and stored procedures

**Phase:** Phase 0 — Foundation
**Priority:** P0
**Estimated effort:** Large (2–3 days)
**Status:** Not started

**User story:**
> As the developer,
> I want all Postgres triggers and stored procedures (profile creation, max limits, status tracking, standings recalculation) created per the PRD,
> So that database invariants are enforced automatically and the application layer can rely on them.

**Context / Why:**
The PRD defines many triggers that enforce business rules (max members, max gangs, rank recalculation, status tracking). These must be in place before any feature that depends on them.

**Acceptance criteria:**
- [ ] Migration file: `supabase-2/migrations/004_triggers.sql`
- [ ] **Profile creation trigger:** `AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()` — creates a `v2_profiles` row with `id` and `email` from `NEW`
- [ ] **Max members trigger:** `BEFORE INSERT OR UPDATE ON v2_gang_members FOR EACH ROW WHEN NEW.status = 'approved'` — checks approved count; raises exception `P0001` with `MAX_MEMBERS_REACHED` prefix if count >= 20
- [ ] **Max gangs trigger:** `BEFORE INSERT OR UPDATE ON v2_gang_members FOR EACH ROW` — fires only when NEW.status transitions into active state; counts user's other active rows; raises `MAX_GANGS_REACHED` if >= 40
- [ ] **Status changed trigger:** `BEFORE UPDATE ON v2_league_season_fixtures FOR EACH ROW WHEN OLD.status IS DISTINCT FROM NEW.status` — sets `status_changed_at = now()`
- [ ] **Rank recalc trigger (on member status change):** `AFTER UPDATE OF status ON v2_gang_members FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) AND (OLD.status IN ('approved', 'left', 'removed') OR NEW.status IN ('approved', 'left', 'removed'))` — calls `recalculate_gang_standings_ranks(gang_id)`
- [ ] **Standings update trigger (on prediction insert/update):** `AFTER INSERT OR UPDATE ON v2_predictions FOR EACH ROW` — calls `upsert_fixture_standings(gang_id, fixture_id, user_id)` to update `predicted_count`, `last_submitted_at`
- [ ] **Standings full recalc trigger (on scenario resolution/void):** `AFTER UPDATE ON v2_fixture_scenarios FOR EACH ROW WHEN (NEW.is_resolved = true AND OLD.is_resolved = false) OR (NEW.is_voided = true AND OLD.is_voided = false)` — calls `recalculate_full_standings(gang_id, fixture_id)`
- [ ] Stored procedures implementing the above logic, each with clear comments
- [ ] `recalculate_full_standings`:
  - Recalculates all users' `correct_count`, `resolved_count`, `points_earned` per PRD
  - Computes rank using `RANK()` window function with ORDER BY active-first, then points DESC, then `last_submitted_at ASC NULLS LAST`
  - JOINs with `v2_gang_members` for status check
  - Aggregates to `v2_gang_season_standings` with season-level ranks
  - Excludes voided scenarios from aggregations

**Out of scope:** Seeds (FND-DB-005), data migration (FND-DB-006)

**Dependencies:** FND-DB-001, FND-DB-002, FND-DB-003
**Blocks:** FND-DB-006 and all dependent features

**PRD references:**
- [v2_profiles § Profile creation trigger](../PRD.V2.md#v2_profiles--user-accounts)
- [v2_gang_members § Max members trigger](../PRD.V2.md#v2_gang_members--gang-membership)
- [v2_gang_members § Max gangs trigger](../PRD.V2.md#v2_gang_members--gang-membership)
- [v2_league_season_fixtures § Status change trigger](../PRD.V2.md#v2_league_season_fixtures--match-schedule)
- [Scoring & Leaderboards § Rank computation](../PRD.V2.md#scoring--leaderboards)
- [update-standings cron](../PRD.V2.md#update-standings--standings-recalculation-db-trigger-not-cron)

**Technical notes:**
- Use `PL/pgSQL` for functions
- For max-gangs trigger, count `WHERE user_id = NEW.user_id AND (gang_id, user_id) != (NEW.gang_id, NEW.user_id) AND status IN ('approved', 'pending')` to exclude current row
- Standings recalc functions must handle empty-standings case (no predictions yet)
- Error codes: use `RAISE EXCEPTION 'MAX_MEMBERS_REACHED: Gang has reached maximum member capacity' USING ERRCODE = 'P0001'`
- Recalc functions should be idempotent

**Analytics events:** None
**Unit tests:**
- [ ] Test: profile trigger creates row on auth.users insert
- [ ] Test: max-members trigger blocks 21st approved member with correct error
- [ ] Test: max-gangs trigger blocks 41st active gang membership
- [ ] Test: max-gangs trigger allows rejoin at limit (transition from left → pending on existing row)
- [ ] Test: status_changed_at updates only when status actually changes
- [ ] Test: rank recalc function produces correct ranks with ties
- [ ] Test: rank recalc sorts left/removed members to bottom
- [ ] Test: rank recalc handles NULL `last_submitted_at` (NULLS LAST)
- [ ] Test: standings recalc excludes voided scenarios

**Test plan:**
- [ ] Create a test gang with 20 members, attempt to add a 21st — should fail with clear error
- [ ] Create a user at 40 gangs, attempt 41st — should fail
- [ ] Leave a gang and rejoin — should succeed (verify max-gangs exclude-current-row logic)
- [ ] Update a fixture status and verify `status_changed_at` reflects the update time
- [ ] Submit predictions, resolve scenarios, verify standings populate correctly with ranks
- [ ] Mark a scenario as voided, verify standings recalculate excluding it

**Open questions:**
- Do we need advisory locks on the rank recalc function to prevent concurrent UPDATE races? (Low risk given scale, but noted as potential issue.)

---

## FND-DB-005: Seed reference data

**Phase:** Phase 0 — Foundation
**Priority:** P0
**Estimated effort:** Medium (4–8 hours)
**Status:** Blocked — waiting on IPL 2026 Sportmonks IDs (fetch as pre-implementation step, see below)

**User story:**
> As the developer,
> I want a seed migration that populates all reference data for IPL 2026,
> So that the app works out of the box after a fresh deploy.

**Context / Why:**
Sports, leagues, seasons, teams, and scenario templates are required reference data. Per the PRD, these are seeded via SQL migration (admin UI is post-launch). All Sportmonks IDs are fetched fresh from the live API immediately before this migration runs — the sample responses in `api-tester/responses/sportsmonk/` may be stale and should not be trusted for real seed data.

**Pre-implementation step (blocker — must happen before writing the migration):**

Fetch the following IDs from the live Sportmonks Cricket API using the account's production token. Record them in a scratch doc (or inline in the migration file as comments) before writing the seed SQL:

1. **Cricket sport ID** — `GET https://cricket.sportmonks.com/api/v2.0/...` (or v3 equivalent) → find the sport record for "Cricket", capture `id`.
2. **IPL league ID** — `GET .../leagues?filter[name]=Indian Premier League` → capture `id` of the IPL league.
3. **IPL 2026 season ID** — `GET .../seasons?filter[league_id]={ipl_league_id}` → find the season with `name: "2026"` (or equivalent) and capture `id`. If the 2026 season does not yet exist in Sportmonks at the time of seeding, flag this to the user immediately — we cannot proceed without it.
4. **All 10 IPL team IDs for 2026** — `GET .../teams?filter[season_id]={ipl_2026_season_id}&include=squad` → for each team, capture:
   - `id` (Sportmonks API ID)
   - `name` (full name, e.g., "Chennai Super Kings")
   - `code` (short code, e.g., "CSK")
   - `image_path` (logo URL — copy to our CDN or use directly)
5. **Team list expected:** CSK, MI, RCB, KKR, DC, PBKS, RR, SRH, GT, LSG. If the API returns a different set (franchise rename, new team, removed team), stop and flag to the user.

Save the fetched raw responses to `api-tester/responses/sportsmonk/2026-seed/` for audit trail. Do NOT write the seed SQL until all 12 IDs (1 sport + 1 league + 1 season + 10 teams − wait, that's 13) are confirmed.

**Acceptance criteria:**
- [ ] Pre-implementation step completed: all IDs fetched from live Sportmonks API, saved to `api-tester/responses/sportsmonk/2026-seed/`, and recorded inline in the migration as comments
- [ ] Migration file: `supabase-2/migrations/005_seed_data.sql`
- [ ] `v2_sports`: 1 row — Cricket (`code: cricket`, Sportmonks `api_id`)
- [ ] `v2_leagues`: 1 row — Indian Premier League (`code: ipl`, linked to cricket sport, Sportmonks `api_id`)
- [ ] `v2_seasons`: 1 row — "IPL 2026" (`year: 2026`, `is_active: true`, `start_date` + `end_date` set, Sportmonks `api_id`)
- [ ] `v2_league_teams`: 10 rows — all 10 IPL franchises for 2026 with:
  - Full name, short code (CSK, MI, RCB, etc.)
  - Official team colors (hex, bold saturated per PRD)
  - Logo URL (from Sportmonks or local CDN)
  - Sportmonks `api_id` per team
  - `league_id` → IPL
- [ ] `v2_scenario_templates`: 20 rows — all scenario templates per PRD "System Scenario Definitions":
  - 19 rows with `is_active = true`
  - `total_match_catches` with `is_active = false`
  - Correct: slug, title with placeholders, input_type, options (JSONB for range), points, resolution_phase, sport_id → cricket
  - Exact options per PRD (e.g., home_team_innings_score: `["<140","140-159","160-179","180-199","200+"]`)
- [ ] Idempotent via `ON CONFLICT DO NOTHING` (so re-running doesn't duplicate)
- [ ] Sportmonks API IDs verified against data in `api-tester/responses/sportsmonk/`

**Out of scope:**
- Players (synced by `sync-fixtures` cron in Phase 3)
- Fixtures (synced by cron)
- v1 → v2 data migration (FND-DB-006)

**Dependencies:** FND-DB-001, FND-DB-002, FND-DB-003, FND-DB-004
**Blocks:** FND-DB-006 (migration needs teams to exist), all feature stories

**PRD references:**
- [Implementation Plan § Supabase-2 migration files](../PRD.V2.md#supabase-2-migration-files)
- [Cron Functions § Seed data](../PRD.V2.md#cron-functions)
- [System Scenario Definitions](../PRD.V2.md#system-scenario-definitions-20-scenarios-total-19-active--1-inactive-max-210-active-points-220-including-inactive)
- [Scenario Resolution Mapping](../PRD.V2.md#scenario-resolution-mapping-sportmonks-api)

**Technical notes:**
- **Do not rely on `api-tester/responses/sportsmonk/general-calls/*.json` for real IDs** — those are sample responses from an earlier probe and may be for a prior season. Always re-fetch fresh from the live API for the current season before seeding. Use those files only as a format reference to know which fields to extract.
- Team colors: get from existing `web-app/src/lib/constants.ts` or style guide (Sportmonks does not provide brand colors)
- Logo URLs: use Sportmonks CDN URLs from team data (the `image_path` field). Consider proxying through our own CDN for stability post-launch, but direct Sportmonks URLs are acceptable for launch.
- Options JSONB format: `'["<140","140-159","160-179","180-199","200+"]'::jsonb`
- Token: use the production Sportmonks API token (stored in 1Password / env var, not committed) for the fetch step

**Analytics events:** None
**Unit tests:**
- [ ] Assert exactly 1 active season for IPL
- [ ] Assert 10 teams for IPL
- [ ] Assert 20 scenario templates (19 active + 1 inactive)
- [ ] Assert each scenario template has valid `resolution_phase` (enum check)

**Test plan:**
- [ ] Pre-step: verify all 13 Sportmonks IDs have been fetched from the live API and saved to `api-tester/responses/sportsmonk/2026-seed/`
- [ ] Apply migration
- [ ] Query `SELECT * FROM v2_sports, v2_leagues, v2_seasons, v2_league_teams, v2_scenario_templates`
- [ ] Verify counts and key fields
- [ ] Verify `total_match_catches` is inactive
- [ ] Spot-check one team's `api_id` against a live Sportmonks `GET /teams/{id}` call — confirm it returns the expected team

**Open questions:** None (decided: fetch Sportmonks IDs live as a pre-implementation step; if IPL 2026 season doesn't yet exist in Sportmonks, stop and flag to user)

---

## FND-DB-006: v1 → v2 data migration script

**Phase:** Phase 0 — Foundation
**Priority:** P0
**Estimated effort:** Medium (1–2 days)
**Status:** Not started

**User story:**
> As the developer,
> I want a one-time migration script that moves profile data and gang data from v1 tables to v2 tables, then drops the old v1 tables,
> So that existing users don't lose access and historical gang memberships are preserved.

**Context / Why:**
Per PRD Implementation Plan, we migrate profiles and gangs but not predictions. This one-time script runs on STG to transition existing users.

**Acceptance criteria:**
- [ ] Migration file: `supabase-2/migrations/006_migrate_from_v1.sql`
- [ ] Migration is **idempotent** — safe to re-run (use `ON CONFLICT DO NOTHING` or explicit checks)
- [ ] **Profile migration**:
  - `INSERT INTO v2_profiles (id, email, display_name, date_of_birth, onboarding_completed, terms_version, terms_accepted_at, created_at, is_deleted) SELECT ... FROM profiles`
  - Preserve `id` from v1 (matches `auth.users.id`)
  - Set `terms_version` to current value if v1 has equivalent, else NULL
  - Set `is_deleted = false` for all migrated profiles
- [ ] **Gang migration** (`groups` → `v2_gangs`):
  - Preserve `id`, `name`, `created_by`, `created_at`
  - Generate new 6-char invite code (uppercase + numbers) via helper function, retry on collision
  - `auto_accept = false`
  - `is_deleted = false`
- [ ] **Gang member migration** (`group_members` → `v2_gang_members`):
  - Only migrate rows with status `approved` or `pending`
  - Role mapping: old `owner` → new `admin`; old `admin` OR `member` → new `member` (only ONE admin per gang — the previous owner)
  - Map `joined_at` → `requested_at`
  - Preserve `approved_at`
  - `is_blocked = false`, `departed_at = NULL`
- [ ] **Auto-enroll migrated gangs in IPL 2026**:
  - For every row in `v2_gangs`, insert into `v2_gang_league_seasons` with the IPL 2026 season id
  - `prediction_deadline_mins = 45`
  - `is_active = true`
- [ ] **Drop v1 tables** after migration:
  - `groups`, `group_members`, `matches`, `scenarios`, `predictions`, `notifications`, `teams`, `players`, `match_squads`, `points_config`, `match_group_settings`
  - `profiles` (v1) — drop last, after `v2_profiles` is populated
  - Drop old functions, triggers, views tied to these tables
- [ ] Migration logs row counts for each step (use `RAISE NOTICE` in plpgsql block)

**Out of scope:**
- Migrating predictions (intentionally excluded per PRD)
- Migrating old matches/scenarios (new data from Sportmonks)

**Dependencies:** FND-DB-001 through FND-DB-005 (all schema + seeds must be in place)
**Blocks:** All user-facing stories on STG

**PRD references:**
- [Implementation Plan § One-time migration strategy](../PRD.V2.md#one-time-migration-strategy)

**Technical notes:**
- Wrap in a `DO $$ BEGIN ... END $$` block for atomicity
- Use `ON CONFLICT (id) DO NOTHING` for idempotent inserts
- Invite code generator: inline function or helper utility that loops until unique
- Old `auth.users` remains untouched (Supabase managed)
- Consider a dry-run mode (`SET LOCAL TRANSACTION READ ONLY`) for verification before commit

**Analytics events:** None
**Unit tests:**
- [ ] Test on a copy of STG: count of v2_profiles == count of v1 profiles
- [ ] Test: every v1 group exists as a v2_gang with a new invite code
- [ ] Test: old owner is now the only v2 admin in each gang
- [ ] Test: every migrated gang has a v2_gang_league_seasons row for IPL 2026
- [ ] Test: re-running migration does NOT duplicate rows

**Test plan:**
- [ ] Snapshot STG database before migration
- [ ] Apply migration
- [ ] Verify counts (profiles, gangs, gang_members)
- [ ] Spot-check 3 random gangs — confirm admin is original owner, invite code is new, members are present
- [ ] Run migration a second time — confirm no duplicates
- [ ] Confirm old tables are dropped

**Open questions:**
- Do we need to preserve v1 profile `avatar_url` or other fields that don't exist in v2? (Decision: no, v2 uses initials-only avatars)
- What if a v1 gang has 0 `approved` members after filtering? Do we still create the gang? (Recommendation: skip — empty gangs serve no purpose)
