# Feature: Analytics & Observability
**Author**: PM Agent
**Status**: Draft
**Date**: 2026-03-29

## 1. Overview

Bragg has a partial PostHog integration that covers event capture and feature flags but has gaps in reliability, coverage, and developer tooling. This feature audits and fixes the existing PostHog setup, adds Firebase Analytics as a second platform, and builds a comprehensive observability layer covering five domains: app usage, user behavior, performance, structured production logging, and error tracking. The goal is to give the PM actionable product insights (funnels, engagement, adoption) and give developers production debugging capability (errors, performance, structured logs) -- all without ever storing or transmitting personally identifiable information (PII).

This is purely instrumentation and infrastructure work. No new UI components, pages, or user-facing copy are introduced.

## 2. User Stories

- **US-001**: As a PM, I want to see page-level and feature-level adoption metrics so that I can make informed product decisions about what to build next.
- **US-002**: As a PM, I want to analyze prediction funnels (page view -> form open -> picks changed -> submission) so that I can identify and fix drop-off points.
- **US-003**: As a PM, I want session-level engagement data (session duration, pages per session, return frequency) so that I can measure the health of the product.
- **US-004**: As a developer, I want structured production error logs with context (layer, operation, stack trace, error code) but NO user PII so that I can debug issues without compliance risk.
- **US-005**: As a developer, I want Core Web Vitals and page load metrics in a dashboard so that I can catch performance regressions before users complain.
- **US-006**: As a developer, I want API response time tracking on server actions so that I can identify slow endpoints and set performance budgets.
- **US-007**: As a developer, I want unhandled errors and React error boundary catches routed to a searchable error tracking system so that I can triage production issues quickly.

## 3. Functional Requirements

### 3.1 PostHog Audit & Fix (P0)

- **FR-001**: Audit the existing PostHog client initialization (`web-app/src/lib/posthog/client.ts`) and verify events are reaching the PostHog dashboard in both development and production.
  - Acceptance Criteria: With `NEXT_PUBLIC_POSTHOG_KEY` set to a valid project key, page views and custom events appear in the PostHog Events tab within 30 seconds of being fired. A checklist document confirms each existing event constant in `events.ts` is verified as firing correctly.

- **FR-002**: Fix the PII leak in `use-posthog-identify.ts`. The current implementation sends `email` and `display_name` as person properties. These must be removed. Only opaque identifiers and non-PII behavioral properties are permitted.
  - Acceptance Criteria: The `posthog.identify()` call sets `distinctId` to the Supabase `user.id` (UUID, already opaque) and person properties contain ONLY `onboarding_completed` (boolean) and `created_at` (ISO date string from profile). No email, no display_name, no date_of_birth, no IP-derived location. The `display_name` property in the `AUTH_ONBOARDING_COMPLETED` event (in `onboarding.ts`) must also be removed.

- **FR-003**: Fix the PII leak in `signInWithMagicLink` server action. The current `captureServerEvent(email, ...)` call uses the raw email as `distinctId`. This must use an anonymous session identifier or be removed entirely.
  - Acceptance Criteria: The `AUTH_MAGIC_LINK_REQUESTED` event either (a) uses a hashed/opaque identifier as distinctId, or (b) is removed from server-side capture and deferred to client-side capture with the PostHog anonymous ID. No raw email appears in any PostHog event payload.

- **FR-004**: Verify the PostHog reverse proxy is NOT configured (the app currently makes direct calls to `us.i.posthog.com`). Document this as a known limitation and add a P1 recommendation for proxying through Vercel rewrites to improve ad-blocker resilience.
  - Acceptance Criteria: The setup guide documents the current direct-connection approach and includes a "Recommended: Proxy Setup" section with Vercel rewrite configuration for `/_ph/` -> `https://us.i.posthog.com/`.

