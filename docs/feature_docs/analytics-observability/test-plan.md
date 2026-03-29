# Test Plan: Analytics & Observability
**QA Engineer**: QA Agent
**Date**: 2026-03-29
**Requirements Doc Version**: Draft, 2026-03-29
**Technical Architecture Version**: Draft, 2026-03-29

---

## 1. Test Scope

### In Scope

- PII sanitization layer (`sanitizeProperties`, `hashIdentifier`) -- all known PII fields stripped, passthrough of safe fields
- Firebase Analytics initialization -- lazy loading, graceful no-op when env vars missing, `isSupported` check
- Unified analytics abstraction layer -- `trackEvent`, `trackPageView`, `trackServerEvent`, `identifyUser`, `resetUser`
- PostHog fixes -- `global-error.tsx` tracking, server transport user correlation, transport dedup guard
- Performance monitoring -- Web Vitals reporting, page load timing, server action timing (`withTiming`)
- Error tracking -- global `window.onerror` / `window.onunhandledrejection`, error boundary integration, dedup guard
- Logger enhancements -- `logInfo` function, structured JSON output in production, PII filtering in metadata
- Bundle size impact -- Firebase SDK dynamic import, `web-vitals` dynamic import, tree-shaking verification
- CSP headers -- Firebase/Google Analytics domains added correctly
- Migration of all direct PostHog calls to unified analytics layer
- Existing functionality regression -- page views, event capture, feature flags, error boundaries, test infrastructure

### Out of Scope

- PostHog dashboard configuration (manual setup documented in setup guide, not code)
- Firebase project creation and console configuration
- Session replay (v2)
- PostHog reverse proxy implementation (v2, documented as recommendation)
- Alerting / PagerDuty integration (v2)
- A/B testing infrastructure (v2)
- Supabase Edge Function logging (Deno runtime, separate infrastructure)

---

## 2. Test Cases

### 2.1 PII Sanitization -- Happy Path

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|--------------------------------------------------------|--------------------------------------------------------------|
| TC-001 | `sanitizeProperties` strips email | Call `sanitizeProperties({ email: "a@b.com", group_id: "abc" })` | Returns `{ group_id: "abc" }` only. `email` key absent. |
| TC-002 | `sanitizeProperties` strips display_name | Call with `{ display_name: "Alice", match_id: 5 }` | Returns `{ match_id: 5 }`. |
| TC-003 | `sanitizeProperties` strips displayName (camelCase variant) | Call with `{ displayName: "Alice", success: true }` | Returns `{ success: true }`. |
| TC-004 | `sanitizeProperties` strips date_of_birth | Call with `{ date_of_birth: "1990-01-01", userId: "uuid" }` | Returns `{ userId: "uuid" }`. |
| TC-005 | `sanitizeProperties` strips dateOfBirth (camelCase variant) | Call with `{ dateOfBirth: "1990-01-01", userId: "uuid" }` | Returns `{ userId: "uuid" }`. |
| TC-006 | `sanitizeProperties` strips phone | Call with `{ phone: "+1234567890", group_id: "g1" }` | Returns `{ group_id: "g1" }`. |
| TC-007 | `sanitizeProperties` strips ip | Call with `{ ip: "192.168.1.1", operation: "test" }` | Returns `{ operation: "test" }`. |
| TC-008 | `sanitizeProperties` strips ip_address | Call with `{ ip_address: "10.0.0.1", event: "page" }` | Returns `{ event: "page" }`. |
| TC-009 | `sanitizeProperties` strips user_agent | Call with `{ user_agent: "Mozilla/5.0...", page: "/" }` | Returns `{ page: "/" }`. |
| TC-010 | `sanitizeProperties` strips user_agent_full | Call with `{ user_agent_full: "long string", rating: "good" }` | Returns `{ rating: "good" }`. |
| TC-011 | `sanitizeProperties` passes through safe fields untouched | Call with `{ userId: "uuid", group_id: "g1", match_id: 5, scenario_id: "s1", onboarding_completed: true, created_at: "2026-01-01" }` | All fields returned unchanged. |
| TC-012 | `sanitizeProperties` strips multiple PII fields simultaneously | Call with `{ email: "a@b.com", display_name: "Alice", phone: "+1", group_id: "g1" }` | Returns `{ group_id: "g1" }` only. |
| TC-013 | `sanitizeProperties` does not mutate input object | Call with input object, verify original object still has PII fields after call | Original object unchanged. |
| TC-014 | `sanitizeProperties` handles empty object | Call with `{}` | Returns `{}`. |
| TC-015 | `hashIdentifier` returns consistent SHA-256 hex string | Call `hashIdentifier("test@example.com")` twice | Both calls return the same 64-character hex string. |
| TC-016 | `hashIdentifier` is case-insensitive | Call with `"Test@Example.COM"` and `"test@example.com"` | Both return the same hash. |
| TC-017 | `hashIdentifier` trims whitespace | Call with `" test@example.com "` | Returns same hash as `"test@example.com"`. |
| TC-018 | `hashIdentifier` produces different output for different inputs | Hash `"a@b.com"` and `"c@d.com"` | Different hashes returned. |

