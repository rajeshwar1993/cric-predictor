# QA Review: Prediction Reveal Table
**QA Engineer**: QA Agent
**Date**: 2026-03-29
**Branch**: `feature/prediction-reveal-table`
**Build Status**: PASS (TypeScript clean on all feature files; pre-existing test-file errors unrelated)

---

## Summary

- Total Issues Found: **10**
- Critical: **1**
- Major: **4**
- Minor: **5**

The implementation is well-structured and closely follows the technical architecture, requirements, and design specifications. The code review's two blockers (B1: infinite re-render loop, B2: solo squad edge case) have both been correctly fixed. The polling hook now uses `useRef` + `useMemo` stabilization, and the server component handles the solo squad path. The remaining findings are mostly correctness gaps in edge-case handling and minor spec deviations -- none are architectural problems.

---

## Methodology

Each test case category from the test plan was traced through the actual implementation code, line by line. Verification was performed by reading the source, checking data flow from DAL through server component through client wrapper to presentational table, and cross-referencing the RLS policy SQL against the frontend lock logic.

---

## Issues

### Critical Issues

#### QA-001: `mergePollResults` silently drops new predictions that arrive after SSR

- **File**: `web-app/src/hooks/use-prediction-polling.ts`, lines 181-195
- **Test Cases Affected**: TC-302 (member joined after lock), TC-209 (merge strategy)
- **Description**: The `mergePollResults` function only updates cells that already exist in the current matrix (`if (userPreds && userPreds[row.scenario_id])`). If a member submits a prediction *after* the SSR snapshot was taken (e.g., right before the deadline, while another user already has the page open), that prediction will never appear in the table for the viewing user -- even though the poll fetches it from the database. The poll data contains `is_correct` but no `value`, so even if we added the entry, the cell would have no value to display.

  More critically: if a *new member* joins the squad after the page loaded, their predictions are returned by the poll query (RLS allows it), but `mergePollResults` discards them because their `user_id` is not a key in the current matrix, and the `members` list (which controls row rendering) is also fixed from SSR.

- **Impact**: During live matches, late-arriving predictions and new members are invisible until the page is hard-refreshed. For a social "bragging rights" feature, missing a squad member's picks undermines the core value proposition.
- **Suggested Fix**: This is a fundamental limitation of the "poll only `is_correct`" design. For v1, this is acceptable with documentation: the SSR snapshot captures all predictions at page load, and polling only updates resolution state. A hard refresh picks up any new predictions. For a future version, the poll query should include `value` so new cells can be populated, and the members list should be refreshed periodically or on navigation. **Mark as known limitation in the feature documentation.**

---

### Major Issues

#### QA-002: Abandoned/no_result notice renders outside the card, creating inconsistent visual hierarchy

- **File**: `web-app/src/components/leaderboard/prediction-reveal-section.tsx`, lines 217-221
- **Test Cases Affected**: TC-108 (abandoned match), TC-311 (unresolved scenarios)
- **Description**: The "Match called off -- unresolved picks stay as-is." notice is rendered as a standalone `<p>` element between the `<h2>` heading and the `<RevealTablePollingWrapper>` card. This puts the notice *outside* the table card, floating in the `space-y-4` gap. Per the copy spec (section 9) and UI/UX spec, the note should be "above or below the table" -- meaning *inside* the table's visual container, or at least visually anchored to it. The current placement may look disconnected.
- **Impact**: Visual inconsistency on abandoned/no_result matches. The note may be overlooked or appear unrelated to the table.
- **Suggested Fix**: Move the abandoned notice inside the card container -- either as a banner above the table within the rounded card, or below the table and above the legend.

#### QA-003: Pre-lock placeholder does not show the "Picks Under Wraps" heading

