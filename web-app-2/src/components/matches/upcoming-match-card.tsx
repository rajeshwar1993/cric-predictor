'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { UpcomingMatch } from '@/lib/actions/dal-matches'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UpcomingMatchCardProps {
  match: UpcomingMatch
  gangId: string
  /** Optional slot for prediction status indicator (server component) */
  statusIndicator?: ReactNode
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMatchDateTime(isoString: string): string {
  const date = new Date(isoString)
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)
}

function computeDeadline(startDatetime: string, deadlineMins: number): string {
  const start = new Date(startDatetime)
  const deadline = new Date(start.getTime() - deadlineMins * 60 * 1000)
  const now = new Date()
  const diffMs = deadline.getTime() - now.getTime()

  if (diffMs <= 0) return 'Predictions locked'

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (diffHours > 24) {
    const days = Math.floor(diffHours / 24)
    return `Deadline in ${String(days)}d ${String(diffHours % 24)}h`
  }

  if (diffHours > 0) {
    return `Deadline in ${String(diffHours)}h ${String(diffMinutes)}m`
  }

  return `Deadline in ${String(diffMinutes)}m`
}

function isDeadlineUrgent(startDatetime: string, deadlineMins: number): boolean {
  const start = new Date(startDatetime)
  const deadline = new Date(start.getTime() - deadlineMins * 60 * 1000)
  const now = new Date()
  const diffMs = deadline.getTime() - now.getTime()
  // Urgent if less than 2 hours remain
  return diffMs > 0 && diffMs < 2 * 60 * 60 * 1000
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UpcomingMatchCard({ match, gangId, statusIndicator }: UpcomingMatchCardProps) {
  const isLive = match.status === 'live'
  const deadlineText = isLive
    ? 'Predictions locked'
    : computeDeadline(match.startDatetime, match.predictionDeadlineMins)
  const urgent = !isLive && isDeadlineUrgent(match.startDatetime, match.predictionDeadlineMins)

  return (
    <article
      className="flex flex-col gap-[var(--sp-3)] rounded-[length:var(--radius-ds-lg)] border border-[var(--border-default)] bg-[var(--bg-raised)] p-[var(--sp-4)]"
      aria-label={`Match ${String(match.matchNumber)}: ${match.homeTeamCode} vs ${match.awayTeamCode}`}
    >
      {/* Top row: teams + live badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-[var(--sp-2)]">
          <h3
            className="text-base font-semibold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
          >
            {match.homeTeamCode} vs {match.awayTeamCode}
          </h3>
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Match {match.matchNumber}
          </span>
        </div>
        {isLive && (
          <span
            className="inline-flex items-center gap-[var(--sp-1)] rounded-[length:var(--radius-ds-sm)] px-[8px] py-[4px] text-xs font-medium uppercase tracking-[0.05em]"
            style={{
              backgroundColor: 'var(--error-muted)',
              color: 'var(--live)',
            }}
            aria-label="Live match"
          >
            <span
              className="inline-block h-[6px] w-[6px] rounded-full"
              style={{
                backgroundColor: 'var(--live)',
                animation: 'pulse-live 1.5s ease-in-out infinite',
              }}
              aria-hidden="true"
            />
            LIVE
          </span>
        )}
      </div>

      {/* Date + time */}
      <div
        className="flex items-center gap-[var(--sp-1)] text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        <Clock size={14} strokeWidth={1.5} aria-hidden="true" />
        <time dateTime={match.startDatetime}>{formatMatchDateTime(match.startDatetime)}</time>
      </div>

      {/* Venue */}
      <div
        className="flex items-center gap-[var(--sp-1)] text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        <MapPin size={14} strokeWidth={1.5} aria-hidden="true" />
        <span>{match.venueName}</span>
      </div>

      {/* Prediction deadline */}
      <div
        className="flex items-center gap-[var(--sp-1)] text-xs font-medium"
        style={{ color: urgent ? 'var(--warning)' : 'var(--text-secondary)' }}
      >
        <Clock size={12} strokeWidth={1.5} aria-hidden="true" />
        <span>{deadlineText}</span>
      </div>

      {/* Prediction status indicator slot */}
      {statusIndicator !== undefined && statusIndicator}

      {/* CTA */}
      {!isLive && deadlineText !== 'Predictions locked' && (
        <Link
          href={`/group/${gangId}/predict/${match.fixtureId}`}
          className="mt-[var(--sp-1)]"
          tabIndex={-1}
        >
          <Button
            className="w-full"
            aria-label={`Make predictions for ${match.homeTeamCode} vs ${match.awayTeamCode}`}
          >
            Make Your Calls
          </Button>
        </Link>
      )}
    </article>
  )
}
