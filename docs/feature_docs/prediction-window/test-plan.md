# Test Plan: Prediction Window
**QA Engineer**: QA Agent
**Date**: 2026-03-29
**Requirements Doc Version**: Draft, 2026-03-29
**Technical Architecture Version**: Draft, 2026-03-29

---

## 1. Test Scope

### In Scope
- Window state calculation logic: `computeWindowOpen()`, `isWindowOpen()`, `getWindowState()`, `formatWindowDate()`
- Server action validation: `submitPredictions` window-open check (FR-006)
- RLS policy enforcement: `prediction_window_open()` SQL function and updated INSERT/UPDATE policies (FR-007)
- Group page `WindowStatusIndicator` component: 4 states (pre-window future, pre-window match day, window open, window closed) (FR-010)
- Predict page `PredictPageWindowBadge` component: 3 states (pre-window, open, closed) (FR-012, FR-013)
- Predict page `PreWindowBanner` component: form suppression when pre-window (FR-015)
- Predict page header countdown replacing static time display
- PredictionForm `deadline` prop: auto-lock when deadline passes during active session (FR-017)
- Removal of "Predict Early" button (FR-009)
- Client-side real-time transitions at 8 AM and deadline boundaries (FR-016)
- Copy constants: all `PREDICTION_WINDOW_COPY` values rendered correctly per state
- Edge cases: double-headers, rescheduled matches, zero-duration windows, 8 AM boundary, custom deadline interactions
- Mobile responsiveness (320px to desktop)
- Accessibility (aria-live, role, keyboard navigation, screen reader)
- Backwards compatibility: existing predictions unaffected (FR-008)
- Timezone correctness: all calculations use IST (UTC+05:30) explicitly

### Out of Scope
- Admin-configurable window open time (v2)
- Push notifications for window open/close (v2)
- Partial predictions before the window (v2)
- Per-scenario windows (v2)
- User timezone preferences (v2)
- `sync-data` Edge Function changes (none required)
- match-cron auto-lock behavior (unchanged)

---

## 2. Test Cases

### 2.1 Happy Path

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|------------------------------------------------------|------------------------------------------------------|
| TC-001 | `computeWindowOpen` returns 8 AM IST for a valid date | 1. Call `computeWindowOpen("2026-04-01")` | Returns `Date` equivalent to `2026-04-01T02:30:00.000Z` (8 AM IST = 2:30 AM UTC) |
| TC-002 | `isWindowOpen` returns true during window | 1. Set system time to `2026-04-01T08:00:00+05:30` (8 AM IST). 2. Call `isWindowOpen("2026-04-01", "19:30:00")` | Returns `true`. Match deadline is 18:45 IST, current time is within [8:00 AM, 18:45) |
| TC-003 | `isWindowOpen` returns false before window | 1. Set system time to `2026-04-01T07:59:00+05:30` (7:59 AM IST). 2. Call `isWindowOpen("2026-04-01", "19:30:00")` | Returns `false` |
| TC-004 | `isWindowOpen` returns false after deadline | 1. Set system time to `2026-04-01T18:46:00+05:30`. 2. Call `isWindowOpen("2026-04-01", "19:30:00")` | Returns `false` |
| TC-005 | `getWindowState` returns PRE_WINDOW_FUTURE | 1. Set system time to `2026-03-30T10:00:00+05:30`. 2. Call `getWindowState({ date: "2026-04-01", time_ist: "19:30:00" })` | Returns `"PRE_WINDOW_FUTURE"` |
| TC-006 | `getWindowState` returns PRE_WINDOW_MATCH_DAY | 1. Set system time to `2026-04-01T06:00:00+05:30`. 2. Call `getWindowState({ date: "2026-04-01", time_ist: "19:30:00" })` | Returns `"PRE_WINDOW_MATCH_DAY"` |
| TC-007 | `getWindowState` returns WINDOW_OPEN | 1. Set system time to `2026-04-01T10:00:00+05:30`. 2. Call `getWindowState({ date: "2026-04-01", time_ist: "19:30:00" })` | Returns `"WINDOW_OPEN"` |
| TC-008 | `getWindowState` returns WINDOW_CLOSED | 1. Set system time to `2026-04-01T19:00:00+05:30`. 2. Call `getWindowState({ date: "2026-04-01", time_ist: "19:30:00" })` | Returns `"WINDOW_CLOSED"` |
| TC-009 | `submitPredictions` succeeds during window | 1. Set server time within window. 2. Call `submitPredictions` with valid group, match, predictions. 3. Match is upcoming, not locked, scenarios published | Returns `{ success: true }`. Predictions upserted to DB. |
| TC-010 | Group page shows "Make Your Calls" during window | 1. Navigate to group page with match that has window open. 2. Observe the match card | CTA button reads "Make Your Calls". Countdown text reads "Closes in {countdown}". Button links to predict page. |
| TC-011 | Predict page shows interactive form during window | 1. Navigate to predict page during window. 2. Observe header badge and form | Header badge shows "Closes in {countdown}". Form is interactive. Scenario cards are enabled. Submit button is enabled. |
| TC-012 | User submits prediction during window successfully | 1. Navigate to predict page during window. 2. Select picks for scenarios. 3. Tap "Lock It In" | Predictions saved. User redirected to group page. |
| TC-013 | Group page shows pre-window status for future match | 1. Navigate to group page with match on a future date | Match card displays "Predictions open on {matchDate} at 8:00 AM". No CTA button. Clock icon visible. |
| TC-014 | Group page shows pre-window status on match day before 8 AM | 1. Navigate to group page at 6 AM IST on match day | Match card displays "Predictions open at 8:00 AM" with "Opens in {countdown}" counting down to 8 AM. No CTA button. |
| TC-015 | Group page shows locked status after deadline | 1. Navigate to group page after match deadline | Match card displays "Predictions Locked" with Lock icon. No CTA button. |
| TC-016 | Predict page shows PreWindowBanner before window | 1. Navigate directly to predict URL before window opens | Banner shows "Not Open Yet" title. Body text: "Predictions open at 8:00 AM IST on {matchDate}...". No prediction form rendered. No scenario cards. No sticky submit bar. |
| TC-017 | Predict page shows locked form after deadline | 1. Navigate to predict page after window closes | Existing locked behavior: "Predictions Locked" banner, form is disabled. |
| TC-018 | `formatWindowDate` formats correctly | 1. Call `formatWindowDate("2026-04-06")` | Returns something like "6 Apr" (short month + day in en-IN locale) |

