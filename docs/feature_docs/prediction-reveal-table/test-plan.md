# Test Plan: Prediction Reveal Table
**QA Engineer**: QA Agent
**Date**: 2026-03-29
**Requirements Doc Version**: Draft, 2026-03-29
**Technical Architecture Version**: Draft, 2026-03-29
**UI/UX Spec Version**: Draft, 2026-03-29

---

## 1. Test Scope

### In Scope
- Visibility rules: pre-lock hidden, post-lock visible, all lock condition variants
- Table rendering: member rows, scenario columns, cell values, ordering
- Color-coding: correct (green), incorrect (red), pending (muted slate), no-pick (neutral)
- Accessibility icons: Check for correct, X for incorrect, em dash for no pick
- Current user row highlight and "(you)" label
- Section heading ("The Reveal") and color legend
- Responsive behavior: sticky first column, horizontal scroll, column widths across breakpoints
- Polling: `usePredictionPolling` hook for live match updates, stop on completion
- Pre-lock placeholder: locked message, countdown timer
- Empty states: no predictions, solo squad, no scenarios
- Edge cases: removed members, late joiners, abandoned matches, long values, admin manual lock
- Data integrity: correct mapping of predictions to member x scenario matrix
- Security: RLS enforcement of `read_others_after_deadline` policy
- Performance: rendering 15 members x 16 scenarios (240 cells)
- New DAL function: `getAllPredictionsForMatch`
- `buildPredictionMatrix` transformation function
- `mergePollResults` function
- Integration with match page (placement below `MatchLeaderboard`)
- Regression: existing MatchLeaderboard, LiveMatchScorecard, ExpandablePicks unaffected

### Out of Scope
- Sorting/filtering the table (deferred to v2)
- "On Track" / "In Danger" mid-match status integration (P2)
- Animated cell transitions (deferred)
- Export / share as image (deferred)
- Tap-to-expand cell details on mobile (P2)
- Aggregated row/column stats (deferred)

---

## 2. Test Cases

### 2.1 Happy Path

| ID | Scenario | Steps | Expected Result |
|--------|--------------------------------------|------------------------------------------|------------------------------------------------|
| TC-001 | Reveal table visible after deadline (match live) | 1. As a squad member, navigate to match page for a live match where deadline has passed. 2. Scroll below the Match Leaderboard. | "The Reveal" section heading is visible. A semantic `<table>` renders below the leaderboard with all approved members as rows and all approved scenarios as columns. |
| TC-002 | Correct cell values displayed | 1. Member A predicted "CSK" for match_winner, "Virat Kohli" for top_scorer. 2. View the reveal table after lock. | Member A's row shows "CSK" under the Winner column and "Virat K." (or truncated form) under the Top Bat column. Values match `predictions.value`. |
| TC-003 | Color-coding: correct prediction (green) | 1. match_winner scenario resolves with correct_answer = "CSK". 2. Member A predicted "CSK". 3. View the reveal table. | Member A's Winner cell has a green background tint (`color-mix(in srgb, var(--success) 12%, transparent)`), green text color, and a Check icon. |
| TC-004 | Color-coding: incorrect prediction (red) | 1. match_winner scenario resolves with correct_answer = "CSK". 2. Member B predicted "MI". 3. View the reveal table. | Member B's Winner cell has a red background tint (`color-mix(in srgb, var(--danger) 12%, transparent)`), red text color, and an X icon. |
| TC-005 | Color-coding: pending prediction (muted slate) | 1. Match is live, top_scorer scenario is not yet resolved. 2. Member A predicted "Virat Kohli". | Member A's Top Bat cell has a muted slate background tint (`color-mix(in srgb, var(--pending) 8%, transparent)`), secondary text color, and no icon. |
| TC-006 | No-pick cell rendering | 1. Member C did not submit a prediction for the toss_winner scenario. 2. View the reveal table. | Member C's Toss cell shows an em dash character, has no color background (transparent), muted text color, and no icon. |
| TC-007 | Current user row highlighted | 1. Log in as Member A. 2. View the reveal table. | Member A's row has `bg-[var(--cyan-soft)]` background, a cyan left border accent (`border-l-2 border-l-[var(--cyan)]`), and "(you)" text appended after the display name. |
| TC-008 | Section heading and legend visible | 1. Navigate to the reveal table (post-lock). | "The Reveal" heading is rendered with `font-display text-lg font-semibold`. Below the table, a color legend displays four items: green dot + "Nailed It", red dot + "Missed", gray dot + "In Play", dash + "No Pick". |
| TC-009 | Scenario column ordering | 1. Match has 16 system scenarios with varying point values. | Columns are ordered by points descending, then by system_category, then by creation date. Higher-point scenarios (e.g., Player of Match at 20 pts) appear before lower-point scenarios. |
| TC-010 | Member row ordering | 1. Members have varying leaderboard rankings. Member X has 0 predictions (not on leaderboard). | Members are ordered by leaderboard rank (points desc, earliest submission). Members with zero predictions are appended at the end, sorted alphabetically by display name. |
| TC-011 | Column headers show scenario titles with points | 1. View the reveal table on desktop. | Each column header shows the scenario title (or abbreviation on mobile) and a small points badge (e.g., "10 pts") below it. Full title is available as a tooltip on hover. |
| TC-012 | Table caption for screen readers | 1. Inspect the rendered `<table>` element. | A `<caption>` element exists with text "Squad predictions for {teamA} vs {teamB}, Match {matchNumber}" and is visually hidden (`sr-only`). |
| TC-013 | Reveal table renders via SSR (no loading spinner on initial load) | 1. Navigate to a post-lock match page. 2. Observe the initial page render (disable JavaScript or check SSR source). | The reveal table content is present in the server-rendered HTML. No loading spinner or skeleton is shown for the initial state. |
| TC-014 | Table renders after MatchLeaderboard | 1. Navigate to the match page post-lock. 2. Check the DOM order. | The `PredictionRevealSection` component appears after the `MatchLeaderboard` component in the page layout, with `space-y-6` vertical spacing. |

