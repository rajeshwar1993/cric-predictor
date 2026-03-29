# QA Review: Analytics & Observability
**QA Engineer**: QA Agent
**Date**: 2026-03-29

## Summary
- Total Issues Found: 7
- Critical: 1
- Major: 3
- Minor: 3

---

## Issues

### Critical Issues

#### QA-001: PII Leak in Logger Dev Output Fallback Path
- **File**: `web-app/src/lib/logger.ts`
- **Line**: 116
- **Description**: The `output()` function has a fallback path that bypasses PII sanitization. When `sanitizeProperties(context.metadata)` returns an empty object (because all fields were PII) and there is no error, the code falls through to `consoleFn(message, context.metadata)` which passes the **raw, unsanitized** metadata to the console.
- **Impact**: If a developer calls `logError({ layer: "action", operation: "test", metadata: { email: "user@example.com" } })` in development mode, the email will appear in the console output despite the sanitizer stripping it. This defeats the defense-in-depth principle for PII sanitization. While this only affects local development console (not production JSON output, not transports), the requirements state PII sanitization must be applied to ALL log output, and the test plan (TC-308) specifically verifies this.
- **Reproduction**: Call `logInfo({ layer: "test", operation: "test", metadata: { email: "a@b.com" } })` with `NODE_ENV=development` and `ENABLE_DEBUG_LOGS=true`. The console will show `{ email: "a@b.com" }`.
- **Suggested Fix**: Replace lines 112-117 with:
  ```typescript
  const sanitizedMetadata = context.metadata ? sanitizeProperties(context.metadata) : undefined;
  consoleFn(message, {
    ...sanitizedMetadata,
    ...(error ? { error: formatError(error) } : {}),
  });
  ```
  Or more simply, always use `devData` and never fall back to raw metadata:
  ```typescript
  consoleFn(message, Object.keys(devData).length > 0 ? devData : undefined);
  ```

---

### Major Issues

#### QA-002: Vitest Mock Missing `initializeAnalytics` from `firebase/analytics`
- **File**: `web-app/src/test/setup.ts`
- **Line**: 32-37
- **Description**: The production code (`firebase/client.ts:58`) calls `initializeAnalytics(app, config)` to initialize Firebase Analytics with PII-prevention settings. However, the Vitest global mock for `firebase/analytics` only exports `getAnalytics`, not `initializeAnalytics`. Any test that imports `firebase/client.ts` directly (e.g., a future integration test for the analytics adapters) will fail with "initializeAnalytics is not a function".
- **Impact**: Tests that exercise the Firebase initialization path will fail. Currently the Firebase client mock in Storybook (`__mocks__/handlers/firebase-client.ts`) and the `isSupported: false` mock prevent this from being hit, but it creates a fragile test setup. If anyone writes a test for `getFirebaseAnalytics()` directly, they will encounter this.
- **Suggested Fix**: Add `initializeAnalytics` to the mock:
  ```typescript
  vi.mock("firebase/analytics", () => ({
    getAnalytics: vi.fn().mockReturnValue({}),
    initializeAnalytics: vi.fn().mockReturnValue({}),
    isSupported: vi.fn().mockResolvedValue(false),
    logEvent: vi.fn(),
    setUserId: vi.fn(),
  }));
  ```

#### QA-003: No Unit Tests for New Analytics Modules
- **Files**: `web-app/src/lib/analytics/` (entire directory)
- **Description**: The technical architecture (section 11) specifies 6 new/updated test files: `sanitize.test.ts`, `index.test.ts`, `error-handler.test.ts`, `server-timing.test.ts`, `web-vitals.test.ts`, and updated `logger.test.ts`. None of these were created. The test plan specifies approximately 80 test cases (TC-001 through TC-313) for these modules. Zero of these tests exist.
- **Impact**: The PII sanitizer, unified analytics dispatch, error deduplication logic, web vitals reporting, server action timing, and logger enhancements (`logInfo`, JSON output, PII sanitization) are all untested. This is the largest gap in the implementation. The sanitizer is the single most safety-critical module in the entire feature and has no test coverage.
- **Suggested Fix**: Create the following test files per the test plan and technical architecture:
  - `src/lib/analytics/sanitize.test.ts` -- PII field stripping (TC-001 to TC-018)
  - `src/lib/analytics/index.test.ts` -- dual-platform dispatch (TC-100 to TC-112)
  - `src/lib/analytics/error-handler.test.ts` -- dedup logic (TC-250 to TC-260)
  - `src/lib/analytics/server-timing.test.ts` -- timing measurement (TC-206 to TC-210)
  - Update `src/lib/logger.test.ts` -- `logInfo`, JSON mode, PII sanitization (TC-300 to TC-313)
  - Update `src/lib/posthog/events.test.ts` -- event count threshold (TC-474)

