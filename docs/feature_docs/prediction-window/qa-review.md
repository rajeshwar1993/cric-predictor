# QA Review: Prediction Window
**QA Engineer**: QA Agent
**Date**: 2026-03-29
**Branch**: `feature/prediction-window`
**Status**: Review Complete

---

## Summary

- Total Issues Found: 10
- Critical: 0
- Major: 3
- Minor: 4
- Notes: 3

**Blockers from code review (BLOCKER-1, BLOCKER-2) have been verified as FIXED.** The `setState` during render was moved into `useEffect` in both `WindowStatusIndicator` (line 140-144) and `PreWindowBanner` (line 48-52). Unit tests for all 4 new utility functions have been added (34 new tests, 60 total tests pass).

---

## 1. End-to-End Data Flow Trace

### Window Calculation -> UI State -> Server Validation -> RLS

**Flow verified:**

```
Server Component (page.tsx)
  computeWindowOpen(match.date) -> Date (8 AM IST)
  computeDeadline(match.date, match.time_ist, settings?.prediction_deadline) -> Date
  getWindowState(match, settings?.prediction_deadline) -> WindowState enum
    |
    v
Client Components receive windowOpen/windowClose as ISO strings
  WindowStatusIndicator: derives visual state from countdown hooks
  PredictPageWindowBadge: receives server-computed windowState prop
  PreWindowBanner: displays when isPreWindow is true
    |
    v
User submits prediction
  submitPredictions server action:
    computeWindowOpen(match.date) -> rejects if now < windowOpen
    isDeadlinePassed() -> rejects if now > deadline
    |
    v
Supabase RLS (036_prediction_window.sql):
    now() >= prediction_window_open(m.date) -> blocks early submissions
    now() < prediction_deadline(m.date, m.time_ist, ...) -> blocks late submissions
```

**Verdict**: Triple-layer enforcement is complete. Each layer independently enforces the window boundaries. A malicious user bypassing the UI and server action would still be blocked by RLS.

---

## 2. P0 Requirements Verification

| FR | Description | Status | Evidence |
|----|-------------|--------|----------|
| FR-001 | Window opens at 8 AM IST | PASS | `computeWindowOpen` constructs `{date}T08:00:00+05:30`. Unit tests verify 8 AM IST = 02:30 UTC. |
| FR-002 | Window closes at 45 min before match (existing) | PASS | `computeDeadline` unchanged. RLS uses `prediction_deadline()` function. |
| FR-003 | `computeWindowOpen()` utility added | PASS | `utils.ts` lines 65-71. 6 unit tests passing. |
| FR-004 | `isWindowOpen()` utility added | PASS | `utils.ts` lines 83-92. 8 unit tests passing. |
| FR-005 | Custom deadline overrides close only, not open | PASS | `isWindowOpen` and `getWindowState` both call `computeWindowOpen` for the open time (always 8 AM) and `computeDeadline` with optional `customDeadline` for close. Verified in unit tests for `isWindowOpen` and `getWindowState`. |
| FR-006 | Server action checks `isWindowOpen` | PASS | `predictions.ts` lines 51-55 check `computeWindowOpen` and return `ERROR_WINDOW_NOT_OPEN`. Lines 57-59 check `isDeadlinePassed` and return `ERROR_DEADLINE_PASSED`. Error ordering is correct (early check before late check). |
| FR-007 | RLS updated with window open check | PASS | Migration 036 adds `now() >= prediction_window_open(m.date)` to both INSERT (line 48) and UPDATE (line 68) policies. |
| FR-008 | Existing predictions unaffected | PASS | Migration 036 does not modify SELECT/DELETE policies. No data modification statements. Only function creation and policy replacement. |
| FR-009 | "Predict Early" button removed | PASS | No "Predict Early" text in any rendered UI code. Only exists in a code comment. All match cards now use `WindowStatusIndicator`. |
| FR-010 | 4-state window indicator on match cards | PASS | `WindowStatusIndicator` implements all 4 states: pre-window future, pre-window match day, window open, window closed. Plus zero-window edge case. |
| FR-011 | Deadline text updated per state | PASS | Copy from `PREDICTION_WINDOW_COPY` used for all states. |
| FR-012 | Predict page window-aware gating | PASS | `predict/[matchId]/page.tsx` lines 75-77 compute `isPreWindow`. Line 127 conditionally renders `PreWindowBanner` vs `PredictionForm`. |
| FR-013 | Predict page countdown header | PASS | `PredictPageWindowBadge` shows "Closes in {countdown}" during window open state. |
| FR-018 | Mobile responsive 320px+ | PASS | Components use `w-full sm:w-auto`, `p-6 sm:p-8`, `flex-col`, and `text-xs`/`text-sm` patterns consistent with existing responsive design. No fixed-width elements. |

