# Technical Architecture: Live Score Polling

**Author**: PSE Agent
**Date**: 2026-03-29
**Status**: Draft
**Mode**: Architecture Design

**Input documents**:
- `docs/feature_docs/live-score-polling/requirements.md` (FR-001 through FR-023, NFR-001 through NFR-008)
- `docs/feature_docs/live-score-polling/codebase-analysis.md` (12 findings)
- `docs/feature_docs/live-score-polling/ui-ux-spec.md` (refresh button + last-updated indicator)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [New Type Definitions](#2-new-type-definitions)
3. [New Utility: `formatTimeAgo`](#3-new-utility-formattimeago)
4. [New Hook: `useMatchPolling`](#4-new-hook-usematchpolling)
5. [MatchScorecard Modifications](#5-matchscorecard-modifications)
6. [New Client Wrapper: `LiveMatchCard`](#6-new-client-wrapper-livematchcard)
7. [New Client Wrapper: `LiveMatchScorecard`](#7-new-client-wrapper-livematchscorecard)
8. [Group Page Integration](#8-group-page-integration)
9. [Match Leaderboard Page Integration](#9-match-leaderboard-page-integration)
10. [LiveScoreTicker Cleanup](#10-livescoreticker-cleanup)
11. [File-by-File Change Plan](#11-file-by-file-change-plan)
12. [Edge Cases](#12-edge-cases)
13. [Performance Considerations](#13-performance-considerations)
14. [Testing Strategy](#14-testing-strategy)

---

## 1. Architecture Overview

### Data Flow (current)

```
Server Render (RSC)
  -> matchesDal.getUpcomingMatches() / getMatchById()     [server Supabase client]
  -> passes match row as props to <MatchScorecard />       [server component]
  -> HTML sent to browser — scores are frozen at render time
```

### Data Flow (after this feature)

```
Server Render (RSC)
  -> matchesDal.getUpcomingMatches() / getMatchById()     [server Supabase client]
  -> passes match row to <LiveMatchCard /> or <LiveMatchScorecard />  [client wrapper]
     -> useMatchPolling(matchId, initialMatch)             [client hook]
        -> creates Supabase browser client
        -> polls matches table every 120s (only when status === "live")
        -> pauses on tab hidden, force-fetches on tab visible
        -> exposes refresh() for manual refresh
     -> renders <MatchScorecard onRefresh={refresh} isPolling={isLoading} lastUpdated={lastUpdated} />
```

### Component Hierarchy

```
GroupHomePage (server)
  └─ LiveMatchCard (client wrapper) — one per live match
       └─ MatchScorecard (client component, compact mode)

MatchLeaderboardPage (server)
  └─ LiveMatchScorecard (client wrapper) — single match
       └─ MatchScorecard (client component, full mode)
```

### Key Design Decisions

1. **`MatchScorecard` becomes a client component** (`"use client"`). It must accept `onRefresh` (a function), which cannot be serialized across the server/client boundary. Since it was already purely presentational with no server-side data dependencies, adding the directive has zero functional cost.

2. **Client wrappers own the polling lifecycle.** `useMatchPolling` is called in wrapper components, not inside `MatchScorecard`. The scorecard remains a presentational component that renders whatever props it receives.

3. **Direct Supabase browser client queries** for polling. This matches the established pattern in `NotificationBell` and `ExpandablePicks`. No new API routes, server actions, or data-fetching libraries.

4. **Selective column fetch.** The polling query fetches only the 8 lightweight columns needed for display, excluding `live_scorecard_json` (~50KB).

---

## 2. New Type Definitions

**File**: `web-app/src/types/index.ts`

Add a new interface for the lightweight match score data returned by polling:

```ts
/**
 * Lightweight match score data for client-side polling.
 * Contains only the columns needed for live scorecard display.
 * Excludes heavy fields like live_scorecard_json.
 */
export interface MatchScoreData {
  id: number;
  current_score_a: string | null;
  current_score_b: string | null;
  current_overs_a: number | null;
  current_overs_b: number | null;
  current_batting_team: string | null;
  toss_winner: string | null;
  match_winner: string | null;
  status: import("./database").MatchStatus;
}
```

This type is the return shape of the polling query. It is a strict subset of the `matches` Row type. Using a dedicated type:
- Documents exactly which columns the polling query fetches.
- Prevents accidental reliance on columns not present in the polling response.
- Makes the `useMatchPolling` return type precise.

Add a type alias for the initial match data accepted by wrapper components:

```ts
/**
 * Shape of server-fetched match data passed to client wrapper components.
 * Structurally compatible with the full matches Row type.
 */
export type MatchInitialData = MatchScoreData & {
  team_a: string;
  team_b: string;
  statusInfo: string | null;
};
```

This gives wrapper components a clear contract for the server-rendered data they receive as initial props.

---

## 3. New Utility: `formatTimeAgo`

**File**: `web-app/src/lib/utils.ts`

Extract the `formatTimeAgo` function from `notification-bell.tsx` (lines 155-163) into the shared utilities file. Both `NotificationBell` and `MatchScorecard` need it.

```ts
/**
 * Formats a Date or ISO string into a relative time string.
 * Examples: "just now", "1m ago", "5h ago", "2d ago"
 */
export function formatTimeAgo(date: Date | string): string {
  const timestamp = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
```

**Note**: The `NotificationBell` version uses "Just now" (capital J) and accepts a `string`. The shared version accepts `Date | string` (the hook stores `lastUpdated` as a `Date`), uses lowercase "just now" to match the UI spec's "Updated just now" phrasing. `NotificationBell` will be updated to import from `@/lib/utils` instead of using its local copy.

---

## 4. New Hook: `useMatchPolling`

**File**: `web-app/src/hooks/use-match-polling.ts`

### 4.1 API Signature

```ts
import type { MatchScoreData } from "@/types";
import type { MatchStatus } from "@/types/database";

interface UseMatchPollingOptions {
  /** Match ID to poll */
  matchId: number;
  /** Current match status — polling only occurs when "live" */
  status: MatchStatus;
  /** Server-rendered initial score data (displayed until first poll completes) */
  initialData?: MatchScoreData | null;
  /** Polling interval in ms. Default: 120_000 (2 minutes). */
  intervalMs?: number;
}

interface UseMatchPollingReturn {
  /** Latest match score data (server-initial until first poll, then polled) */
  match: MatchScoreData | null;
  /** True while any fetch (auto or manual) is in-flight */
  isLoading: boolean;
  /** Timestamp of last successful fetch. Null before first poll completes. */
  lastUpdated: Date | null;
  /** Trigger an immediate manual refresh. Resets the interval timer. */
  refresh: () => void;
}

export function useMatchPolling(options: UseMatchPollingOptions): UseMatchPollingReturn;
```

**Design note**: Using an options object (not positional args) for extensibility. The `intervalMs` param defaults to `120_000` but allows test overrides without mocking timers.

### 4.2 Full Implementation Blueprint

```ts
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MatchScoreData } from "@/types";
import type { MatchStatus } from "@/types/database";

/** Columns fetched by the polling query — excludes live_scorecard_json */
const POLL_COLUMNS = "id, current_score_a, current_score_b, current_overs_a, current_overs_b, current_batting_team, toss_winner, match_winner, status";

const DEFAULT_INTERVAL_MS = 120_000; // 2 minutes

interface UseMatchPollingOptions {
  matchId: number;
  status: MatchStatus;
  initialData?: MatchScoreData | null;
  intervalMs?: number;
}

interface UseMatchPollingReturn {
  match: MatchScoreData | null;
  isLoading: boolean;
  lastUpdated: Date | null;
  refresh: () => void;
}

/**
 * Client-side polling hook for live match score data.
 *
 * Polls the `matches` table every `intervalMs` (default 120s) when status is "live".
 * Pauses when the browser tab is hidden (Page Visibility API).
 * Exposes a manual `refresh()` function that resets the interval timer.
 * Prevents concurrent fetches.
 * Stops polling when the match completes.
 */
export function useMatchPolling({
  matchId,
  status,
  initialData = null,
  intervalMs = DEFAULT_INTERVAL_MS,
}: UseMatchPollingOptions): UseMatchPollingReturn {
  const supabase = useMemo(() => createClient(), []);
  const [match, setMatch] = useState<MatchScoreData | null>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // --- Refs for stable references across renders ---
  const isFetchingRef = useRef(false);       // Concurrent-fetch guard
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef(status);          // Track latest status without re-subscribing effects
  const mountedRef = useRef(true);           // Guard against setState on unmounted component

  // Keep statusRef in sync with prop
  statusRef.current = status;

  // --- Core fetch function (stable via useCallback + refs) ---
  const fetchMatch = useCallback(async () => {
    // Guard: no concurrent fetches
    if (isFetchingRef.current) return;
    // Guard: only fetch when live
    if (statusRef.current !== "live") return;

    isFetchingRef.current = true;
    if (mountedRef.current) setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("matches")
        .select(POLL_COLUMNS)
        .eq("id", matchId)
        .single();

      if (!mountedRef.current) return; // Component unmounted during fetch

      if (error) {
        // NFR-004: silently swallow errors, log in dev
        if (process.env.NODE_ENV === "development") {
          console.warn(`[useMatchPolling] Poll failed for match ${matchId}:`, error.message);
        }
        return;
      }

      if (data) {
        setMatch(data as MatchScoreData);
        setLastUpdated(new Date());

        // FR-005 / FR-023: If match completed during polling, stop
        if (data.status !== "live") {
          stopInterval();
        }
      } else {
        // NFR-005: Invalid matchId or deleted match
        setMatch(null);
        stopInterval();
      }
    } finally {
      isFetchingRef.current = false;
      if (mountedRef.current) setIsLoading(false);
    }
  }, [supabase, matchId]); // Stable deps: supabase is memoized, matchId is a number

  // --- Interval management helpers (use refs, not state) ---
  function startInterval() {
    stopInterval(); // Clear any existing interval first
    intervalIdRef.current = setInterval(fetchMatch, intervalMs);
  }

  function stopInterval() {
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }

  // --- Manual refresh (stable reference via useCallback) ---
  const refresh = useCallback(() => {
    fetchMatch();
    // FR-007: Reset interval so next auto-poll is a full interval later
    if (statusRef.current === "live") {
      startInterval();
    }
  }, [fetchMatch, intervalMs]);

  // --- Main polling effect ---
  useEffect(() => {
    mountedRef.current = true;

    if (status !== "live") {
      // FR-004/FR-022: Don't poll when not live
      stopInterval();
      return;
    }

    // FR-003: Initial fetch on mount when live
    fetchMatch();
    // Start polling interval
    startInterval();

    return () => {
      mountedRef.current = false;
      stopInterval();
    };
  }, [status, fetchMatch, intervalMs]);

  // --- Page Visibility API ---
  useEffect(() => {
    // EC-10: Graceful degradation if API not supported
    if (typeof document === "undefined" || typeof document.addEventListener !== "function") {
      return;
    }
    if (!("visibilityState" in document)) {
      return;
    }

    function handleVisibilityChange() {
      if (statusRef.current !== "live") return;

      if (document.visibilityState === "hidden") {
        // FR-006: Pause polling when tab hidden
        stopInterval();
      } else if (document.visibilityState === "visible") {
        // FR-006: Force fetch on tab visible, then resume interval
        fetchMatch();
        startInterval();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchMatch, intervalMs]);

  return { match, isLoading, lastUpdated, refresh };
}
```

### 4.3 Key Design Rationale

| Decision | Rationale |
|----------|-----------|
| `useRef` for `isFetchingRef` | Avoids re-renders when flipping the concurrent-fetch guard. `useState` would cause an extra render cycle on every poll. |
| `useRef` for `intervalIdRef` | The interval ID is an imperative detail, not render state. Storing in a ref avoids stale closures and unnecessary effect re-runs. |
| `useRef` for `statusRef` | Allows `fetchMatch` and visibility handler to read the latest `status` without adding `status` to their dependency arrays (which would recreate the functions on every status change). |
| `useRef` for `mountedRef` | Guards against React "setState on unmounted component" warnings. Set to `false` in cleanup. Checked after every `await`. |
| `useMemo` for `supabase` | Matches the existing codebase pattern (`NotificationBell`, `useRealtime`). Creates the browser client once per component lifecycle. |
| `useCallback` for `fetchMatch` | Stabilizes the function reference so the visibility effect doesn't re-subscribe on every render. Dependencies are `supabase` (memoized) and `matchId` (number, stable). |
| `useCallback` for `refresh` | Ensures consumers (wrapper components) don't receive a new function reference on every render. Prevents unnecessary re-renders of `MatchScorecard`. |
| `setInterval` not `setTimeout` chain | Per NFR-003: avoids drift accumulation from fetch latency. The concurrent-fetch guard handles the rare case where a fetch exceeds the interval period. |
| No `AbortController` | Per assumption A-06: the Supabase query is lightweight and short-lived (~50-100ms). Adding `AbortController` would increase complexity for negligible benefit. The `mountedRef` guard is sufficient to prevent state updates on unmounted components. |

### 4.4 Requirements Coverage

| Requirement | How Addressed |
|-------------|---------------|
| FR-001 | Hook created, exported, accepts `matchId` and `status` |
| FR-002 | Returns `{ match, isLoading, lastUpdated, refresh }` |
| FR-003 | `fetchMatch()` called on mount when `status === "live"` |
| FR-004 | `setInterval(fetchMatch, 120_000)` when status is live |
| FR-005 | Interval cleared when status prop changes or poll returns non-live status |
| FR-006 | `visibilitychange` listener pauses/resumes polling |
| FR-007 | `refresh()` calls `fetchMatch()` then `startInterval()` |
| FR-008 | `isFetchingRef.current` guard prevents concurrent fetches |
| FR-009 | Uses `createClient()` from `@/lib/supabase/client` |
| NFR-001 | Single `.select(POLL_COLUMNS).eq("id", matchId).single()` per poll |
| NFR-003 | `setInterval` with clear-and-reset on manual refresh |
| NFR-004 | Errors caught and swallowed; console.warn in dev only |
| NFR-005 | `data` null-check; returns `match: null` and stops polling |
| NFR-008 | No new dependencies; uses React hooks + Supabase client + browser APIs |

---

## 5. MatchScorecard Modifications

**File**: `web-app/src/components/match/match-scorecard.tsx`

### 5.1 Add `"use client"` Directive

The component must become a client component because it now accepts `onRefresh` (a function prop). Functions cannot cross the server/client serialization boundary.

Add at line 1:
```ts
"use client";
```

### 5.2 New Import

```ts
import { RefreshCw } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
```

### 5.3 Extended Props Interface

```ts
interface MatchScorecardProps {
  // --- Existing props (unchanged) ---
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
  compact?: boolean;

  // --- New optional props ---
  /** Callback for manual refresh. If undefined, refresh button is not rendered. */
  onRefresh?: () => void;
  /** True while a fetch (auto or manual) is in-flight. Controls spinner state. */
  isPolling?: boolean;
  /** Timestamp of last successful data fetch. Shown as relative time. */
  lastUpdated?: Date | null;
}
```

Destructure the new props with defaults:

```ts
export function MatchScorecard({
  // ... existing props ...
  onRefresh,
  isPolling = false,
  lastUpdated = null,
}: MatchScorecardProps) {
```

### 5.4 Refresh Button Component (internal)

Define a helper inside the file to avoid duplication between full and compact modes:

```tsx
function RefreshButton({
  onRefresh,
  isPolling,
  compact,
}: {
  onRefresh: () => void;
  isPolling: boolean;
  compact: boolean;
}) {
  const iconSize = compact ? "h-3 w-3" : "h-3.5 w-3.5";
  const buttonSize = compact ? "h-5 w-5" : "h-6 w-6";

  return (
    <button
      onClick={onRefresh}
      disabled={isPolling}
      aria-label="Refresh scores"
      aria-busy={isPolling || undefined}
      className={`flex items-center justify-center ${buttonSize} rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors active:scale-95 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-[var(--text-muted)]`}
    >
      <RefreshCw className={`${iconSize} ${isPolling ? "animate-spin" : ""}`} />
    </button>
  );
}
```

### 5.5 Full Mode: Status Header Modification

**Current** (lines 54-61):
```tsx
) : isLive ? (
  <div className="flex items-center gap-2">
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
    </span>
    <span className={`${textSize} font-display font-semibold text-[var(--success)]`}>Live</span>
  </div>
```

**Modified**:
```tsx
) : isLive ? (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
      </span>
      <span className={`${textSize} font-display font-semibold text-[var(--success)]`}>Live</span>
    </div>
    {onRefresh && (
      <RefreshButton onRefresh={onRefresh} isPolling={isPolling} compact={false} />
    )}
  </div>
```

Also add refresh button to the **waiting state** header (`isWaiting && tossWinner` branch):

```tsx
) : isWaiting && tossWinner ? (
  <div className="flex items-center justify-between">
    <p className={`${textSize} text-[var(--text-secondary)]`}>
      Toss: <span className="font-semibold text-[var(--text-primary)]">{tossWinner}</span> won the toss
    </p>
    {onRefresh && (
      <RefreshButton onRefresh={onRefresh} isPolling={isPolling} compact={false} />
    )}
  </div>
```

### 5.6 Compact Mode: Refresh Button Positioning

The compact container needs `relative` positioning. The refresh button is absolutely positioned in the top-right corner.

**Current** (line 41-42):
```tsx
<div className={padding}>
```

**Modified**:
```tsx
<div className={`${padding} ${compact ? "relative" : ""}`}>
```

Add the compact refresh button immediately after the opening `<div>`:

```tsx
{/* Compact mode refresh button — absolutely positioned top-right */}
{compact && onRefresh && isLive && (
  <div className="absolute top-0 right-0">
    <RefreshButton onRefresh={onRefresh} isPolling={isPolling} compact={true} />
  </div>
)}
```

### 5.7 Last Updated Indicator

Add after the waiting-state message block (after line 103 in current file), before the closing `</div>`:

```tsx
{/* Last updated timestamp */}
{lastUpdated && isLive && (
  <p className={`${compact ? "mt-1.5 text-[10px]" : "mt-2 text-xs"} text-[var(--text-muted)]`}>
    Updated {formatTimeAgo(lastUpdated)}
  </p>
)}
```

### 5.8 Complete Modified Component Structure

```
<div className={padding + relative-if-compact}>
  {compact && onRefresh && isLive && <RefreshButton (absolute) />}

  {!compact && <StatusHeader (with refresh button in live/waiting states) />}

  {compact && isWaiting && <TossInfo />}

  <ScoreRows />

  {isWaiting && <WaitingMessage />}

  {lastUpdated && isLive && <LastUpdated />}
</div>
```

---

## 6. New Client Wrapper: `LiveMatchCard`

**File**: `web-app/src/components/match/live-match-card.tsx`

This component wraps the live match scorecard on the group page. It bridges SSR-rendered initial data with client-side polling.

```tsx
"use client";

import { useMatchPolling } from "@/hooks/use-match-polling";
import { MatchScorecard } from "@/components/match/match-scorecard";
import type { MatchStatus } from "@/types/database";

interface LiveMatchCardProps {
  matchId: number;
  teamA: string;
  teamB: string;
  scoreA: string | null;
  scoreB: string | null;
  oversA: number | null;
  oversB: number | null;
  battingTeam: string | null;
  tossWinner: string | null;
  matchWinner: string | null;
  status: MatchStatus;
}

/**
 * Client wrapper for live match scorecards on the group page.
 * Manages polling lifecycle via useMatchPolling and passes
 * fresh data + refresh controls to the presentational MatchScorecard.
 */
export function LiveMatchCard({
  matchId,
  teamA,
  teamB,
  scoreA,
  scoreB,
  oversA,
  oversB,
  battingTeam,
  tossWinner,
  matchWinner,
  status,
}: LiveMatchCardProps) {
  const { match, isLoading, lastUpdated, refresh } = useMatchPolling({
    matchId,
    status,
    initialData: {
      id: matchId,
      current_score_a: scoreA,
      current_score_b: scoreB,
      current_overs_a: oversA,
      current_overs_b: oversB,
      current_batting_team: battingTeam,
      toss_winner: tossWinner,
      match_winner: matchWinner,
      status,
    },
  });

  // Use polled data when available, fall back to server-rendered props
  const displayStatus = match?.status ?? status;
  const displayScoreA = match?.current_score_a ?? scoreA;
  const displayScoreB = match?.current_score_b ?? scoreB;
  const displayOversA = match?.current_overs_a ?? oversA;
  const displayOversB = match?.current_overs_b ?? oversB;
  const displayBattingTeam = match?.current_batting_team ?? battingTeam;
  const displayTossWinner = match?.toss_winner ?? tossWinner;
  const displayMatchWinner = match?.match_winner ?? matchWinner;

  return (
    <MatchScorecard
      compact
      teamA={teamA}
      teamB={teamB}
      scoreA={displayScoreA}
      scoreB={displayScoreB}
      oversA={displayOversA}
      oversB={displayOversB}
      battingTeam={displayBattingTeam}
      tossWinner={displayTossWinner}
      matchWinner={displayMatchWinner}
      statusInfo={null}
      status={displayStatus}
      onRefresh={refresh}
      isPolling={isLoading}
      lastUpdated={lastUpdated}
    />
  );
}
```

### Why separate props instead of a single `match` object?

The group page currently passes match fields individually to `MatchScorecard`. The wrapper mirrors this interface so the parent server component can pass the same individual fields from the DAL query result. This avoids creating a second type mapping layer and keeps the change surface in the server component minimal.

---

## 7. New Client Wrapper: `LiveMatchScorecard`

**File**: `web-app/src/components/match/live-match-scorecard.tsx`

This component wraps the full-size scorecard on the match leaderboard page.

```tsx
"use client";

import { useMatchPolling } from "@/hooks/use-match-polling";
import { MatchScorecard } from "@/components/match/match-scorecard";
import type { MatchStatus } from "@/types/database";

interface LiveMatchScorecardProps {
  matchId: number;
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
  status: MatchStatus;
}

/**
 * Client wrapper for the full-size match scorecard on the match leaderboard page.
 * Manages polling lifecycle via useMatchPolling and passes
 * fresh data + refresh controls to the presentational MatchScorecard.
 */
export function LiveMatchScorecard({
  matchId,
  teamA,
  teamB,
  scoreA,
  scoreB,
  oversA,
  oversB,
  battingTeam,
  tossWinner,
  matchWinner,
  statusInfo,
  status,
}: LiveMatchScorecardProps) {
  const { match, isLoading, lastUpdated, refresh } = useMatchPolling({
    matchId,
    status,
    initialData: {
      id: matchId,
      current_score_a: scoreA,
      current_score_b: scoreB,
      current_overs_a: oversA,
      current_overs_b: oversB,
      current_batting_team: battingTeam,
      toss_winner: tossWinner,
      match_winner: matchWinner,
      status,
    },
  });

  const displayStatus = match?.status ?? status;
  const displayScoreA = match?.current_score_a ?? scoreA;
  const displayScoreB = match?.current_score_b ?? scoreB;
  const displayOversA = match?.current_overs_a ?? oversA;
  const displayOversB = match?.current_overs_b ?? oversB;
  const displayBattingTeam = match?.current_batting_team ?? battingTeam;
  const displayTossWinner = match?.toss_winner ?? tossWinner;
  const displayMatchWinner = match?.match_winner ?? matchWinner;

  return (
    <MatchScorecard
      teamA={teamA}
      teamB={teamB}
      scoreA={displayScoreA}
      scoreB={displayScoreB}
      oversA={displayOversA}
      oversB={displayOversB}
      battingTeam={displayBattingTeam}
      tossWinner={displayTossWinner}
      matchWinner={displayMatchWinner}
      statusInfo={displayStatus === "completed" ? statusInfo : null}
      status={displayStatus}
      onRefresh={refresh}
      isPolling={isLoading}
      lastUpdated={lastUpdated}
    />
  );
}
```

### Why two separate wrappers instead of one?

1. **Different `compact` modes**: `LiveMatchCard` always uses `compact`, `LiveMatchScorecard` uses full mode.
2. **Different prop sets**: The match leaderboard wrapper passes `statusInfo`; the group page wrapper does not (it always passes `null`).
3. **Future divergence**: The group page wrapper may evolve to handle multiple matches or integrate with the match card's CTA button. The leaderboard wrapper may integrate with the leaderboard refresh. Separate files keep these concerns cleanly isolated.
4. **Small components**: Each is ~60 lines. The cost of duplication is negligible vs. the clarity of having single-purpose components.

---

## 8. Group Page Integration

**File**: `web-app/src/app/group/[groupId]/page.tsx`

### Changes

1. **New import**: Add `LiveMatchCard`.
2. **Replace**: The `<MatchScorecard compact ... />` JSX for live matches (lines 132-145) with `<LiveMatchCard ... />`.
3. **No other changes**: The rest of the page (upcoming matches, completed matches, member list) is unaffected.

### Before (lines 131-145):

```tsx
{isLive ? (
  <MatchScorecard
    compact
    teamA={match.team_a}
    teamB={match.team_b}
    scoreA={match.current_score_a}
    scoreB={match.current_score_b}
    oversA={match.current_overs_a}
    oversB={match.current_overs_b}
    battingTeam={match.current_batting_team}
    tossWinner={match.toss_winner}
    matchWinner={match.match_winner}
    statusInfo={null}
    status={match.status}
  />
```

### After:

```tsx
{isLive ? (
  <LiveMatchCard
    matchId={match.id}
    teamA={match.team_a}
    teamB={match.team_b}
    scoreA={match.current_score_a}
    scoreB={match.current_score_b}
    oversA={match.current_overs_a}
    oversB={match.current_overs_b}
    battingTeam={match.current_batting_team}
    tossWinner={match.toss_winner}
    matchWinner={match.match_winner}
    status={match.status}
  />
```

**Note**: `matchId` is a new prop (the current `MatchScorecard` doesn't need it, but the polling wrapper does). `statusInfo` is removed (the wrapper always passes `null` to the underlying scorecard).

The import:
```ts
import { LiveMatchCard } from "@/components/match/live-match-card";
```

The `MatchScorecard` import can remain since it may be used for non-live matches in the future, but currently the page only renders scorecards for live matches. If unused, the linter will flag it.

---

## 9. Match Leaderboard Page Integration

**File**: `web-app/src/app/group/[groupId]/match/[matchId]/page.tsx`

### Changes

1. **New import**: Add `LiveMatchScorecard`.
2. **Replace**: The `<MatchScorecard ... />` block (lines 60-72) with `<LiveMatchScorecard ... />`.
3. **No other changes**: The back link, match header card, and leaderboard section are unaffected.

### Before (lines 60-72):

```tsx
<MatchScorecard
  teamA={match.team_a}
  teamB={match.team_b}
  scoreA={match.current_score_a}
  scoreB={match.current_score_b}
  oversA={match.current_overs_a}
  oversB={match.current_overs_b}
  battingTeam={match.current_batting_team}
  tossWinner={match.toss_winner}
  matchWinner={match.match_winner}
  statusInfo={null}
  status={match.status}
/>
```

### After:

```tsx
<LiveMatchScorecard
  matchId={match.id}
  teamA={match.team_a}
  teamB={match.team_b}
  scoreA={match.current_score_a}
  scoreB={match.current_score_b}
  oversA={match.current_overs_a}
  oversB={match.current_overs_b}
  battingTeam={match.current_batting_team}
  tossWinner={match.toss_winner}
  matchWinner={match.match_winner}
  statusInfo={null}
  status={match.status}
/>
```

The import:
```ts
import { LiveMatchScorecard } from "@/components/match/live-match-scorecard";
```

**Note**: When the match is not live (upcoming or completed), `useMatchPolling` inside `LiveMatchScorecard` will not start polling. The component will simply pass through the server-rendered props to `MatchScorecard` without modification. This means `LiveMatchScorecard` is safe to use for all match statuses -- it's a transparent wrapper when status is not "live".

---

## 10. LiveScoreTicker Cleanup

### Files to Delete

| File | Reason |
|------|--------|
| `web-app/src/components/match/live-score-ticker.tsx` | Dead code. Not imported by any page. Confirmed in codebase analysis. |
| `web-app/src/components/match/live-score-ticker.stories.tsx` | Storybook stories for the deleted component. |

### Files NOT Modified

| File | Reason |
|------|--------|
| `web-app/src/hooks/use-realtime.ts` | Still used by `NotificationBell`. Must remain intact (FR-020). |
| `web-app/src/hooks/use-realtime.test.ts` | Tests for `useRealtime`. Unrelated. |
| `web-app/src/__mocks__/handlers/use-realtime.ts` | Storybook mock for `useRealtime`. Still needed by `NotificationBell` stories. |
| `web-app/src/components/layout/notification-bell.tsx` | Uses `useRealtime` for notifications. Completely unrelated to match scores (FR-020). Will be updated only to import `formatTimeAgo` from `@/lib/utils` instead of defining it locally. |
| `supabase/migrations/005_realtime.sql` | `matches` remains in the Realtime publication (FR-021). |

---

## 11. File-by-File Change Plan

### New Files

| # | File | Description |
|---|------|-------------|
| N1 | `web-app/src/hooks/use-match-polling.ts` | New polling hook. ~100 lines. Full implementation in Section 4. |
| N2 | `web-app/src/components/match/live-match-card.tsx` | Client wrapper for group page live match cards. ~75 lines. Full implementation in Section 6. |
| N3 | `web-app/src/components/match/live-match-scorecard.tsx` | Client wrapper for match leaderboard page. ~75 lines. Full implementation in Section 7. |
| N4 | `web-app/src/hooks/use-match-polling.test.ts` | Unit tests for the polling hook. See Section 14. |

### Modified Files

| # | File | Changes |
|---|------|---------|
| M1 | `web-app/src/components/match/match-scorecard.tsx` | (a) Add `"use client"` directive. (b) Import `RefreshCw` from lucide-react, `formatTimeAgo` from `@/lib/utils`. (c) Extend `MatchScorecardProps` with `onRefresh?`, `isPolling?`, `lastUpdated?`. (d) Add `RefreshButton` internal component. (e) Modify full-mode status header to include refresh button for live and waiting states. (f) Add compact-mode absolute-positioned refresh button. (g) Add `relative` to compact container className. (h) Add last-updated timestamp below score rows. |
| M2 | `web-app/src/app/group/[groupId]/page.tsx` | (a) Import `LiveMatchCard`. (b) Replace `<MatchScorecard compact ...>` for live matches with `<LiveMatchCard matchId={match.id} ...>`. (c) Remove `MatchScorecard` import if no longer used on this page. |
| M3 | `web-app/src/app/group/[groupId]/match/[matchId]/page.tsx` | (a) Import `LiveMatchScorecard`. (b) Replace `<MatchScorecard ...>` with `<LiveMatchScorecard matchId={match.id} ...>`. (c) Remove `MatchScorecard` import. |
| M4 | `web-app/src/types/index.ts` | Add `MatchScoreData` interface and `MatchInitialData` type alias. |
| M5 | `web-app/src/lib/utils.ts` | Add `formatTimeAgo(date: Date \| string): string` utility function. |
| M6 | `web-app/src/components/layout/notification-bell.tsx` | (a) Remove local `formatTimeAgo` function (lines 155-163). (b) Import `formatTimeAgo` from `@/lib/utils`. |

### Deleted Files

| # | File | Reason |
|---|------|--------|
| D1 | `web-app/src/components/match/live-score-ticker.tsx` | Dead code. Not imported by any page. |
| D2 | `web-app/src/components/match/live-score-ticker.stories.tsx` | Stories for deleted component. |

### Untouched Files (explicitly confirmed)

| File | Why Untouched |
|------|---------------|
| `web-app/src/hooks/use-realtime.ts` | Used by `NotificationBell` (FR-020) |
| `web-app/src/hooks/use-realtime.test.ts` | Tests for untouched hook |
| `web-app/src/__mocks__/handlers/use-realtime.ts` | Mock for untouched hook |
| `web-app/src/components/layout/notification-bell.tsx` | Only the `formatTimeAgo` extraction (M6). No behavioral change. |
| `supabase/migrations/005_realtime.sql` | Kept as-is (FR-021) |
| `web-app/src/lib/supabase/client.ts` | Used by the hook, not modified |
| `web-app/src/lib/dal/matches.ts` | Server-side DAL. Not called by client components. |

### Total: 4 new, 6 modified, 2 deleted

---

## 12. Edge Cases

### EC-01: Match completes during polling

**Scenario**: User is watching a live match. The server-side `match-live` edge function sets `status = "completed"`. The next client poll returns the completed status.

**Handling**:
1. `fetchMatch()` receives `data.status === "completed"`.
2. `setMatch(data)` updates state -- `MatchScorecard` now receives `status="completed"`.
3. `stopInterval()` is called immediately, clearing the polling interval.
4. `MatchScorecard` renders in completed mode: `statusInfo` text shown, refresh button hidden (because `status !== "live"` in the status header conditional), "BAT" indicator removed.
5. The `lastUpdated` indicator is also hidden (`lastUpdated && isLive` condition fails).
6. No further network requests.

### EC-02: Component unmounts mid-fetch

**Scenario**: User navigates away from the page while a poll is in-flight.

**Handling**:
1. The main effect's cleanup runs: `mountedRef.current = false`, `stopInterval()`.
2. The in-flight `fetchMatch()` returns from `await`. The `if (!mountedRef.current) return;` guard fires.
3. No `setState` calls occur on the unmounted component.
4. The Supabase HTTP request completes in the background (fire-and-forget). This is acceptable per assumption A-06.

### EC-03: Multiple live matches on same page (double-header)

**Scenario**: Two matches are live simultaneously on the group page.

**Handling**:
1. The group page renders two `<LiveMatchCard>` instances, one per live match.
2. Each creates its own `useMatchPolling` instance with its own `matchId`.
3. Each maintains independent state: `match`, `isLoading`, `lastUpdated`, `intervalIdRef`.
4. Each polls independently at 120s intervals. The intervals are not synchronized (they start at slightly different times due to render order).
5. Both pause/resume together on visibility change (they share the same `document.visibilitychange` event, but each handler operates on its own state).
6. Total network: 2 queries per 120s cycle. Per NFR-002, this is acceptable.

### EC-04: Offline/network error during poll

**Scenario**: The user's device goes offline or the Supabase API returns an error.

**Handling**:
1. The `try/catch` in `fetchMatch()` catches the error.
2. `console.warn` fires in development. No user-visible error.
3. `match` state retains the last successfully fetched data (or `initialData`).
4. `isLoading` resets to `false`.
5. The next `setInterval` tick fires `fetchMatch()` again in 120s, retrying automatically.
6. When connectivity returns, the next poll succeeds and updates the scores.

### EC-05: Rapid manual refresh clicks

**Scenario**: User clicks the refresh button multiple times quickly.

**Handling**:
1. First click: `refresh()` -> `fetchMatch()` sets `isFetchingRef.current = true` and `isLoading = true`.
2. `MatchScorecard` re-renders with `isPolling={true}`, disabling the button (`disabled={true}`).
3. Subsequent clicks: The button is disabled, so no click events fire.
4. Even if a second `refresh()` were called programmatically, the `isFetchingRef.current` guard in `fetchMatch()` would return early.

### EC-06: `status` prop transitions from "upcoming" to "live" via prop change

**Scenario**: The parent server component is re-rendered (e.g., via `router.refresh()` or full navigation), and the match status changed from "upcoming" to "live".

**Handling**:
1. The wrapper component re-renders with `status="live"`.
2. The main `useEffect` in `useMatchPolling` has `status` in its dependency array.
3. The effect re-runs: calls `fetchMatch()` and `startInterval()`.
4. Polling begins. The component is now live.

### EC-07: `status` prop is "upcoming" from the start

**Scenario**: User opens the page when the match hasn't started.

**Handling**:
1. `useMatchPolling` receives `status="upcoming"`.
2. The main `useEffect` runs but hits the `if (status !== "live") return;` guard.
3. No `fetchMatch()`, no `startInterval()`.
4. `MatchScorecard` receives `onRefresh={refresh}`, but the refresh button is not rendered because the status header conditional only shows it when `isLive` is true.
5. No network requests. No polling. The component is effectively a passthrough.

### EC-08: Browser does not support Page Visibility API

**Scenario**: Very old browser without `document.visibilityState`.

**Handling**:
1. The visibility `useEffect` checks `!("visibilityState" in document)` and returns early.
2. No visibility listener is attached.
3. Polling runs continuously at 120s intervals regardless of tab visibility.
4. This is the graceful degradation path per EC-10 in the requirements.

---

## 13. Performance Considerations

### 13.1 Preventing Unnecessary Re-renders

| Technique | Purpose |
|-----------|---------|
| `useMemo` for Supabase client | Creates the browser client once. Prevents re-creation on every render. |
| `useCallback` for `fetchMatch` | Stabilized with `[supabase, matchId]`. Only recreated if matchId changes (which doesn't happen during a component's lifecycle on these pages). |
| `useCallback` for `refresh` | Stabilized with `[fetchMatch, intervalMs]`. `MatchScorecard` receives a stable `onRefresh` reference, preventing unnecessary re-renders of the scorecard. |
| `useRef` for `isFetchingRef`, `intervalIdRef`, `statusRef`, `mountedRef` | These values change frequently but don't affect rendered output. Using refs instead of state avoids re-render cycles. |
| Selective column fetch (`POLL_COLUMNS`) | Fetches only 9 columns instead of the full 30+ column row. Excludes `live_scorecard_json` (~50KB). Reduces network transfer and parse time. |

### 13.2 Bundle Size Impact

- **New code**: ~100 lines (hook) + ~75 lines x2 (wrappers) + ~20 lines (type definitions) + ~10 lines (utility) = ~280 lines of new TypeScript.
- **Removed code**: ~96 lines (`live-score-ticker.tsx`) + ~43 lines (stories) = ~139 lines.
- **Net addition**: ~141 lines.
- **New dependencies**: None (NFR-008). All code uses React hooks, the existing Supabase client, and native browser APIs.
- **New imports in client bundle**: `RefreshCw` from lucide-react (already tree-shaken into the client bundle by `error-state.tsx`).

### 13.3 Network Impact

| Scenario | Queries/minute | Notes |
|----------|----------------|-------|
| Single live match on group page | 0.5 | One query per 120s |
| Single live match on leaderboard page | 0.5 | One query per 120s |
| Double-header on group page (2 live) | 1.0 | Two independent queries per 120s |
| Tab hidden | 0 | Polling paused |
| Match completed | 0 | Polling stopped |
| Manual refresh | +1 (burst) | On-demand, resets interval |

Each query is a single `SELECT` of 9 columns from the `matches` table by primary key. Response size: ~200 bytes JSON. This is negligible load.

### 13.4 Stale Closure Prevention

The `startInterval` and `stopInterval` functions reference `intervalIdRef` (a ref) and `fetchMatch` (a stable callback). They do not close over any stale state. The `fetchMatch` function reads `statusRef.current` (a ref) instead of `status` (a state value), ensuring it always sees the latest status even if the function was created in an earlier render cycle.

---

## 14. Testing Strategy

**File**: `web-app/src/hooks/use-match-polling.test.ts`

### Test Categories

#### 1. Initial State Tests
- Returns `initialData` as `match` before first poll completes.
- `isLoading` is `false` before first poll.
- `lastUpdated` is `null` before first poll.
- `refresh` is a function.

#### 2. Polling Lifecycle Tests
- When `status === "live"`: fires initial fetch on mount.
- When `status === "live"`: sets up 120s interval after initial fetch.
- When `status === "upcoming"`: does not fetch or start interval.
- When `status` changes from "live" to "completed" (prop change): clears interval.
- When polled data returns `status !== "live"`: clears interval.

#### 3. Manual Refresh Tests
- `refresh()` triggers an immediate fetch.
- `refresh()` resets the interval timer.
- `refresh()` while a fetch is in-flight is a no-op (concurrent guard).

#### 4. Page Visibility Tests
- Tab hidden: clears interval.
- Tab visible: fires immediate fetch and restarts interval.

#### 5. Error Handling Tests
- Network error: `match` retains previous value, `isLoading` resets to `false`.
- Invalid `matchId` (no rows returned): `match` set to `null`, polling stops.

#### 6. Cleanup Tests
- Unmount clears interval.
- Unmount prevents setState after in-flight fetch completes.

### Test Approach

- Use `@testing-library/react`'s `renderHook` for hook tests.
- Mock `createClient` from `@/lib/supabase/client` to return a mock Supabase client with `.from().select().eq().single()` chain.
- Use `vi.useFakeTimers()` to control `setInterval` and `setTimeout`.
- Mock `document.visibilityState` and dispatch `visibilitychange` events for visibility tests.
- Use `vi.advanceTimersByTime(120_000)` to simulate interval ticks.

---

## Appendix A: Implementation Order

The recommended implementation sequence (for the PSE implementing this):

1. **M5**: Add `formatTimeAgo` to `web-app/src/lib/utils.ts`.
2. **M6**: Update `notification-bell.tsx` to import from `@/lib/utils`.
3. **M4**: Add `MatchScoreData` and `MatchInitialData` types to `web-app/src/types/index.ts`.
4. **N1**: Implement `useMatchPolling` hook.
5. **N4**: Write tests for `useMatchPolling`.
6. **M1**: Modify `MatchScorecard` (add `"use client"`, new props, refresh button, last-updated).
7. **N2**: Create `LiveMatchCard` wrapper.
8. **N3**: Create `LiveMatchScorecard` wrapper.
9. **M2**: Wire `LiveMatchCard` into the group page.
10. **M3**: Wire `LiveMatchScorecard` into the match leaderboard page.
11. **D1 + D2**: Delete `live-score-ticker.tsx` and its stories.

Each step can be a separate commit. Steps 1-3 are prerequisites. Steps 4-5 can be done in parallel with step 6. Steps 7-8 depend on steps 4 and 6. Steps 9-10 depend on steps 7-8. Step 11 is independent and can be done at any point.
