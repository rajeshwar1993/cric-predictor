# Code Review: Prediction Window
**Reviewer**: PSE Agent (Code Review Mode)
**Date**: 2026-03-29
**Branch**: `feature/prediction-window`
**Status**: Review Complete

---

## Summary

The Prediction Window feature introduces a lower-bound time gate (8:00 AM IST on match day) for predictions. The implementation spans 11 files: 4 new, 7 modified. Overall, the code is well-structured, follows existing patterns, and correctly implements the requirements. However, there are two blockers, several warnings, and a handful of suggestions.

### Files Reviewed

**New files:**
- `supabase/migrations/036_prediction_window.sql`
- `web-app/src/components/prediction/window-status-indicator.tsx`
- `web-app/src/components/prediction/predict-page-window-badge.tsx`
- `web-app/src/components/prediction/pre-window-banner.tsx`

**Modified files:**
- `web-app/src/types/index.ts`
- `web-app/src/lib/constants.ts`
- `web-app/src/lib/utils.ts`
- `web-app/src/lib/actions/predictions.ts`
- `web-app/src/app/group/[groupId]/page.tsx`
- `web-app/src/app/group/[groupId]/predict/[matchId]/page.tsx`
- `web-app/src/components/prediction/prediction-form.tsx`

---

## Findings

### BLOCKER-1: `setState` called during render in `WindowStatusIndicator`

**File**: `web-app/src/components/prediction/window-status-indicator.tsx` (lines 144-146)

```typescript
// State 2 -> 3 transition: window just opened
if (isMatchDay && windowHasOpened && !showTransition) {
  setShowTransition(true);  // <-- setState during render body
}
```

**Impact**: Calling `setState` during the render phase causes React to immediately re-render the component. While React 18+ tolerates this for "state derived from props" patterns, this specific usage is problematic because `windowHasOpened` and `isMatchDay` are derived from hooks and runtime Date comparisons that change over time -- not from props. This creates a render loop risk: the component renders, detects the condition, sets state, triggers re-render, detects the condition again. Currently it's saved by `!showTransition` guard, but this pattern is fragile and triggers a React strict-mode warning.

The same pattern appears in `pre-window-banner.tsx` (lines 47-49):
```typescript
if (isMatchDay && isExpired && !hasTransitioned) {
  setHasTransitioned(true);
}
```

**Fix**: Move the transition detection into a `useEffect`:

```typescript
useEffect(() => {
  if (isMatchDay && windowHasOpened && !showTransition) {
    setShowTransition(true);
  }
}, [isMatchDay, windowHasOpened, showTransition]);
```

Same fix for `PreWindowBanner`.

---

### BLOCKER-2: Missing unit tests for new utility functions

**File**: `web-app/src/lib/utils.test.ts`

The technical architecture explicitly requires unit tests for `computeWindowOpen`, `isWindowOpen`, `getWindowState`, and `formatWindowDate` (Section 12.1). The existing test file imports only the pre-existing utility functions. **No tests for any of the new window functions were added.**

These are the core business logic functions that determine whether a user can submit predictions. Incorrect behavior at this layer (e.g., timezone edge case, zero-duration window, `NaN` fallback) would silently break the feature for all users.

**Required tests** (per architecture doc):
- `computeWindowOpen`: returns 8 AM IST (2:30 AM UTC), handles invalid date, returns epoch fallback
- `isWindowOpen`: false before 8 AM, true at 8 AM, true during window, false after deadline, respects custom deadline, false for zero-duration
- `getWindowState`: returns all 4 states correctly, handles zero-duration window, handles same-day comparison
- `formatWindowDate`: returns "Apr 6" format

---

### WARNING-1: `WindowStatusIndicator` always runs two `useCountdown` intervals regardless of state

**File**: `web-app/src/components/prediction/window-status-indicator.tsx` (lines 54-59)

```typescript
const { display: openDisplay, isExpired: windowHasOpened } =
  useCountdown(windowOpenDate);  // Always active

const { display: closeDisplay, isExpired: deadlinePassed } =
  useCountdown(windowCloseDate); // Always active
```

Both countdowns run 1-second intervals even when they're not needed. For a future-day match, neither countdown is displayed, but both tick every second. With up to 3 match cards on the group page, this means 6 intervals running constantly.

