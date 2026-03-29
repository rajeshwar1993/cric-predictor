# Technical Architecture: Prediction Window
**Author**: PSE Agent
**Date**: 2026-03-29
**Status**: Draft
**Feature**: Replace "Predict Early" with a prediction window (8 AM IST match day to 45 min before match start)

---

## 1. Architecture Overview

The prediction window introduces a **lower-bound time gate** on prediction submissions. Currently, the system enforces only an upper bound (45 min before match start). This feature adds a lower bound (8:00 AM IST on match day) and communicates the window state clearly throughout the UI.

### Enforcement Layers (Triple-Layer Pattern)

Following the existing defense-in-depth pattern, the window open check is enforced at all three layers:

| Layer | Responsibility | File(s) |
|---|---|---|
| **UI** | Display window state, disable/suppress form when pre-window | `WindowStatusIndicator`, `PreWindowBanner`, `PredictPageWindowBadge` |
| **Server Action** | Reject submissions outside the window with descriptive error | `lib/actions/predictions.ts` |
| **RLS** | Database-level enforcement via `prediction_window_open()` SQL function | `supabase/migrations/036_prediction_window.sql` |

### Data Flow

```
Server Component (page.tsx)
  |
  |-- computeWindowOpen(match.date)       → Date (8 AM IST)
  |-- computeDeadline(match.date, ...)    → Date (deadline)
  |-- getWindowState(match)               → WindowState enum
  |
  |-- Passes windowOpen, windowClose as ISO strings to client components
  |
Client Component (WindowStatusIndicator / PreWindowBanner / PredictPageWindowBadge)
  |
  |-- Derives visual state from windowOpen, windowClose, Date.now()
  |-- useCountdown(targetDate) for live countdown
  |-- router.refresh() on 8 AM transition (tap-to-refresh pattern)
```

---

## 2. Type Definitions

### WindowState Enum

Add to `web-app/src/types/index.ts`:

```typescript
/**
 * Prediction window states for a match.
 * Determines UI display and action availability.
 */
export type WindowState =
  | "PRE_WINDOW_FUTURE"     // Current date < match date
  | "PRE_WINDOW_MATCH_DAY"  // Match day, current time < 8 AM IST
  | "WINDOW_OPEN"           // 8 AM IST <= now < deadline
  | "WINDOW_CLOSED";        // now >= deadline OR match is live
```

---

## 3. Utility Functions

### 3.1 `computeWindowOpen(matchDate: string): Date`

**File**: `web-app/src/lib/utils.ts`

```typescript
/**
 * Compute when the prediction window opens for a match.
 * Always 8:00 AM IST on the match date.
 *
 * TIMEZONE SEMANTICS:
 *   Constructs "matchDate + 08:00:00 + 05:30" so JavaScript
 *   converts to UTC internally. Mirrors the SQL:
 *   (m.date + '08:00:00'::time) AT TIME ZONE 'Asia/Kolkata'
 *
 * @param matchDate - Date string (e.g., "2026-04-01")
 * @returns Date object representing 8 AM IST on match day
 */
export function computeWindowOpen(matchDate: string): Date {
  const windowOpen = new Date(
    `${matchDate}T0${LIMITS.PREDICTION_WINDOW_OPEN_HOUR_IST}:00:00+05:30`
  );
  if (isNaN(windowOpen.getTime())) return new Date(0); // Invalid → treat as already passed
  return windowOpen;
}
```

**Note**: Uses `LIMITS.PREDICTION_WINDOW_OPEN_HOUR_IST` (= 8) constant. The string construction uses template literal with the hour value. Since the hour is single-digit (8), a leading zero is prepended. If this constant ever changes to a two-digit hour, the template would need adjustment -- but per requirements, 8 AM is hardcoded for v1.

Implementation detail: Rather than conditional zero-padding, use a simpler approach:

```typescript
export function computeWindowOpen(matchDate: string): Date {
  const hour = LIMITS.PREDICTION_WINDOW_OPEN_HOUR_IST;
  const hourStr = hour.toString().padStart(2, "0");
  const windowOpen = new Date(`${matchDate}T${hourStr}:00:00+05:30`);
  if (isNaN(windowOpen.getTime())) return new Date(0);
  return windowOpen;
}
```

### 3.2 `isWindowOpen(matchDate, matchTimeIst, customDeadline?): boolean`

**File**: `web-app/src/lib/utils.ts`

```typescript
/**
 * Check if the prediction window is currently open.
 * Returns true only when: 8 AM IST on match day <= now < deadline.
 *
 * Returns false (window not open) if date/time inputs are malformed — fail closed.
 *
 * @param matchDate - Date string (e.g., "2026-04-01")
 * @param matchTimeIst - Time string in IST (e.g., "19:30:00")
 * @param customDeadline - Optional admin override for close time
 */
export function isWindowOpen(
  matchDate: string,
  matchTimeIst: string,
  customDeadline?: string | null
): boolean {
  const now = new Date();
  const windowOpen = computeWindowOpen(matchDate);
  const deadline = computeDeadline(matchDate, matchTimeIst, customDeadline);
  return now >= windowOpen && now < deadline;
}
```

### 3.3 `getWindowState(match, customDeadline?): WindowState`

**File**: `web-app/src/lib/utils.ts`

```typescript
/**
 * Determine the prediction window state for a match.
 * Used by server components to decide which UI state to render.
 *
 * @param match - Object with date and time_ist fields
 * @param customDeadline - Optional admin override for close time
 * @returns WindowState enum value
 */
export function getWindowState(
  match: { date: string; time_ist: string },
  customDeadline?: string | null
): WindowState {
  const now = new Date();
  const windowOpen = computeWindowOpen(match.date);
  const deadline = computeDeadline(match.date, match.time_ist, customDeadline);

  // Edge case: zero-duration window (deadline before window open)
  if (deadline <= windowOpen) return "WINDOW_CLOSED";

  if (now >= deadline) return "WINDOW_CLOSED";
  if (now >= windowOpen) return "WINDOW_OPEN";

  // Pre-window: distinguish between future day and match day
  const todayIST = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const matchDay = new Date(match.date + "T00:00:00+05:30");

  // Compare dates only (year, month, day in IST)
  const isSameDay =
    todayIST.getFullYear() === matchDay.getFullYear() &&
    todayIST.getMonth() === matchDay.getMonth() &&
    todayIST.getDate() === matchDay.getDate();

  if (isSameDay) return "PRE_WINDOW_MATCH_DAY";
  return "PRE_WINDOW_FUTURE";
}
```

