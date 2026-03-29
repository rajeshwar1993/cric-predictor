# Feature: Live Score Polling (Replace Realtime Subscriptions)
**Author**: PM Agent
**Status**: Draft
**Date**: 2026-03-29

## 1. Overview

During live IPL matches, users see a scorecard component on both the squad (group) page and the match leaderboard page. These scorecards currently receive updates via Supabase Realtime database subscriptions through the `LiveScoreTicker` component. This feature replaces that approach with a smart polling mechanism that fetches match data every 120 seconds, pauses when the browser tab is inactive, and gives users a manual refresh button with clear loading feedback. The goal is to reduce Supabase Realtime connection overhead for match scores (which are updated by a backend poller anyway, not by user writes) while giving users more predictable, controllable score updates.

## 2. User Stories

- **US-01**: As a user watching a live match, I want to see updated scores every 2 minutes so that I can follow the match progress without manually refreshing the page.
- **US-02**: As a user who switches away from the Bragg tab, I want polling to pause automatically so that my browser doesn't waste resources on background fetches.
- **US-03**: As a user who returns to the Bragg tab after being away, I want to immediately see fresh scores so that I'm not looking at stale data.
- **US-04**: As a user, I want a refresh button on the scorecard so that I can manually pull the latest scores whenever I want, without waiting for the next auto-poll cycle.
- **US-05**: As a user, I want clear visual feedback (spinning icon) when scores are being fetched so that I know my refresh request is being processed.
- **US-06**: As a user, I want polling to automatically stop once the match is completed so that the app doesn't keep making unnecessary requests.

## 3. Functional Requirements

### 3.1 New `useMatchPolling` Hook — P0

- **FR-001**: Create a new client-side hook `useMatchPolling(matchId: number, status: MatchStatus)` in `web-app/src/hooks/use-match-polling.ts`.
  - Acceptance Criteria: Hook exists, is exported, and accepts `matchId` (number) and `status` (MatchStatus) parameters.

- **FR-002**: The hook must return an object with the shape `{ match: Match | null, isLoading: boolean, lastUpdated: Date | null, refresh: () => void }`.
  - Acceptance Criteria: All four fields are present in the return type. `match` contains the full match row from Supabase. `isLoading` is true during any active fetch (auto or manual). `lastUpdated` is the timestamp of the last successful fetch. `refresh` triggers an immediate manual fetch.

- **FR-003**: The hook must perform an initial fetch of match data on mount when `status === "live"`.
  - Acceptance Criteria: On mount, if status is "live", a Supabase query is fired for the given `matchId`. The returned `match` state updates with the result.

- **FR-004**: The hook must set up a polling interval of 120 seconds (2 minutes) that re-fetches match data from Supabase, but ONLY when `status === "live"`.
  - Acceptance Criteria: Using `setInterval` (or equivalent), the hook fetches match data every 120,000ms. The interval is NOT created if status is not "live". The interval is cleared on unmount.

- **FR-005**: The hook must stop polling when `status` transitions to `"completed"`, `"abandoned"`, or `"no_result"` (i.e., any non-"live" status).
  - Acceptance Criteria: If the `status` prop changes from "live" to any other value, the polling interval is cleared and no further auto-fetches occur. If a poll response itself returns a match with `status !== "live"`, the hook must also stop polling.

- **FR-006**: The hook must use the Page Visibility API (`document.visibilitychange`) to pause polling when the tab/window becomes hidden and resume when it becomes visible again.
  - Acceptance Criteria: When `document.visibilityState === "hidden"`, the interval is cleared. When `document.visibilityState === "visible"`, an immediate fetch is performed and the interval is re-established.

- **FR-007**: The `refresh()` function returned by the hook must trigger an immediate fetch, resetting the interval timer so the next auto-poll is 120 seconds after the manual refresh.
  - Acceptance Criteria: Calling `refresh()` fetches data immediately. The polling interval resets (i.e., the next auto-fetch is a full 120s later, not at whatever time remained on the old interval).

- **FR-008**: The hook must prevent concurrent fetches. If a fetch is already in-flight (auto or manual), a new fetch request must be dropped (not queued).
  - Acceptance Criteria: Rapid calls to `refresh()` or an auto-poll firing while a manual fetch is in-flight do not result in multiple simultaneous Supabase queries for the same match.

- **FR-009**: The hook must use the Supabase browser client (`createClient()` from `@/lib/supabase/client`) to fetch match data, querying the `matches` table by `id`.
  - Acceptance Criteria: The query is `supabase.from("matches").select("*").eq("id", matchId).single()`. No server-side DAL functions are called from the client.

### 3.2 Refresh Button on MatchScorecard — P0

- **FR-010**: Add a refresh icon button to the `MatchScorecard` component (`web-app/src/components/match/match-scorecard.tsx`) that is visible only when `status === "live"`.
  - Acceptance Criteria: A clickable icon button appears in the scorecard's status header area when the match is live. It is not rendered for completed, upcoming, or other statuses.

