# Codebase Analysis: Analytics & Observability
**Date**: 2026-03-29
**Analyst**: PSE Agent
**Focus**: Existing PostHog integration, analytics patterns, error handling, logging, and readiness for comprehensive Analytics & Observability feature

---

## Project Structure

```
cric-predictor/
  web-app/                         # Next.js 16.2.1 app (App Router)
    src/
      app/
        layout.tsx                 # Root layout (ThemeProvider > PostHogProvider)
        error.tsx                  # Route-level error boundary (PostHog event)
        global-error.tsx           # Global error boundary (NO PostHog event)
        not-found.tsx
        auth/callback/route.ts     # Auth callback (server-side PostHog events)
        dashboard/
        group/[groupId]/
          error.tsx                # Group-level error boundary (PostHog event)
          layout.tsx
          admin/, match/, predict/, scenarios/, standings/
        join/[code]/
        login/, onboarding/
        privacy/, terms/           # No-track routes (PostHog opts out)
      components/
        shared/
          posthog-provider.tsx     # Client-side PostHog init + pageview tracking
          error-state.tsx          # Shared error display component
        layout/
          header.tsx               # Calls usePostHogIdentify
          notification-bell.tsx    # Client-side PostHog events
        group/
          invite-link.tsx          # Client-side PostHog events
        prediction/
          prediction-form.tsx      # Client-side PostHog events
      hooks/
        use-posthog-identify.ts    # Identifies/resets PostHog user
        use-feature-flag.ts        # Client-side feature flag hook
        use-match-polling.ts       # console.warn in dev only
        use-prediction-polling.ts  # console.warn in dev only
      lib/
        posthog/
          index.ts                 # Barrel export
          client.ts                # Client-side PostHog singleton
          server.ts                # Server-side PostHog (posthog-node)
          events.ts                # Centralized event name constants (29 events)
          transport.ts             # PostHog LogTransport adapter
          register-server-transport.ts  # One-time server transport registration
        logger.ts                  # Centralized structured logger with transport system
        env.ts                     # Validated environment variables
        actions/                   # Server actions (all use captureServerEvent + logError)
          auth.ts, groups.ts, predictions.ts, scenarios.ts, admin.ts,
          notifications.ts, onboarding.ts
        dal/                       # Data access layer (all use logError)
          groups.ts, members.ts, matches.ts, predictions.ts, scenarios.ts,
          standings.ts, players.ts, notifications.ts, teams.ts
        supabase/
          client.ts                # Browser Supabase client
          server.ts                # Server Supabase client (registers PostHog transport)
          middleware.ts            # Auth session refresh middleware
          get-user-cached.ts       # React.cache'd getUser
      __mocks__/handlers/
        posthog-server.ts          # Storybook mock for PostHog server
        posthog-node.ts            # Storybook mock for posthog-node
      test/
        setup.ts                   # Vitest global mock for posthog-js and posthog-node
    .env.local.example             # PostHog env vars documented
    .env.staging                   # Real PostHog key present
    .env.production.example        # PostHog env vars NOT documented here
  supabase/
    functions/
      sync-data/index.ts           # Edge Function (uses console.log/warn/error)
      match-live/index.ts          # Edge Function
      match-cron/index.ts          # Edge Function
  api-tester/                      # Separate utility for API testing
```

---

## Tech Stack

- **Framework**: Next.js 16.2.1 (App Router, React Compiler enabled)
- **React**: 19.2.4
- **Database**: PostgreSQL via Supabase (`@supabase/supabase-js` 2.100.1, `@supabase/ssr` 0.9.0)
- **Auth**: Supabase Auth (magic link OTP)
- **Styling**: Tailwind CSS v4 with CSS variables, `class-variance-authority`, `tailwind-merge`
- **State Management**: React state + server components + URL params (no global store)
- **Analytics**: PostHog (`posthog-js` 1.364.0 client, `posthog-node` 5.28.7 server)
- **Validation**: Zod v4.3.6
- **UI Components**: shadcn/ui, Lucide icons
- **Testing**: Vitest + Testing Library (unit), Playwright (e2e), Storybook 8.6
- **Deployment**: Vercel
- **Key Dev Dependencies**: TypeScript 5.x, ESLint 9, babel-plugin-react-compiler

---