- **File**: `web-app/src/components/leaderboard/reveal-locked-placeholder.tsx`
- **Test Cases Affected**: TC-101 (pre-lock placeholder), TC-102 (countdown display)
- **Description**: The UI/UX spec (section 3.2) specifies a heading "Picks Under Wraps" (with `font-display text-base font-semibold text-[var(--text-primary)]`) inside the placeholder card. The code review (S2) also flagged this. The current implementation jumps directly from the lock icon to the subtext paragraph (line 39) without a heading element. The copy spec provides the heading text in variant A. Compare this to the empty state cards (lines 179, 199 of `prediction-reveal-section.tsx`) which correctly render `<h3>` headings.
- **Impact**: The pre-lock state is missing a heading, creating an inconsistency with other empty-state cards on the page. Screen readers also lose a structural landmark.
- **Suggested Fix**: Add an `<h3>` heading between the lock icon container and the message paragraph:
  ```tsx
  <h3 className="mt-4 font-display text-base font-semibold text-[var(--text-primary)]">
    Picks Under Wraps
  </h3>
  ```

#### QA-004: Sticky column hover background mismatch on non-current-user rows

- **File**: `web-app/src/components/leaderboard/prediction-reveal-table.tsx`, lines 160-174
- **Test Cases Affected**: TC-407 (sticky column background on scroll)
- **Description**: Non-current-user rows have `hover:bg-[var(--bg-hover)]` on the `<tr>` (line 160). When hovered, the row cells change background, but the sticky `<th>` in the first column has an explicit inline `backgroundColor: "var(--bg-card)"` (line 173) that overrides the CSS hover state. This creates a visual split: the sticky name column stays at `bg-card` while the rest of the row highlights on hover. The code review (S6) flagged this.

  Since inline styles have higher specificity than Tailwind utility classes, the `group-hover:` CSS approach will not work. JavaScript-based hover state or a different architecture is needed.

- **Impact**: On desktop, hovering over a row produces a jarring visual disconnect at the sticky column boundary. This is a noticeable polish issue for the comparison use case where users scan rows.
- **Suggested Fix**: Use Tailwind's `group` / `group-hover:` pattern by removing the inline `backgroundColor` for non-current-user rows and using conditional Tailwind classes instead. Or accept the trade-off and remove the row hover effect entirely (the current-user row highlight is the primary scan aid, and hover is secondary).

#### QA-005: Polling does not self-stop when match transitions away from "live"

- **File**: `web-app/src/hooks/use-prediction-polling.ts`
- **Test Cases Affected**: TC-203 (polling stops on match complete), TC-207 (tab visibility)
- **Description**: Unlike `useMatchPolling` (line 108: `if (data.status !== "live") { stopInterval() }`), the prediction polling hook has no self-stop logic. It relies entirely on the `matchStatus` prop being updated externally. If the parent component does not re-render with a new `matchStatus` (e.g., `useMatchPolling` is on a different component, or the parent batches state updates), prediction polling continues indefinitely after the match ends.

  The technical architecture explicitly states: "Stop condition: Externally signaled via matchStatus prop change." This is by design but creates a divergence from the battle-tested `useMatchPolling` pattern.

- **Impact**: Unnecessary API calls after match completion until the user navigates away. With 30-second intervals, this could be dozens of wasted calls if a user leaves the tab open.
- **Suggested Fix**: The prediction poll query could check if all `is_correct` values are non-null (meaning all scenarios resolved), and call `stopInterval()` as a secondary stop condition. Alternatively, add a max-poll-count safety limit (e.g., stop after 240 polls = 2 hours).

---

### Minor Issues

#### QA-006: Dead code -- `REVEAL_TABLE_COPY.LOADING` and `REVEAL_TABLE_COPY.EMPTY_NO_SCENARIOS` are never referenced

- **File**: `web-app/src/lib/constants.ts`, lines 126-128 (implicit -- these keys exist in the object but are unused)
- **Test Cases Affected**: N/A (code quality)
- **Description**: Grep confirms these two constants are not imported or referenced anywhere in the source code. `LOADING` ("Loading picks...") is unused because the table is SSR with no client-side loading state. `EMPTY_NO_SCENARIOS` ("No scenarios for this match yet.") is unused because the section returns `null` for the no-scenarios case (line 142 of `prediction-reveal-section.tsx`).

  Note: The grep for `EMPTY_NO_SCENARIOS` and `LOADING` against `web-app/src/**/*.{ts,tsx}` returned zero matches, confirming complete dead code.