- **FR-011**: The refresh button must accept `onRefresh: () => void` and `isPolling: boolean` props.
  - Acceptance Criteria: `MatchScorecardProps` interface is extended with optional `onRefresh?: () => void` and `isPolling?: boolean`. Defaults: `onRefresh` = undefined (button hidden if absent), `isPolling` = false.

- **FR-012**: When `isPolling` is true, the refresh icon must rotate continuously (CSS animation) and the button must be disabled (non-clickable, reduced opacity).
  - Acceptance Criteria: The icon has a `animate-spin` (or equivalent rotation) class applied when `isPolling === true`. The button element has `disabled={true}` and reduced visual prominence (e.g., `opacity-50 cursor-not-allowed`).

- **FR-013**: When `isPolling` is false, the button must be enabled and clicking it calls `onRefresh()`.
  - Acceptance Criteria: The button is clickable, calls `onRefresh` on click, and shows a static (non-spinning) refresh icon.

- **FR-014**: Use the `RefreshCw` icon from `lucide-react` for the refresh button.
  - Acceptance Criteria: The icon is imported from `lucide-react` and sized appropriately for both `compact` and full scorecard modes.

- **FR-015**: The refresh button must have an accessible `aria-label` of "Refresh scores".
  - Acceptance Criteria: The `<button>` element has `aria-label="Refresh scores"`.

### 3.3 Integration — Wiring Polling to Scorecard Components — P0

- **FR-016**: On the squad/group page (`web-app/src/app/group/[groupId]/page.tsx`), for each live match card, create a client wrapper component that uses `useMatchPolling` and passes the polled data + refresh controls to `MatchScorecard`.
  - Acceptance Criteria: A new client component (e.g., `LiveMatchCard`) wraps the live match scorecard section. It calls `useMatchPolling(matchId, status)` and passes `match` data, `onRefresh={refresh}`, and `isPolling={isLoading}` to `MatchScorecard`. The server-fetched data is used as initial/fallback values.

- **FR-017**: On the match leaderboard page (`web-app/src/app/group/[groupId]/match/[matchId]/page.tsx`), create a client wrapper component that uses `useMatchPolling` and passes the polled data + refresh controls to `MatchScorecard`.
  - Acceptance Criteria: Same pattern as FR-016. A client wrapper component handles polling for the single match displayed, passing live data and refresh controls to `MatchScorecard`.

- **FR-018**: Both wrapper components must accept the server-rendered match data as initial values and only override with polled data once the first successful client-side fetch completes.
  - Acceptance Criteria: On first render (SSR/RSC), the server-fetched data is displayed. After the first successful poll, the client data takes over. There is no flash of empty/stale content.

### 3.4 Remove LiveScoreTicker Realtime Usage — P0

- **FR-019**: Remove the `useRealtime` call from the `LiveScoreTicker` component (`web-app/src/components/match/live-score-ticker.tsx`).
  - Acceptance Criteria: The `LiveScoreTicker` component no longer imports or calls `useRealtime`. The `live-score-ticker.tsx` file is either deleted (if no longer used anywhere) or refactored to be a pure presentational component.

  **PM Decision**: The `LiveScoreTicker` component is currently not imported by any page — only Storybook stories reference it. The `MatchScorecard` component is the actual scorecard used in the app. Decision: **Delete `LiveScoreTicker` and its Storybook story file entirely.** It's dead code that was superseded by `MatchScorecard`. This reduces confusion. The "LIVE" badge + score display is already handled by `MatchScorecard`.

- **FR-020**: The `useRealtime` hook itself (`web-app/src/hooks/use-realtime.ts`) must NOT be modified or removed. It is still used by `NotificationBell` for real-time notification updates.
  - Acceptance Criteria: `use-realtime.ts` is unchanged. `NotificationBell` continues to function identically. No changes to `notification-bell.tsx`.

- **FR-021**: The Supabase Realtime publication for the `matches` table (in `supabase/migrations/005_realtime.sql`) should remain. Other features or future needs may use it.
  - Acceptance Criteria: The migration file is not modified. `matches` stays in the `supabase_realtime` publication.

### 3.5 Polling Lifecycle Based on Match Status — P0

- **FR-022**: If a user opens the page when the match is `"upcoming"` and the match transitions to `"live"` (e.g., an admin changes status), polling must NOT auto-start until the page is refreshed or the component re-mounts with `status="live"`.
  - Acceptance Criteria: The hook does not poll when status is "upcoming". If status changes to "live" via a prop update (e.g., from a server re-render or parent state change), polling starts. But the hook does NOT independently detect status changes in the DB — it reacts to the `status` prop it receives.

  **Assumption**: The squad page and match page are server-rendered. A full page navigation or `router.refresh()` will re-fetch server data and pass an updated `status` prop. We are NOT adding a secondary mechanism to detect the upcoming-to-live transition on the client. This is acceptable because the 120s polling is only meant for score updates during live matches, not for status transitions. **Flagged for review.**

