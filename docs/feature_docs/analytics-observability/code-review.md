# Code Review: Analytics & Observability

**Reviewer**: PSE Agent (Code Review Mode)
**Date**: 2026-03-29
**Branch**: `feature/analytics-observability`
**Status**: Changes unstaged (not yet committed)

---

## Summary

The changeset introduces a unified analytics layer, Firebase Analytics integration, PII sanitization, enhanced error tracking, structured logging improvements, and performance monitoring (Web Vitals, page load timing, server action timing). It modifies 28 existing files and adds 8 new files.

**Overall assessment**: Solid architecture with clean separation of concerns. The PII fixes are correct and the unified analytics layer is well-designed. However, there are several issues that must be addressed before merge, most notably a missing Firebase PII prevention configuration (FR-010), a dead import in `adapters.ts`, a page view tracking regression when PostHog is unavailable, and `server-timing.ts` bypassing the unified analytics layer.

---

## Files Reviewed

### New Files
- `web-app/src/lib/analytics/sanitize.ts`
- `web-app/src/lib/analytics/index.ts`
- `web-app/src/lib/analytics/adapters.ts`
- `web-app/src/lib/analytics/web-vitals.ts`
- `web-app/src/lib/analytics/server-timing.ts`
- `web-app/src/lib/analytics/error-handler.ts`
- `web-app/src/lib/firebase/client.ts`
- `web-app/src/__mocks__/handlers/firebase-client.ts`

### Modified Files
- `web-app/.env.local.example`
- `web-app/.env.production.example`
- `web-app/.storybook/main.ts`
- `web-app/next.config.ts`
- `web-app/package.json`
- `web-app/package-lock.json`
- `web-app/src/app/auth/callback/route.ts`
- `web-app/src/app/error.tsx`
- `web-app/src/app/global-error.tsx`
- `web-app/src/app/group/[groupId]/error.tsx`
- `web-app/src/components/group/invite-link.tsx`
- `web-app/src/components/layout/notification-bell.tsx`
- `web-app/src/components/prediction/prediction-form.tsx`
- `web-app/src/components/shared/posthog-provider.tsx`
- `web-app/src/hooks/use-posthog-identify.ts`
- `web-app/src/lib/actions/admin.ts`
- `web-app/src/lib/actions/auth.ts`
- `web-app/src/lib/actions/groups.ts`
- `web-app/src/lib/actions/notifications.ts`
- `web-app/src/lib/actions/onboarding.ts`
- `web-app/src/lib/actions/predictions.ts`
- `web-app/src/lib/actions/scenarios.ts`
- `web-app/src/lib/logger.ts`
- `web-app/src/lib/posthog/events.ts`
- `web-app/src/lib/posthog/index.ts`
- `web-app/src/lib/posthog/server.ts`
- `web-app/src/lib/posthog/transport.ts`
- `web-app/src/test/setup.ts`

---

## Findings

### BLOCKER: Missing Firebase PII Prevention Configuration (FR-010)

**File**: `web-app/src/lib/firebase/client.ts`
**Severity**: BLOCKER

The requirements (FR-010) and technical architecture explicitly mandate disabling Google Signals and ad personalization:

> Firebase config includes `{ allow_google_signals: false, allow_ad_personalization_signals: false, send_page_view: false }`

The implementation calls `getAnalytics(app)` but never configures these privacy settings. The technical architecture document (section 3, "Firebase Config: PII Prevention") describes applying `allow_google_signals: false`, `allow_ad_personalization_signals: false`, and `send_page_view: false` after initialization, but the actual code does not implement this.

Firebase Analytics with default settings will collect Google Signals data (demographics, interests) and allow ad personalization, which contradicts the no-PII requirement.

**Fix required**: After `getAnalytics(app)`, call the Firebase gtag config or use `setConsent()` to disable these features. Example:

```typescript
import { getAnalytics, setAnalyticsCollectionEnabled } from "firebase/analytics";

analytics = getAnalytics(app);

// Disable PII-adjacent collection per FR-010
window.gtag?.("config", measurementId, {
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
  send_page_view: false,
});
```

---

### BLOCKER: Page View Tracking Gated on PostHog Availability