**Result**: All P0 requirements verified as implemented.

---

## 3. Code Review Blocker Fix Verification

### BLOCKER-1: setState during render -> FIXED

**WindowStatusIndicator** (lines 140-144):
```typescript
useEffect(() => {
  if (isMatchDay && windowHasOpened && !showTransition) {
    setShowTransition(true);
  }
}, [isMatchDay, windowHasOpened, showTransition]);
```
Correctly moved into `useEffect`. Dependency array is complete. No render-loop risk.

**PreWindowBanner** (lines 48-52):
```typescript
useEffect(() => {
  if (isMatchDay && isExpired && !hasTransitioned) {
    setHasTransitioned(true);
  }
}, [isMatchDay, isExpired, hasTransitioned]);
```
Same pattern, correctly fixed.

### BLOCKER-2: Missing unit tests -> FIXED

34 new tests added across 4 `describe` blocks:
- `computeWindowOpen`: 6 tests (standard date, different date, invalid input, empty string, UTC boundary, timezone verification)
- `isWindowOpen`: 8 tests (before window, at 8 AM, during window, after deadline, day before, custom deadline, zero-duration, invalid date)
- `getWindowState`: 10 tests (all 4 states, exact 8 AM boundary, after deadline, zero-duration, midnight IST boundary, just after midnight, custom deadline override, full lifecycle)
- `formatWindowDate`: 5 tests (various dates, January, December, IST timezone)

All 60 tests pass (including 26 pre-existing tests).

---

## 4. Edge Cases from Test Plan vs Actual Code

| TC | Edge Case | Code Behavior | Status |
|----|-----------|---------------|--------|
| TC-101 | Double-header: both open at 8 AM | Each `WindowStatusIndicator` receives its own `windowOpen`/`windowClose` props. Independent countdowns. | PASS |
| TC-105 | Submit at 07:59:59 IST | `isWindowOpen` uses `now >= windowOpen`. At 07:59:59, `now < windowOpen`. Returns false. | PASS |
| TC-106 | Submit at 08:00:00 IST | `now >= windowOpen` is true. `now < deadline` is true. Returns true. | PASS |
| TC-108 | Submit at exactly deadline | `isWindowOpen` uses `now < deadline` (strict less-than). At exactly deadline, returns false. | PASS |
| TC-109 | Zero-duration window | `getWindowState` line 111: `if (deadline <= windowOpen) return "WINDOW_CLOSED"`. `WindowStatusIndicator` line 51: `isZeroWindow = windowCloseDate <= windowOpenDate`. Renders locked state. | PASS |
| TC-110 | Morning match at 8 AM | Deadline 07:15 < window open 08:00. Same as TC-109 (zero-duration). | PASS |
| TC-112 | User on predict page, window opens | `PreWindowBanner` uses `useCountdown(windowOpenDate)`. When expired, `useEffect` sets `hasTransitioned=true`. Shows "Start Predicting" button with `router.refresh()`. | PASS |
| TC-114 | Deadline passes during session | `PredictionForm` receives `deadline` prop. `useCountdown(deadlineDate)` triggers `isAutoLocked`. `effectivelyLocked = isLocked \|\| isAutoLocked`. Form auto-locks. | PASS |
| TC-115 | Invalid date input | `computeWindowOpen("")` returns `new Date(0)`. `isWindowOpen` returns false (fail-closed). | PASS |
| TC-120 | Server-client time mismatch | Server rejects at action layer. Client shows error in sticky bar via `setError(result.error)`. | PASS |
| TC-121 | 11:30 PM IST, match tomorrow | `getWindowState` uses `toLocaleString("en-US", { timeZone: "Asia/Kolkata" })` for IST date comparison. Unit test at 18:29 UTC (11:59 PM IST) with Apr 6 match correctly returns `PRE_WINDOW_FUTURE`. | PASS |
| TC-122 | 12:30 AM IST on match day | Unit test at 18:31 UTC (12:01 AM IST Apr 6) with Apr 6 match correctly returns `PRE_WINDOW_MATCH_DAY`. | PASS |

