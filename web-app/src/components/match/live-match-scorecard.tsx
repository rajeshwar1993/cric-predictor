"use client";

import { useMatchPolling } from "@/hooks/use-match-polling";
import { MatchScorecard } from "@/components/match/match-scorecard";
import type { MatchStatus } from "@/types/database";

interface LiveMatchScorecardProps {
  matchId: number;
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
  status: MatchStatus;
}

/**
 * Client wrapper for the full-size match scorecard on the match leaderboard page.
 * Manages polling lifecycle via useMatchPolling and passes
 * fresh data + refresh controls to the presentational MatchScorecard.
 */
export function LiveMatchScorecard({
  matchId,
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
}: LiveMatchScorecardProps) {
  const { match, isLoading, lastUpdated, refresh } = useMatchPolling({
    matchId,
    status,
    initialData: {
      id: matchId,
      current_score_a: scoreA,
      current_score_b: scoreB,
      current_overs_a: oversA,
      current_overs_b: oversB,
      current_batting_team: battingTeam,
      toss_winner: tossWinner,
      match_winner: matchWinner,
      status,
    },
  });

  const displayStatus = match?.status ?? status;
  const displayScoreA = match?.current_score_a ?? scoreA;
  const displayScoreB = match?.current_score_b ?? scoreB;
  const displayOversA = match?.current_overs_a ?? oversA;
  const displayOversB = match?.current_overs_b ?? oversB;
  const displayBattingTeam = match?.current_batting_team ?? battingTeam;
  const displayTossWinner = match?.toss_winner ?? tossWinner;
  const displayMatchWinner = match?.match_winner ?? matchWinner;

  return (
    <MatchScorecard
      teamA={teamA}
      teamB={teamB}
      scoreA={displayScoreA}
      scoreB={displayScoreB}
      oversA={displayOversA}
      oversB={displayOversB}
      battingTeam={displayBattingTeam}
      tossWinner={displayTossWinner}
      matchWinner={displayMatchWinner}
      statusInfo={displayStatus === "completed" ? statusInfo : null}
      status={displayStatus}
      onRefresh={refresh}
      isPolling={isLoading}
      lastUpdated={lastUpdated}
    />
  );
}
