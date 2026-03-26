import type { ScorecardResponse } from "@/types/cricket-api";

export type TrackStatus = "correct" | "wrong" | "on_track" | "in_danger" | "pending";

interface LiveMatchState {
  scorecard: ScorecardResponse;
  matchStatus: string;
}

/**
 * Compute the "on track" status for a single prediction during a live match.
 * Returns a TrackStatus based on current match data.
 */
export function computeTrackStatus(
  category: string | null,
  predictedValue: string,
  liveState: LiveMatchState
): TrackStatus {
  const { scorecard, matchStatus } = liveState;

  // If match is completed, use resolved status (this should come from DB, not here)
  if (matchStatus === "completed") return "pending";

  if (!scorecard.scorecard || scorecard.scorecard.length === 0) {
    // Only toss data available
    if (category === "toss_winner") {
      if (!scorecard.tossWinner) return "pending";
      return scorecard.tossWinner === predictedValue ? "correct" : "wrong";
    }
    return "pending";
  }

  const firstInnings = scorecard.scorecard[0];
  const secondInnings = scorecard.scorecard[1];
  const allBatting = [
    ...firstInnings.batting,
    ...(secondInnings?.batting || []),
  ];
  const allBowling = [
    ...firstInnings.bowling,
    ...(secondInnings?.bowling || []),
  ];
  const totalOvers = (firstInnings.totals.o || 0) + (secondInnings?.totals.o || 0);
  const totalRuns = (firstInnings.totals.r || 0) + (secondInnings?.totals.r || 0);
  const totalWickets = (firstInnings.totals.w || 0) + (secondInnings?.totals.w || 0);
  const totalSixes = allBatting.reduce((sum, b) => sum + (b["6s"] || 0), 0);

  switch (category) {
    case "match_winner": {
      if (!secondInnings) return "pending";
      // During second innings, check if the team batting can still win
      const target = firstInnings.totals.r + 1;
      const currentRuns = secondInnings.totals.r;
      const wicketsDown = secondInnings.totals.w;
      const oversRemaining = 20 - secondInnings.totals.o;
      const requiredRate = oversRemaining > 0 ? (target - currentRuns) / oversRemaining : Infinity;

      const chasingTeamWinning = currentRuns >= target;
      const chasingTeam = secondInnings.inning.split(" Inning")[0];
      const battingFirst = firstInnings.inning.split(" Inning")[0];

      if (chasingTeamWinning) {
        return predictedValue === chasingTeam ? "on_track" : "in_danger";
      }
      if (wicketsDown >= 10) {
        return predictedValue === battingFirst ? "on_track" : "in_danger";
      }
      if (requiredRate > 12) {
        return predictedValue === battingFirst ? "on_track" : "in_danger";
      }
      if (requiredRate < 8) {
        return predictedValue === chasingTeam ? "on_track" : "in_danger";
      }
      return "pending";
    }

    case "toss_winner":
      if (!scorecard.tossWinner) return "pending";
      return scorecard.tossWinner === predictedValue ? "correct" : "wrong";

    case "first_innings_score": {
      if (secondInnings) {
        // First innings complete — resolve
        return resolveRangeBracket(firstInnings.totals.r, predictedValue, [150, 170, 190]) ? "on_track" : "in_danger";
      }
      // During first innings — project
      if (firstInnings.totals.o > 0) {
        const projected = Math.round((firstInnings.totals.r / firstInnings.totals.o) * 20);
        return resolveRangeBracket(projected, predictedValue, [150, 170, 190]) ? "on_track" : "in_danger";
      }
      return "pending";
    }

    case "total_match_runs": {
      if (totalOvers > 0) {
        const projected = Math.round((totalRuns / totalOvers) * 40);
        return resolveRangeBracket(projected, predictedValue, [300, 350, 400]) ? "on_track" : "in_danger";
      }
      return "pending";
    }

    case "powerplay_score": {
      if (firstInnings.totals.o >= 6) {
        // Powerplay complete — need FOW data for exact score, use totals if only 6 overs
        return "pending"; // Can't determine exactly without ball-by-ball
      }
      return "pending";
    }

    case "total_sixes": {
      if (totalOvers > 0) {
        const projected = Math.round((totalSixes / totalOvers) * 40);
        return resolveRangeBracket(projected, predictedValue, [15, 26, 36]) ? "on_track" : "in_danger";
      }
      return "pending";
    }

    case "total_wickets": {
      if (totalOvers > 0) {
        const projected = Math.round((totalWickets / totalOvers) * 40);
        return resolveRangeBracket(projected, predictedValue, [16, 19, 22]) ? "on_track" : "in_danger";
      }
      return "pending";
    }

    case "batsman_fifty": {
      const highestScore = Math.max(...allBatting.map((b) => b.r), 0);
      const anyStillBatting = allBatting.some((b) => b.dismissal === "not out" && b.r >= 30);
      if (predictedValue === "Yes") {
        if (highestScore >= 50) return "on_track";
        if (anyStillBatting) return "on_track";
        if (totalWickets >= 18) return "in_danger";
        return "pending";
      } else {
        if (highestScore >= 50) return "in_danger";
        if (anyStillBatting && highestScore >= 40) return "in_danger";
        return "on_track";
      }
    }

    case "bowler_three_wkt": {
      const maxWickets = Math.max(...allBowling.map((b) => b.w), 0);
      if (predictedValue === "Yes") {
        if (maxWickets >= 3) return "on_track";
        if (maxWickets >= 2) return "pending"; // Close but not confirmed
        return totalOvers > 30 ? "in_danger" : "pending";
      } else {
        if (maxWickets >= 3) return "in_danger";
        if (maxWickets >= 2 && totalOvers < 30) return "in_danger";
        return "on_track";
      }
    }

    case "top_scorer": {
      const sorted = [...allBatting].sort((a, b) => b.r - a.r);
      if (sorted.length === 0) return "pending";
      const isTop = sorted[0].batsman.name === predictedValue;
      const gap = sorted.length > 1 ? sorted[0].r - sorted[1].r : sorted[0].r;
      if (isTop && gap > 15) return "on_track";
      if (!isTop) {
        const myPlayer = allBatting.find((b) => b.batsman.name === predictedValue);
        if (myPlayer && myPlayer.dismissal !== "not out" && sorted[0].r - myPlayer.r > 15) {
          return "in_danger";
        }
      }
      return "pending";
    }

    case "top_wicket_taker": {
      const sortedBowlers = [...allBowling].sort((a, b) => b.w - a.w);
      if (sortedBowlers.length === 0) return "pending";
      const isTop = sortedBowlers[0].bowler.name === predictedValue;
      if (isTop) return "on_track";
      const myBowler = allBowling.find((b) => b.bowler.name === predictedValue);
      if (myBowler && sortedBowlers[0].w - myBowler.w >= 2) return "in_danger";
      return "pending";
    }

    case "most_sixes": {
      const sixesByPlayer = allBatting.map((b) => ({ name: b.batsman.name, sixes: b["6s"] || 0 }));
      sixesByPlayer.sort((a, b) => b.sixes - a.sixes);
      if (sixesByPlayer.length === 0) return "pending";
      if (sixesByPlayer[0].name === predictedValue) return "on_track";
      const myPlayer = sixesByPlayer.find((p) => p.name === predictedValue);
      if (myPlayer && sixesByPlayer[0].sixes - myPlayer.sixes >= 2) return "in_danger";
      return "pending";
    }

    // These can't be tracked live
    case "first_wicket_over":
    case "powerplay_wickets":
    case "had_super_over":
    case "player_of_match":
    default:
      return "pending";
  }
}

/**
 * Check if a value falls within a predicted range bracket.
 */
function resolveRangeBracket(value: number, bracket: string, thresholds: number[]): boolean {
  // Bracket formats: "<150", "150-169", "190+", "0", "1", "3+"
  if (bracket.startsWith("<")) {
    return value < Number(bracket.slice(1));
  }
  if (bracket.endsWith("+")) {
    return value >= Number(bracket.slice(0, -1));
  }
  if (bracket.includes("-")) {
    const [low, high] = bracket.split("-").map(Number);
    return value >= low && value <= high;
  }
  // Exact number match
  return value === Number(bracket);
}
