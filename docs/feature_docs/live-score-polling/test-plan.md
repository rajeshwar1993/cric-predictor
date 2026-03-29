# Test Plan: Live Score Polling

**QA Engineer**: QA Agent
**Date**: 2026-03-29
**Requirements Doc Version**: Draft, 2026-03-29
**Architecture Doc Version**: Draft, 2026-03-29
**UI/UX Spec Version**: Draft, 2026-03-29

---

## 1. Test Scope

### In Scope

- `useMatchPolling` hook: all lifecycle, state, timing, and error behavior
- `MatchScorecard` component: new props (`onRefresh`, `isPolling`, `lastUpdated`), refresh button rendering, last-updated indicator, accessibility
- `LiveMatchCard` wrapper: integration on group page (compact mode)
- `LiveMatchScorecard` wrapper: integration on match leaderboard page (full mode)
- Page Visibility API: pause/resume behavior
- Concurrent-fetch guard: no duplicate in-flight requests
- Dead code removal: `LiveScoreTicker` and its Storybook stories deleted
- `NotificationBell` regression: `useRealtime` untouched, shared `formatTimeAgo` works
- `formatTimeAgo` utility: extracted to `@/lib/utils`, works for both consumers
- Cross-browser/responsive behavior of the refresh button
- Accessibility: keyboard navigation, aria attributes, disabled states

### Out of Scope

- Server-side edge functions (`match-live`, `match-cron`) -- not modified
- `useRealtime` hook internals -- not modified (FR-020)
- Supabase Realtime publication configuration -- not modified (FR-021)
- Batched polling for multiple matches (v2)
- "Last updated X seconds ago" live countdown (v2)
- Score-change highlighting or animations (v2)
- Configurable poll interval (v2)
- RLS policy changes (no new tables or policies introduced)

---

## 2. Test Cases

### 2.1 Happy Path — Polling Lifecycle (P0)

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|-----------------------------------------------|----------------------------------------------|
| TC-001 | Initial fetch on mount when match is live | 1. Render `useMatchPolling` with `status="live"` and a valid `matchId`. 2. Observe network/mock calls. | A single Supabase query `select(POLL_COLUMNS).eq("id", matchId).single()` fires immediately on mount. `isLoading` transitions to `true` then `false`. `match` updates with fetched data. `lastUpdated` is set to the current time. |
| TC-002 | Auto-polling fires every 120 seconds | 1. Render hook with `status="live"`. 2. Advance fake timers by 120,000ms. 3. Advance again by 120,000ms. | After each 120s tick, a new Supabase query fires. `isLoading` flashes `true`/`false` per cycle. `match` updates with fresh data each time. Over 10 minutes, exactly 5 auto-polls fire (in addition to the initial fetch). |
| TC-003 | Polling stops when `status` prop changes to "completed" | 1. Render hook with `status="live"`. 2. Re-render hook with `status="completed"`. 3. Advance timers by 240,000ms. | After re-render with `status="completed"`, the interval is cleared. No further fetch calls occur despite timer advancement. `match` retains last successfully fetched data. |
| TC-004 | Polling stops when polled data returns `status !== "live"` | 1. Render hook with `status="live"`. 2. Mock the next Supabase response to return `status: "completed"`. 3. Advance timers by 120,000ms to trigger a poll. 4. Advance timers by another 120,000ms. | The poll at step 3 updates `match` with completed data. The interval is cleared immediately. No poll fires at step 4. |
| TC-005 | Hook does not poll when `status` is "upcoming" | 1. Render hook with `status="upcoming"`. 2. Advance timers by 360,000ms. | No initial fetch fires. No interval is created. `match` equals `initialData` (or `null`). `isLoading` stays `false`. `lastUpdated` stays `null`. |
| TC-006 | Hook does not poll for "abandoned" status | 1. Render hook with `status="abandoned"`. 2. Advance timers by 240,000ms. | Same as TC-005: no fetch, no interval. |
| TC-007 | Hook does not poll for "no_result" status | 1. Render hook with `status="no_result"`. 2. Advance timers by 240,000ms. | Same as TC-005: no fetch, no interval. |
| TC-008 | Cleanup clears interval on unmount | 1. Render hook with `status="live"`. 2. Unmount the component. 3. Advance timers by 240,000ms. | Interval is cleared on unmount. No fetches fire after unmount. No "setState on unmounted component" warnings. |
| TC-009 | Server-rendered initial data displayed before first poll | 1. Render hook with `status="live"` and `initialData` containing known score values. 2. Before the initial fetch resolves, check `match`. | `match` equals `initialData` immediately. After the first fetch resolves, `match` updates to the fetched data. No flash of empty content. |
| TC-010 | Status transitions from "upcoming" to "live" via prop change | 1. Render hook with `status="upcoming"`. 2. Re-render with `status="live"`. | After re-render, an initial fetch fires. An interval is established. Polling begins. |

