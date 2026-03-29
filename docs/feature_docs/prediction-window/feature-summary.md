# Feature: Prediction Window
**Completed**: 2026-03-29
**Branch**: `feature/prediction-window`
**Status**: Ready for Gate 2 review

---

## 1. Feature Overview

### What was built

The Prediction Window feature introduces a formal time-bound window for submitting predictions: **8:00 AM IST on match day to 45 minutes before match start**. It replaces the previous "anytime before deadline" model that allowed (and encouraged via a "Predict Early" button) users to predict before match-day squads were available.

### Why it was built

The old behavior had a fundamental UX flaw. Player-dependent scenarios (top scorer, Man of the Match, etc.) rely on confirmed match-day squads, which the `sync-data` Edge Function fetches at approximately 5 AM IST. The "Predict Early" button directed users to the prediction form before squad data existed, producing an incomplete experience with empty player dropdowns or roster-level fallbacks. By gating predictions to open at 8 AM IST -- three hours after the daily sync -- users always encounter a fully populated prediction form with confirmed squads.

### Key outcomes

- The "Predict Early" button is fully retired across all match cards.
- A 4-state window indicator replaces the old CTA area on match cards: pre-window (future day), pre-window (match day), window open, and window closed.
- The predict page suppresses the form entirely before the window opens, showing an informational banner instead.
- Security enforcement is triple-layered: UI gating, server action validation, and Supabase RLS policies.

---

## 2. How It Works

### The prediction window concept

Every IPL match has a prediction window defined by two boundaries:

| Boundary | Time | Source |
|----------|------|--------|
| **Window opens** | 8:00 AM IST on match day | New `computeWindowOpen()` function |
| **Window closes** | 45 minutes before match start | Existing `computeDeadline()` function (unchanged) |

For a typical 7:30 PM IST match, the window is **8:00 AM to 6:45 PM IST** -- a 10 hour 45 minute window.

### Four window states

The system recognizes four states, represented by the `WindowState` type:

| State | Condition | User experience |
|-------|-----------|-----------------|
| `PRE_WINDOW_FUTURE` | Today (IST) is before match date | Informational text: "Predictions open on {date} at 8:00 AM". No CTA button. |
| `PRE_WINDOW_MATCH_DAY` | Match day, before 8 AM IST | Countdown to 8 AM: "Opens in {countdown}". No CTA button. |
| `WINDOW_OPEN` | 8 AM IST <= now < deadline | "Make Your Calls" CTA button + countdown: "Closes in {countdown}". |
| `WINDOW_CLOSED` | Now >= deadline (or match is live) | "Predictions Locked" with lock icon. No CTA button. |

### Admin override

The existing `match_group_settings.prediction_deadline` column continues to override only the **close** time. It does not affect the 8 AM open time. An admin-configurable open time is deferred to v2.

---

## 3. Architecture Decisions

### Triple-layer enforcement

Following the project's defense-in-depth pattern, the prediction window is enforced at three independent layers:

| Layer | Mechanism | What happens when violated |
|-------|-----------|----------------------------|
| **UI** | `WindowStatusIndicator` suppresses CTA; `PreWindowBanner` replaces the form; `PredictionForm` disables on auto-lock | User cannot interact with the prediction form |
| **Server Action** | `submitPredictions` calls `computeWindowOpen()` and rejects if `now < windowOpen` | Returns error: "Predictions open at 8 AM on match day" |
| **RLS** | `prediction_window_open()` SQL function added to INSERT and UPDATE policies | Database rejects the write regardless of how the client calls Supabase |

A user who bypasses the UI is stopped by the server action. A user who bypasses the server action is stopped by RLS. Each layer is independently sufficient.

### Server/client component split

The group page and predict page are Next.js server components. Window state is computed server-side using pure date functions (no database queries). The results are passed as serialized ISO date strings to three new client components that handle live countdowns and state transitions:

- `WindowStatusIndicator` -- embedded in each match card on the group page
- `PredictPageWindowBadge` -- in the predict page header
- `PreWindowBanner` -- replaces the prediction form when pre-window

