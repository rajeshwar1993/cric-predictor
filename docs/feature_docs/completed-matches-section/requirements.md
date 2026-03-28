# Feature: Completed Matches Section on Group Page
**Author**: PM Agent
**Status**: Draft
**Date**: 2026-03-28

## 1. Overview

Once a match finishes, it disappears from the group page entirely. Users lose visibility into past results, their prediction performance, and how the group fared. This feature adds a "Completed Matches" section below the existing upcoming/live matches area on the group page, showing the 3 most recent completed matches. It gives users an easy way to revisit results and feeds the core bragging-rights loop that drives engagement.

## 2. User Stories

- **US-001**: As a group member, I want to see recently completed matches on the group page so that I can review past results without leaving the page.
- **US-002**: As a group member, I want to see the final scores and winner for each completed match so that I know the outcome at a glance.
- **US-003**: As a group member, I want to see how many predictions I got right for a completed match so that I can gauge my performance.
- **US-004**: As a group member, I want to tap a completed match card to view the full match leaderboard so that I can see detailed standings.

## 3. Functional Requirements

### 3.1 Data Retrieval

- **FR-001**: The system shall fetch the 3 most recent matches with `status = 'completed'`, ordered by date descending then time descending.
  - Acceptance Criteria: Matches are returned in reverse chronological order. Only matches with status `completed` are included (not `abandoned` or `no_result`).

- **FR-002**: The system shall fetch the current user's prediction summary for each completed match (total predictions made, correct predictions, total points earned).
  - Acceptance Criteria: Summary is accurate per the resolved `predictions` and `scenarios` tables for the given group and match. If the user made zero predictions for a match, the card shows "No predictions" instead of "0/0 correct".

### 3.2 Completed Match Card Display

- **FR-003**: Each completed match card shall display:
  - Team A and Team B names with team badges (using existing `TeamBadge` component)
  - Final scores for both teams (from `current_score_a` / `current_score_b`)
  - Match winner (highlighted visually)
  - Match number, date, and venue
  - Acceptance Criteria: All listed data points are visible on the card. Winner team name is visually distinguished (e.g., bold or accent color).

- **FR-004**: Each completed match card shall display the current user's prediction result summary as a compact badge: "{correct_count}/{total_predicted} correct -- {points} pts".
  - Acceptance Criteria: Badge is visible on the card. Points value matches the sum of `points_earned` for the user's predictions on that match within this group.

- **FR-005**: Each completed match card shall link to the existing match leaderboard page (`/group/[groupId]/match/[matchId]`).
  - Acceptance Criteria: Tapping/clicking the card navigates to the match leaderboard. The existing leaderboard page renders correctly for completed matches (it already does -- the `MatchScorecard` component handles `status === "completed"`).

### 3.3 Section Layout & Ordering

- **FR-006**: The "Completed Matches" section shall appear below the upcoming/live matches section and above the "The Squad" member list section.
  - Acceptance Criteria: Visual ordering is: upcoming matches -> completed matches -> member list. No layout shifts or overlap.

- **FR-007**: The section shall have a heading: "Recent Results".
  - Acceptance Criteria: Heading uses `font-display text-lg font-semibold` consistent with the "The Squad" heading style already on the page.

- **FR-008**: The section shall display a maximum of 3 completed matches. No pagination, no "load more".
  - Acceptance Criteria: Even if 50 matches are completed, only the 3 most recent are shown on the group page.

### 3.4 Visual Treatment

- **FR-009**: Completed match cards shall be visually distinct from upcoming/live match cards to communicate "this is done" at a glance. Use reduced opacity (e.g., `opacity-80`) or a muted card style compared to the upcoming cards.
  - Acceptance Criteria: A user can distinguish completed cards from upcoming cards without reading any text.

- **FR-010**: The match winner's team name/badge shall have a visual accent (e.g., the team's color as a left border, or a small trophy/checkmark icon) to make the winner immediately scannable.
  - Acceptance Criteria: Winner is identifiable within 1 second of looking at the card.

### 3.5 Mobile Responsiveness

- **FR-011**: Completed match cards shall be fully responsive and readable on screens as narrow as 320px.
  - Acceptance Criteria: No horizontal overflow, no truncated scores, no overlapping elements at 320px viewport width. Cards stack vertically.

## 4. Non-Functional Requirements