### 2.2 Firebase Analytics Initialization

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|--------------------------------------------------------|--------------------------------------------------------------|
| TC-050 | Firebase initializes when all env vars present | Set all 5 `NEXT_PUBLIC_FIREBASE_*` env vars. Call `getFirebaseAnalytics()` in browser context. | Returns non-null `Analytics` instance. `initializeApp` and `getAnalytics` called. |
| TC-051 | Firebase returns null when API key missing | Unset `NEXT_PUBLIC_FIREBASE_API_KEY`. Call `getFirebaseAnalytics()`. | Returns `null`. No Firebase scripts load. No errors thrown. |
| TC-052 | Firebase returns null when project ID missing | Unset `NEXT_PUBLIC_FIREBASE_PROJECT_ID`. Call `getFirebaseAnalytics()`. | Returns `null`. |
| TC-053 | Firebase returns null when app ID missing | Unset `NEXT_PUBLIC_FIREBASE_APP_ID`. Call `getFirebaseAnalytics()`. | Returns `null`. |
| TC-054 | Firebase returns null when measurement ID missing | Unset `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`. Call `getFirebaseAnalytics()`. | Returns `null`. |
| TC-055 | Firebase returns null on server (SSR) | Call `getFirebaseAnalytics()` where `typeof window === "undefined"`. | Returns `null`. No `initializeApp` called. |
| TC-056 | Firebase returns null when `isSupported()` is false | Mock `isSupported()` to return `false`. Call `getFirebaseAnalytics()`. | Returns `null`. `initializeApp` NOT called. |
| TC-057 | Firebase lazy-init only runs once | Call `getFirebaseAnalytics()` three times. | `initializeApp` called exactly once. Subsequent calls return cached instance. |
| TC-058 | Firebase init catches and swallows errors | Mock `initializeApp` to throw. Call `getFirebaseAnalytics()`. | Returns `null`. No error propagated. |
| TC-059 | Firebase PII prevention config applied | Verify Firebase config includes `allow_google_signals: false`, `allow_ad_personalization_signals: false`, `send_page_view: false`. | All three settings applied during initialization. |

### 2.3 Unified Analytics Layer -- Event Dispatch

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|--------------------------------------------------------|--------------------------------------------------------------|
| TC-100 | `trackEvent` dispatches to both PostHog and Firebase (client) | Call `trackEvent("group_created", { group_id: "g1" })` in browser context. | PostHog `capture` called with event + sanitized props. Firebase `logEvent` called with same event + sanitized props. |
| TC-101 | `trackEvent` sanitizes PII before dispatch | Call `trackEvent("test", { email: "a@b.com", group_id: "g1" })`. | Both PostHog and Firebase receive `{ group_id: "g1" }` only. No `email` in either payload. |
| TC-102 | `trackEvent` handles PostHog failure gracefully | Mock PostHog `capture` to throw. Call `trackEvent(...)`. | Firebase still receives the event. No error propagated to caller. `logWarn` called. |
| TC-103 | `trackEvent` handles Firebase failure gracefully | Mock Firebase `logEvent` to throw. Call `trackEvent(...)`. | PostHog still receives the event. No error propagated to caller. `logWarn` called. |
| TC-104 | `trackEvent` handles both platforms failing | Mock both to throw. Call `trackEvent(...)`. | No error propagated. App continues normally. |
| TC-105 | `trackPageView` sends to both platforms | Call `trackPageView("/dashboard")`. | PostHog receives `$pageview` with `$current_url`. Firebase receives `page_view`. |
| TC-106 | `trackServerEvent` dispatches to PostHog only (server) | Call `trackServerEvent("user-uuid", "event", { key: "val" })`. | PostHog `captureServerEvent` called with userId, event, sanitized props. Firebase NOT called (server-side). |
| TC-107 | `trackServerEvent` sanitizes PII | Call `trackServerEvent("uid", "test", { email: "a@b.com", match_id: 5 })`. | PostHog receives `{ match_id: 5 }`. No `email`. |
| TC-108 | `identifyUser` sends to both PostHog and Firebase | Call `identifyUser("uuid", { onboarding_completed: true, created_at: "2026-01-01" })`. | PostHog `identify` called. Firebase `setUserId` called. |
| TC-109 | `identifyUser` strips PII from traits | Call `identifyUser("uuid", { email: "a@b.com", onboarding_completed: true })`. | Traits sent to PostHog and Firebase have `onboarding_completed` but NOT `email`. |
| TC-110 | `resetUser` resets both platforms | Call `resetUser()`. | PostHog `reset()` called. Firebase user ID set to null or cleared. |
| TC-111 | `trackEvent` with no properties | Call `trackEvent("auth_signed_out")`. | Both platforms receive the event with empty/undefined properties. No crash. |
| TC-112 | Firebase event name mapping for $pageview | `trackPageView` dispatches to Firebase with `page_view` (not `$pageview`). | Firebase receives `page_view` (GA4 built-in event name). |