#### QA-004: `auth/callback/route.ts` Still Uses `"anonymous"` as distinctId
- **File**: `web-app/src/app/auth/callback/route.ts`
- **Line**: 69
- **Description**: The auth callback failure path uses `trackServerEvent("anonymous", ANALYTICS_EVENTS.AUTH_CALLBACK_FAILED)`. The requirements (FR-003) and test plan (TC-174) specify that no literal `"anonymous"` should be used as a distinctId -- it should use a hashed/opaque identifier or defer to client-side tracking.
- **Impact**: In PostHog, all failed auth callbacks are attributed to a single "anonymous" person record. This makes it impossible to distinguish between different users experiencing auth failures and pollutes PostHog's person model. Unlike the `signInWithMagicLink` fix (which correctly hashes the email), this path was not updated.
- **Context**: In the failure path, there is genuinely no email or user context available (the auth code exchange failed). Using "anonymous" is understandable but conflicts with the stated requirement. A reasonable alternative: use `"auth_callback_failure"` as a descriptive system identifier, or use `hashIdentifier(code || "unknown")` where `code` is the auth code from the URL.
- **Suggested Fix**: Either document this as an accepted deviation from FR-003 (since there truly is no user identifier available), or change to a more descriptive system identifier like `"system:auth_callback_failure"` to distinguish it from other "anonymous" events.

---

### Minor Issues

#### QA-005: Firebase SDK Version Mismatch with Requirements
- **File**: `web-app/package.json`
- **Description**: The requirements document specifies `firebase` `^11.x`. The implementation uses `^12.11.0`. Firebase v12 is the current major version and includes breaking changes from v11.
- **Impact**: Low. The code works correctly with Firebase v12. The discrepancy is between the requirements doc and the implementation. The `initializeAnalytics` API used in the code is correct for v12.
- **Suggested Fix**: Update the requirements document to reflect `^12.x`, or simply note the version upgrade in the PR description.

#### QA-006: Extra Firebase Env Vars Beyond Requirements
- **Files**: `web-app/.env.local.example`, `web-app/.env.production.example`, `web-app/src/lib/firebase/client.ts`
- **Description**: The requirements (FR-008) specify 5 Firebase env vars: `API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `APP_ID`, `MEASUREMENT_ID`. The implementation adds 2 extra: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` and `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`. These are passed to `initializeApp()` but are not needed for Analytics-only usage.
- **Impact**: Very low. The extra env vars are optional and harmless. They do not affect functionality.
- **Suggested Fix**: Either remove the extra env vars from the example files and `initializeApp` call (cleaner), or document why they are included (future-proofing for potential Firebase Auth/Storage use).

#### QA-007: `events.test.ts` Threshold Not Updated
- **File**: `web-app/src/lib/posthog/events.test.ts`
- **Line**: 8
- **Description**: The existing test asserts `entries.length >= 29` events. After adding 8 new events (UNHANDLED_ERROR, WEB_VITALS_LCP, WEB_VITALS_INP, WEB_VITALS_CLS, PAGE_LOAD_TIME, SERVER_ACTION_DURATION, PREDICT_PAGE_VIEWED, PREDICT_PAGE_REVISITED), the count is now 37. The test threshold should be updated to `>= 37` to prevent silent regressions where events are accidentally removed.
- **Impact**: Low. The test still passes (37 >= 29), but it allows up to 8 events to be deleted without the test catching it.
- **Suggested Fix**: Update line 8 to `expect(entries.length).toBeGreaterThanOrEqual(37);`

---

## Detailed Code Audit Results

### 1. PII Safety Audit -- PASS (with exception of QA-001)

**Sanitizer module** (`sanitize.ts`): Correctly implemented. All 10 PII fields from the requirements are in the `PII_FIELDS` set. Returns a new object (no mutation). `hashIdentifier` uses `crypto.subtle.digest("SHA-256")` with lowercase+trim normalization.

**Identify hook** (`use-posthog-identify.ts`): Clean. Sends only `onboarding_completed` (boolean) and `created_at` (ISO date). No `email`, no `display_name`. Uses `identifyUser()` from the unified layer which applies `sanitizeProperties()` as defense-in-depth.

**Magic link action** (`auth.ts`): Fixed correctly. Uses `hashIdentifier(email)` to generate an opaque SHA-256 hash as the distinctId. `logError` metadata no longer includes `email`. `logInfo` at entry only logs `has_redirect` (boolean).

