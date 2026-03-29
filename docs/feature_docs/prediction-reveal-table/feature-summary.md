# Feature: Prediction Reveal Table
**Completed**: 2026-03-29
**Branch**: `feature/prediction-reveal-table`

## Feature Overview

The Prediction Reveal Table is a cross-reference matrix that shows all squad members' predictions for a match once the prediction deadline passes. It is placed on the match page (`/group/[groupId]/match/[matchId]`) below the existing Match Leaderboard. Each cell displays a member's prediction for a given scenario, color-coded by resolution status: green for correct, red for incorrect, and muted slate for pending. During live matches, cells update automatically via polling as scenarios resolve.

This feature drives the "bragging rights" core loop -- knowing what your friends predicted fuels engagement, banter, and repeat visits during live matches.

## How It Works

1. **Before the prediction deadline**: The table section shows a "Picks Under Wraps" locked placeholder with a countdown timer. No other member's prediction data is exposed.

2. **After the deadline passes** (match locks, goes live, or admin manually locks): The table renders with members as rows and scenarios as columns. The logged-in user's row is highlighted with a cyan background and "(you)" label. Cells without a prediction show an em dash.

3. **During a live match**: A background polling loop runs every 30 seconds. As scenarios resolve server-side, cells transition from the pending slate to green (correct) or red (incorrect) with a smooth CSS color transition. No manual refresh is needed.

4. **After the match**: All cells are in their final resolved state. No polling runs. The table is a static comparison view.

5. **Edge cases handled**: Solo squads see an invite nudge, abandoned matches show a "Match called off" notice, members who made no predictions see em dashes across their row, and empty scenarios cause the section to not render at all.

## Technical Summary

### Architecture

- **Server-side rendering with client-side polling**: The table is SSR on initial load (no loading spinner). A client-side `usePredictionPolling` hook polls for `is_correct` changes during live matches, modeled on the existing `useMatchPolling` pattern.
- **Component hierarchy**: `PredictionRevealSection` (server) gates visibility and fetches data. It renders either `RevealLockedPlaceholder` (client, uses `useCountdown`) or `RevealTablePollingWrapper` (client, uses `usePredictionPolling`) which wraps the presentational `PredictionRevealTable`.
- **No database changes**: Zero new tables, columns, migrations, or RLS policies. The existing `read_others_after_deadline` RLS policy on `predictions` enforces post-lock visibility. A new DAL function `getAllPredictionsForMatch` fetches all predictions for a set of scenario IDs in a single query.
- **Data transformation**: A `buildPredictionMatrix` function converts the flat `RevealPrediction[]` array from the DAL into a nested `Record<userId, Record<scenarioId, { value, isCorrect }>>` for efficient cell lookups.
- **Polling merge strategy**: The poll fetches only `user_id`, `scenario_id`, and `is_correct` (not `value`, which never changes). The `mergePollResults` function immutably updates only cells where `isCorrect` has changed, minimizing React re-renders.

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Pending cell color | Muted slate (`var(--pending)` at 8%) instead of yellow | Reduces visual noise with 240+ cells starting as pending; green/red pop when they appear |
| Section heading | "The Reveal" | Matches Bragg's playful voice; creates anticipation |
| Column headers | Descriptive abbreviations ("Winner", "Top Bat", "MoM") | More readable than ultra-short codes while fitting narrow columns |
| Data structure | `Record<string, ...>` not `Map` | Must be serializable across the React Server Components boundary |
| Separate polling hook | New `usePredictionPolling` | Different table, columns, and interval than `useMatchPolling`; composition over configuration |
| Member row ordering | Leaderboard rank descending, then alphabetical | Top predictors first, consistent with the leaderboard above |

## Files Changed

### New Files

