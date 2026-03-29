# Copy Specification: Prediction Window
**Copywriter**: Copy Agent
**Date**: 2026-03-29
**Voice Profile**: Fun, cricket-themed, second-person ("you"). Short punchy phrases. Existing patterns use cricket lingo ("Nailed It", "In Play", "Lock It In", "Picks Under Wraps"). Tone is confident, playful, and direct. Never formal or corporate. Clarity is king -- users must always know WHEN they can predict.

---

## Constants Definition

All copy lives in `web-app/src/lib/constants.ts` as a single exported object, following the `REVEAL_TABLE_COPY` pattern.

```typescript
/** Prediction Window copy — all user-facing text for the window feature */
export const PREDICTION_WINDOW_COPY = {

  // ─── Group Page: Match Card Window States ────────────────────────

  // Pre-window (future day) — match is not today
  CARD_PRE_WINDOW_FUTURE: "Predictions open on {matchDate} at 8:00 AM",

  // Pre-window (match day, before 8 AM) — match is today, window not open yet
  CARD_PRE_WINDOW_TODAY: "Predictions open at 8:00 AM",
  CARD_PRE_WINDOW_TODAY_COUNTDOWN: "Opens in {countdown}",

  // Window open — predictions are live
  CARD_WINDOW_OPEN_CTA: "Make Your Calls",
  CARD_WINDOW_OPEN_DEADLINE: "Closes in {countdown}",

  // Window closed / live — deadline passed or match is live
  CARD_WINDOW_CLOSED: "Predictions Locked",
  CARD_WINDOW_CLOSED_LIVE: "Match is live \u2014 predictions are locked",

  // ─── Predict Page: Header & Banner ───────────────────────────────

  // Window not yet open — user navigated to predict page early
  PREDICT_PRE_WINDOW_TITLE: "Not Open Yet",
  PREDICT_PRE_WINDOW_BODY: "Predictions open at 8:00 AM IST on {matchDate}. Come back when the window opens to make your calls.",
  PREDICT_PRE_WINDOW_BADGE: "Opens {matchDate} at 8:00 AM",

  // Window open — countdown in header
  PREDICT_WINDOW_OPEN_BADGE: "Closes in {countdown}",

  // Window closed — form locked
  PREDICT_WINDOW_CLOSED_TITLE: "Predictions Locked",
  PREDICT_WINDOW_CLOSED_BODY: "Time\u2019s up! The deadline has passed or an admin locked predictions.",

  // Transition prompt — user was on page when window opened at 8 AM
  PREDICT_WINDOW_JUST_OPENED: "Window is now open \u2014 tap to start predicting",

  // ─── Tooltip / Help ──────────────────────────────────────────────

  TOOLTIP_TITLE: "Prediction Window",
  TOOLTIP_BODY: "You can submit picks between 8:00 AM IST on match day and 45 minutes before the match starts. Squads are confirmed by then, so every scenario is ready to go.",

  // ─── Edge Cases ──────────────────────────────────────────────────

  // Match rescheduled to a new date
  RESCHEDULED_NOTICE: "Match moved \u2014 predictions now open on {newDate} at 8:00 AM",

  // Double-header day — informational note on second match card
  DOUBLE_HEADER_NOTE: "Both matches open at 8:00 AM \u2014 different deadlines",

  // Squads not yet available (window open, but no player data)
  SQUADS_PENDING_NOTE: "Squads will be available when the window opens.",
  SQUADS_STILL_LOADING: "Confirmed squads loading \u2014 full team rosters are available now.",

  // Zero-duration window — admin custom deadline before 8 AM, or morning match
  ZERO_WINDOW: "Predictions are locked for this match.",

  // ─── Server Error Messages ───────────────────────────────────────

  ERROR_WINDOW_NOT_OPEN: "Predictions open at 8 AM on match day",
  ERROR_DEADLINE_PASSED: "Too late \u2014 the prediction window has closed",

  // ─── Analytics Events (constant keys, not copy) ──────────────────

  // These are event name constants for posthog, included here for completeness
  // Actual registration should go in lib/posthog/events.ts
  EVENT_WINDOW_NOT_OPEN_VIEWED: "prediction_window_not_open_viewed",
  EVENT_WINDOW_OPENED: "prediction_window_opened",
  EVENT_WINDOW_CLOSED_VIEWED: "prediction_window_closed_viewed",
  EVENT_EARLY_SUBMIT_BLOCKED: "prediction_early_submit_blocked",

} as const;

/** Prediction window timing constant */
// Add to LIMITS object:
// PREDICTION_WINDOW_OPEN_HOUR_IST: 8
```