### 2.4 PostHog Fixes

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|--------------------------------------------------------|--------------------------------------------------------------|
| TC-150 | `global-error.tsx` sends error via raw fetch | Trigger a root layout error that renders `global-error.tsx`. | `fetch` called to `https://us.i.posthog.com/capture/` with `error_boundary_caught` event, including `error_message`, `error_digest`, `error_stack` (truncated to 1000), `error_context: "global"`, `$current_url`. |
| TC-151 | `global-error.tsx` survives when PostHog key is missing | Render `global-error.tsx` with `NEXT_PUBLIC_POSTHOG_KEY` unset. | No fetch attempt. No error thrown. UI still renders. |
| TC-152 | `global-error.tsx` swallows fetch failures | Mock `fetch` to reject. Render `global-error.tsx`. | No error propagated. UI renders normally. Error boundary never re-throws. |
| TC-153 | Server transport uses userId from metadata | Call `logError({ layer: "action", operation: "test", metadata: { userId: "user-uuid-123" } }, error)` on server. | PostHog server `capture` called with `distinctId: "user-uuid-123"` (not `"system"`). |
| TC-154 | Server transport falls back to "system" when no userId | Call `logError({ layer: "dal", operation: "test", metadata: { groupId: "g1" } }, error)` on server. | PostHog server `capture` called with `distinctId: "system"`. |
| TC-155 | Transport dedup guard prevents double registration | Call `PostHogProvider` mount effect twice (simulating HMR). | `registerTransport` called only once. `_transports` array has exactly one PostHog transport. |
| TC-156 | `shutdownPostHog` flushes and nulls the singleton | Call `shutdownPostHog()`. Then call `getPostHogServer()`. | First call triggers `shutdown()`. Second call creates a fresh instance. |
| TC-157 | `shutdownPostHog` is safe to call multiple times | Call `shutdownPostHog()` three times. | No error. Second and third calls are no-ops. |

### 2.5 PII Leak Fixes (Specific to Existing Code)

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|--------------------------------------------------------|--------------------------------------------------------------|
| TC-170 | `usePostHogIdentify` no longer sends email | Render header with authenticated user. Inspect PostHog `identify` call args. | `identify(userId, { onboarding_completed, created_at })` only. No `email`, no `display_name`. |
| TC-171 | `signInWithMagicLink` no longer uses raw email as distinctId | Call `signInWithMagicLink("test@example.com")`. | `trackServerEvent` called with a SHA-256 hashed identifier as distinctId (64-char hex string), NOT raw email. |
| TC-172 | `signInWithMagicLink` logError no longer includes email in metadata | Call `signInWithMagicLink` with an error path. Inspect `logError` call. | Metadata does NOT contain `email` key. (The sanitizer also catches this as defense-in-depth.) |
| TC-173 | `completeOnboarding` no longer sends display_name in event | Call `completeOnboarding`. Inspect `trackServerEvent` call for `AUTH_ONBOARDING_COMPLETED`. | Event properties do NOT contain `display_name`. |
| TC-174 | Auth callback no longer uses "anonymous" as distinctId | Trigger auth callback failure path. | `trackServerEvent` uses a hashed/opaque identifier or omits the server event entirely. No literal `"anonymous"` as distinctId. |

### 2.6 Performance Monitoring

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|--------------------------------------------------------|--------------------------------------------------------------|
| TC-200 | Web Vitals LCP reported | Mock `web-vitals` `onLCP` to fire callback with metric `{ name: "LCP", value: 2500, rating: "needs-improvement", navigationType: "navigate" }`. | `trackEvent("web_vitals_lcp", { value: 2500, rating: "needs-improvement", page_path: "/...", navigation_type: "navigate" })` called. |
| TC-201 | Web Vitals INP reported | Mock `onINP` to fire. | `trackEvent("web_vitals_inp", ...)` called with `value`, `rating`, `page_path`, `navigation_type`. |
| TC-202 | Web Vitals CLS reported | Mock `onCLS` to fire. | `trackEvent("web_vitals_cls", ...)` called. |
| TC-203 | `reportWebVitals` gracefully handles import failure | Mock `import("web-vitals")` to reject. | No error thrown. Silent no-op. |
| TC-204 | Page load time reported after full load | Mock `PerformanceNavigationTiming` entry with known values. | `trackEvent("page_load_time", { dom_content_loaded_ms, full_load_ms, page_path })` called with rounded integer values. |
| TC-205 | Page load time skipped on empty perf entries | Mock `performance.getEntriesByType("navigation")` to return `[]`. | No event dispatched. No error. |
| TC-206 | `withTiming` measures action duration | Wrap a mock async function that takes 100ms. | `captureServerEvent` called with `server_action_duration`, `action_name`, `duration_ms: ~100`, `success: true`. |
| TC-207 | `withTiming` reports failure when action returns `{ success: false }` | Wrap action returning `{ success: false, error: "validation" }`. | Event has `success: false`. |
| TC-208 | `withTiming` reports failure when action throws | Wrap action that throws an Error. | Event has `success: false`. Error is re-thrown to caller. |
| TC-209 | `withTiming` logs warning for slow actions (>3000ms) | Wrap an action taking 4000ms. | `logWarn` called with `Slow server action: 4000ms`. |
| TC-210 | `withTiming` does not log warning for fast actions | Wrap an action taking 50ms. | `logWarn` NOT called. |