## Existing PostHog Integration (Detailed)

### Architecture Overview

PostHog is integrated at two levels:
1. **Client-side** (`posthog-js`): Initialized in `PostHogProvider`, captures pageviews, user interactions, and error boundary events.
2. **Server-side** (`posthog-node`): Used in all server actions and the auth callback route for event capture and feature flags.

### Initialization

**Client** (`src/lib/posthog/client.ts`):
- Singleton pattern with lazy init
- `person_profiles: "identified_only"` -- anonymous users get no person profile
- `capture_pageview: false` -- manual tracking via `PostHogProvider`
- `capture_pageleave: true` -- automatic page leave events
- `persistence: "localStorage+cookie"`
- Debug mode enabled in development
- Returns `null` gracefully when `NEXT_PUBLIC_POSTHOG_KEY` is unset

**Server** (`src/lib/posthog/server.ts`):
- Singleton `PostHog` node client
- `flushAt: 1`, `flushInterval: 0` -- immediate flush for serverless (correct)
- `captureServerEvent()` helper adds `$lib: "posthog-node"` and `source: "server_action"` properties
- `getServerFeatureFlag()` for server-side flag evaluation

### Provider Hierarchy

```
<html>
  <body>
    <ThemeProvider>
      <Suspense fallback={null}>
        <PostHogProvider>         # Initializes PostHog, registers logger transport
          {children}              # All app routes
        </PostHogProvider>
      </Suspense>
    </ThemeProvider>
  </body>
</html>
```

The `PostHogProvider`:
- Initializes PostHog client on mount
- Registers the PostHog logger transport on mount
- Tracks `$pageview` on route changes (pathname + searchParams)
- Implements no-track for `/privacy` and `/terms` routes (opts out/in dynamically)
- Deduplicates pageviews using `lastPathRef`

### User Identification

`usePostHogIdentify` hook (called in `Header` component):
- Identifies user with `user.id` as distinct ID
- Sets person properties: `email`, `display_name`, `onboarding_completed`
- Resets on sign-out
- Uses ref to prevent redundant identify calls

### Event Catalog (29 defined events)

| Category | Event Name | Tracked From | Properties |
|----------|-----------|-------------|------------|
| **Auth** | `auth_magic_link_requested` | Server action | `has_redirect` |
| | `auth_magic_link_resent` | Defined but **never captured** | -- |
| | `auth_callback_success` | API route | `is_new_user` |
| | `auth_callback_failed` | API route | -- |
| | `auth_onboarding_completed` | Server action | `display_name` |
| | `auth_signed_out` | Server action | -- |
| **Group** | `group_created` | Server action | `group_id`, `group_name` |
| | `group_join_requested` | Server action | `group_id` |
| | `group_invite_copied` | Client component | `invite_code` |
| | `group_invite_shared` | Client component | `invite_code` |
| | `group_member_approved` | Server action | `group_id`, `target_user_id` |
| | `group_member_rejected` | Server action | `group_id`, `target_user_id` |
| | `group_member_promoted` | Server action | `group_id`, `target_user_id` |
| | `group_member_demoted` | Server action | `group_id`, `target_user_id` |
| | `group_member_removed` | Server action | `group_id`, `target_user_id` |
| **Predictions** | `prediction_submitted` | Server action | `group_id`, `match_id`, `prediction_count`, `total_scenarios` |
| | `prediction_pick_changed` | Client component | `group_id`, `match_id`, `scenario_id` |
| **Scenarios** | `scenario_custom_created` | Server action | `group_id`, `match_id`, `title`, `option_count`, `points` |
| | `scenario_custom_created_by_admin` | Server action | `group_id`, `match_id`, `title` |
| | `scenario_approved` | Server action | `group_id`, `scenario_id` |
| | `scenario_rejected` | Server action | `group_id`, `scenario_id` |
| | `scenario_removed` | Server action | `group_id`, `scenario_id` |
| | `scenario_published` | Server action | `group_id`, `match_id`, `scenario_count` |
| **Admin** | `admin_results_entered` | Server action | `group_id`, `match_id` |
| | `admin_settings_updated` | Server action | `group_id`, `match_id`, `is_locked`, `has_deadline` |
| **Notifications** | `notification_bell_opened` | Client component | `unread_count` |
| | `notification_marked_read` | Server action | `notification_id` |
| | `notification_all_cleared` | Server action | -- |
| **Errors** | `error_boundary_caught` | Client error boundary | `error_message`, `error_digest`, `error_stack`, `context` |
| | `error_logged` | PostHog log transport | `level`, `message`, `layer`, `operation`, metadata, error details |

