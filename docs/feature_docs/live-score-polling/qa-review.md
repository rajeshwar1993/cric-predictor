# QA Review: Live Score Polling

**QA Engineer**: QA Agent
**Date**: 2026-03-29
**Branch**: main (uncommitted working tree changes)
**Review Mode**: Code review against test plan, requirements, architecture, and UI/UX spec

---

## Summary

- Total Issues Found: **10**
- Critical: **1**
- Moderate: **5**
- Minor: **4**

The implementation is well-structured and closely follows the architecture blueprint. The polling hook is correctly implemented with concurrent-fetch guards, Page Visibility API integration, and proper cleanup. The component hierarchy (server page -> client wrapper -> presentational scorecard) is clean. One critical issue was found (missing `stopPropagation` creating a latent click-propagation risk), five moderate issues need attention before merge, and four minor issues are noted for improvement.

---

## Issues

### Critical Issues

#### QA-001: `RefreshButton` onClick does not call `e.stopPropagation()` -- click may propagate to parent interactive elements

- **File**: `web-app/src/components/match/match-scorecard.tsx`, line 165
- **Line**: 165 (`onClick={onRefresh}`)
- **Description**: The `RefreshButton` calls `onRefresh` directly without stopping event propagation. Currently, on the group page, the `LiveMatchCard` is NOT inside a `<Link>` (the "View Leaderboard" link is a sibling element at lines 157-161 of `page.tsx`). However, this is fragile. If any future change wraps the entire match card in a clickable container (a common pattern for card-based UIs), the refresh button click would bubble up and trigger navigation. More importantly, the compact scorecard sits within a `<div>` that has `flex-1` (line 130 of `page.tsx`), and the card's outer `<div>` has no `onClick`, but this is a defensive coding issue that should be fixed now.
- **Impact**: Currently low risk in the existing DOM structure. Becomes a bug if the card becomes a clickable link wrapper in the future. Given that `MatchScorecard` is a reusable presentational component, it should be self-contained and not rely on assumptions about its parent DOM structure.
- **Suggested Fix**: Add `e.stopPropagation()` in the `RefreshButton`:
  ```tsx
  <button
    onClick={(e) => {
      e.stopPropagation();
      onRefresh();
    }}
    ...
  >
  ```
- **Test Cases Affected**: TC-019, TC-020 (button click behavior)
- **Severity Rationale**: Classified as critical because `MatchScorecard` is a shared component and defensive event handling is a correctness requirement for interactive elements nested inside potentially-clickable parents. This is a single-line fix.

---

### Moderate Issues

#### QA-002: `statusInfo` is always `null` during live-to-completed transition -- no result text shown

- **File**: `web-app/src/components/match/live-match-card.tsx`, line 77; `web-app/src/components/match/live-match-scorecard.tsx`, line 77
- **Line**: 77 in both files
- **Description**: Both wrapper components pass `statusInfo={null}` (LiveMatchCard hardcodes it; LiveMatchScorecard passes it through from the server page which also passes `null`). When a poll returns `status: "completed"` with a `match_winner` value, the `MatchScorecard` transitions to completed mode. The status header conditional at line 71 of `match-scorecard.tsx` checks `isCompleted && statusInfo`, which evaluates to `false` (since `statusInfo` is `null`). This means the completed state shows NO result text (e.g., "CSK won by 44 runs").

  The `MatchScoreData` type does not include a `status_info` column (and indeed the database `matches` table has no such column). The `match_winner` column IS available in the polled data, but it is not used to derive a display string.

- **Impact**: When a user is watching a live match and it completes mid-session, the scorecard transitions to completed mode but shows no winner announcement. The scores and teams are visible, but the visual "CSK won" text is missing. This is a poor user experience for the real-time completion scenario.
- **Suggested Fix**: In both `LiveMatchCard` and `LiveMatchScorecard`, derive `statusInfo` from the polled data:
  ```tsx
  const displayStatusInfo = displayMatchWinner
    ? `${displayMatchWinner} won`
    : displayStatus === "no_result"
      ? "No result"
      : displayStatus === "abandoned"
        ? "Match abandoned"
        : statusInfo;
  ```
  Then pass `statusInfo={displayStatusInfo}` to `MatchScorecard`.