### 2.2 Happy Path — Page Visibility API (P0)

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|-----------------------------------------------|----------------------------------------------|
| TC-011 | Polling pauses when tab becomes hidden | 1. Render hook with `status="live"`. 2. Set `document.visibilityState = "hidden"` and dispatch `visibilitychange` event. 3. Advance timers by 360,000ms. | The interval is cleared when visibility becomes "hidden". No fetch calls fire during the hidden period despite timer advancement. |
| TC-012 | Force-fetch fires when tab becomes visible | 1. Render hook with `status="live"`. 2. Hide tab (dispatch visibility hidden). 3. Make tab visible again (dispatch visibility visible). | An immediate fetch fires when visibility becomes "visible". The interval is re-established. `isLoading` flashes `true`/`false`. `match` updates with fresh data. |
| TC-013 | Tab hidden for 30 minutes then returns | 1. Render hook with `status="live"`. 2. Hide tab. 3. Advance timers by 30 minutes. 4. Make tab visible. | No fetches during the 30-minute hidden period. On visible, a single immediate fetch fires. Interval resumes at 120s. Scores shown are from the fresh fetch, not stale 30-minute-old data. |
| TC-014 | Visibility change ignored when status is not "live" | 1. Render hook with `status="upcoming"`. 2. Hide tab, then show tab. | No fetch fires on visibility change. No interval created. The visibility handler's `statusRef.current !== "live"` guard fires. |
| TC-015 | Visibility listener cleaned up on unmount | 1. Render hook with `status="live"`. 2. Unmount. 3. Dispatch `visibilitychange` event. | No error thrown. The listener was removed during cleanup. No fetch attempts. |

### 2.3 Happy Path — Manual Refresh Button (P0)

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|-----------------------------------------------|----------------------------------------------|
| TC-016 | Refresh button visible only for live matches | 1. Render `MatchScorecard` with `status="live"` and `onRefresh` defined. 2. Render with `status="completed"`. 3. Render with `status="upcoming"`. | Button visible in step 1 only. Not rendered for completed or upcoming statuses. |
| TC-017 | Clicking refresh triggers immediate fetch | 1. Render `useMatchPolling` with `status="live"`. 2. Call `refresh()`. | A Supabase query fires immediately. `isLoading` transitions to `true` then `false`. `match` updates. `lastUpdated` updates. |
| TC-018 | Refresh resets the interval timer | 1. Render hook with `status="live"`. 2. Advance timers by 60,000ms (halfway through interval). 3. Call `refresh()`. 4. Advance timers by 119,999ms. 5. Advance timers by 1ms more (total 120s after refresh). | A fetch fires at step 3. No auto-poll at step 4 (only 119,999ms since refresh). Auto-poll fires at step 5 (exactly 120,000ms since refresh). Confirms interval was reset. |
| TC-019 | Refresh button disabled and spinning during loading | 1. Render `MatchScorecard` with `isPolling={true}` and `onRefresh` defined. 2. Attempt to click the button. | Button has `disabled={true}`. The `RefreshCw` icon has `animate-spin` class. Button has `opacity-50` and `cursor-not-allowed`. Click does not fire `onRefresh`. |
| TC-020 | Refresh button enabled and static when idle | 1. Render `MatchScorecard` with `isPolling={false}` and `onRefresh` defined. 2. Click the button. | Button is enabled. Icon does not have `animate-spin` class. Clicking fires `onRefresh` once. |
| TC-021 | Refresh button hidden when `onRefresh` is undefined | 1. Render `MatchScorecard` with `status="live"` but no `onRefresh` prop. | No refresh button element is rendered in the DOM. |
| TC-022 | RefreshCw icon used (not Loader2) | 1. Render `MatchScorecard` with `status="live"`, `onRefresh` defined, `isPolling={true}`. | The spinning icon is `RefreshCw` from lucide-react, not `Loader2`. The same icon is used in both idle and loading states (no icon swap). |