- **Impact**: Minor clutter. These were defined from the copy spec as defensive constants.
- **Suggested Fix**: Either remove them or add a `// Reserved for future use` comment to make the intent clear.

#### QA-007: `points_earned` fetched but unused in the DAL and type

- **File**: `web-app/src/lib/dal/predictions.ts`, line 127; `web-app/src/types/index.ts`, line 128
- **Test Cases Affected**: TC-803 (polling payload size)
- **Description**: The DAL query selects `points_earned`, and the `RevealPrediction` type includes it, but `buildPredictionMatrix` (line 44 of `prediction-reveal-section.tsx`) maps only `value` and `is_correct` into `RevealCellData`. The field is fetched from the database and then discarded. This adds ~4 bytes per prediction to the SSR data transfer (negligible for 240 predictions but still wasteful).
- **Impact**: Minimal -- minor bandwidth waste. May also confuse future developers who see it in the type but not in the UI.
- **Suggested Fix**: Either remove `points_earned` from the select query and the `RevealPrediction` type, or add it to `RevealCellData` if it is planned for v2 (e.g., per-cell points tooltip). If keeping it, add a JSDoc comment explaining it is reserved.

#### QA-008: Legend "No Pick" swatch color does not match actual cell background

- **File**: `web-app/src/components/leaderboard/reveal-color-legend.tsx`, line 19
- **Test Cases Affected**: TC-008 (legend visible)
- **Description**: The "No Pick" legend item uses `background: "var(--bg-elevated)"`, but actual no-pick cells in the table use `background: "transparent"` (from `CELL_STYLES.noPick`). On a dark card background, `var(--bg-elevated)` is a slightly lighter shade, while `transparent` inherits the card background. The visual difference is subtle but technically the legend swatch does not match the cell appearance.

  The code review (S4) noted this and acknowledged it as a reasonable approximation (a transparent swatch would be invisible in the legend).

- **Impact**: Cosmetic inconsistency. Users are unlikely to notice, but it is technically inaccurate.
- **Suggested Fix**: Add a code comment explaining the intentional divergence, e.g., `// Uses bg-elevated because transparent would be invisible in the legend`.

#### QA-009: `tabIndex={0}` on scroll container may cause confusing keyboard navigation

- **File**: `web-app/src/components/leaderboard/prediction-reveal-table.tsx`, line 104
- **Test Cases Affected**: TC-510 (keyboard navigation)
- **Description**: The scroll container `<div>` has `tabIndex={0}`, which makes it focusable via keyboard. When a keyboard user tabs through the page, they will land on this scroll container div before reaching the table itself. The container's `role="region"` with `aria-label="Scroll to see more scenario columns"` provides context, but the user must press Tab again to actually enter the table. This creates an extra tab stop. The code review (W4) flagged this.
- **Impact**: Minor keyboard navigation friction. Screen reader users may find the extra stop confusing.
- **Suggested Fix**: Consider removing `tabIndex={0}` and relying on the table's native keyboard navigation. The scroll container can still be scrolled via mouse/touch without being focusable.

#### QA-010: `<span className="block truncate">` for member name may truncate "(you)" label

- **File**: `web-app/src/components/leaderboard/prediction-reveal-table.tsx`, lines 176-183
- **Test Cases Affected**: TC-007 (current user row highlight)
- **Description**: The member name and "(you)" label are both inside a single `<span className="block truncate">` element. The parent `<th>` has `maxWidth: 160px`. If a display name is long (e.g., "Ravichandran Ashwin"), the truncation will cut off the "(you)" label since it is inline-appended after the name. The truncation `max-w` is on the parent `<th>` (via inline style), and the `block truncate` on the span will respect it. But the "(you)" suffix will be the first thing truncated, losing the current-user indicator for users with long names.
- **Impact**: Users with long display names may not see the "(you)" indicator, making it harder to identify their own row. The cyan background and border still provide visual identification, but the text label is lost.
- **Suggested Fix**: Display "(you)" on a separate line below the name, or use a fixed-width layout where the name truncates independently and "(you)" is always visible. Alternatively, give the name a slightly lower max-width (e.g., `max-w-[100px]`) and keep "(you)" outside the truncation span.