**Design decision**: `getWindowState` compares dates in IST to determine "match day" since the entire app operates in IST. The `toLocaleString` approach with `Asia/Kolkata` timezone ensures correct IST date comparison regardless of the server's timezone.

### 3.4 Helper: `formatWindowDate(matchDate: string): string`

**File**: `web-app/src/lib/utils.ts`

```typescript
/**
 * Format a match date for window copy (e.g., "Apr 6").
 * Short format: month abbreviation + day.
 */
export function formatWindowDate(matchDate: string): string {
  return new Date(matchDate + "T00:00:00+05:30").toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });
}
```

This is needed for the copy template `"Predictions open on {matchDate} at 8:00 AM"` where we want a shorter format than `formatMatchDate` (which includes weekday).

---

## 4. Constants

### 4.1 Timing Constant

**File**: `web-app/src/lib/constants.ts`

Add to the `LIMITS` object:

```typescript
export const LIMITS = {
  // ... existing entries ...
  PREDICTION_DEADLINE_MINUTES_BEFORE_MATCH: 45,
  PREDICTION_WINDOW_OPEN_HOUR_IST: 8,  // <-- NEW
} as const;
```

### 4.2 Copy Constants

**File**: `web-app/src/lib/constants.ts`

Add as a new top-level export (following the `REVEAL_TABLE_COPY` pattern):

```typescript
/** Prediction Window copy — all user-facing text for the window feature */
export const PREDICTION_WINDOW_COPY = {
  // Group Page: Match Card Window States
  CARD_PRE_WINDOW_FUTURE: "Predictions open on {matchDate} at 8:00 AM",
  CARD_PRE_WINDOW_TODAY: "Predictions open at 8:00 AM",
  CARD_PRE_WINDOW_TODAY_COUNTDOWN: "Opens in {countdown}",
  CARD_WINDOW_OPEN_CTA: "Make Your Calls",
  CARD_WINDOW_OPEN_DEADLINE: "Closes in {countdown}",
  CARD_WINDOW_CLOSED: "Predictions Locked",
  CARD_WINDOW_CLOSED_LIVE: "Match is live \u2014 predictions are locked",

  // Predict Page: Header & Banner
  PREDICT_PRE_WINDOW_TITLE: "Not Open Yet",
  PREDICT_PRE_WINDOW_BODY:
    "Predictions open at 8:00 AM IST on {matchDate}. Come back when the window opens to make your calls.",
  PREDICT_PRE_WINDOW_BADGE: "Opens {matchDate} at 8:00 AM",
  PREDICT_WINDOW_OPEN_BADGE: "Closes in {countdown}",
  PREDICT_WINDOW_CLOSED_TITLE: "Predictions Locked",
  PREDICT_WINDOW_CLOSED_BODY:
    "Time\u2019s up! The deadline has passed or an admin locked predictions.",
  PREDICT_WINDOW_JUST_OPENED:
    "Window is now open \u2014 tap to start predicting",

  // Tooltip / Help
  TOOLTIP_TITLE: "Prediction Window",
  TOOLTIP_BODY:
    "You can submit picks between 8:00 AM IST on match day and 45 minutes before the match starts. Squads are confirmed by then, so every scenario is ready to go.",

  // Edge Cases
  SQUADS_PENDING_NOTE: "Squads will be available when the window opens.",
  ZERO_WINDOW: "Predictions are locked for this match.",

  // Server Error Messages
  ERROR_WINDOW_NOT_OPEN: "Predictions open at 8 AM on match day",
  ERROR_DEADLINE_PASSED: "Too late \u2014 the prediction window has closed",
} as const;
```

### 4.3 Analytics Events

**File**: `web-app/src/lib/posthog/events.ts`

Add to the `ANALYTICS_EVENTS` object:

```typescript
// Prediction Window
PREDICTION_WINDOW_NOT_OPEN_VIEWED: "prediction_window_not_open_viewed",
PREDICTION_WINDOW_OPENED: "prediction_window_opened",
PREDICTION_WINDOW_CLOSED_VIEWED: "prediction_window_closed_viewed",
PREDICTION_EARLY_SUBMIT_BLOCKED: "prediction_early_submit_blocked",
```

---

## 5. Database Changes

### 5.1 New SQL Function: `prediction_window_open()`

**Migration file**: `supabase/migrations/036_prediction_window.sql`

```sql
-- Bragg — 036 Prediction Window
--
-- Adds a lower-bound time gate: predictions are only accepted
-- starting at 8:00 AM IST on the match date.
--
-- TIMEZONE SEMANTICS:
--   (m.date + '08:00:00'::time) produces naive TIMESTAMP: '2026-04-01 08:00:00'
--   AT TIME ZONE 'Asia/Kolkata' interprets it as IST, converts to UTC:
--   Result: '2026-04-01 02:30:00+00' (8:00 AM IST = 2:30 AM UTC)
--   now() is TIMESTAMPTZ (UTC), so comparison is apples-to-apples.

-- 1. Create helper function for prediction window open time
CREATE OR REPLACE FUNCTION prediction_window_open(
  p_match_date DATE
)
RETURNS TIMESTAMPTZ AS $$
  SELECT (p_match_date + '08:00:00'::time) AT TIME ZONE 'Asia/Kolkata';
$$ LANGUAGE sql IMMUTABLE;
```

