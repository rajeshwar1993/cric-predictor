"use client";

import { TeamBadge } from "@/components/shared/team-badge";
import { RefreshCw } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

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
  compact?: boolean;
  /** Callback for manual refresh. If undefined, refresh button is not rendered. */
  onRefresh?: () => void;
  /** True while a fetch (auto or manual) is in-flight. Controls spinner state. */
  isPolling?: boolean;
  /** Timestamp of last successful data fetch. Shown as relative time. */
  lastUpdated?: Date | null;
}

/**
 * Presentational scorecard component for displaying match scores.
 * Supports both compact (inline card) and full (standalone) modes.
 * When polling props are provided, shows a refresh button and last-updated indicator.
 */
export function MatchScorecard({
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
  compact = false,
  onRefresh,
  isPolling = false,
  lastUpdated = null,
}: MatchScorecardProps) {
  const isLive = status === "live";
  const isCompleted = status === "completed";
  const hasScores = scoreA || scoreB;
  const isWaiting = isLive && !hasScores;

  const textSize = compact ? "text-xs" : "text-sm";
  const scoreSize = compact ? "text-sm font-bold" : "text-lg font-bold";
  const padding = compact ? "py-2" : "rounded-xl bg-[var(--bg-card)] p-5";

  return (
    <div className={`${padding} ${compact ? "relative" : ""}`}>
      {/* Compact mode refresh button — absolutely positioned top-right */}
      {compact && onRefresh && isLive && (
        <div className="absolute top-0 right-0">
          <RefreshButton onRefresh={onRefresh} isPolling={isPolling} compact={true} />
        </div>
      )}

      {/* Status header */}
      {!compact && (
        <div className="mb-3">
          {isCompleted && statusInfo ? (
            <p className={`${textSize} font-display font-semibold text-[var(--success)]`}>
              {statusInfo}
            </p>
          ) : isWaiting && tossWinner ? (
            <div className="flex items-center justify-between">
              <p className={`${textSize} text-[var(--text-secondary)]`}>
                Toss: <span className="font-semibold text-[var(--text-primary)]">{tossWinner}</span> won the toss
              </p>
              {onRefresh && (
                <RefreshButton onRefresh={onRefresh} isPolling={isPolling} compact={false} />
              )}
            </div>
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
          ) : null}
        </div>
      )}

      {/* Toss info for compact waiting state */}
      {compact && isWaiting && tossWinner && (
        <p className="mb-2 text-[10px] text-[var(--text-secondary)]">
          Toss: <span className="font-semibold">{tossWinner}</span> won
        </p>
      )}

      {/* Team scores */}
      <div className="space-y-2">
        <ScoreRow
          team={teamA}
          score={isWaiting ? "0/0" : (scoreA || "—")}
          overs={isWaiting ? 0 : oversA}
          isBatting={battingTeam === teamA}
          isWaiting={isWaiting}
          compact={compact}
          scoreSize={scoreSize}
          textSize={textSize}
        />
        <ScoreRow
          team={teamB}
          score={isWaiting ? "Yet to bat" : (scoreB || "—")}
          overs={isWaiting ? null : oversB}
          isBatting={battingTeam === teamB}
          isWaiting={isWaiting}
          compact={compact}
          scoreSize={scoreSize}
          textSize={textSize}
        />
      </div>

      {/* Waiting state message */}
      {isWaiting && (
        <p className={`mt-3 flex items-center gap-1.5 ${compact ? "text-[10px]" : "text-xs"} text-[var(--text-muted)]`}>
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-[var(--bg-elevated)]" />
          Waiting for the first ball...
        </p>
      )}

      {/* Last updated timestamp */}
      {lastUpdated && isLive && (
        <p className={`${compact ? "mt-1.5 text-[10px]" : "mt-2 text-xs"} text-[var(--text-muted)]`}>
          Updated {formatTimeAgo(lastUpdated)}
        </p>
      )}
    </div>
  );
}

/** Internal refresh button component for both compact and full modes. */
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
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onRefresh();
      }}
      disabled={isPolling}
      aria-label="Refresh scores"
      aria-busy={isPolling || undefined}
      className={`flex items-center justify-center ${buttonSize} rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors active:scale-95 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-[var(--text-muted)]`}
    >
      <RefreshCw className={`${iconSize} ${isPolling ? "animate-spin" : ""}`} />
    </button>
  );
}

function ScoreRow({
  team,
  score,
  overs,
  isBatting,
  isWaiting,
  compact,
  scoreSize,
  textSize,
}: {
  team: string;
  score: string;
  overs: number | null;
  isBatting: boolean;
  isWaiting: boolean;
  compact: boolean;
  scoreSize: string;
  textSize: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <TeamBadge teamCode={team} size="sm" />
        <span className={`${compact ? "text-xs" : "text-sm"} font-display font-semibold text-[var(--text-primary)]`}>
          {team}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`${scoreSize} ${score === "Yet to bat" ? "text-[var(--text-muted)] font-normal text-xs" : "text-[var(--text-primary)]"}`}>
          {score}
        </span>
        {overs !== null && overs !== undefined && !isWaiting && score !== "Yet to bat" && score !== "—" && (
          <span className={`${textSize} text-[var(--text-muted)]`}>
            ({overs})
          </span>
        )}
        {isBatting && !isWaiting && (
          <span className={`${compact ? "text-[9px]" : "text-[10px]"} font-display font-semibold text-[var(--cyan)]`}>
            BAT
          </span>
        )}
      </div>
    </div>
  );
}
