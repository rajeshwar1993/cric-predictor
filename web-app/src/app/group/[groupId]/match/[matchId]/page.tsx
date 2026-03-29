import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/get-user-cached";
import * as matchesDal from "@/lib/dal/matches";
import * as standingsDal from "@/lib/dal/standings";
import { MatchLeaderboard } from "@/components/leaderboard/match-leaderboard";
import { PredictionRevealSection } from "@/components/leaderboard/prediction-reveal-section";
import { LiveMatchScorecard } from "@/components/match/live-match-scorecard";
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
  const user = (await getAuthUser())!;

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
        <div className="flex items-center justify-between mb-4">
          <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Match {match.match_number}
          </span>
        </div>

        {/* Scorecard */}
        <LiveMatchScorecard
          matchId={match.id}
          teamA={match.team_a}
          teamB={match.team_b}
          scoreA={match.current_score_a}
          scoreB={match.current_score_b}
          oversA={match.current_overs_a}
          oversB={match.current_overs_b}
          battingTeam={match.current_batting_team}
          tossWinner={match.toss_winner}
          matchWinner={match.match_winner}
          statusInfo={null}
          status={match.status}
        />

        <p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
          {formatMatchDate(match.date)} · {formatMatchTime(match.time_ist)} · {match.venue}
        </p>
      </div>

      {/* Leaderboard */}
      <MatchLeaderboard entries={leaderboard} currentUserId={user.id} />

      {/* Prediction Reveal Table */}
      <PredictionRevealSection
        groupId={groupId}
        matchId={matchId}
        currentUserId={user.id}
        matchStatus={match.status}
        matchDate={match.date}
        matchTimeIst={match.time_ist}
        teamA={match.team_a}
        teamB={match.team_b}
        matchNumber={match.match_number}
        leaderboard={leaderboard}
      />
    </div>
  );
}
