import { Crown, Shield, User } from "lucide-react";
import type { SeasonStanding, MemberRole } from "@/types";

interface SeasonStandingsProps {
  entries: SeasonStanding[];
  currentUserId: string;
}

function getRankColor(rank: number): string {
  if (rank === 1) return "var(--gold)";
  if (rank === 2) return "var(--cyan)";
  if (rank === 3) return "var(--text-primary)";
  return "var(--text-secondary)";
}

const ROLE_ICONS: Record<MemberRole, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  member: User,
};

export function SeasonStandings({ entries, currentUserId }: SeasonStandingsProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)] p-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          No standings yet. Predict a match to see the leaderboard!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)] overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[36px_1fr_60px_60px_60px_60px] items-center gap-2 border-b border-[var(--border-light)] px-4 py-2.5">
        <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--text-muted)]">#</span>
        <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--text-muted)]">Player</span>
        <span className="text-right text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--text-muted)]">Pts</span>
        <span className="text-right text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--text-muted)]">Matches</span>
        <span className="text-right text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--text-muted)]">Avg</span>
        <span className="text-right text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--text-muted)]">Acc%</span>
      </div>

      {/* Rows */}
      {entries.map((entry) => {
        const isCurrentUser = entry.user_id === currentUserId;
        const rankColor = getRankColor(entry.rank);
        const RoleIcon = ROLE_ICONS[entry.role] || User;

        return (
          <div
            key={entry.user_id}
            className={`grid grid-cols-[36px_1fr_60px_60px_60px_60px] items-center gap-2 px-4 py-3 transition-colors ${
              isCurrentUser
                ? "bg-[var(--cyan-soft)] border-l-2 border-l-[var(--cyan)]"
                : "border-l-2 border-l-transparent hover:bg-[var(--bg-hover)]"
            }`}
          >
            <span className="font-stats text-sm font-bold" style={{ color: rankColor }}>
              {entry.rank}
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <RoleIcon
                className="h-3 w-3 shrink-0"
                style={{
                  color: entry.role === "owner" ? "var(--gold)" :
                         entry.role === "admin" ? "var(--cyan)" : "var(--text-muted)",
                }}
              />
              <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                {entry.display_name}
                {isCurrentUser && (
                  <span className="ml-1 text-xs text-[var(--text-muted)]">(you)</span>
                )}
              </span>
            </div>
            <span className="text-right font-stats text-sm font-semibold" style={{ color: rankColor }}>
              {entry.total_points}
            </span>
            <span className="text-right font-stats text-sm text-[var(--text-muted)]">
              {entry.matches_predicted}
            </span>
            <span className="text-right font-stats text-sm text-[var(--text-muted)]">
              {entry.points_per_match}
            </span>
            <span className="text-right font-stats text-sm text-[var(--text-muted)]">
              {entry.accuracy_pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