- **FR-005**: Verify the Content-Security-Policy in `next.config.ts` allows PostHog scripts and API calls. Current CSP includes `us-assets.i.posthog.com` for scripts and `us.i.posthog.com` for connect-src. Confirm this is sufficient; update if PostHog has added new domains.
  - Acceptance Criteria: PostHog loads without CSP errors in the browser console on both Chrome and Safari. CSP header includes all required PostHog domains.

### 3.2 Firebase Analytics Integration (P0)

- **FR-006**: Add the Firebase JS SDK (`firebase/analytics`) to the project. Initialize Firebase Analytics in a client-side provider, co-located with the existing PostHog provider pattern.
  - Acceptance Criteria: `firebase` and `firebase/analytics` are in `package.json` dependencies. A `FirebaseProvider` component initializes analytics on mount. The provider is added to the root layout alongside `PostHogProvider`.

- **FR-007**: Firebase Analytics must be initialized ONLY in the browser and ONLY when the `NEXT_PUBLIC_FIREBASE_*` environment variables are present. Graceful no-op when unconfigured (same pattern as PostHog).
  - Acceptance Criteria: The app builds and runs without errors when Firebase env vars are missing. No Firebase scripts load in SSR or during `next build`. `getFirebaseAnalytics()` returns `null` when unconfigured.

- **FR-008**: Add required Firebase environment variables to the env configuration.
  - Acceptance Criteria: `.env.local.example` and `.env.production.example` include `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, and `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`. The `env.ts` validation treats these as optional (app runs without them).

- **FR-009**: Update the Content-Security-Policy in `next.config.ts` to allow Firebase Analytics domains.
  - Acceptance Criteria: CSP `script-src` includes `https://www.googletagmanager.com https://*.google-analytics.com`. CSP `connect-src` includes `https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com`. No CSP violations in the browser console when Firebase is active.

- **FR-010**: Firebase Analytics must NOT collect or transmit PII. Disable default data collection features that could capture PII (e.g., `allow_google_signals`, `allow_ad_personalization_signals`).
  - Acceptance Criteria: Firebase config includes `{ allow_google_signals: false, allow_ad_personalization_signals: false, send_page_view: false }` (page views will be sent manually for consistency with PostHog). No email, display_name, or other PII appears in any Firebase event parameter.

### 3.3 Unified Analytics Abstraction Layer (P0)

- **FR-011**: Create a unified analytics module (`web-app/src/lib/analytics/`) that abstracts over PostHog and Firebase. All event tracking in the app must go through this layer -- no direct PostHog or Firebase calls from components or actions.
  - Acceptance Criteria: A single `trackEvent(eventName, properties)` function exists that fans out to both PostHog and Firebase. A `trackPageView(url)` function exists that sends page views to both platforms. Existing direct `getPostHogClient()?.capture(...)` calls in components are refactored to use `trackEvent`. Existing `captureServerEvent(...)` calls in server actions are refactored to use a server-side equivalent.

- **FR-012**: The abstraction layer must handle platform failures independently. If PostHog is down, Firebase events still fire, and vice versa.
  - Acceptance Criteria: Each platform dispatch is wrapped in a try/catch. A failure in one platform's SDK does not prevent the other platform from receiving the event. Failures are logged via the existing `logWarn` utility.

- **FR-013**: The abstraction layer must strip PII from all event properties before dispatching. Implement a sanitization function that removes known PII fields (`email`, `display_name`, `date_of_birth`, `phone`, `ip_address`, `user_agent_full`) from any properties object.
  - Acceptance Criteria: Unit tests confirm that passing `{ email: "test@x.com", group_id: "abc" }` to `trackEvent` results in only `{ group_id: "abc" }` being dispatched to both platforms. The sanitization function is applied to all outbound events.

### 3.4 App Usage Tracking (P0)

- **FR-014**: Track page views for every route change. Send to both PostHog and Firebase via the unified analytics layer.
  - Acceptance Criteria: Every navigation in the app (including back/forward, link clicks, and programmatic navigation) generates a page view event in both PostHog and Firebase. The event includes the URL path (without query parameters that could contain tokens or PII). Privacy-sensitive routes (`/privacy`, `/terms`) remain excluded per the existing `NO_TRACK_ROUTES` pattern.

