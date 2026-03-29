# Feature: Prediction Window
**Author**: PM Agent
**Status**: Draft
**Date**: 2026-03-29

## 1. Overview

Currently, users can submit predictions for any upcoming match at any time before the 45-minute pre-match deadline. This creates a problem: player-dependent scenarios (top scorer, MoM, etc.) rely on match-day squad data that only becomes available on the morning of the match (synced at ~5 AM IST by `sync-data`). The "Predict Early" button on the group page encourages users to predict before squads are populated, leading to an incomplete experience.

This feature introduces a formal **prediction window** -- 8:00 AM IST on match day to 45 minutes before match start -- replacing the current "anytime before deadline" model. Clear communication replaces the "Predict Early" button so users always know when they can and cannot submit picks.

## 2. User Stories

- As a **group member**, I want to know exactly when the prediction window opens and closes so that I can plan my picks around my schedule.
- As a **group member**, I want to see a clear countdown or status message instead of a disabled "Predict Early" button so that I am not confused about why I cannot predict yet.
- As a **group member visiting the predict page before the window opens**, I want to see a helpful message explaining when predictions become available, not just a locked form.
- As a **group member during the prediction window**, I want to submit and update my picks normally, with a visible countdown to when the window closes.
- As a **group member after the window closes**, I want to see that predictions are locked and understand that the deadline has passed.
- As a **group admin**, I want the ability to override the prediction window via `match_group_settings.prediction_deadline` (existing behavior) so that I can handle edge cases.

## 3. Functional Requirements

### 3.1 Prediction Window Definition (P0)

- **FR-001**: The prediction window for a match SHALL open at **8:00 AM IST on the match date** (`matchDate + "T08:00:00+05:30"`).
  - Acceptance Criteria: A user attempting to submit a prediction at 7:59 AM IST on match day receives a rejection. A user submitting at 8:00 AM IST succeeds (assuming other conditions are met).

- **FR-002**: The prediction window for a match SHALL close at **45 minutes before match start** (existing `PREDICTION_DEADLINE_MINUTES_BEFORE_MATCH` logic, unchanged).
  - Acceptance Criteria: Existing deadline logic in `computeDeadline()` and `isDeadlinePassed()` continues to control the window close. No change to close behavior.

- **FR-003**: A new utility function `computeWindowOpen(matchDate: string): Date` SHALL be added to `utils.ts` that returns `matchDate + "T08:00:00+05:30"`.
  - Acceptance Criteria: Function exists, is unit-tested, and returns the correct IST timestamp for any valid date string.

- **FR-004**: A new utility function `isWindowOpen(matchDate: string, matchTimeIst: string, customDeadline?: string | null): boolean` SHALL return `true` only when the current time is between window open (8 AM IST) and window close (deadline).
  - Acceptance Criteria: Returns `false` before 8 AM IST, `true` during the window, `false` after deadline. Respects `customDeadline` override for the close time.

- **FR-005**: The admin `customDeadline` override in `match_group_settings.prediction_deadline` SHALL continue to override only the **close** time. It SHALL NOT override the 8 AM open time.
  - Acceptance Criteria: If an admin sets a custom deadline of 6 PM, the window is 8 AM -- 6 PM (not anytime -- 6 PM).
  - **Assumption flagged**: The 8 AM open time is not admin-overridable in v1. If needed, a `prediction_window_open` column can be added in v2.

### 3.2 Server-Side Enforcement (P0)

- **FR-006**: The `submitPredictions` server action SHALL check `isWindowOpen()` instead of only `isDeadlinePassed()`. If the window has not yet opened, return error: `"Predictions open at 8 AM on match day"`.
  - Acceptance Criteria: Server rejects prediction submissions before 8 AM IST with the specified error message. Submissions during the window succeed. Submissions after deadline close fail with the existing "Too late" message.