---

## Screen: Group Page -- Match Cards

### Pre-Window (Future Day)
- **Context**: The match is on a future date (not today). User sees the card but cannot predict.
- **Copy**: "Predictions open on {matchDate} at 8:00 AM"
  - `{matchDate}` uses existing `formatMatchDate()` output (e.g., "Apr 5")
- **Character Limit**: ~45 chars (fits single line on mobile at 320px)
- **Tone**: Informative, no urgency. User just needs to know when to come back.
- **Notes**: Replaces the old "Predict Early" button entirely. No CTA button is shown -- just this status text. This is the biggest behavioral change: users can no longer navigate to the predict page before match day.

### Pre-Window (Match Day, Before 8 AM)
- **Context**: It's match day but before 8:00 AM IST. User is probably checking early.
- **Copy**:
  - Primary: "Predictions open at 8:00 AM"
  - Secondary (if countdown desired): "Opens in {countdown}"
    - `{countdown}` uses `formatCountdown()` (e.g., "1h 23m", "45m")
- **Character Limit**: ~30 chars primary, ~20 chars secondary
- **Tone**: Building anticipation. The user is keen -- reward that energy with a clear countdown.
- **Notes**: No navigate button. The countdown updates via `useCountdown` hook. When countdown hits zero, the card transitions to the "Window Open" state without page refresh (FR-016).
- **Variants considered**:
  1. "Opens at 8:00 AM" (chosen -- short, clear)
  2. "Picks open at 8 AM" (slightly less formal but "picks" vs "predictions" inconsistency)
  3. "Game time at 8 AM" (too ambiguous -- could mean match start)

### Window Open
- **Context**: 8:00 AM IST to 45 minutes before match start. The user can predict now.
- **CTA Button**: "Make Your Calls"
- **Deadline info**: "Closes in {countdown}"
  - `{countdown}` from `formatCountdown()` (e.g., "9h 45m", "2h 15m", "45m")
- **Character Limit**: CTA 15 chars, deadline ~20 chars
- **Tone**: Action-driving. This is the money moment -- get users into the predict flow.
- **Notes**: All match cards (primary and non-primary) now share the same CTA text "Make Your Calls" since the old "Predict Early" concept is retired. Primary card keeps the gradient CTA style; non-primary cards use the muted style. The countdown text replaces the old static "Predictions close at {time}" line.
- **Variants considered**:
  1. "Make Your Calls" (chosen -- matches existing primary CTA, consistent)
  2. "Place Your Picks" (good but introduces new verb pattern)
  3. "Start Predicting" (too generic, lacks personality)

### Window Closed
- **Context**: Deadline has passed (or match is live). Predictions are locked.
- **Copy**: "Predictions Locked"
- **Copy (live match)**: "Match is live -- predictions are locked"
- **Character Limit**: ~40 chars max
- **Tone**: Matter-of-fact. No blame, no disappointment. Just the state.
- **Notes**: Matches existing locked behavior. The live variant keeps the existing green live indicator + locked text pattern.

---

## Screen: Predict Page -- Header & Banner

### Window Not Yet Open
- **Context**: User navigated to the predict URL before the window (bookmarked it, or followed an old link). The form is suppressed entirely.
- **Banner heading**: "Not Open Yet"
- **Banner body**: "Predictions open at 8:00 AM IST on {matchDate}. Come back when the window opens to make your calls."
- **Header badge**: "Opens {matchDate} at 8:00 AM"
- **Character Limit**: Heading 12 chars, body ~85 chars, badge ~25 chars
- **Tone**: Helpful and guiding. The user is eager but early. Redirect their energy to the right time.
- **Notes**: The banner uses the same visual treatment as the existing "Predictions Locked" banner (rounded card, colored border). Uses `--warning` color (amber) to differentiate from the red locked state. The prediction form is completely hidden (FR-015) -- no empty dropdowns, no disabled cards.
- **Variants considered**:
  1. "Not Open Yet" (chosen -- short, clear, no cricket jargon needed here)
  2. "Hold Your Horses" (fun but patronizing)
  3. "Too Early" (implies user mistake; we want neutral)

