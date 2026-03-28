import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { TeamBadge } from "@/components/shared/team-badge";
import { ROUTES } from "@/lib/constants";
import { formatMatchDate, getTeamColor } from "@/lib/utils";
import type { CompletedMatchCardData, UserPredictionSummary } from "@/types";

interface CompletedMatchCardProps {
  groupId: string;
  match: CompletedMatchCardData;
  predictionSummary: UserPredictionSummary | null;
  resultsPending: boolean;
}

/**
 * Server component that renders a single completed match result card.
 * Displays team badges, final scores, winner highlight, match metadata,
 * and the current user's prediction performance summary.
 * The entire card is a clickable link to the match leaderboard page.
 */
export function CompletedMatchCard({
  groupId,
  match,
  predictionSummary,
  resultsPending,
}: CompletedMatchCardProps) {
  const isWinnerA = match.match_winner === match.team_a;
  const isWinnerB = match.match_winner === match.team_b;
  const winnerColor = match.match_winner ? getTeamColor(match.match_winner) : null;
  const losingTeam = match.match_winner === match.team_a ? match.team_b : match.team_a;

  // Build aria-label for accessibility
  let predictionAriaText: string;
  if (resultsPending) {
    predictionAriaText = "Results are pending.";
  } else if (predictionSummary === null) {
    predictionAriaText = "You made no predictions.";
  } else {
    predictionAriaText = `You scored ${predictionSummary.points_earned} points from ${predictionSummary.predicted_count} predictions.`;
  }

  const ariaLabel = match.match_winner
    ? `${match.match_winner} beat ${losingTeam}, Match ${match.match_number}. ${predictionAriaText}`
    : `${match.team_a} vs ${match.team_b}, Match ${match.match_number} result. ${predictionAriaText}`;

  return (
    <Link
      href={ROUTES.MATCH_LEADERBOARD(groupId, match.id)}
      className="block rounded-xl bg-card-gradient p-4 opacity-75 hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--border-focus)] focus-visible:outline-offset-2"
      aria-label={ariaLabel}
    >
      {/* Region 1 — Status Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Result
          </span>
        </div>
        <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Match {match.match_number}
        </span>
      </div>

      {/* Region 2 — Scores */}
      <div className="mt-3 space-y-2">
        {/* Team A row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TeamBadge teamCode={match.team_a} size="sm" />
            <span
              className={`text-sm font-display font-semibold ${
                isWinnerA
                  ? "text-[var(--text-primary)]"
                  : match.match_winner
                    ? "text-[var(--text-secondary)]"
                    : "text-[var(--text-primary)]"
              }`}
            >
              {match.team_a}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`font-stats text-sm font-bold ${
                isWinnerA
                  ? "text-[var(--text-primary)]"
                  : match.match_winner
                    ? "text-[var(--text-secondary)]"
                    : "text-[var(--text-primary)]"
              }`}
            >
              {match.current_score_a ?? "--"}
            </span>
            {isWinnerA && winnerColor && (
              <span
                className="shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-display font-semibold uppercase tracking-wider"
                style={{
                  backgroundColor: `color-mix(in srgb, ${winnerColor} 15%, transparent)`,
                  color: winnerColor,
                }}
              >
                Won
              </span>
            )}
          </div>
        </div>

        {/* Team B row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TeamBadge teamCode={match.team_b} size="sm" />
            <span
              className={`text-sm font-display font-semibold ${
                isWinnerB
                  ? "text-[var(--text-primary)]"
                  : match.match_winner
                    ? "text-[var(--text-secondary)]"
                    : "text-[var(--text-primary)]"
              }`}
            >
              {match.team_b}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`font-stats text-sm font-bold ${
                isWinnerB
                  ? "text-[var(--text-primary)]"
                  : match.match_winner
                    ? "text-[var(--text-secondary)]"
                    : "text-[var(--text-primary)]"
              }`}
            >
              {match.current_score_b ?? "--"}
            </span>
            {isWinnerB && winnerColor && (
              <span
                className="shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-display font-semibold uppercase tracking-wider"
                style={{
                  backgroundColor: `color-mix(in srgb, ${winnerColor} 15%, transparent)`,
                  color: winnerColor,
                }}
              >
                Won
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Region 3 — Metadata */}
      <div className="mt-3 flex items-center gap-1 text-xs text-[var(--text-muted)] min-w-0">
        <span className="shrink-0">{formatMatchDate(match.date)}</span>
        <span className="shrink-0">&middot;</span>
        <span className="truncate">{match.venue}</span>
      </div>

      {/* Region 4 — Footer */}
      <div className="mt-3 flex items-center justify-between">
        <PredictionBadge
          predictionSummary={predictionSummary}
          resultsPending={resultsPending}
        />
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
      </div>
    </Link>
  );
}

/** Renders the prediction summary badge in the card footer. */
function PredictionBadge({
  predictionSummary,
  resultsPending,
}: {
  predictionSummary: UserPredictionSummary | null;
  resultsPending: boolean;
}) {
  if (resultsPending) {
    return (
      <span className="text-xs text-[var(--pending)]">
        Results pending
      </span>
    );
  }

  if (predictionSummary === null) {
    return (
      <span className="text-xs text-[var(--text-muted)]">
        No predictions
      </span>
    );
  }

  const hasCorrect = predictionSummary.correct_count > 0;
  const bgColor = hasCorrect
    ? "bg-[color-mix(in_srgb,var(--success)_10%,transparent)]"
    : "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]";
  const textColor = hasCorrect ? "text-[var(--success)]" : "text-[var(--danger)]";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-display ${bgColor} ${textColor}`}
    >
      {predictionSummary.correct_count}/{predictionSummary.resolved_count} correct
      <span className="mx-1">&middot;</span>
      <span className="font-stats font-semibold">{predictionSummary.points_earned}</span> pts
    </span>
  );
}