**Rationale**: Following the `prediction_deadline()` pattern, this centralizes the window open time computation in one place. The function is `IMMUTABLE` because it returns the same result for the same input (no dependency on mutable state).

### 5.2 Updated RLS Policies: INSERT and UPDATE

Add to the same migration `036_prediction_window.sql`:

```sql
-- 2. Update INSERT policy to enforce window open time
DROP POLICY IF EXISTS "insert_own_prediction" ON predictions;

CREATE POLICY "insert_own_prediction" ON predictions FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM scenarios s
    JOIN matches m ON m.id = s.match_id
    LEFT JOIN match_group_settings mgs
      ON mgs.group_id = s.group_id AND mgs.match_id = s.match_id
    WHERE s.id = predictions.scenario_id
      AND is_group_member(s.group_id, auth.uid())
      AND m.status = 'upcoming'
      AND COALESCE(mgs.is_locked, false) = false
      AND COALESCE(mgs.scenarios_published, false) = true
      AND now() >= prediction_window_open(m.date)              -- NEW: window open
      AND now() < prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)
  )
);

-- 3. Update UPDATE policy to enforce window open time
DROP POLICY IF EXISTS "update_own_prediction" ON predictions;

CREATE POLICY "update_own_prediction" ON predictions FOR UPDATE USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM scenarios s
    JOIN matches m ON m.id = s.match_id
    LEFT JOIN match_group_settings mgs
      ON mgs.group_id = s.group_id AND mgs.match_id = s.match_id
    WHERE s.id = predictions.scenario_id
      AND is_group_member(s.group_id, auth.uid())
      AND m.status = 'upcoming'
      AND COALESCE(mgs.is_locked, false) = false
      AND now() >= prediction_window_open(m.date)              -- NEW: window open
      AND now() < prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)
  )
);
```

**Key additions**:
- `AND now() >= prediction_window_open(m.date)` -- the single new line in each policy.
- The SELECT policy (`read_others_after_deadline`) is **not modified**. The read visibility logic does not depend on the window open time -- others' predictions become visible after the deadline or when the match goes live, regardless of when the window opened.

### 5.3 Schema Changes: None for v1

Per requirements (FR-005, Section 6), the 8 AM open time is not admin-overridable in v1. No new columns are added to `match_group_settings`. The `prediction_window_open()` function takes only the match date as input.

If v2 requires per-group overrides, a `prediction_window_open` column can be added to `match_group_settings` and the SQL function updated to accept an optional override parameter (following the `prediction_deadline()` pattern).

### 5.4 Existing Data Impact

Per FR-008, existing prediction rows are unaffected. The new RLS conditions only constrain future INSERT and UPDATE operations. No rows are modified or deleted by this migration.

---

## 6. Server Action Changes

### 6.1 `submitPredictions` — Window Open Check

**File**: `web-app/src/lib/actions/predictions.ts`

Add the window open check **after** the deadline check (or replace the ordering for clarity). The window check should come between the match status check and the deadline check:

```typescript
// Current order:
// 1. Zod validation
// 2. Auth
// 3. Group membership
// 4. Match status (must be "upcoming")
// 5. Admin lock (is_locked)
// 6. Deadline check (isDeadlinePassed)              <-- UPPER BOUND
// 7. Scenario validation
// 8. Upsert

// New order (insert step 6, shift old 6 to 7):
// 1. Zod validation
// 2. Auth
// 3. Group membership
// 4. Match status (must be "upcoming")
// 5. Admin lock (is_locked)
// 6. Window open check (isWindowOpen — returns false if too early)  <-- NEW
// 7. Deadline check (isDeadlinePassed — returns true if too late)
// 8. Scenario validation
// 9. Upsert
```

**Specific code change** — add after the `is_locked` check (line 48 in current file), before the `isDeadlinePassed` check:

```typescript
import { isDeadlinePassed, isWindowOpen } from "@/lib/utils";
import { PREDICTION_WINDOW_COPY } from "@/lib/constants";

// ... inside submitPredictions, after is_locked check:

// Check prediction window is open (not too early)
if (!isWindowOpen(match.date, match.time_ist, settings?.prediction_deadline)) {
  // Determine if too early or too late
  if (isDeadlinePassed(match.date, match.time_ist, settings?.prediction_deadline)) {
    return { success: false, error: PREDICTION_WINDOW_COPY.ERROR_DEADLINE_PASSED };
  }
  return { success: false, error: PREDICTION_WINDOW_COPY.ERROR_WINDOW_NOT_OPEN };
}

// Remove the standalone isDeadlinePassed check since isWindowOpen covers both bounds
// The above block handles both cases: window not yet open, and deadline passed.
```

**Design decision**: `isWindowOpen` returns `false` in two cases: (a) before 8 AM, and (b) after deadline. We distinguish these for the error message. This is more informative than a generic "not in window" error.

Alternative approach (simpler): Keep the existing `isDeadlinePassed` check in place and add `isWindowOpen` as a separate check before it:

```typescript
// Window not yet open?
const windowOpen = computeWindowOpen(match.date);
if (new Date() < windowOpen) {
  return { success: false, error: PREDICTION_WINDOW_COPY.ERROR_WINDOW_NOT_OPEN };
}

// Deadline passed? (existing check, unchanged)
if (isDeadlinePassed(match.date, match.time_ist, settings?.prediction_deadline)) {
  return { success: false, error: PREDICTION_WINDOW_COPY.ERROR_DEADLINE_PASSED };
}
```

**Recommended approach**: The alternative (two separate checks) is cleaner because:
1. It preserves the existing `isDeadlinePassed` check unchanged.
2. Error messages are naturally distinct.
3. Less cognitive load -- each check does one thing.

---

## 7. Component Architecture

### 7.1 Component Hierarchy