- **FR-015**: Track feature adoption events for key features. At minimum, track first-time usage of: group creation, first prediction submission, first invite share, first scenario creation.
  - Acceptance Criteria: A `first_time` boolean property is included on relevant events when the user performs the action for the first time in their session or lifetime. PostHog person properties are updated with `$set_once` for lifetime first-usage flags (e.g., `first_prediction_at`, `first_group_created_at`).

- **FR-016**: Track session-level metrics: session start, session duration, pages viewed per session. Rely on PostHog's built-in session recording configuration (not full session replay -- just session analytics).
  - Acceptance Criteria: PostHog session analytics are enabled (`capture_pageleave: true` is already set). Session duration and page count are visible in the PostHog dashboard under Sessions. Firebase `session_start` events fire automatically via the SDK.

### 3.5 User Behavior Tracking (P1)

- **FR-017**: Track the prediction funnel with granular steps: (1) match page viewed, (2) predict page opened, (3) pick changed (already tracked), (4) prediction submitted (already tracked), (5) prediction page revisited (to check/change picks).
  - Acceptance Criteria: Events `predict_page_viewed` and `predict_page_revisited` are added. PostHog funnel analysis can be configured using the sequence: `$pageview[predict]` -> `prediction_pick_changed` -> `prediction_submitted`. The predict page view event distinguishes first visit from revisit via a `is_revisit` property.

- **FR-018**: Track group interaction patterns: group page views, standings page views, match leaderboard views, admin page views.
  - Acceptance Criteria: Each group sub-page generates a page view event with `group_id` as a property (stripped from the URL path, set as a structured property). PostHog can filter/group events by `group_id`.

- **FR-019**: Track engagement flow: login -> dashboard -> group selection -> match interaction. This is built from existing page view events and requires no new instrumentation, only PostHog funnel configuration.
  - Acceptance Criteria: The setup guide includes instructions for creating this funnel in the PostHog dashboard. No code changes needed for this requirement.

### 3.6 Performance Monitoring (P1)

- **FR-020**: Capture Core Web Vitals (LCP, FID/INP, CLS) using the `web-vitals` library and report them to both PostHog and Firebase.
  - Acceptance Criteria: `web-vitals` is added as a dependency. A performance reporter module captures all three metrics on every page load. Metrics are sent as structured events: `web_vitals_lcp`, `web_vitals_inp`, `web_vitals_cls` with `value` (milliseconds or score), `rating` (good/needs-improvement/poor), and `page_path`. Metrics appear in both PostHog and Firebase dashboards.

- **FR-021**: Track page load times using the Performance Navigation Timing API. Report `domContentLoadedEventEnd - navigationStart` and `loadEventEnd - navigationStart` for each page load.
  - Acceptance Criteria: A `page_load_time` event fires after each full page load (not client-side navigations) with `dom_content_loaded_ms` and `full_load_ms` properties. The event includes `page_path`.

- **FR-022**: Track server action response times. Wrap each server action with timing instrumentation that measures wall-clock execution time.
  - Acceptance Criteria: A `withTiming` higher-order function or middleware pattern is available for server actions. It captures `action_name`, `duration_ms`, and `success` (boolean) and sends them as a `server_action_duration` event to PostHog server-side. Actions taking longer than a configurable threshold (default 3000ms) are also logged as warnings via `logWarn`.

### 3.7 Structured Production Logging (P0)

- **FR-023**: Extend the existing `logger.ts` to support `info`-level logging in addition to the existing `error` and `warn` levels. Add a `logInfo` function.
  - Acceptance Criteria: `logInfo(context, detail?)` function exists. It follows the same pattern as `logWarn`: sends to all registered transports if the level passes the transport's filter, and outputs to console only when `ENABLE_DEBUG_LOGS=true`.