---

## 5. Copy Constants vs Copy Spec

| Copy Spec Key | Spec Value | Constants Value | Match? |
|---------------|-----------|-----------------|--------|
| `CARD_PRE_WINDOW_FUTURE` | "Predictions open on {matchDate} at 8:00 AM" | "Predictions open on {matchDate} at 8:00 AM" | PASS |
| `CARD_PRE_WINDOW_TODAY` | "Predictions open at 8:00 AM" | "Predictions open at 8:00 AM" | PASS |
| `CARD_PRE_WINDOW_TODAY_COUNTDOWN` | "Opens in {countdown}" | "Opens in {countdown}" | PASS |
| `CARD_WINDOW_OPEN_CTA` | "Make Your Calls" | "Make Your Calls" | PASS |
| `CARD_WINDOW_OPEN_DEADLINE` | "Closes in {countdown}" | "Closes in {countdown}" | PASS |
| `CARD_WINDOW_CLOSED` | "Predictions Locked" | "Predictions Locked" | PASS |
| `CARD_WINDOW_CLOSED_LIVE` | "Match is live -- predictions are locked" | "Match is live -- predictions are locked" | PASS |
| `PREDICT_PRE_WINDOW_TITLE` | "Not Open Yet" | "Not Open Yet" | PASS |
| `PREDICT_PRE_WINDOW_BODY` | Full text with {matchDate} | Matches exactly | PASS |
| `PREDICT_PRE_WINDOW_BADGE` | "Opens {matchDate} at 8:00 AM" | "Opens {matchDate} at 8:00 AM" | PASS |
| `PREDICT_WINDOW_OPEN_BADGE` | "Closes in {countdown}" | "Closes in {countdown}" | PASS |
| `PREDICT_WINDOW_CLOSED_TITLE` | "Predictions Locked" | "Predictions Locked" | PASS |
| `PREDICT_WINDOW_CLOSED_BODY` | Full text | Matches exactly | PASS |
| `PREDICT_WINDOW_JUST_OPENED` | "Window is now open -- tap to start predicting" | "Window is now open -- tap to start predicting" | PASS |
| `TOOLTIP_TITLE` | "Prediction Window" | "Prediction Window" | PASS |
| `TOOLTIP_BODY` | Full text | Matches exactly | PASS |
| `SQUADS_PENDING_NOTE` | "Squads will be available when the window opens." | "Squads will be available when the window opens." | PASS |
| `ZERO_WINDOW` | "Predictions are locked for this match." | "Predictions are locked for this match." | PASS |
| `ERROR_WINDOW_NOT_OPEN` | "Predictions open at 8 AM on match day" | "Predictions open at 8 AM on match day" | PASS |
| `ERROR_DEADLINE_PASSED` | "Too late -- the prediction window has closed" | "Too late -- the prediction window has closed" | PASS |

