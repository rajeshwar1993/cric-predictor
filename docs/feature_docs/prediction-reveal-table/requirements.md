# Feature: Prediction Reveal Table
**Author**: PM Agent
**Status**: Draft
**Date**: 2026-03-29

## 1. Overview

After the prediction deadline passes for a match, squad members should be able to see what every other member predicted across all scenarios. This is presented as a cross-reference table (members as rows, scenarios as columns) placed below the existing Match Leaderboard on the match page. Each cell is color-coded to reflect the prediction's current resolution state — green for correct, red for incorrect, yellow/amber for pending — and updates dynamically as the match progresses and scenarios resolve. This feature is central to the "bragging rights" core loop: knowing *what* your friends predicted drives engagement, friendly banter, and repeat visits during live matches.

## 2. User Stories

- As a squad member, I want to see what predictions everyone else made after the lock time, so that I can compare my picks against theirs and talk trash.
- As a squad member watching a live match, I want cells to turn green or red in real time as scenarios resolve, so that I feel the excitement of winning or losing alongside my friends.
- As a squad member on my phone, I want to comfortably browse the prediction table without losing track of who predicted what, so that I can use it while watching the match on TV.
- As a squad member before the lock time, I want my predictions to remain private, so that nobody can copy my picks.

## 3. Functional Requirements

### 3.1 Visibility & Access Control (P0)

- **FR-001**: The Prediction Reveal Table MUST NOT render or fetch other members' predictions until the prediction lock condition is met.
  - Acceptance Criteria: When `match.status` is `'upcoming'` AND `now() < prediction_deadline` AND `mgs.is_locked = false`, the table section shows a "locked" placeholder message instead of prediction data.
  - Note: The existing RLS policy `read_others_after_deadline` on the `predictions` table already enforces this server-side (migration 003). The frontend must not attempt to bypass this by showing stale/cached data.

- **FR-002**: Before the lock time, a member MUST only see their own predictions (already handled by the existing predict page). The reveal table section MUST NOT appear or MUST show a clear "Predictions will be revealed after lock time" message.
  - Acceptance Criteria: On a match page for an upcoming, pre-deadline match, the reveal table section either (a) does not render at all or (b) shows a locked/countdown placeholder. No other member's prediction data is exposed.

- **FR-003**: The reveal table MUST be visible to all approved group members once the lock condition is met, regardless of whether the individual member submitted predictions.
  - Acceptance Criteria: A member who predicted 0 scenarios can still see everyone else's predictions after lock. Their row shows "No pick" / dash for each scenario.

### 3.2 Table Layout & Structure (P0)

- **FR-004**: The table MUST display group members as rows and scenarios as columns.
  - Acceptance Criteria: Each row corresponds to one approved group member. Each column corresponds to one active (non-removed, approved/auto-approved) scenario for the match. The member's display name appears in a sticky first column.

- **FR-005**: Column headers MUST display the scenario title (truncated if necessary on small screens).
  - Acceptance Criteria: Each column header shows the scenario title. Titles longer than the column width are truncated with ellipsis. The full title is accessible via a tooltip or expanded view on tap (mobile).

- **FR-006**: Each cell MUST show the prediction value the member submitted for that scenario. If the member did not predict a scenario, the cell shows a dash ("—") or "No pick" indicator.
  - Acceptance Criteria: Cell content matches the `predictions.value` for the (user_id, scenario_id) pair. Missing predictions show a clear "no prediction" indicator.

- **FR-007**: The current user's row MUST be visually highlighted (e.g., different background or left border accent), consistent with the existing leaderboard highlight pattern.
  - Acceptance Criteria: The logged-in user's row has a distinct visual treatment (e.g., `bg-[var(--cyan-soft)]` with a cyan left border) and a "(you)" label, matching the MatchLeaderboard component pattern.

### 3.3 Dynamic Color-Coding (P0)