### 2.4 Happy Path — Integration on Group Page (P0)

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|-----------------------------------------------|----------------------------------------------|
| TC-023 | LiveMatchCard renders on group page for live match | 1. Navigate to `/group/[groupId]` where one match has `status="live"`. 2. Inspect the DOM. | A `LiveMatchCard` wraps the compact `MatchScorecard`. The scorecard shows server-rendered scores. A refresh button is visible. |
| TC-024 | LiveMatchCard passes polled data to MatchScorecard | 1. Open group page with a live match. 2. Wait 120s (or trigger manual refresh). 3. Verify scores update. | After poll, the scorecard displays the newly fetched score data. No page reload required. |
| TC-025 | Non-live matches on group page are unaffected | 1. Navigate to group page with upcoming and completed matches. | Upcoming and completed match cards render normally without refresh buttons, without polling, and without `LiveMatchCard` wrappers. |

### 2.5 Happy Path — Integration on Match Leaderboard Page (P0)

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|-----------------------------------------------|----------------------------------------------|
| TC-026 | LiveMatchScorecard renders on leaderboard page for live match | 1. Navigate to `/group/[groupId]/match/[matchId]` where match is live. 2. Inspect the DOM. | A `LiveMatchScorecard` wraps the full-size `MatchScorecard`. The scorecard shows server-rendered scores. A refresh button is visible in the status header next to "Live" text. |
| TC-027 | LiveMatchScorecard passes polled data to MatchScorecard | 1. Open match leaderboard page for a live match. 2. Wait 120s (or trigger manual refresh). | Scores update in-place. `lastUpdated` indicator updates. No page reload. |
| TC-028 | Match leaderboard page for completed match has no polling | 1. Navigate to match leaderboard page for a completed match. | `LiveMatchScorecard` renders but `useMatchPolling` does not poll. No refresh button visible. Scorecard shows completed state with `statusInfo` text (e.g., "CSK won by 44 runs"). |

### 2.6 Happy Path — Last Updated Indicator (P1)

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|-----------------------------------------------|----------------------------------------------|
| TC-029 | "Updated just now" shown after successful poll | 1. Render live scorecard. 2. Wait for initial poll to complete. | Text "Updated just now" appears below the score rows. |
| TC-030 | "Updated Xm ago" shown as time passes | 1. Render live scorecard. 2. Wait for initial poll. 3. Advance wall clock by 90 seconds without triggering a new poll. 4. Force re-render. | Text shows "Updated 1m ago" (since `Math.floor(90000/60000) = 1`). |
| TC-031 | Last updated hidden when status is not live | 1. Render scorecard with `status="completed"` and a non-null `lastUpdated`. | The last-updated text is not rendered (the `isLive && lastUpdated` condition fails). |
| TC-032 | Last updated hidden when `lastUpdated` is null | 1. Render scorecard with `status="live"` and `lastUpdated={null}`. | The last-updated text is not rendered. |

### 2.7 Happy Path — formatTimeAgo Utility (P1)

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|-----------------------------------------------|----------------------------------------------|
| TC-033 | formatTimeAgo with Date less than 60s ago | Call `formatTimeAgo(new Date())`. | Returns `"just now"`. |
| TC-034 | formatTimeAgo with Date 5 minutes ago | Call `formatTimeAgo(new Date(Date.now() - 300000))`. | Returns `"5m ago"`. |
| TC-035 | formatTimeAgo with Date 3 hours ago | Call `formatTimeAgo(new Date(Date.now() - 10800000))`. | Returns `"3h ago"`. |
| TC-036 | formatTimeAgo with Date 2 days ago | Call `formatTimeAgo(new Date(Date.now() - 172800000))`. | Returns `"2d ago"`. |
| TC-037 | formatTimeAgo accepts ISO string input | Call `formatTimeAgo("2026-03-29T10:00:00Z")` when current time is 2026-03-29T10:05:00Z. | Returns `"5m ago"`. |

---

