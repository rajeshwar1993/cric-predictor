import { Users, Eye } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { PredictionRevealPhase } from './prediction-reveal-phase'
import type { MatchPredictionsDataset } from '@/lib/dal/predictions-shared'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PredictionRevealProps {
  /** Matrix-ready dataset returned by `getMatchPredictions`. */
  data: MatchPredictionsDataset
  /** Current authenticated user's ID (for column highlighting). */
  currentUserId: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PredictionReveal — the prediction reveal section on the match leaderboard
 * page.
 *
 * Pure presentational server component. Accepts pre-shaped data from
 * `getMatchPredictions`. Handles the empty states:
 *
 *   - Solo gang (1 member)         → "Invite friends…" empty state.
 *   - No predictions from anyone    → "No one predicted for this match".
 *
 * Otherwise renders each phase group in canonical order as a separate
 * horizontally-scrollable table via `PredictionRevealPhase`.
 *
 * @see docs/stories/LDB-002-prediction-reveal.md
 */
export function PredictionReveal({
  data,
  currentUserId,
}: PredictionRevealProps) {
  const { members, phases, predictionsByScenarioByUser, teamsById, playersById } = data

  // Solo gang — no reveal value yet.
  if (members.length <= 1) {
    return (
      <section aria-label="Prediction reveal" className="flex flex-col gap-4">
        <h2 className="font-display text-h3 font-bold uppercase text-text-primary">
          Prediction Reveal
        </h2>
        <EmptyState
          icon={Users}
          headline="Flying solo"
          description="Invite friends to see how your predictions stack up"
        />
      </section>
    )
  }

  // No one predicted anything across any scenario.
  let totalPredictions = 0
  for (const scenarioMap of predictionsByScenarioByUser.values()) {
    totalPredictions += scenarioMap.size
  }

  if (totalPredictions === 0) {
    return (
      <section aria-label="Prediction reveal" className="flex flex-col gap-4">
        <h2 className="font-display text-h3 font-bold uppercase text-text-primary">
          Prediction Reveal
        </h2>
        <EmptyState
          icon={Eye}
          headline="No predictions yet"
          description="No one predicted for this match"
        />
      </section>
    )
  }

  return (
    <section aria-label="Prediction reveal" className="flex flex-col gap-6">
      <h2 className="font-display text-h3 font-bold uppercase text-text-primary">
        Prediction Reveal
      </h2>

      <div className="flex flex-col gap-8">
        {phases.map((group) => (
          <PredictionRevealPhase
            key={group.phase}
            group={group}
            members={members}
            predictionsByScenarioByUser={predictionsByScenarioByUser}
            teamsById={teamsById}
            playersById={playersById}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </section>
  )
}