- **FR-008**: Each prediction cell MUST be color-coded based on its resolution state:
  - **Correct** (`is_correct = true`): Green background tint using `var(--success)` at low opacity.
  - **Incorrect** (`is_correct = false`): Red background tint using `var(--danger)` at low opacity.
  - **Pending** (`is_correct = null`): Yellow/amber background tint using `var(--warning)` at low opacity OR a neutral/muted treatment. *Decision*: Use `var(--pending)` (slate gray `#64748B`) for pending cells to avoid visual noise, since many cells will start as pending. Reserve `var(--warning)` amber for an optional "Sweating / In Danger" state (P2). This keeps the table calm until results flow in.
  - Acceptance Criteria: Cell background color changes correctly for all three states. A scenario that resolves from pending to correct/incorrect updates the cell color without a full page reload (via polling or re-fetch).

  > **Assumption flagged for review**: The user requested yellow for pending. I'm recommending the existing `var(--pending)` (muted slate) instead because with 16 scenarios, a table full of bright yellow cells will be visually overwhelming and reduce the impact of green/red when results arrive. If the user prefers yellow, we swap to `var(--warning)`. This is a low-effort change.

- **FR-009**: Color-coding MUST update as the match progresses without requiring the user to manually refresh the page.
  - Acceptance Criteria: When viewing the match page during a live match, cells transition from pending to correct/incorrect as scenarios are resolved server-side. Update latency should be under 30 seconds (matching existing live score polling cadence).

### 3.4 Placement & Integration (P0)

- **FR-010**: The Prediction Reveal Table MUST be placed on the match page (`/group/[groupId]/match/[matchId]`), below the existing Match Leaderboard component.
  - Acceptance Criteria: The table appears after `<MatchLeaderboard />` in the page layout. Vertical spacing matches the existing `space-y-6` pattern.

- **FR-011**: The table section MUST have a clear heading (e.g., "Prediction Breakdown" or "Everyone's Picks").
  - Acceptance Criteria: A heading element is present above the table, styled consistently with the "Match Leaderboard" heading (`font-display text-lg font-semibold`).

### 3.5 Mobile Responsiveness (P0)

- **FR-012**: On mobile viewports (< 640px), the table MUST be horizontally scrollable with the member name column frozen/sticky on the left.
  - Acceptance Criteria: The first column (member names) remains visible while scrolling horizontally through scenario columns. A scroll indicator or shadow appears on the right edge to signal more content.

- **FR-013**: On desktop viewports (>= 1024px), the table SHOULD display without horizontal scrolling for up to 8 scenarios. Beyond 8, horizontal scrolling with a sticky first column is acceptable.
  - Acceptance Criteria: With a standard 16-scenario match on desktop, the table scrolls horizontally. With fewer than 8 scenarios, the table fits without scrolling.

  > **Assumption**: Squads have up to 15 members and matches have up to 16 system scenarios plus potential custom ones. The table is designed for these bounds. Squads with 1-2 members and 16 scenarios will look sparse but functional.

### 3.6 Data Fetching (P0)

- **FR-014**: The component MUST fetch: (a) all active scenarios for the group+match, (b) all predictions for those scenarios (across all group members), and (c) the list of approved group members with display names.
  - Acceptance Criteria: A single page load produces the complete table. No additional user action is needed to populate data. The query uses existing DAL patterns and respects RLS.

- **FR-015**: The initial data load SHOULD be server-side (SSR) for the match page, consistent with the existing page architecture. Dynamic updates (color changes during live match) use client-side polling.
  - Acceptance Criteria: On first load, the table is part of the server-rendered HTML (no loading spinner for initial state). During live matches, a client-side polling mechanism (matching the existing `LiveMatchScorecard` pattern) updates prediction resolution states.

### 3.7 Scenario Column Ordering (P1)

- **FR-016**: Scenario columns SHOULD be ordered by points (descending), then by system_category, then by creation date — matching the existing scenario display order on the prediction page.
  - Acceptance Criteria: Column order matches `scenarios` query with `.order("points", { ascending: false })`. System scenarios appear before custom scenarios.