### 2.8 Edge Cases (P0)

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|-----------------------------------------------|----------------------------------------------|
| TC-101 | Match completes mid-poll (EC-03) | 1. Render hook with `status="live"`. 2. Mock next poll response to have `status: "completed"`, `match_winner: "CSK"`. 3. Advance timers to trigger poll. | `match` updates to completed data. Polling stops immediately. On next render, `MatchScorecard` shows completed mode: `statusInfo` displayed, refresh button hidden, "BAT" indicator removed, last-updated indicator hidden. No further fetches. |
| TC-102 | User clicks refresh while auto-poll is in-flight (EC-02) | 1. Render hook with `status="live"`. 2. Advance timers to trigger auto-poll (mock a slow response, e.g., 5s). 3. Before auto-poll resolves, call `refresh()`. | The `refresh()` call is a no-op due to `isFetchingRef.current === true`. Only one Supabase query is in-flight. `isLoading` remains `true` until the original auto-poll completes. |
| TC-103 | Rapid refresh clicks (EC-08) | 1. Render `MatchScorecard` with `isPolling={false}` and `onRefresh`. 2. Click refresh. 3. Before fetch completes (button now disabled), attempt programmatic second `refresh()`. | First click triggers fetch and disables button. Second programmatic call hits the `isFetchingRef` guard and is dropped. Only one network request total. |
| TC-104 | Component unmounts during in-flight fetch (EC-05) | 1. Render hook with `status="live"`. 2. Trigger a fetch (initial or manual). 3. Unmount the component before the fetch resolves. 4. Let the fetch resolve. | `mountedRef.current` is set to `false` on unmount. After fetch resolves, the `if (!mountedRef.current) return;` guard prevents any `setState` calls. No React warnings. Interval is cleared. |
| TC-105 | Two live matches on group page (EC-06, double-header) | 1. Navigate to group page with two simultaneous live matches. 2. Wait 120s. | Two independent `LiveMatchCard` instances render. Each has its own `useMatchPolling` instance. Two independent Supabase queries fire per 120s cycle. Each scorecard shows its own refresh button and updates independently. |
| TC-106 | Network goes offline during poll (EC-04) | 1. Render hook with `status="live"`. 2. Mock Supabase to return a network error. 3. Advance timers to trigger poll. 4. Check state. 5. Restore network. 6. Advance timers for next poll. | At step 3: fetch fails silently. `console.warn` in dev mode. `match` retains previous data. `isLoading` resets to `false`. At step 6: next poll succeeds, `match` updates with fresh data. |
| TC-107 | Live match with no scores yet (EC-07, waiting for first ball) | 1. Render scorecard for a live match where `scoreA=null`, `scoreB=null`, `battingTeam` is set, `tossWinner` is set. | Scorecard shows "Waiting for the first ball..." state. Refresh button is still visible (match is live). Polling runs normally. Once scores appear in the DB, the next poll picks them up and the scorecard transitions to the active score display. |
| TC-108 | Invalid matchId (NFR-005) | 1. Render hook with `status="live"` and a `matchId` that does not exist. 2. Mock Supabase to return no rows (error or null data). | `match` is set to `null`. Polling stops. No unhandled exceptions. `isLoading` resets to `false`. |
| TC-109 | Tab hidden then match completes then tab visible | 1. Render hook with `status="live"`. 2. Hide tab (polling pauses). 3. Server-side, the match completes. 4. Make tab visible. | On visibility visible, a force-fetch fires. The response includes `status: "completed"`. Polling stops. Scorecard transitions to completed mode. No further fetches. |
| TC-110 | Browser does not support Page Visibility API (EC-10) | 1. Mock `document.visibilityState` as `undefined` (delete property from document). 2. Render hook with `status="live"`. 3. Advance timers by 360,000ms. | No visibility listener is attached. Polling runs continuously at 120s intervals regardless of tab state. Three auto-polls fire over 360s. No errors thrown. |

---