**File**: `web-app/src/components/shared/posthog-provider.tsx`, lines 35-57
**Severity**: BLOCKER

The page view tracking `useEffect` still has an early return when PostHog is unavailable:

```typescript
useEffect(() => {
  const posthog = getPostHogClient();
  if (!posthog) return;  // <-- If PostHog is blocked/unconfigured, Firebase also gets no page views
  // ...
  trackPageView(url);  // This sends to BOTH PostHog and Firebase
}, [pathname, searchParams]);
```

If PostHog is blocked by an ad blocker or `NEXT_PUBLIC_POSTHOG_KEY` is unset, `getPostHogClient()` returns `null`, and the entire effect short-circuits. This means Firebase Analytics will also receive zero page views, violating FR-012 (independent platform failure handling) and FR-014 (page view tracking on both platforms).

**Fix required**: Decouple the PostHog opt-out logic from the page view dispatch. The `trackPageView()` call should always execute (it handles null PostHog internally), and the PostHog opt-in/opt-out logic should be separate.

---

### BLOCKER: `server-timing.ts` Bypasses Unified Analytics Layer

**File**: `web-app/src/lib/analytics/server-timing.ts`, line 13
**Severity**: BLOCKER

The `withTiming` function directly imports and calls `captureServerEvent` from `@/lib/posthog/server` instead of using `trackServerEvent` from the unified analytics layer:

```typescript
import { captureServerEvent } from "@/lib/posthog/server";
// ...
captureServerEvent("system", ANALYTICS_EVENTS.SERVER_ACTION_DURATION, { ... });
```

This bypasses the PII sanitization in `trackServerEvent()`. While the current properties (`action_name`, `duration_ms`, `success`) contain no PII, this sets a bad precedent and violates FR-011 which states "All event tracking in the app must go through this layer -- no direct PostHog or Firebase calls from components or actions."

**Fix required**: Replace with `import { trackServerEvent } from "@/lib/analytics"` and call `trackServerEvent("system", ...)` instead.

---

### WARNING: Unused Import in `adapters.ts`

**File**: `web-app/src/lib/analytics/adapters.ts`, line 6
**Severity**: WARNING

`sanitizeProperties` is imported but never used in this file. Sanitization is performed in `index.ts` before calling the adapters. This is dead code.

```typescript
import { sanitizeProperties } from "./sanitize"; // <-- never used
```

**Fix**: Remove the unused import.

---

### WARNING: `require()` Usage in Client-Side Unified Layer

**Files**: `web-app/src/lib/analytics/index.ts` (lines 82, 101), `web-app/src/lib/analytics/adapters.ts` (lines 18, 36)
**Severity**: WARNING

The code uses `require()` with eslint-disable comments in four places to avoid bundling posthog-js/posthog-node in the wrong environment. While this works, it has several downsides:

1. `require()` is not type-checked by TypeScript (returns `any`).
2. The eslint-disable comments indicate this is fighting the tooling rather than working with it.
3. The `adapters.ts` file already uses `await import()` for Firebase -- inconsistent approach.

The `identifyUser()` and `resetUser()` functions in `index.ts` duplicate the PostHog client access pattern that already exists in `adapters.ts`. Consider routing these through adapter functions as well.

**Recommendation**: Use dynamic `import()` consistently (as done for Firebase) or extract all PostHog client access into the adapters module.

---

### WARNING: `logInfo` Metadata in `createGroup` Logs User Input

**File**: `web-app/src/lib/actions/groups.ts`, line 14
**Severity**: WARNING

```typescript
logInfo({ layer: "action", operation: "createGroup", metadata: { name } });
```

The `name` parameter is the group name provided by the user. While a group name is not strictly PII as defined in the requirements (not email, display_name, etc.), it could contain PII if a user names their group after themselves or includes personal information. The sanitizer will not catch this because `name` is not in the PII_FIELDS set.

This is a judgment call -- logging user-provided free-text metadata has inherent risk. Consider logging only that the action was called, without the group name, or accepting this risk with documentation.

**Similar instances**: `joinGroup` logs `inviteCode` in metadata. This is lower risk (invite codes are opaque), but still user-provided data going into logs.

---

### WARNING: `global-error.tsx` Uses Hardcoded PostHog Host