### 2.2 Edge Cases

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|------------------------------------------------------|------------------------------------------------------|
| TC-101 | Double-header day: two matches, both open at 8 AM | 1. Two matches on same date: Match A at 15:30 IST, Match B at 19:30 IST. 2. Set time to 10:00 AM IST. 3. Check group page | Both match cards show "Make Your Calls". Match A shows "Closes in {countdownA}" (deadline 14:45 IST). Match B shows "Closes in {countdownB}" (deadline 18:45 IST). Independent countdowns. |
| TC-102 | Double-header: first match deadline passes, second still open | 1. Same setup as TC-101. 2. Set time to 15:00 IST (after Match A deadline 14:45, before Match B deadline 18:45) | Match A card shows "Predictions Locked". Match B card shows "Make Your Calls" with countdown. |
| TC-103 | Match rescheduled to different date | 1. Match originally on Apr 5, rescheduled to Apr 8. 2. Check on Apr 5 at 9 AM IST | Window is NOT open (match date is now Apr 8). Card shows "Predictions open on Apr 8 at 8:00 AM". Existing predictions remain in DB (no deletion). |
| TC-104 | Match time changed (7:30 PM to 3:30 PM) | 1. Match date Apr 1, time changed from 19:30 to 15:30. 2. Deadline shifts from 18:45 IST to 14:45 IST. 3. Set time to 15:00 IST | Window is closed (current time > new deadline 14:45). Card shows "Predictions Locked". |
| TC-105 | Exact 8 AM boundary: submit at 07:59:59 IST | 1. Set system time to `2026-04-01T07:59:59+05:30`. 2. Call `isWindowOpen("2026-04-01", "19:30:00")` | Returns `false`. Submission rejected. |
| TC-106 | Exact 8 AM boundary: submit at 08:00:00 IST | 1. Set system time to `2026-04-01T08:00:00+05:30`. 2. Call `isWindowOpen("2026-04-01", "19:30:00")` | Returns `true`. Submission accepted. |
| TC-107 | Exact deadline boundary: submit at deadline - 1 second | 1. Match at 19:30, deadline at 18:45 IST. 2. Set time to 18:44:59 IST. 3. Submit prediction | `isWindowOpen` returns `true`. Submission succeeds. |
| TC-108 | Exact deadline boundary: submit at deadline | 1. Set time to exactly 18:45:00 IST. 2. Submit prediction | `isWindowOpen` returns `false` (condition is `now < deadline`, not `<=`). Submission rejected. |
| TC-109 | Custom deadline before 8 AM (zero-duration window) | 1. Admin sets `prediction_deadline` to `2026-04-01T01:00:00Z` (6:30 AM IST). 2. Window open = 8 AM IST. Deadline < window open. 3. Call `getWindowState(...)` at any time | Returns `"WINDOW_CLOSED"`. The window never opens. Card shows "Predictions are locked for this match." |
| TC-110 | Morning match starts at 8 AM IST | 1. Match at 08:00 IST. Deadline = 07:15 IST. Window open = 08:00 IST. 2. Deadline < window open | `getWindowState` returns `"WINDOW_CLOSED"` at any time. Zero-duration window. |
| TC-111 | User bookmarks predict URL, visits days before match | 1. Match on Apr 10. User visits predict page on Apr 5 | PreWindowBanner displayed: "Not Open Yet". "Predictions open at 8:00 AM IST on Apr 10". No form rendered. No countdown (not match day). |
| TC-112 | User on predict page at 7:55 AM, waits until 8:01 AM | 1. Open predict page at 7:55 AM IST on match day. 2. PreWindowBanner with countdown visible. 3. Wait until 8:00 AM | At 8:00 AM, countdown expires. Banner transitions to "Window is now open -- tap to start predicting" with a CTA button. Tapping calls `router.refresh()`. After refresh, form is interactive. |
| TC-113 | User on group page at 7:59 AM, window opens at 8:00 AM | 1. Open group page at 7:59 AM IST on match day. 2. Pre-window match day indicator visible. 3. Wait until 8:00 AM | "Opens in" countdown reaches zero. Component transitions to "Window is now open -- tap to start" prompt. After tap/refresh, "Make Your Calls" CTA button appears. |
| TC-114 | User on predict page during window, deadline passes | 1. Open predict page with form active during window. 2. Deadline passes while user has page open | `useCountdown` on deadline triggers `isExpired=true`. Form auto-locks: inputs disabled, "Predictions Locked" banner appears, submit button disabled. No page refresh needed. (FR-017) |
| TC-115 | `computeWindowOpen` with invalid date string | 1. Call `computeWindowOpen("not-a-date")` | Returns `new Date(0)` (epoch). Fail-closed: treated as window already passed in the deep past. |
| TC-116 | `isWindowOpen` with malformed matchDate | 1. Call `isWindowOpen("invalid", "19:30:00")` | Returns `false`. Fail-closed behavior. |
| TC-117 | `isWindowOpen` with custom deadline that overrides close only | 1. Admin sets custom deadline to 6 PM IST. 2. Call `isWindowOpen("2026-04-01", "19:30:00", "2026-04-01T12:30:00Z")` at 9 AM IST | Returns `true`. Window is 8 AM to 6 PM IST (custom). The 8 AM open is NOT overridden. (FR-005) |
| TC-118 | Three upcoming matches, all show window status | 1. Group page with 3 upcoming matches on different dates. 2. Navigate to group page | All 3 match cards show window status indicators (not just the primary match). Each card independently shows its own window state. (OQ-4 decision) |
| TC-119 | Match status transitions from "upcoming" to "live" during window | 1. Match is upcoming, window is open. 2. `match-cron` sets status to "live" and `is_locked=true`. 3. User refreshes group page | Card shows live indicator + "Match is live -- predictions are locked". Predict page shows locked form. Existing behavior unchanged. (E10) |
| TC-120 | Server-client time mismatch: client thinks window is open, server disagrees | 1. Client clock is 5 minutes ahead of server. 2. Client shows "Make Your Calls" at what it thinks is 8:00 AM. 3. User submits prediction | Server rejects: "Predictions open at 8 AM on match day". Error displayed in sticky submit bar. |
| TC-121 | `getWindowState` IST date boundary: 11:30 PM IST, match is tomorrow | 1. Set system time to `2026-03-31T23:30:00+05:30` (March 31). 2. Match date is April 1 | `getWindowState` returns `"PRE_WINDOW_FUTURE"` -- correctly identifies today (Mar 31 IST) is different from match date (Apr 1). |
| TC-122 | `getWindowState` IST date boundary: 12:30 AM IST, match is today | 1. Set system time to `2026-04-01T00:30:00+05:30` (12:30 AM IST, April 1). 2. Match date is April 1 | `getWindowState` returns `"PRE_WINDOW_MATCH_DAY"` -- correctly identifies today is match day, but before 8 AM. |