This follows the existing "client island" pattern established by `LiveMatchCard`.

### Pure date computation

All window calculations are pure functions over dates with zero database queries. `computeWindowOpen`, `isWindowOpen`, and `getWindowState` use JavaScript `Date` arithmetic with explicit IST offsets (+05:30). This adds no latency to page loads or server actions (sub-millisecond execution). The equivalent SQL function `prediction_window_open()` is marked `IMMUTABLE` for PostgreSQL optimization.

### Fail-closed behavior for invalid inputs

`computeWindowOpen("invalid")` returns `new Date(0)` (epoch 1970), which makes the window-open check pass (now >= 1970 is always true). However, `computeDeadline("invalid", ...)` also returns epoch, making the deadline check fail (now < 1970 is always false). Combined in `isWindowOpen`, the result is `true AND false = false` -- predictions are blocked. This fail-closed behavior is verified by unit tests.

---

## 4. Files Changed

### New files (4)

| File | Description |
|------|-------------|
| `supabase/migrations/036_prediction_window.sql` | Creates `prediction_window_open()` SQL function; replaces INSERT and UPDATE RLS policies on `predictions` table to enforce 8 AM IST lower bound |
| `web-app/src/components/prediction/window-status-indicator.tsx` | Client component: 4-state window indicator for match cards on the group page, with live countdowns via `useCountdown` |
| `web-app/src/components/prediction/predict-page-window-badge.tsx` | Client component: window-aware badge in the predict page header showing countdown or locked state |
| `web-app/src/components/prediction/pre-window-banner.tsx` | Client component: informational banner displayed on the predict page when window has not opened, suppressing the prediction form entirely |

### Modified files (7)

| File | Description |
|------|-------------|
| `web-app/src/types/index.ts` | Added `WindowState` type: `"PRE_WINDOW_FUTURE" \| "PRE_WINDOW_MATCH_DAY" \| "WINDOW_OPEN" \| "WINDOW_CLOSED"` |
| `web-app/src/lib/constants.ts` | Added `PREDICTION_WINDOW_OPEN_HOUR_IST: 8` to `LIMITS`; added `PREDICTION_WINDOW_COPY` object with all user-facing text constants |
| `web-app/src/lib/utils.ts` | Added four functions: `computeWindowOpen`, `isWindowOpen`, `getWindowState`, `formatWindowDate` |
| `web-app/src/lib/actions/predictions.ts` | Added window-open check in `submitPredictions` server action before the deadline check, returning `ERROR_WINDOW_NOT_OPEN` if too early |
| `web-app/src/app/group/[groupId]/page.tsx` | Replaced inline `<Link>` CTA and "Predict Early" button with `WindowStatusIndicator` client component for each upcoming match card |
| `web-app/src/app/group/[groupId]/predict/[matchId]/page.tsx` | Added window state computation; conditionally renders `PreWindowBanner` (pre-window) or `PredictionForm` (window open/closed); added `PredictPageWindowBadge` to header |
| `web-app/src/components/prediction/prediction-form.tsx` | Added optional `deadline` prop; uses `useCountdown(deadline)` internally to auto-lock the form when the deadline passes during an active session |

### Documentation files (9)

| File | Description |
|------|-------------|
| `docs/feature_docs/prediction-window/_manifest.md` | Feature document inventory and status tracker |
| `docs/feature_docs/prediction-window/requirements.md` | Product requirements: 18 functional requirements, edge cases, out-of-scope items |
| `docs/feature_docs/prediction-window/codebase-analysis.md` | PSE analysis of existing codebase patterns relevant to the feature |
| `docs/feature_docs/prediction-window/technical-architecture.md` | Architecture spec: triple-layer enforcement, utility functions, SQL migration, component hierarchy |
| `docs/feature_docs/prediction-window/ui-ux-spec.md` | UI/UX spec: 4-state indicator, pre-window banner, responsive behavior, accessibility |
| `docs/feature_docs/prediction-window/copy-spec.md` | All user-facing copy constants with tone notes and variant rationale |
| `docs/feature_docs/prediction-window/test-plan.md` | 38 test cases across happy path, edge cases, errors, security, and performance |
| `docs/feature_docs/prediction-window/code-review.md` | PSE code review: 2 blockers (fixed), 7 warnings, 7 suggestions |
| `docs/feature_docs/prediction-window/qa-review.md` | QA review: 10 issues (0 critical, 3 major, 4 minor, 3 notes) |