```
group/[groupId]/page.tsx (Server Component)
  |
  |-- For each upcoming match card:
  |     |-- [existing] Match info (team names, date, venue)
  |     |-- [existing] LiveMatchCard (Client) — if match is live
  |     |-- [NEW] WindowStatusIndicator (Client) — replaces Link CTA + deadline text
  |     |-- [existing] Prediction status pills
  |
predict/[matchId]/page.tsx (Server Component)
  |
  |-- [existing] Back link
  |-- [existing] Match header card
  |     |-- [NEW] PredictPageWindowBadge (Client) — replaces static "Locked"/"Closes at" text
  |
  |-- IF windowState === "PRE_WINDOW_*":
  |     |-- [NEW] PreWindowBanner (Client) — replaces PredictionForm entirely
  |
  |-- ELSE:
  |     |-- [existing] PredictionForm (Client) — isLocked derived from window state
  |           |-- [MODIFIED] Add optional `deadline` prop for auto-lock countdown
```

### 7.2 WindowStatusIndicator

**File**: `web-app/src/components/prediction/window-status-indicator.tsx`

**Type**: Client component (`"use client"`)

**Purpose**: Replaces the `<Link>` CTA and deadline `<p>` on each match card with a 4-state window indicator that includes live countdowns.

```typescript
"use client";

interface WindowStatusIndicatorProps {
  matchId: number;
  matchDate: string;          // e.g., "2026-04-01"
  matchTimeIst: string;       // e.g., "19:30:00"
  groupId: string;
  isPrimary: boolean;         // First match = gradient CTA style
  windowOpen: string;         // ISO string: 8 AM IST on matchDate
  windowClose: string;        // ISO string: computeDeadline() result
}
```

**Internal state derivation**:
- Parse `windowOpen` and `windowClose` as `Date` objects.
- Use two `useCountdown` instances:
  - `useCountdown(windowOpenDate)` — for countdown to window opening (pre-window match day state).
  - `useCountdown(windowCloseDate)` — for countdown to deadline (window open state).
- Derive the current visual state from `Date.now()` compared to `windowOpen` and `windowClose`.

**State transitions (client-side)**:
1. **PRE_WINDOW_FUTURE**: Static text. No countdown needed (the "Opens in" countdown is only on match day). Re-evaluates on component mount if date has changed.
2. **PRE_WINDOW_MATCH_DAY**: Shows countdown to 8 AM via `useCountdown(windowOpenDate)`. When `isExpired` becomes `true`, display the "Window is now open -- tap to start" prompt. On tap, call `router.refresh()`.
3. **WINDOW_OPEN**: Shows "Make Your Calls" CTA `<Link>` and countdown to deadline via `useCountdown(windowCloseDate)`. When < 1 hour remaining, add `animate-pulse` to countdown text.
4. **WINDOW_CLOSED**: Shows "Predictions Locked" text with Lock icon. When `useCountdown(windowCloseDate).isExpired` becomes `true`, transitions from WINDOW_OPEN to WINDOW_CLOSED.

**Rendering per state** (see UI/UX spec Section 3.1 for exact styling):

| State | Elements rendered |
|---|---|
| PRE_WINDOW_FUTURE | `<Clock>` icon + `PREDICTION_WINDOW_COPY.CARD_PRE_WINDOW_FUTURE` (with `{matchDate}` interpolated) |
| PRE_WINDOW_MATCH_DAY | Tinted container: `<Clock>` icon + `CARD_PRE_WINDOW_TODAY` + `CARD_PRE_WINDOW_TODAY_COUNTDOWN` |
| WINDOW_OPEN | `<Link>` button to predict page (CTA style) + `CARD_WINDOW_OPEN_DEADLINE` countdown |
| WINDOW_CLOSED | `<Lock>` icon + `CARD_WINDOW_CLOSED` |

### 7.3 PredictPageWindowBadge

**File**: `web-app/src/components/prediction/predict-page-window-badge.tsx`

**Type**: Client component (`"use client"`)

**Purpose**: Replaces the static status badge in the predict page header with a live countdown badge.

```typescript
"use client";

interface PredictPageWindowBadgeProps {
  windowState: WindowState;   // Computed server-side
  windowOpen: string;         // ISO string
  windowClose: string;        // ISO string
  matchDate: string;          // For display in pre-window
}
```

**Rendering per state**:

| State | Badge text | Color |
|---|---|---|
| PRE_WINDOW_FUTURE | `"Opens {matchDate} at 8:00 AM"` | `var(--warning)` |
| PRE_WINDOW_MATCH_DAY | `"Opens in {countdown}"` | `var(--warning)` |
| WINDOW_OPEN | `"Closes in {countdown}"` | `var(--text-muted)`, switches to `var(--danger)` + `animate-pulse` when < 1 hour |
| WINDOW_CLOSED | `"Locked"` | `var(--danger)` |

### 7.4 PreWindowBanner

**File**: `web-app/src/components/prediction/pre-window-banner.tsx`

**Type**: Client component (`"use client"`)

**Purpose**: Replaces the `PredictionForm` entirely when the window hasn't opened. Shows informational messaging and optional countdown.

```typescript
"use client";

interface PreWindowBannerProps {
  windowOpen: string;          // ISO string: 8 AM IST on match date
  matchDate: string;           // For display
  squadsAvailable: boolean;    // Whether match_squads has rows (P1 - FR-014)
  isMatchDay: boolean;         // Whether today is the match date (for countdown)
}
```

**Behavior**:
- Shows `PREDICTION_WINDOW_COPY.PREDICT_PRE_WINDOW_TITLE` ("Not Open Yet") as heading.
- Shows `PREDICT_PRE_WINDOW_BODY` with `{matchDate}` interpolated.
- If `!squadsAvailable`, shows `SQUADS_PENDING_NOTE`.
- If `isMatchDay`, uses `useCountdown(windowOpenDate)`:
  - Shows "Opens in {countdown}".
  - When countdown expires (8 AM arrives), transitions to `PREDICT_WINDOW_JUST_OPENED` text with a "Start Predicting" CTA button. Tapping calls `router.refresh()`.