---

## Verification of Code Review Blocker Fixes

### B1 Fix (Infinite re-render loop): VERIFIED FIXED

The `scenarioIds` array is now memoized with `useMemo` in `reveal-table-polling-wrapper.tsx` (line 38):
```tsx
const scenarioIds = useMemo(() => scenarios.map((s) => s.id), [scenarios]);
```

In the polling hook (`use-prediction-polling.ts`), `scenarioIds` is stored in a ref (line 54):
```tsx
const scenarioIdsRef = useRef(scenarioIds);
```

And `fetchPredictions` uses `scenarioIdsRef.current` (line 82) instead of the prop directly, with `scenarioIds` removed from the `useCallback` dependency array. The `fetchPredictions` callback depends only on `[supabase]` (line 104), which is itself memoized. This breaks the infinite loop.

**Verdict**: The fix is correct and follows the `statusRef` pattern already established in `useMatchPolling`.

### B2 Fix (Solo squad edge case): VERIFIED FIXED

The server component now checks `orderedMembers.length <= 1` (line 172 of `prediction-reveal-section.tsx`) and renders the solo squad message using `REVEAL_TABLE_COPY.EMPTY_SOLO_TITLE` and `REVEAL_TABLE_COPY.EMPTY_SOLO_BODY`. The dead code flagged in the review is now live code.

**Verdict**: Correct. The check is placed after data fetching, which means the predictions are still fetched for a solo squad (slightly wasteful), but the `<= 1` check correctly handles both 0-member (impossible given auth) and 1-member cases.

---

## Test Case Execution Results

### 2.1 Happy Path

| ID | Verdict | Notes |
|--------|---------|-------|
| TC-001 | PASS | `PredictionRevealSection` renders as server component when `isRevealed` is true. Semantic `<table>` with `<thead>`/`<tbody>` confirmed in `prediction-reveal-table.tsx`. |
| TC-002 | PASS | Cell values come from `predictionMatrix[member.userId][scenario.id].value` (line 222-223). Mapping traced from DAL flat array through `buildPredictionMatrix` to cell render. |
| TC-003 | PASS | `getCellState` returns `"correct"` when `cell.isCorrect === true` (line 58). `CELL_STYLES.correct` applies green tint. `Check` icon rendered (line 208-213). |
| TC-004 | PASS | `getCellState` returns `"incorrect"` when `cell.isCorrect === false` (line 59). `CELL_STYLES.incorrect` applies red tint. `X` icon rendered (line 215-220). |
| TC-005 | PASS | `getCellState` returns `"pending"` when `cell.isCorrect` is `null` (line 60). `CELL_STYLES.pending` applies muted slate tint. No icon rendered. |
| TC-006 | PASS | `getCellState` returns `"noPick"` when `cell` is `undefined` (line 57). Em dash rendered from `REVEAL_TABLE_COPY.NO_PICK_CELL` (line 223). Transparent background. |
| TC-007 | PARTIAL | Row highlight works (`bg-[var(--cyan-soft)]`, cyan border, "(you)" label). But "(you)" may be truncated for long names -- see QA-010. |
| TC-008 | PASS | Heading "The Reveal" rendered (line 212-214). `RevealColorLegend` rendered with all four items (line 235). Legend labels match copy spec: "Nailed It", "Missed", "In Play", "No Pick". |
| TC-009 | PASS | Scenarios ordered by `getScenariosForMatch` DAL, which orders by points descending (confirmed in scenarios.ts). Columns render in array order. |
| TC-010 | PASS | `orderMembers` function sorts by leaderboard rank first, then appends unranked alphabetically. Traced logic and it is correct. |
| TC-011 | PASS | Column headers show `getColumnLabel()` for title + `{scenario.points} pts` badge. Tooltip via `title={scenario.title}`. |
| TC-012 | PASS | `<caption className="sr-only">` present with correct text pattern (line 111-113). |
| TC-013 | PASS | `PredictionRevealSection` is a server component (no `"use client"` directive). Data is fetched server-side. No loading spinner. |
| TC-014 | PASS | In `page.tsx`, `<PredictionRevealSection>` is rendered after `<MatchLeaderboard>` inside `<div className="space-y-6">` (lines 81-95). |