**Missing from constants** (defined in copy spec but not in `constants.ts`):
- `RESCHEDULED_NOTICE` -- Not implemented (edge case, acceptable for v1)
- `DOUBLE_HEADER_NOTE` -- Not implemented (edge case, acceptable for v1)
- `SQUADS_STILL_LOADING` -- Not implemented (P1 nice-to-have)
- `EVENT_*` analytics constants -- Not added to `posthog/events.ts` (see Major issue below)

**Copy usage note**: `PreWindowBanner` line 122 uses hardcoded "Opens in {display}" instead of interpolating from `CARD_PRE_WINDOW_TODAY_COUNTDOWN`. Same in `PredictPageWindowBadge` line 84: "Opens in {openDisplay}". See Minor issue below.

---

## 6. Issues

### Major Issues

#### QA-001: `toLocaleString` for IST date comparison is fragile across runtimes
- **File**: `web-app/src/lib/utils.ts` (lines 117-118), `web-app/src/components/prediction/window-status-indicator.tsx` (lines 130-131)
- **Description**: The pattern `new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))` is used to determine if today is match day in IST. The output format of `toLocaleString` is locale-dependent and not guaranteed to be parseable by the `Date` constructor across all JavaScript runtimes. Edge runtimes (e.g., Cloudflare Workers, some Vercel Edge builds) may have limited ICU data.
- **Impact**: Could produce incorrect date comparisons in certain deployment environments, causing `PRE_WINDOW_FUTURE` to render when it should be `PRE_WINDOW_MATCH_DAY` (or vice versa). This is a correctness risk.
- **Suggested Fix**: Use explicit UTC offset arithmetic:
  ```typescript
  // IST is always UTC+05:30 (no DST)
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(now.getTime() + IST_OFFSET_MS);
  const matchDayIST = new Date(new Date(match.date + "T00:00:00+05:30").getTime() + IST_OFFSET_MS);
  const isSameDay =
    nowIST.getUTCFullYear() === matchDayIST.getUTCFullYear() &&
    nowIST.getUTCMonth() === matchDayIST.getUTCMonth() &&
    nowIST.getUTCDate() === matchDayIST.getUTCDate();
  ```
  This is deterministic and works in all JavaScript environments.

#### QA-002: `formatWindowDate` uses `en-IN` locale which produces "6 Apr" format, not "Apr 6"
- **File**: `web-app/src/lib/utils.ts` (lines 136-142)
- **Description**: The `en-IN` locale produces day-first format ("6 Apr") while the copy spec and UI/UX spec examples consistently show month-first format ("Apr 6"). This means the copy template `"Predictions open on {matchDate} at 8:00 AM"` would render as `"Predictions open on 6 Apr at 8:00 AM"` instead of the spec's `"Predictions open on Apr 6 at 8:00 AM"`.
- **Impact**: Cosmetic inconsistency with the copy spec. Not a functional issue, but deviates from the approved copy.
- **Suggested Fix**: Use `en-US` locale to match the spec examples:
  ```typescript
  return new Date(matchDate + "T00:00:00+05:30").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });
  ```

#### QA-003: Analytics event constants missing from `posthog/events.ts`
- **File**: `web-app/src/lib/posthog/events.ts`
- **Description**: The technical architecture (Section 4.3) and copy spec both specify 4 analytics event constants to be added to the `ANALYTICS_EVENTS` object: `PREDICTION_WINDOW_NOT_OPEN_VIEWED`, `PREDICTION_WINDOW_OPENED`, `PREDICTION_WINDOW_CLOSED_VIEWED`, `PREDICTION_EARLY_SUBMIT_BLOCKED`. These were not added.
- **Impact**: When analytics tracking is wired up (natural follow-up), the constants will need to be added. Including them now avoids a gap and keeps the implementation consistent with the spec.
- **Suggested Fix**: Add the 4 constants to `ANALYTICS_EVENTS` in `events.ts`.

---

### Minor Issues