**Contrast with** `PredictPageWindowBadge` (lines 36-43), which correctly conditionalizes:
```typescript
const { display: openDisplay } = useCountdown(
  windowState === "PRE_WINDOW_MATCH_DAY" ? windowOpenDate : null
);
```

**Fix**: Pass `null` instead of the Date when the countdown is not needed for the current state. The `useCountdown` hook already handles `null` by returning immediately with no interval.

```typescript
// Only run openDisplay countdown on match day before window opens
const { display: openDisplay, isExpired: windowHasOpened } =
  useCountdown(!deadlinePassed && !isZeroWindow ? windowOpenDate : null);

// Only run closeDisplay countdown after window has opened
const { display: closeDisplay, isExpired: deadlinePassed } =
  useCountdown(!isZeroWindow ? windowCloseDate : null);
```

Note: this requires restructuring the component logic since `deadlinePassed` is currently derived from `useCountdown`. A cleaner approach would be to accept a server-computed `windowState` prop (like `PredictPageWindowBadge` does) and use that to determine which countdown to activate.

---

### WARNING-2: Unused prop `matchTimeIst` in `WindowStatusIndicator`

**File**: `web-app/src/components/prediction/window-status-indicator.tsx` (line 43)

```typescript
matchTimeIst: _matchTimeIst,
```

The `matchTimeIst` prop is destructured with an underscore prefix and never used. It's in the interface but serves no purpose since the deadline is already precomputed server-side as `windowClose`.

**Fix**: Remove `matchTimeIst` from the interface and the component destructuring. Update the call site in `group/[groupId]/page.tsx` to stop passing it. Unused props add confusion for future maintainers.

---

### WARNING-3: Unused type import in predict page

**File**: `web-app/src/app/group/[groupId]/predict/[matchId]/page.tsx` (line 19)

```typescript
import type { WindowState } from "@/types";
```

The `WindowState` type is imported but never used directly in this file. The `windowState` variable gets its type inferred from the return type of `getWindowState()`, and the string comparisons work without the explicit type.

**Fix**: Remove the unused import to keep the module clean. TypeScript strict mode with `noUnusedLocals` would catch this.

---

### WARNING-4: Analytics event constants not added to `posthog/events.ts`

**File**: `web-app/src/lib/posthog/events.ts`

The technical architecture (Section 4.3) and copy spec both specify 4 analytics event constants to be added:
- `PREDICTION_WINDOW_NOT_OPEN_VIEWED`
- `PREDICTION_WINDOW_OPENED`
- `PREDICTION_WINDOW_CLOSED_VIEWED`
- `PREDICTION_EARLY_SUBMIT_BLOCKED`

These were not added. While the events themselves are not emitted in the current implementation (the tech architecture notes this as a separate concern), the constants should be present for consistency with the spec and to avoid a follow-up PR.

**Fix**: Add the 4 constants to `ANALYTICS_EVENTS` in `events.ts`.

---

### WARNING-5: `isUrgent` calculation in `WindowStatusIndicator` uses stale `now` value

**File**: `web-app/src/components/prediction/window-status-indicator.tsx` (lines 65, 69-71)

```typescript
const now = Date.now();  // Captured once during render
// ...
const isUrgent =
  !deadlinePassed &&
  windowCloseDate.getTime() - now < 60 * 60 * 1000;
```

`now` is captured once at render time and never updates. The `useCountdown` hook updates every second (triggering re-renders), but `isUrgent` may flip between true/false unpredictably since `now` is recalculated on each render but not synchronized with the countdown.

This is a minor cosmetic issue since the urgency flag only controls `animate-pulse`, but it could cause the pulse animation to flicker at the 1-hour boundary.

**Fix**: Derive `isUrgent` from the `closeDisplay` string or the remaining time computed inside the countdown, rather than from an independently captured `Date.now()`. Alternatively, simply compute it as:
```typescript
const isUrgent = !deadlinePassed && windowCloseDate.getTime() - Date.now() < 60 * 60 * 1000;
```
This is effectively the same, but making it a getter function or deriving from countdown output would be more robust.

The same pattern exists in `PredictPageWindowBadge` (line 49) but is less problematic there because the component re-renders from `useCountdown`.

---

### WARNING-6: `toLocaleString` for IST date comparison is fragile on edge environments