### 2.2 Visibility Rules

| ID | Verdict | Notes |
|--------|---------|-------|
| TC-101 | PASS | `isRevealed` logic (lines 120-126) correctly gates on all lock conditions. When false, renders `RevealLockedPlaceholder`. |
| TC-102 | PARTIAL | Countdown renders via `useCountdown` hook (line 50). Copy switches between imminent and normal. But missing "Picks Under Wraps" heading -- see QA-003. |
| TC-103 | PASS | `isImminent` calculation correct (line 22-23): `deadline.getTime() - Date.now() < 60 * 60 * 1000`. Copy switches to `PRE_LOCK_IMMINENT`. |
| TC-104 | PASS | `matchStatus === "live"` satisfies `isRevealed`. Page reload triggers SSR re-fetch. |
| TC-105 | PASS | `isLocked` is checked on line 125. When `true`, `isRevealed = true`. |
| TC-106 | PASS | `new Date() > deadline` on line 126 handles this case. `computeDeadline` correctly computes from custom deadline or default (45min before match). |
| TC-107 | PASS | `matchStatus === "completed"` satisfies `isRevealed`. |
| TC-108 | PASS | `matchStatus === "abandoned"` satisfies `isRevealed`. Abandoned notice rendered (lines 217-221). See QA-002 for placement concern. |
| TC-109 | PASS | `matchStatus === "no_result"` satisfies `isRevealed`. Notice rendered same as abandoned. |
| TC-110 | PASS | `useCountdown` sets `isExpired = true` when deadline passes. Placeholder shows fallback generic message (line 41). Table does NOT auto-appear (correct -- requires SSR refresh). |
| TC-111 | PASS | Member with no predictions sees the table (they are in `orderedMembers`). Their row shows em dashes for all scenarios (no entries in `predictionMatrix` for their userId). |

### 2.2 (continued) Security Alignment: Frontend Lock Check vs. RLS Policy

The frontend `isRevealed` condition:
```
matchStatus === "live" || "completed" || "abandoned" || "no_result"
|| isLocked
|| new Date() > deadline
```

The RLS `read_others_after_deadline` policy:
```sql
m.status IN ('live', 'completed', 'abandoned', 'no_result')
OR mgs.is_locked = true
OR now() > prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)
```

**Verdict**: These are in sync. The `computeDeadline` function mirrors the SQL `prediction_deadline()` function's logic (default 45min before match, or custom deadline). TC-606 satisfied.

### 2.3 Polling & Live Updates