### 2.3 Error Scenarios

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|------------------------------------------------------|------------------------------------------------------|
| TC-201 | `submitPredictions` rejected: window not open (too early) | 1. Set server time to 7 AM IST on match day. 2. Call `submitPredictions` with valid predictions | Returns `{ success: false, error: "Predictions open at 8 AM on match day" }` |
| TC-202 | `submitPredictions` rejected: deadline passed (too late) | 1. Set server time to 19:00 IST (after 18:45 deadline). 2. Call `submitPredictions` | Returns `{ success: false, error: "Too late -- the prediction window has closed" }` |
| TC-203 | `submitPredictions` rejected: match not upcoming | 1. Match status is "live". 2. Call `submitPredictions` | Returns `{ success: false, error: "Picks are closed for this match" }`. Existing behavior unchanged. |
| TC-204 | `submitPredictions` rejected: admin lock | 1. `is_locked = true`. 2. Call `submitPredictions` during window | Returns `{ success: false, error: "Picks are locked for this match" }`. Existing behavior unchanged. |
| TC-205 | Error message displayed in form sticky bar | 1. User on predict page during apparent window. 2. Server rejects with "Predictions open at 8 AM on match day". 3. Observe UI | Error message appears in the sticky submit bar in red text with `role="alert"`. Form remains on screen. |
| TC-206 | RLS rejects INSERT before 8 AM (bypass UI) | 1. Directly call Supabase INSERT on predictions table at 7 AM IST (bypassing server action). 2. All other conditions are met (member, upcoming, published) | RLS blocks the insert. `now() >= prediction_window_open(m.date)` fails. Insert returns error. |
| TC-207 | RLS rejects UPDATE before 8 AM | 1. Existing prediction row. 2. Directly call Supabase UPDATE at 7 AM IST | RLS blocks the update. Same `prediction_window_open` check fails. |
| TC-208 | Error ordering: window check comes before deadline check | 1. Time is 3 AM IST (before both window open and deadline). 2. Call `submitPredictions` | Error message should be "Predictions open at 8 AM on match day" (window-not-open), NOT "Too late" (deadline). The checks should distinguish early from late. |