**File**: `web-app/src/app/global-error.tsx`, line 21
**Severity**: WARNING

The fetch URL is hardcoded to `https://us.i.posthog.com/capture/`:

```typescript
fetch("https://us.i.posthog.com/capture/", { ... })
```

The technical architecture acknowledges this is intentional (global-error cannot rely on the SDK), but the codebase uses `NEXT_PUBLIC_POSTHOG_HOST` elsewhere to configure the PostHog host. If the project is on the EU instance, this would send to the wrong region.

**Recommendation**: Use `process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"` for the fetch URL to stay consistent with the app's configuration.

---

### WARNING: `global-error.tsx` Missing `distinctId` in PostHog Payload

**File**: `web-app/src/app/global-error.tsx`, lines 24-35
**Severity**: WARNING

The raw `fetch` call to PostHog's capture endpoint does not include a `distinct_id` field:

```typescript
body: JSON.stringify({
  api_key: key,
  event: "error_boundary_caught",
  properties: { ... },
  timestamp: new Date().toISOString(),
}),
```

PostHog's `/capture/` API requires `distinct_id` as a top-level field (or inside `properties.$distinct_id`). Without it, the event may be rejected or assigned to an arbitrary ID by PostHog. The technical architecture does not specify this, but PostHog's API documentation is clear on this requirement.

**Fix**: Add `distinct_id: "anonymous"` to the payload body (or read it from the PostHog cookie if available).

---

### WARNING: `web-vitals.ts` Nested Dynamic Import Creates Waterfall

**File**: `web-app/src/lib/analytics/web-vitals.ts`, lines 22-37
**Severity**: WARNING

The `sendMetric` callback performs a dynamic import of `./index` on every metric callback:

```typescript
const sendMetric = (metric: Metric) => {
  import("./index").then(({ trackEvent, ANALYTICS_EVENTS }) => {
    // ...
  });
};
```

This means each Web Vital report triggers a dynamic import. While module-level caching means only the first import is expensive, the `.then()` chaining pattern creates unnecessary microtask delays for each metric. More importantly, if the `web-vitals` callbacks fire before the analytics module is loaded, metrics could be lost if the import fails silently.

**Recommendation**: Import `trackEvent` and `ANALYTICS_EVENTS` at the top of `sendMetric` by hoisting the import outside the callback, or resolve the import once at the outer scope.

---

### WARNING: `error-handler.ts` -- `window.onerror` Overwrite Risk

**File**: `web-app/src/lib/analytics/error-handler.ts`, lines 39, 58
**Severity**: WARNING

`registerGlobalErrorHandlers()` directly assigns `window.onerror` and `window.onunhandledrejection`, which overwrites any previously registered handlers. If another library (or a future feature) sets its own `window.onerror`, one will clobber the other.

```typescript
window.onerror = (message, source, lineno, colno, error) => { ... };
window.onunhandledrejection = (event) => { ... };
```

**Recommendation**: Use `addEventListener("error", ...)` and `addEventListener("unhandledrejection", ...)` instead, which support multiple listeners without overwriting.

---

### WARNING: `logger.ts` Development Output Bug -- Fallback Passes Unsanitized Metadata

**File**: `web-app/src/lib/logger.ts`, lines 112-117
**Severity**: WARNING

In the development output branch, when `devData` is empty (no metadata after sanitization and no error), the fallback passes the raw, unsanitized `context.metadata`:

```typescript
if (Object.keys(devData).length > 0) {
  consoleFn(message, devData);
} else {
  consoleFn(message, context.metadata);  // <-- unsanitized!
}
```

This scenario occurs when `context.metadata` exists but every field in it is a PII field (all stripped by sanitization). In that case, `devData` would be empty (length 0), and the fallback would log the raw metadata with PII fields intact. This contradicts FR-025.

**Fix**: When `devData` is empty and `context.metadata` exists, log `message` alone or log `devData` (the empty object) instead of falling back to the raw metadata.

---

### WARNING: `env.ts` Not Updated with Firebase Variables

**File**: `web-app/src/lib/env.ts`
**Severity**: WARNING

FR-008 requires adding Firebase environment variables to env configuration. The `.env.local.example` and `.env.production.example` files are updated, but `env.ts` (the runtime validation module) is not modified. Firebase env vars are read directly via `process.env.NEXT_PUBLIC_FIREBASE_*` in `firebase/client.ts`.