### 2.2 Visibility Rules

| ID | Scenario | Steps | Expected Result |
|--------|--------------------------------------|------------------------------------------|------------------------------------------------|
| TC-101 | Pre-lock: table hidden, placeholder shown | 1. Navigate to a match page where `match.status = 'upcoming'` AND `now() < prediction_deadline` AND `mgs.is_locked = false`. | The reveal table does NOT render. Instead, a locked placeholder is shown with a Lock icon, heading text, and countdown. No prediction data is fetched or exposed in the DOM/network requests. |
| TC-102 | Pre-lock placeholder shows countdown | 1. View the locked placeholder for a match with deadline 2 hours away. | Placeholder displays "Picks stay under wraps until lock-in. Sit tight." with a live countdown showing "Reveal in 2h 0m" (updating every second). |
| TC-103 | Pre-lock placeholder: deadline imminent (< 1 hour) | 1. View the locked placeholder with deadline 30 minutes away. | Placeholder copy changes to "Almost time -- picks drop soon." with countdown "Reveal in 30m". |
| TC-104 | Post-lock via match going live | 1. Match transitions from `upcoming` to `live`. 2. Reload the match page. | Reveal table renders with all members' predictions visible. RLS policy satisfied by `match.status = 'live'`. |
| TC-105 | Post-lock via admin manual lock | 1. Admin manually locks predictions (`mgs.is_locked = true`) while match is still `upcoming`. 2. Member navigates to match page. | Reveal table renders. RLS policy satisfied by `mgs.is_locked = true`. |
| TC-106 | Post-lock via deadline passing (match still upcoming) | 1. Custom deadline passes but match has not started (status still `upcoming`). 2. Member navigates to match page. | Reveal table renders. RLS policy satisfied by `now() > prediction_deadline`. |
| TC-107 | Post-lock: completed match | 1. Navigate to a match page where `match.status = 'completed'`. | Reveal table renders with all cells in final state (green/red, no pending). |
| TC-108 | Post-lock: abandoned match | 1. Navigate to a match page where `match.status = 'abandoned'`. | Reveal table renders. Unresolved scenarios remain in pending state. A note "Match called off -- unresolved picks stay as-is." is displayed. |
| TC-109 | Post-lock: no_result match | 1. Navigate to a match page where `match.status = 'no_result'`. | Reveal table renders. Behavior same as abandoned. |
| TC-110 | Deadline boundary: page open across deadline | 1. Open a pre-lock match page. 2. Wait for the deadline to pass without reloading. | The countdown reaches zero and the placeholder shows "Predictions revealed -- refresh to see picks" or similar expired state text. The table does NOT auto-appear (requires page reload since the server component needs to re-fetch data). |
| TC-111 | Member with no predictions can see others' picks | 1. Member D submitted 0 predictions. 2. Deadline passes. 3. Member D views the reveal table. | Member D sees the full table with all other members' predictions. Member D's own row shows em dashes for all scenarios. |

### 2.3 Polling & Live Updates

