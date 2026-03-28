# Test Plan: Completed Matches Section
**QA Engineer**: QA Agent
**Date**: 2026-03-28
**Requirements Doc Version**: Draft, 2026-03-28
**Architecture Doc Version**: Draft, 2026-03-28
**UI/UX Spec Version**: Draft, 2026-03-28

---

## 1. Test Scope

### In Scope
- **DAL layer**: `getRecentCompletedMatches()` in `dal/matches.ts` and `getUserMatchPredictionSummaries()` in `dal/standings.ts`
- **Component rendering**: `CompletedMatchesSection` and `CompletedMatchCard` components
- **Group page integration**: Data fetching changes in `app/group/[groupId]/page.tsx`, JSX placement, parallel query optimization
- **Type definitions**: `CompletedMatchCardData` and `UserPredictionSummary` in `types/index.ts`
- **Functional requirements**: All 11 FRs (FR-001 through FR-011)
- **Edge cases**: All 7 documented edge cases
- **Visual/UI correctness**: Card styling, winner accent, prediction badge states, opacity treatment, responsive layout
- **Performance**: No regression to group page load time; query latency under 100ms budget
- **Data integrity**: Correct scores, correct prediction summaries, correct winner detection
- **Security**: RLS enforcement, user data isolation
- **Accessibility**: Keyboard navigation, screen reader labels, color-independent winner indication

### Out of Scope
- "View All Results" link (deferred to v2)
- Group-level prediction stats on card (deferred to v2)
- Animation when match transitions from live to completed (deferred to v2)
- Notification deep-link scrolling (deferred to v2)
- Per-scenario breakdown on hover/expand (deferred to v2)
- Existing match leaderboard page functionality (pre-existing, not modified)
- Database migration testing (no migrations in this feature)
- Server Action testing (no mutations in this feature)

---

## 2. Test Cases

### 2.1 Happy Path — Functional Requirements

#### FR-001: Fetch 3 most recent completed matches

| ID | Scenario | Steps | Expected Result | Priority |
|--------|----------------------------------------------|-----------------------------------------------|-----------------------------------------------|----------|
| TC-001 | DAL returns completed matches ordered by date DESC, time DESC | 1. Seed DB with 5 completed matches on different dates. 2. Call `getRecentCompletedMatches(3)`. | Returns exactly 3 matches. First match has the latest date. Matches are in reverse chronological order. | P0 |
| TC-002 | DAL respects limit parameter | 1. Seed DB with 5 completed matches. 2. Call `getRecentCompletedMatches(2)`. | Returns exactly 2 matches. | P0 |
| TC-003 | DAL excludes non-completed statuses | 1. Seed DB with matches of statuses: `upcoming`, `live`, `completed`, `abandoned`, `no_result`. 2. Call `getRecentCompletedMatches(10)`. | Only matches with `status = 'completed'` are returned. No `upcoming`, `live`, `abandoned`, or `no_result` matches appear. | P0 |
| TC-004 | DAL orders double-headers correctly | 1. Seed DB with 2 completed matches on the same date: Match A at 15:30, Match B at 19:30. 2. Call `getRecentCompletedMatches(3)`. | Match B (19:30) appears before Match A (15:30) in the result. `ORDER BY date DESC, time_ist DESC` is applied. | P0 |
| TC-005 | DAL default limit is 3 | 1. Seed DB with 5 completed matches. 2. Call `getRecentCompletedMatches()` (no argument). | Returns exactly 3 matches. | P1 |

#### FR-002: Fetch user prediction summary per match

| ID | Scenario | Steps | Expected Result | Priority |
|--------|----------------------------------------------|-----------------------------------------------|-----------------------------------------------|----------|
| TC-006 | Batch query returns summaries for multiple matches | 1. User has predictions for matches 1, 2, 3. 2. Call `getUserMatchPredictionSummaries(groupId, userId, [1, 2, 3])`. | Returns a Map with 3 entries keyed by match_id. Each entry contains `predicted_count`, `correct_count`, `resolved_count`, `match_points`. | P0 |
| TC-007 | Returns Map (not array) for O(1) lookup | 1. Call `getUserMatchPredictionSummaries` with valid params. | Return type is `Map<number, MatchLeaderboardEntry>`. Calling `.get(matchId)` returns the correct entry. | P0 |
| TC-008 | Returns empty Map when matchIds is empty | 1. Call `getUserMatchPredictionSummaries(groupId, userId, [])`. | Returns empty Map immediately without making a database query. | P0 |
| TC-009 | User with no predictions for a match returns no entry | 1. User has predictions for match 1 but not match 2. 2. Call `getUserMatchPredictionSummaries(groupId, userId, [1, 2])`. | Map has entry for match 1 but `.get(2)` returns `undefined`. | P0 |
| TC-010 | Summary values match resolved predictions | 1. User predicted 5 scenarios for a match. 3 are correct (15, 10, 10 pts each = 35 pts total). 2. Call `getUserMatchPredictionSummaries`. | Entry has `predicted_count: 5`, `correct_count: 3`, `match_points: 35`. | P0 |