**Onboarding action** (`onboarding.ts`): Fixed correctly. `AUTH_ONBOARDING_COMPLETED` event no longer includes `display_name`.

**All server action `logInfo` calls**: Audited all 7 action files + auth callback. No PII in any `logInfo` metadata. Fields are limited to: `groupId`, `matchId`, `scenarioId`, `inviteCode`, `notificationId`, `targetUserId`, `action`, `predictionCount`, `has_redirect`, `name` (group name).

**Unified analytics layer**: `trackEvent`, `trackServerEvent`, and `identifyUser` all call `sanitizeProperties()` before dispatch. Defense-in-depth is in place.

**Logger production path**: Production JSON output correctly calls `sanitizeProperties(context.metadata)` at line 93.

**Logger dev path**: BUG -- see QA-001. The fallback at line 116 bypasses sanitization.

**Global error handler** (`global-error.tsx`): Only sends `error_message`, `error_digest`, `error_stack`, `error_context`, `$current_url`. No user identifiers or PII.

**Error boundaries** (`error.tsx`, `group/[groupId]/error.tsx`): Send `error_message`, `error_digest`, `error_stack`, `error_context`, `page_path`. No PII.

### 2. Firebase Initialization -- PASS

- Lazy singleton pattern with `initAttempted` flag: correct.
- Graceful `null` return when env vars missing: all 4 required vars checked.
- `isSupported()` check before initialization: correct.
- SSR guard (`typeof window === "undefined"`): correct.
- Error catching with silent return: correct.
- PII prevention config (`allow_google_signals: false`, `allow_ad_personalization_signals: false`, `send_page_view: false`): correctly applied via `initializeAnalytics` config.
- No React provider needed: correct per architecture decision.

### 3. Unified Analytics Layer -- PASS

- `trackEvent` fans out to both PostHog (via `capturePostHogClient`) and Firebase (via `captureFirebase`): correct.
- `trackPageView` sends `$pageview` to PostHog and `page_view` to Firebase: correct Firebase event name mapping.
- `trackServerEvent` sends to PostHog only: correct (Firebase is client-side only).
- `identifyUser` calls PostHog `identify` and Firebase `setUserId`: correct.
- `resetUser` calls PostHog `reset`: correct. Firebase does not need explicit reset (documented).
- Each adapter wrapped in try/catch with `logWarn` on failure: correct. Platform failures are independent.
- Firebase adapter uses dynamic `import()`: correct for tree-shaking and avoiding server bundle inclusion.
- PostHog adapter uses `require()`: correct (synchronous, already in bundle).

### 4. PostHog Fixes -- PASS

**4a. `global-error.tsx` tracking**: Uses raw `fetch` to PostHog API with no SDK dependency. Correctly wraps everything in try/catch. Uses the configurable `NEXT_PUBLIC_POSTHOG_HOST` with fallback. Fire-and-forget pattern. Uses `distinct_id: "anonymous"` which is acceptable for this last-resort boundary.

**4b. Server transport user correlation** (`transport.ts:44-45`): Reads `userId` from `context.metadata?.userId` with `?? "system"` fallback. Correct. Server actions already pass `userId` in their `logError` metadata.

**4c. `shutdownPostHog`** (`server.ts:53-58`): Correctly calls `serverPostHog.shutdown()` and sets singleton to `null`. Safe to call multiple times (null guard).

**4d. Transport dedup guard** (`posthog-provider.tsx:16,29-32`): Module-level `clientTransportRegistered` flag prevents duplicate `registerTransport` calls. Correct pattern, mirrors the server-side `ensureServerTransport()` approach.

### 5. Performance Monitoring -- PASS

**Web Vitals** (`web-vitals.ts`): Dynamic import of `web-vitals` with `.catch()` for unsupported browsers. Maps metric names to event constants. Reports `value`, `rating`, `page_path`, `navigation_type`. Idempotent via `webVitalsInitialized` flag.

**Page Load Timing** (`web-vitals.ts:61-90`): Uses `PerformanceNavigationTiming` API. Reports `dom_content_loaded_ms` and `full_load_ms` with `Math.round`. Handles both `document.readyState === "complete"` and `load` event listener paths. Idempotent via `pageLoadTimeInitialized` flag.

**Server Action Timing** (`server-timing.ts`): `withTiming` HOF correctly measures `performance.now()` delta. Uses `finally` block to ensure timing is always reported. Checks `ActionResponse` pattern for `success: false`. Re-throws errors. Logs slow actions via `logWarn`. Uses `trackServerEvent` (unified layer, PII-sanitized).