| ID | Scenario | Steps | Expected Result |
|--------|--------------------------------------|------------------------------------------|------------------------------------------------|
| TC-201 | Polling starts for live match | 1. View the reveal table for a live match. 2. Monitor network requests over 60 seconds. | Polling requests to the `predictions` table occur approximately every 30 seconds. Requests fetch only `user_id, scenario_id, is_correct` (not `value`). |
| TC-202 | Cell color updates during polling | 1. View the reveal table for a live match with all pending cells. 2. Server-side: resolve the toss_winner scenario. 3. Wait for the next poll cycle (<=30s). | Cells in the Toss column transition from pending (muted slate) to green (correct) or red (incorrect). No full page reload occurs. The change is visual only -- cell background color, text color, and icon update. |
| TC-203 | Polling stops when match completes | 1. View the reveal table for a live match. 2. Match status changes to `completed` (detected via parent `useMatchPolling` or similar). | Prediction polling stops. No further network requests to the predictions table occur after the status change. |
| TC-204 | Polling does not start for completed match | 1. Navigate to a match page for a completed match. 2. Monitor network requests. | No polling requests occur. The table renders with all data from SSR and stays static. |
| TC-205 | Polling does not start for upcoming (post-lock, pre-live) match | 1. Navigate to a match page where deadline has passed but match is still `upcoming`. | No polling requests occur. Data from SSR is static (all cells pending). |
| TC-206 | Poll failure: silent retry | 1. During a live match, simulate a network error on a poll request. | The table retains its last-known state. No error toast or visible error message is shown. The next poll attempt occurs at the normal 30-second interval. |
| TC-207 | Tab visibility: polling pauses when hidden | 1. View the reveal table for a live match. 2. Switch to another browser tab. 3. Wait 60 seconds. 4. Switch back. | No poll requests occur while the tab is hidden. On returning to the tab, an immediate poll is triggered, then the normal interval resumes. |
| TC-208 | Concurrent fetch guard | 1. Trigger a manual refresh during an in-flight poll. | Only one fetch executes at a time. The second request is skipped via the `isFetchingRef` guard. No duplicate data or race conditions. |
| TC-209 | Merge strategy preserves original values | 1. Initial SSR data has `{ value: "CSK", isCorrect: null }`. 2. Poll returns `{ is_correct: true }` for the same cell. | After merge, the cell shows `{ value: "CSK", isCorrect: true }`. The `value` field is preserved from the original SSR data and not overwritten or lost. |
| TC-210 | Poll only updates changed cells | 1. Poll returns data where 2 of 160 cells changed from `null` to `true`. | Only those 2 cells re-render with updated colors. The other 158 cells retain their previous state without unnecessary re-renders (verified via React DevTools profiler or shallow comparison in merge function). |

### 2.4 Edge Cases

| ID | Scenario | Steps | Expected Result |
|--------|--------------------------------------|------------------------------------------|------------------------------------------------|
| TC-301 | Solo squad (1 member) | 1. Squad has only 1 approved member. 2. View the reveal table after lock. | Table renders with a single row (the current user). An additional message "Just you here" / "Bragging's better with rivals. Share your invite link to fill the squad." is displayed. |
| TC-302 | Member joined after lock | 1. Member E joins the squad after predictions are locked. 2. Member E views the match page. | Member E sees the full reveal table. Their own row shows em dashes for all scenarios (they could not predict). Other members' predictions are visible. |
| TC-303 | Removed member not shown | 1. Member F was removed from the group (`status = 'removed'`) after submitting predictions. 2. Other members view the reveal table. | Member F's row does NOT appear in the table. The `getMembers()` query filters by `status = 'approved'`, excluding removed members. |
| TC-304 | All scenarios pending (match just started) | 1. Match just went live, no scenarios resolved yet. | All prediction cells show pending state (muted slate, no icons). Table renders correctly with no errors. |
| TC-305 | All scenarios resolved (match completed) | 1. Match completed, all 16 system scenarios resolved. | Every prediction cell is either green (correct) or red (incorrect). No pending cells remain. |
| TC-306 | No predictions from anyone | 1. All squad members submitted 0 predictions for this match. 2. Deadline passes. | The empty state renders: "No picks on the board" heading with "Nobody made a call for this match. Next time, be the one to get things started." body text. No table is shown. |
| TC-307 | Zero scenarios for the match | 1. No scenarios were published for this match (`scenarios_published = false` or no scenarios exist). | The reveal table section does not render at all (returns `null`). If a fallback renders, it shows "No scenarios for this match yet." |
| TC-308 | Long prediction value (player name) | 1. Member predicts "Ravindra Jadeja" for top_scorer. Cell width is limited. | Cell text truncates with ellipsis (e.g., "Ravindra J..."). Full value "Ravindra Jadeja" is accessible via tooltip (desktop: `title` attribute hover, mobile: long-press). |
| TC-309 | Long scenario title (custom scenario) | 1. A custom scenario has a very long title: "Which team will score more runs in the death overs (16-20)?". | Column header truncates with ellipsis. Full title is available as a tooltip on hover. Mobile uses first 3-4 characters + ellipsis. |
| TC-310 | Custom scenario not yet resolved | 1. Match is completed but admin has not entered the result for a custom scenario. | The custom scenario column shows pending state for all members' cells. Other system scenario columns show resolved states. This is expected behavior. |
| TC-311 | Match abandoned: unresolved scenarios | 1. Match status = 'abandoned'. 2. Some scenarios never resolved. | Unresolved scenario cells remain in pending state permanently. The note "Match called off -- unresolved picks stay as-is." is displayed. |
| TC-312 | 15 members x 20 scenarios (max expected load) | 1. Squad has 15 approved members. Match has 16 system + 4 custom scenarios (20 total). | Table renders all 300 cells without layout issues. Horizontal scroll is required. First column remains sticky. No performance degradation observed. |
| TC-313 | Scenario with mixed approval statuses | 1. Some custom scenarios are `pending` approval, some are `approved`, one is `rejected`. | Only `auto_approved` and `approved` scenarios appear as columns. Pending and rejected scenarios are excluded. |
| TC-314 | Removed scenario excluded | 1. A scenario exists with `is_removed = true`. | The removed scenario does not appear as a column in the table. |