- **FR-024**: All log output (console and transport) must be structured JSON in production. In development, the current human-readable format is fine.
  - Acceptance Criteria: When `NODE_ENV === "production"`, `console.error`, `console.warn`, and `console.info` calls from the logger output JSON objects with keys: `level`, `message`, `layer`, `operation`, `metadata`, `timestamp`, `error` (if applicable). In development, the current format is preserved.

- **FR-025**: The logger must NEVER include PII in log output. Implement a log-level PII sanitizer that strips known PII fields from `metadata` before outputting.
  - Acceptance Criteria: Unit tests confirm that `logError({ layer: "action", operation: "test", metadata: { userId: "abc", email: "x@y.com" } })` outputs metadata with `userId` but without `email`. The sanitizer removes: `email`, `display_name`, `date_of_birth`, `phone`, `ip`, `ip_address`, `user_agent`. `userId` (opaque UUID) is NOT considered PII and is allowed.

- **FR-026**: Add structured logging to all existing server actions that currently lack it. Every server action must log at `info` level on entry (action name, non-PII parameters) and at `error` level on failure.
  - Acceptance Criteria: Each of the 7 server action files (`auth.ts`, `groups.ts`, `predictions.ts`, `scenarios.ts`, `admin.ts`, `notifications.ts`, `onboarding.ts`) has entry-level `logInfo` calls and error-level `logError` calls on all failure paths. No PII in any log statement.

### 3.8 Error Tracking (P0)

- **FR-027**: Ensure all React error boundaries (`error.tsx`, `global-error.tsx`, `group/[groupId]/error.tsx`) report errors to the unified analytics layer with structured context.
  - Acceptance Criteria: Error boundary events include: `error_message`, `error_digest` (Next.js digest), `error_stack` (truncated to 1000 chars), `error_context` (which boundary caught it: "global", "app", "group"), `page_path`. Events are sent to both PostHog and Firebase. The existing `global-error.tsx` is updated to include analytics reporting (currently it has none).

- **FR-028**: Add a global `window.onerror` and `window.onunhandledrejection` handler to catch errors that escape React error boundaries (e.g., errors in third-party scripts, async errors outside React tree).
  - Acceptance Criteria: A client-side error handler registers on app mount. It captures `error_message`, `error_source` (filename), `error_line`, `error_col`, `error_stack` (truncated), and `is_unhandled_rejection` (boolean). Events are sent via the unified analytics layer as `unhandled_error` events. Duplicate errors (same message + source within 5 seconds) are deduplicated to prevent event floods.

- **FR-029**: Add error tracking for failed server actions. When a server action returns `{ success: false }`, log it as a structured warning (not error -- these are expected user-facing failures like validation errors). When a server action throws an unexpected exception, log it as an error.
  - Acceptance Criteria: Expected failures (validation, auth, permission) are logged at `warn` level with `action_name` and `error_message`. Unexpected exceptions are logged at `error` level with full stack trace. Both go through the unified analytics layer and the structured logger.

- **FR-030**: Add error tracking for failed Supabase/DAL calls. The existing `logError` calls in server actions cover some DAL failures, but ensure coverage is comprehensive.
  - Acceptance Criteria: Every `catch` block in server actions and every DAL error return that is currently unlogged gets a `logError` or `logWarn` call. An audit confirms no silent failures exist in the action layer.

### 3.9 Setup Guide Document (P0)

- **FR-031**: Create a setup guide document at `docs/feature_docs/analytics-observability/setup-guide.md` with manual configuration steps for both PostHog and Firebase.
  - Acceptance Criteria: The guide includes: (1) PostHog project creation and API key setup, (2) Firebase project creation and configuration, (3) Environment variable configuration for local dev, staging, and production, (4) Vercel environment variable setup instructions, (5) PostHog proxy setup via Vercel rewrites (recommended), (6) Verification steps to confirm both platforms are receiving data.

