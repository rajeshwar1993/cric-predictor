import type { MatchLeaderboardEntry } from "@/types";

interface MatchLeaderboardProps {
  entries: MatchLeaderboardEntry[];
  currentUserId: string;
}

function getRankColor(rank: number): string {
  if (rank === 1) return "var(--gold)";
  if (rank === 2) return "var(--cyan)";
  return "var(--text-secondary)";
}

export function MatchLeaderboard({ entries, currentUserId }: MatchLeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)] p-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          Nobody&apos;s made a call yet — be the first one in!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
        Match Leaderboard
      </h2>
      <div className="rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[40px_1fr_60px_60px] sm:grid-cols-[40px_1fr_80px_80px_80px] items-center gap-2 border-b border-[var(--border-light)] px-4 py-2.5">
          <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--text-muted)]">#</span>
          <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--text-muted)]">Player</span>
          <span className="text-right text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--text-muted)]">Correct</span>
          <span className="hidden sm:block text-right text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--text-muted)]">Predicted</span>
          <span className="text-right text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--text-muted)]">Points</span>
        </div>

        {/* Rows */}
        {entries.map((entry) => {
          const isCurrentUser = entry.user_id === currentUserId;
          const rankColor = getRankColor(entry.rank);

          return (
            <div
              key={entry.user_id}
              className={`grid grid-cols-[40px_1fr_60px_60px] sm:grid-cols-[40px_1fr_80px_80px_80px] items-center gap-2 px-4 py-3 transition-colors ${
                isCurrentUser
                  ? "bg-[var(--cyan-soft)] border-l-2 border-l-[var(--cyan)]"
                  : "border-l-2 border-l-transparent hover:bg-[var(--bg-hover)]"
              }`}
            >
              <span
                className="font-stats text-sm font-bold"
                style={{ color: rankColor }}
              >
                {entry.rank}
              </span>
              <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                {entry.display_name}
                {isCurrentUser && (
                  <span className="ml-1 text-xs text-[var(--text-muted)]">(you)</span>
                )}
              </span>
              <span className="text-right font-stats text-sm text-[var(--success)]">
                {entry.correct_count}/{entry.resolved_count}
              </span>
              <span className="hidden sm:block text-right font-stats text-sm text-[var(--text-muted)]">
                {entry.predicted_count}
              </span>
              <div className="text-right">
                <span className="font-stats text-sm font-semibold" style={{ color: rankColor }}>
                  {entry.match_points}
                </span>
                <span className="ml-0.5 text-[10px] text-[var(--text-muted)]">pts</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