- **Test Cases Affected**: TC-101 (match completes mid-poll), TC-028 (completed match on leaderboard page)
- **FR Affected**: FR-023 (UI must reflect the final state)
- **EC Affected**: EC-03 (live to completed transition)

#### QA-003: `LiveMatchScorecard` passes `onRefresh={refresh}` even when status is not "live" -- unnecessary prop for non-live matches

- **File**: `web-app/src/components/match/live-match-scorecard.tsx`, line 79
- **Line**: 79
- **Description**: The match leaderboard page wraps ALL matches (including completed/upcoming) in `LiveMatchScorecard`. The wrapper unconditionally passes `onRefresh={refresh}` to `MatchScorecard`. While `MatchScorecard` correctly hides the refresh button when `status !== "live"` (the `onRefresh && isLive` conditional guards this), passing a function prop to a component that doesn't need it is wasteful and semantically misleading. More importantly, because `refresh` is a `useCallback` from `useMatchPolling`, every time the component re-renders (e.g., due to parent state changes), the `refresh` reference is stable BUT the `useMatchPolling` hook still creates a Supabase client via `useMemo` and sets up refs -- all unnecessary for non-live matches.

  The hook itself is well-guarded (no polling starts for non-live statuses per line 140-143), so this is a performance/cleanliness issue, not a correctness bug.

- **Impact**: Minor wasted memory/CPU for non-live match pages (Supabase client created but never used, refs allocated but never toggled). No functional impact.
- **Suggested Fix**: In `LiveMatchScorecard`, conditionally pass the polling props:
  ```tsx
  onRefresh={displayStatus === "live" ? refresh : undefined}
  isPolling={displayStatus === "live" ? isLoading : false}
  lastUpdated={displayStatus === "live" ? lastUpdated : null}
  ```
  Or better: on the match leaderboard page, conditionally render `LiveMatchScorecard` only for live matches and render `MatchScorecard` directly for non-live matches (as done on the group page).
- **Test Cases Affected**: TC-028 (completed match on leaderboard page has no polling)

#### QA-004: `formatTimeAgo` casing change from "Just now" to "just now" is a visual regression for NotificationBell

- **File**: `web-app/src/lib/utils.ts`, line 107; `web-app/src/components/layout/notification-bell.tsx`
- **Line**: 107 (utils.ts), 139 (notification-bell.tsx)
- **Description**: The old local `formatTimeAgo` in `notification-bell.tsx` returned `"Just now"` (capital J). The new shared version returns `"just now"` (lowercase). In the NotificationBell panel, notification timestamps show `"just now"` instead of `"Just now"` for notifications less than 1 minute old. This is a visual change in an existing component.

  In the `MatchScorecard`, the text is prefixed with "Updated " (e.g., "Updated just now"), so lowercase is correct per the UI/UX spec.

  In the `NotificationBell`, the text stands alone (e.g., "just now" under a notification message), where capitalization is conventional.

- **Impact**: Minor visual inconsistency in the notification panel. Not a functional bug but noticeable to users who pay attention to text formatting.
- **Suggested Fix**: Either:
  (a) Accept the lowercase as a minor normalization (simplest), OR
  (b) Have `formatTimeAgo` return lowercase and capitalize in the NotificationBell consumer: `{formatTimeAgo(n.created_at).replace(/^j/, 'J')}`
  (c) Add a `capitalize` option to `formatTimeAgo`: `formatTimeAgo(date, { capitalize: true })`
- **Test Cases Affected**: TC-305 (NotificationBell still works with shared formatTimeAgo)
- **Regression**: YES -- visual change in existing NotificationBell component

#### QA-005: No unit test file (`use-match-polling.test.ts`) was created