### 2.7 Error Tracking

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|--------------------------------------------------------|--------------------------------------------------------------|
| TC-250 | `app/error.tsx` sends error through unified analytics layer | Trigger a route-level error. | `trackEvent("error_boundary_caught", { error_message, error_digest, error_stack (<=1000 chars), error_context: "app", page_path })` called. |
| TC-251 | `app/group/[groupId]/error.tsx` includes group context | Trigger error in a group route. | Event has `error_context: "group"` and `page_path`. |
| TC-252 | Global `window.onerror` captures unhandled errors | Dispatch `window.onerror("msg", "file.js", 10, 5, new Error("test"))`. | `trackEvent("unhandled_error", { error_message: "msg", error_source: "file.js", error_line: 10, error_col: 5, error_stack: ..., is_unhandled_rejection: false, page_path })` called. |
| TC-253 | Global `window.onunhandledrejection` captures promise rejections | Dispatch `unhandledrejection` event with `reason: new Error("async fail")`. | `trackEvent("unhandled_error", { error_message: "async fail", error_stack: ..., is_unhandled_rejection: true, page_path })` called. |
| TC-254 | Error dedup: same error within 5s not reported twice | Fire `window.onerror("same msg", "same source", ...)` twice within 1 second. | `trackEvent` called exactly once for that error. |
| TC-255 | Error dedup: same error after 5s IS reported again | Fire error, wait >5 seconds, fire same error again. | `trackEvent` called twice (dedup window expired). |
| TC-256 | Error dedup: different errors within 5s both reported | Fire two distinct errors within 1 second. | `trackEvent` called twice. |
| TC-257 | `window.onerror` truncates long error messages | Fire error with message > 500 chars. | `error_message` property is truncated to 500 chars. |
| TC-258 | `window.onerror` truncates long stack traces | Fire error with stack > 1000 chars. | `error_stack` property is truncated to 1000 chars. |
| TC-259 | `window.onunhandledrejection` handles non-Error reason | Dispatch rejection with `reason: "string error"`. | `error_message` is `"string error"`. `error_stack` is undefined. No crash. |
| TC-260 | Error handler is SSR-safe | Call `registerGlobalErrorHandlers()` in server context (`typeof window === "undefined"`). | No-op. No error. |

### 2.8 Logger Enhancements

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|--------------------------------------------------------|--------------------------------------------------------------|
| TC-300 | `logInfo` exists and follows logWarn pattern | Call `logInfo({ layer: "action", operation: "submitPredictions" })`. | Message `"[action] submitPredictions"` sent to transports at `info` level. Console output gated by `ENABLE_DEBUG_LOGS`. |
| TC-301 | `logInfo` with detail string | Call `logInfo({ layer: "action", operation: "test" }, "starting")`. | Message includes `": starting"`. |
| TC-302 | `logInfo` sends to all registered transports | Register 2 transports. Call `logInfo(...)`. | Both transports' `send` called with level `"info"`. |
| TC-303 | `logInfo` console gated by ENABLE_DEBUG_LOGS | Set `ENABLE_DEBUG_LOGS=false`. Call `logInfo(...)`. | `console.info` NOT called. Transports still fire. |
| TC-304 | Production structured JSON output for logError | Set `NODE_ENV=production`, `ENABLE_DEBUG_LOGS=true`. Call `logError(ctx, error)`. | `console.error` called with a JSON string containing keys: `level`, `message`, `layer`, `operation`, `metadata`, `timestamp`, `error`. |
| TC-305 | Production structured JSON output for logWarn | Set `NODE_ENV=production`, `ENABLE_DEBUG_LOGS=true`. Call `logWarn(ctx, detail)`. | `console.warn` called with a JSON string containing `level: "warn"`. |
| TC-306 | Production structured JSON output for logInfo | Set `NODE_ENV=production`, `ENABLE_DEBUG_LOGS=true`. Call `logInfo(ctx)`. | `console.info` called with a JSON string containing `level: "info"`. |
| TC-307 | Development human-readable output preserved | Set `NODE_ENV=development`, `ENABLE_DEBUG_LOGS=true`. Call `logError(ctx, error)`. | `console.error` called with human-readable message string and metadata object (current format, NOT JSON stringified). |
| TC-308 | Logger PII sanitization in metadata | Call `logError({ layer: "action", operation: "test", metadata: { userId: "abc", email: "x@y.com" } }, error)`. | Console output metadata contains `userId: "abc"` but NOT `email`. |
| TC-309 | Logger PII sanitization does not strip userId | Call logger with `metadata: { userId: "uuid-123" }`. | `userId` is present in output. (UUID is NOT PII.) |
| TC-310 | Logger PII sanitization strips all known PII fields from metadata | Call logger with all PII fields in metadata (`email`, `display_name`, `date_of_birth`, `phone`, `ip`, `ip_address`, `user_agent`). | None of the PII fields appear in output. |
| TC-311 | logError transport failure does not crash | Register a transport that throws. Call `logError(...)`. | No error propagated. (Existing behavior must be preserved.) |
| TC-312 | Production JSON includes timestamp in ISO format | Set `NODE_ENV=production`. Call any log function. | JSON output has `timestamp` field matching ISO 8601 format. |
| TC-313 | Production JSON includes error details for Error objects | Set `NODE_ENV=production`. Call `logError(ctx, new Error("fail"))`. | JSON `error` field has `message`, `name`, `stack` (truncated to 1000 chars). |

