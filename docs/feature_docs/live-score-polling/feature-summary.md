# Feature: Live Score Polling
**Completed**: 2026-03-29
**Branch**: feature/live-score-polling (merged to main)

---

## 1. What Was Built

Live Score Polling replaces the Supabase Realtime database subscription approach for match score updates with a client-side polling mechanism. During live IPL matches, the app now fetches updated scores from the `matches` table every 120 seconds using the Supabase browser client, instead of maintaining a persistent WebSocket connection through Supabase Realtime.

The change was motivated by a mismatch between the update mechanism and the data flow: match scores are written to the database by a server-side edge function poller on a similar cadence, not by user writes. Maintaining a persistent Realtime connection for data that only changes every few minutes added unnecessary overhead. Polling gives users predictable, periodic updates with a manual refresh escape hatch, while reducing Supabase Realtime connection costs.

The feature introduces a `useMatchPolling` React hook that manages the full polling lifecycle, two client wrapper components that bridge server-rendered data with client-side polling, a manual refresh button with loading feedback on the `MatchScorecard`, and a shared `formatTimeAgo` utility. The existing `LiveScoreTicker` component (dead code superseded by `MatchScorecard`) was deleted.

---

## 2. Key Components and Responsibilities

| Component | File | Role |
|-----------|------|------|
| `useMatchPolling` | `web-app/src/hooks/use-match-polling.ts` | Core polling hook. Manages fetch lifecycle, 120s interval, Page Visibility API integration, concurrent-fetch guard, and manual refresh with interval reset. |
| `LiveMatchCard` | `web-app/src/components/match/live-match-card.tsx` | Client wrapper for **group page**. Calls `useMatchPolling`, merges polled data with server-rendered props, passes refresh controls to `MatchScorecard` in compact mode. |
| `LiveMatchScorecard` | `web-app/src/components/match/live-match-scorecard.tsx` | Client wrapper for **match leaderboard page**. Same polling pattern as `LiveMatchCard`, renders `MatchScorecard` in full mode. |
| `MatchScorecard` | `web-app/src/components/match/match-scorecard.tsx` | Presentational scorecard. Extended with `onRefresh`, `isPolling`, and `lastUpdated` props. Renders a refresh button (when live) and a "Updated Xm ago" indicator. Converted to client component (`"use client"`). |
| `RefreshButton` | Internal to `match-scorecard.tsx` | Internal component within `MatchScorecard`. Uses `RefreshCw` icon from `lucide-react`. Spins when polling, disabled during loading, includes `stopPropagation` for safe nesting. |
| `formatTimeAgo` | `web-app/src/lib/utils.ts` | Shared utility extracted from `NotificationBell`. Formats `Date | string` into relative time ("just now", "1m ago", "5h ago", "2d ago"). Used by both `MatchScorecard` and `NotificationBell`. |
| `MatchScoreData` | `web-app/src/types/index.ts` | Type interface for the lightweight 9-column polling response. Excludes `live_scorecard_json` (~50KB). |

---

## 3. Polling Lifecycle

```
START (component mounts with status === "live")
  |
  +--> Initial fetchMatch()
  +--> setInterval(fetchMatch, 120_000)
  |
  |    +--- Every 120s: fetchMatch() ----+
  |    |                                  |
  |    |  [isFetchingRef guard]           |
  |    |  supabase.from("matches")        |
  |    |    .select(POLL_COLUMNS)          |
  |    |    .eq("id", matchId)            |
  |    |    .single()                     |
  |    |                                  |
  |    |  Success -> setMatch(data)       |
  |    |          -> setLastUpdated(now)  |
  |    |  Error   -> silently swallowed   |
  |    |  data.status !== "live" -> STOP  |
  |    +----------------------------------+
  |
PAUSE (tab becomes hidden via Page Visibility API)
  |
  +--> clearInterval()
  |    No fetches while tab is hidden
  |
RESUME (tab becomes visible)
  |
  +--> Immediate fetchMatch()
  +--> setInterval(fetchMatch, 120_000) -- fresh interval
  |
MANUAL REFRESH (user clicks refresh button)
  |
  +--> fetchMatch()
  +--> clearInterval() + setInterval() -- resets the 120s timer
  |
STOP (any of the following)
  |
  +--> status prop changes to non-"live"
  +--> Poll response returns status !== "live"
  +--> Component unmounts
       -> mountedRef.current = false
       -> clearInterval()
       -> Visibility listener removed
```

---

## 4. Data Flow

