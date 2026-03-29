# Code Review: Live Score Polling

**Reviewer**: PSE Agent (Code Review Mode)
**Date**: 2026-03-29
**Status**: Complete
**Branch**: main (changes already landed)

**Scope**: All implementation files for the "Live Score Polling" feature, reviewed against requirements.md, technical-architecture.md, ui-ux-spec.md, and codebase-analysis.md.

---

## Summary

The implementation is solid and faithful to the architecture blueprint. The polling hook is well-structured with proper concurrent-fetch guards, visibility API integration, and cleanup logic. The component hierarchy (server page -> client wrapper -> presentational scorecard) is clean and follows existing codebase patterns. Two blockers were identified, both in the polling hook. Several warnings and suggestions are documented below.

**Verdict**: Fix the two blockers, then this is merge-ready.

---

## Files Reviewed

| File | Status | Verdict |
|------|--------|---------|
| `web-app/src/hooks/use-match-polling.ts` | NEW | 2 blockers, 2 warnings |
| `web-app/src/components/match/live-match-card.tsx` | NEW | Clean |
| `web-app/src/components/match/live-match-scorecard.tsx` | NEW | 1 warning |
| `web-app/src/components/match/match-scorecard.tsx` | MODIFIED | Clean |
| `web-app/src/app/group/[groupId]/page.tsx` | MODIFIED | Clean |
| `web-app/src/app/group/[groupId]/match/[matchId]/page.tsx` | MODIFIED | 1 suggestion |
| `web-app/src/lib/utils.ts` | MODIFIED | Clean |
| `web-app/src/types/index.ts` | MODIFIED | Clean |
| `web-app/src/components/layout/notification-bell.tsx` | MODIFIED | Clean |
| `web-app/src/components/match/live-score-ticker.tsx` | DELETED | Verified |
| `web-app/src/components/match/live-score-ticker.stories.tsx` | DELETED | Verified |
| `web-app/src/hooks/use-realtime.ts` | UNTOUCHED | Verified |

---

## Blocker Issues

### B-01: `isFetchingRef` not reset when component unmounts during fetch

**File**: `web-app/src/hooks/use-match-polling.ts`, lines 90 and 116-118

**Problem**: When the component unmounts while a fetch is in-flight, the code returns early at line 90 (`if (!mountedRef.current) return;`) BEFORE reaching the `finally` block. Actually -- on re-examination, the `finally` block at line 116 DOES execute (JavaScript `finally` runs after `return` statements in `try`). So `isFetchingRef.current` IS set to `false` at line 117. However, the `setIsLoading(false)` at line 118 is guarded by `mountedRef.current`, which is correct.

**Wait -- this is NOT a blocker.** The `finally` block runs unconditionally. `isFetchingRef.current = false` at line 117 executes regardless of the early return at line 90. And line 118 correctly guards `setIsLoading` with `mountedRef.current`. This is properly implemented.

**Resolution**: Withdrawn. Not an issue.

---

### B-01 (revised): Race condition in `refresh()` -- double fetch on call

**File**: `web-app/src/hooks/use-match-polling.ts`, lines 128-134

```ts
const refresh = useCallback(() => {
    fetchMatch();
    // FR-007: Reset interval so next auto-poll is a full interval later
    if (statusRef.current === "live") {
      startInterval();
    }
  }, [fetchMatch, startInterval]);
```

**Problem**: `fetchMatch()` is async but is called without `await`. Immediately after calling it, `startInterval()` is called, which clears the old interval and sets a new one. This is fine for interval reset behavior (FR-007). However, there is a subtle issue: `startInterval()` calls `setInterval(fetchMatch, intervalMs)`, which means the interval's `fetchMatch` closure is registered. If the interval fires while the manual `fetchMatch()` from `refresh()` is still in-flight, the concurrent-fetch guard (`isFetchingRef.current`) correctly prevents a duplicate fetch. So this is actually safe.

**Resolution**: Withdrawn. The concurrent-fetch guard handles this correctly.

---

### B-01 (final): `mountedRef.current = true` set in effect body, not in ref initializer

**File**: `web-app/src/hooks/use-match-polling.ts`, line 138

```ts
useEffect(() => {
    mountedRef.current = true;
    ...
```