**File**: `web-app/src/lib/utils.ts` (lines 117-118), `window-status-indicator.tsx` (lines 134-135)

```typescript
const todayIST = new Date(
  now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
);
```

This pattern works in Node.js and modern browsers, but has known issues:
1. The output format of `toLocaleString` is locale-dependent and not guaranteed to be parseable by the `Date` constructor across all environments.
2. Some serverless/edge runtimes (e.g., older Cloudflare Workers) have limited ICU data and may not support `Asia/Kolkata` timezone.
3. Parsing the string back into a Date introduces an unnecessary round-trip and potential precision loss.

**Fix**: Use explicit UTC offset arithmetic instead:
```typescript
// IST is always UTC+05:30 (no DST in India)
const istOffsetMs = 5.5 * 60 * 60 * 1000;
const nowIST = new Date(now.getTime() + istOffsetMs);
const matchDayIST = new Date(new Date(match.date + "T00:00:00+05:30").getTime() + istOffsetMs);

const isSameDay =
  nowIST.getUTCFullYear() === matchDayIST.getUTCFullYear() &&
  nowIST.getUTCMonth() === matchDayIST.getUTCMonth() &&
  nowIST.getUTCDate() === matchDayIST.getUTCDate();
```

This is deterministic, does not depend on locale data, and works in all JavaScript environments.

---

### WARNING-7: `PreWindowBanner` uses `isExpired` from countdown which defaults to `true` when `null` is passed

**File**: `web-app/src/components/prediction/pre-window-banner.tsx` (lines 40-42, 47)

```typescript
const { display, isExpired } = useCountdown(
  isMatchDay ? windowOpenDate : null
);

if (isMatchDay && isExpired && !hasTransitioned) {
```

When `isMatchDay` is `false`, `useCountdown(null)` returns `isExpired: true`. However, the transition guard checks `isMatchDay && isExpired`, so this is safe. But if the component re-renders and `isMatchDay` transitions from `false` to `true` (e.g., at midnight IST), `isExpired` would momentarily be `true` (from the previous `null` invocation) before `useCountdown` re-runs its effect with the new non-null date. This could cause a flash of the "window just opened" transition state.

**Severity**: Low -- users are unlikely to have the predict page open at midnight. But worth noting for correctness.

**Fix**: Add an explicit check that `windowOpenDate <= new Date()` in the transition condition, rather than relying solely on `isExpired` from the hook.

---

### SUGGESTION-1: Consider accepting `windowState` as a prop in `WindowStatusIndicator`

**File**: `web-app/src/components/prediction/window-status-indicator.tsx`

The `PredictPageWindowBadge` accepts `windowState` as a server-computed prop and uses it to conditionally activate countdowns. By contrast, `WindowStatusIndicator` re-derives the window state client-side using `Date.now()`, `useCountdown`, and `toLocaleString`. This duplication:

1. Creates a subtle inconsistency: the server may compute `PRE_WINDOW_FUTURE` but the client could compute `PRE_WINDOW_MATCH_DAY` if the user's system clock is slightly ahead.
2. Makes the component harder to test (depends on real time instead of a prop).
3. Results in the `toLocaleString` fragility noted in WARNING-6.

**Suggestion**: Pass `windowState` as a prop from the server (the group page already calls `computeWindowOpen` and `computeDeadline`) and use it the same way `PredictPageWindowBadge` does. The group page server component would call `getWindowState()` for each match and pass it down.

---

### SUGGESTION-2: `computeWindowOpen` fallback to epoch for invalid dates

**File**: `web-app/src/lib/utils.ts` (line 69)

```typescript
if (isNaN(windowOpen.getTime())) return new Date(0); // Invalid -> treat as already passed
```

Returning `new Date(0)` (January 1, 1970) means an invalid date is treated as "window already passed" which makes `now >= windowOpen` always `true`. This is a "fail open" behavior -- an invalid matchDate would allow predictions at any time (the deadline check is the only remaining gate).

This contrasts with `computeDeadline` which also returns `new Date(0)` for invalid inputs, but since the deadline check is `now > deadline`, `new Date(0)` means "deadline already passed" (fail closed). The combination works (window open + deadline passed = `isWindowOpen` returns false), but the semantics of `computeWindowOpen` alone are misleading.