### Window Not Yet Open (Squad Note)
- **Context**: In addition to the "not open yet" message, squads haven't been populated yet.
- **Additional note**: "Squads will be available when the window opens."
- **Notes**: Only shown when `match_squads` has zero rows for this match (FR-014). Omitted if squads are already available.

### Window Open
- **Context**: User is on the predict page during the active window. Form is interactive.
- **Header badge**: "Closes in {countdown}"
  - Replaces old static "Closes at {time}" text
- **Character Limit**: ~20 chars
- **Tone**: Subtle urgency. The countdown keeps them aware without pressuring.
- **Notes**: Uses `useCountdown` hook. Countdown ticks in real time. When it hits zero, form auto-locks (FR-017). The badge uses `--text-muted` color during normal window, switches to `--danger` color when under 1 hour (matches the "imminent" pattern from `RevealLockedPlaceholder`).

### Window Closed
- **Context**: Deadline passed while user is on the page, or user arrived after deadline.
- **Banner heading**: "Predictions Locked"
- **Banner body**: "Time's up! The deadline has passed or an admin locked predictions."
- **Notes**: This is the existing copy from `prediction-form.tsx`, unchanged. Keeping it consistent.

### Window Just Opened (Transition)
- **Context**: User had the predict page open before 8 AM and the window just opened.
- **Prompt**: "Window is now open -- tap to start predicting"
- **Notes**: Per OQ-2 recommendation, this triggers a page refresh rather than auto-activating the form. Displayed as a tappable banner that calls `router.refresh()`.

---

## Tooltip / Help Text