### 2.9 Security

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|--------------------------------------------------------|--------------------------------------------------------------|
| TC-350 | No PII in any PostHog event payload | Audit all `trackEvent`/`trackServerEvent` call sites. Inspect properties passed to PostHog capture. | Zero instances of `email`, `display_name`, `date_of_birth`, `phone`, `ip_address`, or `user_agent` in any event payload. |
| TC-351 | No PII in any Firebase event payload | Same audit for Firebase `logEvent` calls. | Zero PII fields. |
| TC-352 | No PII in any production log output | Audit all `logError`, `logWarn`, `logInfo` call sites. | No PII in metadata fields sent to console or transports. |
| TC-353 | Sanitizer applied at analytics layer (defense-in-depth) | Even if a developer passes PII to `trackEvent`, the sanitizer strips it. | PII never reaches PostHog or Firebase regardless of caller. |
| TC-354 | `hashIdentifier` output is not reversible | Inspect `hashIdentifier` output for a known email. | SHA-256 hash -- no known way to reverse to original email. |
| TC-355 | PostHog `identify` call sends only allowed properties | Inspect `posthog.identify(userId, traits)` in the `usePostHogIdentify` hook. | Traits object contains ONLY `onboarding_completed` (boolean) and `created_at` (ISO date). |
| TC-356 | No raw email used as PostHog distinctId anywhere | Search all `captureServerEvent` and `capture` calls. | No call uses a raw email string as `distinctId`. Only UUIDs or SHA-256 hashes. |
| TC-357 | CSP headers prevent unauthorized script execution | Verify CSP `script-src` only allows `'self'`, `'unsafe-inline'`, `'unsafe-eval'`, PostHog assets, and Google Tag Manager/Analytics domains. | No wildcard `*` in `script-src`. Only listed domains. |
| TC-358 | `global-error.tsx` does not leak PII in raw fetch | Inspect the `fetch` body payload in `global-error.tsx`. | Only `error_message`, `error_digest`, `error_stack`, `error_context`, `$current_url`. No user identifiers or PII. |

### 2.10 Performance & Bundle Size

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|--------------------------------------------------------|--------------------------------------------------------------|
| TC-400 | Firebase SDK is dynamically imported (not in initial bundle) | Run `next build`. Inspect build output / chunk analysis. | Firebase modules appear in a lazy-loaded chunk, not in the main entry chunk. Initial page load JS is not increased by Firebase. |
| TC-401 | `web-vitals` is dynamically imported | Inspect `reportWebVitals()` implementation. | Uses `import("web-vitals")` dynamic import. Not in critical rendering path. |
| TC-402 | Total new client bundle < 35KB gzipped | Run `next build` and measure JS bundle size delta. | Additional gzipped JS <= 35KB (Firebase ~25KB + web-vitals ~1.5KB + analytics layer overhead). |
| TC-403 | Firebase uses tree-shakeable modular imports | Inspect `firebase/client.ts` and `adapters.ts` imports. | Only `firebase/app` and `firebase/analytics` imported. No `firebase` top-level import. No Firestore/Auth/Storage etc. |
| TC-404 | Analytics calls are fire-and-forget (non-blocking) | Call `trackEvent(...)` and measure whether it awaits any async operation on the calling thread. | `trackEvent` returns `void` synchronously. Firebase async dispatch does not block. |
| TC-405 | Server action analytics are non-blocking | Inspect `trackServerEvent` and `withTiming`. | `captureServerEvent` is fire-and-forget. Action response is NOT delayed by analytics. |

### 2.11 CSP Headers

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|--------------------------------------------------------|--------------------------------------------------------------|
| TC-450 | CSP script-src includes PostHog assets domain | Read `next.config.ts` CSP header. | `script-src` contains `https://us-assets.i.posthog.com`. |
| TC-451 | CSP script-src includes Google Tag Manager | Read CSP header. | `script-src` contains `https://www.googletagmanager.com`. |
| TC-452 | CSP script-src includes Google Analytics | Read CSP header. | `script-src` contains `https://*.google-analytics.com`. |
| TC-453 | CSP connect-src includes PostHog API | Read CSP header. | `connect-src` contains `https://us.i.posthog.com`. |
| TC-454 | CSP connect-src includes Google Analytics domains | Read CSP header. | `connect-src` contains `https://*.google-analytics.com`, `https://*.analytics.google.com`, `https://*.googletagmanager.com`. |
| TC-455 | No CSP violations in browser console with PostHog active | Load app with PostHog configured. Open browser DevTools console. | Zero CSP violation errors related to PostHog. |
| TC-456 | No CSP violations in browser console with Firebase active | Load app with Firebase configured. Open browser DevTools console. | Zero CSP violation errors related to Firebase/Google Analytics. |
| TC-457 | CSP does not break existing Supabase connections | Load app after CSP changes. | `connect-src` still includes `https://*.supabase.co` and `wss://*.supabase.co`. Supabase realtime works. |

### 2.12 Event Catalog Integrity

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|--------------------------------------------------------|--------------------------------------------------------------|
| TC-470 | New events added to ANALYTICS_EVENTS constant | Read `events.ts`. | Contains: `WEB_VITALS_LCP`, `WEB_VITALS_INP`, `WEB_VITALS_CLS`, `PAGE_LOAD_TIME`, `SERVER_ACTION_DURATION`, `UNHANDLED_ERROR`, `PREDICT_PAGE_VIEWED`, `PREDICT_PAGE_REVISITED`. |
| TC-471 | All event names remain unique | Run existing `events.test.ts` uniqueness test. | Passes. No duplicate event name values. |
| TC-472 | All new events follow snake_case convention | Run existing `events.test.ts` snake_case test. | Passes for all new entries. |
| TC-473 | All new keys follow UPPER_SNAKE_CASE convention | Run existing `events.test.ts` key naming test. | Passes for all new entries. |
| TC-474 | Event count test updated | Existing test expects `>= 29` events. Update to `>= 37` (29 existing + 8 new). | Test passes with updated threshold. |
| TC-475 | Firebase 40-character event name limit respected | Check all event name values in ANALYTICS_EVENTS. | All <= 40 characters. None start with `$`. |