### Environment Variables

| Variable | Where Set | Purpose |
|----------|-----------|---------|
| `NEXT_PUBLIC_POSTHOG_KEY` | `.env.local.example`, `.env.staging` | PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | `.env.local.example`, `.env.staging` | PostHog API host (defaults to `https://us.i.posthog.com`) |

**Note**: `.env.production.example` does NOT list PostHog vars. This is a gap -- production deployments must be configured via Vercel Dashboard without documentation.

### CSP Configuration

`next.config.ts` already whitelists PostHog domains in the Content-Security-Policy:
- `script-src`: `https://us-assets.i.posthog.com`
- `connect-src`: `https://us.i.posthog.com`

### Test & Storybook Mocks

- **Vitest** (`src/test/setup.ts`): Mocks both `posthog-js` and `posthog-node` globally -- all captures are no-ops
- **Storybook** (`.storybook/main.ts`): Aliases `@/lib/posthog/server` and `posthog-node` to no-op mocks; sets empty PostHog env vars

### PostHog Tests

- `events.test.ts`: Validates event naming conventions (snake_case, uniqueness, at least 29 events)
- `transport.test.ts`: Validates log transport forwards error/warn levels, ignores debug/info

---

## Logger System

### Architecture (`src/lib/logger.ts`)

A custom structured logger with a transport plugin system:

- **Levels**: `debug`, `info`, `warn`, `error`
- **Context**: `{ layer, operation, metadata? }` -- structured, not free-text
- **Console output**: Gated by `ENABLE_DEBUG_LOGS` env var (silent in production)
- **Transports**: Array of `LogTransport` objects; `send()` always fires regardless of debug setting
- **Functions**: `logError(context, error?)`, `logWarn(context, detail?)`
- **Error formatting**: Handles Supabase-specific error properties (`code`, `details`, `hint`)
- **Safety**: Transport failures are caught and swallowed (never crashes app)

### PostHog Transport (`src/lib/posthog/transport.ts`)

Bridges the logger to PostHog:
- Only forwards `error` and `warn` level logs
- Client-side: dynamic import of `posthog-js` client
- Server-side: dynamic import of `posthog-node` server
- Server-side uses `distinctId: "system"` (not a real user ID)
- Enriches events with: `error_message`, `error_name`, `error_stack` (truncated to 1000 chars), `error_code`

### Transport Registration

- **Client**: Registered in `PostHogProvider` `useEffect` on mount
- **Server**: Registered via `ensureServerTransport()` called at import time in `src/lib/supabase/server.ts`
- This means the server transport is registered on any request that creates a Supabase server client

---

## Error Handling Patterns

### Error Boundaries

| File | Scope | PostHog Tracking | Console Logging |
|------|-------|-----------------|-----------------|
| `app/error.tsx` | All routes except root layout | Yes (`error_boundary_caught`) | `console.error` |
| `app/global-error.tsx` | Root layout failures | **No** -- missing PostHog | No |
| `app/group/[groupId]/error.tsx` | Group routes | Yes (`error_boundary_caught`) | No |

**Gap**: `global-error.tsx` has no analytics tracking at all. This is the last-resort error handler and captures the most critical failures.

### Missing Error Boundaries

The following route segments lack dedicated `error.tsx` files:
- `app/dashboard/`
- `app/login/`
- `app/onboarding/`
- `app/join/[code]/`
- `app/group/[groupId]/admin/`
- `app/group/[groupId]/match/[matchId]/`
- `app/group/[groupId]/predict/[matchId]/`
- `app/group/[groupId]/scenarios/[matchId]/`
- `app/group/[groupId]/standings/`

These all fall back to `app/error.tsx`, which is fine, but deeper route-level boundaries with context (like the group error boundary adds `context: "group"`) would improve diagnostics.

### Server Action Error Handling