- **FR-007**: The Supabase RLS policies for prediction INSERT and UPDATE (`019_enforce_scenarios_published_rls.sql`, `017_fix_prediction_update_rls.sql`) SHALL be updated to enforce the 8 AM IST window open time in addition to the existing deadline check.
  - Acceptance Criteria: RLS condition adds `AND now() >= (m.date + '08:00:00'::time) AT TIME ZONE 'Asia/Kolkata'` to the existing deadline check. Direct Supabase inserts before 8 AM IST are rejected.

- **FR-008**: Existing predictions submitted before this feature is deployed SHALL NOT be affected. The new window constraints apply only to new insert/update operations going forward.
  - Acceptance Criteria: Any prediction row with `submitted_at` before deployment continues to exist and is readable. No migration deletes or modifies existing prediction rows.

### 3.3 Group Page -- Match Card Communication (P0)

- **FR-009**: The "Predict Early" button (currently shown for non-primary upcoming matches) SHALL be removed entirely.
  - Acceptance Criteria: No match card renders a "Predict Early" label. The relevant code path in `group/[groupId]/page.tsx` is removed.

- **FR-010**: Each upcoming match card SHALL display a **window status indicator** in the area where the "Predict Early" / "Make Your Calls" button currently lives. The indicator has four states:

  | State | Condition | Display |
  |-------|-----------|---------|
  | **Pre-window (future day)** | Current date < match date | Text: "Predictions open on {matchDate} at 8:00 AM" (no button) |
  | **Pre-window (match day, before 8 AM)** | Match day, current time < 8 AM IST | Text: "Predictions open at 8:00 AM" with optional countdown. No navigate button. |
  | **Window open** | 8 AM IST <= now < deadline | CTA button: "Make Your Calls" + countdown text: "Closes in {countdown}" |
  | **Window closed / Live** | now >= deadline OR match is live | Text: "Predictions are locked" (matches current locked behavior) |

  - Acceptance Criteria: Each state renders correctly based on server time. The countdown updates client-side (existing `useCountdown` hook pattern). State transitions happen without page refresh.

- **FR-011**: The deadline display text currently reading `"Predictions close at {deadlineStr}"` SHALL be updated to reflect the window context:
  - Pre-window: "Predictions open {date} at 8:00 AM IST"
  - Window open: "Closes at {deadlineStr}" (existing format)
  - Window closed: "Predictions locked"
  - Acceptance Criteria: Text matches the specified copy for each state.

### 3.4 Predict Page -- Window Communication (P0)

- **FR-012**: The predict page (`group/[groupId]/predict/[matchId]/page.tsx`) SHALL check the window state and display appropriate messaging in the match header:
  - If the window has not opened: Show a banner/card stating "Predictions open at 8:00 AM IST on {date}" and disable the prediction form (same as current locked behavior).
  - If the window is open: Show "Predictions close in {countdown}" in the header status area.
  - If the window is closed: Show existing locked banner (unchanged).
  - Acceptance Criteria: A user navigating to the predict page before 8 AM sees the "not yet open" message and cannot interact with scenario cards. During the window, the form is interactive. After deadline, existing lock behavior applies.

- **FR-013**: The predict page header currently shows `"Closes at {formatMatchTime(...)}"` when unlocked. This SHALL be updated to show the countdown format: `"Closes in {countdown}"` during the window.
  - Acceptance Criteria: Header shows relative countdown (e.g., "Closes in 2h 15m") instead of absolute time. The countdown ticks down in real-time using the existing `useCountdown` hook.

### 3.5 Player Availability Alignment (P1)

- **FR-014**: When the prediction window has not opened AND players have not been populated for the match (`match_squads` has no rows for this `match_id`), the pre-window message SHOULD include a note: "Squads will be available when the window opens."
  - Acceptance Criteria: If `match_squads` has zero rows for the match, the pre-window message includes the squad availability note. If squads are already populated (e.g., re-synced early), the note is omitted.

- **FR-015**: The predict page, when accessed before the window, SHOULD NOT render player-pick scenario cards with empty dropdowns. Instead, show the pre-window banner and suppress the form entirely.
  - Acceptance Criteria: No empty player dropdown is visible before the window opens. The form renders only during or after the window (locked if after).