| File | Purpose |
|---|---|
| `web-app/src/hooks/use-prediction-polling.ts` | Client-side polling hook for live `is_correct` updates (197 lines) |
| `web-app/src/components/leaderboard/prediction-reveal-section.tsx` | Server component: data fetching, lock condition, visibility gating (221 lines) |
| `web-app/src/components/leaderboard/prediction-reveal-table.tsx` | Presentational table component: semantic HTML, color-coded cells, sticky column (243 lines) |
| `web-app/src/components/leaderboard/reveal-table-polling-wrapper.tsx` | Client wrapper connecting polling hook to the presentational table (57 lines) |
| `web-app/src/components/leaderboard/reveal-locked-placeholder.tsx` | Pre-lock placeholder with countdown timer (57 lines) |
| `web-app/src/components/leaderboard/reveal-color-legend.tsx` | Compact legend: "Nailed It", "Missed", "In Play", "No Pick" (47 lines) |

### Modified Files

| File | Change |
|---|---|
| `web-app/src/types/index.ts` | Added `RevealPrediction`, `RevealCellData`, `RevealMember`, `RevealScenario` interfaces (+38 lines) |
| `web-app/src/lib/dal/predictions.ts` | Added `getAllPredictionsForMatch()` DAL function (+33 lines) |
| `web-app/src/lib/constants.ts` | Added `REVEAL_TABLE_COPY` and `SCENARIO_SHORT_LABELS` constants (+44 lines) |
| `web-app/src/app/group/[groupId]/match/[matchId]/page.tsx` | Imported and rendered `PredictionRevealSection` below `MatchLeaderboard` (+15 lines) |

### Database Changes

None. No new tables, columns, migrations, indexes, or RLS policies.

### API Changes

None. No new API endpoints. The feature uses existing Supabase client queries gated by existing RLS policies.

### Configuration

None. No new environment variables or feature flags.

## Known Limitations

### v1: `mergePollResults` does not add new predictions after SSR (QA-001)

The polling merge function only updates `isCorrect` for cells that already exist in the prediction matrix from the initial SSR snapshot. If a member submits a prediction after the page loaded (e.g., right before the deadline while another user already has the page open), or if a new member joins the squad after page load, their predictions will not appear in the table until a hard page refresh.

**Why this is acceptable for v1**: The SSR snapshot captures all predictions at page load time. The typical flow is that predictions are locked before the match goes live, so late-arriving predictions are a narrow edge case. Polling correctly updates resolution state (`is_correct`) for all predictions that were present at load time. A page refresh picks up everything.

**Future fix**: The poll query should include `value` so new cells can be populated, and the members list should be refreshed periodically or on navigation.

### Other Minor Issues (from QA review)

- **QA-002**: Abandoned/no_result notice renders outside the card container (visual placement).
- **QA-003**: Pre-lock placeholder is missing the "Picks Under Wraps" heading.
- **QA-004**: Sticky column hover background mismatch on non-current-user rows (inline style specificity issue).
- **QA-005**: Polling does not self-stop when the match transitions away from "live"; relies on external `matchStatus` prop change.
- **QA-006**: `REVEAL_TABLE_COPY.LOADING` and `REVEAL_TABLE_COPY.EMPTY_NO_SCENARIOS` constants are defined but unused (dead code).
- **QA-007**: `points_earned` is fetched by the DAL but unused in the UI.
- **QA-010**: "(you)" label may be truncated for long display names.

## Future Enhancements

The following P2 items from the requirements are deferred to a future version:

- **Animated cell transitions**: Shimmer or flip animation when a cell changes from pending to resolved.
- **Export / share as image**: Screenshot of the table for sharing on WhatsApp/social media.
- **Tap-to-expand cell details**: On mobile, tapping a cell shows full scenario title, correct answer, and points earned.
- **Aggregated row/column stats**: "5/16 correct" at the end of each row, or "most popular pick" at the bottom of each column.
- **Sorting and filtering**: Sort rows by most correct, filter by scenario type.
- **"On Track" / "In Danger" mid-match status**: Integrate the existing `on-track-logic` system into reveal table cells for live match context.
