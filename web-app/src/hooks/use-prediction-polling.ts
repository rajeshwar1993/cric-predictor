"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MatchStatus } from "@/types/database";
import type { RevealCellData } from "@/types";

const DEFAULT_INTERVAL_MS = 30_000; // 30 seconds

type PredictionMatrix = Record<string, Record<string, RevealCellData>>;

interface UsePredictionPollingOptions {
  /** Scenario IDs to poll predictions for */
  scenarioIds: string[];
  /** Current match status -- polling only occurs when "live" */
  matchStatus: MatchStatus;
  /** Server-rendered initial prediction matrix */
  initialData: PredictionMatrix;
  /** Polling interval in ms. Default: 30_000 (30 seconds). */
  intervalMs?: number;
}

interface UsePredictionPollingReturn {
  /** Latest prediction matrix (server-initial until first poll, then polled) */
  predictions: PredictionMatrix;
  /** True while polling is actively running */
  isPolling: boolean;
}

/**
 * Client-side polling hook for live prediction resolution updates.
 *
 * Polls the `predictions` table every `intervalMs` (default 30s) when match
 * status is "live". Only fetches `is_correct` changes (values never change
 * after submission). Merges updated resolution state into the existing matrix.
 *
 * Pauses when the browser tab is hidden (Page Visibility API).
 * Prevents concurrent fetches. Silently swallows errors.
 */
export function usePredictionPolling({
  scenarioIds,
  matchStatus,
  initialData,
  intervalMs = DEFAULT_INTERVAL_MS,
}: UsePredictionPollingOptions): UsePredictionPollingReturn {
  const supabase = useMemo(() => createClient(), []);
  const [predictions, setPredictions] = useState<PredictionMatrix>(initialData);
  const [isPolling, setIsPolling] = useState(false);

  // --- Refs for stable references across renders ---
  const isFetchingRef = useRef(false);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef(matchStatus);
  const scenarioIdsRef = useRef(scenarioIds);
  const mountedRef = useRef(true);

  // Keep refs in sync with props
  statusRef.current = matchStatus;
  scenarioIdsRef.current = scenarioIds;

  // --- Interval management helpers ---
  const stopInterval = useCallback(() => {
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // --- Core fetch function ---
  const fetchPredictions = useCallback(async () => {
    if (isFetchingRef.current) return;
    if (statusRef.current !== "live") return;
    if (scenarioIdsRef.current.length === 0) return;

    isFetchingRef.current = true;

    try {
      const { data, error } = await supabase
        .from("predictions")
        .select("user_id, scenario_id, is_correct")
        .in("scenario_id", scenarioIdsRef.current);

      if (!mountedRef.current) return;

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[usePredictionPolling] Poll failed:",
            error.message
          );
        }
        return;
      }

      if (data) {
        const pollRows = data as PollRow[];

        setPredictions((current) =>
          mergePollResults(current, pollRows)
        );

        // Self-stop: if every polled prediction has a non-null is_correct,
        // all scenarios are resolved and polling is no longer needed.
        // This mirrors useMatchPolling's self-stop pattern (checking response
        // data rather than relying solely on the external matchStatus prop).
        if (
          pollRows.length > 0 &&
          pollRows.every((row) => row.is_correct !== null)
        ) {
          stopInterval();
        }
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [supabase, stopInterval]);

  const startInterval = useCallback(() => {
    stopInterval();
    intervalIdRef.current = setInterval(fetchPredictions, intervalMs);
    setIsPolling(true);
  }, [stopInterval, fetchPredictions, intervalMs]);

  // --- Main polling effect ---
  useEffect(() => {
    mountedRef.current = true;

    if (matchStatus !== "live") {
      stopInterval();
      return;
    }

    fetchPredictions();
    startInterval();

    return () => {
      mountedRef.current = false;
      stopInterval();
    };
  }, [matchStatus, fetchPredictions, startInterval, stopInterval]);

  // --- Page Visibility API ---
  useEffect(() => {
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
        stopInterval();
      } else if (document.visibilityState === "visible") {
        fetchPredictions();
        startInterval();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchPredictions, startInterval, stopInterval]);

  return { predictions, isPolling };
}

// --- Internal types and helpers ---

interface PollRow {
  user_id: string;
  scenario_id: string;
  is_correct: boolean | null;
}

/**
 * Immutable merge of poll results into the existing prediction matrix.
 * Only updates `isCorrect` -- preserves the original `value` from SSR data.
 */
function mergePollResults(
  current: PredictionMatrix,
  pollData: PollRow[]
): PredictionMatrix {
  let hasChanges = false;
  const updated = { ...current };

  for (const row of pollData) {
    const userPreds = updated[row.user_id];
    if (userPreds && userPreds[row.scenario_id]) {
      if (userPreds[row.scenario_id].isCorrect !== row.is_correct) {
        hasChanges = true;
        updated[row.user_id] = {
          ...userPreds,
          [row.scenario_id]: {
            ...userPreds[row.scenario_id],
            isCorrect: row.is_correct,
          },
        };
      }
    }
  }

  return hasChanges ? updated : current;
}