#### FR-003: Card displays teams, scores, winner, metadata

| ID | Scenario | Steps | Expected Result | Priority |
|--------|----------------------------------------------|-----------------------------------------------|-----------------------------------------------|----------|
| TC-011 | Card renders both team names with TeamBadge | 1. Render `CompletedMatchCard` with `team_a: "CSK"`, `team_b: "MI"`. | Both "CSK" and "MI" text visible. Two `TeamBadge` components rendered with size `sm`. | P0 |
| TC-012 | Card renders final scores | 1. Render card with `current_score_a: "186/4"`, `current_score_b: "172/8"`. | Both scores displayed: "186/4" and "172/8". | P0 |
| TC-013 | Winner team name is visually distinguished | 1. Render card with `match_winner: "CSK"`, `team_a: "CSK"`. | CSK row uses `text-[var(--text-primary)]`. MI row uses `text-[var(--text-secondary)]`. CSK row has a "Won" tag. MI row has no "Won" tag. | P0 |
| TC-014 | Card renders match number | 1. Render card with `match_number: 14`. | Text "Match 14" visible in the status bar area (top-right). | P0 |
| TC-015 | Card renders formatted date and venue | 1. Render card with `date: "2026-03-22"`, `venue: "Wankhede Stadium"`. | Formatted date (e.g., "Sat, Mar 22") and "Wankhede Stadium" visible in metadata line. | P0 |

#### FR-004: Card displays user prediction result badge

| ID | Scenario | Steps | Expected Result | Priority |
|--------|----------------------------------------------|-----------------------------------------------|-----------------------------------------------|----------|
| TC-016 | Shows correct/predicted count and points for resolved predictions | 1. Render card with `predictionSummary: { predicted_count: 5, correct_count: 3, points_earned: 35 }`, `resultsPending: false`. | Badge text: "3/5 correct . 35 pts". Success styling (green background tint, green text). | P0 |
| TC-017 | Shows zero correct in danger style | 1. Render card with `predictionSummary: { predicted_count: 5, correct_count: 0, points_earned: 0 }`, `resultsPending: false`. | Badge text: "0/5 correct . 0 pts". Danger styling (red background tint, red text). | P0 |
| TC-018 | Shows "No predictions" when user has no predictions | 1. Render card with `predictionSummary: null`, `resultsPending: false`. | Text: "No predictions" in muted text. No pill background. | P0 |
| TC-019 | Shows "Results pending" when match not yet resolved | 1. Render card with `resultsPending: true`. | Text: "Results pending" in pending color (`--pending`). | P0 |
| TC-020 | Points value uses font-stats | 1. Render card with a resolved prediction summary. | The points number ("35" in "35 pts") uses `font-stats font-semibold` class. | P1 |

#### FR-005: Card links to match leaderboard page

| ID | Scenario | Steps | Expected Result | Priority |
|--------|----------------------------------------------|-----------------------------------------------|-----------------------------------------------|----------|
| TC-021 | Card is wrapped in Link with correct href | 1. Render card with `groupId: "group-abc"`, `match.id: 14`. | The wrapping `<Link>` element has `href` matching `ROUTES.MATCH_LEADERBOARD("group-abc", 14)`, i.e., `/group/group-abc/match/14`. | P0 |
| TC-022 | Clicking card navigates to leaderboard (E2E) | 1. Navigate to group page with completed matches. 2. Click a completed match card. | Browser navigates to `/group/{groupId}/match/{matchId}`. Leaderboard page renders correctly. | P0 |

#### FR-006: Section placement

| ID | Scenario | Steps | Expected Result | Priority |
|--------|----------------------------------------------|-----------------------------------------------|-----------------------------------------------|----------|
| TC-023 | Section appears between upcoming matches and "The Squad" | 1. Navigate to group page with both upcoming and completed matches. 2. Inspect DOM order. | In the DOM: upcoming matches section appears first, then "Recent Results" section, then "The Squad" heading + `MemberList`. No layout shifts or overlap between sections. | P0 |
| TC-024 | Section spacing matches design | 1. Inspect the group page layout. | `space-y-8` gap from the parent container separates sections. `mb-3` below the "Recent Results" heading. `space-y-3` between cards. | P1 |

#### FR-007: Section heading

| ID | Scenario | Steps | Expected Result | Priority |
|--------|----------------------------------------------|-----------------------------------------------|-----------------------------------------------|----------|
| TC-025 | Heading text is "Recent Results" | 1. Navigate to group page with completed matches. | Heading text reads exactly "Recent Results". | P0 |
| TC-026 | Heading style matches "The Squad" heading | 1. Inspect the "Recent Results" heading classes. | Classes include: `font-display text-lg font-semibold text-[var(--text-primary)]`. Consistent with "The Squad" heading. | P0 |

#### FR-008: Maximum 3 matches, no pagination