### 2.9 Error Scenarios (P0)

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|-----------------------------------------------|----------------------------------------------|
| TC-201 | Supabase query returns error on auto-poll | 1. Render hook with `status="live"`. First fetch succeeds. 2. Mock next fetch to return `{ data: null, error: { message: "timeout" } }`. 3. Advance timers to trigger poll. | `match` retains the first successful fetch data. `isLoading` resets to `false`. `lastUpdated` retains the timestamp from the first successful fetch. In dev mode, `console.warn` logs the error. Next poll proceeds normally. |
| TC-202 | Supabase query returns error on manual refresh | 1. Render hook with `status="live"`. 2. Mock next fetch to return an error. 3. Call `refresh()`. | Same as TC-201: error swallowed, previous data retained, `isLoading` resets. No error toast or UI disruption. Interval is reset per the refresh behavior. |
| TC-203 | Match deleted from database mid-poll | 1. Render hook with `status="live"`. 2. Mock Supabase to return `{ data: null, error: null }` (no rows). 3. Advance timers to trigger poll. | `match` set to `null`. Polling stops (`stopInterval()` called). No crash. |
| TC-204 | Consecutive failed polls (3 in a row) | 1. Render hook with `status="live"`. First fetch succeeds. 2. Mock three consecutive fetches to return errors. 3. Advance timers through three poll cycles. 4. Mock next fetch to succeed. 5. Advance timers for fourth poll. | First 3 polls fail silently. `match` retains initial successful data throughout. At step 5, the fourth poll succeeds and `match` updates. No exponential backoff or circuit breaker (per spec: simple retry). |
| TC-205 | Error during initial fetch on mount | 1. Render hook with `status="live"` and `initialData` provided. 2. Mock Supabase to return error on first call. | `match` retains `initialData`. `isLoading` resets to `false`. `lastUpdated` remains `null`. Polling interval still starts and retries at next 120s tick. |

---

### 2.10 Dead Code Removal & Regression (P0)

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|-----------------------------------------------|----------------------------------------------|
| TC-301 | LiveScoreTicker files deleted | 1. Verify `web-app/src/components/match/live-score-ticker.tsx` does not exist. 2. Verify `web-app/src/components/match/live-score-ticker.stories.tsx` does not exist. | Both files are absent from the filesystem. |
| TC-302 | No remaining imports of LiveScoreTicker | 1. Search the entire codebase for `LiveScoreTicker` or `live-score-ticker`. | Zero results. No file imports or references the deleted component. |
| TC-303 | useRealtime hook is untouched | 1. Verify `web-app/src/hooks/use-realtime.ts` has no diff compared to the base branch. | File is byte-for-byte identical. No modifications. |
| TC-304 | useRealtime tests still pass | 1. Run the test suite for `web-app/src/hooks/use-realtime.test.ts`. | All 4 existing tests pass without modification. |
| TC-305 | NotificationBell still works with shared formatTimeAgo | 1. Verify `NotificationBell` imports `formatTimeAgo` from `@/lib/utils` (not a local definition). 2. Open any page with the `NotificationBell` visible. 3. Trigger a notification. | Notification timestamps display correctly (e.g., "just now", "5m ago"). No rendering errors. `useRealtime` subscription for notifications still fires and triggers re-fetch. |
| TC-306 | NotificationBell Storybook stories still render | 1. Run Storybook. 2. Navigate to `NotificationBell` stories. | Stories render without errors. Time-ago formatting works correctly. |
| TC-307 | useRealtime Storybook mock still functional | 1. Verify `web-app/src/__mocks__/handlers/use-realtime.ts` is unchanged. 2. Run Storybook stories that depend on it. | No errors. Mock provides correct no-op behavior. |
| TC-308 | Supabase Realtime migration file untouched | 1. Verify `supabase/migrations/005_realtime.sql` has no diff. | File is unchanged. `matches` table remains in the `supabase_realtime` publication. |

---

### 2.11 Performance (P1)

| ID | Scenario | Concern | Validation |
|--------|----------------------------------------------|-----------------------------------------------|----------------------------------------------|
| TC-401 | Selective column fetch excludes `live_scorecard_json` | Large (~50KB) JSON blob transferred unnecessarily on every poll. | Inspect the Supabase query: `.select(POLL_COLUMNS)` must include only `id, current_score_a, current_score_b, current_overs_a, current_overs_b, current_batting_team, toss_winner, match_winner, status`. `live_scorecard_json` must NOT be in the select clause. Network response should be ~200 bytes, not ~50KB. |
| TC-402 | Exactly one query per poll cycle per match | Duplicate or unnecessary queries waste bandwidth. | In network tab (or mock call count), verify exactly 1 Supabase REST call per 120s per live match on-screen. Manual refresh adds exactly 1 additional call. |
| TC-403 | No unnecessary re-renders of MatchScorecard | Re-renders without data changes waste CPU. | Verify `refresh` callback is stable across renders (`useCallback`). Verify `onRefresh` prop does not change reference between renders (would cause MatchScorecard to re-render). Use React DevTools Profiler or render count tracking to confirm MatchScorecard only re-renders when `match`, `isLoading`, or `lastUpdated` actually change. |
| TC-404 | Supabase client is memoized (created once) | Re-creating the Supabase client on every render is wasteful. | Verify `useMemo(() => createClient(), [])` is used. `createClient` is called exactly once per component lifecycle, not on every render. |
| TC-405 | Refs used for non-render state | Using `useState` for `isFetchingRef`, `intervalIdRef`, `mountedRef` would cause extra renders. | Verify these are `useRef`, not `useState`. Toggling `isFetchingRef` does not trigger a component re-render. |
| TC-406 | Polling interval does not drift | `setTimeout` chaining accumulates fetch-time delays. | Over 10 minutes with `status="live"`, verify exactly 5 auto-polls fire at 120s intervals. Use fake timers: `advanceTimersByTime(600_000)` should trigger exactly 5 polls (plus the initial mount fetch = 6 total). |
| TC-407 | No new npm dependencies added | Bundle size increase from new libraries. | Verify `package.json` has no new entries in `dependencies` or `devDependencies` compared to the base branch. `RefreshCw` is already available via the existing `lucide-react` dependency. |