- If `!isMatchDay`, no countdown -- just static text about the future date.

**Visual pattern**: Follows `RevealLockedPlaceholder` layout (centered card with icon circle, title, subtitle, countdown). Uses `Clock` icon instead of `Lock`.

### 7.5 PredictionForm Updates

**File**: `web-app/src/components/prediction/prediction-form.tsx`

**Changes**: Minor addition for auto-lock during session (FR-017).

Add optional `deadline` prop:

```typescript
interface PredictionFormProps {
  // ... existing props ...
  isLocked: boolean;
  lastUpdated: string | null;
  deadline?: string | null;  // <-- NEW: ISO string for auto-lock countdown
}
```

Internal logic:

```typescript
// Auto-lock: when deadline passes during the session
const deadlineDate = deadline ? new Date(deadline) : null;
const { isExpired: isAutoLocked } = useCountdown(deadlineDate);

const effectivelyLocked = isLocked || isAutoLocked;
// Use effectivelyLocked instead of isLocked for all disabled/locked checks
```

**No other changes to PredictionForm.** The pre-window state is handled at the page level (rendering `PreWindowBanner` instead of `PredictionForm`), not inside the form.

---

## 8. Page-Level Integration

### 8.1 Group Page: `app/group/[groupId]/page.tsx`

**Current behavior** (lines 163-186 in the match card section):
- Renders a `<Link>` CTA button for each upcoming match ("Make Your Calls" for primary, "Predict Early" for secondary).
- Renders a `<p>` deadline text below.

**New behavior**:
- Import `WindowStatusIndicator` component.
- Import `computeWindowOpen`, `computeDeadline` from utils.
- For each upcoming (non-live) match, replace the `<Link>` and deadline `<p>` with `<WindowStatusIndicator>`.

**Specific diff** — replace the current non-live branch (lines 163-186):

```tsx
// BEFORE:
{!isLive && (
  <Link
    href={ROUTES.PREDICT(groupId, match.id)}
    className={...}
  >
    {isPrimary ? "Make Your Calls" : "Predict Early"}
  </Link>
)}
// ... and the deadline <p> below

// AFTER:
{!isLive && (
  <WindowStatusIndicator
    matchId={match.id}
    matchDate={match.date}
    matchTimeIst={match.time_ist}
    groupId={groupId}
    isPrimary={isPrimary}
    windowOpen={computeWindowOpen(match.date).toISOString()}
    windowClose={deadline.toISOString()}
  />
)}
```

The deadline `<p>` element (lines 178-186) is also removed because `WindowStatusIndicator` renders its own status text.

The live branch (lines 156-162, the "View Leaderboard" link) and the live status text (lines 178-181) remain unchanged.

### 8.2 Predict Page: `app/group/[groupId]/predict/[matchId]/page.tsx`

**Current behavior**:
- Computes `locked` boolean from match status, `is_locked`, and `isDeadlinePassed`.
- Renders match header with static "Locked" or "Closes at {time}" badge.
- Always renders `<PredictionForm>`.

**New behavior**:

1. **Compute window state**:

```typescript
import {
  computeWindowOpen,
  computeDeadline,
  getWindowState,
  formatWindowDate,
} from "@/lib/utils";
import type { WindowState } from "@/types";

// After fetching match and settings:
const windowState = getWindowState(match, settings?.prediction_deadline);
const windowOpen = computeWindowOpen(match.date);
const windowClose = computeDeadline(match.date, match.time_ist, settings?.prediction_deadline);
const isPreWindow = windowState === "PRE_WINDOW_FUTURE" || windowState === "PRE_WINDOW_MATCH_DAY";

// Updated locked logic
const locked =
  match.status !== "upcoming" ||
  settings?.is_locked === true ||
  windowState === "WINDOW_CLOSED";
```

2. **Replace header badge** (line 89-91):

```tsx
// BEFORE:
<span className={`font-stats text-xs ${locked ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}`}>
  {locked ? "Locked" : `Closes at ${formatMatchTime(match.time_ist)}`}
</span>

// AFTER:
<PredictPageWindowBadge
  windowState={windowState}
  windowOpen={windowOpen.toISOString()}
  windowClose={windowClose.toISOString()}
  matchDate={match.date}
/>
```

3. **Conditionally render PreWindowBanner vs PredictionForm**:

```tsx
// BEFORE:
<PredictionForm
  groupId={groupId}
  matchId={matchId}
  teamA={match.team_a}
  teamB={match.team_b}
  scenarios={scenarios}
  existingPredictions={existingPredictions}
  players={players}
  isLocked={locked}
  lastUpdated={lastUpdated}
/>

// AFTER:
{isPreWindow ? (
  <PreWindowBanner
    windowOpen={windowOpen.toISOString()}
    matchDate={match.date}
    squadsAvailable={players.length > 0}
    isMatchDay={windowState === "PRE_WINDOW_MATCH_DAY"}
  />
) : (
  <PredictionForm
    groupId={groupId}
    matchId={matchId}
    teamA={match.team_a}
    teamB={match.team_b}
    scenarios={scenarios}
    existingPredictions={existingPredictions}
    players={players}
    isLocked={locked}
    lastUpdated={lastUpdated}
    deadline={windowState === "WINDOW_OPEN" ? windowClose.toISOString() : null}
  />
)}
```

4. **Scenario seeding**: The `seedSystemScenarios` call (line 42-44) currently runs for any upcoming match. With the prediction window, it should still run regardless of window state -- scenarios need to exist before the window opens so they are ready at 8 AM. No change needed.

---

## 9. Squads Availability Check (P1)

### How to determine if squads are available

The predict page already fetches players via `playersDal.getPlayersForMatch(matchId)`. This function:
1. First checks `match_squads` for the match.
2. Falls back to full team rosters if no squad rows exist.

The `squadsAvailable` prop for `PreWindowBanner` uses a heuristic: if the `players` array returned by `getPlayersForMatch` is non-empty, squads (or roster fallback) are available. However, this doesn't distinguish between confirmed squads and roster fallback.