### 6. Error Tracking -- PASS

**Global error handlers** (`error-handler.ts`): Uses `addEventListener` instead of `window.onerror =` assignment (improvement over architecture doc -- avoids overwriting other handlers). Deduplication uses a `recentErrors` array with 5-second window cleanup. Idempotent via `registered` flag. SSR-safe. Message truncated to 500 chars, stack to 1000 chars. Both `error` and `unhandledrejection` events handled.

**Error boundaries**: `app/error.tsx` and `group/[groupId]/error.tsx` correctly migrated to `trackEvent` from unified layer. Both include `error_context` and `page_path`. Stack truncated to 1000 chars.

**`global-error.tsx`**: Correctly uses raw fetch (no SDK dependency). This is the right design since PostHogProvider may be the crashed component.

### 7. Logger Enhancements -- PASS (with QA-001 exception)

**`logInfo`**: Implemented correctly. Same pattern as `logWarn`. Sends to transports at `info` level. Console output gated by `ENABLE_DEBUG_LOGS`.

**Structured JSON in production**: `output()` function correctly branches on `isProduction()`. JSON output includes all required keys: `level`, `message`, `layer`, `operation`, `metadata` (sanitized), `timestamp` (ISO), `error` (if applicable). Error details include `message`, `name`, `stack` (truncated to 1000 chars).

**PII sanitization**: Applied in production JSON path (line 93). Applied in dev path for `devData` (line 109). **NOT applied** in dev fallback path (line 116) -- see QA-001.

### 8. Migration Completeness -- PASS

All direct PostHog calls have been migrated to the unified analytics layer:

| File | Old Import | New Import | Status |
|------|-----------|------------|--------|
| `error.tsx` | `@/lib/posthog/client` + `@/lib/posthog/events` | `@/lib/analytics` | Migrated |
| `group/[groupId]/error.tsx` | `@/lib/posthog/client` + `@/lib/posthog/events` | `@/lib/analytics` | Migrated |
| `posthog-provider.tsx` | Direct `posthog.capture("$pageview", ...)` | `trackPageView(url)` from `@/lib/analytics` | Migrated |
| `notification-bell.tsx` | `@/lib/posthog/client` + events | `@/lib/analytics` | Migrated |
| `invite-link.tsx` | `@/lib/posthog/client` + events | `@/lib/analytics` | Migrated |
| `prediction-form.tsx` | `@/lib/posthog/client` + events | `@/lib/analytics` | Migrated |
| `use-posthog-identify.ts` | `@/lib/posthog/client` | `@/lib/analytics` | Migrated |
| `auth.ts` (action) | `@/lib/posthog` | `@/lib/analytics` | Migrated |
| `onboarding.ts` (action) | `@/lib/posthog` | `@/lib/analytics` | Migrated |
| `groups.ts` (action) | `@/lib/posthog` | `@/lib/analytics` | Migrated |
| `predictions.ts` (action) | `@/lib/posthog` | `@/lib/analytics` | Migrated |
| `scenarios.ts` (action) | `@/lib/posthog` | `@/lib/analytics` | Migrated |
| `admin.ts` (action) | `@/lib/posthog` | `@/lib/analytics` | Migrated |
| `notifications.ts` (action) | `@/lib/posthog` | `@/lib/analytics` | Migrated |
| `auth/callback/route.ts` | `@/lib/posthog` | `@/lib/analytics` | Migrated |

Grep confirms zero remaining imports of `@/lib/posthog` from components or action files (only from `@/lib/posthog/` internal files and the analytics adapters).

### 9. CSP Headers -- PASS

`next.config.ts` correctly updated:
- `script-src` now includes: `https://www.googletagmanager.com`, `https://*.google-analytics.com`
- `connect-src` now includes: `https://*.google-analytics.com`, `https://*.analytics.google.com`, `https://*.googletagmanager.com`
- Existing PostHog and Supabase domains preserved.

### 10. Event Catalog -- PASS

All 8 new events added to `ANALYTICS_EVENTS`:
- `UNHANDLED_ERROR: "unhandled_error"`
- `WEB_VITALS_LCP: "web_vitals_lcp"`
- `WEB_VITALS_INP: "web_vitals_inp"`
- `WEB_VITALS_CLS: "web_vitals_cls"`
- `PAGE_LOAD_TIME: "page_load_time"`
- `SERVER_ACTION_DURATION: "server_action_duration"`
- `PREDICT_PAGE_VIEWED: "predict_page_viewed"`
- `PREDICT_PAGE_REVISITED: "predict_page_revisited"`

