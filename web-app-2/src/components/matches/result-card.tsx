import Link from 'next/link'
import { Calendar, Check, ChevronRight, Clock, X } from 'lucide-react'
import type { RecentResult } from '@/lib/actions/dal-matches'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ResultCardProps {
  result: RecentResult
  gangId: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function getResultText(result: RecentResult): {
  text: string
  color: string
} {
  if (result.status === 'abandoned' || result.status === 'no_result') {
    return { text: 'Match voided', color: 'var(--text-tertiary)' }
  }

  if (result.status === 'completed') {
    return { text: 'Results pending...', color: 'var(--warning)' }
  }

  // status === 'resolved'
  if (result.winnerName !== null && result.winnerCode !== null) {
    // Build margin text from scores
    let marginText = ''
    if (result.homeScore !== null && result.awayScore !== null) {
      const homeCode = result.homeTeamCode
      const awayCode = result.awayTeamCode
      if (result.winnerCode === homeCode) {
        const runDiff = result.homeScore - result.awayScore
        marginText = ` by ${String(runDiff)} runs`
      } else if (result.winnerCode === awayCode) {
        // Away team won — typically by wickets in a chase, but we only have scores
        marginText = ''
      }
    }
    return {
      text: `${result.winnerCode} won${marginText}`,
      color: 'var(--success)',
    }
  }

  return { text: 'Resolved', color: 'var(--text-secondary)' }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResultCard({ result, gangId }: ResultCardProps) {
  const resultDisplay = getResultText(result)
  const isVoided = result.status === 'abandoned' || result.status === 'no_result'

  return (
    <Link
      href={`/group/${gangId}/match/${result.fixtureId}`}
      className="group block"
      aria-label={`Match ${String(result.matchNumber)}: ${result.homeTeamCode} vs ${result.awayTeamCode} — ${resultDisplay.text}`}
    >
      <article className="flex flex-col gap-[var(--sp-2)] rounded-[var(--radius-ds-lg)] border border-[var(--border-default)] bg-[var(--bg-raised)] p-[var(--sp-4)] transition-colors group-hover:border-[var(--border-strong)]">
        {/* Top row: teams + match info + arrow */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-[var(--sp-2)]">
            <h3 className="text-base font-semibold text-[var(--text-primary)] font-body">
              {result.homeTeamCode} vs {result.awayTeamCode}
            </h3>
            <span className="text-xs font-medium text-[var(--text-tertiary)]">
              Match {result.matchNumber}
            </span>
          </div>
          <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
        </div>

        {/* Date */}
        <div className="flex items-center gap-[var(--sp-1)] text-xs text-[var(--text-secondary)]">
          <Calendar size={12} strokeWidth={1.5} aria-hidden="true" />
          <time dateTime={result.startDatetime}>{formatDate(result.startDatetime)}</time>
        </div>

        {/* Result */}
        <div className="flex items-center gap-[var(--sp-1)] text-sm font-semibold">
          {result.status === 'resolved' && result.winnerName !== null && (
            <Check
              size={14}
              strokeWidth={2}
              style={{ color: resultDisplay.color }}
              aria-hidden="true"
            />
          )}
          {result.status === 'completed' && (
            <Clock
              size={14}
              strokeWidth={1.5}
              style={{ color: resultDisplay.color }}
              aria-hidden="true"
            />
          )}
          {isVoided && (
            <X
              size={14}
              strokeWidth={2}
              style={{ color: resultDisplay.color }}
              aria-hidden="true"
            />
          )}
          <span style={{ color: resultDisplay.color }}>{resultDisplay.text}</span>
        </div>

        {/* User stats */}
        {result.userStats !== null && !isVoided && (
          <div className="flex items-center gap-[var(--sp-2)] text-xs font-medium text-[var(--text-secondary)]">
            <span>
              {result.userStats.predictedCount}/{result.totalScenarios} picked
            </span>
            <span
              className="inline-block h-[3px] w-[3px] rounded-full bg-[var(--text-tertiary)]"
              aria-hidden="true"
            />
            <span>{result.userStats.correctCount} correct</span>
            <span
              className="inline-block h-[3px] w-[3px] rounded-full bg-[var(--text-tertiary)]"
              aria-hidden="true"
            />
            <span className="text-[var(--brand)]">{result.userStats.pointsEarned} pts</span>
          </div>
        )}

        {/* Voided message */}
        {isVoided && (
          <div className="text-xs font-medium text-[var(--text-tertiary)]">No points awarded</div>
        )}
      </article>
    </Link>
  )
}