---

### 2.12 Accessibility (P1)

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|-----------------------------------------------|----------------------------------------------|
| TC-501 | Refresh button uses native `<button>` element | 1. Inspect the refresh button in the DOM. | The element is a `<button>`, not a `<div>`, `<span>`, or `<a>`. This ensures inherent keyboard focusability and activation via Enter/Space. |
| TC-502 | aria-label is "Refresh scores" | 1. Inspect the refresh button's attributes. | `aria-label="Refresh scores"` is present on the `<button>` element. |
| TC-503 | aria-busy="true" when polling | 1. Render refresh button with `isPolling={true}`. 2. Inspect attributes. | `aria-busy="true"` is present. Screen readers can announce the loading state. |
| TC-504 | aria-busy absent when idle | 1. Render refresh button with `isPolling={false}`. 2. Inspect attributes. | `aria-busy` attribute is not present (set to `undefined`, not `"false"`). |
| TC-505 | Button disabled during loading | 1. Render with `isPolling={true}`. 2. Check `disabled` attribute. 3. Try to click. | `disabled={true}` on the button element. Click event does not fire. Button is removed from tab order while disabled (native behavior). |
| TC-506 | Keyboard navigation (Tab + Enter) | 1. Navigate to page with live scorecard. 2. Press Tab repeatedly to reach the refresh button. 3. Press Enter. | The button is focusable via Tab. A visible focus ring appears (`focus-visible:outline`). Pressing Enter triggers the refresh (same as click). |
| TC-507 | Keyboard navigation (Space) | 1. Focus the refresh button via Tab. 2. Press Space. | Pressing Space triggers the refresh (native `<button>` behavior). |
| TC-508 | Focus ring visible on keyboard focus | 1. Tab to the refresh button. | A focus ring appears using `var(--border-focus)` color, 2px width, 2px offset. The ring is NOT visible on mouse click (only on `focus-visible`). |

---

### 2.13 Responsive & Visual Behavior (P1)

