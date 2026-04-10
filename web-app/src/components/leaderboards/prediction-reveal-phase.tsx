import { cn } from '@/lib/utils'
import { PredictionCell } from './prediction-cell'
import { PredictionRevealHeader } from './prediction-reveal-header'
import type {
  MatchPredictionCell,
  MatchPredictionMember,
  MatchPredictionPhaseGroup,
  MatchPredictionPlayer,
  MatchPredictionScenario,
  MatchPredictionTeam,
} from '@/lib/dal/predictions-shared'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEPARTED_STATUSES = new Set(['left', 'removed'])

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PredictionRevealPhaseProps {
  /** The phase group (label + scenarios). */
  group: MatchPredictionPhaseGroup
  /** Members in leaderboard rank order (used for column order). */
  members: MatchPredictionMember[]
  /** O(1) lookup: scenarioId → (userId → cell). */
  predictionsByScenarioByUser: Map<string, Map<string, MatchPredictionCell>>
  /** Team UUID → display info lookup. */
  teamsById: Record<string, MatchPredictionTeam>
  /** Player UUID → display info lookup. */
  playersById: Record<string, MatchPredictionPlayer>
  /** Current authenticated user's ID (for column highlighting). */
  currentUserId: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a raw prediction value to its human-readable display.
 *
 *   team_select   → team code (e.g., "MI")
 *   player_select → player name (e.g., "Rohit Sharma")
 *   yes_no        → "YES" / "NO"
 *   number_range  → raw bracket string (e.g., "160-179")
 *   over_range    → raw bracket string (e.g., "3-4")
 */
export function resolveDisplayValue(
  value: string | null,
  scenario: MatchPredictionScenario,
  teamsById: Record<string, MatchPredictionTeam>,
  playersById: Record<string, MatchPredictionPlayer>,
): string | null {
  if (value === null || value === '') return null

  switch (scenario.inputType) {
    case 'team_select':
      return teamsById[value]?.code ?? value
    case 'player_select':
      return playersById[value]?.name ?? value
    case 'yes_no':
      return value.toLowerCase() === 'yes' ? 'YES' : 'NO'
    case 'number_range':
    case 'over_range':
      return value
  }
}

/**
 * Build the accessible cell label for screen readers.
 *
 * The caller is expected to have already resolved `memberName` to the
 * sighted-friendly label — i.e. pass "You" for the current user (to mirror
 * the "YOU" column header) and append " (left gang)" for departed members
 * (to mirror the dimmed visual treatment). Screen readers should get the
 * same context a sighted user gets.
 */
function buildCellAriaLabel(
  memberName: string,
  displayValue: string | null,
  isResolved: boolean,
  isCorrect: boolean | null,
  isVoided: boolean,
  didPredict: boolean,
): string {
  if (isVoided) return `${memberName}: scenario voided`
  if (!didPredict) return `${memberName} did not predict`
  // Treat null-is-correct as "not yet resolved" — mirrors the visual cell.
  if (!isResolved || isCorrect === null) {
    return `${memberName} predicted ${displayValue ?? 'unknown'}, not yet resolved`
  }
  if (isCorrect === true) return `${memberName} predicted ${displayValue ?? 'unknown'}, correct`
  return `${memberName} predicted ${displayValue ?? 'unknown'}, incorrect`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PredictionRevealPhase — one table for one phase group.
 *
 * Renders a full `<table>` with a sticky "Scenario" column on the left,
 * member columns in leaderboard order, and a trailing "Answer" column.
 * Wrapped in a horizontally-scrollable shell for narrow viewports.
 *
 * @see docs/stories/LDB-002-prediction-reveal.md
 */
export function PredictionRevealPhase({
  group,
  members,
  predictionsByScenarioByUser,
  teamsById,
  playersById,
  currentUserId,
}: PredictionRevealPhaseProps) {
  return (
    <section aria-labelledby={`phase-${group.phase}`}>
      <h3
        id={`phase-${group.phase}`}
        className="mb-2 font-display text-caption font-bold uppercase tracking-[0.1em] text-bragg-lime"
      >
        {group.label}
      </h3>

      <div className="-mx-4 overflow-x-auto px-4">
        <table className="min-w-[600px] w-full border-separate border-spacing-0 bg-dark-concrete">
          <caption className="sr-only">
            {group.label} phase: predictions from every gang member for each scenario.
          </caption>

          <PredictionRevealHeader
            members={members}
            currentUserId={currentUserId}
          />

          <tbody>
            {group.scenarios.map((scenario) => {
              const userCells = predictionsByScenarioByUser.get(scenario.id)
              const correctAnswerDisplay = resolveDisplayValue(
                scenario.correctAnswer,
                scenario,
                teamsById,
                playersById,
              )

              return (
                <tr
                  key={scenario.id}
                  className="border-b border-mid-concrete"
                >
                  {/* Scenario title cell — sticky left */}
                  <th
                    scope="row"
                    className={cn(
                      'sticky left-0 z-10 bg-dark-concrete',
                      'px-3 py-3 text-left align-top',
                      'border-b border-mid-concrete',
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-body text-body-sm font-medium text-text-primary">
                        {scenario.title}
                      </span>
                      <span className="font-body text-xs font-medium uppercase tracking-[0.08em] text-text-muted">
                        {scenario.points} pts
                      </span>
                    </div>
                  </th>

                  {/* Member cells */}
                  {members.map((member) => {
                    const cell = userCells?.get(member.userId)
                    const didPredict = Boolean(cell)
                    const value = cell?.value ?? null
                    const isCurrentUser = member.userId === currentUserId
                    const isDeparted = DEPARTED_STATUSES.has(member.memberStatus)
                    const displayValue = resolveDisplayValue(
                      value,
                      scenario,
                      teamsById,
                      playersById,
                    )

                    // Build the screen-reader name so it mirrors what a
                    // sighted user sees:
                    //   - Current user → "You" (matches the "YOU" column
                    //     header).
                    //   - Departed member → "<name> (left gang)" (matches
                    //     the dimmed column).
                    const baseMemberName = isCurrentUser
                      ? 'You'
                      : (member.displayName ?? 'Member')
                    const ariaMemberName =
                      isDeparted && !isCurrentUser
                        ? `${baseMemberName} (left gang)`
                        : baseMemberName

                    const ariaLabel = buildCellAriaLabel(
                      ariaMemberName,
                      displayValue,
                      scenario.isResolved,
                      cell?.isCorrect ?? null,
                      scenario.isVoided,
                      didPredict,
                    )

                    return (
                      <PredictionCell
                        key={`${scenario.id}-${member.userId}`}
                        value={value}
                        displayValue={displayValue}
                        isCorrect={cell?.isCorrect ?? null}
                        isResolved={scenario.isResolved}
                        isVoided={scenario.isVoided}
                        ariaLabel={ariaLabel}
                        isCurrentUser={isCurrentUser}
                        className={cn(
                          'border-b border-mid-concrete',
                          isDeparted && !isCurrentUser && 'opacity-75',
                        )}
                      />
                    )
                  })}

                  {/* Trailing answer cell */}
                  <td
                    className={cn(
                      'border-b border-mid-concrete px-3 py-3 text-center align-middle',
                      'font-body text-body-sm font-medium',
                      scenario.isVoided
                        ? 'text-text-muted'
                        : scenario.isResolved
                          ? 'text-bragg-lime'
                          : 'text-text-muted',
                    )}
                  >
                    {scenario.isVoided
                      ? 'VOIDED'
                      : scenario.isResolved
                        ? (correctAnswerDisplay ?? '—')
                        : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
