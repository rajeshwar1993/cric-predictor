"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { useCountdown } from "@/hooks/use-countdown";
import { PREDICTION_WINDOW_COPY } from "@/lib/constants";
import { formatWindowDate } from "@/lib/utils";

interface PreWindowBannerProps {
  /** ISO string: 8 AM IST on match date */
  windowOpen: string;
  /** Match date string (e.g., "2026-04-01") for display */
  matchDate: string;
  /** Whether confirmed match squads are available (P1 - FR-014) */
  squadsAvailable: boolean;
  /** Whether today is the match date (enables countdown) */
  isMatchDay: boolean;
}

/**
 * Shown on the predict page IN PLACE OF PredictionForm when the prediction
 * window hasn't opened yet. Explains when the window opens with a countdown
 * on match day, and transitions to a "start predicting" prompt at 8 AM.
 *
 * Visual pattern follows RevealLockedPlaceholder (centered card with icon
 * circle, title, subtitle, countdown).
 */
export function PreWindowBanner({
  windowOpen,
  matchDate,
  squadsAvailable,
  isMatchDay,
}: PreWindowBannerProps) {
  const router = useRouter();
  const windowOpenDate = useMemo(() => new Date(windowOpen), [windowOpen]);
  const [hasTransitioned, setHasTransitioned] = useState(false);

  // Countdown to window opening (only on match day)
  const { display, isExpired } = useCountdown(
    isMatchDay ? windowOpenDate : null
  );

  const formattedDate = formatWindowDate(matchDate);

  // Transition: window just opened (8 AM arrived while user was on page)
  // Moved to useEffect to avoid setState during render
  useEffect(() => {
    if (isMatchDay && isExpired && !hasTransitioned) {
      setHasTransitioned(true);
    }
  }, [isMatchDay, isExpired, hasTransitioned]);

  if (hasTransitioned) {
    return (
      <div
        role="status"
        aria-label="Prediction window is now open"
        className="rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)] p-6 sm:p-8 text-center"
      >
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--success)_10%,transparent)]">
            <Clock
              aria-hidden="true"
              className="h-8 w-8 text-[var(--success)]"
            />
          </div>

          <h3 className="mt-4 font-display text-base font-semibold text-[var(--success)]">
            {PREDICTION_WINDOW_COPY.PREDICT_WINDOW_JUST_OPENED}
          </h3>

          <button
            type="button"
            onClick={() => router.refresh()}
            autoFocus
            className="mt-4 cta-gradient text-[var(--text-inverse)] rounded-xl px-5 py-2.5 font-display text-sm font-semibold transition-opacity hover:opacity-90"
          >
            Start Predicting
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="Prediction window not yet open"
      className="rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)] p-6 sm:p-8 text-center"
    >
      <div className="flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
          <Clock
            aria-hidden="true"
            className="h-8 w-8 text-[var(--text-muted)]"
          />
        </div>

        <h3 className="mt-4 font-display text-base font-semibold text-[var(--text-primary)]">
          {PREDICTION_WINDOW_COPY.PREDICT_PRE_WINDOW_TITLE}
        </h3>

        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {PREDICTION_WINDOW_COPY.PREDICT_PRE_WINDOW_BODY.replace(
            "{matchDate}",
            formattedDate
          )}
        </p>

        {!squadsAvailable && (
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {PREDICTION_WINDOW_COPY.SQUADS_PENDING_NOTE}
          </p>
        )}

        {isMatchDay && !isExpired && (
          <p
            aria-live="polite"
            className="mt-3 font-stats text-sm text-[var(--warning)]"
          >
            {PREDICTION_WINDOW_COPY.CARD_PRE_WINDOW_TODAY_COUNTDOWN.replace(
              "{countdown}",
              display
            )}
          </p>
        )}
      </div>
    </div>
  );
}