### 3.6 Countdown and Real-Time Updates (P1)

- **FR-016**: The group page match card window status SHOULD update in real-time (no page refresh) when the window opens at 8 AM or closes at the deadline.
  - Acceptance Criteria: A user viewing the group page at 7:59 AM sees the pre-window message transition to the "Make Your Calls" CTA at 8:00 AM without reloading. Similarly, the CTA transitions to "locked" at the deadline.

- **FR-017**: The predict page SHOULD auto-lock the form when the deadline passes, using the existing `useCountdown` `isExpired` pattern.
  - Acceptance Criteria: If a user has the predict page open and the deadline passes, the form disables without a page refresh.

### 3.7 Mobile Responsiveness (P0)

- **FR-018**: All window status indicators, countdown text, and CTAs SHALL render correctly on viewports from 320px width and up, following existing responsive patterns (e.g., `sm:` breakpoints already in use).
  - Acceptance Criteria: No text truncation, overflow, or misalignment on iPhone SE (375px), iPhone 14 (390px), or any screen up to desktop widths.

## 4. Non-Functional Requirements

- **Performance**: The window check (`isWindowOpen`) is a pure date comparison with no database call. It SHALL NOT add latency to page loads or server actions. Target: <1ms per check.
- **Security**: Server-side enforcement (FR-006, FR-007) is the source of truth. Client-side UI states are cosmetic only and SHALL NOT be the sole gate. A user bypassing the UI must still be rejected at the action layer and RLS layer.
- **Timezone correctness**: All window open/close calculations SHALL use IST (UTC+05:30) explicitly. India does not observe DST, so the +05:30 offset is always correct. This follows the existing pattern established in `computeDeadline()` and `020_document_deadline_timezone.sql`.
- **Accessibility**: Window status text SHALL be readable by screen readers. Countdown updates SHALL use `aria-live="polite"` (following the existing pattern in `PredictionForm`).

## 5. Edge Cases & Error States

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| E1 | Double-header day (2 matches) | Each match has its own independent window. Both open at 8 AM IST, each closes 45 min before its own start time. |
| E2 | Match rescheduled to a different date after window opened | The window follows the updated `match.date`. If date changes, the 8 AM boundary shifts to the new date. Existing predictions remain valid. |
| E3 | Match time changes (e.g., from 7:30 PM to 3:30 PM) | Deadline (close) shifts automatically since `computeDeadline()` derives from `match.time_ist`. No special handling needed. |
| E4 | User opens predict page at 7:55 AM, stays until 8:01 AM | Client-side countdown triggers form activation at 8:00 AM via `useCountdown` transitioning from expired=true (pre-window) to a newly set countdown target. Alternatively, the page shows a "refresh to predict" prompt. See Open Question OQ-2. |
| E5 | Admin sets a custom deadline that is before 8 AM IST | The window effectively has zero duration (never opens). The match card shows "Predictions locked" since the close time is before the open time. |
| E6 | Match starts at 8:00 AM or earlier (hypothetical morning match) | Deadline would be 7:15 AM, which is before the 8 AM open. Same as E5: window never opens. This is an extreme edge case unlikely in IPL. Flag for user review. See OQ-3. |
| E7 | `sync-data` runs at 5 AM but lineups not yet available from API | The window opens at 8 AM regardless. Player dropdowns fall back to full team rosters (existing `getPlayersForMatch` fallback logic). Users can still predict with roster-level players; squad data updates when available. |
| E8 | User bookmarks the predict URL and visits days before the match | Pre-window message displays. Predict form is suppressed. No error, just informational messaging. |
| E9 | Server time and client time are misaligned | Server is authoritative. Client countdown is cosmetic. If client thinks window is open but server disagrees, the submit action returns the "Predictions open at 8 AM" error and the client displays it. |
| E10 | Match status transitions from "upcoming" to "live" during the window | Existing behavior: `match.status !== "upcoming"` locks predictions. No change needed. |