| ID | Scenario | Steps | Expected Result | Priority |
|--------|----------------------------------------------|-----------------------------------------------|-----------------------------------------------|----------|
| TC-027 | Only 3 cards rendered even with many completed matches | 1. Seed DB with 10+ completed matches. 2. Navigate to group page. | Exactly 3 completed match cards visible. No "Load more" button. No pagination. | P0 |
| TC-028 | Query uses LIMIT 3 | 1. Inspect the call to `getRecentCompletedMatches` from `page.tsx`. | Called with argument `3`. | P0 |

#### FR-009: Visual distinction from upcoming cards

| ID | Scenario | Steps | Expected Result | Priority |
|--------|----------------------------------------------|-----------------------------------------------|-----------------------------------------------|----------|
| TC-029 | Completed cards have reduced opacity | 1. Render a completed match card. 2. Inspect the outer container. | Container has `opacity-75` class. | P0 |
| TC-030 | Completed cards have no ring/glow | 1. Compare a completed card to a live match card. | Live card has `ring-1 ring-[var(--success)]/30`. Completed card has no `ring` classes. | P0 |
| TC-031 | Completed cards have no CTA button | 1. Inspect completed card content. | No "Make Your Calls", "Predict Early", or "View Leaderboard" button elements. Only a subtle `ChevronRight` icon on the right side of the footer. | P0 |
| TC-032 | Status label says "RESULT" (not "Live" or "Next Match") | 1. Inspect the status bar of a completed card. | Label text is "RESULT" in `text-[var(--text-muted)]`. A `CheckCircle2` icon is present (not a pulsing green dot). | P0 |
| TC-033 | User can distinguish completed from upcoming without reading text | 1. Visual inspection: place completed and upcoming cards side-by-side. | The four differences (lower opacity, no ring, muted status label, no CTA button) make the cards visually distinct at a glance. | P0 |

#### FR-010: Winner visual accent

| ID | Scenario | Steps | Expected Result | Priority |
|--------|----------------------------------------------|-----------------------------------------------|-----------------------------------------------|----------|
| TC-034 | Winning team has "Won" tag | 1. Render card with `match_winner: "CSK"`, `team_a: "CSK"`. | CSK row shows a "Won" tag. SRH/MI row does not. | P1 |
| TC-035 | "Won" tag uses team color with color-mix background | 1. Inspect the "Won" tag styling. | Tag has `style` with `backgroundColor: color-mix(in srgb, {teamColor} 15%, transparent)` and `color: {teamColor}`. | P1 |
| TC-036 | Winner is identifiable within 1 second | 1. Show the card to a user. 2. Ask them which team won. | User can identify the winner within 1 second via: (1) "Won" text, (2) team-color tint, (3) brighter text on winning row vs. muted text on losing row. | P1 |

#### FR-011: Mobile responsiveness

| ID | Scenario | Steps | Expected Result | Priority |
|--------|----------------------------------------------|-----------------------------------------------|-----------------------------------------------|----------|
| TC-037 | Cards fully readable at 320px viewport | 1. Set browser viewport width to 320px. 2. Navigate to group page with completed matches. | No horizontal overflow. No truncated scores. No overlapping elements. Cards stack vertically. | P0 |
| TC-038 | No horizontal scroll at 320px | 1. Set viewport to 320px. 2. Check for horizontal scrollbar. | No horizontal scrollbar present on the page. | P0 |
| TC-039 | Long venue name is truncated | 1. Render card with a long venue: "Dr. Y.S. Rajasekhara Reddy ACA-VDCA Cricket Stadium, Visakhapatnam". 2. Set viewport to 320px. | Venue text is truncated with ellipsis (`truncate` class). No overflow. | P0 |
| TC-040 | "Won" tag does not wrap at narrow widths | 1. Set viewport to 320px. 2. Inspect "Won" tag. | Tag uses `shrink-0 whitespace-nowrap` and stays on the same line as the score. | P1 |

---

### 2.2 Edge Cases

All 7 edge cases from the requirements document, plus additional adversarial scenarios.