#### QA-004: `PredictPageWindowBadge` uses hardcoded copy for match-day pre-window countdown
- **File**: `web-app/src/components/prediction/predict-page-window-badge.tsx` (line 84)
- **Description**: The badge renders `"Opens in {openDisplay}"` with a hardcoded "Opens in" prefix instead of using `PREDICTION_WINDOW_COPY.CARD_PRE_WINDOW_TODAY_COUNTDOWN.replace("{countdown}", openDisplay)`. Same issue in `PreWindowBanner` line 122.
- **Impact**: If the copy is updated in constants, these locations won't pick up the change. Minor consistency concern.
- **Suggested Fix**: Use the constant with `.replace()` for consistency.

#### QA-005: `WindowStatusIndicator` `isUrgent` calculated from `Date.now()` on each render
- **File**: `web-app/src/components/prediction/window-status-indicator.tsx` (lines 65-67)
- **Description**: `isUrgent` is computed from `windowCloseDate.getTime() - Date.now()` during render. While `useCountdown` triggers re-renders every second, `Date.now()` may produce slightly different values than the countdown's internal timer, potentially causing the urgency threshold to flicker at the 1-hour boundary.
- **Impact**: The `animate-pulse` class could briefly toggle on/off at exactly 60 minutes remaining. Cosmetic only.
- **Suggested Fix**: Accept as-is or derive urgency from countdown display string length/content.

#### QA-006: `WindowStatusIndicator` date comparison on client duplicates server logic
- **File**: `web-app/src/components/prediction/window-status-indicator.tsx` (lines 130-137)
- **Description**: The component re-derives `isMatchDay` client-side using the `toLocaleString` pattern instead of receiving `windowState` as a prop (like `PredictPageWindowBadge` does). This means the group page `WindowStatusIndicator` and the server's `getWindowState()` could disagree if client/server timezones differ slightly, or if `toLocaleString` produces different output.
- **Impact**: On match day, if the client derives a different "is match day" answer than the server, the UI could show the wrong pre-window variant. The functional impact is minimal (both variants block predictions), but the visual state would be incorrect.
- **Suggested Fix**: Pass `windowState` from the server component (the group page already calls `computeWindowOpen` and `computeDeadline`) similar to how `PredictPageWindowBadge` receives it.

#### QA-007: `PreWindowBanner` `isExpired` from `useCountdown(null)` defaults to `true`
- **File**: `web-app/src/components/prediction/pre-window-banner.tsx` (lines 40-42, 48-52)
- **Description**: When `isMatchDay` is false, `useCountdown(null)` returns `isExpired: true`. If `isMatchDay` transitions from false to true at midnight IST (React re-render from parent), there's a brief moment where `isExpired` is still `true` from the previous null invocation before `useCountdown` re-runs its effect. The `useEffect` would fire `setHasTransitioned(true)` prematurely, showing the "Window just opened" transition.
- **Impact**: Extremely unlikely in practice (user would need the predict page open at exactly midnight IST on match day). But the code doesn't fully guard against this scenario.
- **Suggested Fix**: Add `windowOpenDate <= new Date()` to the transition condition:
  ```typescript
  useEffect(() => {
    if (isMatchDay && isExpired && !hasTransitioned && new Date() >= windowOpenDate) {
      setHasTransitioned(true);
    }
  }, [isMatchDay, isExpired, hasTransitioned, windowOpenDate]);
  ```

---

### Notes

#### QA-008: Custom deadline not fetched for group page match cards
- **File**: `web-app/src/app/group/[groupId]/page.tsx` (line 108)
- **Description**: `computeDeadline(match.date, match.time_ist)` is called without the custom deadline from `match_group_settings`. This means the `windowClose` passed to `WindowStatusIndicator` always uses the default 45-minute deadline, ignoring any admin-set custom deadline.
- **Impact**: If an admin sets a custom deadline (e.g., 6 PM IST), the group page countdown will show the wrong close time. The predict page correctly fetches settings and passes the custom deadline.
- **Note**: This is a pre-existing gap -- the group page never fetched custom deadlines before this feature either. The code review noted it as SUGGESTION-6. Not a regression.