### 2.5 Responsive Behavior

| ID | Scenario | Steps | Expected Result |
|--------|--------------------------------------|------------------------------------------|------------------------------------------------|
| TC-401 | Mobile (< 640px): sticky first column | 1. View the reveal table on a 375px viewport. 2. Scroll horizontally through scenario columns. | The first column (member names) stays fixed/sticky on the left side. It does not scroll with the scenario columns. A subtle shadow appears on the right edge of the sticky column to indicate scroll affordance. |
| TC-402 | Mobile: horizontal scroll indicator | 1. View the reveal table on mobile with 16 scenario columns. | A right-edge gradient fade or shadow indicates more columns are available beyond the visible area. The table is fully scrollable. |
| TC-403 | Mobile: abbreviated column headers | 1. View column headers on a < 640px viewport. | System scenario columns use abbreviated labels (e.g., "Winner", "Toss", "Top Bat", "MoM", "PP Score"). Custom scenario columns show first 3-4 characters + ellipsis. Full titles available on tap tooltip. |
| TC-404 | Tablet (640px - 1023px): intermediate sizing | 1. View the reveal table on a 768px viewport. | Column headers use abbreviated labels. Column width is ~80px. Table scrolls horizontally if more than ~8 columns. Sticky first column works. |
| TC-405 | Desktop (>= 1024px): full titles where space permits | 1. View the reveal table on a 1440px viewport with 8 scenarios. | Table fits without horizontal scrolling. Columns use full scenario titles. Min column width ~80px, max ~120px. |
| TC-406 | Desktop: horizontal scroll for 16+ scenarios | 1. View the reveal table on desktop with 16 system scenarios. | The table scrolls horizontally. First column remains sticky. All 16 columns are accessible via scroll. |
| TC-407 | Sticky column background matches row on scroll | 1. On mobile, scroll horizontally. 2. Observe the current user's highlighted row. | The sticky column cells maintain their background color during scroll: `bg-[var(--bg-elevated)]` for the header, `bg-[var(--cyan-soft)]` for the current user row, `bg-[var(--bg-card)]` for other rows. No content bleeds through. |
| TC-408 | Touch targets on mobile | 1. On a mobile device, attempt to interact with table cells. | Cell padding (`px-2 py-2.5`) provides adequate touch targets. Column headers and cells are tappable for tooltips. |
| TC-409 | Very narrow screen (< 360px): legend wraps | 1. View the color legend on a 320px viewport. | The legend items wrap to two lines instead of overflowing. Layout remains clean. |

### 2.6 Accessibility