- **File**: Expected at `web-app/src/hooks/use-match-polling.test.ts`
- **Description**: The requirements (Section 8, Dependencies) and architecture (Section 14, N4 in the file-by-file plan) both specify a unit test file for the polling hook. The test plan (Section 7) specifies 23 automated test cases. No test file exists in the working tree.
- **Impact**: The hook's behavior (polling lifecycle, concurrent-fetch guard, visibility API, error handling, cleanup) is only validated by code review, not by automated tests. This is a significant gap for a hook with complex async behavior, timer management, and multiple edge cases.
- **Suggested Fix**: Create `web-app/src/hooks/use-match-polling.test.ts` with at minimum the 23 test cases outlined in the test plan Section 7. This is likely planned for a follow-up but should be flagged as a merge-blocking gap.
- **Test Cases Affected**: TC-001 through TC-010, TC-011 through TC-015, TC-017, TC-018, TC-101 through TC-110, TC-201 through TC-205, TC-401 through TC-406

#### QA-006: `refresh()` always passes `onRefresh` to MatchScorecard even after match completes -- button correctly hidden by UI but refresh function could fire in edge case

- **File**: `web-app/src/hooks/use-match-polling.ts`, line 128-134; `web-app/src/components/match/live-match-card.tsx`, line 79
- **Line**: 128 (hook), 79 (LiveMatchCard)
- **Description**: When a poll returns `status: "completed"`, the hook calls `stopInterval()` (line 109) and updates `match` state. On the next render, `displayStatus` becomes `"completed"`. The wrapper still passes `onRefresh={refresh}` to `MatchScorecard`. The `MatchScorecard` correctly hides the button (the `onRefresh && isLive` guard at lines 62, 80, 93 handles this). However, the `refresh` callback itself is still callable. If any code path were to invoke `refresh()` programmatically after completion, `fetchMatch` would be called. The `statusRef.current !== "live"` guard at line 78 of the hook would catch this and return early, so no fetch actually fires. This is safe but untidy.
- **Impact**: No functional impact due to the `statusRef` guard in `fetchMatch`. Purely a code cleanliness observation.
- **Suggested Fix**: No action needed for v1. The defense-in-depth guards handle this correctly.

---

### Minor Issues

#### QA-007: `compact` mode `relative` class is always applied even when not live -- minor DOM change for non-live compact scorecards

- **File**: `web-app/src/components/match/match-scorecard.tsx`, line 60
- **Line**: 60
- **Description**: The compact container always gets `relative` positioning: `${compact ? "relative" : ""}`. This is needed for the absolutely-positioned refresh button, but it applies to ALL compact scorecards regardless of match status. For non-live compact scorecards (if they ever exist), the `relative` class has no visual effect (no absolutely-positioned children), but it does change the CSS stacking context.
- **Impact**: Negligible. `position: relative` without any positioned children has no visual effect. Only a concern if compact scorecards are used in a context where stacking context matters.
- **Suggested Fix**: Could be made conditional: `${compact && onRefresh && isLive ? "relative" : ""}`. Not necessary for v1.

#### QA-008: `MatchScoreData` type uses `as` cast at line 104 of hook -- type safety gap

- **File**: `web-app/src/hooks/use-match-polling.ts`, line 104
- **Line**: 104 (`setMatch(data as MatchScoreData)`)
- **Description**: The Supabase query uses `.select(POLL_COLUMNS)` which returns a generic type. The result is cast with `as MatchScoreData`. If `POLL_COLUMNS` is ever updated without updating `MatchScoreData` (or vice versa), the cast would silently hide a type mismatch.
- **Impact**: Low. The `POLL_COLUMNS` string and `MatchScoreData` interface are defined in the same PR and are closely related. A developer modifying one would naturally check the other.
- **Suggested Fix**: Consider using Supabase's typed client (the generated `Database` type) to derive the query type automatically, or add a comment linking `POLL_COLUMNS` to `MatchScoreData`.

#### QA-009: `aria-busy` is set to `false` via `{isPolling || undefined}` -- correct but could be clearer

- **File**: `web-app/src/components/match/match-scorecard.tsx`, line 168
- **Line**: 168 (`aria-busy={isPolling || undefined}`)
- **Description**: When `isPolling` is `false`, the expression evaluates to `undefined`, which removes the `aria-busy` attribute from the DOM. This is the correct behavior per NFR-007 and TC-504 (aria-busy absent when idle). The pattern `isPolling || undefined` works because `false || undefined` is `undefined`, but `true || undefined` is `true`. This is idiomatic React but could confuse a reader unfamiliar with the pattern.
- **Impact**: None. Correct behavior. Style observation only.
- **Suggested Fix**: Optionally add a comment for clarity.