```
                          SERVER                              CLIENT
                       (RSC render)                     (browser, hydrated)

    matchesDal.getMatchById()  ──>  Full match row
              |
              v
    Server Page (group or match)
              |
              |  Passes individual match fields as props
              v
    <LiveMatchCard> or <LiveMatchScorecard>         ──>  Client boundary
              |
              |  Constructs initialData from server props
              |  Calls useMatchPolling({matchId, status, initialData})
              v
    useMatchPolling                                      Supabase browser client
              |                                                   |
              |  useState(initialData)  <-- immediate render      |
              |  fetchMatch()           ------------------>  .select(POLL_COLUMNS)
              |                         <------------------  .eq("id", matchId)
              |  setMatch(polledData)                              |
              |  setLastUpdated(now)                               |
              v
    Derives display values: match?.field ?? serverProp
              |
              |  Passes to MatchScorecard:
              |    - Score/team/status data
              |    - onRefresh={refresh}
              |    - isPolling={isLoading}
              |    - lastUpdated={lastUpdated}
              v
    <MatchScorecard>
              |
              +--> Team scores (ScoreRow x 2)
              +--> Refresh button (RefreshCw icon, visible when live)
              +--> "Updated Xm ago" text (visible when live)
```

---

## 5. Files Changed

### New Files

| File | Purpose |
|------|---------|
| `web-app/src/hooks/use-match-polling.ts` | Core polling hook with interval management, visibility API, concurrent-fetch guard |
| `web-app/src/components/match/live-match-card.tsx` | Client wrapper for group page live match scorecards |
| `web-app/src/components/match/live-match-scorecard.tsx` | Client wrapper for match leaderboard page scorecard |

### Modified Files

| File | Changes |
|------|---------|
| `web-app/src/components/match/match-scorecard.tsx` | Added `"use client"` directive. Added `onRefresh`, `isPolling`, `lastUpdated` props. Added internal `RefreshButton` component. Added "Updated Xm ago" footer. Refresh button placement differs by mode: absolutely-positioned (compact) vs. in status header (full). |
| `web-app/src/app/group/[groupId]/page.tsx` | Live matches now render `<LiveMatchCard>` instead of inline team names. Imports `LiveMatchCard`. |
| `web-app/src/app/group/[groupId]/match/[matchId]/page.tsx` | Scorecard now renders via `<LiveMatchScorecard>` instead of `MatchScorecard` directly. Imports `LiveMatchScorecard`. |
| `web-app/src/types/index.ts` | Added `MatchScoreData` interface (9 lightweight columns for polling). |
| `web-app/src/lib/utils.ts` | Added shared `formatTimeAgo(date: Date \| string)` utility function. |
| `web-app/src/components/layout/notification-bell.tsx` | Replaced local `formatTimeAgo` with import from `@/lib/utils`. Minor casing change: "Just now" became "just now". |

### Deleted Files

| File | Reason |
|------|--------|
| `web-app/src/components/match/live-score-ticker.tsx` | Dead code. The `LiveScoreTicker` component used `useRealtime` for match scores but was not imported by any page -- only Storybook stories referenced it. `MatchScorecard` had superseded it. |
| `web-app/src/components/match/live-score-ticker.stories.tsx` | Associated Storybook stories for the deleted component. |

### Untouched Files (verified)

| File | Reason Left Alone |
|------|-------------------|
| `web-app/src/hooks/use-realtime.ts` | Still used by `NotificationBell` for real-time notification updates. Not modified. |
| `supabase/migrations/005_realtime.sql` | The `matches` table stays in the Supabase Realtime publication. Other systems (edge functions, admin tools) may rely on it. |

---

## 6. Design Decisions and Tradeoffs

### Polling over Realtime for match scores

**Decision**: Replace Supabase Realtime subscription with 120s `setInterval` polling.

**Rationale**: Match scores are updated in the database by a server-side edge function poller, not by user writes. The Realtime subscription was listening for changes that arrive on a similar cadence anyway. Polling is simpler, has no persistent connection overhead, and gives predictable update behavior. Realtime is kept for `notifications` (user-triggered, latency-sensitive).

### `setInterval` over chained `setTimeout`

**Decision**: Use `setInterval` with a clear-and-reset pattern on manual refresh.

**Rationale**: `setTimeout` chaining would accumulate fetch-time delays (interval drift). The polling query is lightweight (<100ms typically), so `setInterval` provides consistent timing. The concurrent-fetch guard (`isFetchingRef`) handles the edge case where a fetch takes longer than expected.

### Selective column fetch (9 columns, not `select("*")`)

**Decision**: Poll only `id, current_score_a, current_score_b, current_overs_a, current_overs_b, current_batting_team, toss_winner, match_winner, status`.

**Rationale**: The `matches` table includes a `live_scorecard_json` column (~50KB) that is not needed for the scorecard display. Fetching only the 9 required columns reduces payload size by an order of magnitude.

### Client wrappers own the polling lifecycle

**Decision**: `useMatchPolling` is called in wrapper components (`LiveMatchCard`, `LiveMatchScorecard`), not inside `MatchScorecard`.

**Rationale**: Keeps `MatchScorecard` as a pure presentational component. It renders whatever props it receives -- no data-fetching logic, no hooks that create side effects. This makes it testable, reusable, and server-renderable (when polling props are omitted).

### `MatchScorecard` converted to client component

**Decision**: Added `"use client"` to `match-scorecard.tsx`.

**Rationale**: The component now accepts an `onRefresh` function prop. Functions cannot be serialized across the server/client boundary in React Server Components. Since the component was already purely presentational with no server-side data dependencies, adding the directive has zero functional cost (slight bundle size increase from shipping the component JS to the client).