**Suggestion**: Add a comment clarifying that this is intentional because the deadline check provides the fail-closed safety net, or consider returning `new Date(8640000000000000)` (max date) to make the window "never open" for invalid dates (fail closed independently).

---

### SUGGESTION-3: RLS UPDATE policy missing `scenarios_published` check

**File**: `supabase/migrations/036_prediction_window.sql` (lines 57-71)

The UPDATE policy does not include `COALESCE(mgs.scenarios_published, false) = true`, while the INSERT policy does. This is consistent with the *existing* policy from migration 017 (which also lacks it), so it's not a regression. However, it means a user could theoretically update a prediction for an unpublished scenario if they somehow have an existing prediction row.

**Suggestion**: Consider adding `scenarios_published` to the UPDATE policy for defense-in-depth. This is outside the scope of this feature but worth tracking.

---

### SUGGESTION-4: Copy constant `PREDICT_PRE_WINDOW_BADGE` not used with correct copy spec format

**File**: `web-app/src/components/prediction/predict-page-window-badge.tsx` (lines 80-86)

For `PRE_WINDOW_MATCH_DAY`, the badge renders:
```tsx
<span aria-live="polite">Opens in {openDisplay}</span>
```

The copy spec defines `CARD_PRE_WINDOW_TODAY_COUNTDOWN: "Opens in {countdown}"` and `PREDICT_PRE_WINDOW_BADGE: "Opens {matchDate} at 8:00 AM"`. The badge for match-day pre-window uses a hardcoded "Opens in" prefix instead of interpolating from the constant.

**Suggestion**: Use `PREDICTION_WINDOW_COPY.CARD_PRE_WINDOW_TODAY_COUNTDOWN.replace("{countdown}", openDisplay)` for consistency with the copy system.

---

### SUGGESTION-5: `formatWindowDate` produces locale-dependent output

**File**: `web-app/src/lib/utils.ts` (lines 136-142)

```typescript
return new Date(matchDate + "T00:00:00+05:30").toLocaleDateString("en-IN", {
  month: "short",
  day: "numeric",
  timeZone: "Asia/Kolkata",
});
```

The `en-IN` locale may produce different output across environments (e.g., "6 Apr" vs "Apr 6"). On Node.js with full ICU, `en-IN` typically produces "6 Apr" (day first), while the copy spec examples use "Apr 6" (month first, which is `en-US` format).

**Suggestion**: Use `en-US` locale to match the copy spec examples, or verify that the current output matches the expected format in the deployed environment.

---

### SUGGESTION-6: Group page `deadline` variable computed but only used for `windowClose`

**File**: `web-app/src/app/group/[groupId]/page.tsx` (line 108)

```typescript
const deadline = computeDeadline(match.date, match.time_ist);
```

This is correct, but note that `computeDeadline` is called without `settings?.prediction_deadline` (the custom deadline override). The group page does not fetch match_group_settings for each match. This means the `windowClose` passed to `WindowStatusIndicator` will always use the default deadline, ignoring any admin-set custom deadline.

The existing behavior (before this PR) also did not account for custom deadlines on the group page, so this is not a regression. But it means the group page countdown may show an incorrect close time for matches with admin-overridden deadlines.

**Suggestion**: If custom deadlines need to be reflected on the group page, the settings would need to be fetched per match. This is a pre-existing gap and could be addressed separately.

---

### SUGGESTION-7: Consider `display: "block"` for `WindowStatusIndicator` root wrapper on mobile

**File**: `web-app/src/components/prediction/window-status-indicator.tsx`

All states wrap content in `<div className="flex flex-col gap-2">`. This is fine for stacking, but the `Link` button inside (line 110) uses `w-full sm:w-auto`. The parent `flex flex-col` should naturally allow full-width on mobile. Verified: this looks correct. No action needed.

---

## Security Review

### Triple-Layer Enforcement: COMPLETE

| Layer | Status | Notes |
|---|---|---|
| **UI** | Implemented | `WindowStatusIndicator` suppresses CTA before window. `PreWindowBanner` replaces form. `PredictionForm` disabled when locked. |
| **Server Action** | Implemented | `submitPredictions` checks `computeWindowOpen()` and returns `ERROR_WINDOW_NOT_OPEN` before 8 AM. Existing `isDeadlinePassed` check retained for upper bound. |
| **RLS** | Implemented | `036_prediction_window.sql` adds `now() >= prediction_window_open(m.date)` to both INSERT and UPDATE policies. |