### 2.13 Edge Cases & Error Scenarios

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|--------------------------------------------------------|--------------------------------------------------------------|
| TC-500 | PostHog key missing, Firebase configured | Unset `NEXT_PUBLIC_POSTHOG_KEY`. Set Firebase vars. Call `trackEvent(...)`. | PostHog silently no-ops. Firebase receives event. App runs normally. |
| TC-501 | Firebase config missing, PostHog configured | Unset all Firebase vars. Set PostHog key. Call `trackEvent(...)`. | Firebase silently no-ops. PostHog receives event. App runs normally. |
| TC-502 | Both platforms unconfigured | Unset all analytics env vars. Call `trackEvent(...)`. | Both no-op. App runs normally. No errors in console. |
| TC-503 | Ad blocker blocks PostHog | `getPostHogClient()` returns `null` (script blocked). | PostHog events silently dropped. Firebase still works (if not also blocked). |
| TC-504 | Rapid page navigation (dedup) | Navigate to `/dashboard`, then immediately to `/group/123`, then back to `/dashboard`. | Exactly 3 page view events (one per unique URL change). No duplicates. `lastPathRef` pattern works. |
| TC-505 | Privacy route opt-out still works | Navigate to `/privacy`. | PostHog opts out. No pageview event sent for `/privacy`. Navigate away -- PostHog opts back in. |
| TC-506 | Error with very long stack trace | Create an error with 5000-character stack trace. Send through error boundary. | Stack truncated to 1000 chars in all event payloads. No payload size issues. |
| TC-507 | Error loop -- 100 same errors in rapid succession | Fire same `window.onerror` 100 times in 1 second. | Only 1 event sent (dedup window). No event flood. |
| TC-508 | `web-vitals` API unavailable in old browser | Mock `import("web-vitals")` to reject. | `reportWebVitals()` catches the error silently. No crash. |
| TC-509 | Server action timeout (>30s) | Action wrapped with `withTiming` is killed by Vercel timeout. | Timing event may not fire (function killed). The timeout itself is captured by error tracking as a 504. |
| TC-510 | Firebase `logEvent` called with PostHog `$` prefix event | Internal mapping converts `$pageview` to `page_view` for Firebase. | Firebase receives `page_view`, not `$pageview`. |
| TC-511 | `sanitizeProperties` called with nested PII | Call with `{ metadata: { email: "a@b.com" }, group_id: "g1" }`. | Only top-level `email` would be stripped. Nested `metadata.email` passes through. (Document this as a known limitation -- PII sanitizer is shallow.) |
| TC-512 | `trackEvent` called with undefined properties | Call `trackEvent("event_name", undefined)`. | No crash. Both platforms receive event with empty properties. |

### 2.14 Server Action Logging (FR-026)

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|--------------------------------------------------------|--------------------------------------------------------------|
| TC-550 | Each server action has `logInfo` at entry | Audit all 7 server action files + auth callback route. | Every exported action function starts with a `logInfo` call including `layer: "action"`, `operation: <actionName>`, and non-PII metadata. |
| TC-551 | Server action `logInfo` does not include PII | Inspect `logInfo` calls in `auth.ts`. | No `email` in metadata. Only safe identifiers like `has_redirect`. |
| TC-552 | Server action error paths log appropriately | Trigger validation error in a server action. | `logWarn` (not `logError`) called for expected failures. |
| TC-553 | Server action unexpected exception logs at error level | Force unexpected throw in server action. | `logError` called with full stack trace. |
| TC-554 | DAL error coverage audit | Inspect all `catch` blocks and error returns in server actions. | Every DAL error path has either `logError` or `logWarn`. No silent failures. |

### 2.15 Migration Completeness

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|--------------------------------------------------------|--------------------------------------------------------------|
| TC-570 | No direct `getPostHogClient()?.capture(...)` in components | Search codebase for direct PostHog capture calls outside of `lib/posthog/` and `lib/analytics/`. | Zero direct PostHog capture calls in components. All use `trackEvent`. |
| TC-571 | No direct `captureServerEvent(...)` in server actions | Search for `captureServerEvent` imports in action files. | Zero imports. All replaced with `trackServerEvent` from analytics layer. |
| TC-572 | No direct `captureServerEvent(...)` in auth callback | Inspect `auth/callback/route.ts`. | Uses `trackServerEvent` instead of `captureServerEvent`. |
| TC-573 | PostHogProvider uses `trackPageView` | Inspect `posthog-provider.tsx`. | Uses `trackPageView(url)` instead of `posthog.capture("$pageview", ...)`. |
| TC-574 | notification-bell.tsx migrated | Inspect `notification-bell.tsx`. | Uses `trackEvent(ANALYTICS_EVENTS.NOTIFICATION_BELL_OPENED, ...)`. |
| TC-575 | invite-link.tsx migrated | Inspect `invite-link.tsx`. | Uses `trackEvent` for invite copied/shared events. |
| TC-576 | prediction-form.tsx migrated | Inspect `prediction-form.tsx`. | Uses `trackEvent` for prediction pick changed. |