| ID | Verdict | Notes |
|--------|---------|-------|
| TC-201 | PASS | Polling fires every 30s when `matchStatus === "live"` (line 108). Query selects only `user_id, scenario_id, is_correct` (line 81). |
| TC-202 | PASS | `mergePollResults` updates `isCorrect` field. `transition-colors duration-500` on cells (line 200) provides smooth visual transition. |
| TC-203 | FAIL | See QA-005. Polling does not self-stop. Relies on external `matchStatus` prop change. |
| TC-204 | PASS | Main effect (line 116): `if (matchStatus !== "live") { stopInterval(); return; }`. No polling for completed matches. |
| TC-205 | PASS | `matchStatus === "upcoming"` triggers `stopInterval()` in the main effect. No polling. |
| TC-206 | PASS | `fetchPredictions` silently returns on error (line 86-93). No toast, no visible error. Dev console warning only. |
| TC-207 | PASS | Page Visibility API handler (lines 131-157) pauses on hidden, fetches + resumes on visible. Correctly guards with `statusRef.current !== "live"`. |
| TC-208 | PASS | `isFetchingRef` guard (line 72) prevents concurrent fetches. |
| TC-209 | PARTIAL | Merge preserves `value` from SSR data. But only for cells that exist in the matrix -- new predictions are dropped. See QA-001. |
| TC-210 | PASS | `mergePollResults` performs shallow comparison (`isCorrect !== row.is_correct`) and only creates new objects for changed cells. Returns `current` reference if no changes (`hasChanges` guard on line 197). |

### 2.4 Edge Cases

| ID | Verdict | Notes |
|--------|---------|-------|
| TC-301 | PASS | Solo squad check at line 172: `orderedMembers.length <= 1` renders the solo nudge message. B2 fix verified. |
| TC-302 | PARTIAL | See QA-001. New member joining after SSR snapshot will not appear until page refresh. Their row is not in the `members` array, and the poll does not refresh the member list. |
| TC-303 | PASS | `getMembers()` filters by `status = 'approved'` (line 19 of members.ts). Removed members excluded. |
| TC-304 | PASS | All cells render as pending (muted slate, no icons). No errors. Verified by tracing `getCellState` for `isCorrect === null`. |
| TC-305 | PASS | All cells resolved -- each is green or red. No pending cells. |
| TC-306 | PASS | `rawPredictions.length === 0` check (line 191) renders the "No picks on the board" empty state. |
| TC-307 | PASS | `scenarios.length === 0` check (line 141) returns `null`. Section does not render. |
| TC-308 | PASS | Cell value wrapped in `<span className="truncate max-w-[48px]">` (line 222). `title={cell?.value}` provides tooltip (line 194). |
| TC-309 | PASS | `getColumnLabel` truncates custom titles to 7 chars + ellipsis (line 46). `title={scenario.title}` on `<th>` provides full title tooltip (line 133). |
| TC-310 | PASS | Unresolved custom scenario cells remain pending. No special handling needed. |
| TC-311 | PASS | Abandoned notice rendered. Unresolved cells stay pending. |
| TC-312 | PASS | Table min-width calculated dynamically: `140 + scenarios.length * 72` (line 109). For 20 scenarios: 1580px. Horizontal scroll enabled. |
| TC-313 | PASS | `getScenariosForMatch` filters by `approval_status IN ('auto_approved', 'approved')` and `is_removed = false`. Verified in scenarios DAL. |
| TC-314 | PASS | Same filter as TC-313. Removed scenarios excluded at DAL level. |

### 2.5 Responsive Behavior

| ID | Verdict | Notes |
|--------|---------|-------|
| TC-401 | PASS | First column: `sticky left-0 z-10` on both `<th>` header and row cells. Box-shadow applied. |
| TC-402 | PASS | Scroll container has `overflow-x-auto`. No explicit right-edge gradient implemented (noted in UI/UX spec as a nice-to-have), but box-shadow on sticky column signals scroll affordance. |
| TC-403 | PASS | `getColumnLabel` returns abbreviations for system scenarios via `SCENARIO_SHORT_LABELS`. Custom titles truncated. |
| TC-404 | PASS | Column min-width `64px` (line 136) applies. Horizontal scroll works. |
| TC-405 | PASS | With 8 scenarios: `140 + 8*72 = 716px`, fits most desktops. |
| TC-406 | PASS | With 16 scenarios: `140 + 16*72 = 1292px`. Horizontal scroll required. |
| TC-407 | PARTIAL | Current user sticky cell uses `color-mix` background (line 172). Non-current-user cells use `bg-card` (line 173). Hover mismatch exists -- see QA-004. |
| TC-408 | PASS | Cell padding `px-2 py-2.5` provides adequate touch targets (~40px height). |
| TC-409 | PASS | Legend uses `flex flex-wrap` (line 30 of legend). Items wrap on narrow screens. |