- **FR-023**: When the polled data returns `status === "completed"` (i.e., the match ended while the user was watching), the hook must stop polling and the UI must reflect the final state.
  - Acceptance Criteria: The polling interval is cleared. The `MatchScorecard` renders in completed mode (showing winner info if available). The refresh button disappears (since `status` is no longer "live"). No further network requests are made.

## 4. Non-Functional Requirements

### Performance — P0

- **NFR-001**: Each poll must result in exactly ONE Supabase query: `select * from matches where id = $matchId`.
  - Acceptance Criteria: Network tab shows a single REST call per poll cycle per live match on-screen.

- **NFR-002**: If a user has multiple live matches visible on the squad page (unlikely but possible during double-headers), each match must poll independently. Total queries = N matches x 1 query per 120s.
  - Acceptance Criteria: Two live matches on-screen result in two independent polling cycles, not interleaved or batched.

- **NFR-003**: The polling interval must not drift. Use `setInterval` with interval reset on manual refresh, not chained `setTimeout` (which would accumulate fetch-time delays).
  - Acceptance Criteria: Over 10 minutes, the number of auto-polls is consistently 5 (at 120s intervals), not fewer due to drift.

  **PM Decision**: Using `setInterval` with a clear-and-reset pattern on manual refresh. `setTimeout` chaining would be slightly more resilient to long-running fetches but introduces drift. Given our fetch is a single lightweight query (<100ms typically), `setInterval` is the right tradeoff. The concurrent-fetch guard (FR-008) handles the edge case where a fetch takes longer than expected.

### Reliability — P0

- **NFR-004**: Network errors during polling must be silently swallowed (logged to console in development). The next poll cycle proceeds normally. The UI shows the last successfully fetched data.
  - Acceptance Criteria: If a poll fails, `isLoading` resets to false, the previous `match` data remains displayed, and the next 120s poll fires as scheduled. No error toasts or UI disruption.

- **NFR-005**: If `matchId` is invalid or the match is deleted, the hook must not crash. It should return `match: null` and stop polling.
  - Acceptance Criteria: A Supabase query returning no rows (or an error) results in `match: null`. No unhandled exceptions.

### Accessibility — P1

- **NFR-006**: The refresh button must be keyboard-accessible (focusable, activatable via Enter/Space).
  - Acceptance Criteria: Standard `<button>` element is used (inherently keyboard-accessible). No `div` or `span` with click handlers.

- **NFR-007**: Screen readers must announce the loading state of the refresh button.
  - Acceptance Criteria: When `isPolling` is true, the button includes `aria-busy="true"` in addition to `disabled`.

### Bundle Size — P1

- **NFR-008**: The `useMatchPolling` hook must not introduce any new dependencies. It should use only React hooks, the Supabase client, and browser APIs.
  - Acceptance Criteria: No new packages are added to `package.json`.

## 5. Edge Cases & Error States

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| EC-01 | User opens the squad page with a live match, then puts the tab in the background for 30 minutes, then returns | Polling pauses when tab goes to background. On return, an immediate fetch fires and polling resumes at 120s intervals. Scores shown are from the fresh fetch. |
| EC-02 | User clicks refresh while an auto-poll is in-flight | The manual refresh is dropped (no duplicate request). The in-flight auto-poll completes normally. `isLoading` remains true until the in-flight request finishes. |
| EC-03 | Match transitions from live to completed while user is on the page | The next poll returns `status: "completed"`. The hook stops polling. The refresh button disappears. The scorecard shows final scores. |
| EC-04 | Network goes offline during a poll | The fetch fails silently. Previous data remains displayed. The next interval-based poll retries automatically. When connectivity returns, the next poll succeeds. |
| EC-05 | User navigates away from the page while a poll is in-flight | The hook's cleanup function (useEffect return) clears the interval and aborts any in-flight fetch if possible. No state updates on an unmounted component. |
| EC-06 | Two live matches on the squad page (double-header day) | Each match card has its own `useMatchPolling` instance. They poll independently at 120s intervals. Both pause/resume together on visibility change. |
| EC-07 | Match is live but no scores yet (waiting for first ball) | Polling runs normally. `MatchScorecard` displays its existing "Waiting for the first ball..." state. Once scores appear in the DB, the next poll picks them up. |
| EC-08 | User rapidly clicks the refresh button | First click triggers a fetch and sets `isLoading=true`. Subsequent clicks are blocked because the button is disabled during loading. |
| EC-09 | `status` prop is "upcoming" | Hook does not start polling. No interval is created. No initial fetch is made. Refresh button is not shown. |
| EC-10 | Browser does not support Page Visibility API (very old browsers) | The hook should gracefully degrade: if `document.visibilityState` is undefined, skip the visibility listener and poll continuously. |

