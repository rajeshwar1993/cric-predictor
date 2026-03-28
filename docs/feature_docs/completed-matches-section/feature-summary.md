# Feature: Completed Matches Section
**Completed**: 2026-03-29
**Branch**: feature/completed-matches-section (merged to main)

---

## 1. Feature Overview

### What Was Built

The group page (`/group/[groupId]`) now displays a "Recent Results" section showing the 3 most recently completed IPL matches. Each card shows the final scores, identifies the winning team with a color-accented "Won" tag, and displays the current user's prediction performance (e.g., "3/5 correct . 35 pts"). Tapping a card navigates to the existing match leaderboard page for full details.

### Why It Was Built

Previously, once a match finished it disappeared from the group page entirely. Users had no way to revisit results, check their prediction performance, or see how they did -- all of which feed the core bragging-rights engagement loop. This feature closes that gap by surfacing recent results directly on the group home page without requiring navigation to a separate screen.

### Scope

- Read-only display of completed match data and the current user's prediction summary.
- No new database tables, columns, migrations, RLS policies, API routes, or Server Actions.
- All data already existed; this feature adds two DAL query functions, two new UI components, and integration into the group page.

---

## 2. Key Components and Their Responsibilities

### `getRecentCompletedMatches(limit)` -- DAL Function
**File**: `web-app/src/lib/dal/matches.ts` (lines 115-131)

Queries the `matches` table for rows with `status = 'completed'`, ordered by `date DESC, time_ist DESC`, limited to `limit` (default 3). Returns `Match[]` on success, `[]` on error (fail-silent pattern). Uses the existing `idx_matches_status` index.

### `getUserMatchPredictionSummaries(groupId, userId, matchIds)` -- DAL Function
**File**: `web-app/src/lib/dal/standings.ts` (lines 30-56)

Batch-fetches the current user's prediction summary for multiple completed matches in a single query against the `match_leaderboard` view, using `.in("match_id", matchIds)`. Returns a `Map<number, MatchLeaderboardEntry>` for O(1) lookup by match ID. Returns an empty `Map` on error or when `matchIds` is empty (short-circuits without hitting the database).

### `CompletedMatchesSection` -- Server Component
**File**: `web-app/src/components/match/completed-matches-section.tsx`

Section wrapper that renders the "Recent Results" heading and maps over completed matches to render individual cards. Returns `null` when the matches array is empty, so the section is completely absent from the DOM when there are no completed matches. Derives `resultsPending` and `predictionSummary` for each card from the raw props.

### `CompletedMatchCard` -- Server Component
**File**: `web-app/src/components/match/completed-match-card.tsx`

Renders a single completed match result card with four regions:
1. **Status bar**: `CheckCircle2` icon + "RESULT" label (left), "Match N" (right).
2. **Score rows**: Two rows (one per team) with `TeamBadge`, team code, final score, and an optional "Won" tag for the winner using team-color `color-mix` styling.
3. **Metadata**: Formatted date + venue (with text truncation for long names).
4. **Footer**: `PredictionBadge` sub-component showing the user's score or status, plus a `ChevronRight` navigation affordance.

The entire card is wrapped in a `<Link>` to the match leaderboard page, with a dynamic `aria-label` for screen reader accessibility.

### `PredictionBadge` -- Sub-component (within `completed-match-card.tsx`)
**File**: `web-app/src/components/match/completed-match-card.tsx` (lines 172-210)

Encapsulates the badge rendering logic with three states:
- **Results pending**: "Results pending" in `--pending` color.
- **No predictions**: "No predictions" in muted text.
- **Resolved predictions**: `"{correct}/{resolved} correct . {points} pts"` in success (green) or danger (red) style depending on whether the user got any correct.

---

## 3. Data Flow

```
Group Page (RSC)
  |
  +-- Phase 1: Promise.all (5 parallel queries)
  |     |-- getGroupById(groupId)
  |     |-- getMembers(groupId)
  |     |-- getMembershipStatus(groupId, user.id)
  |     |-- getUpcomingMatches(3)
  |     +-- getRecentCompletedMatches(3)           ** NEW **
  |
  +-- Phase 2: Promise.all (2 parallel queries, depend on Phase 1)
  |     |-- getMembersWhoPredicted(groupId, matchId)  (existing)
  |     +-- getUserMatchPredictionSummaries(          ** NEW **
  |           groupId, user.id, completedMatchIds)
  |
  +-- Render:
        |-- [Group Header]
        |-- [Upcoming/Live Matches]
        |-- <CompletedMatchesSection                   ** NEW **
        |     groupId, matches, predictionSummaries />
        |     |-- For each match:
        |     |     predictionSummaries.get(match.id) -> predictionSummary
        |     |     match.resolved_at === null && !leaderboardEntry -> resultsPending
        |     |     <CompletedMatchCard ... />
        |     |       |-- TeamBadge (reused)
        |     |       |-- PredictionBadge (new sub-component)
        |     |       +-- Link -> /group/{groupId}/match/{matchId}
        +-- [The Squad / MemberList]
```