### 2.6 Accessibility

| ID | Verdict | Notes |
|--------|---------|-------|
| TC-501 | PASS | Semantic `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` elements used throughout. |
| TC-502 | PASS | `<caption className="sr-only">` with correct text pattern present. |
| TC-503 | PASS | `aria-label={scenario.title}` on each `<th scope="col">` (line 134). |
| TC-504 | PASS | `aria-label` on each `<td>` (line 195-199) follows the copy spec pattern exactly: "{name} predicted {value} for {title} -- {status}". |
| TC-505 | PASS | No-pick cells have aria-label: "{name} did not predict {title}" (line 72 of `getCellAriaLabel`). |
| TC-506 | PASS | `aria-current={isCurrentUser ? "true" : undefined}` on `<tr>` (line 156). |
| TC-507 | PASS | `Check` icon with `aria-hidden="true"` present for correct cells (lines 208-213). |
| TC-508 | PASS | `X` icon with `aria-hidden="true"` present for incorrect cells (lines 215-220). |
| TC-509 | PASS | No icon for pending cells. Absence implies "not yet resolved." |
| TC-510 | PARTIAL | See QA-009. Extra `tabIndex={0}` on scroll container creates an additional tab stop. |
| TC-511 | PASS | Legend has `role="note"`. Swatches have `aria-hidden="true"`. Text labels provide meaning. |
| TC-512 | PASS | Countdown has `aria-live="polite"` (line 47 of placeholder). |

### 2.7 Security

| ID | Verdict | Notes |
|--------|---------|-------|
| TC-601 | PASS | RLS `read_own_predictions` allows only own predictions pre-deadline. Verified in SQL. |
| TC-602 | PASS | RLS `read_others_after_deadline` allows all group predictions post-deadline. Verified in SQL. |
| TC-603 | PASS | Pre-lock, the server component renders `RevealLockedPlaceholder` (line 129-137). No prediction data is passed to client components. The DAL call happens only when `isRevealed = true` (line 147). |
| TC-604 | PASS | Group layout guard handles non-member access. Not changed by this feature. |
| TC-605 | PASS | Same group layout guard handles pending members. |
| TC-606 | PASS | Frontend lock condition verified to be in sync with RLS policy. See detailed analysis above. |
| TC-607 | PASS | Polling uses browser Supabase client (`createClient()` from `client.ts`), which includes the auth token. RLS is enforced on each poll. |
| TC-608 | PASS | `getAllPredictionsForMatch` uses `await createClient()` (server client) which respects RLS. No `.rpc()` or SECURITY DEFINER function used. |

### 2.8 Data Integrity

| ID | Verdict | Notes |
|--------|---------|-------|
| TC-701 | PASS | `buildPredictionMatrix` maps `user_id -> scenario_id -> { value, isCorrect }`. Each prediction uniquely keyed. No cross-contamination possible. |
| TC-702 | PASS | Scenario ID is the column key in the matrix. Values cannot end up in wrong columns. |
| TC-703 | PASS | Matrix built by iterating flat array. Missing `(user, scenario)` pairs are simply absent from the map -- rendered as no-pick by `getCellState`. |
| TC-704 | PASS | Empty input returns `{}`. No errors. |
| TC-705 | PASS | Last entry wins (standard JS object property override). UNIQUE constraint in DB prevents this in practice. |
| TC-706 | PASS | `getMembers()` filters `status = 'approved'`. Verified. |
| TC-707 | PASS | `getScenariosForMatch` filters `is_removed = false` and `approval_status IN ('auto_approved', 'approved')`. Verified. |
| TC-708 | PASS | `getCellState` correctly maps: `true -> correct`, `false -> incorrect`, `null -> pending`, `undefined -> noPick`. |
| TC-709 | PASS | `getAllPredictionsForMatch` returns `[]` immediately for empty input (line 122 of predictions.ts). |
| TC-710 | PASS | Error logged via `logError`, returns `[]`. No unhandled exception. |

