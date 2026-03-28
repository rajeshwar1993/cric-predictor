import { TeamBadge } from "@/components/shared/team-badge";

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
}

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
}: MatchScorecardProps) {
  const isLive = status === "live";
  const isCompleted = status === "completed";
  const hasScores = scoreA || scoreB;
  const isWaiting = isLive && !hasScores;

  const textSize = compact ? "text-xs" : "text-sm";
  const scoreSize = compact ? "text-sm font-bold" : "text-lg font-bold";
  const padding = compact ? "py-2" : "rounded-xl bg-[var(--bg-card)] p-5";

  return (
    <div className={padding}>
      {/* Status header */}
      {!compact && (
        <div className="mb-3">
          {isCompleted && statusInfo ? (
            <p className={`${textSize} font-display font-semibold text-[var(--success)]`}>
              {statusInfo}
            </p>
          ) : isWaiting && tossWinner ? (
            <p className={`${textSize} text-[var(--text-secondary)]`}>
              Toss: <span className="font-semibold text-[var(--text-primary)]">{tossWinner}</span> won the toss
            </p>
          ) : isLive ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
              </span>
              <span className={`${textSize} font-display font-semibold text-[var(--success)]`}>Live</span>
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
    </div>
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