**For P1 (FR-014)**, we need to know if `match_squads` specifically has rows. The simplest approach is to add a DAL function:

**File**: `web-app/src/lib/dal/players.ts`

```typescript
/**
 * Check if confirmed match squads are available for a match.
 * Returns true if match_squads has at least one row for this match_id.
 */
export async function hasMatchSquads(matchId: number): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("match_squads")
    .select("*", { count: "exact", head: true })
    .eq("match_id", matchId);

  if (error) return false;
  return (count ?? 0) > 0;
}
```

The predict page would then call this in the pre-window path:

```typescript
const squadsAvailable = isPreWindow
  ? await playersDal.hasMatchSquads(matchId)
  : true; // When window is open, we don't show the squad note
```

**Note**: This is a P1 requirement. For the P0 implementation, `squadsAvailable` can default to `true` (omitting the squad note) and be enhanced later.

---

## 10. File-by-File Change Plan

### New Files

| # | File | Description | Owner |
|---|---|---|---|
| N1 | `supabase/migrations/036_prediction_window.sql` | `prediction_window_open()` SQL function + updated INSERT/UPDATE RLS policies | PSE-Supabase |
| N2 | `web-app/src/components/prediction/window-status-indicator.tsx` | Client component: 4-state window indicator for group page match cards | PSE-Frontend |
| N3 | `web-app/src/components/prediction/predict-page-window-badge.tsx` | Client component: live countdown badge for predict page header | PSE-Frontend |
| N4 | `web-app/src/components/prediction/pre-window-banner.tsx` | Client component: "Not Open Yet" banner replacing form when pre-window | PSE-Frontend |

### Modified Files

| # | File | Changes | Owner |
|---|---|---|---|
| M1 | `web-app/src/lib/constants.ts` | Add `PREDICTION_WINDOW_OPEN_HOUR_IST` to `LIMITS`. Add `PREDICTION_WINDOW_COPY` object. | PSE-Frontend |
| M2 | `web-app/src/lib/utils.ts` | Add `computeWindowOpen()`, `isWindowOpen()`, `getWindowState()`, `formatWindowDate()`. | PSE-Frontend |
| M3 | `web-app/src/lib/utils.test.ts` | Add test suites for `computeWindowOpen`, `isWindowOpen`, `getWindowState`, `formatWindowDate`. | PSE-Frontend |
| M4 | `web-app/src/lib/actions/predictions.ts` | Add window-open check before deadline check. Import `computeWindowOpen`. Use `PREDICTION_WINDOW_COPY` for error messages. | PSE-Frontend |
| M5 | `web-app/src/app/group/[groupId]/page.tsx` | Replace `<Link>` CTA + deadline `<p>` with `<WindowStatusIndicator>`. Remove "Predict Early" text. Import new component + utils. | PSE-Frontend |
| M6 | `web-app/src/app/group/[groupId]/predict/[matchId]/page.tsx` | Compute window state. Replace static header badge with `<PredictPageWindowBadge>`. Conditionally render `<PreWindowBanner>` vs `<PredictionForm>`. Pass `deadline` prop to form. | PSE-Frontend |
| M7 | `web-app/src/components/prediction/prediction-form.tsx` | Add optional `deadline` prop. Use `useCountdown(deadline)` for auto-lock during session. Replace `isLocked` usage with `effectivelyLocked`. | PSE-Frontend |
| M8 | `web-app/src/types/index.ts` | Add `WindowState` type. | PSE-Frontend |
| M9 | `web-app/src/lib/posthog/events.ts` | Add 4 window-related analytics event constants. | PSE-Frontend |
| M10 | `web-app/src/lib/dal/players.ts` | (P1) Add `hasMatchSquads(matchId)` function. | PSE-Frontend |

### Files NOT Modified

| File | Reason |
|---|---|
| `lib/dal/matches.ts` | No new DAL queries needed. `getMatchDeadlineInfo` and `getMatchGroupSettings` already provide the data needed for window computation. |
| `lib/validators.ts` | No changes to Zod schemas. The submission payload shape is unchanged. |
| `types/database.ts` | No schema changes to `match_group_settings` in v1. |
| `hooks/use-countdown.ts` | No changes needed. The existing hook supports any target `Date` and works for both countdown-to-open and countdown-to-close. |
| `components/prediction/scenario-card.tsx` | Unchanged. Disabled state is already controlled by the `disabled` prop from `PredictionForm`. |
| `supabase/functions/match-cron/index.ts` | Unchanged. Auto-lock on match go-live behavior is independent of the window open time. |
| `supabase/functions/sync-data/index.ts` | Unchanged. Runs at 5 AM IST, before the 8 AM window. No coupling. |

---

## 11. Migration Plan

### Migration Sequence

A single migration file handles all database changes:

**File**: `supabase/migrations/036_prediction_window.sql`

**Contents** (full SQL):