While Firebase variables are intentionally optional (the app works without them), adding them to `env.ts` with `optional()` calls would provide consistency with the existing pattern and give developers a single source of truth for all environment variables.

---

### WARNING: `posthog-provider.tsx` Calls `registerGlobalErrorHandlers()` on Every Re-mount

**File**: `web-app/src/components/shared/posthog-provider.tsx`, line 29
**Severity**: WARNING

```typescript
useEffect(() => {
  getPostHogClient();
  if (!clientTransportRegistered) {
    registerTransport(createPostHogTransport());
    clientTransportRegistered = true;
  }
  registerGlobalErrorHandlers();  // <-- no dedup guard
  reportWebVitals();              // <-- no dedup guard
  reportPageLoadTime();           // <-- no dedup guard
}, []);
```

The transport registration has a dedup guard (`clientTransportRegistered`), but `registerGlobalErrorHandlers()`, `reportWebVitals()`, and `reportPageLoadTime()` do not. In development with React Strict Mode (double-mount), these will execute twice:

- `registerGlobalErrorHandlers()` overwrites `window.onerror` twice (harmless but wasteful, and worse if switched to `addEventListener` per the suggestion above).
- `reportWebVitals()` will register duplicate callbacks for `onLCP`, `onINP`, `onCLS`, causing metrics to be reported twice.
- `reportPageLoadTime()` will add duplicate `load` event listeners (though `{ once: true }` prevents the listener from firing twice, `setTimeout(report, 0)` will fire twice if `document.readyState === "complete"` on both calls).

**Recommendation**: Add module-level dedup guards for all three functions, similar to `clientTransportRegistered`.

---

### SUGGESTION: `sanitizeProperties` Does Not Handle Nested Objects

**File**: `web-app/src/lib/analytics/sanitize.ts`
**Severity**: SUGGESTION

The sanitizer only strips PII from top-level keys. If a nested object contains PII (e.g., `{ user: { email: "..." } }`), it will pass through unfiltered.

The current codebase does not pass nested objects to analytics events, so this is not an active risk. However, as the codebase grows, a developer might add a nested property that contains PII without realizing the sanitizer only works one level deep.

**Recommendation**: Add a comment documenting this limitation, or implement recursive sanitization for defense-in-depth.

---

### SUGGESTION: `adapters.ts` -- Firebase Adapter Does Not Enforce Event Name Limits

**File**: `web-app/src/lib/analytics/adapters.ts`, lines 45-58
**Severity**: SUGGESTION

The technical architecture notes that Firebase has a 40-character limit for event names. The adapter passes event names through without validation. Current events are all well under 40 characters, but there is no runtime guard.

**Recommendation**: Add a `slice(0, 40)` or a development-only warning when event names exceed 40 characters.

---

### SUGGESTION: `withTiming` Not Actually Used Anywhere

**File**: `web-app/src/lib/analytics/server-timing.ts`
**Severity**: SUGGESTION

The `withTiming` higher-order function is defined but not applied to any server action in this changeset. The `logInfo` calls are added to actions, but no action is wrapped with `withTiming`. This means FR-022 (server action timing instrumentation) is implemented but not integrated.

The technical architecture suggests wrapping actions like:
```typescript
export const submitPredictions = withTiming("submitPredictions", async (...) => { ... });
```

But no action has been wrapped. This is dead code until integrated.

**Recommendation**: Either wrap at least one action with `withTiming` to demonstrate the pattern, or document this as a follow-up task.

---

### SUGGESTION: `PREDICT_PAGE_VIEWED` and `PREDICT_PAGE_REVISITED` Events Defined but Not Tracked

**File**: `web-app/src/lib/posthog/events.ts`
**Severity**: SUGGESTION

Event constants `PREDICT_PAGE_VIEWED` and `PREDICT_PAGE_REVISITED` are added (FR-017) but no code in the changeset actually tracks these events. The predict page components are not modified to emit these events.

**Recommendation**: Either add tracking to the predict page or document these as placeholders for a follow-up task.

---

### SUGGESTION: `created_at` Property Uses `accepted_terms_at` Field

