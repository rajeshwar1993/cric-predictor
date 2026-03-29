"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MatchScoreData } from "@/types";
import type { MatchStatus } from "@/types/database";

/** Columns fetched by the polling query — excludes live_scorecard_json */
const POLL_COLUMNS =
  "id, current_score_a, current_score_b, current_overs_a, current_overs_b, current_batting_team, toss_winner, match_winner, status";

const DEFAULT_INTERVAL_MS = 120_000; // 2 minutes

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
  const isFetchingRef = useRef(false); // Concurrent-fetch guard
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef(status); // Track latest status without re-subscribing effects
  const mountedRef = useRef(true); // Guard against setState on unmounted component

  // Keep statusRef in sync with prop
  statusRef.current = status;

  // --- Interval management helpers (use refs, not state) ---
  const stopInterval = useCallback(() => {
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

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
          console.warn(
            `[useMatchPolling] Poll failed for match ${matchId}:`,
            error.message
          );
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
  }, [supabase, matchId, stopInterval]);

  const startInterval = useCallback(() => {
    stopInterval(); // Clear any existing interval first
    intervalIdRef.current = setInterval(fetchMatch, intervalMs);
  }, [stopInterval, fetchMatch, intervalMs]);

  // --- Manual refresh (stable reference via useCallback) ---
  const refresh = useCallback(() => {
    fetchMatch();
    // FR-007: Reset interval so next auto-poll is a full interval later
    if (statusRef.current === "live") {
      startInterval();
    }
  }, [fetchMatch, startInterval]);

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
  }, [status, fetchMatch, startInterval, stopInterval]);

  // --- Page Visibility API ---
  useEffect(() => {
    // EC-10: Graceful degradation if API not supported
    if (
      typeof document === "undefined" ||
      typeof document.addEventListener !== "function"
    ) {
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
  }, [fetchMatch, startInterval, stopInterval]);

  return { match, isLoading, lastUpdated, refresh };
}