#### QA-010: No `aria-live` region for score updates -- screen reader users get no notification of score changes

- **File**: `web-app/src/components/match/match-scorecard.tsx`
- **Description**: The UI/UX spec (Section 7, Accessibility) explicitly decided against `aria-live` for the last-updated text to avoid noise. However, the score values themselves update silently after each poll. Screen reader users have no way to know that scores changed. An `aria-live="polite"` on the score container would announce changes.
- **Impact**: Accessibility gap for screen reader users watching live matches. This was explicitly deferred per the UI/UX spec.
- **Suggested Fix**: Defer to v2 per spec. Add `aria-live="polite"` to the score container `<div className="space-y-2">` when prioritized.
- **Test Cases Affected**: Not covered in current test plan (deferred feature)

---

## Functional Requirements Verification (23 FRs)

| FR | Description | Status | Evidence |
|----|-------------|--------|----------|
| FR-001 | Hook exists with correct signature | PASS | `use-match-polling.ts` exports `useMatchPolling({matchId, status, ...})` |
| FR-002 | Returns `{match, isLoading, lastUpdated, refresh}` | PASS | Line 189 returns all four fields |
| FR-003 | Initial fetch on mount when live | PASS | Main effect line 147: `fetchMatch()` called when `status === "live"` |
| FR-004 | 120s polling interval, only when live | PASS | `DEFAULT_INTERVAL_MS = 120_000`, guard at line 140 |
| FR-005 | Stop polling on non-live status | PASS | Lines 108-110 (poll response) + lines 140-143 (prop change) |
| FR-006 | Page Visibility API pause/resume | PASS | Lines 158-187: hidden clears interval, visible fetches + restarts |
| FR-007 | `refresh()` resets interval timer | PASS | Lines 128-134: calls `fetchMatch()` then `startInterval()` |
| FR-008 | Concurrent fetch guard | PASS | `isFetchingRef.current` guard at line 76 |
| FR-009 | Uses Supabase browser client | PASS | `createClient()` from `@/lib/supabase/client` at line 51 |
| FR-010 | Refresh button visible only when live | PASS | Guards: `onRefresh && isLive` at lines 62, 80, 93 of scorecard |
| FR-011 | `onRefresh` and `isPolling` props | PASS | Lines 21-25 of match-scorecard.tsx |
| FR-012 | Spinning icon + disabled when loading | PASS | `animate-spin` + `disabled={isPolling}` in RefreshButton |
| FR-013 | Clickable when idle, calls onRefresh | PASS | `onClick={onRefresh}` when not disabled |
| FR-014 | Uses `RefreshCw` from lucide-react | PASS | Import at line 4 of match-scorecard.tsx |
| FR-015 | `aria-label="Refresh scores"` | PASS | Line 167 of match-scorecard.tsx |
| FR-016 | Group page client wrapper | PASS | `LiveMatchCard` at `live-match-card.tsx`, integrated at group page line 132 |
| FR-017 | Match page client wrapper | PASS | `LiveMatchScorecard` at `live-match-scorecard.tsx`, integrated at match page line 59 |
| FR-018 | Server data as initial, poll overrides | PASS | `initialData` prop + `match?.field ?? serverProp` fallback pattern |
| FR-019 | Remove LiveScoreTicker | PASS | Both `live-score-ticker.tsx` and `.stories.tsx` deleted (confirmed via glob + grep) |
| FR-020 | `useRealtime` hook NOT modified | PASS | `git diff` shows zero changes to `use-realtime.ts` |
| FR-021 | Realtime publication unchanged | PASS | `git diff` shows zero changes to `005_realtime.sql` |
| FR-022 | No polling when upcoming | PASS | Guard at line 140: `if (status !== "live") { stopInterval(); return; }` |
| FR-023 | Stop polling on completed, UI reflects final | **PARTIAL** | Polling stops correctly. Scores update. BUT `statusInfo` is missing (QA-002). Winner text not shown. |

**Result**: 22 PASS, 1 PARTIAL (FR-023 -- functional gap in status info display)

