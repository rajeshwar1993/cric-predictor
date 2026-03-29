"use client";

import { Lock } from "lucide-react";
import { useCountdown } from "@/hooks/use-countdown";
import { REVEAL_TABLE_COPY } from "@/lib/constants";

interface RevealLockedPlaceholderProps {
  deadline: Date;
}

/**
 * Pre-lock placeholder for the Prediction Reveal Table.
 * Displays a lock icon, message, and countdown timer until the prediction
 * deadline passes. Uses the useCountdown hook for a live-updating timer.
 */
export function RevealLockedPlaceholder({
  deadline,
}: RevealLockedPlaceholderProps) {
  const { display, isExpired } = useCountdown(deadline);

  // Compute if deadline is imminent (under 1 hour)
  const isImminent =
    !isExpired && deadline.getTime() - Date.now() < 60 * 60 * 1000;

  const message = isImminent
    ? REVEAL_TABLE_COPY.PRE_LOCK_IMMINENT
    : REVEAL_TABLE_COPY.PRE_LOCK_MESSAGE;

  return (
    <div className="rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)] p-8 text-center">
      <div className="flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
          <Lock
            aria-hidden="true"
            className="h-8 w-8 text-[var(--text-muted)]"
          />
        </div>

        <h3 className="mt-4 font-display text-base font-semibold text-[var(--text-primary)]">
          Picks Under Wraps
        </h3>

        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {isExpired
            ? REVEAL_TABLE_COPY.PRE_LOCK_GENERIC
            : message}
        </p>

        {!isExpired && (
          <p
            aria-live="polite"
            className="mt-2 font-stats text-sm text-[var(--cyan)]"
          >
            Reveal in {display}
          </p>
        )}
      </div>
    </div>
  );
}