### Prediction Window Explanation
- **Context**: Accessible via an info icon next to the window status on match cards or the predict page. Brief explanation for first-time users.
- **Title**: "Prediction Window"
- **Body**: "You can submit picks between 8:00 AM IST on match day and 45 minutes before the match starts. Squads are confirmed by then, so every scenario is ready to go."
- **Character Limit**: Title 17 chars, body ~140 chars
- **Tone**: Explanatory but still casual. Answers "what" and "why" in one sentence each.
- **Variants considered**:
  1. Chosen version (above) -- explains both the window and the reason (squads)
  2. "Predictions are open from 8 AM to 45 minutes before first ball." (shorter but doesn't explain why)
  3. "Pick your calls on match day morning. The window closes 45 mins before toss." (cricket-y but "toss" isn't technically accurate -- it's before match start)

---

## Edge Cases

### Match Rescheduled
- **Context**: A match date changes after the schedule was published. The window boundary shifts.
- **Copy**: "Match moved -- predictions now open on {newDate} at 8:00 AM"
- **Notes**: Shown as a subtle info banner on the match card if the date has changed. Uses `--warning` color. The `{newDate}` uses `formatMatchDate()`.

### Double-Header Days
- **Context**: Two matches on the same day. Both windows open at 8 AM but have different close times.
- **Copy**: "Both matches open at 8:00 AM -- different deadlines"
- **Notes**: This is an optional helper note shown at the top of the match cards section on double-header days. Not per-card -- it's a section-level notice. Each card still shows its own individual "Closes in {countdown}" independently.

### Squads Not Yet Available (Window Open)
- **Context**: The window opened at 8 AM but the squad data hasn't synced yet. Player dropdowns fall back to full team rosters.
- **Copy**: "Confirmed squads loading -- full team rosters are available now."
- **Notes**: Shown as a small info banner above the prediction form. Uses `--warning` color. Disappears once confirmed squads populate. This is a P1 nice-to-have.

### Zero-Duration Window
- **Context**: Admin set a custom deadline before 8 AM, or a hypothetical morning match (E5, E6).
- **Copy**: "Predictions are locked for this match."
- **Notes**: The match card shows this directly. No "opens at" or countdown -- the window effectively never existed.

---

## Error Messages

| Trigger | Message | Constant Key | Tone |
|---|---|---|---|
| Submit before 8 AM IST | "Predictions open at 8 AM on match day" | `ERROR_WINDOW_NOT_OPEN` | Informative, guiding |
| Submit after deadline | "Too late -- the prediction window has closed" | `ERROR_DEADLINE_PASSED` | Direct, no blame |

**Notes**: The `ERROR_WINDOW_NOT_OPEN` message is returned by the `submitPredictions` server action (FR-006). It's intentionally short and tells the user exactly when they can try again. The `ERROR_DEADLINE_PASSED` updates the existing generic error to reference the "window" concept for consistency.

---

## Copy Constant Summary (for `constants.ts`)

| Constant Key | Value | Used In |
|---|---|---|
| `CARD_PRE_WINDOW_FUTURE` | "Predictions open on {matchDate} at 8:00 AM" | Group page match card |
| `CARD_PRE_WINDOW_TODAY` | "Predictions open at 8:00 AM" | Group page match card |
| `CARD_PRE_WINDOW_TODAY_COUNTDOWN` | "Opens in {countdown}" | Group page match card |
| `CARD_WINDOW_OPEN_CTA` | "Make Your Calls" | Group page match card CTA |
| `CARD_WINDOW_OPEN_DEADLINE` | "Closes in {countdown}" | Group page match card |
| `CARD_WINDOW_CLOSED` | "Predictions Locked" | Group page match card |
| `CARD_WINDOW_CLOSED_LIVE` | "Match is live -- predictions are locked" | Group page match card |
| `PREDICT_PRE_WINDOW_TITLE` | "Not Open Yet" | Predict page banner |
| `PREDICT_PRE_WINDOW_BODY` | "Predictions open at 8:00 AM IST on {matchDate}. Come back when the window opens to make your calls." | Predict page banner |
| `PREDICT_PRE_WINDOW_BADGE` | "Opens {matchDate} at 8:00 AM" | Predict page header |
| `PREDICT_WINDOW_OPEN_BADGE` | "Closes in {countdown}" | Predict page header |
| `PREDICT_WINDOW_CLOSED_TITLE` | "Predictions Locked" | Predict page banner |
| `PREDICT_WINDOW_CLOSED_BODY` | "Time's up! The deadline has passed or an admin locked predictions." | Predict page banner |
| `PREDICT_WINDOW_JUST_OPENED` | "Window is now open -- tap to start predicting" | Predict page transition |
| `TOOLTIP_TITLE` | "Prediction Window" | Info tooltip |
| `TOOLTIP_BODY` | "You can submit picks between 8:00 AM IST on match day and 45 minutes before the match starts. Squads are confirmed by then, so every scenario is ready to go." | Info tooltip |
| `RESCHEDULED_NOTICE` | "Match moved -- predictions now open on {newDate} at 8:00 AM" | Match card info banner |
| `DOUBLE_HEADER_NOTE` | "Both matches open at 8:00 AM -- different deadlines" | Section-level notice |
| `SQUADS_PENDING_NOTE` | "Squads will be available when the window opens." | Predict page pre-window |
| `SQUADS_STILL_LOADING` | "Confirmed squads loading -- full team rosters are available now." | Predict page form banner |
| `ZERO_WINDOW` | "Predictions are locked for this match." | Match card |
| `ERROR_WINDOW_NOT_OPEN` | "Predictions open at 8 AM on match day" | Server action error |
| `ERROR_DEADLINE_PASSED` | "Too late -- the prediction window has closed" | Server action error |

---

## Template Variables

These placeholders are used in the copy constants and must be interpolated at render time:

| Variable | Source | Example |
|---|---|---|
| `{matchDate}` | `formatMatchDate(match.date)` | "Apr 5" |
| `{countdown}` | `formatCountdown(targetDate)` via `useCountdown` | "9h 45m", "2h 15m", "45m" |
| `{newDate}` | `formatMatchDate(match.date)` after reschedule | "Apr 8" |

**Implementation note**: Use a simple string replace helper (e.g., `copy.replace("{matchDate}", formatted)`) rather than template literals, since these are constant strings. This keeps the constants pure and testable.

---

## Accessibility Notes

- All countdown text must use `aria-live="polite"` to announce updates to screen readers (matches existing `PredictionForm` pattern).
- The "Not Open Yet" banner should have `role="status"` so screen readers announce it on page load.
- The tooltip content should be accessible via keyboard focus (not hover-only).
- Window status text on match cards should be semantically meaningful -- avoid icon-only states.