## 6. Out of Scope (v2+)

- **Batched polling**: Fetching multiple live matches in a single query. For v1, each match polls independently. Optimization can come later if needed.
- **WebSocket fallback**: We are explicitly moving away from Realtime for match scores. No WebSocket or Server-Sent Events alternative is planned.
- **Optimistic/predictive score updates**: No client-side score interpolation or prediction between polls.
- **Configurable poll interval**: The 120s interval is hardcoded. A user-configurable or admin-configurable interval is deferred.
- **"Last updated X seconds ago" UI**: While the hook tracks `lastUpdated`, displaying a human-readable "last updated" timestamp in the scorecard is deferred to v2. — **P2**
- **Notification of score changes**: No toast/badge when scores change between polls. Users see the update on the next render.
- **Removing `matches` from Supabase Realtime publication**: Even though we're not using Realtime for match scores on the client, other systems (edge functions, admin tools) may rely on it. Leave it.
- **Polling for `status` transitions (upcoming -> live)**: The polling hook only activates when `status` is already "live". Detecting the upcoming-to-live transition requires a page refresh or a separate mechanism (deferred).

## 7. Open Questions

- [ ] **Double-header frequency**: How often do two IPL matches happen on the same day? If frequent, should we batch-poll in v2? (PM assessment: IPL 2026 has ~10 double-headers in 74 matches. Two independent polls per 120s is negligible load. Defer batching.)
- [ ] **Poll interval tuning**: 120 seconds is the starting point. After launch, should we collect analytics on how often users manually refresh to determine if the interval should be shorter? (PM recommendation: Yes, track `refresh` button clicks via PostHog to inform v2 tuning.)
- [ ] **Stale-while-revalidate UX**: Should we show a subtle "Updating..." indicator during auto-polls (not just manual refreshes)? Current spec: `isLoading` is true for both auto and manual, but the refresh button is the only visible loading indicator. The scorecard content itself does not show a loading state during polls — it shows the last known data. (PM decision: This is correct for v1. A full-scorecard loading shimmer during auto-polls would be distracting.)

## 8. Dependencies

- **Existing code — no changes required**:
  - `web-app/src/hooks/use-realtime.ts` — kept as-is for NotificationBell
  - `web-app/src/components/layout/notification-bell.tsx` — no changes
  - `web-app/src/lib/supabase/client.ts` — used by the new hook for browser-side queries
  - `web-app/src/types/database.ts` — `MatchStatus` type and `Match` row type used by the hook
  - `supabase/migrations/005_realtime.sql` — left as-is

- **Existing code — modified**:
  - `web-app/src/components/match/match-scorecard.tsx` — add refresh button and new props
  - `web-app/src/app/group/[groupId]/page.tsx` — extract live match section into a client wrapper component
  - `web-app/src/app/group/[groupId]/match/[matchId]/page.tsx` — extract scorecard into a client wrapper component

- **Existing code — deleted**:
  - `web-app/src/components/match/live-score-ticker.tsx` — dead code, replaced by MatchScorecard
  - `web-app/src/components/match/live-score-ticker.stories.tsx` — associated Storybook stories

- **New code**:
  - `web-app/src/hooks/use-match-polling.ts` — new polling hook
  - `web-app/src/hooks/use-match-polling.test.ts` — unit tests for the hook
  - Client wrapper components (either new files or co-located in the page files — PSE decision)

## 9. Assumptions

> All assumptions are flagged for review. Numbered for easy reference during Gate 1 approval.

1. **A-01**: The 120-second polling interval is acceptable for the user experience. Matches update in the backend DB via a separate server-side poller (edge function) on a similar cadence, so client-side polling faster than the server-side update rate provides no benefit.
2. **A-02**: The `matches` table is queried directly from the browser client using the Supabase anon key. Row-Level Security (RLS) on `matches` allows public read access (or read for authenticated users). This is consistent with the current `useRealtime` setup which also operates on the client.
3. **A-03**: The `LiveScoreTicker` component is dead code. It is not imported by any page component — only by its own Storybook story. Deleting it is safe.
4. **A-04**: The Page Visibility API is supported by all target browsers (Chrome, Safari, Firefox, Edge — all modern versions). The graceful degradation path (EC-10) handles the unlikely edge case.
5. **A-05**: The compact variant of `MatchScorecard` (used on the squad page) has enough horizontal space to accommodate a small refresh icon button without layout issues on mobile.
6. **A-06**: No AbortController is strictly required for the Supabase fetch — the query is lightweight and short-lived. However, using one is recommended for clean unmount behavior (EC-05). PSE to decide on implementation.