| ID | Scenario | Steps | Expected Result |
|--------|--------------------------------------|------------------------------------------|------------------------------------------------|
| TC-501 | Semantic table structure | 1. Inspect the reveal table DOM. | The component uses `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` elements. NOT divs styled as a table. |
| TC-502 | Screen reader: table caption | 1. Navigate to the table with a screen reader (VoiceOver/NVDA). | The screen reader announces the table caption "Squad predictions for {teamA} vs {teamB}, Match {matchNumber}" when the table receives focus. |
| TC-503 | Screen reader: column headers | 1. Navigate to a prediction cell with a screen reader. | The screen reader announces the column header (full scenario title, via `aria-label` on `<th>`) in association with the cell data. |
| TC-504 | Screen reader: cell aria-labels | 1. Navigate to a correct prediction cell with a screen reader. | The screen reader announces "{display_name} predicted {value} for {scenario_title} -- Nailed It" (from the cell's `aria-label`). |
| TC-505 | Screen reader: no-pick cell | 1. Navigate to a no-pick cell with a screen reader. | The screen reader announces "{display_name} did not predict {scenario_title}". |
| TC-506 | Screen reader: current user row | 1. Navigate to the current user's row with a screen reader. | The `<tr>` has `aria-current="true"`. The screen reader indicates this is the current user's row. |
| TC-507 | Colorblind support: correct cells have Check icon | 1. Inspect a correct prediction cell. | A Check icon (lucide `Check`, ~10px, `h-3 w-3`) is displayed alongside the prediction value. The cell is identifiable as "correct" without relying on the green color alone. |
| TC-508 | Colorblind support: incorrect cells have X icon | 1. Inspect an incorrect prediction cell. | An X icon (lucide `X`, ~10px, `h-3 w-3`) is displayed alongside the prediction value. The cell is identifiable as "incorrect" without relying on the red color alone. |
| TC-509 | Colorblind support: pending cells (no icon) | 1. Inspect a pending prediction cell. | No icon is displayed. The absence of Check or X implies "not yet resolved". The prediction value is still visible. |
| TC-510 | Keyboard navigation | 1. Tab through the reveal table using keyboard only. | The table is navigable. Focus moves through interactive elements in a logical order. Column headers with tooltips are focusable. |
| TC-511 | Legend accessibility | 1. Inspect the color legend. | The legend container has `role="note"`. Each color swatch has `aria-hidden="true"`. The text labels provide meaning independently of color. |
| TC-512 | Locked placeholder countdown: aria-live | 1. Navigate to the pre-lock placeholder with a screen reader. | The countdown region has `aria-live="polite"` so screen readers announce updates periodically without being disruptive. |

### 2.7 Security

| ID | Scenario | Steps | Expected Result |
|--------|--------------------------------------|------------------------------------------|------------------------------------------------|
| TC-601 | RLS: pre-deadline query returns only own predictions | 1. Before the deadline, directly query `predictions` via Supabase client for scenarios in the group. | RLS returns only the current user's own predictions (via `read_own_predictions` policy). Other members' predictions are NOT returned. |
| TC-602 | RLS: post-deadline query returns all group predictions | 1. After the deadline, query `predictions` for scenarios in the group. | RLS returns all group members' predictions (via `read_others_after_deadline` policy). |
| TC-603 | Frontend does not bypass RLS with cached data | 1. Navigate to the match page before deadline (table shows locked placeholder). 2. Wait for deadline to pass. 3. Check browser DevTools for any prediction data in local storage, session storage, or React state. | No other members' prediction data is cached or stored client-side before the deadline. The frontend relies entirely on RLS for visibility enforcement. |
| TC-604 | Non-group member cannot see predictions | 1. As a user who is NOT a member of the group, attempt to access the match page URL directly. | The group layout guard redirects to dashboard or shows an access denied error. No prediction data is accessible. |
| TC-605 | Pending group member cannot see predictions | 1. As a user with `status = 'pending'` in the group, navigate to the match page. | Access is denied at the layout level. No prediction data is exposed. |
| TC-606 | Frontend lock check mirrors RLS policy | 1. Verify that the `PredictionRevealSection` server component's visibility condition matches the RLS policy logic: `match.status IN ('live', 'completed', 'abandoned', 'no_result') OR mgs.is_locked = true OR now() > computed_deadline`. | The frontend condition and the RLS policy are in sync. There is no scenario where the frontend shows the table but RLS blocks the data (which would result in an empty table), and no scenario where the frontend hides the table but RLS would have allowed the data. |
| TC-607 | Polling requests respect RLS | 1. During a live match, inspect the polling requests. | Polling requests go through the Supabase browser client, which includes the auth token. RLS is enforced on each poll request. An unauthenticated or unauthorized request returns no data. |
| TC-608 | DAL function does not leak data | 1. Review the `getAllPredictionsForMatch` function. 2. Verify it does not use `SECURITY DEFINER` or bypass RLS. | The function uses the standard `createClient()` (server) which respects RLS. No `.rpc()` or SECURITY DEFINER function is used for the read query. |

### 2.8 Data Integrity

| ID | Scenario | Steps | Expected Result |
|--------|--------------------------------------|------------------------------------------|------------------------------------------------|
| TC-701 | Prediction-to-member mapping is correct | 1. Member A predicted "CSK" for match_winner. Member B predicted "MI". 2. View the reveal table. | Member A's Winner cell shows "CSK". Member B's Winner cell shows "MI". Values are NOT swapped or misattributed. |
| TC-702 | Prediction-to-scenario mapping is correct | 1. Member A predicted "CSK" for match_winner and "RCB" for toss_winner. 2. View the reveal table. | "CSK" appears under the Winner column, "RCB" appears under the Toss column. Values are in the correct columns. |
| TC-703 | `buildPredictionMatrix` handles all members and scenarios | 1. 10 members, 16 scenarios, some members have partial predictions. 2. Build the matrix. | Matrix has entries for all `(userId, scenarioId)` pairs that have predictions. Missing pairs are undefined (rendered as no-pick cells). No crashes or undefined errors. |
| TC-704 | `buildPredictionMatrix` handles empty input | 1. Call `buildPredictionMatrix([])`. | Returns an empty object `{}`. No errors. |
| TC-705 | `buildPredictionMatrix` handles duplicate entries | 1. Input contains two entries for the same `(user_id, scenario_id)` pair (should not happen due to UNIQUE constraint, but defensive check). | The last entry wins. No crash. |
| TC-706 | Members list excludes non-approved members | 1. Group has members with statuses: approved, pending, removed, rejected. 2. View the reveal table. | Only `approved` members appear as rows. Pending, removed, and rejected members are excluded. |
| TC-707 | Scenarios list excludes removed and unapproved | 1. Group has scenarios with various states: auto_approved, approved, pending, rejected, removed. | Only `auto_approved` and `approved` scenarios with `is_removed = false` appear as columns. |
| TC-708 | `is_correct` values map correctly to cell states | 1. A prediction has `is_correct = true`. Another has `is_correct = false`. Another has `is_correct = null`. | Correct maps to green + Check icon. Incorrect maps to red + X icon. Null maps to muted slate + no icon. |
| TC-709 | `getAllPredictionsForMatch` returns empty array for empty scenarioIds | 1. Call `getAllPredictionsForMatch([])`. | Returns `[]` immediately without making a database call. |
| TC-710 | `getAllPredictionsForMatch` handles database error gracefully | 1. Simulate a database error in the query. | Returns `[]`. Error is logged via `logError`. No unhandled exception. |

### 2.9 Performance

| ID | Scenario | Concern | Validation |
|--------|--------------------------------------|------------------------------------------|------------------------------------------------|
| TC-801 | Initial render: 15 members x 16 scenarios | 240 cells must render within NFR-001 (200ms on 4G mobile). | Measure Time to First Byte and render time using browser DevTools. Data payload should be ~15 KB JSON. Total render should be under 200ms. |
| TC-802 | Single database query for all predictions | N+1 query risk: one query per member or per scenario. | Verify via Supabase logs or network tab that exactly one `predictions` query is made (via `getAllPredictionsForMatch`), not one per member or per scenario. |
| TC-803 | Polling payload size | Every 30 seconds during live matches, the poll fetches `user_id, scenario_id, is_correct` only. | Verify the poll query does NOT fetch `value` or `points_earned` fields. Payload should be minimal (~3-5 KB for 240 predictions). |
| TC-804 | No full table re-render on poll | When 2 of 240 cells update, the entire table should not re-render. | Use React DevTools Profiler to verify that only changed cells re-render. The `mergePollResults` function performs a shallow clone + targeted update to enable this. |
| TC-805 | Server component data fetching parallelism | `matchGroupSettings`, `scenarios`, and `members` should be fetched in parallel. | Review the server component code to confirm `Promise.all` is used for independent fetches. Only the `predictions` fetch (which depends on `scenarioIds`) is sequential after `scenarios`. |
| TC-806 | Large squad: 15 members render without virtual scrolling | 15 member rows should render natively without pagination or virtual scrolling. | Verify the table renders all 15 rows in the DOM. No lazy loading or virtualization is needed at this scale. |
| TC-807 | Memory: poll interval cleanup on unmount | When navigating away from the match page, the polling interval should be cleared. | Verify via `clearInterval` spy or by checking that no network requests continue after navigating away from the page. |

---

## 3. Regression Risks

| Area Affected | Risk Level | Reason | Mitigation |
|---|---|---|---|
| Match page (`/group/[groupId]/match/[matchId]/page.tsx`) | **High** | New component added below MatchLeaderboard. Additional data fetching (scenarios, members, predictions, matchGroupSettings) added to the server component. | Verify the existing match header card, LiveMatchScorecard, and MatchLeaderboard still render correctly. Verify page load time is not significantly degraded by the additional queries. |
| `MatchLeaderboard` component | **Medium** | Layout change: new content below the leaderboard may affect scroll behavior or spacing. | Verify the leaderboard still renders with correct `space-y-6` spacing. Expandable picks (if present) still function. |
| `LiveMatchScorecard` polling | **Low** | The new `usePredictionPolling` hook runs alongside `useMatchPolling`. Two concurrent polling intervals on the same page. | Verify both polls run independently without interfering. No shared state or timer conflicts. Total network load is acceptable (one match query + one predictions query every 30-120s). |
| `predictions` DAL module | **Medium** | New `getAllPredictionsForMatch` function added alongside existing functions. Module import changes could break existing consumers. | Verify existing functions (`getPredictionsForUser`, `getPredictionsForScenario`, `upsertPrediction`, `upsertPredictions`, `getUserPredictionCount`, `getMembersWhoPredicted`) still pass their existing unit tests unchanged. |
| `ExpandablePicks` component | **Low** | Both the reveal table and ExpandablePicks fetch prediction data. Potential confusion if both are visible simultaneously on the match page. | Verify ExpandablePicks (in the leaderboard rows) still works independently. The reveal table provides a different view (full matrix) and does not replace or conflict with ExpandablePicks. |
| `constants.ts` | **Low** | New constants (`REVEAL_TABLE_COPY`, `SCENARIO_SHORT_LABELS`) added to constants file. | Verify no naming collisions with existing constants. Existing `SYSTEM_SCENARIOS`, `PREDICTION_STATUS` constants unchanged. |
| RLS policies | **Low** | No RLS policy changes are made by this feature. | Run the existing E2E test suite (`10-match-lifecycle.spec.ts`, `13-edge-cases.spec.ts`) to confirm RLS behavior is unchanged. |
| Existing unit tests | **Medium** | If the `predictions.ts` DAL file is modified, existing mocks may need updating. | Run `predictions.test.ts` after adding the new function. Ensure existing tests pass without modification. |

---

## 4. Data Integrity Checks

- [ ] No new RLS policies needed -- existing `read_own_predictions` and `read_others_after_deadline` cover all visibility requirements
- [ ] `getAllPredictionsForMatch` uses `.in("scenario_id", scenarioIds)` filter -- no cross-group data leakage possible since scenarios are already filtered by `groupId + matchId` in the upstream `getScenariosForMatch` call
- [ ] Foreign key constraints: `predictions.scenario_id REFERENCES scenarios(id)`, `predictions.user_id REFERENCES profiles(id)` -- enforced at DB level
- [ ] UNIQUE constraint `(user_id, scenario_id)` on predictions prevents duplicate entries per cell
- [ ] No cascade delete concerns: this feature only reads data, never writes or deletes
- [ ] No orphaned records possible: the feature filters by approved members and non-removed scenarios, so even if underlying data has orphans, the UI never displays them
- [ ] `buildPredictionMatrix` correctly handles the case where RLS returns only the current user's predictions pre-deadline (table should not render in this state, but if it did, only the current user's data would appear -- defense in depth)