---

## 5. Key Implementation Details

### Utility functions (`web-app/src/lib/utils.ts`)

**`computeWindowOpen(matchDate: string): Date`**
Constructs `{matchDate}T08:00:00+05:30` and returns the resulting Date. Returns `new Date(0)` for invalid input. Uses `LIMITS.PREDICTION_WINDOW_OPEN_HOUR_IST` (= 8) constant with zero-padded hour string.

**`isWindowOpen(matchDate, matchTimeIst, customDeadline?): boolean`**
Returns `true` only when `now >= windowOpen AND now < deadline`. Covers both bounds in a single call. Respects the optional custom deadline for the close time.

**`getWindowState(match, customDeadline?): WindowState`**
Returns one of the four `WindowState` values. Handles the zero-duration window edge case (deadline <= windowOpen returns `WINDOW_CLOSED`). Distinguishes `PRE_WINDOW_FUTURE` from `PRE_WINDOW_MATCH_DAY` using IST date comparison.

**`formatWindowDate(matchDate: string): string`**
Produces a short date format (e.g., "Apr 6") for use in copy templates.

### Database migration (`supabase/migrations/036_prediction_window.sql`)

- Creates `prediction_window_open(p_match_date DATE) RETURNS TIMESTAMPTZ` -- an `IMMUTABLE` SQL function that computes `(match_date + '08:00:00'::time) AT TIME ZONE 'Asia/Kolkata'`.
- Replaces the `insert_own_prediction` RLS policy to add `AND now() >= prediction_window_open(m.date)`.
- Replaces the `update_own_prediction` RLS policy with the same addition.
- Does NOT modify SELECT or DELETE policies. Existing prediction rows are unaffected.

### Server action check order (`web-app/src/lib/actions/predictions.ts`)

The validation chain in `submitPredictions` is now:
1. Zod input validation
2. Authentication (`auth.getUser()`)
3. Group membership check
4. Match status must be "upcoming"
5. Admin lock (`is_locked`) check
6. **Window open check** (new -- rejects with `ERROR_WINDOW_NOT_OPEN`)
7. Deadline passed check (existing -- rejects with `ERROR_DEADLINE_PASSED`)
8. Scenario validation
9. Upsert

### Client-side state transitions

Both `WindowStatusIndicator` and `PreWindowBanner` use `useCountdown` to detect the 8 AM boundary. When the countdown expires, a `useEffect` sets a transition flag that renders a "Window is now open -- tap to start predicting" prompt. Tapping triggers `router.refresh()` to fetch fresh server data, avoiding stale scenario or player data.

The `PredictionForm` auto-locks during an active session via an optional `deadline` prop. When `useCountdown(deadline)` reports expired, the form sets `isAutoLocked = true` and renders the locked banner.

### Copy constants (`web-app/src/lib/constants.ts`)

All user-facing text is centralized in the `PREDICTION_WINDOW_COPY` object (20 constants). Template variables (`{matchDate}`, `{countdown}`) are interpolated at render time using `.replace()`. No magic strings in component files (with two minor exceptions noted in QA-004).

---

## 6. Testing

### Unit test coverage

34 new unit tests were added to `web-app/src/lib/utils.test.ts` across 4 describe blocks:

| Function | Tests | Key boundaries covered |
|----------|-------|------------------------|
| `computeWindowOpen` | 6 | Standard date, different date, invalid input, empty string, UTC boundary, timezone verification |
| `isWindowOpen` | 8 | Before 8 AM, at exactly 8 AM, during window, after deadline, day before match, custom deadline, zero-duration window, invalid date |
| `getWindowState` | 10 | All 4 states, exact 8 AM boundary, zero-duration window, midnight IST boundary (11:30 PM vs 12:30 AM), custom deadline override, full lifecycle walk-through |
| `formatWindowDate` | 5 | Various dates, January, December, IST timezone |

**Result**: All 60 tests pass (34 new + 26 pre-existing).

### Code review results

The PSE code review identified:
- **2 blockers** (both fixed): `setState` called during render in `WindowStatusIndicator` and `PreWindowBanner` -- moved to `useEffect`.
- **7 warnings**: Unnecessary countdown intervals (WARNING-1), unused prop (WARNING-2), unused import (WARNING-3), missing analytics constants (WARNING-4), stale `isUrgent` calculation (WARNING-5), fragile `toLocaleString` for IST date comparison (WARNING-6), `isExpired` from null countdown edge case (WARNING-7).
- **7 suggestions**: Accept `windowState` prop in `WindowStatusIndicator`, clarify fail-open semantics in `computeWindowOpen`, add `scenarios_published` to UPDATE policy, use copy constants consistently, fix `formatWindowDate` locale, fetch custom deadline on group page, mobile layout (confirmed correct).

### QA review results

The QA review verified:
- **All 13 P0 requirements**: Implemented and passing.
- **All code review blocker fixes**: Verified as correctly resolved.
- **12 edge cases**: All passing (double-header, exact boundaries, zero-duration, IST midnight boundary, server-client mismatch, etc.).
- **Triple-layer security enforcement**: Complete and verified.
- **Copy constants**: All 20 constants match the copy spec exactly. Three edge-case constants (`RESCHEDULED_NOTICE`, `DOUBLE_HEADER_NOTE`, `SQUADS_STILL_LOADING`) deferred to follow-up.
- **Accessibility**: All 10 checks passing (aria-live, role, keyboard nav, autoFocus, color redundancy).
- **Mobile responsiveness**: Verified at 320px, 375px, 390px, 640px+, 1024px+.

**QA recommendation**: Merge after fixing 3 major issues (QA-001, QA-002, QA-003 -- see Known Limitations below).

---

## 7. Known Limitations and v2 Improvements

### Issues to address before production

| ID | Issue | Severity | Description |
|----|-------|----------|-------------|
| QA-001 | `toLocaleString` for IST date comparison | Major | The `toLocaleString("en-US", { timeZone: "Asia/Kolkata" })` pattern used in `getWindowState` and `WindowStatusIndicator` is not guaranteed to be parseable by the `Date` constructor across all JS runtimes. Fix: use explicit UTC offset arithmetic (`IST_OFFSET_MS = 5.5 * 60 * 60 * 1000`). |
| QA-002 | `formatWindowDate` locale mismatch | Major | Uses `en-IN` locale which produces "6 Apr" (day-first) instead of "Apr 6" (month-first) as specified in the copy spec. Fix: switch to `en-US` locale. |
| QA-003 | Analytics constants missing | Major | Four analytics event constants specified in the architecture doc were not added to `posthog/events.ts`. Fix: add `PREDICTION_WINDOW_NOT_OPEN_VIEWED`, `PREDICTION_WINDOW_OPENED`, `PREDICTION_WINDOW_CLOSED_VIEWED`, `PREDICTION_EARLY_SUBMIT_BLOCKED`. |

### Pre-existing gaps (not regressions)

- **Custom deadline not fetched on group page**: The group page does not query `match_group_settings` per match, so the countdown on match cards always shows the default 45-minute deadline. The predict page correctly uses custom deadlines. This is a pre-existing gap.
- **RLS UPDATE policy missing `scenarios_published` check**: Consistent with pre-existing migration 017. Tracked for defense-in-depth improvement.

### v2 improvements