- **FR-032**: The setup guide must include dashboard configuration instructions for key metrics.
  - Acceptance Criteria: The guide includes step-by-step instructions for creating: (1) PostHog funnel for the prediction flow, (2) PostHog dashboard for engagement metrics (DAU, session duration, pages per session), (3) PostHog dashboard for error tracking, (4) Firebase dashboard for Core Web Vitals, (5) Firebase dashboard for page view trends. Each instruction includes which events/properties to filter on.

## 4. Non-Functional Requirements

- **Performance**: Analytics initialization must not block the critical rendering path. PostHog and Firebase SDKs must lazy-load after first paint. Total additional JS bundle size from Firebase Analytics SDK must not exceed 30KB gzipped. Server-side analytics calls (`captureServerEvent` and its replacement) must be fire-and-forget (non-blocking to the action response).
- **Privacy / NO PII**: This is the highest-priority non-functional requirement. No personally identifiable information may be transmitted to any analytics platform or logged in production. PII is defined as: email addresses, display names, dates of birth, phone numbers, IP addresses (beyond what the platforms collect at the transport layer, which is outside our control), full user agent strings, and any data that can directly identify an individual. Supabase UUIDs are NOT PII (they are opaque identifiers). Group IDs, match IDs, and scenario IDs are not PII. The PII sanitization layer must be unit-tested with 100% coverage of the known PII field list.
- **Reliability**: Analytics failures must NEVER crash the app or degrade user experience. Every analytics call must be wrapped in error handling. If both analytics platforms are unreachable, the app functions identically to a user.
- **Testability**: All analytics modules must be mockable in tests. The unified analytics layer must accept dependency-injected platform adapters so unit tests can verify event dispatch without real SDK calls. Existing test mocks in `__mocks__/handlers/posthog-server.ts` and `__mocks__/handlers/posthog-node.ts` must be updated to reflect the new abstraction.
- **Bundle Size**: Firebase Analytics adds ~25KB gzipped. The `web-vitals` library adds ~1.5KB gzipped. Total new JS added to the client bundle must not exceed 35KB gzipped. Tree-shaking must be verified (no importing the full Firebase SDK).
- **Environment Isolation**: Development, staging, and production must use separate PostHog projects and separate Firebase projects. The setup guide must document this. Analytics must be completely disabled in test environments (Vitest, Playwright).

## 5. Edge Cases & Error States

| Scenario | Expected Behavior |
|----------|-------------------|
| PostHog API key is missing or invalid | PostHog silently no-ops. Firebase still works. App functions normally. Console warning in development. |
| Firebase config is missing or invalid | Firebase silently no-ops. PostHog still works. App functions normally. Console warning in development. |
| Both analytics platforms are unreachable (network issue) | App functions normally. Events are lost (acceptable -- analytics is best-effort). No error toasts or UI impact. |
| Ad blocker blocks PostHog script/API | PostHog `getPostHogClient()` returns null or init fails silently. Firebase (Google Analytics) may also be blocked. App functions normally. |
| User navigates rapidly between pages | Page view events are debounced by the existing `lastPathRef` pattern. No duplicate page views for the same URL. Firebase `logEvent` handles rapid calls gracefully by default. |
| Server action fires analytics but PostHog flush fails in serverless | The existing `flushAt: 1, flushInterval: 0` config flushes immediately. If flush fails, the event is lost. This is acceptable for serverless. No retry logic needed. |
| Error boundary catches an error with a very long stack trace | Stack trace is truncated to 1000 characters before being sent to analytics. No payload size issues. |
| Same error occurs 100 times in rapid succession (error loop) | The `window.onerror` deduplication logic limits to 1 event per unique error per 5-second window. PostHog client-side also has built-in rate limiting. |
| `web-vitals` API is not available (older browser) | The performance reporter checks for API availability before attempting capture. No errors thrown. Metrics simply not reported for that session. |
| Server action takes extremely long (>30s, hits Vercel timeout) | The timing wrapper records the duration up to the point of timeout. The Vercel timeout itself is a separate concern and will result in a 504 error, which is captured by error tracking. |

