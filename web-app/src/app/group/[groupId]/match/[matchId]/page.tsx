import type { Metadata } from "next";
import { notFound } from "next/navigation";
import * as matchesDal from "@/lib/dal/matches";
import * as standingsDal from "@/lib/dal/standings";
import { MatchLeaderboard } from "@/components/leaderboard/match-leaderboard";
import { TeamBadge } from "@/components/shared/team-badge";
import { formatMatchDate, formatMatchTime } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface MatchPageProps {
  params: Promise<{ groupId: string; matchId: string }>;
}

export async function generateMetadata({ params }: MatchPageProps): Promise<Metadata> {
  const { matchId } = await params;
  const match = await matchesDal.getMatchById(Number(matchId));
  if (!match) return { title: "Match" };
  return { title: `${match.team_a} vs ${match.team_b} — Leaderboard` };
}

export default async function MatchLeaderboardPage({ params }: MatchPageProps) {
  const { groupId, matchId: matchIdStr } = await params;
  const matchId = Number(matchIdStr);

  if (!matchIdStr || isNaN(matchId) || matchId <= 0) notFound();

  // Auth + membership already verified by layout.tsx
  const [match, leaderboard] = await Promise.all([
    matchesDal.getMatchById(matchId),
    standingsDal.getMatchLeaderboard(groupId, matchId),
  ]);

  if (!match) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={ROUTES.GROUP(groupId)}
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to squad
      </Link>

      {/* Match header */}
      <div className="rounded-[20px] border border-[var(--border-light)] bg-card-gradient p-6">
        <div className="flex items-center justify-between">
          <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Match {match.match_number}
          </span>
          <span className={`font-display text-xs font-semibold ${
            match.status === "completed" ? "text-[var(--success)]" :
            match.status === "live" ? "text-[var(--danger)]" :
            "text-[var(--text-muted)]"
          }`}>
            {match.status === "completed" ? `${match.match_winner} Won` :
             match.status === "live" ? "LIVE" :
             "Upcoming"}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="text-center">
            <TeamBadge teamCode={match.team_a} size="lg" />
            {match.current_score_a && (
              <p className="mt-1 font-stats text-sm text-[var(--text-primary)]">
                {match.current_score_a}
              </p>
            )}
          </div>
          <span className="font-display text-lg font-bold text-[var(--text-muted)]">VS</span>
          <div className="text-center">
            <TeamBadge teamCode={match.team_b} size="lg" />
            {match.current_score_b && (
              <p className="mt-1 font-stats text-sm text-[var(--text-primary)]">
                {match.current_score_b}
              </p>
            )}
          </div>
        </div>
        <p className="mt-3 text-center text-sm text-[var(--text-secondary)]">
          {formatMatchDate(match.date)} · {formatMatchTime(match.time_ist)} · {match.venue}
        </p>
      </div>

      {/* Leaderboard */}
      <MatchLeaderboard entries={leaderboard} currentUserId={user.id} />
    </div>
  );
}
