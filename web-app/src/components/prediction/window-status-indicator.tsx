"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, Lock } from "lucide-react";
import { useCountdown } from "@/hooks/use-countdown";
import { PREDICTION_WINDOW_COPY } from "@/lib/constants";
import { ROUTES } from "@/lib/constants";
import { formatWindowDate } from "@/lib/utils";

interface WindowStatusIndicatorProps {
  /** Match ID for building the predict URL */
  matchId: number;
  /** Match date string (e.g., "2026-04-01") */
  matchDate: string;
  /** Group ID for building the predict URL */
  groupId: string;
  /** Whether this is the primary (next) match — uses gradient CTA style */
  isPrimary: boolean;
  /** ISO string: 8 AM IST on matchDate (precomputed server-side) */
  windowOpen: string;
  /** ISO string: computeDeadline() result (precomputed server-side) */
  windowClose: string;
}

/**
 * Replaces the "Make Your Calls" / "Predict Early" button and deadline text
 * on group page match cards with a 4-state window indicator that includes
 * live countdowns.
 *
 * States:
 * - Pre-window (future day): informational text, no button
 * - Pre-window (match day): countdown to 8 AM, no button
 * - Window open: CTA button + countdown to deadline
 * - Window closed: locked text
 */
export function WindowStatusIndicator({
  matchId,
  matchDate,
  groupId,
  isPrimary,
  windowOpen,
  windowClose,
}: WindowStatusIndicatorProps) {
  const router = useRouter();
  const windowOpenDate = useMemo(() => new Date(windowOpen), [windowOpen]);
  const windowCloseDate = useMemo(() => new Date(windowClose), [windowClose]);

  // Derive zero-window check early to gate timers
  const isZeroWindow = windowCloseDate <= windowOpenDate;

  // Only run open countdown when window hasn't opened yet and it's not a zero-window
  const { display: openDisplay, isExpired: windowHasOpened } =
    useCountdown(!isZeroWindow ? windowOpenDate : null);

  // Only run close countdown when window can open and deadline hasn't been statically ruled out
  const { display: closeDisplay, isExpired: deadlinePassed } =
    useCountdown(!isZeroWindow ? windowCloseDate : null);

  // Track if user has seen the transition
  const [showTransition, setShowTransition] = useState(false);

  // Determine urgency for < 1 hour remaining
  const isUrgent =
    !deadlinePassed &&
    windowCloseDate.getTime() - Date.now() < 60 * 60 * 1000;

  // Formatted match date for copy
  const formattedDate = formatWindowDate(matchDate);

  // Zero-duration window edge case
  if (isZeroWindow) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Lock aria-hidden="true" className="h-4 w-4 text-[var(--danger)]" />
          <span className="font-display text-xs text-[var(--danger)]">
            {PREDICTION_WINDOW_COPY.ZERO_WINDOW}
          </span>
        </div>
      </div>
    );
  }

  // State 4: Window closed (deadline passed)
  if (deadlinePassed) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Lock aria-hidden="true" className="h-4 w-4 text-[var(--danger)]" />
          <span className="font-display text-xs text-[var(--danger)]">
            {PREDICTION_WINDOW_COPY.CARD_WINDOW_CLOSED}
          </span>
        </div>
      </div>
    );
  }

  // State 3: Window open
  if (windowHasOpened && !deadlinePassed) {
    return (
      <div className="flex flex-col gap-2">
        <Link
          href={ROUTES.PREDICT(groupId, matchId)}
          className={`w-full sm:w-auto text-center rounded-xl px-5 py-2.5 font-display text-sm font-semibold transition-opacity ${
            isPrimary
              ? "cta-gradient text-[var(--text-inverse)] hover:opacity-90"
              : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          }`}
        >
          {PREDICTION_WINDOW_COPY.CARD_WINDOW_OPEN_CTA}
        </Link>
        <p
          aria-live="polite"
          className={`text-xs font-stats text-[var(--danger)] ${
            isUrgent ? "animate-pulse" : ""
          }`}
        >
          {PREDICTION_WINDOW_COPY.CARD_WINDOW_OPEN_DEADLINE.replace(
            "{countdown}",
            closeDisplay
          )}
        </p>
      </div>
    );
  }

  // Determine if it's match day or future day
  // IST is always UTC+05:30 (no DST). Use explicit offset arithmetic
  // instead of toLocaleString which is fragile across runtimes.
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  const matchDayIST = new Date(
    new Date(matchDate + "T00:00:00+05:30").getTime() + IST_OFFSET_MS
  );
  const isMatchDay =
    nowIST.getUTCFullYear() === matchDayIST.getUTCFullYear() &&
    nowIST.getUTCMonth() === matchDayIST.getUTCMonth() &&
    nowIST.getUTCDate() === matchDayIST.getUTCDate();

  // State 2 → 3 transition: window just opened (moved to useEffect to avoid setState during render)
  useEffect(() => {
    if (isMatchDay && windowHasOpened && !showTransition) {
      setShowTransition(true);
    }
  }, [isMatchDay, windowHasOpened, showTransition]);

  if (showTransition) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => router.refresh()}
          className="w-full sm:w-auto text-center rounded-xl py-3 px-4 bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)] font-display text-sm font-semibold transition-opacity duration-300 hover:opacity-90"
        >
          {PREDICTION_WINDOW_COPY.PREDICT_WINDOW_JUST_OPENED}
        </button>
      </div>
    );
  }

  // State 2: Pre-window (match day, before 8 AM)
  if (isMatchDay) {
    return (
      <div className="flex flex-col gap-2">
        <div
          role="status"
          className="rounded-xl px-4 py-2.5 bg-[color-mix(in_srgb,var(--warning)_8%,transparent)]"
        >
          <div className="flex items-center gap-1.5">
            <Clock
              aria-hidden="true"
              className="h-4 w-4 text-[var(--warning)]"
            />
            <span className="font-display text-xs text-[var(--text-secondary)]">
              {PREDICTION_WINDOW_COPY.CARD_PRE_WINDOW_TODAY}
            </span>
          </div>
          <p
            aria-live="polite"
            className="mt-1 font-stats text-xs text-[var(--warning)]"
          >
            {PREDICTION_WINDOW_COPY.CARD_PRE_WINDOW_TODAY_COUNTDOWN.replace(
              "{countdown}",
              openDisplay
            )}
          </p>
        </div>
      </div>
    );
  }

  // State 1: Pre-window (future day)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Clock
          aria-hidden="true"
          className="h-4 w-4 text-[var(--text-muted)]"
        />
        <span className="font-display text-xs text-[var(--text-muted)]">
          {PREDICTION_WINDOW_COPY.CARD_PRE_WINDOW_FUTURE.replace(
            "{matchDate}",
            formattedDate
          )}
        </span>
      </div>
    </div>
  );
}