**File**: `web-app/src/hooks/use-posthog-identify.ts`, line 22
**Severity**: SUGGESTION

```typescript
identifyUser(user.id, {
  onboarding_completed: profile?.onboarding_completed ?? false,
  created_at: profile?.accepted_terms_at ?? undefined,
});
```

The property `created_at` is populated from `accepted_terms_at`. These are semantically different -- `created_at` implies account creation time, while `accepted_terms_at` is when the user completed onboarding (which could be later). This could confuse analysts looking at the data.

**Recommendation**: Either rename the property to `accepted_terms_at` for accuracy, or add a comment explaining the mapping.

---

## PII Safety Audit

### Verified Clean

| Location | Status | Notes |
|----------|--------|-------|
| `use-posthog-identify.ts` | CLEAN | `email` and `display_name` removed from person properties. Only `onboarding_completed` and `created_at` remain. |
| `actions/auth.ts` (signInWithMagicLink) | CLEAN | Email no longer used as `distinctId`. SHA-256 hash used instead. Email removed from `logError` metadata. |
| `actions/onboarding.ts` | CLEAN | `display_name` removed from `AUTH_ONBOARDING_COMPLETED` event properties. |
| `sanitize.ts` | CLEAN | All 10 PII fields defined and stripped. Correct set: email, display_name, displayName, date_of_birth, dateOfBirth, phone, ip, ip_address, user_agent, user_agent_full. |
| `logger.ts` | CLEAN | `sanitizeProperties()` applied to metadata in both production (JSON) and development output paths. (With caveat noted in WARNING about the fallback branch.) |
| `global-error.tsx` | CLEAN | Only sends error_message, error_digest, error_stack, error_context, $current_url. No user data. |
| Error boundaries (`error.tsx`, `group/.../error.tsx`) | CLEAN | Only error metadata, no user identifiers. |
| `error-handler.ts` | CLEAN | Only error/stack/source information. No user data. |
| `web-vitals.ts` | CLEAN | Only metric values, ratings, and page paths. |
| `server-timing.ts` | CLEAN | Only action_name, duration_ms, success. |
| All server actions | CLEAN | `trackServerEvent` is used everywhere. PII sanitization is applied by the unified layer. |
| All client components | CLEAN | `trackEvent` is used everywhere. PII sanitization is applied by the unified layer. |

### Residual Risk

| Location | Risk | Severity |
|----------|------|----------|
| Firebase `getAnalytics()` default settings | Google Signals enabled by default -- could collect demographic PII at the platform level | BLOCKER (see finding above) |
| `logger.ts` development fallback | Raw metadata logged when all fields are PII | WARNING (see finding above) |
| `createGroup` logInfo | Group name (user-provided free text) in log metadata | LOW |

---

## Requirement Coverage Matrix