```sql
-- Bragg — 036 Prediction Window
--
-- Introduces a lower-bound time gate for predictions:
-- Predictions are only accepted starting at 8:00 AM IST on the match date.
--
-- This migration:
-- 1. Creates prediction_window_open() SQL helper function
-- 2. Updates INSERT RLS policy to add window open check
-- 3. Updates UPDATE RLS policy to add window open check
-- 4. Does NOT modify SELECT policy (read visibility is unchanged)
-- 5. Does NOT modify any existing data
--
-- TIMEZONE SEMANTICS:
--   (m.date + '08:00:00'::time) AT TIME ZONE 'Asia/Kolkata'
--   Interprets the naive timestamp as IST, returns TIMESTAMPTZ in UTC.
--   8:00 AM IST = 2:30 AM UTC. now() is also UTC. Comparison is correct.
--   India does NOT observe DST. IST = UTC+05:30 always.

-- ─── Step 1: Helper function ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION prediction_window_open(
  p_match_date DATE
)
RETURNS TIMESTAMPTZ AS $$
  SELECT (p_match_date + '08:00:00'::time) AT TIME ZONE 'Asia/Kolkata';
$$ LANGUAGE sql IMMUTABLE;

COMMENT ON FUNCTION prediction_window_open IS
  'Returns the prediction window open time (8:00 AM IST) for a given match date. '
  'Used in RLS policies to enforce the lower bound of the prediction window.';

-- ─── Step 2: Update INSERT policy ──────────────────────────────────────

DROP POLICY IF EXISTS "insert_own_prediction" ON predictions;

CREATE POLICY "insert_own_prediction" ON predictions FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM scenarios s
    JOIN matches m ON m.id = s.match_id
    LEFT JOIN match_group_settings mgs
      ON mgs.group_id = s.group_id AND mgs.match_id = s.match_id
    WHERE s.id = predictions.scenario_id
      AND is_group_member(s.group_id, auth.uid())
      AND m.status = 'upcoming'
      AND COALESCE(mgs.is_locked, false) = false
      AND COALESCE(mgs.scenarios_published, false) = true
      AND now() >= prediction_window_open(m.date)
      AND now() < prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)
  )
);

-- ─── Step 3: Update UPDATE policy ──────────────────────────────────────

DROP POLICY IF EXISTS "update_own_prediction" ON predictions;

CREATE POLICY "update_own_prediction" ON predictions FOR UPDATE USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM scenarios s
    JOIN matches m ON m.id = s.match_id
    LEFT JOIN match_group_settings mgs
      ON mgs.group_id = s.group_id AND mgs.match_id = s.match_id
    WHERE s.id = predictions.scenario_id
      AND is_group_member(s.group_id, auth.uid())
      AND m.status = 'upcoming'
      AND COALESCE(mgs.is_locked, false) = false
      AND now() >= prediction_window_open(m.date)
      AND now() < prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)
  )
);
```

### Rollback Plan

If the migration needs to be rolled back:

```sql
-- Rollback 036: remove window open check, restore original policies

DROP POLICY IF EXISTS "insert_own_prediction" ON predictions;
CREATE POLICY "insert_own_prediction" ON predictions FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM scenarios s
    JOIN matches m ON m.id = s.match_id
    LEFT JOIN match_group_settings mgs ON mgs.group_id = s.group_id AND mgs.match_id = s.match_id
    WHERE s.id = predictions.scenario_id
      AND is_group_member(s.group_id, auth.uid())
      AND m.status = 'upcoming'
      AND COALESCE(mgs.is_locked, false) = false
      AND COALESCE(mgs.scenarios_published, false) = true
      AND now() < prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)
  )
);

DROP POLICY IF EXISTS "update_own_prediction" ON predictions;
CREATE POLICY "update_own_prediction" ON predictions FOR UPDATE USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM scenarios s
    JOIN matches m ON m.id = s.match_id
    LEFT JOIN match_group_settings mgs ON mgs.group_id = s.group_id AND mgs.match_id = s.match_id
    WHERE s.id = predictions.scenario_id
      AND is_group_member(s.group_id, auth.uid())
      AND m.status = 'upcoming'
      AND COALESCE(mgs.is_locked, false) = false
      AND now() < prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)
  )
);

DROP FUNCTION IF EXISTS prediction_window_open(DATE);
```

---

## 12. Test Plan (Architecture-Level)

### 12.1 Unit Tests for Utility Functions

**File**: `web-app/src/lib/utils.test.ts`

```
describe("computeWindowOpen")
  ✓ returns 8 AM IST (2:30 AM UTC) for a given date
  ✓ handles different dates correctly
  ✓ returns epoch for invalid date input (fail closed)

describe("isWindowOpen")
  ✓ returns false before 8 AM IST on match day
  ✓ returns true at exactly 8 AM IST on match day
  ✓ returns true during the window (between open and deadline)
  ✓ returns false after deadline passes
  ✓ returns false for dates before match day
  ✓ respects custom deadline for window close
  ✓ returns false when custom deadline is before 8 AM (zero-duration window)

describe("getWindowState")
  ✓ returns PRE_WINDOW_FUTURE when current date < match date
  ✓ returns PRE_WINDOW_MATCH_DAY when match day, before 8 AM IST
  ✓ returns WINDOW_OPEN when between 8 AM and deadline
  ✓ returns WINDOW_CLOSED when after deadline
  ✓ returns WINDOW_CLOSED when deadline <= window open (zero-duration)
  ✓ handles double-header correctly (each match independent)

describe("formatWindowDate")
  ✓ returns short date format (e.g., "Apr 6")
```

### 12.2 Integration Tests for Server Action

**The submitPredictions action** should be tested with:
- Submission at 7:59 AM IST on match day: rejected with `ERROR_WINDOW_NOT_OPEN`
- Submission at 8:00 AM IST on match day: accepted (given other conditions met)
- Submission at deadline - 1 min: accepted
- Submission at deadline + 1 min: rejected with `ERROR_DEADLINE_PASSED`
- Submission on day before match: rejected with `ERROR_WINDOW_NOT_OPEN`

### 12.3 RLS Policy Tests

Verify via direct Supabase client calls:
- INSERT prediction before 8 AM IST: row rejected by RLS
- INSERT prediction at 8 AM IST: row accepted
- UPDATE prediction before 8 AM IST: row rejected
- Existing predictions from before the feature: still readable, not affected

---

## 13. Edge Cases Handled

