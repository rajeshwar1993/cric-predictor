'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Minus, Users, X } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RevealScenario {
  id: string
  slug: string
  title: string
  points: number
  correctAnswer: string | null
  isResolved: boolean
  isVoided: boolean
  resolutionPhase: string
}

export interface RevealMember {
  userId: string
  displayName: string
  rank: number
  memberStatus: 'approved' | 'left' | 'removed'
}

export interface RevealPick {
  value: string
  isCorrect: boolean | null
  pointsEarned: number
}

interface PredictionRevealTableProps {
  members: RevealMember[]
  scenarios: RevealScenario[]
  /** Record<userId, Record<scenarioId, pick>> */
  predictions: Record<string, Record<string, RevealPick>>
  currentUserId: string
  /** If true, polls for updates (live match) */
  isLive?: boolean
  /** Callback to refresh data */
  onRefresh?: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 15_000

/** Maps resolution_phase to display label */
const PHASE_LABELS: Record<string, string> = {
  toss: 'Toss',
  first_wicket: 'First Wicket',
  team_powerplay_end: 'Powerplay',
  mid_match: 'Mid-Match',
  team_innings_end: 'Innings End',
  end: 'End',
  post_match: 'Post-Match',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCellStyle(
  pick: RevealPick | undefined,
  scenario: RevealScenario,
): {
  backgroundColor: string
  color: string
  icon: 'check' | 'x' | 'dash' | 'none'
} {
  if (pick === undefined) {
    // Not predicted
    return {
      backgroundColor: 'transparent',
      color: 'var(--text-tertiary)',
      icon: 'none',
    }
  }

  if (scenario.isVoided) {
    return {
      backgroundColor: 'transparent',
      color: 'var(--text-tertiary)',
      icon: 'dash',
    }
  }

  if (!scenario.isResolved) {
    // Unresolved — show pick but no indicator
    return {
      backgroundColor: 'transparent',
      color: 'var(--text-secondary)',
      icon: 'dash',
    }
  }

  if (pick.isCorrect === true) {
    return {
      backgroundColor: 'var(--success-muted)',
      color: 'var(--success)',
      icon: 'check',
    }
  }

  if (pick.isCorrect === false) {
    return {
      backgroundColor: 'var(--error-muted)',
      color: 'var(--error)',
      icon: 'x',
    }
  }

  // isCorrect is null but resolved — treat as pending
  return {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    icon: 'dash',
  }
}

function truncateValue(value: string, maxLen: number = 8): string {
  if (value.length <= maxLen) return value
  return value.substring(0, maxLen - 1) + '\u2026'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PredictionRevealTable({
  members,
  scenarios,
  predictions,
  currentUserId,
  isLive = false,
  onRefresh,
}: PredictionRevealTableProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [, setTick] = useState(0)

  const refresh = useCallback(async () => {
    if (onRefresh !== undefined) {
      await onRefresh()
      setTick((t) => t + 1)
    }
  }, [onRefresh])

  useEffect(() => {
    if (isLive && onRefresh !== undefined) {
      intervalRef.current = setInterval(() => {
        void refresh()
      }, POLL_INTERVAL_MS)

      return () => {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current)
        }
      }
    }
    return undefined
  }, [isLive, onRefresh, refresh])

  // Empty states
  if (members.length <= 1 && members.some((m) => m.userId === currentUserId)) {
    return (
      <EmptyState
        icon={<Users size={32} strokeWidth={1.5} />}
        title="Just you here"
        description="Invite more members to see predictions"
      />
    )
  }

  const hasPredictions = Object.keys(predictions).length > 0
  if (!hasPredictions) {
    return (
      <EmptyState
        icon={<Minus size={32} strokeWidth={1.5} />}
        title="Nobody predicted this match"
      />
    )
  }

  // Group scenarios by phase
  const phaseGroups = new Map<string, RevealScenario[]>()
  for (const scenario of scenarios) {
    const phase = scenario.resolutionPhase
    const existing = phaseGroups.get(phase)
    if (existing !== undefined) {
      existing.push(scenario)
    } else {
      phaseGroups.set(phase, [scenario])
    }
  }

  // Sort: active members first, then inactive
  const sortedMembers = [...members].sort((a, b) => {
    const aInactive = a.memberStatus !== 'approved' ? 1 : 0
    const bInactive = b.memberStatus !== 'approved' ? 1 : 0
    if (aInactive !== bInactive) return aInactive - bInactive
    return a.rank - b.rank
  })

  // Check if any scenario is resolved (to show correct answer row)
  const hasResolvedScenarios = scenarios.some((s) => s.isResolved && !s.isVoided)

  return (
    <div
      className="overflow-x-auto rounded-[var(--radius-ds-lg)] border border-[var(--border-default)]"
      role="region"
      aria-label="Prediction reveal table"
      tabIndex={0}
    >
      <table className="w-full border-collapse" style={{ minWidth: scenarios.length * 80 + 140 }}>
        {/* Header */}
        <thead>
          {/* Phase group headers */}
          <tr>
            <th
              className="sticky left-0 z-20 border-b border-r border-[var(--border-default)] px-[var(--sp-3)] py-[var(--sp-2)]"
              style={{ backgroundColor: 'var(--bg-overlay)' }}
              aria-label="Phase"
            />
            {Array.from(phaseGroups.entries()).map(([phase, phaseScenarios]) => (
              <th
                key={phase}
                colSpan={phaseScenarios.length}
                className="border-b border-[var(--border-default)] px-[var(--sp-2)] py-[var(--sp-1)] text-center text-xs font-medium uppercase tracking-[0.05em]"
                style={{
                  backgroundColor: 'var(--bg-overlay)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {PHASE_LABELS[phase] ?? phase}
              </th>
            ))}
          </tr>

          {/* Scenario titles */}
          <tr>
            <th
              className="sticky left-0 z-20 border-b border-r border-[var(--border-default)] px-[var(--sp-3)] py-[var(--sp-2)] text-left text-xs font-medium"
              style={{
                backgroundColor: 'var(--bg-overlay)',
                color: 'var(--text-secondary)',
                minWidth: 120,
              }}
            >
              Member
            </th>
            {scenarios.map((scenario) => (
              <th
                key={scenario.id}
                className="border-b border-[var(--border-default)] px-[var(--sp-2)] py-[var(--sp-2)] text-center text-xs font-medium"
                style={{
                  backgroundColor: 'var(--bg-overlay)',
                  color: 'var(--text-secondary)',
                  minWidth: 72,
                  maxWidth: 100,
                }}
                title={`${scenario.title} (${String(scenario.points)} pts)`}
              >
                <div className="truncate">{truncateValue(scenario.title, 12)}</div>
                <div
                  className="mt-[2px] text-[10px] tabular-nums"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {scenario.points} pts
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Correct answer row */}
          {hasResolvedScenarios && (
            <tr>
              <td
                className="sticky left-0 z-10 border-b border-r border-[var(--border-default)] px-[var(--sp-3)] py-[var(--sp-2)] text-xs font-semibold uppercase tracking-[0.05em]"
                style={{
                  backgroundColor: 'var(--bg-overlay)',
                  color: 'var(--success)',
                }}
              >
                Answer
              </td>
              {scenarios.map((scenario) => (
                <td
                  key={scenario.id}
                  className="border-b border-[var(--border-default)] px-[var(--sp-2)] py-[var(--sp-2)] text-center text-xs font-medium"
                  style={{
                    backgroundColor: scenario.isResolved ? 'var(--success-muted)' : 'transparent',
                    color: scenario.isResolved ? 'var(--success)' : 'var(--text-tertiary)',
                    minHeight: 44,
                  }}
                >
                  {scenario.isVoided
                    ? 'Void'
                    : scenario.isResolved && scenario.correctAnswer !== null
                      ? truncateValue(scenario.correctAnswer)
                      : '\u2014'}
                </td>
              ))}
            </tr>
          )}

          {/* Member rows */}
          {sortedMembers.map((member) => {
            const isCurrentUser = member.userId === currentUserId
            const isInactive = member.memberStatus !== 'approved'
            const memberPredictions = predictions[member.userId]

            return (
              <tr key={member.userId} className={cn(isInactive && 'opacity-50')}>
                {/* Member name (sticky) */}
                <td
                  className={cn(
                    'sticky left-0 z-10 border-b border-r border-[var(--border-default)] px-[var(--sp-3)] py-[var(--sp-2)]',
                    isCurrentUser && 'border-l-[3px] border-l-[var(--brand)]',
                  )}
                  style={{
                    backgroundColor: isCurrentUser ? 'var(--brand-muted)' : 'var(--bg-raised)',
                    minWidth: 120,
                  }}
                >
                  <div className="flex items-center gap-[var(--sp-1)]">
                    <span
                      className="w-5 shrink-0 text-right text-xs font-bold tabular-nums"
                      style={{
                        color:
                          member.rank === 1
                            ? 'var(--rank-gold)'
                            : member.rank === 2
                              ? 'var(--rank-silver)'
                              : member.rank === 3
                                ? 'var(--rank-bronze)'
                                : 'var(--text-tertiary)',
                      }}
                    >
                      {member.rank}
                    </span>
                    <span
                      className="truncate text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {member.displayName}
                    </span>
                    {isCurrentUser && (
                      <span
                        className="shrink-0 text-[10px]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        (you)
                      </span>
                    )}
                  </div>
                  {isInactive && (
                    <span
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {member.memberStatus}
                    </span>
                  )}
                </td>

                {/* Prediction cells */}
                {scenarios.map((scenario) => {
                  const pick = memberPredictions?.[scenario.id]
                  const cellStyle = getCellStyle(pick, scenario)

                  return (
                    <td
                      key={scenario.id}
                      className={cn(
                        'border-b border-[var(--border-default)] px-[var(--sp-1)] py-[var(--sp-2)] text-center',
                        isCurrentUser && 'bg-[var(--brand-muted)]',
                      )}
                      style={{
                        backgroundColor:
                          cellStyle.backgroundColor !== 'transparent'
                            ? cellStyle.backgroundColor
                            : isCurrentUser
                              ? 'var(--brand-muted)'
                              : undefined,
                        minHeight: 44,
                      }}
                    >
                      <div className="flex flex-col items-center gap-[1px]">
                        {/* Icon indicator */}
                        {cellStyle.icon === 'check' && (
                          <Check
                            size={14}
                            strokeWidth={2}
                            style={{ color: cellStyle.color }}
                            aria-label="Correct"
                          />
                        )}
                        {cellStyle.icon === 'x' && (
                          <X
                            size={14}
                            strokeWidth={2}
                            style={{ color: cellStyle.color }}
                            aria-label="Incorrect"
                          />
                        )}
                        {cellStyle.icon === 'dash' && pick !== undefined && (
                          <Minus
                            size={12}
                            strokeWidth={1.5}
                            style={{ color: cellStyle.color }}
                            aria-label="Unresolved"
                          />
                        )}

                        {/* Pick value */}
                        {pick !== undefined ? (
                          <span
                            className="text-[10px] leading-tight"
                            style={{ color: cellStyle.color }}
                            title={pick.value}
                          >
                            {truncateValue(pick.value, 6)}
                          </span>
                        ) : (
                          <span
                            className="text-[10px]"
                            style={{ color: 'var(--text-tertiary)' }}
                            aria-label="Not predicted"
                          >
                            &mdash;
                          </span>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
