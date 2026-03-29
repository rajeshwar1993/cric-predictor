# Codebase Analysis: Live Score / Realtime Infrastructure

**Date**: 2026-03-29
**Analyst**: PSE Agent
**Scope**: All code paths related to Supabase Realtime subscriptions, live score display, and match data fetching -- to guide the replacement of Realtime with client-side polling.

---

## Table of Contents

1. [useRealtime Hook](#1-userealtime-hook)
2. [LiveScoreTicker Component](#2-livescoreticker-component)
3. [MatchScorecard Component](#3-matchscorecard-component)
4. [Where LiveScoreTicker Is Used](#4-where-livescoreticker-is-used)
5. [Where MatchScorecard Is Used](#5-where-matchscorecard-is-used)
6. [NotificationBell -- DO NOT BREAK](#6-notificationbell----do-not-break)
7. [DAL Layer for Match Data](#7-dal-layer-for-match-data)
8. [Supabase Client Setup](#8-supabase-client-setup)
9. [Existing Client-Side Data Fetching Patterns](#9-existing-client-side-data-fetching-patterns)
10. [Server-Side Live Score Engine (Edge Functions)](#10-server-side-live-score-engine-edge-functions)
11. [Database Schema: Live Score Columns](#11-database-schema-live-score-columns)
12. [Key Findings and Architectural Implications](#12-key-findings-and-architectural-implications)

---

## 1. useRealtime Hook

**File**: `web-app/src/hooks/use-realtime.ts`

### API Signature

```ts
function useRealtime<T extends Record<string, unknown>>(
  table: TableName,
  filter: string | undefined,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void
): void
```

### Supported Tables

```ts
type TableName = "predictions" | "scenarios" | "matches" | "group_members" | "notifications";
```

### How Subscriptions Work

1. Creates a Supabase browser client via `createClient()` (memoized with `useMemo`).
2. Opens a Supabase Realtime channel named `${table}-changes`.
3. Subscribes to **all** Postgres change events (`event: "*"`) on `schema: "public"` for the given table.
4. An optional `filter` string (Supabase Realtime filter syntax, e.g., `id=eq.5`) narrows the subscription to specific rows.
5. If `filter` is `undefined`, the subscription is still created but receives all changes on the table.
6. Uses a `callbackRef` pattern to avoid re-subscribing when only the callback changes (good practice).
7. The `useEffect` cleanup removes the channel via `supabase.removeChannel(channel)`.
8. Re-subscribes when `table` or `filter` changes (both are in the dependency array).

### Current Consumers

| Consumer | Table | Filter | Purpose |
|----------|-------|--------|---------|
| `LiveScoreTicker` | `"matches"` | `"id=eq.${matchId}"` (only when `isLive`) | Triggers `onUpdate` callback on match row changes |
| `NotificationBell` | `"notifications"` | `"user_id=eq.${userId}"` | Re-fetches notifications on any change |

### Test Coverage

- `web-app/src/hooks/use-realtime.test.ts` -- 4 tests covering subscribe, filter, callback invocation, and cleanup.
- `web-app/src/__mocks__/handlers/use-realtime.ts` -- No-op mock for Storybook.

### Key Observation

The hook is a thin generic wrapper. The `LiveScoreTicker` is the **only** consumer subscribing to the `"matches"` table. Removing Realtime from `LiveScoreTicker` does NOT require modifying `useRealtime` itself -- the hook must remain intact for `NotificationBell`.

---

## 2. LiveScoreTicker Component

**File**: `web-app/src/components/match/live-score-ticker.tsx`

### Directive

`"use client"` -- client component.

### Props Interface

```ts
interface LiveScoreTickerProps {
  matchId: number;
  teamA: string;
  teamB: string;
  initialScoreA: string | null;
  initialScoreB: string | null;
  initialOversA: number | null;
  initialOversB: number | null;
  initialBattingTeam: string | null;
  status: string;
  onUpdate?: () => void;
}
```

### Behavior

1. **Guard**: If `status !== "live"`, renders `null` (invisible).
2. **Realtime subscription**: Calls `useRealtime("matches", "id=eq.${matchId}", handleRealtimeUpdate)` only when `isLive` is true. When `isLive` is false, the filter is `undefined`, so a subscription is still created but the component renders nothing.
3. **onUpdate callback**: When a Realtime event fires, calls `onUpdate?.()`. The component does NOT update its own state -- it relies entirely on server-provided `initial*` props for display. The `onUpdate` is intended as a signal for the **parent** to re-fetch/re-render.
4. **Rendering**: Displays a horizontal score bar with:
   - Animated red "LIVE" badge with ping animation
   - Team A code + score + overs
   - Vertical divider
   - Team B code + score + overs
   - Bold styling on the currently batting team

### Critical Design Flaw for Polling Replacement

The component name says "initial" for all score props, but it **never updates them internally**. It has no `useState` for scores. All it does on a Realtime event is call `onUpdate()`. This means the actual score refresh depends entirely on the parent re-rendering with fresh data.

For the polling replacement, the new component (or hook) will need to:
- Maintain its own state for scores/overs/battingTeam.
- Periodically fetch fresh match data from the server.
- Update its own state with the fetched data.

### Storybook Stories

- `web-app/src/components/match/live-score-ticker.stories.tsx` -- `LiveMatch` and `NotLive` stories.

---

## 3. MatchScorecard Component

**File**: `web-app/src/components/match/match-scorecard.tsx`

### Directive

**None** -- this is a server component (no `"use client"` directive).

### Props Interface

```ts
interface MatchScorecardProps {
  teamA: string;
  teamB: string;
  scoreA: string | null;
  scoreB: string | null;
  oversA: number | null;
  oversB: number | null;
  battingTeam: string | null;
  tossWinner: string | null;
  matchWinner: string | null;
  statusInfo: string | null;
  status: string;
  compact?: boolean;  // default: false
}
```

### Rendering Logic

The component handles three visual states based on `status`:

1. **Live, no scores yet** (`isWaiting`): Shows toss winner info, "0/0" for batting team, "Yet to bat" for other, "Waiting for the first ball..." spinner.
2. **Live, with scores**: Shows live indicator (green pulsing dot + "Live"), team badges, scores, overs, and "BAT" indicator.
3. **Completed**: Shows `statusInfo` text (win result), scores, no batting indicator.

Has a `compact` mode (smaller text, less padding) used when embedded inline in match cards.

### Internal Structure

- `MatchScorecard` (main component) renders status header + two `ScoreRow` sub-components.
- `ScoreRow` renders `TeamBadge` + team code + score + overs + optional "BAT" indicator.

### Where the Refresh Button Will Be Added

The refresh button should be added in the **status header area** (`!compact` block, lines 43-63). When `isLive`, there is currently just the green pulsing dot and "Live" text. A refresh button could be placed next to the "Live" indicator or in the top-right corner of the scorecard. For `compact` mode, the button could be placed after the waiting-state message area.

Important: Since `MatchScorecard` is currently a **server component**, adding interactive refresh functionality (click handler, loading state) will require either:
- Converting it to a client component (`"use client"`), OR
- Wrapping it in a new client component that handles the polling logic and passes fresh props down.

---

## 4. Where LiveScoreTicker Is Used

### Direct Imports

Searched for `LiveScoreTicker` across the entire codebase:

| File | Usage |
|------|-------|
| `web-app/src/components/match/live-score-ticker.tsx` | Definition |
| `web-app/src/components/match/live-score-ticker.stories.tsx` | Storybook stories |

### Finding: LiveScoreTicker is NOT imported or rendered by any page or parent component.

It exists in the codebase as a standalone component with Storybook stories, but it is **not mounted in any route**. The group page (`/group/[groupId]/page.tsx`) and match page (`/group/[groupId]/match/[matchId]/page.tsx`) use `MatchScorecard` directly instead.

This means:
- `LiveScoreTicker` is essentially dead code in production. No user currently sees it.
- The `useRealtime("matches", ...)` call in `LiveScoreTicker` is never actually executed in the running app.
- The replacement effort should focus on adding polling to the pages that use `MatchScorecard`, not on modifying `LiveScoreTicker`.

---

## 5. Where MatchScorecard Is Used

### Direct Imports

| File | Route | Context | `compact` |
|------|-------|---------|-----------|
| `web-app/src/app/group/[groupId]/page.tsx` | `/group/:groupId` | Inline in live match cards in "upcoming matches" list | `true` |
| `web-app/src/app/group/[groupId]/match/[matchId]/page.tsx` | `/group/:groupId/match/:matchId` | Prominent scorecard at top of match leaderboard page | `false` (default) |

### Data Flow: Group Home Page (`/group/[groupId]/page.tsx`)

1. **Server component** -- data fetched at render time.
2. Calls `matchesDal.getUpcomingMatches(3)` which fetches matches with `status IN ('upcoming', 'live')`.
3. Iterates over matches. For live matches (`match.status === "live"`), renders `<MatchScorecard compact ... />`.
4. Props are passed directly from the match row: `match.current_score_a`, `match.current_score_b`, `match.current_overs_a`, `match.current_overs_b`, `match.current_batting_team`, `match.toss_winner`, `match.match_winner`.
5. **No client-side refresh mechanism exists.** The scores shown are whatever was in the database at the time of server-side rendering. To see updated scores, the user must manually reload the page.

### Data Flow: Match Leaderboard Page (`/group/[groupId]/match/[matchId]/page.tsx`)

1. **Server component** -- data fetched at render time.
2. Calls `matchesDal.getMatchById(matchId)` which fetches the full match row.
3. Renders `<MatchScorecard ... />` (full size, not compact) with the same match fields.
4. Also renders `<MatchLeaderboard entries={leaderboard} ... />` below the scorecard.
5. **Same limitation**: no client-side refresh. Scores are stale after initial render.

### Key Takeaway

Both consumers are **server components** that pass server-fetched data as props. There is no mechanism for the client to trigger a data refresh for scores. The polling replacement needs to add client-side fetching capability to these pages.

---

## 6. NotificationBell -- DO NOT BREAK

**File**: `web-app/src/components/layout/notification-bell.tsx`

### How It Uses useRealtime

```ts
useRealtime("notifications", `user_id=eq.${userId}`, handleRealtimeUpdate);
```

- Subscribes to the `notifications` table filtered by `user_id`.
- On any Realtime event, re-fetches the full notification list (up to 20) via direct Supabase browser client query.
- This is the **only other consumer of `useRealtime`** besides the unused `LiveScoreTicker`.

### Full Behavior

1. **Initial fetch**: `useEffect` on mount queries `notifications` table via browser Supabase client.
2. **Realtime updates**: `handleRealtimeUpdate` callback performs the same query to refresh the list.
3. **Mark read / mark all read**: Calls server actions (`markNotificationRead`, `markAllNotificationsRead`) then optimistically updates local state.
4. **Renders**: Bell icon with unread badge, dropdown panel with notification list.

### Embedded In

- `web-app/src/components/layout/header.tsx` -- rendered when `user` is authenticated: `<NotificationBell userId={user.id} />`.

### Safety Note

The `useRealtime` hook itself must NOT be removed or modified. `NotificationBell` depends on it for real-time notification delivery. The polling replacement for live scores should be a **new, separate mechanism** -- either a new `usePolling` hook or a direct `setInterval` pattern in a new client component.

---

## 7. DAL Layer for Match Data

**File**: `web-app/src/lib/dal/matches.ts`

### All Match-Related Functions

| Function | Returns | Server-Only | Relevant to Polling |
|----------|---------|-------------|-------------------|
| `getUpcomingMatches(limit)` | `Match[]` | Yes (uses server client) | Yes -- used by group page |
| `getMatchById(matchId)` | `Match \| null` | Yes | Yes -- used by match page |
| `getMatchesForDate(date)` | `Match[]` | Yes | No |
| `getNextMatch()` | `Match \| null` | Yes | No |
| `getLastCompletedMatch()` | `Match \| null` | Yes | No |
| `getRecentCompletedMatches(limit)` | `Match[]` | Yes | No |
| `updateMatchResults(matchId, results)` | `boolean` | Yes | No |
| `getMatchDeadlineInfo(matchId)` | `MatchDeadlineInfo \| null` | Yes | No |
| `getMatchGroupSettings(groupId, matchId)` | `MatchGroupSettings \| null` | Yes | No |
| `upsertMatchGroupSettings(...)` | `boolean` | Yes | No |
| `resolveMatchPredictions(matchId)` | `boolean` | Yes | No |
| `publishMatchScenarios(...)` | `boolean` | Yes | No |
| `updateLiveSnapshot(matchId, snapshot)` | `boolean` | Yes | No (server-side write) |

### Critical Gap: No Client-Side Fetch Function

**Every DAL function uses the server Supabase client** (`createClient()` from `@/lib/supabase/server`). This client reads cookies via `next/headers` and cannot be used in client components or browser code.

For polling, we need a **new client-side fetch function**. Options:

1. **New DAL function using browser client** -- e.g., `getMatchByIdClient(matchId)` in a new file like `web-app/src/lib/dal/matches-client.ts` using `createClient()` from `@/lib/supabase/client`.
2. **Server action** -- a `"use server"` function that the client can call via `fetch` (Next.js server actions are callable from client components). Would use the existing server client.
3. **API route** -- a `route.ts` handler (e.g., `/api/match/[matchId]/score`) that returns JSON. Could be cached with short TTL.

The existing pattern in the codebase leans toward **option 1** (direct browser Supabase queries), based on how `NotificationBell` and `ExpandablePicks` already work. See Section 9.

### Match Row: Live Score Columns

The following columns on the `matches` table carry live score data that the polling client needs:

```
current_score_a:       string | null    -- e.g., "186/5"
current_score_b:       string | null    -- e.g., "142/6"
current_overs_a:       number | null    -- e.g., 20
current_overs_b:       number | null    -- e.g., 16.3
current_batting_team:  string | null    -- team code, e.g., "SRH"
toss_winner:           string | null    -- team code
match_winner:          string | null    -- team code
status:                MatchStatus      -- "upcoming" | "live" | "completed" | "abandoned" | "no_result"
last_polled_at:        string | null    -- ISO timestamp of last server-side poll
live_scorecard_json:   JSON | null      -- full API response (large, ~50KB)
```

For polling, the client only needs `current_score_a`, `current_score_b`, `current_overs_a`, `current_overs_b`, `current_batting_team`, `toss_winner`, `match_winner`, and `status`. **Do NOT fetch `live_scorecard_json`** on the client -- it's a large blob that's only needed server-side.

---

## 8. Supabase Client Setup

### Browser Client

**File**: `web-app/src/lib/supabase/client.ts`

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- Uses `@supabase/ssr` (v0.9.0) `createBrowserClient`.
- No `Database` type generic applied (noted as TODO in the file).
- Used by: `useRealtime`, `useAuth`, `NotificationBell`, `ExpandablePicks`.
- Pattern: consumers memoize via `useMemo(() => createClient(), [])`.

### Server Client

**File**: `web-app/src/lib/supabase/server.ts`

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, ANON_KEY, { cookies: { getAll, setAll } });
}
```

- Async function (awaits `cookies()`).
- Used by all DAL functions and server actions.
- Cannot be used in client components.

### Cached Auth

**File**: `web-app/src/lib/supabase/get-user-cached.ts`

- `React.cache()` wrapper around `supabase.auth.getUser()`.
- Deduplicates auth calls within a single server request.

---

## 9. Existing Client-Side Data Fetching Patterns

### Pattern 1: Direct Supabase Browser Client Queries

**Used by**: `NotificationBell`, `ExpandablePicks`, `useAuth`

This is the **dominant client-side fetching pattern** in the codebase:

```ts
const supabase = useMemo(() => createClient(), []);

useEffect(() => {
  async function fetch() {
    const { data } = await supabase
      .from("table_name")
      .select("columns")
      .eq("column", value);
    if (data) setState(data);
  }
  fetch();
}, [supabase, ...deps]);
```

Components create a browser Supabase client, use `useEffect` for initial fetch, and call Supabase query methods directly. No abstraction layer (no SWR, no React Query, no custom fetch wrappers).

### Pattern 2: Server Actions Called from Client

**Used by**: `ResultEntryForm`, `PredictionForm`, `CreateGroupForm`, `ScenarioEditor`, etc.

For **mutations** (writes), client components call `"use server"` functions directly:

```ts
const result = await enterResults(groupId, matchId, results);
if (result.success) {
  router.refresh(); // Re-fetch server component data
}
```

After a successful mutation, components call `router.refresh()` to trigger Next.js to re-render server components with fresh data.

### Pattern 3: No SWR / React Query / TanStack Query

The project has **no data-fetching library** installed. There is no:
- `swr`
- `@tanstack/react-query`
- Custom `useFetch` hook
- API route layer for client consumption

All client-side reads go directly through the Supabase browser client.

### Recommended Approach for Polling

Given the existing patterns, the polling mechanism should follow Pattern 1 (direct Supabase browser client queries) wrapped in a `setInterval`:

```ts
// Conceptual -- not actual implementation
const supabase = useMemo(() => createClient(), []);

useEffect(() => {
  if (status !== "live") return;

  const poll = async () => {
    const { data } = await supabase
      .from("matches")
      .select("current_score_a, current_score_b, current_overs_a, current_overs_b, current_batting_team, status, toss_winner, match_winner")
      .eq("id", matchId)
      .single();
    if (data) updateState(data);
  };

  poll(); // Initial fetch
  const interval = setInterval(poll, 30_000);
  return () => clearInterval(interval);
}, [supabase, matchId, status]);
```

This aligns with how `NotificationBell` already fetches data client-side and would be immediately familiar to anyone reading this codebase.

---

## 10. Server-Side Live Score Engine (Edge Functions)

Understanding how scores get INTO the database is important context for the polling design.

### match-live Edge Function

**File**: `supabase/functions/match-live/index.ts`

- Runs every ~1 minute via pg_cron (gated to 12:00 PM - 1:00 AM IST).
- For live matches, calls `get_livescore` on api-cricket.com.
- Writes a snapshot to the `matches` table: `current_score_a`, `current_score_b`, `current_overs_a`, `current_overs_b`, `current_batting_team`, `live_scorecard_json`, `last_polled_at`.
- Also handles progressive scenario resolution (powerplay, milestones, etc.).
- When match finishes (`event_status === "Finished"`), sets `status = "completed"` and runs full resolution.

### match-cron Edge Function

**File**: `supabase/functions/match-cron/index.ts`

- Older version of the same logic (being superseded by `match-live`).
- Same pattern: poll API, write snapshot, progressive resolve.

### Implication for Client Polling Interval

The server writes new scores approximately every 60 seconds. A client poll interval of 30 seconds ensures the user sees updates within ~30 seconds of the server writing them, while a 60-second interval could mean up to 2 minutes of staleness. A 30-second interval is a reasonable trade-off.

The `last_polled_at` column on the match row can be used as a staleness indicator: if the client's data is older than `last_polled_at`, there's fresh data to display.

---

## 11. Database Schema: Live Score Columns

**File**: `web-app/src/types/database.ts`

### matches Table -- Live Score Fields

| Column | Type | Description |
|--------|------|-------------|
| `current_score_a` | `string \| null` | Team A score, e.g., "186/5" |
| `current_score_b` | `string \| null` | Team B score, e.g., "142/6" |
| `current_overs_a` | `number \| null` | Team A overs bowled, e.g., 20 |
| `current_overs_b` | `number \| null` | Team B overs bowled, e.g., 16.3 |
| `current_batting_team` | `string \| null` | Team code currently batting |
| `toss_winner` | `string \| null` | Team code that won the toss |
| `match_winner` | `string \| null` | Team code that won the match |
| `status` | `MatchStatus` | "upcoming" / "live" / "completed" / "abandoned" / "no_result" |
| `last_polled_at` | `string \| null` | ISO timestamp of last server-side API poll |
| `live_scorecard_json` | `JSON \| null` | Full API response blob (~50KB) -- do NOT fetch client-side |

### MatchStatus Enum

```ts
type MatchStatus = "upcoming" | "live" | "completed" | "abandoned" | "no_result";
```

---

## 12. Key Findings and Architectural Implications

### Finding 1: LiveScoreTicker Is Dead Code

`LiveScoreTicker` is defined and has Storybook stories, but is not imported by any page or layout. The only component actually displaying live scores in production is `MatchScorecard`, which is a server component rendered on two pages. This means:
- We can safely remove or replace `LiveScoreTicker` without affecting any user-facing functionality.
- Or we can repurpose it as the new polling-enabled live score component.

### Finding 2: MatchScorecard Is a Pure Server Component

`MatchScorecard` has no `"use client"` directive. It renders whatever props it receives at server render time. For polling to work, we need a **client wrapper component** that:
- Accepts initial server-rendered data as props.
- Runs a `setInterval` to fetch fresh data.
- Passes updated data to `MatchScorecard` (or renders its own UI).

### Finding 3: No Client-Side Match Fetch Function Exists

All match DAL functions use the server Supabase client. We need a new client-side function. The simplest approach is a direct Supabase browser client query (matches the existing pattern in `NotificationBell` and `ExpandablePicks`).

### Finding 4: useRealtime Must Stay Intact

`NotificationBell` depends on `useRealtime` for the `"notifications"` table. The hook itself should not be modified. The new polling mechanism should be independent.

### Finding 5: Server Writes Scores Every ~60 Seconds

The `match-live` edge function polls api-cricket.com every ~60 seconds and writes to the `matches` table. Client-side polling at 30-second intervals is a reasonable complement.

### Finding 6: Avoid Fetching live_scorecard_json

The `live_scorecard_json` column contains the full API response (~50KB). The client only needs the 8 lightweight score columns. The polling query should use `.select()` to pick only the needed columns.

### Finding 7: The `status` Field Is Critical for Lifecycle

Client polling should:
- Start when `status === "live"`.
- Stop when `status` transitions to `"completed"`, `"abandoned"`, or `"no_result"`.
- Not poll when `status === "upcoming"` (no scores to show).

### Finding 8: Two Pages Need the Polling Enhancement

| Page | Route | Component | Notes |
|------|-------|-----------|-------|
| Group Home | `/group/[groupId]` | Uses `MatchScorecard` with `compact` | Shows multiple matches; only live ones need polling |
| Match Leaderboard | `/group/[groupId]/match/[matchId]` | Uses `MatchScorecard` full-size | Single match; always polls if live |

### Finding 9: router.refresh() Is the Existing Refresh Pattern

Several components already use `router.refresh()` to re-render server components after mutations. However, this triggers a full route re-render which is heavier than a targeted score update. For live score polling, a lighter-weight approach (client-side state update) is preferred.