### 2.16 Test Infrastructure

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|--------------------------------------------------------|--------------------------------------------------------------|
| TC-600 | Vitest setup mocks Firebase | Inspect `test/setup.ts`. | `firebase/app` and `firebase/analytics` mocked. `isSupported` returns `false` in tests. |
| TC-601 | Vitest setup mocks web-vitals | Inspect `test/setup.ts`. | `web-vitals` mocked with `onLCP`, `onINP`, `onCLS` as `vi.fn()`. |
| TC-602 | Existing PostHog mocks unchanged | Inspect `test/setup.ts`. | `posthog-js` and `posthog-node` mocks preserved exactly as before. |
| TC-603 | Storybook Firebase mock exists | Verify `__mocks__/handlers/firebase-client.ts` exists. | Exports `getFirebaseAnalytics` returning `null`. |
| TC-604 | Storybook config includes Firebase alias | Inspect `.storybook/main.ts`. | Firebase client aliased to mock. Firebase env vars defined as empty. |
| TC-605 | All existing tests pass after changes | Run `npx vitest run`. | All existing tests pass. Zero regressions. |

### 2.17 Environment Variables & Configuration

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|--------------------------------------------------------|--------------------------------------------------------------|
| TC-650 | `.env.local.example` includes Firebase vars | Read `.env.local.example`. | Contains `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` with placeholder values. |
| TC-651 | `.env.production.example` includes Firebase + PostHog vars | Read `.env.production.example`. | Contains all 5 Firebase vars + `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST`. |
| TC-652 | Firebase vars are NOT required in `env.ts` | Read `env.ts`. | No `required()` call for any `FIREBASE_*` variable. App starts without them. |
| TC-653 | App builds and runs with zero Firebase vars | Run `next build` without Firebase vars set. | Build succeeds. No runtime errors. |
| TC-654 | App builds and runs with zero PostHog vars | Run `next build` without PostHog vars set. | Build succeeds. No runtime errors. (Existing behavior preserved.) |

---

## 3. Regression Risks

| Area Affected | Risk Level | Reason | Mitigation |
|---|---|---|---|
| Page view tracking | High | PostHog provider is being modified to use `trackPageView` instead of direct capture. Wrong migration = lost page view data. | Verify page view events appear in PostHog after migration. Compare event volume before/after. |
| Error boundary tracking | High | `app/error.tsx` and `group/[groupId]/error.tsx` are switching from direct PostHog to unified layer. If analytics layer import fails, error tracking is lost. | Test error boundaries independently. Ensure `global-error.tsx` uses raw fetch (no dependency on analytics layer). |
| User identification | High | `usePostHogIdentify` is being rewritten. Breaking this means no user-level analytics in PostHog. | Unit test the hook. Verify `identify` is called with correct args. Test reset on sign-out. |
| Server action event capture | Medium | All 7 action files are replacing `captureServerEvent` with `trackServerEvent`. Wrong import or missed migration = lost server events. | Audit every action file. Run existing action tests. Verify event flow end-to-end. |
| PostHog feature flags | Medium | Feature flag evaluation (`useFeatureFlag`, `getServerFeatureFlag`) is NOT being changed, but the PostHog client initialization is shared. If client init breaks, feature flags break. | Feature flag tests should pass unchanged. Verify `getPostHogClient()` still initializes correctly. |
| CSP headers | Medium | Adding Firebase domains to CSP. Typo or missing domain = Firebase blocked. Overly permissive CSP = security risk. | Test in both Chrome and Safari. Verify no CSP violations in console. |
| Client component PostHog calls | Medium | `notification-bell.tsx`, `invite-link.tsx`, `prediction-form.tsx` are migrated. Incorrect migration breaks analytics for those features. | Run component tests. Verify mocks intercept `trackEvent`. |
| Build / bundle size | Medium | Two new dependencies (`firebase`, `web-vitals`). Dynamic imports must work correctly or they bloat the initial bundle. | Run `next build` and check output sizes. Verify no import of full Firebase SDK. |
| Logger transport system | Low | `logInfo` is being added. Existing `logError`/`logWarn` are being refactored to use shared `output()` function. Bug = broken logging. | Existing logger tests must pass. Add new tests for `logInfo` and JSON output. |
| Test infrastructure | Low | New mocks for Firebase and web-vitals added to global setup. If mocks are wrong, tests may fail or silently pass when they shouldn't. | Verify mock signatures match actual module exports. Run all tests. |
| Storybook | Low | New Firebase alias and env vars in Storybook config. Wrong config = Storybook build fails. | Run Storybook build after changes. |

---

## 4. Data Integrity Checks

- [ ] No new database tables or migrations required (confirmed: this is frontend-only instrumentation)
- [ ] RLS policies not affected (no Supabase changes)
- [ ] Existing PostHog event data is not corrupted by migration (event names stay the same)
- [ ] PostHog person properties schema change: `email` and `display_name` are REMOVED. Existing person profiles in PostHog will retain old data but new sessions will not send these fields. Verify PostHog handles missing properties gracefully (it does -- properties are optional).
- [ ] Firebase Analytics event schema validated: all custom event names <= 40 chars, <= 25 custom parameters per event, parameter values <= 100 chars.
- [ ] No orphaned analytics calls -- every `trackEvent` call references a constant from `ANALYTICS_EVENTS`, not a raw string.

---

## 5. Cross-Browser / Responsive

