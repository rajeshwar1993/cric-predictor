import { CompletedMatchCard } from "./completed-match-card";
import type {
  CompletedMatchCardData,
  UserPredictionSummary,
  MatchLeaderboardEntry,
} from "@/types";

interface CompletedMatchesSectionProps {
  groupId: string;
  matches: CompletedMatchCardData[];
  predictionSummaries: Map<number, MatchLeaderboardEntry>;
}

/**
 * Server component that renders the "Recent Results" section on the group page.
 * Displays up to 3 recently completed matches with the current user's prediction
 * performance summary. Returns null when there are no completed matches (the
 * section is entirely absent from the DOM).
 */
export function CompletedMatchesSection({
  groupId,
  matches,
  predictionSummaries,
}: CompletedMatchesSectionProps) {
  if (matches.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 font-display text-lg font-semibold text-[var(--text-primary)]">
        Recent Results
      </h2>
      <div className="space-y-3">
        {matches.map((match) => {
          const leaderboardEntry = predictionSummaries.get(match.id);
          // Results are pending only when resolved_at is null AND no leaderboard
          // data exists yet. This handles the window where updateLiveSnapshot sets
          // status='completed' before updateMatchResults sets resolved_at.
          const resultsPending = match.resolved_at === null && !leaderboardEntry;

          const predictionSummary: UserPredictionSummary | null =
            leaderboardEntry
              ? {
                  predicted_count: leaderboardEntry.predicted_count,
                  resolved_count: leaderboardEntry.resolved_count,
                  correct_count: leaderboardEntry.correct_count,
                  points_earned: leaderboardEntry.match_points,
                }
              : null;

          return (
            <CompletedMatchCard
              key={match.id}
              groupId={groupId}
              match={match}
              predictionSummary={predictionSummary}
              resultsPending={resultsPending}
            />
          );
        })}
      </div>
    </div>
  );
}