## 6. Out of Scope (v2+)

- **P1 -- PostHog Session Replay**: Full session recording (video replay of user sessions). Valuable for debugging but adds significant bandwidth and privacy considerations. Evaluate after v1 analytics are stable.
- **P1 -- PostHog Reverse Proxy**: Routing PostHog calls through a first-party domain (`/ingest/` -> PostHog) to bypass ad blockers. Documented in the setup guide as a recommendation but not implemented in v1 code. (Note: FR-004 documents the recommendation; actual implementation is v2.)
- **P1 -- Alerting**: Automated alerts when error rates spike or performance degrades. Requires PostHog or a separate alerting tool (PagerDuty, OpsGenie). Defer until baseline metrics are established.
- **P2 -- A/B Testing Infrastructure**: Using PostHog feature flags for A/B tests with analytics integration. The feature flag hooks already exist (`use-feature-flag.ts`, `getServerFeatureFlag`). Connecting them to experiment analysis is v2.
- **P2 -- Custom Dashboards in the App**: An admin-facing analytics dashboard within Bragg itself. All analytics consumption happens in PostHog and Firebase dashboards.
- **P2 -- Server-Side Logging Sink (Axiom/Datadog)**: The logger transport system supports this, but v1 uses PostHog as the remote logging target. A dedicated log aggregator is a v2 enhancement.
- **P2 -- Mobile-Specific Performance Tracking**: Network type detection, offline queueing of analytics events, battery-aware throttling. The app is a PWA-capable web app, not a native app. Standard web analytics are sufficient for v1.

## 7. Open Questions

- [ ] **Q1**: Is the current PostHog instance on a free or paid plan? The free plan has a 1M events/month limit. With comprehensive tracking, we may approach this during IPL season (high traffic). **PM Decision**: Proceed with full instrumentation. Monitor event volume in the first week. If we approach 80% of the limit, implement client-side sampling (e.g., only track 50% of page views). **Flagged for review.**
- [ ] **Q2**: Should Firebase Analytics replace Google Analytics 4 or supplement it? Firebase Analytics IS GA4 under the hood -- they share the same backend. **PM Decision**: Use Firebase SDK (not gtag.js) since we are a web app that may eventually become a PWA/native app. Firebase SDK provides a cleaner integration path. **Flagged for review.**
- [ ] **Q3**: Should we add Vercel Analytics / Vercel Speed Insights as a third platform? Vercel offers built-in performance monitoring that is trivial to enable. **PM Decision**: Defer to v2. Two platforms (PostHog + Firebase) is enough for v1. Vercel Analytics can be enabled with a single config flag later if needed.
- [ ] **Q4**: What is the data retention policy? PostHog free tier retains data for 1 year. Firebase retains for 14 months. **PM Decision**: Acceptable for v1. No custom retention configuration needed.

## 8. Dependencies

- **Existing packages**: `posthog-js` (^1.364.0), `posthog-node` (^5.28.7) -- already installed.
- **New packages**: `firebase` (^11.x) for Firebase Analytics, `web-vitals` (^4.x) for Core Web Vitals measurement.
- **Existing infrastructure**: PostHog project (needs audit to confirm it is active and receiving data). Supabase auth (provides `user.id` as the opaque analytics identifier).
- **New infrastructure (manual setup)**: Firebase project with Analytics enabled. This is documented in the setup guide and must be done by the developer/PM before the feature can be fully tested.
- **Environment variables**: 5 new Firebase env vars need to be added to Vercel (production and preview environments).
- **CSP updates**: `next.config.ts` must be updated for Firebase/Google Analytics domains.
- **Vercel deployment config**: No changes needed for v1. Vercel rewrites for PostHog proxy are a documented v2 recommendation.

## 9. Assumptions

> These are documented for transparency. Flag any that seem wrong.

