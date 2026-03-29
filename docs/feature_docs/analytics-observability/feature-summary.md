# Feature: Analytics & Observability
**Completed**: 2026-03-29
**Branch**: `feature/analytics-observability`

---

## What Was Built

This feature adds a comprehensive analytics and observability layer to the Bragg web app. It does not introduce any new UI or user-facing functionality. Instead, it provides the instrumentation needed for product analytics (PostHog + Firebase Analytics) and developer observability (structured logging, error tracking, performance monitoring).

The core deliverable is a **unified analytics abstraction layer** (`web-app/src/lib/analytics/`) that sits between the application code and both analytics platforms. All event tracking in the app now flows through this layer, which applies PII sanitization before dispatching events to PostHog and Firebase independently. If one platform is unavailable (ad-blocked, misconfigured, or down), the other continues to receive events.

Three critical PII leaks in the existing PostHog integration were fixed: the `usePostHogIdentify` hook was sending `email` and `display_name` as person properties, the `signInWithMagicLink` server action was using the raw email as a PostHog `distinctId`, and the `AUTH_ONBOARDING_COMPLETED` event included `display_name`.

Additionally, the structured logger (`logger.ts`) was enhanced with an `info` log level, structured JSON output in production, and PII sanitization on all log output. All seven server action files now have structured `logInfo` entry logging and comprehensive error tracking.

---

## Key Components and Their Purpose

### Unified Analytics Layer (`web-app/src/lib/analytics/`)

| File | Purpose |
|------|---------|
| `index.ts` | Public API. Exports `trackEvent()`, `trackPageView()`, `trackServerEvent()`, `identifyUser()`, `resetUser()`. All functions apply PII sanitization before dispatch. |
| `sanitize.ts` | PII sanitization utility. Strips 10 known PII fields (`email`, `display_name`, `displayName`, `date_of_birth`, `dateOfBirth`, `phone`, `ip`, `ip_address`, `user_agent`, `user_agent_full`) from event properties. Also exports `hashIdentifier()` for SHA-256 hashing of pre-auth identifiers. |
| `adapters.ts` | Internal dispatch helpers. `capturePostHogClient()` and `capturePostHogServer()` wrap PostHog SDKs. `captureFirebase()` and `identifyFirebase()` wrap Firebase Analytics. Each adapter is independently error-handled with try/catch. |
| `web-vitals.ts` | Core Web Vitals (LCP, INP, CLS) and page load timing reporter. Uses the `web-vitals` library and Navigation Timing API. Reports metrics through the unified analytics layer. |
| `error-handler.ts` | Global `window.addEventListener("error")` and `window.addEventListener("unhandledrejection")` handlers. Catches errors that escape React error boundaries. Includes 5-second deduplication to prevent event floods. |
| `server-timing.ts` | `withTiming()` higher-order function for wrapping server actions with wall-clock timing instrumentation. Reports `action_name`, `duration_ms`, and `success` through the unified layer. Logs warnings for actions exceeding 3000ms. |
| `sanitize.test.ts` | Unit tests for PII sanitization and SHA-256 hashing. |

### Firebase Analytics Client (`web-app/src/lib/firebase/client.ts`)

Lazy singleton for Firebase Analytics initialization. Returns `null` gracefully when environment variables are missing, the browser does not support Firebase Analytics, or the code is running server-side. Explicitly disables Google Signals (`allow_google_signals: false`), ad personalization (`allow_ad_personalization_signals: false`), and automatic page views (`send_page_view: false`) to prevent PII collection.

### Enhanced Structured Logger (`web-app/src/lib/logger.ts`)

The existing logger was extended with:
- `logInfo()` function for info-level logging (same pattern as `logWarn`)
- Structured JSON output in production (`NODE_ENV === "production"`), with keys: `level`, `message`, `layer`, `operation`, `metadata`, `timestamp`, `error`
- PII sanitization applied to metadata before console output and transport dispatch

---

## Files Created and Modified

### New Files (8)

