import type { EventResponse } from "@/types/cricket-api";
import {
  safeInt,
  safeFloat,
  filterBatsmen,
  filterBowlers,
  getInningsKeys,
  getInningsRuns,
  getInningsOvers,
  teamNameFromInningsKey,
  parseTossWinner,
  parseOverNumber,
  derivePowerplayScore,
  derivePowerplayWickets,
  deriveFirstWicketOver,
} from "./cricket-api/parsers";

export type TrackStatus = "correct" | "wrong" | "on_track" | "in_danger" | "pending";

export interface LiveMatchState {
  event: EventResponse;
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
  const { event, matchStatus } = liveState;

  // If match is completed, use resolved status (this should come from DB, not here)
  if (matchStatus === "completed") return "pending";

  const inningsKeys = getInningsKeys(event.scorecard);

  if (inningsKeys.length === 0) {
    // Only toss and post-match data available
    if (category === "toss_winner") {
      const tossWinner = parseTossWinner(event.event_toss);
      if (!tossWinner) return "pending";
      return tossWinner === predictedValue ? "correct" : "wrong";
    }
    if (category === "player_of_match") {
      if (event.event_man_of_match && event.event_man_of_match.trim() !== "") {
        return event.event_man_of_match.trim() === predictedValue ? "correct" : "wrong";
      }
    }
    return "pending";
  }

  const firstKey = inningsKeys[0];
  const secondKey = inningsKeys.length > 1 ? inningsKeys[1] : null;

  const firstEntries = event.scorecard[firstKey] || [];
  const secondEntries = secondKey ? event.scorecard[secondKey] || [] : null;

  const firstBatsmen = filterBatsmen(firstEntries);
  const secondBatsmen = secondEntries ? filterBatsmen(secondEntries) : [];
  const firstBowlers = filterBowlers(firstEntries);
  const secondBowlers = secondEntries ? filterBowlers(secondEntries) : [];

  const allBatsmen = [...firstBatsmen, ...secondBatsmen];
  const allBowlers = [...firstBowlers, ...secondBowlers];

  const firstOvers = getInningsOvers(event.extra, firstKey) ?? 0;
  const secondOvers = secondKey ? (getInningsOvers(event.extra, secondKey) ?? 0) : 0;
  const firstRuns = getInningsRuns(event.extra, firstKey) ?? 0;
  const secondRuns = secondKey ? (getInningsRuns(event.extra, secondKey) ?? 0) : 0;

  const totalOvers = firstOvers + secondOvers;
  const totalRuns = firstRuns + secondRuns;
  const totalWickets =
    firstBowlers.reduce((s, b) => s + safeInt(b.W), 0) +
    secondBowlers.reduce((s, b) => s + safeInt(b.W), 0);
  const totalSixes = allBatsmen.reduce((s, b) => s + safeInt(b["6s"]), 0);

