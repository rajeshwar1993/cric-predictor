import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Clock, MapPin, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getGangDetails } from '@/lib/actions/dal-gangs'
import { getFixtureWithDeadline, getTeamCodesForFixture } from '@/lib/dal/predictions'
import { getMatchLeaderboard, getPredictionRevealMatrix } from '@/lib/actions/dal-leaderboards'
import { MatchLeaderboardTable } from '@/components/leaderboards/match-leaderboard-table'
import { PredictionRevealTable } from '@/components/leaderboards/prediction-reveal-table'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MatchPageProps {
  params: Promise<{ groupId: string; matchId: string }>
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

function formatCountdown(targetDate: Date): string {
  const now = new Date()
  const diff = targetDate.getTime() - now.getTime()
  if (diff <= 0) return 'now'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${String(hours)}h ${String(minutes)}m`
  }
  return `${String(minutes)}m`
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: MatchPageProps): Promise<Metadata> {
  const { groupId, matchId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    return { title: 'Leaderboard | Bragg' }
  }

  const fixtureData = await getFixtureWithDeadline(groupId, matchId)
  if (fixtureData === null) {
    return { title: 'Leaderboard | Bragg' }
  }

  const { homeCode, awayCode } = await getTeamCodesForFixture(
    fixtureData.fixture.homeTeamId,
    fixtureData.fixture.awayTeamId,
  )

  return { title: `${homeCode} vs ${awayCode} — Leaderboard | Bragg` }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function MatchLeaderboardPage({ params }: MatchPageProps) {
  const { groupId, matchId } = await params

  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    redirect('/login')
  }

  // Membership check
  const gang = await getGangDetails(groupId, user.id)
  if (gang === null) {
    notFound()
  }
  if (gang.currentUserRole === null) {
    redirect('/dashboard')
  }

  // Fixture + deadline
  const fixtureData = await getFixtureWithDeadline(groupId, matchId)
  if (fixtureData === null) {
    notFound()
  }

  // Team codes
  const { homeCode, awayCode } = await getTeamCodesForFixture(
    fixtureData.fixture.homeTeamId,
    fixtureData.fixture.awayTeamId,
  )

  const fixtureStatus = fixtureData.fixture.status
  const isLocked = fixtureData.isLocked
  const isVoided = fixtureStatus === 'abandoned' || fixtureStatus === 'no_result'
  const isLive = fixtureStatus === 'live'

  // Fetch leaderboard and reveal matrix if locked
  const [leaderboardEntries, revealMatrix] =
    isLocked && !isVoided
      ? await Promise.all([
          getMatchLeaderboard(groupId, matchId),
          getPredictionRevealMatrix(groupId, matchId),
        ])
      : [[], { members: [], scenarios: [], predictions: {} }]

  return (
    <div className="flex flex-col gap-[var(--sp-6)]">
      {/* Back link */}
      <Link
        href={`/group/${groupId}`}
        className="inline-flex items-center gap-[var(--sp-1)] text-sm font-medium transition-colors hover:opacity-80"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ChevronLeft size={16} strokeWidth={1.5} aria-hidden="true" />
        Back to {gang.name}
      </Link>

      {/* Match header */}
      <header className="flex flex-col gap-[var(--sp-2)]">
        <div className="flex items-baseline gap-[var(--sp-2)]">
          <h1
            className="text-3xl font-bold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}
          >
            {homeCode} vs {awayCode}
          </h1>
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Match {String(fixtureData.fixture.matchNumber)}
          </span>
        </div>

        <div
          className="flex items-center gap-[var(--sp-1)] text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Clock size={14} strokeWidth={1.5} aria-hidden="true" />
          <time dateTime={fixtureData.fixture.startDatetime}>
            {formatMatchDateTime(fixtureData.fixture.startDatetime)}
          </time>
        </div>

        <div
          className="flex items-center gap-[var(--sp-1)] text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          <MapPin size={14} strokeWidth={1.5} aria-hidden="true" />
          <span>{fixtureData.fixture.venueName}</span>
        </div>

        {/* Live badge */}
        {isLive && (
          <span
            className="inline-flex w-fit items-center gap-[var(--sp-1)] rounded-[var(--radius-ds-sm)] px-[8px] py-[4px] text-xs font-medium uppercase tracking-[0.05em]"
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
      </header>

      {/* Voided match */}
      {isVoided && (
        <div
          className="flex flex-col items-center gap-[var(--sp-4)] rounded-[var(--radius-ds-lg)] border px-[var(--sp-6)] py-[var(--sp-10)] text-center"
          style={{
            borderColor: 'var(--border-default)',
            backgroundColor: 'var(--bg-raised)',
          }}
        >
          <AlertTriangle
            size={32}
            strokeWidth={1.5}
            style={{ color: 'var(--text-tertiary)' }}
            aria-hidden="true"
          />
          <div className="flex flex-col gap-[var(--sp-1)]">
            <h2
              className="text-xl font-semibold"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}
            >
              Match voided
            </h2>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              No points awarded for this match
            </p>
          </div>
        </div>
      )}

      {/* Pre-lock: countdown placeholder */}
      {!isLocked && !isVoided && (
        <div
          className="flex flex-col items-center gap-[var(--sp-4)] rounded-[var(--radius-ds-lg)] border px-[var(--sp-6)] py-[var(--sp-10)] text-center"
          style={{
            borderColor: 'var(--border-default)',
            backgroundColor: 'var(--bg-raised)',
          }}
        >
          <Clock
            size={32}
            strokeWidth={1.5}
            style={{ color: 'var(--text-tertiary)' }}
            aria-hidden="true"
          />
          <div className="flex flex-col gap-[var(--sp-1)]">
            <h2
              className="text-xl font-semibold"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}
            >
              Leaderboard unlocks in {formatCountdown(fixtureData.deadline)}
            </h2>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              Predictions are still open. Make your picks before the deadline!
            </p>
          </div>
          <Link
            href={`/group/${groupId}/predict/${matchId}`}
            className="mt-[var(--sp-2)] inline-flex h-12 items-center justify-center rounded-[var(--radius-ds-md)] bg-[var(--brand)] px-6 font-semibold text-[var(--brand-on)] transition-colors hover:bg-[var(--brand-hover)]"
          >
            Make predictions
          </Link>
        </div>
      )}

      {/* Post-lock: Leaderboard + Reveal Table */}
      {isLocked && !isVoided && (
        <>
          {/* Match Leaderboard */}
          <section aria-label="Match leaderboard">
            <h2
              className="mb-[var(--sp-3)] font-heading text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Leaderboard
            </h2>
            <MatchLeaderboardTable entries={leaderboardEntries} currentUserId={user.id} />
          </section>

          {/* Prediction Reveal Table */}
          <section aria-label="Prediction reveal">
            <h2
              className="mb-[var(--sp-3)] font-heading text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Who picked what
            </h2>
            <PredictionRevealTable
              members={revealMatrix.members}
              scenarios={revealMatrix.scenarios}
              predictions={revealMatrix.predictions}
              currentUserId={user.id}
              isLive={isLive}
            />
          </section>
        </>
      )}
    </div>
  )
}