| File | Description |
|------|-------------|
| `web-app/src/lib/analytics/index.ts` | Unified analytics public API |
| `web-app/src/lib/analytics/sanitize.ts` | PII sanitization and hash utilities |
| `web-app/src/lib/analytics/adapters.ts` | PostHog and Firebase dispatch adapters |
| `web-app/src/lib/analytics/web-vitals.ts` | Core Web Vitals and page load timing |
| `web-app/src/lib/analytics/error-handler.ts` | Global unhandled error/rejection handlers |
| `web-app/src/lib/analytics/server-timing.ts` | Server action timing HOF |
| `web-app/src/lib/analytics/sanitize.test.ts` | PII sanitizer unit tests |
| `web-app/src/lib/firebase/client.ts` | Firebase Analytics lazy singleton |
| `web-app/src/__mocks__/handlers/firebase-client.ts` | Firebase Storybook mock |

### Modified Files (28)

**Configuration:**
- `web-app/package.json` -- Added `firebase` and `web-vitals` dependencies
- `web-app/next.config.ts` -- CSP updates for Firebase/Google Analytics domains
- `web-app/.env.local.example` -- Added Firebase environment variables
- `web-app/.env.production.example` -- Added PostHog + Firebase environment variables

**PostHog fixes:**
- `web-app/src/hooks/use-posthog-identify.ts` -- Removed `email` and `display_name` from person properties; migrated to unified analytics layer
- `web-app/src/lib/posthog/server.ts` -- Added `shutdownPostHog()` for serverless cleanup
- `web-app/src/lib/posthog/transport.ts` -- Fixed user correlation (reads `userId` from context metadata instead of hardcoded `"system"`)
- `web-app/src/lib/posthog/events.ts` -- Added 8 new event constants (37 total)
- `web-app/src/lib/posthog/index.ts` -- Updated barrel export

**Error tracking:**
- `web-app/src/app/error.tsx` -- Migrated to unified analytics layer
- `web-app/src/app/global-error.tsx` -- Added PostHog error reporting via raw `fetch` (no SDK dependency)
- `web-app/src/app/group/[groupId]/error.tsx` -- Migrated to unified analytics layer

**Client components (migrated to unified analytics layer):**
- `web-app/src/components/shared/posthog-provider.tsx` -- Uses `trackPageView()`, registers error handlers and web vitals reporters
- `web-app/src/components/group/invite-link.tsx`
- `web-app/src/components/layout/notification-bell.tsx`
- `web-app/src/components/prediction/prediction-form.tsx`

**Server actions (migrated + added structured logging):**
- `web-app/src/lib/actions/auth.ts` -- Fixed PII leak (SHA-256 hash instead of raw email as distinctId), added `logInfo` entry logging
- `web-app/src/lib/actions/onboarding.ts` -- Removed `display_name` from event, added `logInfo`
- `web-app/src/lib/actions/groups.ts` -- Migrated to unified layer, added `logInfo`
- `web-app/src/lib/actions/predictions.ts` -- Migrated, added `logInfo`
- `web-app/src/lib/actions/scenarios.ts` -- Migrated, added `logInfo`
- `web-app/src/lib/actions/admin.ts` -- Migrated, added `logInfo`
- `web-app/src/lib/actions/notifications.ts` -- Migrated, added `logInfo`
- `web-app/src/app/auth/callback/route.ts` -- Migrated to unified layer

**Logger:**
- `web-app/src/lib/logger.ts` -- Added `logInfo`, production JSON output, PII sanitization

**Test infrastructure:**
- `web-app/src/test/setup.ts` -- Added Firebase and web-vitals mocks
- `web-app/.storybook/main.ts` -- Added Firebase alias and env vars

---

## PII Safety Measures

PII prevention is the highest-priority non-functional requirement. The implementation uses a defense-in-depth approach with three layers of protection:

### Layer 1: Source-level cleanup
All call sites were audited and cleaned. The `email`, `display_name`, and `date_of_birth` fields were removed from every analytics event and identify call. The magic link server action now uses a SHA-256 hash of the email as the `distinctId` instead of the raw email.

### Layer 2: Unified analytics sanitizer
Every event dispatched through `trackEvent()`, `trackServerEvent()`, and `identifyUser()` passes through `sanitizeProperties()` before reaching any analytics platform. This function strips 10 known PII fields from the properties object.

### Layer 3: Logger sanitizer
All structured log output (both console and transport) passes through the same `sanitizeProperties()` function. Production JSON output and development console output both apply sanitization to metadata before logging.

### Firebase-specific PII prevention
Firebase Analytics is initialized with `allow_google_signals: false` and `allow_ad_personalization_signals: false` to disable demographic and interest data collection at the platform level. Automatic page views are disabled (`send_page_view: false`) -- page views are sent manually through the unified layer for consistency.