| ID | Scenario | Steps | Expected Result |
|--------|----------------------------------------------|-----------------------------------------------|----------------------------------------------|
| TC-601 | Compact mode: refresh button size and position | 1. Render `MatchScorecard` with `compact={true}`, `status="live"`, `onRefresh` defined. 2. Inspect button. | Button hit target is `h-5 w-5` (20px). Icon is `h-3 w-3` (12px). Button is absolutely positioned in the top-right corner of the scorecard container. The scorecard container has `relative` class. |
| TC-602 | Full mode: refresh button size and position | 1. Render `MatchScorecard` with `compact={false}` (default), `status="live"`, `onRefresh` defined. 2. Inspect button. | Button hit target is `h-6 w-6` (24px). Icon is `h-3.5 w-3.5` (14px). Button sits in the status header row, right side, with `justify-between` layout: `[dot + Live] ... [refresh icon]`. |
| TC-603 | Compact mode: last-updated text size | 1. Render compact scorecard with `lastUpdated` set. | Text has `text-[10px]` class and `mt-1.5` spacing. |
| TC-604 | Full mode: last-updated text size | 1. Render full scorecard with `lastUpdated` set. | Text has `text-xs` class and `mt-2` spacing. |
| TC-605 | Mobile viewport (< 640px) with compact scorecard | 1. Set viewport to 375px width. 2. Render compact scorecard for live match with refresh button. | Refresh button fits within the card without overlapping score text. Touch target is adequate (button padding + card `p-5` padding provide sufficient clearance). Last-updated text fits on one line. |
| TC-606 | Mobile viewport with full scorecard | 1. Set viewport to 375px width. 2. Render full scorecard for live match. | Status header row `[dot + Live ... refresh]` has sufficient space. No wrapping or overflow. Scores and refresh button are clearly visible. |
| TC-607 | Refresh button in waiting state (live, no scores) | 1. Render full scorecard with `status="live"`, `tossWinner="CSK"`, no scores. 2. Check for refresh button. | Refresh button appears next to the toss info text in the status header (same `justify-between` pattern). The "Waiting for the first ball..." message displays below. |
| TC-608 | Refresh icon hover state | 1. Hover over the idle refresh button. | Icon color transitions from `var(--text-muted)` to `var(--text-secondary)` with `transition-colors`. Cursor changes to pointer. |
| TC-609 | Refresh icon press feedback | 1. Click and hold the refresh button. | Button scales down briefly via `active:scale-95`. |
| TC-610 | No skeleton/shimmer during auto-poll | 1. Render live scorecard. 2. Trigger auto-poll. 3. Observe the scorecard during fetch. | Existing score data remains fully visible during the fetch. No loading skeleton, no shimmer, no overlay spinner. Only the refresh icon spins. |
| TC-611 | Scores update in-place (no transition animation) | 1. Render live scorecard showing "142/6". 2. Poll returns "155/7". | Score text updates immediately from "142/6" to "155/7". No fade, slide, or highlight animation on the score change (per spec: v1 has no score-change highlighting). |

---

## 3. Regression Risks

| Area Affected | Risk Level | Reason | Mitigation |
|---|---|---|---|
| NotificationBell real-time updates | **High** | Shares `useRealtime` hook with the deleted `LiveScoreTicker`. If `useRealtime` is accidentally modified, notifications break. | TC-303, TC-304, TC-305: verify `useRealtime.ts` is byte-identical, tests pass, and NotificationBell functions correctly. |
| NotificationBell `formatTimeAgo` | **Medium** | `formatTimeAgo` is extracted from local definition in `notification-bell.tsx` to shared `@/lib/utils`. Import path change or behavioral difference (e.g., capitalization of "just now" vs "Just now") could break notification timestamps. | TC-305, TC-033-037: verify NotificationBell imports from new location and timestamps render correctly. Review the capitalization difference (shared version uses lowercase "just now"). |
| MatchScorecard rendering for non-live matches | **Medium** | `MatchScorecard` gains `"use client"` directive and new optional props. If props default incorrectly or the `"use client"` directive causes hydration issues, completed/upcoming scorecards could break. | TC-025, TC-028: verify non-live scorecard rendering is unchanged. New props default to `undefined`/`false`/`null` so no refresh UI appears. |
| Group page layout | **Low** | `<MatchScorecard compact>` is replaced with `<LiveMatchCard>` wrapper. If the wrapper introduces extra DOM nesting or styling differences, the card layout could shift. | TC-023: visual inspection of group page with live match. Confirm layout is pixel-identical except for the new refresh button. |
| Match leaderboard page layout | **Low** | `<MatchScorecard>` replaced with `<LiveMatchScorecard>` wrapper. Same risk as above. | TC-026: visual inspection of leaderboard page. |
| Storybook | **Low** | `live-score-ticker.stories.tsx` is deleted. If Storybook has an index or auto-discovery that errors on missing files, it could affect the Storybook build. | TC-306: run Storybook and verify no errors. Consider adding stories for the new `LiveMatchCard` and `LiveMatchScorecard` components if the team's convention requires it. |
| Existing match card link/CTA behavior | **Low** | The group page wraps the scorecard in a `LiveMatchCard` client component. If the parent match card's `<Link>` or click behavior conflicts with the new `<button>` inside it, navigation or click propagation could break. | Manual test: on the group page, click the match card area (not the refresh button). Verify navigation to the match leaderboard page still works. Click the refresh button and verify the card's `<Link>` does NOT also fire (event propagation). |

---

## 4. Data Integrity Checks

