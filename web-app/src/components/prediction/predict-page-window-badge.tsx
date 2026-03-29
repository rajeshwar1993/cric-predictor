"use client";

import { useMemo } from "react";
import { Clock } from "lucide-react";
import { useCountdown } from "@/hooks/use-countdown";
import { PREDICTION_WINDOW_COPY } from "@/lib/constants";
import { formatWindowDate } from "@/lib/utils";
import type { WindowState } from "@/types";

interface PredictPageWindowBadgeProps {
  /** Window state computed server-side */
  windowState: WindowState;
  /** ISO string: 8 AM IST on match date */
  windowOpen: string;
  /** ISO string: deadline (computeDeadline() result) */
  windowClose: string;
  /** Match date string for display in pre-window message */
  matchDate: string;
}

/**
 * Live countdown badge for the predict page header.
 * Replaces the static "Locked" / "Closes at {time}" text with a
 * window-aware badge that updates in real-time.
 */
export function PredictPageWindowBadge({
  windowState,
  windowOpen,
  windowClose,
  matchDate,
}: PredictPageWindowBadgeProps) {
  const windowOpenDate = useMemo(() => new Date(windowOpen), [windowOpen]);
  const windowCloseDate = useMemo(() => new Date(windowClose), [windowClose]);

  // Countdown to window open (pre-window match day)
  const { display: openDisplay } = useCountdown(
    windowState === "PRE_WINDOW_MATCH_DAY" ? windowOpenDate : null
  );

  // Countdown to deadline (window open)
  const { display: closeDisplay, isExpired: deadlinePassed } = useCountdown(
    windowState === "WINDOW_OPEN" ? windowCloseDate : null
  );

  // Urgency: < 1 hour to deadline
  const isUrgent =
    windowState === "WINDOW_OPEN" &&
    !deadlinePassed &&
    windowCloseDate.getTime() - Date.now() < 60 * 60 * 1000;

  const formattedDate = formatWindowDate(matchDate);

  // Window closed or auto-locked by countdown
  if (windowState === "WINDOW_CLOSED" || deadlinePassed) {
    return (
      <span className="font-stats text-xs text-[var(--danger)]">Locked</span>
    );
  }

  // Window open — live countdown to deadline
  if (windowState === "WINDOW_OPEN") {
    return (
      <span
        aria-live="polite"
        className={`font-stats text-xs ${
          isUrgent
            ? "text-[var(--danger)] animate-pulse"
            : "text-[var(--text-muted)]"
        }`}
      >
        {PREDICTION_WINDOW_COPY.PREDICT_WINDOW_OPEN_BADGE.replace(
          "{countdown}",
          closeDisplay
        )}
      </span>
    );
  }

  // Pre-window match day — countdown to 8 AM
  if (windowState === "PRE_WINDOW_MATCH_DAY") {
    return (
      <span className="inline-flex items-center gap-1 font-stats text-xs text-[var(--warning)]">
        <Clock aria-hidden="true" className="h-3.5 w-3.5" />
        <span aria-live="polite">
          {PREDICTION_WINDOW_COPY.CARD_PRE_WINDOW_TODAY_COUNTDOWN.replace(
            "{countdown}",
            openDisplay
          )}
        </span>
      </span>
    );
  }

  // Pre-window future day
  return (
    <span className="inline-flex items-center gap-1 font-stats text-xs text-[var(--warning)]">
      <Clock aria-hidden="true" className="h-3.5 w-3.5" />
      {PREDICTION_WINDOW_COPY.PREDICT_PRE_WINDOW_BADGE.replace(
        "{matchDate}",
        formattedDate
      )}
    </span>
  );
}