Key points:
- The new `getRecentCompletedMatches` query runs in parallel with existing Phase 1 queries, adding zero sequential latency.
- The `getUserMatchPredictionSummaries` query runs in Phase 2, parallel with the existing `getMembersWhoPredicted` call. It is a single batched query (not N+1) using `.in("match_id", matchIds)`.
- Total added latency is approximately 20ms (the slower of the two Phase 2 queries, which run in parallel).

---

## 4. Files Created and Modified

### Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `web-app/src/components/match/completed-matches-section.tsx` | Section wrapper: heading + card list + empty-state null return | ~63 |
| `web-app/src/components/match/completed-match-card.tsx` | Individual result card: scores, winner accent, prediction badge | ~210 |

### Files Modified

| File | Change |
|------|--------|
| `web-app/src/lib/dal/matches.ts` | Added `getRecentCompletedMatches(limit)` function (~17 lines) |
| `web-app/src/lib/dal/standings.ts` | Added `getUserMatchPredictionSummaries(groupId, userId, matchIds)` function (~27 lines) |
| `web-app/src/types/index.ts` | Added `CompletedMatchCardData` (11 fields) and `UserPredictionSummary` (4 fields) interfaces |
| `web-app/src/app/group/[groupId]/page.tsx` | Added imports (`standingsDal`, `CompletedMatchesSection`, `MatchLeaderboardEntry`); extended Phase 1 `Promise.all` with 5th query; added Phase 2 parallel fetch for prediction summaries; inserted `<CompletedMatchesSection>` in JSX |

### Files Not Modified

- No Supabase migrations, RLS policies, or database functions.
- No Server Actions (read-only feature).
- No modifications to `MatchScorecard`, `TeamBadge`, constants, or utility functions.
- No new npm packages.

---

## 5. Design Decisions and Tradeoffs

### Batch query instead of per-match query (N+1 avoidance)
The requirements doc originally suggested a per-match `getUserMatchPredictionSummary(userId, groupId, matchId)` function. The architecture chose a batch `getUserMatchPredictionSummaries` (plural) using `.in("match_id", matchIds)` to fetch all summaries in one query. For 3 matches this is 1 query instead of 3. The results are returned as a `Map<number, MatchLeaderboardEntry>` for O(1) lookup.

### Dedicated card component instead of extending MatchScorecard
The existing `MatchScorecard` handles live-specific concerns (batting indicator, toss info, overs). Extending it for completed-match rendering would have added conditional complexity. A new `CompletedMatchCard` was simpler, purpose-built, and includes the prediction summary footer that `MatchScorecard` has no concept of.

### `resolved_count` as the badge denominator (not `predicted_count`)
Per the PM's Q2 decision, only resolved predictions (where `is_correct IS NOT NULL`) contribute to the displayed count. The badge renders `{correct_count}/{resolved_count} correct` to avoid misleading accuracy ratios when custom scenarios remain unresolved. The `UserPredictionSummary` type includes both `predicted_count` and `resolved_count` to support this.

### `resultsPending` logic accounts for `updateLiveSnapshot` edge case
The QA review (QA-001) identified that `updateLiveSnapshot` can set `status = 'completed'` without setting `resolved_at`, creating a window where a completed match has `resolved_at = null`. The implementation addresses this by setting `resultsPending = match.resolved_at === null && !leaderboardEntry` -- so if leaderboard data exists (predictions were resolved), the actual scores are shown even when `resolved_at` is null.

### Structural typing for component props
`CompletedMatchCardData` is a narrower 11-field interface that the full `matches` Row type (~30 fields) satisfies structurally. No explicit mapping or transformation is needed when passing DAL results to the component. This documents the component's data contract without coupling it to the database schema.

### Visual hierarchy via opacity
Completed cards use `opacity-75`, no ring glow, muted "RESULT" label, and no CTA button. This creates a clear visual hierarchy: primary upcoming card (full opacity, CTA) > secondary upcoming cards (`opacity-80`) > completed cards (`opacity-75`, no CTA). Users can distinguish card types at a glance without reading text.

---

## 6. Known Limitations and Future Improvements

### Known Limitations