### 2.4 Security

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|------------------------------------------------------|------------------------------------------------------|
| TC-301 | Triple-layer enforcement: UI + server action + RLS | 1. Verify client-side UI disables form pre-window. 2. Bypass UI and call server action directly pre-window. 3. Bypass server action and call Supabase directly pre-window | All three layers reject. UI shows pre-window banner (no form). Server action returns error. RLS blocks the write. |
| TC-302 | RLS INSERT policy includes window open check | 1. Read migration 036 SQL. 2. Verify `now() >= prediction_window_open(m.date)` is present in INSERT policy `WITH CHECK` clause | Condition is present. Direct Supabase inserts before 8 AM IST are blocked. |
| TC-303 | RLS UPDATE policy includes window open check | 1. Read migration 036 SQL. 2. Verify `now() >= prediction_window_open(m.date)` is present in UPDATE policy `USING` clause | Condition is present. Direct Supabase updates before 8 AM IST are blocked. |
| TC-304 | RLS SELECT policy unchanged | 1. Read migration 036 SQL. 2. Verify `read_others_after_deadline` SELECT policy is NOT modified | SELECT policy remains unchanged. Other users' predictions are visible after deadline/live, independent of window open time. |
| TC-305 | Client-side UI is cosmetic only | 1. Window status indicator shows "Predictions open at 8:00 AM" (pre-window). 2. Manipulate client JS to change state to "WINDOW_OPEN". 3. Attempt submission | Server action rejects with "Predictions open at 8 AM on match day". RLS also blocks. Client-side gating is defense-in-depth, not the sole gate. (NFR) |
| TC-306 | `prediction_window_open()` SQL function is IMMUTABLE | 1. Verify function declaration includes `IMMUTABLE` | Function is `IMMUTABLE`. PostgreSQL can cache/inline it for performance. Same input always yields same output. |
| TC-307 | Server action check order: auth -> membership -> status -> lock -> window -> deadline | 1. Call `submitPredictions` without auth | "Not authenticated" error (not window error). Auth checks come first. Security checks are ordered from most fundamental to most specific. |
| TC-308 | Unauthenticated user cannot access predict page with pre-window info | 1. Unauthenticated user navigates to predict URL | Redirected to login (existing auth guard in group layout). No window state information leaked. |

### 2.5 Performance

| ID | Scenario | Concern | Validation |
|--------|----------------------------------------------|------------------------------------------------------|------------------------------------------------------|
| TC-401 | `computeWindowOpen` is pure date math | Date construction should be sub-millisecond | Profile function: confirm <1ms execution. No database calls, no async, no I/O. |
| TC-402 | `isWindowOpen` is pure date comparison | Two date constructions + two comparisons | Profile function: confirm <1ms execution. No additional latency on page loads or server actions. |
| TC-403 | `getWindowState` adds no DB query | State computation from existing match data | Verify no new `fetch` or Supabase calls. Only date math on data already fetched by the page. |
| TC-404 | `prediction_window_open()` SQL function performance | Called in RLS policy on every INSERT/UPDATE | Function is `IMMUTABLE` and takes a single `DATE` parameter. PostgreSQL can inline/cache. No table scans. Should not measurably impact write latency. |
| TC-405 | `useCountdown` interval cleanup | Two `useCountdown` instances per `WindowStatusIndicator` | Verify intervals are cleared on component unmount (`clearInterval` in useEffect cleanup). No memory leaks across page navigations. |
| TC-406 | Group page with 3 match cards, each with WindowStatusIndicator | Three client component islands with countdowns | Verify no perceptible UI jank from 6 concurrent setInterval timers (2 per indicator). 1-second tick is low frequency. |
| TC-407 | No additional network requests for window state | Window state computed from data already fetched | Verify that `WindowStatusIndicator`, `PredictPageWindowBadge`, and `PreWindowBanner` make zero network requests. All data is passed as props from server components. |

---

## 3. Regression Risks