| Improvement | Rationale |
|-------------|-----------|
| Admin-configurable window open time | Allow per-group or per-match open times via a new `prediction_window_open` column in `match_group_settings` |
| Push notifications for window open/close | Notify users when the window opens or is about to close |
| Partial predictions before the window | Allow team-based scenarios (match winner, toss) before squads are available |
| Per-scenario windows | Different deadlines for different scenario types (e.g., toss prediction locks at toss time) |
| User timezone display preference | Show times in user's local timezone (business logic remains IST-anchored) |
| Pass `windowState` as prop to `WindowStatusIndicator` | Align with `PredictPageWindowBadge` pattern; eliminates client-side date derivation and `toLocaleString` fragility (SUGGESTION-1) |
| Deterministic IST date comparison | Replace `toLocaleString` with UTC offset arithmetic across all components (WARNING-6, QA-001) |

---

## 8. How to Test Locally

### Prerequisites

- Node.js and the project's dependencies installed (`npm install` in `web-app/`)
- Supabase local development environment running (`supabase start`)
- Migration 036 applied (`supabase db reset` or `supabase migration up`)

### Run unit tests

```bash
cd web-app
npm test -- --grep "computeWindowOpen|isWindowOpen|getWindowState|formatWindowDate"
```

All 34 new tests should pass (60 total including pre-existing).

### Test window states manually

The window state depends on the current time relative to a match's date and time. To simulate different states:

**1. Pre-window (future day)**: Navigate to a group page with a match scheduled for a future date. The match card should show "Predictions open on {date} at 8:00 AM" with no CTA button.

**2. Pre-window (match day)**: If a match is today and the current time is before 8:00 AM IST, the match card shows "Predictions open at 8:00 AM" with a countdown. Navigating directly to the predict URL shows the `PreWindowBanner` ("Not Open Yet") with no form.

**3. Window open**: During the window (8 AM IST to 45 min before match), the match card shows the "Make Your Calls" CTA with a "Closes in {countdown}" countdown. The predict page renders the interactive form with a countdown in the header badge.

**4. Window closed**: After the deadline, the match card shows "Predictions Locked" with a lock icon. The predict page shows the locked form.

### Test server action enforcement

To verify the server rejects pre-window submissions regardless of UI state:

1. Open the browser console on the predict page during the window.
2. Note the server action call pattern.
3. Attempt to call `submitPredictions` with valid data while mocking the window to be closed.
4. The server should return `{ success: false, error: "Predictions open at 8 AM on match day" }`.

### Test RLS enforcement

To verify database-level enforcement:

1. Open the Supabase Studio SQL editor.
2. Run `SELECT prediction_window_open('2026-04-01'::date);` -- should return `2026-04-01 02:30:00+00` (8 AM IST in UTC).
3. Attempt an INSERT into `predictions` with `now()` before the window open time -- should be rejected by the `insert_own_prediction` policy.

### Test 8 AM transition

1. Set your system clock to 7:58 AM IST on a match day (or adjust match data to suit).
2. Open the group page or predict page.
3. Watch the countdown reach zero.
4. A "Window is now open -- tap to start predicting" prompt should appear.
5. Tapping it should refresh the page and show the active CTA / interactive form.

### Test auto-lock during session

1. Open the predict page with only a few minutes remaining before the deadline.
2. Watch the countdown in the header badge.
3. When it reaches zero, the form should auto-lock: inputs disabled, "Predictions Locked" banner appears.

---

## Related Documentation

- [Requirements](requirements.md) -- Full functional requirements (FR-001 through FR-018)
- [Technical Architecture](technical-architecture.md) -- Detailed implementation spec
- [UI/UX Specification](ui-ux-spec.md) -- Component specs, visual references, responsive behavior
- [Copy Specification](copy-spec.md) -- All user-facing text with tone and variant rationale
- [Test Plan](test-plan.md) -- 38 test cases across all categories
- [Code Review](code-review.md) -- PSE review findings and security analysis
- [QA Review](qa-review.md) -- QA verification results and outstanding issues