| Requirement | Status | Notes |
|-------------|--------|-------|
| FR-001: Audit PostHog | PARTIAL | No audit document/checklist produced, but integration is verified functional by code inspection. |
| FR-002: Fix PII in identify | DONE | email and display_name removed. |
| FR-003: Fix PII in magic link | DONE | SHA-256 hash used instead of raw email. |
| FR-004: Document proxy | DEFERRED | Documented in setup-guide.md (not part of code review scope). |
| FR-005: Verify CSP for PostHog | DONE | CSP already had PostHog domains; no changes needed. |
| FR-006: Add Firebase SDK | DONE | `firebase` added to package.json, lazy init in `firebase/client.ts`. |
| FR-007: Firebase graceful no-op | DONE | Returns null when env vars missing, SSR guard, try/catch. |
| FR-008: Firebase env vars | PARTIAL | Added to `.env.*.example` but NOT to `env.ts`. |
| FR-009: CSP for Firebase | DONE | script-src and connect-src updated for Google Analytics/GTM domains. |
| FR-010: Firebase PII prevention | NOT DONE | `allow_google_signals`, `allow_ad_personalization_signals`, `send_page_view` not configured. |
| FR-011: Unified analytics layer | DONE | `lib/analytics/` module created with `trackEvent`, `trackPageView`, `trackServerEvent`. |
| FR-012: Independent failure handling | PARTIAL | Each adapter has try/catch, but page view tracking is gated on PostHog (see BLOCKER). |
| FR-013: PII sanitization | DONE | `sanitizeProperties()` applied in analytics layer and logger. |
| FR-014: Page view tracking | PARTIAL | `trackPageView()` sends to both platforms, but gated on PostHog availability (see BLOCKER). |
| FR-015: Feature adoption tracking | NOT DONE | No `first_time` properties or `$set_once` calls added. |
| FR-016: Session metrics | DONE | PostHog `capture_pageleave: true` (pre-existing). Firebase session_start is automatic. |
| FR-017: Prediction funnel events | PARTIAL | Event constants defined but not tracked in predict page components. |
| FR-018: Group interaction patterns | NOT DONE | No group sub-page tracking with `group_id` property added. |
| FR-020: Core Web Vitals | DONE | `web-vitals` added, `reportWebVitals()` captures LCP/INP/CLS. |
| FR-021: Page load timing | DONE | `reportPageLoadTime()` uses Navigation Timing API. |
| FR-022: Server action timing | PARTIAL | `withTiming` function exists but is not applied to any action. |
| FR-023: Add `logInfo` | DONE | `logInfo()` function added to logger. |
| FR-024: Structured JSON in production | DONE | `output()` function produces JSON when `NODE_ENV === "production"`. |
| FR-025: PII sanitizer for logger | DONE | `sanitizeProperties()` applied in logger `output()`. (With fallback bug noted.) |
| FR-026: Structured logging in actions | DONE | `logInfo` calls added to all 7 server action files. |
| FR-027: Error boundary reporting | DONE | All three error boundaries (`global-error.tsx`, `error.tsx`, `group/.../error.tsx`) report to analytics. |
| FR-028: Global error handlers | DONE | `registerGlobalErrorHandlers()` captures `window.onerror` and `window.onunhandledrejection` with dedup. |
| FR-029: Server action failure tracking | PARTIAL | `logError` on failures already existed. `logInfo` on entry is new. But no categorization of expected vs unexpected failures. |
| FR-030: DAL error coverage | NOT DONE | No DAL files were modified. (The codebase analysis noted existing DAL logging is consistent, so this may be acceptable.) |

---

## Test Compatibility

Existing tests were run with `npx vitest run`. **9 test files failed with 31 failing tests**. However, the exact same failures occur on the `main` branch (verified by stashing changes and running tests). These are pre-existing test failures unrelated to this changeset.

Test infrastructure updates:
- Firebase mocks added to `test/setup.ts` (firebase/app, firebase/analytics, web-vitals) -- correct.
- Firebase Storybook mock added in `__mocks__/handlers/firebase-client.ts` -- correct.
- Storybook config updated with Firebase alias and env vars -- correct.

---

## Blocker Summary (Must Fix Before Merge)

1. **Firebase PII prevention not configured** (FR-010): `allow_google_signals: false`, `allow_ad_personalization_signals: false`, `send_page_view: false` must be set after `getAnalytics()`.

2. **Page view tracking gated on PostHog**: `posthog-provider.tsx` early-returns from the page view effect when PostHog is null, blocking Firebase page views too. Decouple the PostHog opt-out logic from the `trackPageView()` call.

3. **`server-timing.ts` bypasses unified analytics layer**: Directly imports `captureServerEvent` from `@/lib/posthog/server` instead of using `trackServerEvent` from the analytics layer. Violates FR-011.

---

## Warning Summary (Should Fix)

1. Unused `sanitizeProperties` import in `adapters.ts`.
2. Inconsistent `require()` vs `import()` pattern in the analytics layer.
3. `createGroup` logInfo logs user-provided group name.
4. `global-error.tsx` hardcodes PostHog host URL.
5. `global-error.tsx` missing `distinct_id` in PostHog API payload.
6. `web-vitals.ts` nested dynamic import creates unnecessary waterfall.
7. `error-handler.ts` overwrites `window.onerror` instead of using `addEventListener`.
8. `logger.ts` development fallback passes unsanitized metadata.
9. `env.ts` not updated with Firebase variables.
10. `registerGlobalErrorHandlers()`, `reportWebVitals()`, `reportPageLoadTime()` lack dedup guards; will double-execute in React Strict Mode.