| Area Affected | Risk Level | Reason | Mitigation |
|----------------------------|------------|-------------------------------------------------------|------------------------------------------------------|
| Existing prediction submissions | **High** | RLS policies are being DROPped and re-CREATEd. Any typo in the new policy could block ALL predictions, not just pre-window ones. | Verify new policies include all existing conditions verbatim. Test that in-window submissions still succeed after migration. Run migration on staging before production. |
| "Make Your Calls" button on group page | **High** | The CTA link is being replaced by `WindowStatusIndicator`. If the component fails to render, users have no way to navigate to the predict page during the window. | Verify the `<Link>` element within `WindowStatusIndicator` WINDOW_OPEN state is identical in behavior (same href, same routing) to the old CTA button. |
| Predict page form rendering | **High** | Conditional rendering (`isPreWindow ? PreWindowBanner : PredictionForm`) introduces a code path where the form is not rendered. If `getWindowState` returns wrong state, the form could be suppressed when the window IS open. | Thorough unit tests for `getWindowState`. Integration test: confirm form renders during window. |
| `isDeadlinePassed` existing behavior | **Medium** | The architecture proposes either replacing the standalone `isDeadlinePassed` check with `isWindowOpen` check, or adding a separate window-open check. If the replacement approach is used, ensure deadline logic is not regressed. | The recommended approach (two separate checks) preserves `isDeadlinePassed` unchanged. Verify it is not removed or altered. |
| Custom deadline override | **Medium** | `customDeadline` overrides window close time. If `isWindowOpen` or `getWindowState` does not correctly pass through `customDeadline`, admin overrides could silently break. | Test with `customDeadline` set: verify window close uses custom time, window open remains 8 AM. |
| Existing `useCountdown` hook | **Low** | Hook is being reused but not modified. Two instances per `WindowStatusIndicator` is new usage pattern. | Verify hook handles two concurrent instances correctly. Verify null `targetDate` prop behavior (already returns `isExpired: true`). |
| Completed matches display | **Low** | Completed matches section is below upcoming matches on group page. No changes to that section. | Spot-check that completed matches still render after group page changes. |
| Prediction reveal / leaderboard | **Low** | `read_others_after_deadline` SELECT policy is unchanged. No changes to reveal flow. | Verify SELECT policy is literally not touched in migration 036. Spot-check that prediction reveal still works after deadline. |
| Scenario seeding | **Low** | `seedSystemScenarios` runs on predict page load. Architecture says it should still run even pre-window. | Verify the seed call is NOT gated by window state. Scenarios should be ready before 8 AM. |
| `match-cron` auto-lock | **Low** | No changes to the Edge Function. But auto-lock sets `is_locked=true`, which should override window state. | Verify that `is_locked=true` still locks predictions even if window would otherwise be open. |

---

## 4. Data Integrity Checks

- [ ] RLS policies verified for `predictions` table: INSERT policy includes `now() >= prediction_window_open(m.date)`.
- [ ] RLS policies verified for `predictions` table: UPDATE policy includes `now() >= prediction_window_open(m.date)`.
- [ ] RLS SELECT policy (`read_others_after_deadline`) is NOT modified by migration 036.
- [ ] `prediction_window_open()` SQL function returns correct TIMESTAMPTZ for known inputs (e.g., date `2026-04-01` returns `2026-04-01T02:30:00+00` which is 8 AM IST).
- [ ] `prediction_deadline()` SQL function is not modified by this migration.
- [ ] Existing prediction rows (with `submitted_at` before deployment) are not affected. No DELETE, no UPDATE in migration 036.
- [ ] Foreign key constraints on `predictions` table remain intact (no schema change to the table itself).
- [ ] `match_group_settings` table has no schema changes (no new columns in v1).
- [ ] No orphaned records possible: the migration only adds a function and updates policies, no table structure changes.
- [ ] Cascade delete behavior for predictions (via scenario FK) is unchanged.
- [ ] Migration 036 is additive: it creates a new function and replaces two policies. Rollback path: DROP the new function, re-create old policies from migrations 003/017/019.

---

## 5. Cross-Browser / Responsive

### Mobile Responsiveness

| Viewport | Check | Expected |
|----------------|------------------------------------------------------|------------------------------------------------------|
| 320px (min) | All 4 window states on group page match card | No text truncation, overflow, or misalignment. Text wraps naturally. Countdown strings ("2h 15m") fit on single line. |
| 375px (iPhone SE) | Group page match card with window indicator | Full-width block below match details. CTA button is full-width (`w-full`). Status/countdown text centered below button. |
| 390px (iPhone 14) | Predict page PreWindowBanner | Banner centered, padding `p-6`. Icon, title, body text, and countdown stack vertically. No horizontal overflow. |
| 640px+ (sm: breakpoint) | Group page match card in desktop layout | Window indicator right-aligned alongside match details. CTA button is `sm:w-auto`. Status text right-aligned. |
| 1024px+ (desktop) | Predict page PreWindowBanner | Centered within max-width container. Padding `p-8`. Icon circle + text centered. |

### Cross-Browser

| Browser | Version | Check |
|----------------|---------|------------------------------------------------------|
| Safari (iOS) | Latest | Date construction with `+05:30` offset parses correctly. `toLocaleString("en-US", { timeZone: "Asia/Kolkata" })` works. |
| Chrome (Android) | Latest | Same as Safari checks. `animate-pulse` renders correctly on countdown text. |
| Chrome (Desktop) | Latest | All window states render. Countdown ticks. State transitions at 8 AM and deadline work. |
| Firefox (Desktop) | Latest | `Date` parsing with IST offset. `aria-live="polite"` announcements. |

### Specific Rendering Checks