### 3.8 Legend / Key (P1)

- **FR-017**: The table SHOULD include a compact color legend (e.g., three small colored dots or squares with labels: Correct, Incorrect, Pending) either above or below the table.
  - Acceptance Criteria: First-time viewers can understand the color coding without explanation. The legend is present but does not dominate visual space.

### 3.9 "No Pick" Distinction (P1)

- **FR-018**: Cells where a member made no prediction SHOULD be visually distinct from pending predictions — e.g., a lighter/grayed-out cell with a dash, versus the pending color.
  - Acceptance Criteria: A cell with no prediction (member skipped the scenario) looks different from a cell where a prediction was made but not yet resolved. The "no pick" cell has no color-coding — it uses a neutral/muted background.

## 4. Non-Functional Requirements

### Performance
- **NFR-001**: The table MUST render within 200ms on a 4G mobile connection for a squad of 15 members and 16 scenarios (240 cells). This means the data set is small (~15 KB JSON) and should not be a bottleneck.
- **NFR-002**: Client-side polling for live updates MUST reuse the existing polling infrastructure (if any) or poll at 30-second intervals to avoid excessive API calls. Each poll should only fetch prediction resolution changes (not the full table data).

### Security
- **NFR-003**: The existing `read_others_after_deadline` RLS policy on `predictions` is the source of truth for visibility. The frontend MUST NOT implement its own deadline check as a substitute — RLS is the enforcement layer; the frontend check is UX-only (to avoid showing an empty table or a confusing error).
- **NFR-004**: No new RLS policies are required. The existing policies already cover: (a) own predictions always readable, (b) others' predictions readable after lock, (c) scenarios readable by group members.

### Accessibility
- **NFR-005**: The table MUST use semantic `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>` elements (not divs styled as a table) for screen reader compatibility.
- **NFR-006**: Color-coded cells MUST also include a text or icon indicator for color-blind users — e.g., a small checkmark icon for correct, an X for incorrect, or the existing `PredictionStatusPill` compact dot pattern.

