# Technical Architecture: Analytics & Observability

**Date**: 2026-03-29
**Author**: PSE Agent
**Status**: Draft
**Mode**: Architecture Design (frontend-only, no database changes)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [PII Sanitization Layer](#2-pii-sanitization-layer)
3. [Firebase Analytics Integration](#3-firebase-analytics-integration)
4. [PostHog Fixes](#4-posthog-fixes)
5. [Unified Analytics Layer](#5-unified-analytics-layer)
6. [Performance Monitoring](#6-performance-monitoring)
7. [Error Tracking Enhancement](#7-error-tracking-enhancement)
8. [Structured Logging Enhancement](#8-structured-logging-enhancement)
9. [CSP Updates](#9-csp-updates)
10. [Bundle Size Considerations](#10-bundle-size-considerations)
11. [Test Infrastructure Updates](#11-test-infrastructure-updates)
12. [Environment Variables](#12-environment-variables)
13. [File-by-File Change Plan](#13-file-by-file-change-plan)
14. [Implementation Order](#14-implementation-order)

---

## 1. Architecture Overview

### Current State

```
Components/Actions ──> posthog/client.ts (client-side)
                   ──> posthog/server.ts (server-side)
                   ──> logger.ts ──> posthog/transport.ts (error/warn forwarding)
```

Components and server actions call PostHog directly. The logger has a transport system that also forwards errors to PostHog.

### Target State

```
Components/Actions ──> lib/analytics/index.ts (unified layer)
                         ├── posthog adapter (client + server)
                         └── firebase adapter (client only)

logger.ts ──> transports[] ──> posthog transport (existing, fixed)

All outbound events pass through sanitizeProperties() before dispatch.
```

The key principle: a thin unified layer that fans events to both PostHog and Firebase, with a shared PII sanitizer. Not a framework -- just a module with a few exported functions.

### What This Is NOT

- Not a plugin system or provider abstraction. There will never be a third analytics provider in v1.
- Not a queue/retry system. Analytics is best-effort fire-and-forget.
- Not a new provider component hierarchy. Firebase initializes lazily via a getter function; it does not need a React provider.

---

## 2. PII Sanitization Layer

### Design

A single `sanitizeProperties` function shared by the analytics layer and the logger. Lives in its own module because both `lib/analytics/` and `lib/logger.ts` need it.

**New file**: `src/lib/analytics/sanitize.ts`

```typescript
/**
 * PII fields that must never appear in analytics events or log output.
 * Supabase UUIDs (userId, group_id, match_id) are NOT PII -- they are opaque.
 */
const PII_FIELDS = new Set([
  "email",
  "display_name",
  "displayName",
  "date_of_birth",
  "dateOfBirth",
  "phone",
  "ip",
  "ip_address",
  "user_agent",
  "user_agent_full",
]);

/**
 * Strips known PII fields from a properties object.
 * Returns a new object -- does not mutate the input.
 */
export function sanitizeProperties<T extends Record<string, unknown>>(
  properties: T
): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!PII_FIELDS.has(key)) {
      result[key] = value;
    }
  }
  return result as Partial<T>;
}
```

### Where It Gets Applied

1. **Unified analytics layer**: `trackEvent()` and `trackServerEvent()` call `sanitizeProperties()` on all event properties before dispatching to PostHog and Firebase.
2. **Logger**: `logError()`, `logWarn()`, and `logInfo()` call `sanitizeProperties()` on `context.metadata` before console output and before sending to transports.
3. **PostHog identify**: The `usePostHogIdentify` hook is rewritten to remove `email` and `display_name` entirely.

### PII Fixes Required

| Location | Current PII Leak | Fix |
|----------|-----------------|-----|
| `use-posthog-identify.ts` | Sends `email`, `display_name` as person properties | Remove both. Keep only `onboarding_completed` and `created_at`. |
| `actions/auth.ts` line 55 | `captureServerEvent(email, ...)` uses raw email as `distinctId` | Use a SHA-256 hash of the email, or remove the server-side event entirely and defer to client-side anonymous tracking. **Decision**: Use SHA-256 hash -- this correlates pre-auth events without leaking the email. |
| `actions/onboarding.ts` line 63 | `display_name` in event properties | Remove `display_name` from the `AUTH_ONBOARDING_COMPLETED` event properties. |
| `actions/auth.ts` line 50 | `logError` metadata includes `{ email }` | Remove `email` from logError metadata. The sanitizer will also catch this as a safety net. |

### SHA-256 Hashing for Pre-Auth Events

For the magic link request (where we have no `user.id` yet), hash the email to create a consistent but opaque identifier:

```typescript
// In lib/analytics/sanitize.ts
export async function hashIdentifier(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
```

`crypto.subtle` is available in both Node.js 18+ (Vercel) and all modern browsers. No extra dependencies needed.

---

## 3. Firebase Analytics Integration

### SDK Choice

Use `firebase` package (modular SDK v11.x) with tree-shakeable imports:

```typescript
import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent, setUserId } from "firebase/analytics";
```

Do NOT import the full `firebase` namespace. The modular imports enable tree-shaking, keeping the bundle to ~20-25KB gzipped for the analytics module only.

### Initialization Pattern

Firebase Analytics is client-side only. It does not work in Node.js / server components. The initialization follows the same lazy-singleton pattern as PostHog.

**New file**: `src/lib/firebase/client.ts`

```typescript
import { type FirebaseApp, initializeApp } from "firebase/app";
import { type Analytics, getAnalytics, isSupported } from "firebase/analytics";

let app: FirebaseApp | null = null;
let analytics: Analytics | null = null;
let initAttempted = false;

/**
 * Returns the Firebase Analytics instance, or null if unconfigured/unsupported.
 * Lazy-initializes on first call. Client-side only.
 */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  if (initAttempted) return analytics;
  initAttempted = true;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

  if (!apiKey || !projectId || !appId || !measurementId) return null;

  try {
    const supported = await isSupported();
    if (!supported) return null;

    app = initializeApp({
      apiKey,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId,
      appId,
      measurementId,
    });

    analytics = getAnalytics(app);
    return analytics;
  } catch {
    // Firebase init failed -- silently no-op
    return null;
  }
}
```

### Why No React Provider

Firebase Analytics does not need a React context. Unlike PostHog (which has a client instance that components access via hooks), Firebase Analytics is only accessed through the unified analytics layer. No component ever calls Firebase directly. A simple lazy getter is sufficient and avoids adding another context provider to the render tree.

### Firebase Config: PII Prevention

When logging events via Firebase, set the global config to disable PII-adjacent collection:

```typescript
import { setAnalyticsCollectionEnabled } from "firebase/analytics";

// Inside initialization, after getAnalytics():
// Disable Google Signals (ad personalization, demographics)
// These are set per-event via gtag config -- we handle this in the analytics layer
// by not sending any PII fields and by setting:
//   allow_google_signals: false
//   allow_ad_personalization_signals: false
//   send_page_view: false  (we send page views manually for consistency)
```

This is applied in the `getFirebaseAnalytics()` function after initialization, using the Firebase `setConsent` API or gtag config.

### Firebase Event Name Mapping

Firebase has a 40-character limit for event names and does not allow the `$` prefix. The unified analytics layer handles this:

- PostHog `$pageview` -> Firebase `page_view` (built-in Firebase event)
- All custom events use the same snake_case names from `ANALYTICS_EVENTS` (they already conform to Firebase's naming rules)
- Firebase parameters are limited to 25 custom parameters per event and 100 characters per parameter value. Our events are well within these limits.

---

## 4. PostHog Fixes

### 4.1 Fix `global-error.tsx` (FR-027)

The current `global-error.tsx` has no analytics at all. This is the last-resort error boundary -- it catches errors in the root layout itself (including `PostHogProvider`).

**Problem**: Since `global-error.tsx` replaces the entire `<html>`, PostHog may not be initialized when this boundary fires. We cannot rely on `getPostHogClient()`.

**Solution**: Use a direct, standalone PostHog capture that initializes its own minimal client instance. This is intentionally duplicative -- it's a fallback for when the main PostHog infrastructure is broken.

```typescript
// In global-error.tsx
useEffect(() => {
  try {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    // Direct fetch to PostHog API -- no SDK dependency
    // This is intentionally raw because the SDK may be the thing that crashed
    fetch("https://us.i.posthog.com/capture/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event: "error_boundary_caught",
        properties: {
          error_message: error.message,
          error_digest: error.digest,
          error_stack: error.stack?.slice(0, 1000),
          error_context: "global",
          $current_url: window.location.href,
        },
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Fire-and-forget. If PostHog is down, we lose this event.
    });
  } catch {
    // Swallow everything. This boundary must never re-throw.
  }
}, [error]);
```

This approach uses `fetch` directly instead of the PostHog SDK. This is correct for `global-error.tsx` because:
1. The PostHog SDK itself might be the cause of the error.
2. It adds zero bundle dependencies to the error boundary.
3. It works even if `PostHogProvider` never mounted.

### 4.2 Fix Server-Side PostHog User Correlation (FR-003, Codebase Analysis Issue #3)

**Problem**: The PostHog log transport sends all server-side events with `distinctId: "system"`, making them impossible to correlate with users.

**Solution**: Thread the `userId` through the logger context metadata, and read it in the transport.

**Change in `src/lib/posthog/transport.ts`**:

```typescript
// Server-side capture -- use userId from context metadata if available
const userId =
  (context.metadata?.userId as string) ?? "system";

ph?.capture({
  distinctId: userId,
  event: ANALYTICS_EVENTS.ERROR_LOGGED,
  properties,
});
```

This requires no API change. Server actions already include `userId` in their `logError` metadata (e.g., `metadata: { userId: user.id, groupId, matchId }`). The transport just needs to read it.

For cases where `userId` is genuinely unavailable (pre-auth errors, infrastructure errors), `"system"` remains the fallback -- this is acceptable.

### 4.3 Add `shutdown()` for Serverless (Codebase Analysis Issue #4)

**Problem**: The `posthog-node` singleton never calls `shutdown()`. In serverless environments, the function may terminate before PostHog flushes.

**Solution**: The current config (`flushAt: 1, flushInterval: 0`) already mitigates this -- events are flushed immediately. However, to be correct per the PostHog docs, add an explicit `shutdown()` call.

**Add to `src/lib/posthog/server.ts`**:

```typescript
/**
 * Flush and shut down the server-side PostHog client.
 * Call at the end of serverless function execution if needed.
 * Safe to call multiple times.
 */
export async function shutdownPostHog(): Promise<void> {
  if (serverPostHog) {
    await serverPostHog.shutdown();
    serverPostHog = null;
  }
}
```

This is exposed but **not called automatically**. The `flushAt: 1` config is sufficient for Vercel serverless. The `shutdownPostHog()` function exists for edge cases (e.g., long-running API routes) or if we later change the flush config.

### 4.4 Fix Transport Duplicate Registration (Codebase Analysis Issue #7)

**Problem**: `PostHogProvider` calls `registerTransport(createPostHogTransport())` on every mount. In development with hot-module reload, this accumulates duplicate transports.

**Solution**: Add a deduplication guard in the provider, mirroring the server-side `ensureServerTransport()` pattern.

**Change in `src/components/shared/posthog-provider.tsx`**:

```typescript
// Module-level flag (persists across re-renders, reset on HMR full reload)
let clientTransportRegistered = false;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // ...
  useEffect(() => {
    getPostHogClient();
    if (!clientTransportRegistered) {
      registerTransport(createPostHogTransport());
      clientTransportRegistered = true;
    }
  }, []);
  // ...
}
```

---

## 5. Unified Analytics Layer

### Design Philosophy

The unified layer is a module, not a class. It exports plain functions. No dependency injection, no adapter interfaces, no factory pattern. This is a small app -- two analytics platforms, known at build time.

### File Structure

```
src/lib/analytics/
  index.ts          # Public API: trackEvent, trackPageView, identifyUser, etc.
  sanitize.ts       # PII sanitization + hash utility
  adapters.ts       # Internal: PostHog and Firebase dispatch helpers
```

Three files total. The barrel export from `index.ts` is the only import site for the rest of the app.

### Public API (`src/lib/analytics/index.ts`)

```typescript
export { sanitizeProperties, hashIdentifier } from "./sanitize";

/**
 * Track a custom event on both PostHog and Firebase.
 * Properties are PII-sanitized before dispatch.
 * Client-side only for Firebase; works on both client and server for PostHog.
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void;

/**
 * Track a page view on both PostHog and Firebase.
 * Client-side only.
 */
export function trackPageView(url: string): void;

/**
 * Track a server-side event (PostHog only -- Firebase doesn't support server-side).
 * Properties are PII-sanitized before dispatch.
 */
export function trackServerEvent(
  userId: string,
  eventName: string,
  properties?: Record<string, unknown>
): void;

/**
 * Identify a user on both PostHog and Firebase.
 * Only non-PII properties are sent.
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, unknown>
): void;

/**
 * Reset user identity on sign-out.
 */
export function resetUser(): void;
```

### Internal Implementation (`src/lib/analytics/adapters.ts`)

```typescript
import { sanitizeProperties } from "./sanitize";
import { logWarn } from "@/lib/logger";

// ── PostHog (client) ─────────────────────────────
function capturePostHogClient(
  event: string,
  properties: Record<string, unknown>
): void {
  try {
    // Dynamic import to avoid importing posthog-js in server bundles
    const { getPostHogClient } = require("@/lib/posthog/client");
    const ph = getPostHogClient();
    ph?.capture(event, properties);
  } catch (err) {
    logWarn({ layer: "analytics", operation: "capturePostHogClient" }, String(err));
  }
}

// ── PostHog (server) ─────────────────────────────
function capturePostHogServer(
  userId: string,
  event: string,
  properties: Record<string, unknown>
): void {
  try {
    const { captureServerEvent } = require("@/lib/posthog/server");
    captureServerEvent(userId, event, properties);
  } catch (err) {
    logWarn({ layer: "analytics", operation: "capturePostHogServer" }, String(err));
  }
}

// ── Firebase (client only) ───────────────────────
async function captureFirebase(
  event: string,
  properties: Record<string, unknown>
): Promise<void> {
  try {
    const { getFirebaseAnalytics } = await import("@/lib/firebase/client");
    const analytics = await getFirebaseAnalytics();
    if (!analytics) return;

    const { logEvent } = await import("firebase/analytics");
    logEvent(analytics, event, properties);
  } catch (err) {
    logWarn({ layer: "analytics", operation: "captureFirebase" }, String(err));
  }
}
```

Note: The adapter uses dynamic `import()` for Firebase to ensure it never gets pulled into server bundles. PostHog client uses `require()` (synchronous) because it's already imported synchronously elsewhere and this avoids a race condition with rapid event dispatch.

### How `trackEvent` Works

```typescript
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  const clean = properties ? sanitizeProperties(properties) : {};

  if (typeof window !== "undefined") {
    // Client-side: send to both
    capturePostHogClient(eventName, clean);
    captureFirebase(eventName, clean); // async, fire-and-forget
  } else {
    // Server-side: PostHog only (no userId available -- use trackServerEvent for that)
    // This path is unlikely but handled gracefully
  }
}
```

### Migration Strategy: Replacing Direct PostHog Calls

All existing direct PostHog calls in components and server actions are migrated to use the unified layer:

| Current Call | Replacement |
|-------------|-------------|
| `getPostHogClient()?.capture(EVENT, props)` in components | `trackEvent(EVENT, props)` |
| `captureServerEvent(userId, EVENT, props)` in server actions | `trackServerEvent(userId, EVENT, props)` |
| `posthog.identify(userId, traits)` in `use-posthog-identify` | `identifyUser(userId, traits)` |
| `posthog.reset()` in `use-posthog-identify` | `resetUser()` |
| `posthog.capture("$pageview", ...)` in `PostHogProvider` | `trackPageView(url)` |

The `ANALYTICS_EVENTS` constant object stays in `src/lib/posthog/events.ts` and is re-exported from `src/lib/analytics/index.ts`. It does not move -- renaming would be a disruptive churn change for no benefit.

### Event Catalog Additions

Add to `ANALYTICS_EVENTS` in `src/lib/posthog/events.ts`:

```typescript
// Performance
WEB_VITALS_LCP: "web_vitals_lcp",
WEB_VITALS_INP: "web_vitals_inp",
WEB_VITALS_CLS: "web_vitals_cls",
PAGE_LOAD_TIME: "page_load_time",
SERVER_ACTION_DURATION: "server_action_duration",

// Error tracking
UNHANDLED_ERROR: "unhandled_error",

// Behavior (new)
PREDICT_PAGE_VIEWED: "predict_page_viewed",
PREDICT_PAGE_REVISITED: "predict_page_revisited",
```

---

## 6. Performance Monitoring

### 6.1 Core Web Vitals (FR-020)

**New dependency**: `web-vitals` (^4.x, ~1.5KB gzipped)

**New file**: `src/lib/analytics/web-vitals.ts`

```typescript
import type { Metric } from "web-vitals";

/**
 * Reports Core Web Vitals to the unified analytics layer.
 * Call once from PostHogProvider (or a dedicated AnalyticsProvider) on mount.
 * Client-side only.
 */
export function reportWebVitals(): void {
  // Dynamic import to keep it out of the main bundle
  import("web-vitals").then(({ onLCP, onINP, onCLS }) => {
    const sendMetric = (metric: Metric) => {
      // Lazy import to avoid circular deps at module load
      import("./index").then(({ trackEvent, ANALYTICS_EVENTS }) => {
        const eventMap: Record<string, string> = {
          LCP: ANALYTICS_EVENTS.WEB_VITALS_LCP,
          INP: ANALYTICS_EVENTS.WEB_VITALS_INP,
          CLS: ANALYTICS_EVENTS.WEB_VITALS_CLS,
        };
        const eventName = eventMap[metric.name];
        if (!eventName) return;

        trackEvent(eventName, {
          value: metric.value,
          rating: metric.rating, // "good" | "needs-improvement" | "poor"
          page_path: window.location.pathname,
          navigation_type: metric.navigationType,
        });
      });
    };

    onLCP(sendMetric);
    onINP(sendMetric);
    onCLS(sendMetric);
  }).catch(() => {
    // web-vitals not available in this browser -- no-op
  });
}
```

### 6.2 Page Load Timing (FR-021)

**Added to**: `src/lib/analytics/web-vitals.ts`

```typescript
/**
 * Reports page load timing using Navigation Timing API.
 * Only fires on full page loads (not client-side navigations).
 */
export function reportPageLoadTime(): void {
  if (typeof window === "undefined") return;

  // Wait for load event to complete
  const report = () => {
    const entries = performance.getEntriesByType("navigation");
    if (entries.length === 0) return;

    const nav = entries[0] as PerformanceNavigationTiming;
    import("./index").then(({ trackEvent, ANALYTICS_EVENTS }) => {
      trackEvent(ANALYTICS_EVENTS.PAGE_LOAD_TIME, {
        dom_content_loaded_ms: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
        full_load_ms: Math.round(nav.loadEventEnd - nav.startTime),
        page_path: window.location.pathname,
      });
    });
  };

  if (document.readyState === "complete") {
    // Already loaded -- report immediately (with a small delay for accuracy)
    setTimeout(report, 0);
  } else {
    window.addEventListener("load", () => setTimeout(report, 0), { once: true });
  }
}
```

### 6.3 Server Action Timing (FR-022)

A `withTiming` higher-order function that wraps server actions to measure execution time.

**New file**: `src/lib/analytics/server-timing.ts`

```typescript
import { captureServerEvent } from "@/lib/posthog/server";
import { logWarn } from "@/lib/logger";
import { sanitizeProperties } from "./sanitize";
import { ANALYTICS_EVENTS } from "@/lib/posthog/events";

const SLOW_THRESHOLD_MS = 3000;

/**
 * Wraps a server action with timing instrumentation.
 * Measures wall-clock execution time and reports to PostHog.
 *
 * Usage:
 *   export const submitPredictions = withTiming("submitPredictions", async (groupId, matchId, predictions) => {
 *     // ... existing action body
 *   });
 */
export function withTiming<TArgs extends unknown[], TReturn>(
  actionName: string,
  fn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const start = performance.now();
    let success = true;

    try {
      const result = await fn(...args);
      // Check ActionResponse pattern
      if (
        result &&
        typeof result === "object" &&
        "success" in result &&
        (result as Record<string, unknown>).success === false
      ) {
        success = false;
      }
      return result;
    } catch (err) {
      success = false;
      throw err;
    } finally {
      const duration = Math.round(performance.now() - start);

      // Fire-and-forget: send timing event to PostHog
      captureServerEvent("system", ANALYTICS_EVENTS.SERVER_ACTION_DURATION, {
        action_name: actionName,
        duration_ms: duration,
        success,
      });

      if (duration > SLOW_THRESHOLD_MS) {
        logWarn(
          { layer: "action", operation: actionName, metadata: { duration_ms: duration } },
          `Slow server action: ${duration}ms`
        );
      }
    }
  };
}
```

**Usage pattern**: The `withTiming` wrapper is applied to individual server actions that are performance-critical. It is NOT applied to every action by default -- that would be over-engineering. Start with:
- `submitPredictions` (user-facing latency-sensitive)
- `completeOnboarding` (first-time user experience)
- `publishScenarios` (admin workflow)

The wrapper is opt-in, not mandatory. Adding it to an action is a one-line change.

---

## 7. Error Tracking Enhancement

### 7.1 Error Boundaries with Analytics (FR-027)

**Pattern**: All error boundaries send events through the unified analytics layer instead of calling PostHog directly. This ensures events go to both PostHog and Firebase.

**Existing `app/error.tsx`** -- change from:
```typescript
getPostHogClient()?.capture(ANALYTICS_EVENTS.ERROR_BOUNDARY_CAUGHT, { ... });
```
to:
```typescript
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";

trackEvent(ANALYTICS_EVENTS.ERROR_BOUNDARY_CAUGHT, {
  error_message: error.message,
  error_digest: error.digest,
  error_stack: error.stack?.slice(0, 1000),
  error_context: "app",
  page_path: window.location.pathname,
});
```

Same pattern for `app/group/[groupId]/error.tsx` (with `error_context: "group"`).

**`app/global-error.tsx`** -- uses raw `fetch` as described in section 4.1 (cannot depend on the analytics layer since it may be the cause of the crash).

### 7.2 Global Unhandled Error/Rejection Capture (FR-028)

**New file**: `src/lib/analytics/error-handler.ts`

```typescript
import { ANALYTICS_EVENTS } from "@/lib/posthog/events";

interface ErrorRecord {
  key: string;
  timestamp: number;
}

const DEDUP_WINDOW_MS = 5000;
let recentErrors: ErrorRecord[] = [];

function isDuplicate(key: string): boolean {
  const now = Date.now();
  recentErrors = recentErrors.filter((e) => now - e.timestamp < DEDUP_WINDOW_MS);
  if (recentErrors.some((e) => e.key === key)) return true;
  recentErrors.push({ key, timestamp: now });
  return false;
}

/**
 * Registers global error handlers for errors that escape React error boundaries.
 * Call once on app mount (in PostHogProvider or a similar client-side init point).
 */
export function registerGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;

  window.onerror = (message, source, lineno, colno, error) => {
    const key = `${message}:${source}`;
    if (isDuplicate(key)) return;

    // Async import to avoid loading analytics eagerly
    import("./index").then(({ trackEvent }) => {
      trackEvent(ANALYTICS_EVENTS.UNHANDLED_ERROR, {
        error_message: typeof message === "string" ? message.slice(0, 500) : "Unknown error",
        error_source: source?.slice(0, 200),
        error_line: lineno,
        error_col: colno,
        error_stack: error?.stack?.slice(0, 1000),
        is_unhandled_rejection: false,
        page_path: window.location.pathname,
      });
    });
  };

  window.onunhandledrejection = (event) => {
    const message =
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason);
    const key = `rejection:${message}`;
    if (isDuplicate(key)) return;

    import("./index").then(({ trackEvent }) => {
      trackEvent(ANALYTICS_EVENTS.UNHANDLED_ERROR, {
        error_message: message.slice(0, 500),
        error_stack:
          event.reason instanceof Error
            ? event.reason.stack?.slice(0, 1000)
            : undefined,
        is_unhandled_rejection: true,
        page_path: window.location.pathname,
      });
    });
  };
}
```

This is called in `PostHogProvider`'s `useEffect` (alongside PostHog init and transport registration).

### 7.3 Server Action Error Wrapping (FR-029)

The existing server action pattern already handles errors well: Zod validation failures return `{ success: false }`, and unexpected exceptions are caught with `logError`. The enhancement is:

1. Add `logInfo` calls at action entry points (see section 8).
2. Ensure all `catch` blocks also call `trackServerEvent` so errors appear in both the logger transport AND the analytics dashboard.
3. Categorize errors: validation/auth failures at `warn` level, unexpected exceptions at `error` level.

This does NOT require a new wrapper or middleware. It is a series of small additions to each existing server action file.

---

## 8. Structured Logging Enhancement

### 8.1 Add `logInfo` (FR-023)

**Change in `src/lib/logger.ts`**:

```typescript
/**
 * Log an informational message (non-error, non-warning).
 * Useful for action entry points, important state transitions.
 */
export function logInfo(context: LogContext, detail?: string): void {
  const message = `[${context.layer}] ${context.operation}${detail ? `: ${detail}` : ""}`;

  for (const transport of _transports) {
    try {
      transport.send("info", message, context);
    } catch {
      // swallow
    }
  }

  if (isLoggingEnabled()) {
    console.info(message, context.metadata);
  }
}
```

### 8.2 Structured JSON in Production (FR-024)

**Change in `src/lib/logger.ts`**: Replace `console.error/warn/info` calls with a format-aware output function:

```typescript
function isProduction(): boolean {
  try {
    return process.env.NODE_ENV === "production";
  } catch {
    return false;
  }
}

function output(
  level: LogLevel,
  message: string,
  context: LogContext,
  error?: unknown
): void {
  if (!isLoggingEnabled()) return;

  if (isProduction()) {
    // Structured JSON for log aggregation (Vercel logs, future Axiom/Datadog)
    const entry: Record<string, unknown> = {
      level,
      message,
      layer: context.layer,
      operation: context.operation,
      metadata: context.metadata ? sanitizeProperties(context.metadata) : undefined,
      timestamp: new Date().toISOString(),
    };
    if (error instanceof Error) {
      entry.error = {
        message: error.message,
        name: error.name,
        stack: error.stack?.slice(0, 1000),
      };
    } else if (error) {
      entry.error = error;
    }

    const consoleFn =
      level === "error" ? console.error :
      level === "warn" ? console.warn :
      console.info;
    consoleFn(JSON.stringify(entry));
  } else {
    // Human-readable for development (current behavior)
    const consoleFn =
      level === "error" ? console.error :
      level === "warn" ? console.warn :
      console.info;
    consoleFn(message, {
      ...context.metadata,
      ...(error ? { error: formatError(error) } : {}),
    });
  }
}
```

Then `logError`, `logWarn`, and `logInfo` all call `output()` instead of inline `console.*`.

### 8.3 PII Sanitization in Logger (FR-025)

The `output()` function calls `sanitizeProperties(context.metadata)` before writing to console. The transport `send()` calls already pass through metadata which the transport can sanitize -- but as defense-in-depth, the logger itself strips PII before console output.

Import `sanitizeProperties` from `@/lib/analytics/sanitize`. This creates a dependency from `logger.ts` to the analytics sanitize module. This is acceptable because the sanitize module is a pure utility with zero external dependencies.

### 8.4 Server Action Logging Enhancement (FR-026)

Add `logInfo` at the entry point of each server action. Example for `submitPredictions`:

```typescript
export async function submitPredictions(
  groupId: string,
  matchId: number,
  predictions: Array<{ scenarioId: string; value: string }>
): Promise<ActionResponse> {
  logInfo({
    layer: "action",
    operation: "submitPredictions",
    metadata: { groupId, matchId, predictionCount: predictions.length },
  });

  // ... rest of action
}
```

This is a mechanical change across 7 files. Each action function gets a `logInfo` at the top with non-PII parameters.

---

## 9. CSP Updates

### Current CSP (`next.config.ts`)

```
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us-assets.i.posthog.com
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://us.i.posthog.com https://apiv2.api-cricket.com
```

### Required Additions for Firebase Analytics

Firebase Analytics (which is Google Analytics 4 under the hood) requires:

| Directive | Domain | Purpose |
|-----------|--------|---------|
| `script-src` | `https://www.googletagmanager.com` | GTM script loader (Firebase Analytics uses this internally) |
| `script-src` | `https://*.google-analytics.com` | GA4 analytics script |
| `connect-src` | `https://*.google-analytics.com` | Event data transmission |
| `connect-src` | `https://*.analytics.google.com` | Analytics API endpoint |
| `connect-src` | `https://*.googletagmanager.com` | Tag manager API |

### Updated CSP

```typescript
{
  key: "Content-Security-Policy",
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us-assets.i.posthog.com https://www.googletagmanager.com https://*.google-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://us.i.posthog.com https://apiv2.api-cricket.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
    "frame-ancestors 'none'",
  ].join("; "),
}
```

---

## 10. Bundle Size Considerations

### New Dependencies

| Package | Gzipped Size | Tree-Shakeable | Notes |
|---------|-------------|---------------|-------|
| `firebase` (analytics only) | ~20-25KB | Yes (modular SDK) | Import only `firebase/app` + `firebase/analytics` |
| `web-vitals` | ~1.5KB | Yes | Full library is small |
| **Total** | **~22-27KB** | | Under the 35KB budget |

### Tree-Shaking Strategy

The Firebase modular SDK (v11.x) is designed for tree-shaking. The critical rule:

**DO**: Import specific functions from subpackages:
```typescript
import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
```

**DO NOT**: Import from the top-level `firebase` package:
```typescript
// BAD -- pulls in the entire SDK (~200KB+)
import firebase from "firebase/app";
```

The `firebase/client.ts` module uses only `firebase/app` and `firebase/analytics`. No other Firebase modules (auth, firestore, storage, etc.) are imported. This keeps the bundle to the analytics-only footprint.

### Verification

After implementation, verify bundle impact with:

```bash
cd web-app && npx next build
# Check .next/analyze/ if @next/bundle-analyzer is installed
# Or check the build output size summary
```

Alternatively, use the Vercel deployment output which reports bundle sizes per route.

### Dynamic Import Strategy

Firebase Analytics is dynamically imported in `src/lib/analytics/adapters.ts`:

```typescript
const { getFirebaseAnalytics } = await import("@/lib/firebase/client");
```

This means the Firebase SDK is NOT included in the initial page load bundle. It loads asynchronously after the first analytics event fires. The initial page load is unaffected.

`web-vitals` is also dynamically imported in `reportWebVitals()`. It loads after the page's first paint, ensuring it does not block rendering.

---

## 11. Test Infrastructure Updates

### Vitest Global Mocks (`src/test/setup.ts`)

Add Firebase mock alongside existing PostHog mocks:

```typescript
// Existing PostHog mocks stay unchanged

// Mock Firebase
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
}));

vi.mock("firebase/analytics", () => ({
  getAnalytics: vi.fn().mockReturnValue({}),
  isSupported: vi.fn().mockResolvedValue(false), // disabled in tests
  logEvent: vi.fn(),
  setUserId: vi.fn(),
}));

// Mock web-vitals
vi.mock("web-vitals", () => ({
  onLCP: vi.fn(),
  onINP: vi.fn(),
  onCLS: vi.fn(),
}));
```

### Storybook Mocks (`.storybook/main.ts`)

Add Firebase alias and env vars:

```typescript
// In viteFinal alias section:
"@/lib/firebase/client": path.resolve(
  __dirname,
  "../src/__mocks__/handlers/firebase-client.ts"
),

// In process.env.defines:
"process.env.NEXT_PUBLIC_FIREBASE_API_KEY": JSON.stringify(""),
"process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID": JSON.stringify(""),
"process.env.NEXT_PUBLIC_FIREBASE_APP_ID": JSON.stringify(""),
"process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID": JSON.stringify(""),
```

**New file**: `src/__mocks__/handlers/firebase-client.ts`

```typescript
export async function getFirebaseAnalytics() {
  return null;
}
```

### Existing Mock Updates

The existing Storybook mocks for PostHog (`posthog-server.ts`, `posthog-node.ts`) remain unchanged. The unified analytics layer imports from `@/lib/posthog/*`, which the mocks already intercept.

### New Unit Tests

| Test File | Tests |
|-----------|-------|
| `src/lib/analytics/sanitize.test.ts` | PII stripping (all fields), passthrough of safe fields, `hashIdentifier` output format |
| `src/lib/analytics/index.test.ts` | `trackEvent` dispatches to both platforms, handles PostHog failure, handles Firebase failure, handles both failing |
| `src/lib/analytics/error-handler.test.ts` | Deduplication window, unhandled rejection capture, stack truncation |
| `src/lib/analytics/web-vitals.test.ts` | Metric reporting format, browser API unavailability |
| `src/lib/analytics/server-timing.test.ts` | Timing measurement, slow threshold warning |
| `src/lib/logger.test.ts` | `logInfo` function, JSON output in production mode, PII sanitization in metadata |

---

## 12. Environment Variables

### New Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | No | (empty) | Firebase project API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | No | (empty) | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | No | (empty) | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | No | (empty) | Firebase app ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | No | (empty) | Firebase Analytics measurement ID (G-XXXXXXXX) |

All Firebase variables are optional. When missing, Firebase Analytics silently no-ops. The app runs without them.

These are NOT added to `src/lib/env.ts` as required variables -- they are read directly from `process.env` in the Firebase client module. The `env.ts` file only validates variables that are required for the app to function.

### Files to Update

- `web-app/.env.local.example`: Add all 5 Firebase variables with placeholder values.
- `web-app/.env.production.example`: Add all 5 Firebase variables plus the 2 PostHog variables (currently missing).

---

## 13. File-by-File Change Plan

### New Files

| # | File | Purpose |
|---|------|---------|
| 1 | `src/lib/analytics/index.ts` | Unified analytics public API |
| 2 | `src/lib/analytics/sanitize.ts` | PII sanitization and hash utility |
| 3 | `src/lib/analytics/adapters.ts` | Internal PostHog + Firebase dispatch helpers |
| 4 | `src/lib/analytics/web-vitals.ts` | Web Vitals + page load timing reporter |
| 5 | `src/lib/analytics/server-timing.ts` | `withTiming` HOF for server actions |
| 6 | `src/lib/analytics/error-handler.ts` | Global `onerror` / `onunhandledrejection` handlers |
| 7 | `src/lib/firebase/client.ts` | Firebase Analytics lazy singleton |
| 8 | `src/__mocks__/handlers/firebase-client.ts` | Storybook mock for Firebase |
| 9 | `src/lib/analytics/sanitize.test.ts` | Unit tests for PII sanitization |
| 10 | `src/lib/analytics/index.test.ts` | Unit tests for unified analytics dispatch |
| 11 | `src/lib/analytics/error-handler.test.ts` | Unit tests for global error handler |
| 12 | `src/lib/analytics/server-timing.test.ts` | Unit tests for withTiming |
| 13 | `src/lib/logger.test.ts` | Unit tests for logInfo + JSON output + PII sanitization |

### Modified Files

| # | File | Changes |
|---|------|---------|
| 14 | `package.json` | Add `firebase` (^11.x) and `web-vitals` (^4.x) to dependencies |
| 15 | `next.config.ts` | Update CSP `script-src` and `connect-src` for Firebase/GA domains |
| 16 | `src/lib/logger.ts` | Add `logInfo()`. Add `output()` helper with JSON mode. Import `sanitizeProperties` for metadata sanitization. |
| 17 | `src/lib/posthog/events.ts` | Add new event constants: `WEB_VITALS_LCP`, `WEB_VITALS_INP`, `WEB_VITALS_CLS`, `PAGE_LOAD_TIME`, `SERVER_ACTION_DURATION`, `UNHANDLED_ERROR`, `PREDICT_PAGE_VIEWED`, `PREDICT_PAGE_REVISITED` |
| 18 | `src/lib/posthog/transport.ts` | Fix `distinctId: "system"` -- read `userId` from `context.metadata` |
| 19 | `src/lib/posthog/server.ts` | Add `shutdownPostHog()` export |
| 20 | `src/hooks/use-posthog-identify.ts` | Remove `email` and `display_name` from identify call. Add `created_at`. Use `identifyUser` from analytics layer. |
| 21 | `src/components/shared/posthog-provider.tsx` | Add dedup guard for transport registration. Add `registerGlobalErrorHandlers()` call. Add `reportWebVitals()` and `reportPageLoadTime()` calls. Replace direct `posthog.capture("$pageview")` with `trackPageView()`. |
| 22 | `src/app/global-error.tsx` | Add raw `fetch` to PostHog API for error reporting (no SDK dependency). |
| 23 | `src/app/error.tsx` | Replace `getPostHogClient()?.capture(...)` with `trackEvent()` from unified layer. Add `error_context: "app"` and `page_path`. |
| 24 | `src/app/group/[groupId]/error.tsx` | Replace `getPostHogClient()?.capture(...)` with `trackEvent()`. Add `page_path`. |
| 25 | `src/lib/actions/auth.ts` | Fix PII: hash email for magic link event `distinctId`, remove `email` from `logError` metadata. Replace `captureServerEvent` with `trackServerEvent`. Add `logInfo` at action entry. |
| 26 | `src/lib/actions/onboarding.ts` | Remove `display_name` from `AUTH_ONBOARDING_COMPLETED` event. Replace `captureServerEvent` with `trackServerEvent`. Add `logInfo` at action entry. |
| 27 | `src/lib/actions/groups.ts` | Replace `captureServerEvent` with `trackServerEvent`. Add `logInfo` at action entry. |
| 28 | `src/lib/actions/predictions.ts` | Replace `captureServerEvent` with `trackServerEvent`. Add `logInfo` at action entry. Optionally wrap with `withTiming`. |
| 29 | `src/lib/actions/scenarios.ts` | Replace `captureServerEvent` with `trackServerEvent`. Add `logInfo` at action entry. |
| 30 | `src/lib/actions/admin.ts` | Replace `captureServerEvent` with `trackServerEvent`. Add `logInfo` at action entry. |
| 31 | `src/lib/actions/notifications.ts` | Replace `captureServerEvent` with `trackServerEvent`. Add `logInfo` at action entry. |
| 32 | `src/app/auth/callback/route.ts` | Replace `captureServerEvent` with `trackServerEvent`. Fix `"anonymous"` distinctId on failure path. |
| 33 | `src/components/layout/notification-bell.tsx` | Replace direct PostHog capture with `trackEvent`. |
| 34 | `src/components/group/invite-link.tsx` | Replace direct PostHog capture with `trackEvent`. |
| 35 | `src/components/prediction/prediction-form.tsx` | Replace direct PostHog capture with `trackEvent`. |
| 36 | `.env.local.example` | Add 5 Firebase env variables. |
| 37 | `.env.production.example` | Add 5 Firebase env variables + 2 PostHog env variables. |
| 38 | `src/test/setup.ts` | Add Firebase and web-vitals mocks. |
| 39 | `.storybook/main.ts` | Add Firebase client alias, Firebase env var defines. |
| 40 | `src/lib/posthog/index.ts` | Update barrel exports -- keep existing, add re-export of `ANALYTICS_EVENTS` type (already there, just verify after event additions). |

### Files NOT Modified

| File | Reason |
|------|--------|
| `src/lib/dal/*` | DAL stays analytics-agnostic. Errors are already logged via `logError` which goes through transports. |
| `supabase/migrations/*` | No database changes. |
| `src/lib/supabase/*` | Supabase client setup is unrelated to analytics. The `ensureServerTransport()` call in `server.ts` remains as-is. |
| `middleware.ts` | Middleware stays lightweight. No analytics in the hot path. |

---

## 14. Implementation Order

The changes should be implemented in this order to minimize broken intermediate states:

### Phase 1: Foundation (can be done in parallel)

1. **PII sanitize module** (`sanitize.ts` + tests) -- no dependencies, pure utility.
2. **Firebase client module** (`firebase/client.ts` + mock) -- standalone, no integration yet.
3. **Logger enhancement** (`logInfo`, JSON output, PII sanitization) -- extends existing module.
4. **PostHog event catalog additions** (`events.ts`) -- just adding constants.

### Phase 2: Core Integration

5. **Unified analytics layer** (`analytics/index.ts`, `adapters.ts`) -- depends on Phase 1.
6. **PostHog transport fix** (userId correlation) -- independent but logically related.
7. **PostHog server shutdown** -- one-line addition.
8. **PostHog provider fixes** (dedup guard, global error handlers) -- depends on analytics layer.

### Phase 3: Migration

9. **Migrate all direct PostHog calls to unified layer** -- error boundaries, components, server actions. This is the bulk of the file changes (items 20-35 in the change plan).
10. **PII fixes** (identify hook, auth.ts email leak, onboarding.ts display_name).

### Phase 4: New Capabilities

11. **Performance monitoring** (web-vitals, page load, server timing).
12. **CSP updates** (`next.config.ts`).
13. **Environment variable docs** (`.env.*.example` files).
14. **Test infrastructure** (Vitest + Storybook mocks).

### Phase 5: Verification

15. **Install dependencies** (`firebase`, `web-vitals`).
16. **Run full build** to verify no SSR/bundle issues.
17. **Run existing tests** to verify no regressions.
18. **Manual verification** with PostHog and Firebase dashboards (documented in setup guide, separate deliverable).

---

## Appendix: Decision Log

| Decision | Rationale |
|----------|-----------|
| No React provider for Firebase | Firebase Analytics is accessed only through the unified layer. No component needs direct access. A getter function is simpler. |
| `fetch` in `global-error.tsx` instead of PostHog SDK | The SDK may be the cause of the crash. Raw fetch has zero dependencies on the rest of the app. |
| SHA-256 for pre-auth magic link events | Consistent, opaque, deterministic. Allows PostHog to correlate pre-auth and post-auth events for the same user without exposing the email. |
| `withTiming` as opt-in, not automatic | Most server actions are fast. Wrapping all of them adds noise. Start with the 3 most latency-sensitive and expand based on data. |
| `web-vitals` dynamically imported | Keeps it out of the critical rendering path. ~1.5KB is small but there is no reason to block first paint. |
| No `logDebug` function | Requirements only call for `logInfo`. Debug-level logging is covered by `ENABLE_DEBUG_LOGS` gating on the existing functions. Adding `logDebug` would be YAGNI. |
| Firebase event names match PostHog | Same snake_case event names in both platforms. No mapping table needed. Simplifies dashboard configuration and reduces cognitive overhead. |
| Dynamic `import()` for Firebase in adapters | Firebase Analytics is client-only. Dynamic import ensures it never gets pulled into server-side bundles by Next.js. |