1. **PostHog is on the US cloud instance (`us.i.posthog.com`).** This is what the current configuration uses. If the project is on the EU instance, the setup guide host URLs need updating. **Flagged for review.**

2. **The app is deployed on Vercel.** The setup guide and CSP configuration assume Vercel. If deploying elsewhere, CSP and proxy instructions may differ.

3. **Supabase `user.id` (UUID) is a stable, opaque identifier suitable for analytics.** UUIDs do not change for a user, are not PII, and are consistent across client and server. This is used as the `distinctId` for PostHog and the `userId` for Firebase.

4. **The existing PostHog event names and structure in `events.ts` are correct and should be preserved.** The abstraction layer wraps them; it does not rename them. Firebase will receive the same event names.

5. **Firebase Analytics free tier is sufficient.** Firebase Analytics (GA4) has no event volume limits for standard events. Custom event volume is limited to 500 distinct event names and 25 custom parameters per event -- our current event catalog (~30 events) is well within this limit.

6. **No consent banner is needed for v1.** The app's privacy policy covers analytics data collection. PostHog and Firebase are configured to minimize data collection (no PII, no ad signals). If the app targets EU users, a consent mechanism would be needed -- but the current userbase is India-focused (IPL). **Flagged for review.**

7. **The `web-vitals` library's API is available in the target browsers.** The app targets modern browsers (Chrome 90+, Safari 15+, Firefox 90+). The Performance Observer API is available in all of these.

8. **Server actions are the primary server-side execution path.** The app does not have standalone API routes (except `/auth/callback`). Analytics instrumentation focuses on server actions and the auth callback route.

## 10. Priority Summary

| ID | Requirement | Priority | Audience |
|----|-------------|----------|----------|
| FR-001 | Audit & verify existing PostHog integration | P0 | Dev |
| FR-002 | Fix PII leak in PostHog identify hook | P0 | Both |
| FR-003 | Fix PII leak in magic link server event | P0 | Both |
| FR-004 | Document PostHog proxy recommendation | P0 | Dev |
| FR-005 | Verify CSP for PostHog | P0 | Dev |
| FR-006 | Add Firebase Analytics SDK | P0 | Both |
| FR-007 | Firebase graceful no-op when unconfigured | P0 | Dev |
| FR-008 | Firebase environment variables | P0 | Dev |
| FR-009 | CSP updates for Firebase | P0 | Dev |
| FR-010 | Firebase PII prevention config | P0 | Both |
| FR-011 | Unified analytics abstraction layer | P0 | Dev |
| FR-012 | Independent platform failure handling | P0 | Dev |
| FR-013 | PII sanitization in analytics layer | P0 | Both |
| FR-014 | Page view tracking (both platforms) | P0 | PM |
| FR-015 | Feature adoption first-time tracking | P0 | PM |
| FR-016 | Session-level metrics | P0 | PM |
| FR-017 | Prediction funnel tracking | P1 | PM |
| FR-018 | Group interaction pattern tracking | P1 | PM |
| FR-019 | Engagement flow funnel (dashboard only) | P1 | PM |
| FR-020 | Core Web Vitals capture | P1 | Dev |
| FR-021 | Page load time tracking | P1 | Dev |
| FR-022 | Server action timing instrumentation | P1 | Dev |
| FR-023 | Add `logInfo` to structured logger | P0 | Dev |
| FR-024 | Structured JSON logging in production | P0 | Dev |
| FR-025 | PII sanitizer for logger | P0 | Both |
| FR-026 | Structured logging in all server actions | P0 | Dev |
| FR-027 | Error boundary analytics reporting | P0 | Dev |
| FR-028 | Global unhandled error/rejection capture | P0 | Dev |
| FR-029 | Server action failure tracking | P0 | Dev |
| FR-030 | Comprehensive DAL error coverage audit | P0 | Dev |
| FR-031 | Setup guide document | P0 | Both |
| FR-032 | Dashboard configuration instructions | P0 | PM |