#### QA-009: RLS UPDATE policy missing `scenarios_published` check
- **File**: `supabase/migrations/036_prediction_window.sql` (lines 57-71)
- **Description**: The UPDATE policy does not include `COALESCE(mgs.scenarios_published, false) = true`, while the INSERT policy does. This is consistent with the pre-existing policy from migration 017.
- **Note**: Pre-existing gap, not a regression. Tracked in code review as SUGGESTION-3.

#### QA-010: `computeWindowOpen` returns epoch for invalid dates (fail-open semantics)
- **File**: `web-app/src/lib/utils.ts` (line 69)
- **Description**: `computeWindowOpen("invalid")` returns `new Date(0)`. Since `now >= new Date(0)` is always true, the window-open check alone would pass. However, `computeDeadline("invalid", ...)` also returns `new Date(0)`, and `now < new Date(0)` is always false. Combined in `isWindowOpen`, the result is `true && false = false`. So the overall behavior is fail-closed.
- **Note**: While the individual function has fail-open semantics, the combined usage is fail-closed because the deadline check provides the safety net. The unit test confirms `isWindowOpen("invalid", "19:30")` returns false.

---

## 7. Accessibility Verification

| Check | Status | Evidence |
|-------|--------|----------|
| `aria-live="polite"` on countdowns | PASS | `WindowStatusIndicator` lines 115, 178. `PredictPageWindowBadge` line 64. `PreWindowBanner` line 119. |
| `role="status"` on informational banners | PASS | `WindowStatusIndicator` line 165 (match day). `PreWindowBanner` lines 57, 88. |
| `aria-label` on PreWindowBanner | PASS | Lines 58 ("Prediction window is now open") and 89 ("Prediction window not yet open"). |
| Icons have `aria-hidden="true"` | PASS | All `Clock` and `Lock` icons have `aria-hidden="true"`. |
| Text provides redundant cues (not color-only) | PASS | Clock icon + text for pre-window. Lock icon + text for closed. |
| CTA button keyboard navigable | PASS | Uses `<Link>` (inherently focusable) in `WindowStatusIndicator` line 104. |
| `autoFocus` on transition CTA | PASS | `PreWindowBanner` line 76: "Start Predicting" button has `autoFocus`. |
| `role="alert"` on error messages | PASS | `PredictionForm` line 212: error span has `role="alert"`. |

---

## 8. Mobile Responsiveness Verification

| Pattern | Component | Evidence |
|---------|-----------|----------|
| Full-width mobile, auto-width desktop | `WindowStatusIndicator` CTA | `w-full sm:w-auto` (line 106) |
| Responsive padding | `PreWindowBanner` | `p-6 sm:p-8` (lines 59, 90) |
| Flex column stacking | `WindowStatusIndicator` | `flex flex-col gap-2` (lines 75, 89, 103, 148, 163, 193) |
| Text sizing | All components | `text-xs`, `text-sm` -- consistent with existing mobile patterns |
| No fixed widths | All components | No `w-[Npx]` or `min-w-[Npx]` patterns that would cause overflow |

**Verdict**: Responsive patterns are consistent with existing codebase. No concerns for 320px+ viewports.

---

## 9. Backwards Compatibility Verification

| Check | Status |
|-------|--------|
| Existing predictions in database unaffected | PASS -- Migration 036 has no DELETE/UPDATE statements on data |
| SELECT RLS policy unchanged | PASS -- `read_others_after_deadline` and `read_own_predictions` not modified |
| `computeDeadline` function unchanged | PASS -- No modifications to function signature or behavior |
| `isDeadlinePassed` function unchanged | PASS -- No modifications |
| `prediction_deadline()` SQL function unchanged | PASS -- Not touched by migration 036 |
| Completed matches rendering | PASS -- `CompletedMatchesSection` code unchanged |
| Prediction reveal table | PASS -- No changes to reveal table components or DAL functions |
| `match-cron` auto-lock | PASS -- No changes to Edge Functions |
| Scenario seeding before window | PASS -- `seedSystemScenarios` (predict page line 51) runs regardless of window state |