- **Hardcoded limit of 3**: The number of displayed completed matches is hardcoded at the call site. There is no "View All Results" link or pagination. This is intentional for v1; a full results page is deferred to v2.
- **No group-level prediction stats**: Cards only show the current user's prediction performance, not how the whole group performed (e.g., "4 of 6 members predicted correctly"). This was explicitly scoped out to avoid additional query complexity.
- **Team score row duplication**: The Team A and Team B row markup in `CompletedMatchCard` is ~40 lines of nearly identical JSX (differing only in data bindings). The code review (S-01) and QA review (QA-004) both recommend extracting a `TeamScoreRow` sub-component.
- **`formatMatchDate` timezone edge case**: The shared `formatMatchDate` utility parses date strings as UTC midnight, which can display the wrong date for users in timezones west of UTC (e.g., US-based IPL fans see "Mar 21" instead of "Mar 22"). This is a pre-existing issue not introduced by this feature (QA-002). Fix: parse with explicit IST timezone.
- **`color-mix` Tailwind syntax fragility**: The prediction badge uses Tailwind arbitrary value classes with underscore-to-space substitution (`bg-[color-mix(in_srgb,...)]`), while the "Won" tag uses inline `style`. Minor inconsistency flagged as QA-008.

### Future Improvements (v2+)

- **"View All Results" link**: Navigate to a full results page with filters and all completed matches.
- **Group-level stats on card**: Show how many group members predicted correctly.
- **Animated transition**: When a match goes from live to completed, animate the card moving between sections.
- **Notification deep-link**: Tapping a "match completed" notification scrolls to the relevant card.
- **Per-scenario breakdown**: Expand a card to see which specific scenarios the user got right/wrong.
- **Extract `TeamScoreRow` sub-component**: Eliminate the duplicated team row markup.

---

## 7. How to Test/Verify the Feature

### Prerequisites
- At least one match in the `matches` table with `status = 'completed'`, `match_winner` set, and `current_score_a`/`current_score_b` populated.
- The current user should be a member of a group that has prediction data for at least one completed match (via the `match_leaderboard` view).

### Manual Verification

1. **Section visibility**: Navigate to `/group/[groupId]`. Scroll past the upcoming/live matches section. The "Recent Results" heading should appear, followed by up to 3 completed match cards. If no completed matches exist, the section should be completely absent (no heading, no whitespace).

2. **Card content**: Each card should display:
   - "RESULT" label with a checkmark icon (top-left) and "Match N" (top-right).
   - Two team rows with `TeamBadge` circles, team codes, and final scores.
   - The winning team's row shows a "Won" pill in the team's accent color. The losing team's name and score appear in muted text.
   - A date + venue line below the scores (venue truncated if long).
   - A prediction badge in the footer: green pill for correct predictions, red for zero correct, "No predictions" in gray if the user made none, or "Results pending" if the match is not yet resolved.

3. **Navigation**: Tap/click any completed match card. It should navigate to `/group/[groupId]/match/[matchId]` (the match leaderboard page).

4. **Edge cases**:
   - If only 1 or 2 matches are completed, only that many cards should render (no placeholder slots).
   - If a user joined the group after a match completed (no predictions), the card should show "No predictions" in the footer.
   - At 320px viewport width, cards should not overflow horizontally; the venue should truncate with an ellipsis.

5. **Keyboard accessibility**: Tab to a completed match card. A focus outline (lime-colored, 2px) should appear around the card. Press Enter to navigate to the leaderboard.

6. **Visual hierarchy**: Completed cards should be visually lighter than upcoming match cards (reduced opacity, no glow ring, no CTA button), making it clear at a glance which matches are in the past.

### Automated Test Coverage

The test plan (`test-plan.md`) defines 83 test cases across categories: functional requirements, edge cases, error scenarios, security, performance, visual/UI, accessibility, and data integrity. Key areas for automated testing:

- **DAL functions**: `getRecentCompletedMatches` returns completed matches in correct order, respects limit, returns `[]` on error. `getUserMatchPredictionSummaries` returns a Map keyed by match ID, returns empty Map for empty input, returns empty Map on error.
- **Components**: `CompletedMatchesSection` returns null on empty matches, renders correct number of cards. `CompletedMatchCard` renders all data points, handles null `match_winner`, null scores, null prediction summary, and the pending state.
- **Integration**: Section is placed between upcoming matches and "The Squad" in the group page DOM.

---

## Configuration

No new environment variables, feature flags, or configuration values were introduced.

## Database Changes

None. All data was already available in the `matches` table and `match_leaderboard` view.

## API Changes

None. This is a server-rendered page feature with no new API routes or Server Actions.