All 7 server action files follow a consistent pattern:
1. Input validation with Zod (`safeParse`)
2. Auth check (`supabase.auth.getUser()`)
3. Business logic with DAL calls
4. On DAL failure: `logError(context)` then return `{ success: false, error: "user-friendly message" }`
5. On success: `captureServerEvent(userId, EVENT, properties)`
6. Return `ActionResponse` type

**Pattern strength**: Consistent, well-structured, never exposes internal errors to the user.
**Pattern weakness**: No timing/performance data captured. No error categorization (transient vs permanent).

### DAL Error Handling

All DAL files follow a consistent pattern:
1. Call Supabase client
2. Check `{ data, error }` response
3. On error: `logError({ layer: "dal", operation, metadata })` then return null/empty array/false
4. Never throw exceptions

**Pattern strength**: Consistent, safe, always logs to transports.
**Pattern weakness**: No distinction between "not found" vs "database error". No retry logic. No error typing.

### Middleware Error Handling

`src/lib/supabase/middleware.ts`:
- `supabase.auth.getUser()` wrapped in try/catch -- fails closed (treat as unauthenticated)
- No logging of auth failures in middleware
- No analytics tracking of auth service issues

### Client-Side Polling Error Handling

Both `use-match-polling.ts` and `use-prediction-polling.ts`:
- Silently swallow errors in production
- `console.warn` in development only
- No PostHog error tracking for failed polls

---

## Performance Monitoring

**Current state: None.**

There is no performance monitoring of any kind:
- No Web Vitals tracking
- No API/DAL timing measurements
- No render performance tracking
- No server action duration tracking
- PostHog auto-capture of performance metrics is not enabled

---

## Console Usage Audit

| File | Type | Gated? | Should Be Tracked? |
|------|------|--------|-------------------|
| `lib/logger.ts` | `console.error`, `console.warn` | Yes (`ENABLE_DEBUG_LOGS`) | Already sent to transports |
| `app/error.tsx` | `console.error` | No (always fires) | Yes -- redundant with PostHog event but fine |
| `hooks/use-match-polling.ts` | `console.warn` | Yes (`NODE_ENV`) | Should use logger |
| `hooks/use-prediction-polling.ts` | `console.warn` | Yes (`NODE_ENV`) | Should use logger |
| `supabase/functions/sync-data/` | `console.log/warn/error` | No | Runs in Deno/Edge -- acceptable, but not tracked |

Supabase Edge Functions use raw `console.*` because they run in a Deno runtime without access to the app's logger. These logs go to Supabase Dashboard Logs but are not aggregated in PostHog.

---

## Firebase Analytics

**Current state: Not integrated.**

No Firebase dependencies, no Firebase configuration, no `firebase` or `@firebase/*` packages in `package.json`. This is a greenfield integration.

---

## Risks & Tech Debt

### Critical Issues

1. **`global-error.tsx` has no PostHog tracking**: The most critical error boundary (root layout failure) silently fails without any analytics. This means crashes in `ThemeProvider` or `PostHogProvider` itself go completely unrecorded.

2. **`.env.staging` contains real secrets committed to git**: The Supabase service role key and PostHog key are hardcoded in `.env.staging`. This is a security risk -- these should be in CI/CD environment variables only.

3. **Server-side PostHog transport uses `distinctId: "system"`**: All server-side error logs go to a generic "system" user in PostHog, making it impossible to correlate server errors with the user who triggered them.

### High Priority

4. **No `shutdown()` call on server-side PostHog client**: In serverless environments, PostHog's `posthog-node` docs recommend calling `shutdown()` after capturing events. The current singleton never flushes on shutdown, risking event loss at the edge of serverless function lifecycle.

5. **`auth_magic_link_resent` event defined but never captured**: Dead code in the event catalog -- either the resend flow doesn't exist yet, or the event was forgotten during implementation.

6. **Production `.env.production.example` missing PostHog vars**: Operators deploying to production have no documentation of required PostHog environment variables.

7. **PostHog log transport registration is duplicated**: `PostHogProvider` (client) calls `registerTransport(createPostHogTransport())` on every mount, and `_transports` is a module-level array that can accumulate duplicate transports across hot-module reloads or re-mounts. There is no dedup guard.

### Medium Priority

8. **No structured error types**: Errors from DAL/actions are raw strings. There is no error code system for categorizing failures (auth, validation, database, external API) for analytics dashboards.