| Browser | Test Focus |
|---|---|
| Chrome 90+ | Full test suite. Web Vitals API available. Firebase + PostHog both supported. |
| Safari 15+ | `crypto.subtle` for SHA-256 hashing works. Performance Observer API available. CSP enforcement may differ from Chrome -- verify no CSP violations. |
| Firefox 90+ | Web Vitals API partial support (INP not available in older Firefox). Verify `onINP` callback simply doesn't fire rather than throwing. |
| Mobile Safari (iOS) | `isSupported()` for Firebase Analytics should return true. Verify no layout shift from analytics scripts loading. |
| With ad blocker | PostHog blocked, Firebase may be blocked. App functions normally. No error toasts or console errors (beyond expected blocked requests). |

---

## 6. Unit Test Specifications

These are the specific unit test files that should be created or updated during implementation.

### 6.1 `src/lib/analytics/sanitize.test.ts` (NEW)

- All 10 PII fields individually stripped (TC-001 through TC-010)
- Multiple PII fields stripped simultaneously (TC-012)
- Safe fields passed through (TC-011)
- Input not mutated (TC-013)
- Empty object handled (TC-014)
- `hashIdentifier` consistency (TC-015)
- `hashIdentifier` case-insensitivity (TC-016)
- `hashIdentifier` whitespace trimming (TC-017)
- `hashIdentifier` distinct outputs (TC-018)

### 6.2 `src/lib/analytics/index.test.ts` (NEW)

- `trackEvent` dispatches to both PostHog and Firebase (TC-100)
- PII sanitized before dispatch (TC-101)
- PostHog failure isolated from Firebase (TC-102)
- Firebase failure isolated from PostHog (TC-103)
- Both failures handled (TC-104)
- `trackPageView` sends to both platforms (TC-105)
- `trackServerEvent` PostHog-only (TC-106)
- `identifyUser` sends to both (TC-108)
- `resetUser` resets both (TC-110)
- Undefined properties handled (TC-512)

### 6.3 `src/lib/analytics/error-handler.test.ts` (NEW)

- `window.onerror` capture (TC-252)
- `window.onunhandledrejection` capture (TC-253)
- Dedup within 5s window (TC-254)
- Dedup expiry after 5s (TC-255)
- Different errors not deduped (TC-256)
- Message truncation (TC-257)
- Stack truncation (TC-258)
- Non-Error rejection reason (TC-259)
- SSR safety (TC-260)

### 6.4 `src/lib/analytics/server-timing.test.ts` (NEW)

- Duration measurement (TC-206)
- Failure detection from ActionResponse (TC-207)
- Failure detection from thrown error (TC-208)
- Slow action warning (TC-209)
- Fast action no warning (TC-210)

### 6.5 `src/lib/logger.test.ts` (UPDATED)

- `logInfo` basic (TC-300)
- `logInfo` with detail (TC-301)
- `logInfo` transports (TC-302)
- `logInfo` console gating (TC-303)
- Production JSON output for all levels (TC-304, TC-305, TC-306)
- Development human-readable preserved (TC-307)
- PII sanitization in metadata (TC-308, TC-309, TC-310)
- Transport crash safety preserved (TC-311)
- JSON timestamp format (TC-312)
- JSON error details (TC-313)

### 6.6 `src/lib/posthog/events.test.ts` (UPDATED)

- Update minimum event count to >= 37 (TC-474)
- Existing uniqueness, snake_case, UPPER_SNAKE_CASE tests still pass (TC-471, TC-472, TC-473)

### 6.7 `src/lib/posthog/transport.test.ts` (UPDATED)

- Verify userId from metadata is used as distinctId on server (TC-153)
- Verify fallback to "system" when no userId (TC-154)

---

## 7. Manual Verification Checklist (Post-Implementation)

These checks require a running app with real PostHog and Firebase credentials.

- [ ] PostHog dashboard shows page view events within 30 seconds of navigation
- [ ] PostHog dashboard shows custom events (e.g., `group_created`) from server actions
- [ ] PostHog person profiles do NOT contain `email` or `display_name` for new sessions
- [ ] Firebase Analytics dashboard shows `page_view` events
- [ ] Firebase Analytics dashboard shows custom events matching PostHog event names
- [ ] Web Vitals events (`web_vitals_lcp`, `web_vitals_inp`, `web_vitals_cls`) appear in PostHog
- [ ] `page_load_time` events appear with valid `dom_content_loaded_ms` and `full_load_ms`
- [ ] Triggering a React error boundary shows `error_boundary_caught` in PostHog + Firebase
- [ ] Server action errors show structured logs in Vercel function logs (JSON format)
- [ ] Browser console in production shows JSON-formatted log output
- [ ] No CSP violations in Chrome DevTools console
- [ ] No CSP violations in Safari Web Inspector console
- [ ] App loads and functions normally with ad blocker enabled
- [ ] App loads and functions normally with zero Firebase env vars
- [ ] `next build` completes without errors
- [ ] Bundle size delta is within 35KB gzipped budget

---

## 8. Risk Summary

| Category | Critical Tests | Key Concern |
|---|---|---|
| PII | TC-001 to TC-018, TC-170 to TC-174, TC-350 to TC-358 | This is the highest-priority NFR. Any PII leak is a showstopper. |
| Graceful Degradation | TC-050 to TC-058, TC-500 to TC-503 | Analytics must never crash the app. |
| Regression | TC-570 to TC-576, TC-600 to TC-605 | Migration of direct PostHog calls must be complete and correct. |
| Performance | TC-400 to TC-405 | Firebase SDK must not block first paint. |
| Error Tracking | TC-150 to TC-155, TC-250 to TC-260 | The error tracking chain must work even when parts of the app are broken. |