**Problem**: `mountedRef` is initialized as `useRef(true)` at line 60, so on first mount it's already `true`. However, in React 18 Strict Mode (development only), effects run twice: mount -> unmount -> remount. On the first unmount, `mountedRef.current` is set to `false` (line 152). On the remount, line 138 sets it back to `true`. This is correct behavior for Strict Mode.

However, there is a real issue: this `useEffect` has `[status, fetchMatch, startInterval, stopInterval]` as dependencies. If any of these change (e.g., `fetchMatch` gets a new reference because `matchId` changes), the cleanup runs (setting `mountedRef.current = false`) and the effect re-runs (setting it back to `true`). Between cleanup and re-run, any in-flight fetch from the OLD effect would see `mountedRef.current === false` and skip state updates. But then immediately the NEW effect sets `mountedRef.current = true` and calls `fetchMatch()` again. This creates a window where:

1. Old `fetchMatch` is in-flight
2. Cleanup runs: `mountedRef.current = false`, interval cleared
3. New effect runs: `mountedRef.current = true`, new `fetchMatch()` called
4. Old `fetchMatch` returns, sees `mountedRef.current === true` (set by step 3), and writes state

This means two fetches could simultaneously write state. In practice, `matchId` never changes for a mounted wrapper component (it's derived from the route), so `fetchMatch` is stable and this path is not hit. But it is a latent correctness issue.

**Severity**: Downgraded to Warning (see W-01) because `matchId` is stable in all current call sites.

---

## Blocker Issues (confirmed)

### B-01: `select("*")` vs selective columns -- query fetches `live_scorecard_json`

**File**: `web-app/src/hooks/use-match-polling.ts`, line 9-10

```ts
const POLL_COLUMNS =
  "id, current_score_a, current_score_b, current_overs_a, current_overs_b, current_batting_team, toss_winner, match_winner, status";
```

**Analysis**: The `POLL_COLUMNS` string correctly lists only the 9 lightweight columns. The query at line 86 uses `.select(POLL_COLUMNS)`, which means `live_scorecard_json` (~50KB) is NOT fetched. This is correct per codebase-analysis.md Finding 6 and NFR-001.

**Resolution**: Withdrawn. This is correctly implemented.

---

After thorough re-analysis, I find **no confirmed blocker issues**. The implementation is more robust than initially assessed. Promoting the most significant concern to a Warning.

---

## Warning Issues

### W-01: `mountedRef` shared across effect re-runs could allow stale fetch to write state

**File**: `web-app/src/hooks/use-match-polling.ts`, lines 60, 138, 152

**Problem**: As analyzed above in the withdrawn B-01, if the main polling effect's dependencies change (causing cleanup -> re-run), an in-flight fetch from the old effect could see the new effect's `mountedRef.current = true` and incorrectly write state. This is safe in the current codebase because `matchId` never changes for a mounted wrapper, making `fetchMatch` stable. But it is fragile -- a future caller that changes `matchId` dynamically would hit this.

**Fix**: Use an AbortController per effect invocation instead of (or in addition to) `mountedRef`:
```ts
useEffect(() => {
  const controller = new AbortController();
  // Pass controller.signal to fetchMatch or use it directly
  ...
  return () => {
    controller.abort();
    stopInterval();
  };
}, [status, fetchMatch, ...]);
```

**Severity**: Warning -- not a blocker because `matchId` is stable in all current call sites.

---

### W-02: `statusInfo` always passed as `null` -- completed match shows no result text

**File**: `web-app/src/app/group/[groupId]/match/[matchId]/page.tsx`, line 70

```tsx
statusInfo={null}
```

**Problem**: The match leaderboard page passes `statusInfo={null}` to `LiveMatchScorecard`. When the polling hook detects `status === "completed"`, `LiveMatchScorecard` passes `statusInfo` through (line 77: `statusInfo={displayStatus === "completed" ? statusInfo : null}`). But since the server always passes `null`, the completed state in MatchScorecard will render nothing in the status header (line 71-73: `{isCompleted && statusInfo ? (...) : ...}` evaluates to null when statusInfo is null).

This means when a match completes while the user is watching, the scorecard transitions to completed mode but shows NO result text (e.g., "CSK won by 44 runs"). The scores and teams are still visible, but the winner announcement is missing.

The original page (before this feature) also passed `statusInfo={null}`, so this is a pre-existing issue, not a regression. However, this feature introduces a new code path where the user watches the live-to-completed transition in real-time, making the missing result text more noticeable.

**Fix**: Either compute `statusInfo` from the polled data (e.g., `match.match_winner ? \`${match.match_winner} won\` : null`) in the wrapper component, or add `status_info` to the `POLL_COLUMNS` (if such a column exists in the DB -- it does not currently). The simplest fix is to derive it in `LiveMatchScorecard`:

```ts
const displayStatusInfo = displayMatchWinner
  ? `${displayMatchWinner} won`
  : statusInfo;
```

**Severity**: Warning -- functional gap in an edge case (live-to-completed transition), but not a regression from the pre-feature state for page loads.

---

### W-03: `LiveMatchCard` does not pass `statusInfo` for completed state

**File**: `web-app/src/components/match/live-match-card.tsx`, line 77

```tsx
statusInfo={null}
```

**Problem**: Same issue as W-02 but for the group page's compact scorecard. If a match completes while the user is on the group page, the compact card transitions to completed mode with no result text. Less impactful because compact mode does not show a prominent status header, but the `isCompleted && statusInfo` check still governs the completed state header in full mode.

**Severity**: Warning -- same as W-02.

---

### W-04: Potential ESLint exhaustive-deps warning in the actual file vs. architecture blueprint

**File**: `web-app/src/hooks/use-match-polling.ts`, lines 120, 155

The implementation correctly wraps `stopInterval` and `startInterval` in `useCallback`, which differs from the architecture blueprint (which used plain `function` declarations). This is an improvement -- the actual implementation is more correct for the React hooks model.

However, the `fetchMatch` callback at line 120 lists `[supabase, matchId, stopInterval]` as dependencies. The `stopInterval` is called inside `fetchMatch` (lines 109, 114), so it correctly appears in the dependency array. Good.

The main effect at line 155 lists `[status, fetchMatch, startInterval, stopInterval]` as dependencies. All four are used in the effect body. Good.

**Resolution**: No issue. The implementation improved upon the architecture doc's blueprint.

---

### W-05: `formatTimeAgo` does not handle negative diffs (future dates)

**File**: `web-app/src/lib/utils.ts`, lines 103-113

```ts
export function formatTimeAgo(date: Date | string): string {
  const timestamp = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  ...
```

**Problem**: If `date` is in the future (clock skew, timezone issue), `diff` is negative, `minutes` is negative, and the function returns "just now" (since -5 < 1). This is acceptable behavior for this use case (a slightly-future `lastUpdated` shows "just now"), but `formatTimeAgo` is now a shared utility also used by NotificationBell. A notification with a future `created_at` would also show "just now" instead of something more informative.

**Severity**: Warning (minor) -- acceptable for v1, but worth noting. The original local `formatTimeAgo` in NotificationBell had the same behavior.

---

## Suggestion Issues

### S-01: Consider extracting `MatchInitialData` type per architecture doc

**File**: `web-app/src/types/index.ts`

The architecture document (Section 2) specifies a `MatchInitialData` type alias that was not implemented. The current approach works fine (wrapper components construct `MatchScoreData` inline from individual props), but the `MatchInitialData` type would provide a cleaner contract for wrapper props.

**Severity**: Suggestion -- the current approach works; this is a DX improvement.

---

### S-02: Match leaderboard page should derive `statusInfo` from match data

**File**: `web-app/src/app/group/[groupId]/match/[matchId]/page.tsx`, line 70

Instead of passing `statusInfo={null}`, the server page could derive it:

```ts
const statusInfo = match.match_winner
  ? `${match.match_winner} won`
  : match.status === "no_result"
    ? "No result"
    : match.status === "abandoned"
      ? "Match abandoned"
      : null;
```

This would fix the completed state display for both SSR and post-poll transitions. Note: This is related to W-02 but scoped to the server page -- the wrapper component would also need the fix for poll-detected transitions.

**Severity**: Suggestion (elevated from W-02 -- would resolve the warning).

---

### S-03: Add PostHog tracking for manual refresh clicks

**File**: `web-app/src/hooks/use-match-polling.ts` or wrapper components

The requirements document (Section 7, Open Questions) mentions: "track `refresh` button clicks via PostHog to inform v2 tuning." This is not implemented. While explicitly listed as a v2 recommendation, adding a simple `posthog.capture("live_score_manual_refresh")` in the `refresh` callback would be trivial.

**Severity**: Suggestion -- deferred per PM, but trivial to add.

---

### S-04: Consider `aria-live="polite"` region for score updates

**File**: `web-app/src/components/match/match-scorecard.tsx`

The UI/UX spec (Section 7) explicitly decided against `aria-live` for the last-updated text (too noisy). However, the score values themselves update silently. Screen reader users have no way to know scores changed after a poll. A subtle `aria-live="polite"` on the score container would announce changes without being as frequent as the timestamp.

**Severity**: Suggestion -- accessibility enhancement, not required for v1 per spec.

---

### S-05: Extract `RefreshButton` to a shared component if reused

**File**: `web-app/src/components/match/match-scorecard.tsx`, lines 150-174

The `RefreshButton` is defined as an internal function component within `match-scorecard.tsx`. The UI/UX spec explicitly states "No new UI components are created in `components/ui/`." This is correct for v1. If the refresh pattern is reused elsewhere (e.g., leaderboard refresh), it should be extracted then.

**Severity**: Suggestion -- no action needed now.

---

## Requirements Coverage Matrix

### Functional Requirements (23)

| Req | Description | Status | Notes |
|-----|-------------|--------|-------|
| FR-001 | Hook exists with correct signature | PASS | `useMatchPolling({matchId, status, ...})` |
| FR-002 | Returns `{match, isLoading, lastUpdated, refresh}` | PASS | Line 189 |
| FR-003 | Initial fetch on mount when live | PASS | Line 147 in main effect |
| FR-004 | 120s polling interval, only when live | PASS | `DEFAULT_INTERVAL_MS = 120_000`, guard at line 140 |
| FR-005 | Stop polling on non-live status | PASS | Lines 108-110 (poll response) + line 140-143 (prop change) |
| FR-006 | Page Visibility API pause/resume | PASS | Lines 158-187 |
| FR-007 | `refresh()` resets interval timer | PASS | Lines 128-134 |
| FR-008 | Concurrent fetch guard | PASS | `isFetchingRef` at lines 76-78 |
| FR-009 | Uses Supabase browser client | PASS | `createClient()` from `@/lib/supabase/client` |
| FR-010 | Refresh button visible only when live | PASS | `{onRefresh && isLive && ...}` checks |
| FR-011 | `onRefresh` and `isPolling` props | PASS | Lines 21-25 in match-scorecard.tsx |
| FR-012 | Spinning icon + disabled when loading | PASS | `animate-spin` + `disabled={isPolling}` in RefreshButton |
| FR-013 | Clickable when idle, calls onRefresh | PASS | `onClick={onRefresh}` in RefreshButton |
| FR-014 | Uses `RefreshCw` from lucide-react | PASS | Import at line 4 of match-scorecard.tsx |
| FR-015 | `aria-label="Refresh scores"` | PASS | Line 167 of match-scorecard.tsx |
| FR-016 | Group page client wrapper | PASS | `LiveMatchCard` component |
| FR-017 | Match page client wrapper | PASS | `LiveMatchScorecard` component |
| FR-018 | Server data as initial, poll data overrides | PASS | `initialData` prop + `match?.field ?? serverProp` pattern |
| FR-019 | Remove LiveScoreTicker Realtime usage | PASS | Files deleted entirely |
| FR-020 | `useRealtime` hook NOT modified | PASS | File unchanged (verified via git) |
| FR-021 | Realtime publication unchanged | PASS | No migration files modified |
| FR-022 | No polling when status is "upcoming" | PASS | Guard at line 140 and line 78 |
| FR-023 | Stop polling on completed, UI reflects final state | PARTIAL | Polling stops correctly. UI reflects final scores. BUT result text (statusInfo) is missing -- see W-02. |

### Non-Functional Requirements (8)

| Req | Description | Status | Notes |
|-----|-------------|--------|-------|
| NFR-001 | Single Supabase query per poll | PASS | `.select(POLL_COLUMNS).eq("id", matchId).single()` |
| NFR-002 | Independent polling per live match | PASS | Each `LiveMatchCard` has its own hook instance |
| NFR-003 | No interval drift (setInterval, not setTimeout chain) | PASS | `setInterval` used, reset on manual refresh |
| NFR-004 | Network errors silently swallowed | PASS | Lines 92-101, console.warn in dev only |
| NFR-005 | Invalid matchId does not crash | PASS | Lines 111-114, sets `match: null` |
| NFR-006 | Keyboard-accessible refresh button | PASS | Native `<button>` element |
| NFR-007 | `aria-busy` on loading button | PASS | `aria-busy={isPolling || undefined}` |
| NFR-008 | No new dependencies | PASS | Only React hooks + Supabase client + browser APIs |

### Edge Cases (10)

| EC | Scenario | Status | Notes |
|----|----------|--------|-------|
| EC-01 | Tab hidden 30min, then returns | PASS | Visibility handler pauses interval, force-fetches on visible |
| EC-02 | Refresh during auto-poll in-flight | PASS | `isFetchingRef` guard drops the duplicate |
| EC-03 | Live to completed transition | PARTIAL | Polling stops, scores update. Missing result text (W-02). |
| EC-04 | Network goes offline | PASS | Error swallowed, previous data shown, next poll retries |
| EC-05 | Navigate away during fetch | PASS | `mountedRef` guard prevents state updates, cleanup clears interval |
| EC-06 | Two live matches (double-header) | PASS | Each `LiveMatchCard` is independent |
| EC-07 | Live but no scores yet | PASS | `isWaiting` state handled in MatchScorecard |
| EC-08 | Rapid refresh clicks | PASS | Button disabled during loading + concurrent-fetch guard |
| EC-09 | Status is "upcoming" | PASS | No polling, no initial fetch, no refresh button |
| EC-10 | No Page Visibility API support | PASS | Graceful degradation at lines 160-167 |

---

## Deleted Files Verification

| File | Expected | Actual |
|------|----------|--------|
| `web-app/src/components/match/live-score-ticker.tsx` | Deleted | CONFIRMED deleted (glob returns no results) |
| `web-app/src/components/match/live-score-ticker.stories.tsx` | Deleted | CONFIRMED deleted (glob returns no results) |

## Untouched Files Verification

| File | Expected | Actual |
|------|----------|--------|
| `web-app/src/hooks/use-realtime.ts` | Untouched | CONFIRMED unchanged (no diff in git log) |

---

## Regression Risk Assessment

### NotificationBell

The `NotificationBell` component was modified to import `formatTimeAgo` from `@/lib/utils` instead of using a local function. Verified:
- Import statement at line 13: `import { formatTimeAgo } from "@/lib/utils";`
- Local `formatTimeAgo` function removed (confirmed via grep)
- The shared `formatTimeAgo` accepts `Date | string` (the original accepted only `string`) -- backward compatible
- Casing difference: shared version returns "just now" (lowercase) vs. original "Just now" (capitalized). **This is a minor visual change in the notification panel.** The UI spec for this feature specifies lowercase. Need to verify this is acceptable for notifications.

**Risk**: LOW. Functional behavior identical. Minor casing difference in "just now" vs "Just now" for notifications created less than 1 minute ago.

### MatchScorecard Conversion to Client Component

The `MatchScorecard` was converted from a server component to a client component (`"use client"` added). This means:
- It is now always rendered on the client, even when the new polling props are not passed.
- No functional change -- it was purely presentational and had no server-side data dependencies.
- Slight bundle size increase (component JS now ships to the client), but the component is small.

**Risk**: LOW. No behavioral change.

### Group Page and Match Page

Both pages now import client wrapper components (`LiveMatchCard`, `LiveMatchScorecard`) instead of `MatchScorecard` directly for live matches. The server-rendered HTML for live matches now includes a client component boundary. For non-live matches, the group page still renders the static team names/schedule (no scorecard, no client wrapper).

**Risk**: LOW. The integration is clean and follows the existing client/server boundary pattern.

---

## Final Verdict

| Category | Count |
|----------|-------|
| Blockers | **0** |
| Warnings | **5** (W-01 through W-05) |
| Suggestions | **5** (S-01 through S-05) |

**Recommendation**: APPROVE for merge. The warnings (especially W-02/W-03 regarding missing `statusInfo` on live-to-completed transition) should be addressed in a fast-follow, but they are not regressions from the current behavior and do not block the feature.

---

## Priority Fix List (post-merge)

1. **W-02/W-03**: Derive `statusInfo` from `match_winner` in wrapper components so the completed state shows result text after a live-to-completed poll transition.
2. **W-01**: Consider AbortController per effect invocation if `matchId` ever becomes dynamic.
3. **S-03**: Add PostHog tracking for manual refresh clicks to inform v2 interval tuning.