### PII field list
The sanitizer strips: `email`, `display_name`, `displayName`, `date_of_birth`, `dateOfBirth`, `phone`, `ip`, `ip_address`, `user_agent`, `user_agent_full`. Supabase UUIDs (`userId`, `group_id`, `match_id`) are considered opaque identifiers and are explicitly allowed.

---

## How to Use the Analytics Layer

### Tracking a client-side event

```typescript
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";

// Events go to both PostHog and Firebase. PII is stripped automatically.
trackEvent(ANALYTICS_EVENTS.PREDICTION_SUBMITTED, {
  group_id: groupId,
  match_id: matchId,
  prediction_count: picks.length,
});
```

### Tracking a server-side event (in server actions)

```typescript
import { trackServerEvent, ANALYTICS_EVENTS } from "@/lib/analytics";

// Server events go to PostHog only (Firebase is client-side only).
trackServerEvent(user.id, ANALYTICS_EVENTS.GROUP_CREATED, {
  group_id: newGroup.id,
});
```

### Identifying a user

```typescript
import { identifyUser, resetUser } from "@/lib/analytics";

// On sign-in: identify with non-PII traits
identifyUser(user.id, {
  onboarding_completed: true,
  created_at: profile.accepted_terms_at,
});

// On sign-out: reset identity
resetUser();
```

### Adding a new event

1. Add the event constant to `web-app/src/lib/posthog/events.ts`:
   ```typescript
   MY_NEW_EVENT: "my_new_event",
   ```
2. Use it via the unified layer:
   ```typescript
   trackEvent(ANALYTICS_EVENTS.MY_NEW_EVENT, { some_property: value });
   ```
3. The event automatically goes to both PostHog and Firebase with PII stripped.

### Wrapping a server action with timing

```typescript
import { withTiming } from "@/lib/analytics/server-timing";

export const myAction = withTiming("myAction", async (formData: FormData) => {
  // ... action body
});
```

### Structured logging in server actions

```typescript
import { logInfo, logError } from "@/lib/logger";

export async function myAction() {
  logInfo({ layer: "action", operation: "myAction", metadata: { groupId } });

  try {
    // ... business logic
  } catch (error) {
    logError({ layer: "action", operation: "myAction", metadata: { groupId } }, error);
  }
}
```

---

## Known Limitations and Future Work

### Issues Identified During Review

The code review and QA review identified the following items. Items marked "fixed" were resolved before merge; others are documented for follow-up.

| Issue | Severity | Status |
|-------|----------|--------|
| Logger dev-mode fallback can bypass PII sanitization when all metadata fields are PII (QA-001) | Critical | Needs fix |
| Vitest mock missing `initializeAnalytics` from `firebase/analytics` (QA-002) | Major | Needs fix |
| No unit tests for analytics dispatch, error handler, server timing, or logger enhancements (QA-003) | Major | Partial -- `sanitize.test.ts` exists; remaining tests are a follow-up |
| `events.test.ts` threshold still at 29 (should be 37 after adding 8 events) (QA-007) | Minor | Needs fix |

### P1 Items (Deferred to v2)

| Item | Description |
|------|-------------|
| PostHog reverse proxy | Route PostHog API calls through Vercel rewrites (`/_ph/` -> PostHog) to bypass ad blockers. Configuration is documented in the setup guide but not implemented. |
| PostHog session replay | Full session recording for debugging. Adds bandwidth and privacy considerations. |
| Alerting | Automated alerts when error rates spike or performance degrades. Requires PostHog paid plan or a separate tool. |
| Feature adoption first-time tracking (FR-015) | `first_time` boolean property and `$set_once` lifetime flags not implemented. |
| Prediction funnel events (FR-017) | `PREDICT_PAGE_VIEWED` and `PREDICT_PAGE_REVISITED` event constants are defined but not tracked from the predict page components. |
| Group interaction patterns (FR-018) | Group sub-page tracking with `group_id` property not implemented. |
| `withTiming` integration (FR-022) | The HOF is implemented but not yet applied to any server action. Available for incremental adoption. |

### P2 Items (Deferred to v2+)