### `formatTimeAgo` extracted to shared utility

**Decision**: Moved from local function in `NotificationBell` to `@/lib/utils`.

**Rationale**: Both `NotificationBell` and `MatchScorecard` need relative time formatting. DRY principle. The shared version accepts `Date | string` (broader than the original `string`-only version). Minor side effect: casing changed from "Just now" to "just now" in notifications.

### No AbortController for polling fetches

**Decision**: Use `mountedRef` guard instead of `AbortController` for unmount safety.

**Rationale**: The polling query is a single lightweight Supabase REST call (<100ms). `AbortController` would add complexity without meaningful benefit. The `mountedRef` guard prevents state updates after unmount. A future enhancement could add `AbortController` per effect invocation if `matchId` ever becomes dynamic.

---

## 7. Known Limitations

1. **No `statusInfo` on live-to-completed transition (QA-002, W-02/W-03)**: When a match completes while the user is watching, the scorecard transitions to completed mode but does not show the winner announcement text (e.g., "CSK won by 44 runs"). Both wrapper components pass `statusInfo={null}`. The database has a `match_winner` column but no `status_info` column with the full result string. A post-merge fix should derive `statusInfo` from `match_winner` in the wrapper components.

2. **No automated tests**: The `use-match-polling.test.ts` file specified in the architecture doc was not created (QA-005). The hook's complex async behavior (timers, visibility API, concurrent-fetch guard) is validated only by code review, not by automated tests. The test plan specifies 47 automated test cases.

3. **No polling for upcoming-to-live transition**: If a user opens the page when the match is `"upcoming"`, polling does not start. The hook only activates when `status === "live"`. Detecting the upcoming-to-live transition requires a full page refresh or `router.refresh()`.

4. **Casing regression in NotificationBell (QA-004)**: The shared `formatTimeAgo` returns "just now" (lowercase), while the original local version in `NotificationBell` returned "Just now" (capitalized). Minor visual change for notifications less than 1 minute old.

5. **No score-change highlighting**: When scores update after a poll, the new values simply replace the old ones. There is no flash, animation, or color change to draw attention to the update. Deferred to v2.

6. **No `aria-live` for score updates (QA-010)**: Screen reader users are not notified when scores change after a poll. Explicitly deferred per UI/UX spec to avoid noise from 120s auto-polls.

7. **`LiveMatchScorecard` wraps all matches on the leaderboard page (QA-003)**: Even non-live matches go through the polling wrapper. The hook is well-guarded (no polling starts for non-live statuses), so there is no functional impact, but it creates unnecessary Supabase client instances and ref allocations for completed/upcoming matches.

---

## 8. How to Test/Verify the Feature

### Prerequisites
- A match in the `matches` table with `status = 'live'` and score columns populated.
- The Supabase backend running (or the hosted instance accessible).

### Manual Testing Checklist

**Polling lifecycle**:
1. Open the group page (`/group/[groupId]`) with a live match visible.
2. Open browser DevTools Network tab, filter by `rest` or `matches`.
3. Verify an initial fetch fires on page load.
4. Wait 2 minutes -- verify a second fetch fires automatically.
5. Click the refresh button on the scorecard -- verify an immediate fetch fires and the spinner animates.
6. After the manual refresh, verify the next auto-poll is 2 minutes later (interval reset).

**Tab visibility**:
7. With a live match on screen, switch to another browser tab.
8. Wait 3+ minutes, then switch back.
9. Verify an immediate fetch fires on return (Network tab).
10. Verify scores update to the latest values.

**Match completion**:
11. While viewing a live match, have an admin change the match status to `"completed"` in the database.
12. Wait for the next poll cycle (or click refresh).
13. Verify the scorecard transitions to completed mode -- the refresh button disappears, polling stops, and no further network requests are made for that match.

**Refresh button states**:
14. On a live match, verify the `RefreshCw` icon is visible (static, not spinning).
15. Click the refresh button -- verify the icon spins and the button becomes non-clickable.
16. After the fetch completes, verify the icon stops spinning and "Updated just now" appears below the scores.
17. On a completed or upcoming match, verify the refresh button is not rendered.

**Match leaderboard page**:
18. Navigate to `/group/[groupId]/match/[matchId]` for a live match.
19. Verify the full-size scorecard shows the refresh button in the status header row (right of the "Live" indicator).
20. Verify polling works identically to the group page.

**Regression checks**:
21. Verify the `NotificationBell` still receives real-time notifications (the `useRealtime` hook is unaffected).
22. Verify notification timestamps show relative time (now using the shared `formatTimeAgo`).
23. Navigate to various pages -- verify no console errors related to the polling hook.

---

## Related Documents

- [Requirements](./requirements.md)
- [Technical Architecture](./technical-architecture.md)
- [UI/UX Specification](./ui-ux-spec.md)
- [Code Review](./code-review.md)
- [QA Review](./qa-review.md)
- [Test Plan](./test-plan.md)
