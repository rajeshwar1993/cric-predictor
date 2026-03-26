"use client";

import { useMemo, useCallback } from "react";
import { useRealtime } from "@/hooks/use-realtime";

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

export function LiveScoreTicker({
  matchId,
  teamA,
  teamB,
  initialScoreA,
  initialScoreB,
  initialOversA,
  initialOversB,
  initialBattingTeam,
  status,
  onUpdate,
}: LiveScoreTickerProps) {
  const isLive = status === "live";

  const handleRealtimeUpdate = useCallback(() => {
    onUpdate?.();
  }, [onUpdate]);

  useRealtime(
    "matches",
    isLive ? `id=eq.${matchId}` : undefined,
    handleRealtimeUpdate
  );

  if (!isLive) return null;

  return (
    <div className="flex items-center justify-center gap-4 rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)] px-5 py-3">
      {/* LIVE badge */}
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--danger)] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--danger)]" />
        </span>
        <span className="font-stats text-[9px] font-semibold uppercase tracking-wider text-[var(--danger)]">
          LIVE
        </span>
      </div>

      {/* Team A */}
      <div className="flex items-center gap-2">
        <span className={`font-display text-[13px] font-semibold ${
          initialBattingTeam === teamA ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
        }`}>
          {teamA}
        </span>
        <span className="font-stats text-base font-semibold text-[var(--text-primary)]">
          {initialScoreA || "Yet to bat"}
        </span>
        {initialOversA != null && (
          <span className="font-stats text-[11px] text-[var(--text-muted)]">
            ({initialOversA})
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-[var(--border-medium)]" />

      {/* Team B */}
      <div className="flex items-center gap-2">
        <span className={`font-display text-[13px] font-semibold ${
          initialBattingTeam === teamB ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
        }`}>
          {teamB}
        </span>
        <span className="font-stats text-base font-semibold text-[var(--text-primary)]">
          {initialScoreB || "Yet to bat"}
        </span>
        {initialOversB != null && (
          <span className="font-stats text-[11px] text-[var(--text-muted)]">
            ({initialOversB})
          </span>
        )}
      </div>
    </div>
  );
}