| ID | Scenario | Steps | Expected Result | Priority |
|--------|----------------------------------------------|-----------------------------------------------|-----------------------------------------------|----------|
| TC-101 | No completed matches (season just started) | 1. Seed DB with only `upcoming` and `live` matches (zero `completed`). 2. Navigate to group page. | "Recent Results" section is completely absent from the DOM. No heading, no empty container, no whitespace gap. | P0 |
| TC-102 | Fewer than 3 completed matches (e.g., only 1) | 1. Seed DB with 1 completed match. 2. Navigate to group page. | "Recent Results" heading is visible. Exactly 1 completed match card rendered. No placeholder cards for missing slots. | P0 |
| TC-103 | User joined group after match was completed (no predictions) | 1. Complete match 1. 2. Add new user to group. 3. Navigate to group page as new user. | Card shows match result (teams, scores, winner) normally. Prediction summary shows "No predictions" (not "0/0 correct"). | P0 |
| TC-104 | Match completed but not yet resolved (`resolved_at` is null) | 1. Set a match to `status: 'completed'` but `resolved_at: null` (e.g., admin marked status but hasn't entered results via `enterResults()`). 2. Navigate to group page. | Card shows match data (teams, any available scores). Footer shows "Results pending" regardless of whether user has predictions. `resultsPending` flag derived from `match.resolved_at === null`. | P0 |
| TC-105 | Abandoned or no-result match | 1. Seed DB with matches: 2 completed, 1 abandoned, 1 no_result. 2. Navigate to group page. | Only the 2 completed matches appear. Abandoned and no_result matches are excluded by the `status = 'completed'` filter. | P0 |
| TC-106 | Database query for completed matches fails | 1. Simulate a database error in `getRecentCompletedMatches` (e.g., mock Supabase to return an error). 2. Navigate to group page. | Section is not rendered (same as zero completed matches). Error is logged via `logError`. No error toast shown to user. The rest of the group page (header, upcoming matches, member list) renders normally. | P0 |
| TC-107 | Multiple matches completed on the same date (double-header) | 1. Seed DB with 2 completed matches on "2026-04-05": Match A at 15:30, Match B at 19:30. Plus 1 completed match on "2026-04-04". 2. Navigate to group page. | Cards appear in order: Match B (Apr 5, 19:30), Match A (Apr 5, 15:30), then Apr 4 match. The `ORDER BY date DESC, time_ist DESC` ensures correct ordering. | P0 |

#### Additional Adversarial Edge Cases

| ID | Scenario | Steps | Expected Result | Priority |
|--------|----------------------------------------------|-----------------------------------------------|-----------------------------------------------|----------|
| TC-108 | `match_winner` is null on a completed match | 1. Seed a completed match with `match_winner: null` (e.g., tie before super over resolution). 2. Render the card. | Both team rows render in `text-[var(--text-primary)]`. No "Won" tag appears on either team. No crash or undefined error. | P1 |
| TC-109 | `current_score_a` or `current_score_b` is null | 1. Seed a completed match with `current_score_a: null`, `current_score_b: "172/8"`. 2. Render the card. | Team A score shows "--" (fallback). Team B score shows "172/8". No crash. | P1 |
| TC-110 | Database query for prediction summaries fails | 1. Simulate error in `getUserMatchPredictionSummaries`. 2. Navigate to group page. | Returns empty Map. All completed match cards show "No predictions" (graceful degradation). Error is logged. Rest of page works. | P1 |
| TC-111 | User is authenticated but removed from group | 1. User is removed from group (`status: 'removed'`). 2. Navigate to group page. | The group page layout's auth+membership guard redirects or shows 404 before the completed matches section ever renders. This is existing behavior, not new. | P1 |
| TC-112 | Match with `resolved_at` set but some scenarios still unresolved (custom scenarios) | 1. Match has `resolved_at` set. User predicted 10 scenarios, but only 7 are resolved (`resolved_count: 7, predicted_count: 10`). 2. Navigate to group page. | Since `resolved_at` is not null, `resultsPending` is `false`. Prediction badge shows based on the `match_leaderboard` view data: the view's `correct_count` and `predicted_count` reflect the current resolved state. Badge shows e.g., "4/10 correct . 40 pts" (per Q2 decision: only resolved predictions count toward `correct_count`). | P1 |
| TC-113 | Exactly 3 completed matches (boundary) | 1. Seed DB with exactly 3 completed matches. 2. Navigate to group page. | All 3 cards rendered. Section heading visible. No off-by-one errors. | P0 |
| TC-114 | Prediction summary shows only resolved predictions (per Q2) | 1. User has 10 predictions, 7 resolved (4 correct, 3 incorrect), 3 unresolved (custom scenarios). 2. Check the match_leaderboard view values. | `correct_count` reflects only scenarios where `is_correct IS NOT NULL AND is_correct = true`. The badge correctly shows the resolved counts, not total predicted. | P1 |

---

### 2.3 Error Scenarios

| ID | Scenario | Steps | Expected Result | Priority |
|--------|----------------------------------------------|-----------------------------------------------|-----------------------------------------------|----------|
| TC-201 | Both DAL queries fail simultaneously | 1. Mock both `getRecentCompletedMatches` and `getUserMatchPredictionSummaries` to return error. | `completedMatches` = `[]`, `predictionSummaries` = empty Map. Section not rendered. Both errors logged. Page continues to render header, upcoming matches, and member list normally. | P0 |
| TC-202 | Completed matches query succeeds but prediction summaries query fails | 1. Mock `getRecentCompletedMatches` to return 3 matches. Mock `getUserMatchPredictionSummaries` to return error (empty Map). | Cards render with match data (teams, scores, winner). All cards show "No predictions" since the Map is empty. Error logged for the summaries query. | P0 |
| TC-203 | `Promise.all` in Phase 1 partial failure | 1. Mock `getRecentCompletedMatches` to reject. Other Phase 1 queries succeed. | The `Promise.all` propagates the rejection. Verify: if the DAL function catches internally and returns `[]` (which it should per the pattern), then `completedMatches = []` and the section is hidden. If the DAL function throws (bug), the entire page errors. **Verify the DAL catches and returns `[]`.** | P0 |
| TC-204 | Network timeout on completed matches query | 1. Simulate a slow/timeout Supabase response for completed matches. | The overall page load may be delayed (since this query is in the Phase 1 `Promise.all`). Verify: the DAL function's error handling returns `[]` on timeout. The section does not render. Other sections are not blocked (they run in parallel). | P1 |
| TC-205 | `logError` is called with correct context on DAL failure | 1. Mock `getRecentCompletedMatches` to trigger an error. 2. Verify `logError` was called. | `logError` called with `{ layer: "dal", operation: "getRecentCompletedMatches", metadata: { limit: 3 } }` and the error object. | P1 |

---

### 2.4 Security

| ID | Scenario | Steps | Expected Result | Priority |
|--------|----------------------------------------------|-----------------------------------------------|-----------------------------------------------|----------|
| TC-301 | Match data is accessible to any authenticated user | 1. Verify RLS policy on `matches` table. | Policy is `USING (true)` — public read for all authenticated users. Completed match data (scores, winner) is non-sensitive. No changes needed. | P0 |
| TC-302 | Prediction summaries only show current user's data | 1. User A navigates to group page. 2. Inspect the `getUserMatchPredictionSummaries` call. | Query includes `.eq("user_id", userId)` where `userId` is the authenticated user's ID (from `getAuthUser()`). No other users' prediction data is returned or rendered. | P0 |
| TC-303 | RLS on `match_leaderboard` view enforces group membership | 1. Verify that the `match_leaderboard` view uses `security_invoker = true`. 2. Attempt to query leaderboard data for a group the user is not a member of. | The view respects the underlying `predictions` and `scenarios` RLS policies. Non-members cannot access prediction data for groups they don't belong to. | P0 |
| TC-304 | Unauthenticated user cannot access group page | 1. Navigate to `/group/{groupId}` without being logged in. | Redirected to login page by the group layout's auth check. Completed matches data is never fetched. | P0 |
| TC-305 | Non-group-member cannot access group page | 1. Authenticated user who is NOT a member of the group navigates to `/group/{groupId}`. | Redirected or shown 404 by the group layout's membership check. No completed match data exposed. | P0 |
| TC-306 | User cannot see other users' prediction summaries via the completed card | 1. Inspect the rendered HTML of a completed match card. | The card displays ONLY the current user's `correct_count`, `predicted_count`, and `points_earned`. No other user's data appears anywhere on the card. | P0 |

---

### 2.5 Performance

| ID | Scenario | Concern | Validation | Priority |
|--------|----------------------------------------------|-----------------------------------------------|-----------------------------------------------|----------|
| TC-401 | `getRecentCompletedMatches` query latency | New query must not add >100ms to page load (per NFR) | Measure query execution time in isolation. Should complete in <15ms given the `idx_matches_status` index and `LIMIT 3`. Verify index usage with `EXPLAIN ANALYZE`. | P0 |
| TC-402 | `getUserMatchPredictionSummaries` query latency | Batch query for up to 3 match IDs | Measure query execution time. Should complete in <20ms. The `.in("match_id", matchIds)` with max 3 IDs is lightweight. | P0 |
| TC-403 | Phase 1 `Promise.all` parallelism preserved | Adding a 5th query should not serialize fetches | Verify that `getRecentCompletedMatches(3)` is the 5th element in the `Promise.all` array (not a sequential call after it). All 5 queries fire in parallel. | P0 |
| TC-404 | Phase 2 queries run in parallel | `getMembersWhoPredicted` and `getUserMatchPredictionSummaries` should run in parallel | Verify that both queries are in a second `Promise.all` block (not sequential). Neither depends on the other. | P0 |
| TC-405 | No N+1 query pattern | Prediction summaries fetched in single query, not per-match | Verify `getUserMatchPredictionSummaries` is called ONCE with an array of match IDs (up to 3), not called 3 separate times. | P0 |
| TC-406 | Group page total load time does not regress | Current page load + completed matches queries | Baseline: measure current group page load time. After feature: measure again. Difference should be <100ms (ideally <30ms since both new queries run in parallel with existing ones). | P0 |
| TC-407 | Empty completed matches incurs no query penalty for summaries | When no completed matches exist, skip summaries query | Verify: when `completedMatches.length === 0`, `getUserMatchPredictionSummaries` is NOT called. The ternary `completedMatchIds.length > 0 ? ... : Promise.resolve(new Map())` short-circuits. | P1 |

---

### 2.6 Visual / UI Testing

| ID | Scenario | Steps | Expected Result | Priority |
|--------|----------------------------------------------|-----------------------------------------------|-----------------------------------------------|----------|
| TC-501 | Card background uses `bg-card-gradient` | 1. Inspect card container class. | Has `bg-card-gradient` class (linear-gradient from `--bg-card` to `--bg-elevated`). | P1 |
| TC-502 | Card padding is `p-4` (more compact than upcoming cards' `p-5`) | 1. Inspect card container. | Padding is `p-4` (16px), not `p-5` (20px). | P1 |
| TC-503 | Status bar has CheckCircle2 icon + "RESULT" + "Match N" | 1. Inspect status bar. | Left: `CheckCircle2` icon (14px, muted color) + "RESULT" in `text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--text-muted)]`. Right: "Match {N}" in same style. | P1 |
| TC-504 | Score rows use font-stats for numbers | 1. Inspect score text. | Score text (e.g., "186/4") uses `font-stats text-sm font-bold`. | P1 |
| TC-505 | TeamBadge uses size "sm" | 1. Inspect `TeamBadge` components in card. | Both badges rendered with `size="sm"` (32px). | P1 |
| TC-506 | Metadata separator uses middle dot | 1. Inspect metadata line. | Format: `{formatted date} . {venue}` using middle dot character. | P1 |
| TC-507 | ChevronRight icon present in footer | 1. Inspect card footer right side. | `ChevronRight` icon (16px) in `text-[var(--text-muted)]`. | P1 |
| TC-508 | Hover state changes opacity | 1. Hover over a completed card. | Opacity transitions from 0.75 to 0.90 with `transition-opacity`. | P1 |
| TC-509 | Focus-visible outline appears on keyboard focus | 1. Tab to a completed card. | Card shows `outline-2 outline-[var(--border-focus)] outline-offset-2`. | P0 |
| TC-510 | Prediction badge with correct_count > 0 uses success styling | 1. Render card with 3/5 correct. | Badge has `bg-[color-mix(in srgb, var(--success) 10%, transparent)]` and `text-[var(--success)]`. | P1 |
| TC-511 | Prediction badge with 0 correct uses danger styling | 1. Render card with 0/5 correct. | Badge has `bg-[color-mix(in srgb, var(--danger) 10%, transparent)]` and `text-[var(--danger)]`. | P1 |

---

### 2.7 Accessibility Testing

| ID | Scenario | Steps | Expected Result | Priority |
|--------|----------------------------------------------|-----------------------------------------------|-----------------------------------------------|----------|
| TC-601 | Card is keyboard-navigable | 1. Tab through the group page. | Completed match cards are focusable via Tab. Pressing Enter activates the link navigation. | P0 |
| TC-602 | Card has dynamic aria-label | 1. Inspect the `<Link>` element's `aria-label`. | When winner exists: `"{Winner} beat {Loser}, Match {N}. You scored {Z} points from {Y} predictions."` When no predictions: `"... You made no predictions."` When pending: `"... Results are pending."` | P0 |
| TC-603 | Winner indication does not rely solely on color | 1. View a card in grayscale mode (or inspect without color). | Winner is still identifiable via: (1) "Won" text label, (2) brighter text weight for winner row, (3) muted text for loser row. Meets WCAG 1.4.1 (Use of Color). | P0 |
| TC-604 | Primary text passes WCAG AA contrast | 1. Check `--text-primary` (#ecedf6) against `--bg-card` (~#171c28). | Contrast ratio >= 4.5:1. Expected: ~12:1 (passes AAA). | P1 |
| TC-605 | Secondary text passes WCAG AA contrast | 1. Check `--text-secondary` (#9ba1b5) against `--bg-card` (~#171c28). | Contrast ratio >= 4.5:1. Expected: ~5.2:1 (passes AA). | P1 |

---

### 2.8 Data Integrity

| ID | Scenario | Steps | Expected Result | Priority |
|--------|----------------------------------------------|-----------------------------------------------|-----------------------------------------------|----------|
| TC-701 | Displayed scores match database values | 1. Seed match with `current_score_a: "186/4"`, `current_score_b: "172/8"`. 2. Navigate to group page. | Card shows exactly "186/4" and "172/8". No transformation, no rounding. | P0 |
| TC-702 | Displayed winner matches `match_winner` column | 1. Seed match with `match_winner: "CSK"`, `team_a: "CSK"`, `team_b: "MI"`. 2. Render card. | The "Won" tag appears on the CSK row. `isWinnerA = match.match_winner === match.team_a` evaluates to `true`. | P0 |
| TC-703 | Points in badge match `match_points` from leaderboard view | 1. User has `match_points: 85` in `match_leaderboard` view for a match. 2. Render card. | Badge shows "... 85 pts". Not the sum of individual `points_earned` (which should be the same, but verify the source). | P0 |
| TC-704 | `correct_count` matches resolved correct predictions | 1. User has 8 correct out of 12 resolved predictions. 2. Verify `match_leaderboard.correct_count`. | View reports `correct_count: 8`. Badge shows "8/12 correct". | P0 |
| TC-705 | Scores persist after match completion (not nulled out) | 1. Complete a match via `updateMatchResults`. 2. Verify `current_score_a` and `current_score_b` are still populated. | Both score fields retain their values. The `updateMatchResults` function does not null them out (verified in codebase: it only sets `status` and `resolved_at`). | P0 |
| TC-706 | `formatMatchDate` output is correct | 1. Pass `"2026-03-22"` to `formatMatchDate`. | Returns a human-readable date string (e.g., "Sat, Mar 22"). Consistent with existing usage elsewhere in the app. | P1 |

---

## 3. Regression Risks

| Area Affected | Risk Level | Reason | Mitigation |
|-------------------------------|------------|-----------------------------------------------|-----------------------------------------------|
| Group page load performance | Medium | Adding 2 new queries (Phase 1 + Phase 2). If either query is slow, it delays the entire page. | Both queries use indexed columns. Phase 1 query runs in parallel with 4 existing queries. Phase 2 query runs in parallel with existing `getMembersWhoPredicted`. Measure baseline and post-change load times. |
| Existing upcoming/live match cards | Low | No changes to existing match card rendering logic. New section is additive JSX below the existing section. | The existing `.map()` over `upcomingMatches` is unchanged. No shared state or component modifications. |
| Existing "The Squad" member list | Low | `MemberList` component and data fetching are unchanged. Only the JSX ordering changes (new section inserted above it). | Visual regression test: verify MemberList still renders correctly with the new section above it. |
| `Promise.all` Phase 1 | Medium | Adding a 5th element to the `Promise.all`. If the new DAL function throws (instead of returning `[]`), it breaks the entire destructuring. | Verify `getRecentCompletedMatches` follows the fail-silent pattern (catch error, return `[]`). Unit test the error path. |
| Existing `getLastCompletedMatch()` DAL function | None | Not modified. The new `getRecentCompletedMatches` is a separate function. | No risk. |
| Match leaderboard page | None | Not modified. The completed card links TO this page, but the page itself is unchanged. | Smoke test: verify existing leaderboard page still works after clicking a completed card. |
| Group page layout (auth/membership guard) | None | `layout.tsx` is not modified. | No risk. |
| `MatchScorecard` component | None | Not used in the completed card. Not modified. | No risk. |

---

## 4. Data Integrity Checks

- [ ] RLS policy on `matches` table confirmed as `USING (true)` (public read) -- no changes needed
- [ ] RLS on `match_leaderboard` view uses `security_invoker = true` -- queries respect underlying table RLS
- [ ] `getUserMatchPredictionSummaries` filters by `user_id` (defense-in-depth alongside RLS)
- [ ] Foreign key: `match_leaderboard.match_id` references `matches.id` -- no orphaned leaderboard entries for non-existent matches
- [ ] `match_leaderboard.group_id` scoped correctly -- user only sees their own group's data
- [ ] No new tables or columns -- no cascade delete concerns
- [ ] No orphaned records possible: the feature only reads existing data; it creates nothing
- [ ] `current_score_a`/`current_score_b` are not cleared by `updateMatchResults` (verified: the function only sets `status`, `resolved_at`, and result fields passed in)
- [ ] `match_winner` is set during result entry and persists -- verified in `updateMatchResults` DAL function

---

## 5. Cross-Browser / Responsive Testing

### Viewport Breakpoints

| Viewport | Width | Priority | Notes |
|----------|-------|----------|-------|
| Small mobile | 320px | P0 | Minimum target per FR-011. Verify no overflow, no truncation of scores. |
| Standard mobile | 375px | P0 | iPhone SE / standard Android. Primary usage. |
| Large mobile | 414px | P1 | iPhone Plus / large Android. |
| Tablet | 768px | P1 | iPad portrait. |
| Desktop | 1280px | P1 | Standard desktop. Content constrained by max-width from layout. |

### Responsive Checklist

| Check | 320px | 375px | 768px | 1280px |
|-------|-------|-------|-------|--------|
| Cards stack vertically | Yes | Yes | Yes | Yes |
| No horizontal overflow | Verify | Verify | Verify | Verify |
| Scores fully visible (not truncated) | Verify | Verify | Verify | Verify |
| "Won" tag does not wrap | Verify | Verify | N/A | N/A |
| Venue text truncated (long names) | Verify | Verify | Verify | Verify |
| Prediction badge fits on one line | Verify | Verify | Verify | Verify |
| Footer (badge + chevron) on same row | Verify | Verify | Verify | Verify |
| TeamBadge + team code + score fit | Verify | Verify | Verify | Verify |
| Section heading visible | Verify | Verify | Verify | Verify |

### Browser Testing

| Browser | Priority | Notes |
|---------|----------|-------|
| Chrome (latest) | P0 | Primary development browser |
| Safari (latest, macOS + iOS) | P0 | `color-mix()` support verified (Safari 16.2+). `opacity` utilities well-supported. |
| Firefox (latest) | P1 | `color-mix()` supported since Firefox 113. |
| Samsung Internet | P2 | Common Android browser in India. |

---

## 6. Unit Test Specifications

These tests should be added alongside the implementation. They follow the existing patterns observed in the codebase (Vitest + Testing Library, mock Supabase client).

### 6.1 DAL Tests

**File**: `web-app/src/lib/dal/matches.test.ts` (extend existing file)

```
describe("getRecentCompletedMatches", () => {
  TC-001: returns completed matches in reverse chronological order
  TC-002: respects custom limit parameter
  TC-003: filters to only status = 'completed'
  TC-005: defaults to limit of 3
  TC-106: returns empty array on database error
  TC-205: calls logError with correct metadata on failure
})
```

**File**: `web-app/src/lib/dal/standings.test.ts` (extend existing file)

```
describe("getUserMatchPredictionSummaries", () => {
  TC-006: returns Map with entries for each match
  TC-007: Map keys are match_id, values are MatchLeaderboardEntry
  TC-008: returns empty Map when matchIds array is empty (no query)
  TC-009: missing match in results returns undefined on .get()
  TC-110: returns empty Map on database error
})
```

### 6.2 Component Tests

**File**: `web-app/src/components/match/completed-match-card.test.tsx` (new file)

```
describe("CompletedMatchCard", () => {
  TC-011: renders team names with TeamBadge
  TC-012: renders final scores
  TC-013: winner team name styled differently from loser
  TC-014: renders match number in status bar
  TC-015: renders formatted date and venue
  TC-016: shows correct/predicted count and points (success styling)
  TC-017: shows 0 correct in danger styling
  TC-018: shows "No predictions" when predictionSummary is null
  TC-019: shows "Results pending" when resultsPending is true
  TC-021: Link href points to match leaderboard route
  TC-029: card has opacity-75 class
  TC-034: winning team has "Won" tag
  TC-108: no "Won" tag when match_winner is null
  TC-109: shows "--" when score is null
  TC-602: aria-label includes match result and user score
})
```

**File**: `web-app/src/components/match/completed-matches-section.test.tsx` (new file)

```
describe("CompletedMatchesSection", () => {
  TC-101: returns null when matches array is empty
  TC-025: renders "Recent Results" heading
  TC-102: renders correct number of cards (1, 2, or 3)
  TC-113: renders exactly 3 cards when given 3 matches
  TC-104: derives resultsPending from resolved_at === null
})
```

### 6.3 E2E Tests

**File**: `web-app/e2e/tests/14-completed-matches.spec.ts` (new file)

```
test.describe("Completed Matches Section", () => {
  TC-022: clicking card navigates to match leaderboard
  TC-023: section appears between upcoming matches and "The Squad"
  TC-027: at most 3 cards rendered
  TC-101 (E2E): section absent when no completed matches
  TC-601: card is keyboard-navigable (Tab + Enter)
})
```

### 6.4 Storybook Stories

**File**: `web-app/src/components/match/completed-match-card.stories.tsx` (new file)

| Story Name | Variant |
|------------|---------|
| Default | Winner + predictions resolved (3/5 correct, 35 pts) |
| ZeroCorrect | User predicted but got 0 correct (danger styling) |
| NoPredictions | `predictionSummary: null`, `resultsPending: false` |
| ResultsPending | `resultsPending: true` |
| NoWinner | `match_winner: null` (both teams primary, no Won tag) |
| NullScores | `current_score_a: null`, `current_score_b: null` |
| LongVenueName | Venue with 80+ characters (tests truncation) |

**File**: `web-app/src/components/match/completed-matches-section.stories.tsx` (new file)

| Story Name | Variant |
|------------|---------|
| ThreeMatches | 3 completed matches, various prediction states |
| OneMatch | Single completed match |
| Empty | `matches: []` -- should render nothing (verify in Storybook) |

---

## 7. Test Execution Priority

### P0 (Must pass before merge)
All tests marked P0 above. Summary:
- DAL functions return correct data and handle errors (TC-001 through TC-010, TC-106, TC-107)
- Component renders all required data points (TC-011 through TC-019)
- Card links to correct route (TC-021, TC-022)
- Section placement is correct (TC-023)
- Section heading is correct (TC-025, TC-026)
- Maximum 3 cards enforced (TC-027, TC-028)
- Visual distinction from upcoming cards (TC-029 through TC-033)
- All 7 documented edge cases (TC-101 through TC-107)
- Error scenarios fail silently (TC-201 through TC-203)
- Security: data access scoped correctly (TC-301 through TC-306)
- Performance: queries in parallel, no N+1 (TC-401 through TC-406)
- Responsive: no overflow at 320px (TC-037, TC-038, TC-039)
- Accessibility: keyboard nav + focus indicator (TC-509, TC-601, TC-602, TC-603)
- Data integrity: scores and winner match database (TC-701 through TC-705)

### P1 (Should pass, can fix post-merge if needed)
- Winner visual accent details (TC-034 through TC-036)
- Specific CSS class verification (TC-020, TC-040, TC-501 through TC-511)
- Additional adversarial edge cases (TC-108 through TC-114)
- Additional error scenarios (TC-204, TC-205)
- Contrast ratio checks (TC-604, TC-605)
- Performance optimization details (TC-407)
- Data formatting (TC-706)

### P2 (Nice to have)
- Cross-browser testing on Samsung Internet
- Visual regression with screenshot comparison
- Performance benchmarking with production-scale data (50+ completed matches)