---

## 5. Cross-Browser / Responsive

### Browser Matrix

| Browser | Version | Priority | Notes |
|---|---|---|---|
| Chrome Mobile (Android) | Latest | P0 | Primary mobile browser for IPL audience in India |
| Safari (iOS) | Latest | P0 | iPhone users watching IPL on TV with phone in hand |
| Chrome Desktop | Latest | P1 | Desktop viewing |
| Firefox Desktop | Latest | P2 | Secondary desktop browser |
| Safari Desktop | Latest | P2 | macOS users |
| Samsung Internet | Latest | P2 | Popular on Samsung Android devices in India |

### Viewport Breakpoints

| Breakpoint | Width | Key Behaviors to Verify |
|---|---|---|
| Small mobile | 320px | Legend wraps. Column headers use short abbreviations. Sticky first column. Horizontal scroll. |
| Standard mobile | 375px | Standard mobile layout. All mobile behaviors active. |
| Large mobile | 414px | Same as standard mobile. |
| Tablet portrait | 768px | Abbreviated labels, 80px columns. Horizontal scroll for 16 scenarios. |
| Tablet landscape | 1024px | Transition to desktop behavior. Full titles where space permits. |
| Desktop | 1280px | Full-width table. Horizontal scroll only for 16+ scenarios. |
| Wide desktop | 1920px | Table should not stretch awkwardly. Max column widths (~120px) should apply. |