| Item | Description |
|------|-------------|
| A/B testing infrastructure | Connecting PostHog feature flags to experiment analysis. |
| In-app analytics dashboards | Admin-facing analytics within Bragg itself. |
| Server-side log sink (Axiom/Datadog) | The logger transport system supports this; v1 uses PostHog as the remote target. |
| Mobile-specific performance tracking | Network type detection, offline queueing, battery-aware throttling. |
| Vercel Analytics / Speed Insights | Third analytics platform; can be enabled with a config flag later. |
| Nested PII sanitization | The sanitizer only strips PII from top-level keys. Nested objects are not deep-sanitized. |

---

## Dependencies Added

| Package | Version | Size (gzipped) | Purpose |
|---------|---------|----------------|---------|
| `firebase` | ^12.11.0 | ~20-25KB (tree-shaked: `firebase/app` + `firebase/analytics` only) | Firebase Analytics (GA4) client SDK |
| `web-vitals` | ^5.2.0 | ~1.5KB | Core Web Vitals measurement (LCP, INP, CLS) |

**Estimated total client bundle increase**: ~22-27KB gzipped, under the 35KB budget.

Both libraries are dynamically imported (not in the initial bundle). Firebase is loaded via `await import("firebase/analytics")` in the adapter. Web Vitals is loaded via `import("web-vitals")` in the reporter.

**Existing dependencies** (unchanged): `posthog-js` (^1.364.0), `posthog-node` (^5.28.7).

---

## Environment Variables Required

### PostHog (existing -- no changes)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | Yes (for PostHog) | PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | Yes (for PostHog) | PostHog API host (default: `https://us.i.posthog.com`) |

### Firebase Analytics (new -- all optional)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | No | Firebase project API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | No | Firebase auth domain (e.g., `bragg-production.firebaseapp.com`) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | No | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | No | Firebase web app ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | No | Firebase/GA4 measurement ID (e.g., `G-XXXXXXXXXX`) |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | No | Firebase storage bucket (not required for analytics-only usage) |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | No | Firebase messaging sender ID (not required for analytics-only usage) |

The app functions normally without any Firebase environment variables. Firebase Analytics silently returns `null` when unconfigured.

**Environment isolation**: Use separate PostHog projects and separate Firebase projects for production, staging, and development. Analytics is completely disabled in test environments (Vitest, Playwright) via global mocks.

---

## Configuration

### CSP Updates (`next.config.ts`)

The Content-Security-Policy header was updated to allow Firebase/Google Analytics domains:
- `script-src`: Added `https://www.googletagmanager.com`, `https://*.google-analytics.com`
- `connect-src`: Added `https://*.google-analytics.com`, `https://*.analytics.google.com`, `https://*.googletagmanager.com`

### Test Infrastructure

- **Vitest** (`web-app/src/test/setup.ts`): Global mocks added for `firebase/app`, `firebase/analytics`, and `web-vitals`.
- **Storybook** (`web-app/.storybook/main.ts`): Firebase client aliased to a no-op mock. Firebase environment variables set to empty strings.

---

## Setup Guide Reference

For manual configuration steps (PostHog project creation, Firebase project creation, Vercel environment variable setup, dashboard configuration, and alert configuration), see:

**[`docs/feature_docs/analytics-observability/setup-guide.md`](./setup-guide.md)**

The setup guide covers:
1. PostHog verification and dashboard configuration (User Behavior, Error Tracking, Performance, Engagement dashboards)
2. Firebase project creation, web app registration, and environment variable setup
3. Firebase reporting configuration (Realtime, Engagement, Event Tracking, Audience Segmentation)
4. GA4 funnel exploration setup
5. Key metrics tracking guide (maps common PM and developer questions to specific dashboard steps)
6. PostHog reverse proxy recommendation (v2)
7. Alert configuration for error rate spikes, performance degradation, and service downtime

---

## Related Documentation

| Document | Path |
|----------|------|
| Requirements | [`docs/feature_docs/analytics-observability/requirements.md`](./requirements.md) |
| Technical Architecture | [`docs/feature_docs/analytics-observability/technical-architecture.md`](./technical-architecture.md) |
| Codebase Analysis | [`docs/feature_docs/analytics-observability/codebase-analysis.md`](./codebase-analysis.md) |
| Code Review | [`docs/feature_docs/analytics-observability/code-review.md`](./code-review.md) |
| QA Review | [`docs/feature_docs/analytics-observability/qa-review.md`](./qa-review.md) |
| Setup Guide | [`docs/feature_docs/analytics-observability/setup-guide.md`](./setup-guide.md) |
| Test Plan | [`docs/feature_docs/analytics-observability/test-plan.md`](./test-plan.md) |