---

## Non-Functional Requirements Verification (8 NFRs)

| NFR | Description | Status | Evidence |
|-----|-------------|--------|----------|
| NFR-001 | Single Supabase query per poll | PASS | `.select(POLL_COLUMNS).eq("id", matchId).single()` -- one query |
| NFR-002 | Independent polling per live match | PASS | Each `LiveMatchCard` creates its own hook instance |
| NFR-003 | No interval drift (setInterval) | PASS | `setInterval` used (line 124), reset on manual refresh (line 123) |
| NFR-004 | Network errors silently swallowed | PASS | Lines 92-100: error caught, console.warn in dev only, previous data retained |
| NFR-005 | Invalid matchId does not crash | PASS | Lines 111-114: `data` null check, sets `match: null`, stops polling |
| NFR-006 | Keyboard-accessible refresh button | PASS | Native `<button>` element used (line 164) |
| NFR-007 | `aria-busy` on loading button | PASS | `aria-busy={isPolling || undefined}` at line 168 |
| NFR-008 | No new dependencies | PASS | `package.json` has no diff |

**Result**: 8/8 PASS

---

## Edge Cases Verification (10 ECs)

| EC | Scenario | Status | Evidence |
|----|----------|--------|----------|
| EC-01 | Tab hidden 30min, returns | PASS | Visibility handler pauses interval (line 175), force-fetches on visible (line 178), restarts interval (line 179) |
| EC-02 | Refresh during auto-poll in-flight | PASS | `isFetchingRef` guard at line 76 drops the duplicate |
| EC-03 | Live to completed transition | **PARTIAL** | Polling stops, scores update. Missing result text (QA-002) |
| EC-04 | Network goes offline | PASS | Error caught at line 92, previous data retained, next poll retries |
| EC-05 | Navigate away during fetch | PASS | `mountedRef` guard at line 90, cleanup clears interval at lines 151-154 |
| EC-06 | Two live matches (double-header) | PASS | Each `LiveMatchCard` is an independent instance |
| EC-07 | Live but no scores yet | PASS | `isWaiting` state handled in MatchScorecard (lines 53, 112-122, 133-138) |
| EC-08 | Rapid refresh clicks | PASS | Button disabled during loading + concurrent-fetch guard |
| EC-09 | Status is "upcoming" | PASS | No polling, no initial fetch, no refresh button |
| EC-10 | No Page Visibility API support | PASS | Graceful degradation at lines 160-168 |

**Result**: 9 PASS, 1 PARTIAL (EC-03 -- missing statusInfo)

---

## Regression Verification

| Check | Status | Evidence |
|-------|--------|----------|
| `LiveScoreTicker` files deleted | PASS | Glob returns no results; grep finds zero references |
| `useRealtime` hook untouched | PASS | `git diff` shows zero changes |
| `005_realtime.sql` untouched | PASS | `git diff` shows zero changes |
| `NotificationBell` imports shared `formatTimeAgo` | PASS | Line 13: `import { formatTimeAgo } from "@/lib/utils"` |
| `NotificationBell` local `formatTimeAgo` removed | PASS | Diff confirms 10-line function removed |
| `NotificationBell` `useRealtime` subscription intact | PASS | Line 60: `useRealtime("notifications", ...)` unchanged |
| `NotificationBell` casing change | **NOTE** | "Just now" -> "just now" (QA-004) |
| `package.json` unchanged | PASS | Zero diff |
| `MatchScorecard` `"use client"` added | PASS | Line 1 of modified file |

---

## Data Flow Trace (End-to-End)