- [ ] PreWindowBanner icon circle (`h-16 w-16 rounded-full`) renders as a circle on all viewports.
- [ ] "Make Your Calls" CTA gradient (`cta-gradient`) renders identically to the old CTA button (no visual regression).
- [ ] Lock icon + "Predictions Locked" text does not wrap awkwardly on narrow viewports.
- [ ] Countdown text ("Opens in 1h 23m", "Closes in 2h 15m") never truncates with ellipsis.
- [ ] Warning-tinted container in pre-window match day state has visible background tint on both light and dark themes (if applicable).

---

## 6. Accessibility

| ID | Check | Expected |
|--------|------------------------------------------------------|------------------------------------------------------|
| A-001 | Countdown text uses `aria-live="polite"` | Screen readers announce countdown updates without interrupting current reading. Matches existing `PredictionForm` pattern. |
| A-002 | Pre-window match day container has `role="status"` | Screen reader announces the informational status on page load. |
| A-003 | PreWindowBanner has `role="status"` and `aria-label` | Container has `role="status"` and `aria-label="Prediction window not yet open"`. Screen reader announces on load. |
| A-004 | CTA button in WINDOW_OPEN state is keyboard navigable | "Make Your Calls" is a standard `<Link>` element. Tab-focusable. Activatable with Enter key. |
| A-005 | "Start Predicting" button (8 AM transition) receives `autoFocus` | When the banner transitions to "Window is now open -- tap to start predicting", the CTA button receives focus for keyboard users. |
| A-006 | Color is never the sole indicator of state | All states use icons (Clock for pre-window, Lock for closed) AND text in addition to color. Color-blind users can distinguish states. |
| A-007 | "Predictions Locked" state conveys meaning without color | Lock icon + "Predictions Locked" text is sufficient even without the red color. |
| A-008 | Tooltip content accessible via keyboard | Info icon (if implemented) next to window status can be focused via Tab and reveals tooltip. Not hover-only. |
| A-009 | `animate-pulse` on urgency countdown does not cause seizure risk | Pulse animation is gentle opacity change (Tailwind default), not a rapid flash. Complies with WCAG 2.3.1 (no more than 3 flashes per second). |
| A-010 | Screen reader flow on predict page when pre-window | Reads: back link -> match header with window badge -> PreWindowBanner with title, body, and countdown. Logical reading order. |

---

## 7. Unit Test Specifications

The following unit tests should be written in `web-app/src/lib/utils.test.ts` (extending the existing test file) for the new utility functions. These specifications are provided so the PSE can implement them alongside the feature code.

### 7.1 `computeWindowOpen`

```
describe("computeWindowOpen")
  - returns 8 AM IST (2:30 AM UTC) for a standard date
    Input: "2026-04-01"
    Expected: Date("2026-04-01T02:30:00.000Z")

  - returns correct timestamp for different dates
    Input: "2026-03-22"
    Expected: Date("2026-03-22T02:30:00.000Z")

  - handles leap year dates
    Input: "2028-02-29"
    Expected: Date("2028-02-29T02:30:00.000Z")

  - returns epoch (Date(0)) for invalid date string
    Input: "not-a-date"
    Expected: Date(0)

  - returns epoch for empty string
    Input: ""
    Expected: Date(0)
```

### 7.2 `isWindowOpen`

```
describe("isWindowOpen")
  - returns true at exactly 8:00 AM IST on match day
    System time: 2026-04-01T02:30:00.000Z (8:00 AM IST)
    Input: ("2026-04-01", "19:30:00")
    Expected: true

  - returns false at 7:59:59 AM IST on match day
    System time: 2026-04-01T02:29:59.000Z
    Input: ("2026-04-01", "19:30:00")
    Expected: false

  - returns false after deadline
    System time: 2026-04-01T13:16:00.000Z (after 18:45 IST = 13:15 UTC)
    Input: ("2026-04-01", "19:30:00")
    Expected: false

  - returns true one second before deadline
    System time: 2026-04-01T13:14:59.000Z
    Input: ("2026-04-01", "19:30:00")
    Expected: true

  - returns false with custom deadline that has passed
    System time: 2026-04-01T11:00:00.000Z
    Input: ("2026-04-01", "19:30:00", "2026-04-01T10:00:00Z")
    Expected: false

  - returns true with custom deadline in future, after 8 AM
    System time: 2026-04-01T11:00:00.000Z
    Input: ("2026-04-01", "19:30:00", "2026-04-01T15:00:00Z")
    Expected: true

  - returns false with malformed date (fail-closed)
    Input: ("invalid", "19:30:00")
    Expected: false

  - returns false the day before the match
    System time: 2026-03-31T12:00:00.000Z
    Input: ("2026-04-01", "19:30:00")
    Expected: false
```

### 7.3 `getWindowState`