**Bypass analysis**: A malicious user who removes the UI disabled state and calls the server action directly will be rejected at the action layer (line 52-55 of predictions.ts). A malicious user who bypasses the action layer and calls Supabase directly will be rejected by RLS. The triple-layer defense is intact.

**Backwards compatibility**: The migration adds a constraint to INSERT/UPDATE policies but does not modify SELECT or DELETE. Existing prediction rows are unaffected (FR-008 satisfied).

---

## Performance Review

| Concern | Status |
|---|---|
| No new database queries for window computation | PASS -- pure date math |
| SQL function marked IMMUTABLE | PASS -- PostgreSQL can optimize |
| No N+1 queries | PASS -- settings fetched in parallel |
| Unnecessary re-renders | WARNING-1 (2 intervals always running) |
| Bundle size | PASS -- 3 new components are small, tree-shakeable |

---

## Accessibility Review

| Requirement | Status | Notes |
|---|---|---|
| `aria-live="polite"` on countdowns | PASS | All countdown text uses `aria-live="polite"` |
| `role="status"` on informational banners | PASS | `PreWindowBanner` and match-day indicator use `role="status"` |
| Icons have `aria-hidden="true"` | PASS | All Clock and Lock icons properly hidden |
| Text provides redundant cues (not color-only) | PASS | Icons + text in all states |
| Keyboard navigation for CTA | PASS | Uses `<Link>` (inherently focusable) and `<button>` |
| `autoFocus` on transition CTA | PASS | "Start Predicting" button in `PreWindowBanner` |

---

## Verdict

**Not ready to merge.** Two blockers must be addressed:

1. **BLOCKER-1**: `setState` during render in `WindowStatusIndicator` and `PreWindowBanner` -- must be moved to `useEffect`.
2. **BLOCKER-2**: Missing unit tests for the 4 new utility functions in `utils.ts` -- these are the core business logic and must be tested.

After fixing the blockers, the warnings (especially WARNING-1 for unnecessary intervals and WARNING-6 for fragile `toLocaleString`) should be addressed before shipping to production. The suggestions are quality improvements that can be addressed in a follow-up.

---

## Finding Summary

| # | Severity | Component | Finding |
|---|---|---|---|
| BLOCKER-1 | Blocker | `WindowStatusIndicator`, `PreWindowBanner` | `setState` called during render -- must use `useEffect` |
| BLOCKER-2 | Blocker | `utils.test.ts` | No unit tests for new utility functions |
| WARNING-1 | Warning | `WindowStatusIndicator` | Two countdown intervals always running regardless of state |
| WARNING-2 | Warning | `WindowStatusIndicator` | Unused `matchTimeIst` prop |
| WARNING-3 | Warning | Predict page | Unused `WindowState` type import |
| WARNING-4 | Warning | `posthog/events.ts` | Missing 4 analytics event constants from spec |
| WARNING-5 | Warning | `WindowStatusIndicator` | `isUrgent` uses stale `now` value |
| WARNING-6 | Warning | `utils.ts`, `WindowStatusIndicator` | `toLocaleString` for IST date comparison is fragile |
| WARNING-7 | Warning | `PreWindowBanner` | `isExpired` from null countdown could flash on day transition |
| SUGGESTION-1 | Suggestion | `WindowStatusIndicator` | Accept `windowState` prop like `PredictPageWindowBadge` |
| SUGGESTION-2 | Suggestion | `utils.ts` | `computeWindowOpen` returns epoch (fail-open) for invalid dates |
| SUGGESTION-3 | Suggestion | RLS migration | UPDATE policy missing `scenarios_published` check (pre-existing) |
| SUGGESTION-4 | Suggestion | `PredictPageWindowBadge` | Match-day badge uses hardcoded copy instead of constant |
| SUGGESTION-5 | Suggestion | `utils.ts` | `formatWindowDate` locale may produce "6 Apr" instead of "Apr 6" |
| SUGGESTION-6 | Suggestion | Group page | Custom deadline not fetched for group page match cards (pre-existing) |
| SUGGESTION-7 | Suggestion | `WindowStatusIndicator` | Mobile layout confirmed correct -- no action needed |