1. **Server render (RSC)**: `matchesDal.getUpcomingMatches()` or `matchesDal.getMatchById()` fetches full match row from Supabase using server client.
2. **Server page**: Passes individual match fields to `<LiveMatchCard>` or `<LiveMatchScorecard>` as props.
3. **Client wrapper**: Constructs `initialData` from props, calls `useMatchPolling({matchId, status, initialData})`.
4. **Hook initializes**: `useState(initialData)` -> match state has server data immediately. Supabase browser client created via `useMemo`.
5. **Main polling effect**: If `status === "live"`, calls `fetchMatch()` (initial) and `startInterval()` (120s polling).
6. **`fetchMatch()`**: Guards check `isFetchingRef` (no concurrent) and `statusRef` (must be live). Fires `supabase.from("matches").select(POLL_COLUMNS).eq("id", matchId).single()`.
7. **Response**: `data` is cast to `MatchScoreData`, updates `match` state and `lastUpdated`. If `data.status !== "live"`, calls `stopInterval()`.
8. **Wrapper re-renders**: Derives display values from `match?.field ?? serverProp`. Passes to `MatchScorecard`.
9. **MatchScorecard renders**: Shows scores, refresh button (if live + onRefresh), last-updated text (if live + lastUpdated).
10. **Manual refresh**: User clicks button -> `onRefresh()` -> `refresh()` -> `fetchMatch()` + `startInterval()` (reset interval).
11. **Visibility hidden**: Listener calls `stopInterval()`. No polls during hidden.
12. **Visibility visible**: Listener calls `fetchMatch()` + `startInterval()`. Fresh data immediately.
13. **Cleanup on unmount**: `mountedRef.current = false`, `stopInterval()`, visibility listener removed.

**Verdict**: Data flow is correct end-to-end. No gaps in the primary paths.

---

## Performance Assessment

| Check | Status | Evidence |
|-------|--------|----------|
| Selective column fetch (no `live_scorecard_json`) | PASS | `POLL_COLUMNS` lists 9 columns; `live_scorecard_json` excluded |
| Supabase client memoized | PASS | `useMemo(() => createClient(), [])` at line 51 |
| Refs for non-render state | PASS | `isFetchingRef`, `intervalIdRef`, `statusRef`, `mountedRef` are all `useRef` |
| `fetchMatch` stable via `useCallback` | PASS | Deps: `[supabase, matchId, stopInterval]` -- all stable |
| `refresh` stable via `useCallback` | PASS | Deps: `[fetchMatch, startInterval]` -- stable if fetchMatch is stable |
| `stopInterval`/`startInterval` stable | PASS | `stopInterval` deps: `[]`; `startInterval` deps: `[stopInterval, fetchMatch, intervalMs]` |
| No unnecessary re-renders | PASS | Only `match`, `isLoading`, `lastUpdated` are `useState` -- updates only when data changes |

---

## Accessibility Assessment

| Check | Status | Evidence |
|-------|--------|----------|
| Native `<button>` element | PASS | Line 164 of match-scorecard.tsx |
| `aria-label="Refresh scores"` | PASS | Line 167 |
| `aria-busy="true"` when polling | PASS | Line 168: `aria-busy={isPolling \|\| undefined}` |
| `aria-busy` absent when idle | PASS | `false \|\| undefined` = `undefined` (attribute removed) |
| `disabled={true}` when polling | PASS | Line 166 |
| Focus ring on keyboard focus | PASS | `focus-visible:outline focus-visible:outline-2 ...` in className |
| `disabled:opacity-50 disabled:cursor-not-allowed` | PASS | In className |
| Screen reader score update notification | NOT IMPLEMENTED | Deferred per UI/UX spec (QA-010) |

---

## Type Safety Assessment

| Check | Status | Evidence |
|-------|--------|----------|
| `MatchScoreData` fields match `POLL_COLUMNS` | PASS | Both list: id, current_score_a, current_score_b, current_overs_a, current_overs_b, current_batting_team, toss_winner, match_winner, status |
| `MatchScoreData` field types match database Row types | PASS | Cross-referenced with `database.ts` lines 92-128: all types align |
| `MatchStatus` type used for `status` prop in wrappers | PASS | Both wrappers import and use `MatchStatus` from `@/types/database` |
| `as MatchScoreData` cast in hook | NOTE | Type assertion at line 104; safe if POLL_COLUMNS and interface stay in sync (QA-008) |

---

## Positive Observations

1. **Clean concurrent-fetch guard**: The `isFetchingRef` pattern is simple, correct, and avoids the complexity of AbortController for this lightweight use case. The `finally` block ensures the ref is always reset, even on early returns.

