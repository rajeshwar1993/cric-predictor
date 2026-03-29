import * as scenariosDal from "@/lib/dal/scenarios";
import * as membersDal from "@/lib/dal/members";
import * as predictionsDal from "@/lib/dal/predictions";
import * as matchesDal from "@/lib/dal/matches";
import { computeDeadline } from "@/lib/utils";
import { REVEAL_TABLE_COPY } from "@/lib/constants";
import { RevealTablePollingWrapper } from "./reveal-table-polling-wrapper";
import { RevealLockedPlaceholder } from "./reveal-locked-placeholder";
import type { MatchStatus } from "@/types/database";
import type {
  MatchLeaderboardEntry,
  RevealPrediction,
  RevealCellData,
  RevealMember,
  RevealScenario,
} from "@/types";

interface PredictionRevealSectionProps {
  groupId: string;
  matchId: number;
  currentUserId: string;
  matchStatus: MatchStatus;
  matchDate: string;
  matchTimeIst: string;
  teamA: string;
  teamB: string;
  matchNumber: number;
  leaderboard: MatchLeaderboardEntry[];
}

/**
 * Build the prediction matrix from a flat array of predictions.
 * Returns: predictionMatrix[userId][scenarioId] = { value, isCorrect }
 */
function buildPredictionMatrix(
  predictions: RevealPrediction[]
): Record<string, Record<string, RevealCellData>> {
  const matrix: Record<string, Record<string, RevealCellData>> = {};

  for (const p of predictions) {
    if (!matrix[p.user_id]) {
      matrix[p.user_id] = {};
    }
    matrix[p.user_id][p.scenario_id] = {
      value: p.value,
      isCorrect: p.is_correct,
    };
  }

  return matrix;
}

/**
 * Order members by leaderboard rank first, then append non-predictors alphabetically.
 */
function orderMembers(
  members: RevealMember[],
  leaderboard: MatchLeaderboardEntry[]
): RevealMember[] {
  const rankMap = new Map<string, number>();
  for (const entry of leaderboard) {
    rankMap.set(entry.user_id, entry.rank);
  }

  const ranked: RevealMember[] = [];
  const unranked: RevealMember[] = [];

  for (const member of members) {
    if (rankMap.has(member.userId)) {
      ranked.push(member);
    } else {
      unranked.push(member);
    }
  }

  // Sort ranked members by leaderboard rank
  ranked.sort((a, b) => (rankMap.get(a.userId) ?? 0) - (rankMap.get(b.userId) ?? 0));
  // Sort unranked members alphabetically
  unranked.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return [...ranked, ...unranked];
}

/**
 * Server component that handles data fetching, visibility gating, and data
 * transformation for the Prediction Reveal Table.
 *
 * Placed on the match page below the MatchLeaderboard. Decides whether to
 * render the table (post-lock) or a locked placeholder (pre-lock).
 */
export async function PredictionRevealSection({
  groupId,
  matchId,
  currentUserId,
  matchStatus,
  matchDate,
  matchTimeIst,
  teamA,
  teamB,
  matchNumber,
  leaderboard,
}: PredictionRevealSectionProps) {
  // Fetch match group settings, scenarios, and members in parallel.
  // If the match turns out to be pre-lock, the scenarios/members data is simply unused.
  const [matchGroupSettings, scenarios, membersData] = await Promise.all([
    matchesDal.getMatchGroupSettings(groupId, matchId),
    scenariosDal.getScenariosForMatch(groupId, matchId),
    membersDal.getMembers(groupId),
  ]);

  const deadline = computeDeadline(
    matchDate,
    matchTimeIst,
    matchGroupSettings?.prediction_deadline
  );

  const isLocked = matchGroupSettings?.is_locked ?? false;

  // Determine if predictions should be revealed
  const isRevealed =
    matchStatus === "live" ||
    matchStatus === "completed" ||
    matchStatus === "abandoned" ||
    matchStatus === "no_result" ||
    isLocked ||
    new Date() > deadline;

  // Pre-lock: show locked placeholder
  if (!isRevealed) {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          {REVEAL_TABLE_COPY.SECTION_TITLE}
        </h2>
        <RevealLockedPlaceholder deadline={deadline} />
      </div>
    );
  }

  // No scenarios: don't render the section
  if (scenarios.length === 0) {
    return null;
  }

  // Fetch predictions (depends on scenario IDs)
  const scenarioIds = scenarios.map((s) => s.id);
  const rawPredictions = await predictionsDal.getAllPredictionsForMatch(
    scenarioIds
  );

  // Transform data for the table
  const predictionMatrix = buildPredictionMatrix(rawPredictions);

  const revealMembers: RevealMember[] = membersData
    .filter((m) => m.profile)
    .map((m) => ({
      userId: m.user_id,
      displayName: m.profile!.display_name,
    }));

  const revealScenarios: RevealScenario[] = scenarios.map((s) => ({
    id: s.id,
    title: s.title,
    systemCategory: s.system_category,
    points: s.points,
  }));

  // Order members by leaderboard rank
  const orderedMembers = orderMembers(revealMembers, leaderboard);

  // Solo squad: show nudge to invite more members
  if (orderedMembers.length <= 1) {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          {REVEAL_TABLE_COPY.SECTION_TITLE}
        </h2>
        <div className="rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)] p-8 text-center">
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
            {REVEAL_TABLE_COPY.EMPTY_SOLO_TITLE}
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {REVEAL_TABLE_COPY.EMPTY_SOLO_BODY}
          </p>
        </div>
      </div>
    );
  }

  // Empty state: no predictions at all
  if (rawPredictions.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          {REVEAL_TABLE_COPY.SECTION_TITLE}
        </h2>
        <div className="rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)] p-8 text-center">
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
            {REVEAL_TABLE_COPY.EMPTY_NO_PREDICTIONS_TITLE}
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {REVEAL_TABLE_COPY.EMPTY_NO_PREDICTIONS_BODY}
          </p>
        </div>
      </div>
    );
  }

  // Render the table
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
        {REVEAL_TABLE_COPY.SECTION_TITLE}
      </h2>

      <RevealTablePollingWrapper
        initialPredictions={predictionMatrix}
        members={orderedMembers}
        scenarios={revealScenarios}
        currentUserId={currentUserId}
        matchStatus={matchStatus}
        teamA={teamA}
        teamB={teamB}
        matchNumber={matchNumber}
      />
    </div>
  );
}