All follow snake_case convention. All keys follow UPPER_SNAKE_CASE. All are unique. All under Firebase's 40-character limit. Total: 37 events.

### 11. Test Infrastructure -- PARTIAL PASS

- Vitest global mocks: Firebase and web-vitals mocks added. PostHog mocks preserved. **Missing `initializeAnalytics`** (QA-002).
- Storybook: Firebase client alias added. Firebase env vars defined. PostHog mocks preserved.
- Firebase mock (`__mocks__/handlers/firebase-client.ts`): Returns `null` -- correct no-op.

### 12. Environment Variables -- PASS

- `.env.local.example`: All 7 Firebase vars added with empty defaults (2 extra beyond requirements -- see QA-006).
- `.env.production.example`: PostHog vars added (was a documented gap). All 7 Firebase vars added.
- `env.ts`: No Firebase vars added as `required()` -- correct (Firebase is optional).

### 13. Bundle Size Analysis

- Firebase `^12.11.0` with tree-shakeable imports (`firebase/app` + `firebase/analytics` only): Expected ~20-25KB gzipped.
- `web-vitals` `^5.2.0`: ~1.5KB gzipped.
- Both dynamically imported in the adapters/web-vitals modules: correct -- not in initial bundle.
- No import of full `firebase` namespace: confirmed.
- Total estimated: ~22-27KB gzipped. Under the 35KB budget.

### 14. Existing Test Results

**Test run**: 41 files passed, 9 files failed (31 test failures out of 628 total tests).

**Analysis of failures**: All 31 failures are **pre-existing issues unrelated to the analytics changes**:
- 6 failures in `player-pick.test.tsx` and `scenario-card.test.tsx`: Component rendering changes (placeholder text mismatch "Search player...").
- 17 failures in action tests (`admin`, `groups`, `scenarios`, `predictions`): `"static generation store missing in revalidatePath"` -- a Next.js 16 test environment issue. These tests don't mock `revalidatePath` from `next/cache`. This is a pre-existing incompatibility, not caused by analytics changes.
- 8 failures in DAL tests (`groups`, `matches`, `members`): Mock/API contract mismatches (e.g., `updateMemberStatus` now returns `{ ok, capacityExceeded }` instead of `boolean`). Pre-existing.

**Conclusion**: The analytics changes introduce zero new test failures.

---

## Positive Observations

1. **Consistent migration pattern**: All 15 files were migrated from direct PostHog calls to the unified analytics layer following the exact same pattern. No shortcuts or inconsistencies.

2. **Defense-in-depth PII approach**: PII sanitization is applied at three layers: (a) the unified analytics layer before dispatch, (b) the logger before console output, (c) the individual call sites which were cleaned of PII at the source. This is excellent layered security.

3. **Graceful degradation throughout**: Every analytics call is wrapped in error handling. Firebase returns `null` when unconfigured. PostHog returns `null` when unconfigured. Adapter failures are caught and logged. The app is completely functional with zero analytics platforms configured.

4. **Good use of `addEventListener` over `window.onerror =`**: The error handler uses `addEventListener("error", ...)` instead of direct property assignment, which avoids overwriting handlers from other libraries. This is better than the architecture doc suggested.

5. **Idempotent initialization**: All init functions (`reportWebVitals`, `reportPageLoadTime`, `registerGlobalErrorHandlers`, `getFirebaseAnalytics`) have idempotency guards, preventing duplicate registrations during React Strict Mode double-mount or HMR.

6. **Clean `global-error.tsx` design**: Using raw `fetch` to PostHog API with zero SDK dependency is the correct approach for the last-resort error boundary. The code correctly uses the configurable host env var with fallback.

7. **Server action `logInfo` consistency**: All 7 server action files and the auth callback route have `logInfo` at entry with structured, non-PII metadata. Consistent pattern.

---

## Recommendation
- [ ] Ready to merge
- [x] Merge after fixing critical issues
- [ ] Needs significant rework

**Required before merge:**
1. **QA-001 (Critical)**: Fix the PII leak in the logger dev output fallback path. This is a one-line fix.
2. **QA-002 (Major)**: Add `initializeAnalytics` to the Vitest Firebase mock to prevent future test failures.
3. **QA-003 (Major)**: Create unit tests for at minimum the PII sanitizer (`sanitize.test.ts`) -- this is the most safety-critical module. The remaining test files (analytics dispatch, error handler, server timing, logger updates) should be added but could be in a fast-follow.

**Recommended but not blocking:**
4. **QA-004**: Address the `"anonymous"` distinctId in auth callback failure path.
5. **QA-007**: Update `events.test.ts` threshold to `>= 37`.