- [N/A] RLS policies verified for new tables — **No new tables introduced.** The polling query reads from the existing `matches` table using the Supabase anon key. Existing RLS policies (public read or authenticated read) apply. Verify the polling query succeeds with the anon key by testing in a logged-out state if RLS requires authentication.
- [N/A] Foreign key constraints in place — No schema changes.
- [N/A] Cascade delete behavior correct — No schema changes.
- [N/A] No orphaned records possible — No writes introduced. The polling mechanism is read-only.
- [ ] Verify the polling query uses the browser Supabase client (anon key), not the server client. The server client cannot be used in client components.
- [ ] Verify the polling query respects RLS by testing with a valid authenticated session and confirming data returns.

---

## 5. Cross-Browser / Responsive

### Browser Compatibility

| Browser | Test Focus | Priority |
|---|---|---|
| Chrome (latest) | Full feature test — primary browser | P0 |
| Safari (latest, macOS + iOS) | Page Visibility API behavior (Safari has nuances with `visibilitychange` vs `pagehide`), `animate-spin` rendering | P0 |
| Firefox (latest) | Full feature test | P1 |
| Edge (latest) | Full feature test (Chromium-based, expect Chrome parity) | P2 |
| Safari iOS (in-app browser / PWA) | Visibility API may fire differently when switching apps vs tabs. Test polling pause/resume when switching away from Safari app. | P1 |
| Chrome Android | Same as Safari iOS — test app-switching behavior | P1 |

### Responsive Breakpoints

| Viewport | Test Focus |
|---|---|
| 375px (iPhone SE) | Compact scorecard with refresh button. Ensure no overlap with score text. |
| 390px (iPhone 14) | Same as above. |
| 768px (iPad) | Full scorecard on leaderboard page. Verify status header layout. |
| 1024px (Tablet landscape) | Both pages. No layout issues expected. |
| 1440px (Desktop) | Both pages within max-width container. Verify spacing. |

---

## 6. Test Priority Summary

### P0 — Must pass before merge (blocking)

- **TC-001 to TC-010**: Polling lifecycle (core functionality)
- **TC-011 to TC-015**: Page Visibility API (core functionality)
- **TC-016 to TC-022**: Manual refresh button (core functionality)
- **TC-023 to TC-028**: Integration on both pages
- **TC-101 to TC-110**: Edge cases
- **TC-201 to TC-205**: Error scenarios
- **TC-301 to TC-308**: Dead code removal and regression

### P1 — Should pass before merge (important)

- **TC-029 to TC-037**: Last updated indicator and formatTimeAgo utility
- **TC-401 to TC-407**: Performance validations
- **TC-501 to TC-508**: Accessibility
- **TC-601 to TC-611**: Responsive and visual behavior

### P2 — Nice to have

- Cross-browser testing on Edge
- Storybook stories for new wrapper components (if team convention requires)

---

## 7. Unit Test Implementation Notes

The `useMatchPolling` hook should have automated unit tests in `web-app/src/hooks/use-match-polling.test.ts`. Key technical setup:

### Mocking Strategy

```
- Mock `@/lib/supabase/client` -> `createClient()` returns a mock Supabase client
- Mock Supabase client chain: `.from("matches").select(POLL_COLUMNS).eq("id", matchId).single()`
  returns configurable `{ data, error }` responses
- Use `vi.useFakeTimers()` to control `setInterval` / `setTimeout`
- Mock `document.visibilityState` (writable property) and dispatch `visibilitychange` events
- Use `@testing-library/react` -> `renderHook` + `act` for hook lifecycle testing
```

### Recommended Automated Test Coverage

| Category | Count | TC References |
|---|---|---|
| Initial state | 4 tests | TC-005, TC-006, TC-007, TC-009 |
| Polling lifecycle | 6 tests | TC-001, TC-002, TC-003, TC-004, TC-008, TC-010 |
| Manual refresh | 3 tests | TC-017, TC-018, TC-102/TC-103 |
| Page Visibility | 4 tests | TC-011, TC-012, TC-013, TC-110 |
| Error handling | 4 tests | TC-106, TC-108, TC-201, TC-205 |
| Cleanup | 2 tests | TC-008, TC-104 |
| **Total** | **23 tests** | |

### Manual Test Coverage

The following test cases are best validated manually or with integration/E2E tests (not unit tests):

- TC-023 to TC-028 (page integration — requires full Next.js rendering)
- TC-301 to TC-308 (regression — filesystem and Storybook checks)
- TC-501 to TC-508 (accessibility — requires DOM inspection or axe-core)
- TC-601 to TC-611 (responsive/visual — requires browser rendering)
- Cross-browser matrix (Section 5)