```
describe("getWindowState")
  - returns PRE_WINDOW_FUTURE when today (IST) is before match date
    System time: 2026-03-30T12:00:00+05:30
    Input: { date: "2026-04-01", time_ist: "19:30:00" }
    Expected: "PRE_WINDOW_FUTURE"

  - returns PRE_WINDOW_MATCH_DAY on match day before 8 AM IST
    System time: 2026-04-01T06:00:00+05:30
    Input: { date: "2026-04-01", time_ist: "19:30:00" }
    Expected: "PRE_WINDOW_MATCH_DAY"

  - returns WINDOW_OPEN during window
    System time: 2026-04-01T10:00:00+05:30
    Input: { date: "2026-04-01", time_ist: "19:30:00" }
    Expected: "WINDOW_OPEN"

  - returns WINDOW_CLOSED after deadline
    System time: 2026-04-01T19:00:00+05:30
    Input: { date: "2026-04-01", time_ist: "19:30:00" }
    Expected: "WINDOW_CLOSED"

  - returns WINDOW_CLOSED for zero-duration window (deadline before 8 AM)
    Input: { date: "2026-04-01", time_ist: "08:00:00" }
    Expected: "WINDOW_CLOSED" (deadline = 7:15 AM IST, before 8 AM open)

  - returns WINDOW_CLOSED with custom deadline before 8 AM IST
    Input: { date: "2026-04-01", time_ist: "19:30:00" }, customDeadline: "2026-04-01T01:00:00Z" (6:30 AM IST)
    Expected: "WINDOW_CLOSED"

  - handles IST midnight boundary: 11:30 PM IST March 31, match April 1
    System time: 2026-03-31T23:30:00+05:30
    Input: { date: "2026-04-01", time_ist: "19:30:00" }
    Expected: "PRE_WINDOW_FUTURE"

  - handles IST midnight boundary: 12:30 AM IST April 1, match April 1
    System time: 2026-04-01T00:30:00+05:30
    Input: { date: "2026-04-01", time_ist: "19:30:00" }
    Expected: "PRE_WINDOW_MATCH_DAY"
```

---

## 8. Integration Test Specifications

These are end-to-end flows that should be verified either manually or via Playwright tests.

### 8.1 Full Submission Flow with Window

```
Test: User submits prediction within window
Preconditions:
  - User is authenticated and member of a group
  - Match is today, status "upcoming", scenarios published
  - Current time is within window (8 AM to 45 min before match)
Steps:
  1. Navigate to /group/[groupId]
  2. Verify "Make Your Calls" CTA is visible on match card
  3. Click "Make Your Calls"
  4. Verify predict page loads with interactive form
  5. Select picks for at least 2 scenarios
  6. Click "Lock It In"
  7. Verify redirect to group page
  8. Navigate back to predict page
  9. Verify previous picks are pre-filled
Expected: Full round-trip works. Predictions persisted in DB.
```

### 8.2 Pre-Window Rejection Flow

```
Test: User cannot predict before window opens
Preconditions:
  - User is authenticated, member, match is tomorrow
Steps:
  1. Navigate to /group/[groupId]
  2. Verify match card shows "Predictions open on {date} at 8:00 AM"
  3. Verify no CTA button is rendered
  4. Navigate directly to /group/[groupId]/predict/[matchId]
  5. Verify PreWindowBanner is shown ("Not Open Yet")
  6. Verify no scenario cards, no prediction form, no submit bar
Expected: User is informed but not frustrated. No way to submit.
```

### 8.3 Window Transition Flow (8 AM Boundary)

```
Test: Window opens while user is on page
Preconditions:
  - User on group page at 7:58 AM IST, match day
Steps:
  1. Observe "Predictions open at 8:00 AM" with countdown "Opens in 2m"
  2. Wait until 8:00 AM IST
  3. Observe countdown reaches zero
  4. Observe transition to "Window is now open -- tap to start predicting"
  5. Tap the prompt
  6. Page refreshes
  7. Verify "Make Your Calls" CTA button is now visible
Expected: Smooth transition without full page navigation.
```

### 8.4 Auto-Lock Flow (Deadline During Session)

```
Test: Form locks when deadline passes during active session
Preconditions:
  - User on predict page, window open, 2 minutes before deadline
Steps:
  1. Observe countdown "Closes in 2m"
  2. Wait until deadline passes
  3. Observe form auto-locks: inputs disabled, locked banner appears
  4. Attempt to click "Lock It In" (if visible)
Expected: Button is disabled. No submission possible. If user had unsaved picks,
          they are lost (expected behavior -- should have submitted earlier).
```

### 8.5 RLS Direct Insert Test

```
Test: Direct Supabase insert blocked before window
Preconditions:
  - Match on 2026-04-01, current time is 7 AM IST
  - User has valid auth token, is group member, scenarios published
Steps:
  1. Use Supabase client directly to INSERT into predictions table
  2. Provide valid user_id, scenario_id, value
Expected: Insert fails with RLS violation. The `prediction_window_open` check blocks it.
```

---

## 9. SQL Migration Verification Checklist

These checks should be performed against the `036_prediction_window.sql` migration file:

- [ ] `prediction_window_open(DATE)` function created with `RETURNS TIMESTAMPTZ`
- [ ] Function body: `SELECT (p_match_date + '08:00:00'::time) AT TIME ZONE 'Asia/Kolkata'`
- [ ] Function marked as `IMMUTABLE`
- [ ] `LANGUAGE sql` specified
- [ ] Old `insert_own_prediction` policy dropped before recreation (`DROP POLICY IF EXISTS`)
- [ ] New `insert_own_prediction` policy includes ALL existing conditions:
  - `auth.uid() = user_id`
  - `is_group_member(s.group_id, auth.uid())`
  - `m.status = 'upcoming'`
  - `COALESCE(mgs.is_locked, false) = false`
  - `COALESCE(mgs.scenarios_published, false) = true`
  - `now() < prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)`
- [ ] New INSERT policy includes new condition: `now() >= prediction_window_open(m.date)`
- [ ] Old `update_own_prediction` policy dropped before recreation
- [ ] New `update_own_prediction` policy includes ALL existing conditions (same as INSERT minus `scenarios_published`)
- [ ] New UPDATE policy includes new condition: `now() >= prediction_window_open(m.date)`
- [ ] No changes to SELECT policies
- [ ] No changes to DELETE policies
- [ ] No `ALTER TABLE` statements (no schema changes)
- [ ] No `UPDATE` or `DELETE` on existing data rows

---

## 10. Copy Verification Checklist

Verify all `PREDICTION_WINDOW_COPY` constants are used correctly in the UI:

| Constant | Where Used | Interpolation Variables |
|----------------------------------------------|----------------------------------------------|--------------------------|
| `CARD_PRE_WINDOW_FUTURE` | `WindowStatusIndicator`, pre-window future state | `{matchDate}` via `formatWindowDate()` |
| `CARD_PRE_WINDOW_TODAY` | `WindowStatusIndicator`, pre-window match day | None |
| `CARD_PRE_WINDOW_TODAY_COUNTDOWN` | `WindowStatusIndicator`, pre-window match day | `{countdown}` via `useCountdown` |
| `CARD_WINDOW_OPEN_CTA` | `WindowStatusIndicator`, window open state | None |
| `CARD_WINDOW_OPEN_DEADLINE` | `WindowStatusIndicator`, window open state | `{countdown}` via `useCountdown` |
| `CARD_WINDOW_CLOSED` | `WindowStatusIndicator`, window closed state | None |
| `PREDICT_PRE_WINDOW_TITLE` | `PreWindowBanner` heading | None |
| `PREDICT_PRE_WINDOW_BODY` | `PreWindowBanner` body text | `{matchDate}` via `formatWindowDate()` |
| `PREDICT_PRE_WINDOW_BADGE` | `PredictPageWindowBadge`, pre-window | `{matchDate}` via `formatWindowDate()` |
| `PREDICT_WINDOW_OPEN_BADGE` | `PredictPageWindowBadge`, window open | `{countdown}` via `useCountdown` |
| `PREDICT_WINDOW_CLOSED_TITLE` | Existing locked banner (unchanged) | None |
| `PREDICT_WINDOW_CLOSED_BODY` | Existing locked banner (unchanged) | None |
| `PREDICT_WINDOW_JUST_OPENED` | `PreWindowBanner` / `WindowStatusIndicator` transition | None |
| `SQUADS_PENDING_NOTE` | `PreWindowBanner` when squads not available | None |
| `ZERO_WINDOW` | `WindowStatusIndicator` when deadline <= windowOpen | None |
| `ERROR_WINDOW_NOT_OPEN` | `submitPredictions` server action | None |
| `ERROR_DEADLINE_PASSED` | `submitPredictions` server action | None |

---

## 11. Adversarial / Exploratory Testing Notes

These are scenarios to explore during manual testing that go beyond scripted test cases:

1. **Rapid navigation**: Navigate quickly between group page and predict page multiple times during window. Verify no stale state or ghost countdowns.
2. **Multiple tabs**: Open group page in Tab A and predict page in Tab B. Let deadline pass. Verify both tabs reflect locked state (Tab B via auto-lock, Tab A on next interaction/refresh).
3. **Network disconnection during submission**: Start a prediction submission, disconnect network mid-flight. Reconnect. Retry. Verify no duplicate predictions (upsert `ON CONFLICT` handles this).
4. **Back button after submission**: Submit predictions, get redirected to group page, press browser back. Verify predict page shows existing picks (not a stale form). Window state should still be correct.
5. **Deep link sharing**: Copy the predict page URL and send to another group member. They open it before the window. Verify they see the PreWindowBanner, not a broken page.
6. **Clock manipulation**: Change device clock forward past 8 AM. Verify the client-side UI updates, but server still rejects if actual server time is before 8 AM.
7. **Stress scenario**: 10 users in a group all submit predictions in the last 30 seconds before deadline. Verify all submissions succeed (or fail gracefully with clear error if deadline passes during processing).
8. **Empty group settings**: New match added to the system after group creation. `match_group_settings` row may not exist. Verify the LEFT JOIN in RLS handles NULL `mgs` rows gracefully (existing concern from codebase-analysis, but regression risk with new policy).