### Specific Cross-Browser Checks

| Check | Safari iOS | Chrome Android | Desktop |
|---|---|---|---|
| `position: sticky` on first column | Verify `-webkit-sticky` support | Verify sticky works with `overflow-x: auto` parent | Verify |
| `color-mix()` CSS function | Verify support (Safari 16.2+) | Verify support (Chrome 111+) | Verify; provide fallback for older browsers if needed |
| Horizontal scroll inertia / momentum | Verify smooth scroll | Verify smooth scroll | N/A |
| Tooltip on long-press (mobile) | Verify `title` attribute works on long-press | Verify | Verify on hover |
| `aria-current` attribute | Verify VoiceOver support | Verify TalkBack support | Verify NVDA/JAWS support |

---

## 6. Unit Test Specifications

The following unit tests should be written for new code, following the existing patterns observed in the codebase (Vitest + Testing Library, mock Supabase client):

### 6.1 DAL: `getAllPredictionsForMatch` (in `predictions.test.ts`)

| Test | Expected |
|---|---|
| Returns predictions for given scenario IDs | Mock Supabase returns prediction rows; function returns them. |
| Returns empty array when scenarioIds is empty | Function returns `[]` without calling Supabase. |
| Returns empty array on database error | Mock Supabase returns error; function returns `[]` and logs error. |
| Returns empty array when data is null | Mock Supabase returns `{ data: null }`; function returns `[]`. |

### 6.2 `buildPredictionMatrix` (pure function, new test file or in component test)

| Test | Expected |
|---|---|
| Builds correct matrix from flat predictions array | `matrix["user-a"]["scenario-1"]` = `{ value: "CSK", isCorrect: true }` |
| Returns empty object for empty input | `buildPredictionMatrix([])` returns `{}` |
| Handles multiple users and scenarios | Matrix has entries for all (user, scenario) pairs present in input |
| Missing (user, scenario) pair is undefined in matrix | `matrix["user-a"]["scenario-not-predicted"]` is `undefined` |

### 6.3 `mergePollResults` (pure function)

| Test | Expected |
|---|---|
| Updates isCorrect from null to true | Cell value preserved, isCorrect updated |
| Updates isCorrect from null to false | Cell value preserved, isCorrect updated |
| No-op when isCorrect unchanged | Returns same reference (no unnecessary object creation) |
| Handles poll data for user/scenario not in matrix | Gracefully ignores unknown entries |
| Preserves unaffected cells | Other cells in the matrix are unchanged |

### 6.4 `PredictionRevealTable` (component test)