  switch (category) {
    case "match_winner": {
      if (!secondEntries) return "pending";
      const target = firstRuns + 1;
      const currentRuns = secondRuns;
      const wicketsDown = secondBowlers.reduce((s, b) => s + safeInt(b.W), 0);
      const oversRemaining = 20 - secondOvers;
      const requiredRate =
        oversRemaining > 0 ? (target - currentRuns) / oversRemaining : Infinity;

      const chasingTeam = teamNameFromInningsKey(secondKey!);
      const battingFirst = teamNameFromInningsKey(firstKey);

      if (currentRuns >= target) {
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

    case "toss_winner": {
      const tossWinner = parseTossWinner(event.event_toss);
      if (!tossWinner) return "pending";
      return tossWinner === predictedValue ? "correct" : "wrong";
    }

    case "first_innings_score": {
      if (secondEntries) {
        // First innings complete
        return resolveRangeBracket(firstRuns, predictedValue, [150, 170, 190])
          ? "on_track"
          : "in_danger";
      }
      if (firstOvers > 0) {
        const projected = Math.round((firstRuns / firstOvers) * 20);
        return resolveRangeBracket(projected, predictedValue, [150, 170, 190])
          ? "on_track"
          : "in_danger";
      }
      return "pending";
    }

    case "total_match_runs": {
      if (totalOvers > 0) {
        const projected = Math.round((totalRuns / totalOvers) * 40);
        return resolveRangeBracket(projected, predictedValue, [300, 350, 400])
          ? "on_track"
          : "in_danger";
      }
      return "pending";
    }

    case "powerplay_score": {
      const ppScore = derivePowerplayScore(event.comments);
      if (ppScore !== null && firstOvers >= 6) {
        // Powerplay complete — actual score available
        return resolveRangeBracket(ppScore, predictedValue, [40, 56, 71])
          ? "on_track"
          : "in_danger";
      }
      if (ppScore !== null && firstOvers > 0 && firstOvers < 6) {
        // During powerplay — project
        const projected = Math.round((ppScore / firstOvers) * 6);
        return resolveRangeBracket(projected, predictedValue, [40, 56, 71])
          ? "on_track"
          : "in_danger";
      }
      return "pending";
    }

    case "powerplay_wickets": {
      if (firstOvers >= 6) {
        const ppWickets = derivePowerplayWickets(event.wickets);
        if (ppWickets !== null) {
          const bracket = ppWickets >= 3 ? "3+" : String(ppWickets);
          return bracket === predictedValue ? "on_track" : "in_danger";
        }
      }
      return "pending";
    }

    case "first_wicket_over": {
      const fwo = deriveFirstWicketOver(event.wickets);
      if (fwo !== null) {
        let bracket: string;
        if (fwo <= 2) bracket = "1-2";
        else if (fwo <= 4) bracket = "3-4";
        else if (fwo <= 6) bracket = "5-6";
        else bracket = "7+";
        return bracket === predictedValue ? "on_track" : "in_danger";
      }
      return "pending";
    }

    case "total_sixes": {
      if (totalOvers > 0) {
        const projected = Math.round((totalSixes / totalOvers) * 40);
        return resolveRangeBracket(projected, predictedValue, [15, 26, 36])
          ? "on_track"
          : "in_danger";
      }
      return "pending";
    }

    case "total_wickets": {
      if (totalOvers > 0) {
        const projected = Math.round((totalWickets / totalOvers) * 40);
        return resolveRangeBracket(projected, predictedValue, [16, 19, 22])
          ? "on_track"
          : "in_danger";
      }
      return "pending";
    }

    case "batsman_fifty": {
      const highestScore = Math.max(...allBatsmen.map((b) => safeInt(b.R)), 0);
      const anyStillBatting = allBatsmen.some(
        (b) => b.status === "not out" && safeInt(b.R) >= 30
      );
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
      const maxWickets = Math.max(...allBowlers.map((b) => safeInt(b.W)), 0);
      if (predictedValue === "Yes") {
        if (maxWickets >= 3) return "on_track";
        if (maxWickets >= 2) return "pending";
        return totalOvers > 30 ? "in_danger" : "pending";
      } else {
        if (maxWickets >= 3) return "in_danger";
        if (maxWickets >= 2 && totalOvers < 30) return "in_danger";
        return "on_track";
      }
    }

    case "top_scorer": {
      const sorted = [...allBatsmen]
        .map((b) => ({ name: b.player, runs: safeInt(b.R), status: b.status }))
        .sort((a, b) => b.runs - a.runs);
      if (sorted.length === 0) return "pending";
      const isTop = sorted[0].name === predictedValue;
      const gap = sorted.length > 1 ? sorted[0].runs - sorted[1].runs : sorted[0].runs;
      if (isTop && gap > 15) return "on_track";
      if (!isTop) {
        const myPlayer = sorted.find((p) => p.name === predictedValue);
        if (myPlayer && myPlayer.status !== "not out" && sorted[0].runs - myPlayer.runs > 15) {
          return "in_danger";
        }
      }
      return "pending";
    }

    case "top_wicket_taker": {
      const sortedBowlers = [...allBowlers]
        .map((b) => ({ name: b.player, wickets: safeInt(b.W) }))
        .sort((a, b) => b.wickets - a.wickets);
      if (sortedBowlers.length === 0) return "pending";
      const isTop = sortedBowlers[0].name === predictedValue;
      if (isTop) return "on_track";
      const myBowler = sortedBowlers.find((p) => p.name === predictedValue);
      if (myBowler && sortedBowlers[0].wickets - myBowler.wickets >= 2) return "in_danger";
      return "pending";
    }

    case "most_sixes": {
      const sixesByPlayer = allBatsmen
        .map((b) => ({ name: b.player, sixes: safeInt(b["6s"]) }))
        .sort((a, b) => b.sixes - a.sixes);
      if (sixesByPlayer.length === 0) return "pending";
      if (sixesByPlayer[0].name === predictedValue) return "on_track";
      const myPlayer = sixesByPlayer.find((p) => p.name === predictedValue);
      if (myPlayer && sixesByPlayer[0].sixes - myPlayer.sixes >= 2) return "in_danger";
      return "pending";
    }

    case "player_of_match": {
      // Available post-match from event_man_of_match
      if (event.event_man_of_match && event.event_man_of_match.trim() !== "") {
        return event.event_man_of_match.trim() === predictedValue ? "correct" : "wrong";
      }
      return "pending";
    }

    case "had_super_over":
    default:
      return "pending";
  }
}

/**
 * Check if a value falls within a predicted range bracket.
 */
function resolveRangeBracket(value: number, bracket: string, thresholds: number[]): boolean {
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
  return value === Number(bracket);
}