---

## 10. Security Review

### Triple-Layer Enforcement Matrix

| Attack Vector | Layer 1 (UI) | Layer 2 (Server Action) | Layer 3 (RLS) |
|---------------|-------------|------------------------|----------------|
| Submit before 8 AM via UI | Blocked: form suppressed, no CTA button | Blocked: `new Date() < windowOpen` check | Blocked: `now() >= prediction_window_open(m.date)` |
| Submit before 8 AM via direct action call | N/A | Blocked: same check | Blocked: same check |
| Submit before 8 AM via direct Supabase call | N/A | N/A | Blocked: RLS `prediction_window_open` |
| Submit after deadline | Blocked: form auto-locks | Blocked: `isDeadlinePassed` | Blocked: `prediction_deadline` |
| Unauthenticated access to predict page | Blocked: layout auth guard | Blocked: `auth.getUser()` check | Blocked: `auth.uid()` in RLS |
| Non-member access | Blocked: layout membership check | Blocked: `getMembershipStatus` check | Blocked: `is_group_member()` in RLS |

### Security Check Order in Server Action

1. Zod validation (malformed input)
2. Authentication (`auth.getUser()`)
3. Group membership (`getMembershipStatus`)
4. Match status (must be "upcoming")
5. Admin lock (`is_locked`)
6. Window open (new -- `computeWindowOpen`)
7. Deadline passed (existing -- `isDeadlinePassed`)
8. Scenario validation

Order is correct: most fundamental checks (auth) come first, most specific (window) come later.

### SQL Function Security

- `prediction_window_open()` is marked `IMMUTABLE` -- correct, same input always yields same output.
- The function is a pure calculation with no side effects.
- No SQL injection risk (takes `DATE` type parameter, not raw string).

---

## Positive Observations

1. **Clean separation of concerns**: Server components compute state; client components handle countdowns and transitions. No prop drilling of raw match data to client components.

2. **Excellent unit test coverage**: The 34 new tests thoroughly cover boundary conditions (exact 8 AM, exact deadline, midnight IST boundary, zero-duration window, invalid inputs). The lifecycle test that walks through all 4 states sequentially is particularly valuable.

3. **Copy centralization**: All user-facing text lives in `PREDICTION_WINDOW_COPY` constant. No magic strings scattered across components (with two minor exceptions noted in QA-004).

4. **Consistent RLS pattern**: Migration 036 follows the exact structure of the existing policies (017, 019, 020) and adds the window check cleanly. Rollback SQL is included in comments.

5. **Fail-closed behavior**: Invalid dates produce `new Date(0)` which, combined across both window-open and deadline checks, results in a fail-closed outcome (predictions blocked). Unit test explicitly verifies this.

6. **useCountdown conditionally activated**: In `WindowStatusIndicator` (post-code-review fix), countdowns pass `null` for zero-window scenarios, avoiding unnecessary intervals. `PredictPageWindowBadge` correctly conditionalizes both countdown hooks based on server-computed `windowState`.

7. **Backwards compatibility**: No existing data modified. No existing functions changed. SELECT policies untouched. The migration is purely additive.

---

## Recommendation

- [x] Merge after fixing major issues
- [ ] Ready to merge as-is
- [ ] Needs significant rework

**The implementation is solid.** The two code review blockers have been correctly fixed, all P0 requirements are implemented, triple-layer security enforcement is complete, and unit tests are thorough. The three major issues are all quality/robustness improvements:

1. **QA-001** (toLocaleString fragility) -- should be fixed before production deployment to avoid runtime-specific failures.
2. **QA-002** (en-IN vs en-US date format) -- should be fixed to match the approved copy spec.
3. **QA-003** (missing analytics constants) -- should be added for spec completeness.

None of the major issues are blocking for functionality or security. The minor issues are "nice to have" improvements that can be addressed in a follow-up.