### 2.9 Performance

| ID | Verdict | Notes |
|--------|---------|-------|
| TC-801 | PASS | Data is SSR. Payload is small (~15 KB). 240 cells are lightweight DOM nodes. |
| TC-802 | PASS | Single `getAllPredictionsForMatch` query with `.in("scenario_id", scenarioIds)`. No N+1. |
| TC-803 | PARTIAL | Poll query correctly excludes `value`. But SSR query fetches `points_earned` which is unused -- see QA-007. Negligible impact. |
| TC-804 | PASS | `mergePollResults` returns same reference if no changes. Changed cells get new objects; unchanged cells retain references. React's reconciliation will minimize re-renders. |
| TC-805 | PARTIAL | `matchGroupSettings`, `scenarios`, and `members` are fetched in parallel via `Promise.all` (line 105). Good. But `predictions` is sequential after `scenarios` (line 147) because it depends on `scenarioIds`. This is correct and unavoidable. |
| TC-806 | PASS | All rows rendered in DOM. No virtualization needed at 15 rows. |
| TC-807 | PASS | Cleanup function at line 124-127 sets `mountedRef = false` and calls `stopInterval()`. Interval cleared on unmount. |

---

## Positive Observations

1. **B1 and B2 fixes are correct.** The infinite re-render loop is properly resolved with the `useRef` + `useMemo` stabilization pattern, and the solo squad edge case now renders the engagement nudge as specified.

2. **The `buildPredictionMatrix` function is clean and efficient.** Single pass over the flat array, O(n) complexity, pure function with no side effects. Easy to unit test.

3. **The `mergePollResults` function is well-designed.** The `hasChanges` guard prevents unnecessary React state updates when the poll returns no changes. The immutable update pattern (spread operators for changed branches only) enables React's shallow comparison to skip re-renders for unchanged cells.

4. **Security model is correct.** The frontend lock check is purely a UX optimization -- RLS is the actual enforcement layer. The frontend check matches the RLS policy logic exactly. Pre-lock, no prediction data reaches the client (the DAL call is gated by `isRevealed`).

5. **Accessibility is thorough.** Semantic table, `<caption>`, `aria-label` on every cell, `aria-current` on user row, `role="note"` on legend, `aria-hidden` on decorative icons, `aria-live` on countdown. This meets WCAG 2.1 AA for a data table.

6. **Consistent with existing codebase patterns.** The polling hook mirrors `useMatchPolling`. The component hierarchy (server section -> client wrapper -> presentational table) mirrors `LiveMatchScorecard`. DAL function follows existing conventions. Constants are co-located with existing ones.

7. **Parallel data fetching.** The `Promise.all` for `matchGroupSettings`, `scenarios`, and `members` minimizes SSR latency. The sequential `predictions` fetch is correctly placed after `scenarios` (needs `scenarioIds`).

8. **Color-coding decision is sound.** Using muted slate for pending instead of bright yellow is the right UX call. With 240 cells starting as pending, yellow would be overwhelming. The slate background makes green/red cells pop when they resolve.

---

## Recommendation

- [x] Merge after fixing critical issue

**QA-001** (mergePollResults dropping new predictions) should be documented as a known v1 limitation rather than blocking the merge, since the SSR snapshot on page load captures the vast majority of cases and the edge case (someone predicting *while* you're watching the live table) is narrow.

**QA-002** through **QA-005** (major issues) should be addressed before merge:
- QA-002 (abandoned notice placement): Quick fix, move the `<p>` inside the card.
- QA-003 (missing placeholder heading): Quick fix, add an `<h3>`.
- QA-004 (hover background mismatch): Either fix with group-hover or remove row hover. Low effort.
- QA-005 (polling self-stop): Add a max-poll-count or all-resolved check. Medium effort.

The minor issues (QA-006 through QA-010) are nice-to-haves that can be addressed post-merge.