| Test | Expected |
|---|---|
| Renders all member rows | Each member's display name appears in the table |
| Renders all scenario columns | Each scenario title (or abbreviation) appears in column headers |
| Highlights current user row with "(you)" | Current user's row has "(you)" text and distinct styling |
| Renders correct cell values | Cell content matches prediction values |
| Renders em dash for no-pick cells | Missing predictions show em dash |
| Applies correct background for correct cells | Green tint applied when `isCorrect === true` |
| Applies correct background for incorrect cells | Red tint applied when `isCorrect === false` |
| Applies correct background for pending cells | Muted slate tint applied when `isCorrect === null` |
| Renders Check icon for correct cells | `Check` icon present |
| Renders X icon for incorrect cells | `X` icon present |
| No icon for pending cells | No Check/X icon |
| Renders color legend | Legend with "Nailed It", "Missed", "In Play", "No Pick" labels |
| Renders table caption (sr-only) | `<caption>` exists with correct team/match text |
| Uses semantic HTML table elements | DOM contains `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>` |

### 6.5 `RevealLockedPlaceholder` (component test)

| Test | Expected |
|---|---|
| Renders locked message with countdown | Lock icon, heading text, and countdown timer visible |
| Countdown decrements | After advancing fake timers, the countdown display updates |
| Shows expired state when deadline passes | Displays expired message after deadline |

### 6.6 `RevealColorLegend` (component test)

| Test | Expected |
|---|---|
| Renders all four legend items | "Nailed It", "Missed", "In Play", "No Pick" labels present |
| Legend has role="note" | `role="note"` attribute on container |
| Color swatches are aria-hidden | Swatch elements have `aria-hidden="true"` |

### 6.7 `usePredictionPolling` (hook test, following `use-countdown.test.ts` pattern)

| Test | Expected |
|---|---|
| Starts polling when match status is live | After mount, setInterval is called with 30000ms |
| Does not poll when match status is completed | setInterval is not called |
| Does not poll when match status is upcoming | setInterval is not called |
| Stops polling when match status changes from live to completed | clearInterval is called |
| Cleans up interval on unmount | clearInterval is called on unmount |
| Returns initial data before first poll | `predictions` state equals `initialData` |
| Updates predictions after poll | After fake timer advance, predictions state reflects polled data |

---

## 7. E2E Test Specifications

Following the existing Playwright E2E patterns (see `e2e/tests/10-match-lifecycle.spec.ts`, `11-leaderboard.spec.ts`):

### 7.1 New E2E Test File: `e2e/tests/14-prediction-reveal-table.spec.ts`

| Test | Steps | Assertion |
|---|---|---|
| Reveal table visible on completed match page | 1. Login as member. 2. Navigate to match page for completed match2 (from test 10). | "The Reveal" heading is visible. Table rows include "Squad Owner" and "Squad Member". |
| Correct/incorrect predictions shown with colors | 1. Navigate to completed match2. 2. Inspect cells for toss_winner scenario. | Owner's toss prediction shows green (correct -- they predicted CSK, result was CSK). Member's toss prediction shows red (incorrect -- they predicted MI). |
| Pre-lock match shows locked placeholder | 1. Navigate to match page for an upcoming, pre-deadline match. | "The Reveal" heading is NOT visible. A locked placeholder message is visible containing "lock" or "wraps" text. |
| Outsider cannot see reveal table | 1. Login as outsider user. 2. Navigate to match page URL. | Redirected to dashboard or access denied. No prediction data visible. |
| Member with no predictions sees others' picks | 1. A third member with no predictions views the completed match page. | They see the reveal table with other members' predictions. Their own row shows dashes. |

---

## 8. Testing Infrastructure Notes

### Existing Patterns to Follow
- **Unit tests**: Vitest + Testing Library (`@testing-library/react`). Mock Supabase client via `@/test/helpers/mock-supabase` (`createMockSupabaseClient`, `createMockQueryBuilder`). Mock data from `@/__mocks__/data`.
- **Component tests**: Render with Testing Library, assert via `screen.getByText`, `screen.queryByText`, DOM inspection.
- **Hook tests**: `renderHook` from Testing Library. `vi.useFakeTimers()` for time-dependent hooks.
- **E2E tests**: Playwright. Use `getTestState()` for shared state. `loginAndGoto()` helper for auth. `getAdminClient()` for direct DB assertions.
- **Storybook stories**: Existing in `components/leaderboard/` directory. The reveal table and its sub-components should each have a `.stories.tsx` file with relevant states (all pending, all resolved, mixed, empty, solo, etc.).

### New Mock Data Needed
Add to `@/__mocks__/data.ts`:
- `MOCK_REVEAL_SCENARIOS`: Array of 4-5 scenarios with varying system_category and points.
- `MOCK_REVEAL_MEMBERS`: Array of 3-4 members with userId and displayName.
- `MOCK_REVEAL_PREDICTIONS`: Flat `RevealPrediction[]` array covering correct, incorrect, pending, and missing combinations.
- `MOCK_PREDICTION_MATRIX`: Pre-built matrix (`Record<string, Record<string, ...>>`) for component tests.