| Edge Case | How Handled |
|---|---|
| **Zero-duration window** (deadline < 8 AM) | `getWindowState` checks `deadline <= windowOpen` and returns `WINDOW_CLOSED`. RLS: `now() >= window_open AND now() < deadline` is never true. UI: shows `ZERO_WINDOW` copy. |
| **Double-header day** | Each match has independent window. Both open at 8 AM IST, different deadlines. `WindowStatusIndicator` instances are per-match. |
| **User on page at 7:59 AM, stays until 8:01 AM** | `useCountdown(windowOpen)` expires. Component shows "Window is now open -- tap to start" prompt. User taps, `router.refresh()` reloads server data with fresh scenarios and players. |
| **User on predict page at deadline** | `useCountdown(deadline)` expires. `PredictionForm` auto-locks via `isAutoLocked` state. User sees locked banner without page refresh. |
| **Clock skew (client ahead of server)** | Client shows CTA, user submits, server action returns `ERROR_WINDOW_NOT_OPEN`. Error is displayed in the sticky submit bar (existing pattern). |
| **Direct URL access before match day** | `getWindowState` returns `PRE_WINDOW_FUTURE`. Page renders `PreWindowBanner` with future date. No form. No error. |
| **Match rescheduled** | Window follows `match.date`. If date changes in DB, the next page load computes new window boundaries automatically. |
| **Admin custom deadline after 8 AM** | Window is 8 AM to custom deadline. Both `isWindowOpen()` and RLS respect this. |
| **Admin custom deadline before 8 AM** | Zero-duration window (see above). |
| **Match goes live during window** | Existing behavior: `match.status !== "upcoming"` locks predictions. `match-cron` sets `is_locked = true`. No change needed. |

---

## 14. Performance Considerations

1. **No new database queries**: Window state computation is pure date math (`computeWindowOpen`, `computeDeadline`, `getWindowState`). Zero latency added to page loads.

2. **SQL function is IMMUTABLE**: `prediction_window_open()` qualifies as IMMUTABLE since the result depends only on the input parameter. PostgreSQL can cache/inline the result, avoiding per-row function call overhead in RLS policies.

3. **Client-side timers**: `useCountdown` runs a 1-second `setInterval`. With up to 3 match cards on the group page, that's at most 6 intervals (2 per card: one for window open, one for window close). Negligible impact.

4. **No re-renders from window state**: Window state transitions happen at most twice per match (open and close). The `useCountdown` hook only triggers re-renders when the display string changes (every second during the last hour, every minute otherwise via `formatCountdown` bucketing).

---

## 15. Security Considerations

1. **Server is authoritative**: Client-side window state is cosmetic. Even if a user bypasses the UI (removes `disabled`, calls the API directly), the server action and RLS both enforce the window boundaries.

2. **RLS is the final gate**: Even if the server action has a bug, the PostgreSQL RLS policy prevents unauthorized inserts/updates at the database level.

3. **No new attack surface**: The window check is a time comparison. It does not introduce new user input, new database columns, or new API endpoints.

4. **Error messages are safe**: The `ERROR_WINDOW_NOT_OPEN` message tells the user when the window opens (8 AM) but does not leak any internal state, match details, or user data.

---

## 16. Implementation Order

Recommended implementation sequence for PSE agents:

### Phase 1: Foundation (PSE-Supabase + PSE-Frontend in parallel)

| Task | Agent | Dependencies |
|---|---|---|
| Create `036_prediction_window.sql` migration | PSE-Supabase | None |
| Add `WindowState` type to `types/index.ts` | PSE-Frontend | None |
| Add constants (`LIMITS.PREDICTION_WINDOW_OPEN_HOUR_IST`, `PREDICTION_WINDOW_COPY`) to `constants.ts` | PSE-Frontend | None |
| Add utility functions (`computeWindowOpen`, `isWindowOpen`, `getWindowState`, `formatWindowDate`) to `utils.ts` | PSE-Frontend | Constants |
| Add unit tests for utility functions to `utils.test.ts` | PSE-Frontend | Utility functions |
| Add analytics event constants to `posthog/events.ts` | PSE-Frontend | None |

### Phase 2: Server-Side Enforcement (PSE-Frontend)

| Task | Agent | Dependencies |
|---|---|---|
| Update `submitPredictions` server action with window check | PSE-Frontend | Utility functions, constants |

### Phase 3: Components (PSE-Frontend)

| Task | Agent | Dependencies |
|---|---|---|
| Build `WindowStatusIndicator` component | PSE-Frontend | Constants, utils |
| Build `PredictPageWindowBadge` component | PSE-Frontend | Constants, utils, `WindowState` type |
| Build `PreWindowBanner` component | PSE-Frontend | Constants, utils |
| Update `PredictionForm` with `deadline` prop + auto-lock | PSE-Frontend | `useCountdown` hook |

### Phase 4: Page Integration (PSE-Frontend)

| Task | Agent | Dependencies |
|---|---|---|
| Update group page to use `WindowStatusIndicator` | PSE-Frontend | `WindowStatusIndicator`, utils |
| Update predict page to use `PredictPageWindowBadge`, `PreWindowBanner`, conditional rendering | PSE-Frontend | All new components, utils |

### Phase 5: P1 Enhancement (PSE-Frontend)

| Task | Agent | Dependencies |
|---|---|---|
| Add `hasMatchSquads()` DAL function | PSE-Frontend | None |
| Wire squad availability into `PreWindowBanner` | PSE-Frontend | `hasMatchSquads`, `PreWindowBanner` |

---

## 17. Open Questions for User Review

1. **OQ-2 (Window transition UX)**: Architecture assumes the "tap to refresh" pattern for the 8 AM transition (user taps a banner, page refreshes with server data). Auto-activation without refresh is possible but risks stale data. **Confirm**: tap-to-refresh is acceptable?

2. **OQ-3 (Morning matches)**: Architecture handles zero-duration windows (deadline before 8 AM) by showing "Predictions are locked for this match." No fallback to a different open time. **Confirm**: this is acceptable for v1?

3. **Scenario seeding timing**: Currently, `seedSystemScenarios` runs when any user visits the predict page. With the prediction window, users can visit the predict page before 8 AM (and see the pre-window banner). This means scenarios may be seeded before the window opens. Is this desirable, or should seeding be deferred to the window-open period? **Recommendation**: Keep current behavior -- seeding should happen early so scenarios are ready at 8 AM.