- **Performance**: The additional database query for completed matches must not add more than 100ms to the group page load time. The query should use the existing `idx_matches_status` and `idx_matches_date` indexes.
- **Security**: Completed match data (scores, results) is non-sensitive and readable by any authenticated user. User prediction summaries must only show the current user's own data. RLS policies on `predictions` and `scenarios` already enforce this -- no new RLS changes needed.
- **Accessibility**: Cards must be keyboard-navigable (as `<Link>` elements they already are). Winner indication must not rely solely on color (include text like "Won" or an icon in addition to color).
- **Caching**: The completed matches query result is stable data (completed matches don't change). Leverage Next.js caching (`"use cache"` or `React.cache`) where the framework supports it.

## 5. Edge Cases & Error States

| Scenario | Expected Behavior |
|----------|-------------------|
| No completed matches yet (season just started) | The "Recent Results" section is not rendered at all. No empty state, no heading -- just absent. |
| Fewer than 3 completed matches (e.g., only 1) | Show only the available completed matches. No placeholder cards for "missing" slots. |
| User joined the group after a match was completed (no predictions for that match) | Card still shows the match result. Prediction summary shows "No predictions" instead of "0/0 correct". |
| Match completed but results not yet resolved (e.g., `resolved_at` is null, scenarios not resolved) | Card shows final scores and winner (if available). Prediction summary shows "Results pending" since `is_correct` is still null. |
| Abandoned or no-result match | Not shown. Only `status = 'completed'` matches appear in this section. |
| Database query fails | The section is not rendered (fail silently, same pattern as the existing upcoming matches section which returns `[]` on error). Log the error via the existing `logError` utility. |
| Multiple matches completed on the same date | Order by `date DESC, time_ist DESC` ensures correct chronological ordering even for double-headers. |

## 6. Out of Scope (v2+)

- **P1 -- "View All Results" link**: A link to a full results page showing all completed matches with filters. For v1, the 3 most recent is sufficient. Defer to v2.
- **P1 -- Group-level prediction stats on card**: Showing how the whole group performed (e.g., "4 of 6 members predicted correctly") on each card. Interesting but adds query complexity. Defer.
- **P2 -- Animation on new result**: When a match transitions from live to completed, animate the card moving from the upcoming section to the completed section. Nice touch but not essential.
- **P2 -- Notification deep-link**: Clicking a "match completed" notification should scroll to or highlight the relevant completed match card. Defer.
- **P2 -- Per-scenario breakdown on hover/expand**: Showing which specific scenarios the user got right/wrong without navigating to the leaderboard. Adds complexity to the card.

## 7. Open Questions

- [ ] **Q1**: Should abandoned matches (`status = 'abandoned'`) appear in this section with a "Match Abandoned" label, or stay hidden? **PM Decision**: Hide them for v1. Abandoned matches are rare and would add visual clutter. Revisit if user feedback suggests otherwise. **Flagged for review.**
- [ ] **Q2**: Should the prediction summary show results across ALL scenarios for the match, or only resolved ones? **PM Decision**: Show only resolved predictions (where `is_correct IS NOT NULL`). Unresolved custom scenarios should not affect the count until they're settled. This avoids confusing "3/10 correct" when 7 are simply unresolved.

## 8. Dependencies

- **Existing**: `MatchScorecard` component (supports `status === "completed"` already), `TeamBadge` component, `ROUTES.MATCH_LEADERBOARD` route, `match_leaderboard` view.
- **New DAL function needed**: `getRecentCompletedMatches(limit: number)` in `web-app/src/lib/dal/matches.ts` -- similar to the existing `getLastCompletedMatch()` but returns up to `limit` rows.
- **New DAL function needed**: `getUserMatchPredictionSummary(userId: string, groupId: string, matchId: number)` in `web-app/src/lib/dal/predictions.ts` -- returns `{ predicted_count, correct_count, points_earned }` for a given user/group/match combination. Could alternatively query the existing `match_leaderboard` view filtered by user.
- **No new migrations**: All required data already exists in the `matches`, `scenarios`, and `predictions` tables.
- **No new API routes**: This is a server-rendered page; data is fetched in the RSC.

## 9. Assumptions

> These are documented for transparency. Flag any that seem wrong.

1. **The `current_score_a` and `current_score_b` fields persist after match completion.** Based on `updateMatchResults` in the DAL, these fields are set during live polling and not cleared when the match transitions to `completed`. If they are cleared, we would need to store final scores in separate fields. **Verified**: The `updateMatchResults` function only sets `status` and `resolved_at`; it does not null out score fields.

2. **The `match_leaderboard` view already works for completed matches.** It joins `scenarios` -> `predictions` -> `profiles` without filtering on match status, so completed matches are included. The match leaderboard page already renders for completed matches.

3. **Group page load is currently fast enough to absorb one additional query.** The page currently makes 4 parallel `Promise.all` queries. Adding a 5th (completed matches) and a 6th (prediction summaries) should remain under acceptable latency since completed-match data is stable and cacheable.

4. **3 matches is the right default.** The user explicitly requested "Only recent 3 completed matches are enough." This is hardcoded, not configurable per group. If we need configurability later, it's a trivial change.

## 10. Priority Summary

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | Fetch 3 most recent completed matches | P0 |
| FR-002 | Fetch user prediction summary per match | P0 |
| FR-003 | Display teams, scores, winner, metadata on card | P0 |
| FR-004 | Display user prediction result badge | P0 |
| FR-005 | Link card to match leaderboard | P0 |
| FR-006 | Section placement below upcoming matches | P0 |
| FR-007 | "Recent Results" section heading | P0 |
| FR-008 | Cap at 3 matches, no pagination | P0 |
| FR-009 | Visual distinction from upcoming cards | P0 |
| FR-010 | Winner visual accent | P1 |
| FR-011 | Mobile responsiveness down to 320px | P0 |