## 5. Edge Cases & Error States

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| 1 | Squad has 1 member (only the viewer) | Table renders with a single row. No error. Consider showing a friendly "Invite friends to compare picks" message. |
| 2 | Match is upcoming, before deadline | Table section shows a locked placeholder: "Predictions will be revealed when the match starts" with a countdown or lock icon. No prediction data is fetched. |
| 3 | Member joined the squad after predictions were locked | Member sees the table with all other members' predictions. Their own row shows "No pick" for all scenarios since they couldn't predict. |
| 4 | All scenarios are still pending (match just started) | Table renders with all cells in pending state. This is valid. |
| 5 | Match is abandoned / no result | Table still shows predictions (they were already made). Cells for unresolved scenarios remain in pending state. No color updates occur. A note like "Match abandoned — unresolved scenarios voided" could appear. |
| 6 | Custom scenario not yet resolved (admin hasn't entered result) | Cell stays in pending state indefinitely until admin resolves it. This is expected behavior. |
| 7 | Zero scenarios published for the match | Table section does not render. Fall through to empty state — "No scenarios for this match." |
| 8 | Network error during polling update | Table retains its last-known state. No error toast for background poll failures (silent retry on next interval). |
| 9 | Member was removed from group after predicting | Their predictions are still in the database but they won't appear as an approved member. Their row should NOT appear in the table. (The members list query filters by `status = 'approved'`.) |
| 10 | Very long prediction value (e.g., a player name) | Cell content truncates with ellipsis. Full value shown on hover (desktop) or tap (mobile). |
| 11 | Admin manually locks predictions before the natural deadline | Table becomes visible immediately since `mgs.is_locked = true` satisfies the RLS `read_others_after_deadline` policy. |

## 6. Out of Scope (v2+)

- **Sorting/filtering the table** (e.g., sort by most correct, filter by scenario type) — deferred to v2.
- **"On Track" / "In Danger" mid-match status** per cell based on live match data (e.g., a "match winner" prediction is "on track" if the predicted team is batting well) — this is the `on-track-logic` system that already exists for individual picks. Integrating it into the reveal table cells is P2.
- **Animated cell transitions** (e.g., a shimmer or flip animation when a cell changes from pending to resolved) — nice-to-have, deferred.
- **Export / share as image** — screenshot of the table for sharing on WhatsApp/social — deferred.
- **Tap-to-expand cell details** on mobile showing full scenario title, correct answer, and points earned — P2.
- **Aggregated row/column stats** (e.g., "5/16 correct" at the end of each row, or "most popular pick" at the bottom of each column) — deferred.

## 7. Open Questions

- [ ] **Pending color preference**: The user requested yellow for pending. I recommend using the existing muted `var(--pending)` (slate gray) to reduce visual noise since most cells start as pending. Should we use bright yellow (`var(--warning)`) instead? *(Low effort to change either way.)*
- [ ] **Table heading copy**: "Prediction Breakdown" vs "Everyone's Picks" vs "The Reveal" — which resonates best with the Bragg brand voice? *(Copywriter to decide.)*
- [ ] **Scenario title display on mobile**: Abbreviated codes (e.g., "MW" for Match Winner, "TS" for Top Scorer) vs. rotated text vs. scrollable full titles? *(UI/UX Designer to decide.)*

## 8. Dependencies

- **Existing infrastructure (no changes needed)**:
  - `predictions` table with `is_correct` and `points_earned` fields (migration 001).
  - `read_others_after_deadline` RLS policy on predictions (migration 003) — already enforces post-lock visibility.
  - `read_own_predictions` RLS policy (migration 003) — user always sees own predictions.
  - `scenarios` table and DAL (`getScenariosForMatch`) — already fetches active scenarios for a group+match.
  - `group_members` + `profiles` join via `getMembers(groupId)` — already provides approved member list with display names.
  - `resolve_match_predictions` function (migration 002) — already updates `is_correct` on predictions when match data comes in.
  - Match page at `/group/[groupId]/match/[matchId]/page.tsx` — existing server component where the table will be placed.
  - Design system color tokens: `var(--success)`, `var(--danger)`, `var(--pending)`, `var(--warning)`.

- **New code required**:
  - A new DAL function to fetch all predictions for a group+match (across all members, all scenarios) in a single query. The existing `getPredictionsForUser` is scoped to one user; the existing `getPredictionsForScenario` is scoped to one scenario. Neither is efficient for building the full matrix. A new function like `getAllPredictionsForMatch(groupId, matchId)` that joins scenarios + predictions is needed.
  - A new React component (`PredictionRevealTable`) — likely a client component for the polling behavior, or a server component wrapper with a client child for live updates.
  - Integration into the match page layout (adding the component below `MatchLeaderboard`).

## 9. Assumptions

1. **Squad size bound**: Squads have at most ~15 approved members. The table does not need virtual scrolling or pagination for rows.
2. **Scenario count bound**: Matches have at most ~20 scenarios (16 system + a few custom). The table handles this with horizontal scroll rather than pagination.
3. **Polling is acceptable**: Real-time WebSocket updates are not required. Polling every 30 seconds (matching existing live score behavior) is sufficient for color updates during live matches.
4. **RLS is sufficient**: The existing `read_others_after_deadline` policy correctly gates access. No new SECURITY DEFINER function or RLS policy is needed.
5. **No new DB schema**: This feature requires only a new DAL query, not schema changes or migrations.
6. **Lock condition**: The prediction lock condition is the union of: `match.status IN ('live', 'completed', 'abandoned', 'no_result')` OR `mgs.is_locked = true` OR `now() > deadline`. This matches the existing RLS policy.