9. **Polling hooks use raw `console.warn` instead of the logger**: `use-match-polling.ts` and `use-prediction-polling.ts` bypass the logger, so polling errors never reach PostHog transports.

10. **No performance tracking**: Zero Web Vitals, API timing, or render performance data collected.

11. **Supabase Edge Function logging is unstructured**: `sync-data/index.ts` uses raw `console.log/warn/error` -- these logs are available in Supabase Dashboard but not in PostHog or any centralized analytics.

12. **CSP may need updates for Firebase**: If Firebase Analytics is added, `script-src` and `connect-src` in `next.config.ts` will need `https://*.google-analytics.com`, `https://*.analytics.google.com`, and `https://*.googletagmanager.com` added.

### Low Priority

13. **Feature flag hook has no loading state**: `useFeatureFlag` returns `false` while PostHog loads, which could cause false-negative behavior for feature gates.

14. **Privacy/terms no-track routes use opt-out/opt-in toggling**: This is correct behavior but means the PostHog distinct_id cookie persists even on privacy pages (only event capture is paused). If strict GDPR compliance is needed, this may need review.

---

## Relevant to Current Feature

### What Exists (to build upon)

1. **PostHog client + server integration is fully functional** -- both singletons work, events fire, feature flags work
2. **Centralized event catalog** (`ANALYTICS_EVENTS`) with naming conventions and tests
3. **Logger with transport system** -- the transport pattern is well-designed for adding new destinations
4. **PostHog transport bridge** already forwards errors/warnings from the logger to PostHog
5. **PostHog provider** in root layout handles pageviews and user identification
6. **CSP headers** already configured for PostHog domains
7. **Test infrastructure** -- global mocks for PostHog in Vitest and Storybook

### What Needs to Be Built

1. **Firebase Analytics SDK integration**: New dependency, initialization, provider/script, CSP updates
2. **Dual-provider architecture**: Both PostHog and Firebase need to coexist in the provider hierarchy
3. **Performance monitoring**: Web Vitals, API timing, server action duration tracking
4. **Enhanced error tracking**: Error categorization, user-correlated server errors, global-error.tsx fix
5. **Developer logging improvements**: Replace raw console.warn in polling hooks, add structured logging to Edge Functions
6. **Analytics abstraction layer** (optional): If both PostHog and Firebase are used, a thin abstraction to dispatch events to both without coupling components to either SDK
7. **Event expansion**: Coverage for missing user journeys (page timing, feature engagement, funnel events)

### Files That Will Likely Be Modified

| File | Reason |
|------|--------|
| `web-app/package.json` | Add Firebase SDK dependency |
| `web-app/next.config.ts` | Update CSP for Firebase domains |
| `web-app/src/app/layout.tsx` | Add Firebase provider/script |
| `web-app/src/app/global-error.tsx` | Add PostHog error tracking |
| `web-app/src/lib/posthog/events.ts` | Add new event constants |
| `web-app/src/lib/posthog/transport.ts` | Fix `distinctId: "system"` issue |
| `web-app/src/lib/posthog/client.ts` | Possibly enable performance autocapture |
| `web-app/src/lib/logger.ts` | Possibly add timing/performance utilities |
| `web-app/src/lib/env.ts` | Add Firebase env var validation |
| `web-app/.env.local.example` | Add Firebase env vars |
| `web-app/.env.production.example` | Add PostHog + Firebase env vars |
| `web-app/src/hooks/use-match-polling.ts` | Replace console.warn with logger |
| `web-app/src/hooks/use-prediction-polling.ts` | Replace console.warn with logger |
| `web-app/src/components/shared/posthog-provider.tsx` | Possibly add perf tracking |
| `web-app/src/test/setup.ts` | Add Firebase mock |
| `web-app/.storybook/main.ts` | Add Firebase mock/alias |

### Files That Should NOT Be Modified

| File | Reason |
|------|--------|
| `supabase/migrations/*` | No database changes needed for analytics |
| `web-app/src/lib/dal/*` | DAL layer should stay analytics-agnostic; logger handles forwarding |
| `web-app/src/lib/actions/*` | Existing `captureServerEvent` calls are sufficient; new events should follow the same pattern |
| `web-app/src/proxy.ts` | Middleware should remain lightweight |