## 6. Out of Scope (v2+)

- **Admin-configurable window open time**: v1 hardcodes 8 AM IST. A future `prediction_window_open` column in `match_group_settings` could allow per-group/per-match overrides.
- **Push notifications for window open/close**: Users are not notified when the window opens or is about to close. This is a natural v2 enhancement.
- **Partial predictions before the window**: Some users may want to predict team-based scenarios (match winner, toss) before squads are available. Deferred -- the 8 AM boundary simplifies the model.
- **Per-scenario windows**: Different deadlines for different scenario types (e.g., toss prediction locks at toss time). Out of scope for this feature.
- **Timezone preference per user**: All times are shown in IST. No user-level timezone selection.

## 7. Open Questions

- [x] **OQ-1**: Should existing predictions made via the current "anytime" system be preserved? **Decision: Yes.** FR-008 explicitly requires backwards compatibility. The new window only constrains future writes.
- [ ] **OQ-2**: When a user is on the predict page and the window opens (8 AM transition), should the form auto-activate client-side, or should we show a "Refresh to start predicting" prompt? Auto-activation is better UX but requires a client-side timer that re-fetches server state. **Recommendation: Show a "Window is now open -- tap to start" prompt that triggers a page refresh.** This is simpler and avoids stale server data issues.
- [ ] **OQ-3**: If a hypothetical match starts at or before 8 AM IST, the prediction window would have zero or negative duration. Should we handle this with a fallback (e.g., open window 3 hours before match start instead)? **Recommendation: No special handling in v1.** IPL matches are always afternoon or evening. Log a warning if this edge case is hit, and address in v2 if needed.
- [ ] **OQ-4**: The current group page shows up to 3 upcoming matches. Should all 3 show the window status, or only the primary (next) match? **Decision: All upcoming match cards show the window status.** This replaces both "Make Your Calls" and "Predict Early" buttons uniformly.

## 8. Dependencies

- **`sync-data` Edge Function**: Runs at 5 AM IST daily. Syncs lineups for today's matches. The 8 AM window open is intentionally 3 hours after sync to allow time for squad data to populate. No changes needed to `sync-data`.
- **`computeDeadline()` in `utils.ts`**: Existing function for window close time. Will be augmented with `computeWindowOpen()` and `isWindowOpen()`, not modified.
- **RLS policies** (`017`, `019`): Must be updated with a new migration to add the 8 AM open check. This is a database migration dependency.
- **`useCountdown` hook**: Existing client-side countdown infrastructure. Will be reused for both window-open and window-close countdowns. May need a minor enhancement to support counting down to a "start" time (currently only counts down to an "end" time).
- **`match_group_settings` table**: Existing table with `prediction_deadline` and `is_locked` columns. No schema changes needed for v1.

## 9. Assumptions

| # | Assumption | Impact if Wrong |
|---|-----------|-----------------|
| A1 | All IPL 2026 matches start at 3:30 PM IST or later (typical IPL schedule). | If a morning match exists, the window would have zero duration. See E6 and OQ-3. |
| A2 | `sync-data` at 5 AM IST is sufficient to populate lineups before the 8 AM window opens. | If the cricket API does not publish lineups until after 8 AM, users may see roster-level players instead of confirmed squads. The existing fallback in `getPlayersForMatch` handles this gracefully. |
| A3 | The "early prediction" concept is being fully retired -- users should NOT be able to predict before match day at all. | If the user wants to allow team-based predictions early, we need a hybrid approach (partial window). Currently out of scope per Section 6. |
| A4 | India Standard Time (IST, UTC+05:30) is the only relevant timezone for this app. | If international users need localized times, the display layer would need adjustment, but the business logic stays IST-anchored. |
| A5 | The 8:00 AM open time applies globally to all matches, not per-group. | If different groups want different open times, the `match_group_settings` table would need a new column. Deferred to v2. |