2. **Excellent `statusRef` pattern**: Using a ref to track the latest `status` without adding it to `fetchMatch`'s dependency array is a sophisticated React pattern that prevents unnecessary effect re-runs while ensuring the fetch always reads the current status.

3. **Proper `useCallback` dependency chains**: `stopInterval` -> `fetchMatch` -> `startInterval` -> `refresh` -- each wraps its dependencies correctly, creating a stable reference chain that prevents unnecessary re-renders of child components.

4. **Graceful Page Visibility API degradation**: The double-guard (`typeof document === "undefined"` for SSR + `!("visibilityState" in document)` for old browsers) is thorough and correct.

5. **Clean wrapper component pattern**: The `LiveMatchCard` and `LiveMatchScorecard` wrappers bridge SSR data with client-side polling without leaking polling concerns into the presentational `MatchScorecard`.

6. **Correct `mountedRef` guard in `finally` block**: The `finally` block at lines 116-119 correctly resets `isFetchingRef` unconditionally (so the concurrent-fetch guard is always cleared) and conditionally calls `setIsLoading(false)` only when mounted.

7. **`formatTimeAgo` extraction**: Clean shared utility that eliminates code duplication between NotificationBell and MatchScorecard.

8. **Dead code cleanup**: Removing `LiveScoreTicker` and its stories reduces confusion and codebase size.

---

## Recommendation

- [x] **Merge after fixing critical and moderate issues**
- [ ] Ready to merge as-is
- [ ] Needs significant rework

### Required Before Merge

1. **QA-001 (Critical)**: Add `e.stopPropagation()` to `RefreshButton` onClick -- single-line fix.
2. **QA-002 (Moderate)**: Derive `statusInfo` from `match_winner` in both wrapper components so the completed state displays result text.
3. **QA-004 (Moderate)**: Decide on casing for "just now" vs "Just now" and make consistent (accept lowercase or capitalize in NotificationBell).
4. **QA-005 (Moderate)**: Create unit tests for `use-match-polling.ts` per the test plan (23 cases minimum). If this is planned as a follow-up commit, document the gap explicitly.

### Recommended Post-Merge

5. **QA-003 (Moderate)**: Consider rendering `MatchScorecard` directly for non-live matches on the match leaderboard page instead of wrapping everything in `LiveMatchScorecard`.
6. **QA-006 (Moderate)**: Clean up -- conditionally pass polling props based on status in wrappers.
7. **QA-008 (Minor)**: Add comment linking `POLL_COLUMNS` to `MatchScoreData` interface.

---

## Test Plan Coverage Summary

| Category | Total Cases | Verified via Code Review | Require Automated Tests | Require Manual/Integration Tests |
|----------|-------------|--------------------------|-------------------------|----------------------------------|
| Polling Lifecycle (TC-001 to TC-010) | 10 | 10 | 10 | 0 |
| Page Visibility (TC-011 to TC-015) | 5 | 5 | 4 | 1 |
| Manual Refresh (TC-016 to TC-022) | 7 | 7 | 3 | 4 |
| Group Page Integration (TC-023 to TC-025) | 3 | 3 | 0 | 3 |
| Match Page Integration (TC-026 to TC-028) | 3 | 3 | 0 | 3 |
| Last Updated (TC-029 to TC-032) | 4 | 4 | 2 | 2 |
| formatTimeAgo (TC-033 to TC-037) | 5 | 5 | 5 | 0 |
| Edge Cases (TC-101 to TC-110) | 10 | 10 | 8 | 2 |
| Error Scenarios (TC-201 to TC-205) | 5 | 5 | 5 | 0 |
| Dead Code & Regression (TC-301 to TC-308) | 8 | 8 | 2 | 6 |
| Performance (TC-401 to TC-407) | 7 | 7 | 5 | 2 |
| Accessibility (TC-501 to TC-508) | 8 | 8 | 3 | 5 |
| Responsive & Visual (TC-601 to TC-611) | 11 | 11 | 0 | 11 |
| **Total** | **86** | **86** | **47** | **39** |

All 86 test cases (78 from test plan + 8 additional from visual behavior) were verified via code review. 47 should be automated; 39 require manual testing. Currently 0 automated tests exist (QA-005).
