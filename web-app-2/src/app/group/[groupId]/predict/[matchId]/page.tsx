import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Lock, Clock, MapPin, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getGangDetails } from '@/lib/actions/dal-gangs'
import {
  getFixtureWithDeadline,
  getScenariosForFixture,
  getUserPredictions,
  getPlayersForFixture,
  getTeamCodesForFixture,
} from '@/lib/dal/predictions'
import { PredictionForm } from '@/components/predictions/prediction-form'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PredictPageProps {
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

function formatDeadline(deadline: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(deadline)
}

function formatWindowOpensAt(windowOpensAt: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(windowOpensAt)
}

function formatLastUpdated(submittedAt: string): string {
  const date = new Date(submittedAt)
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: PredictPageProps): Promise<Metadata> {
  const { groupId, matchId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    return { title: 'Predict | Bragg' }
  }

  const fixtureData = await getFixtureWithDeadline(groupId, matchId)
  if (fixtureData === null) {
    return { title: 'Predict | Bragg' }
  }

  const { homeCode, awayCode } = await getTeamCodesForFixture(
    fixtureData.fixture.homeTeamId,
    fixtureData.fixture.awayTeamId,
  )

  return { title: `Predict — ${homeCode} vs ${awayCode} | Bragg` }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function PredictPage({ params }: PredictPageProps) {
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
    redirect(`/group/${groupId}`)
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

  const now = new Date()
  const isPreWindow = now < fixtureData.windowOpensAt

  // For pre-window state, render early without fetching scenarios
  if (isPreWindow) {
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
        <MatchHeader
          homeCode={homeCode}
          awayCode={awayCode}
          matchNumber={fixtureData.fixture.matchNumber}
          startDatetime={fixtureData.fixture.startDatetime}
          venueName={fixtureData.fixture.venueName}
          deadline={fixtureData.deadline}
          isLocked={false}
        />

        {/* Pre-window message */}
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
              Predictions not open yet
            </h2>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              Predictions open at {formatWindowOpensAt(fixtureData.windowOpensAt)}
            </p>
          </div>
          <Link
            href={`/group/${groupId}`}
            className="mt-[var(--sp-2)] inline-flex h-12 items-center justify-center rounded-[var(--radius-ds-md)] bg-[var(--brand)] px-6 font-semibold text-[var(--brand-on)] transition-colors hover:bg-[var(--brand-hover)]"
          >
            Back to gang
          </Link>
        </div>
      </div>
    )
  }

  // Fetch scenarios, existing predictions, and players in parallel
  const scenarios = await getScenariosForFixture(groupId, matchId)
  const scenarioIds = scenarios.map((s) => s.id)

  const [existingPredictions, players] = await Promise.all([
    getUserPredictions(scenarioIds),
    getPlayersForFixture(matchId),
  ])

  // Find most recent submitted_at from existing predictions
  const lastUpdated =
    existingPredictions.length > 0
      ? existingPredictions.reduce((latest, p) => {
          return new Date(p.submittedAt) > new Date(latest.submittedAt) ? p : latest
        }).submittedAt
      : null

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
      <MatchHeader
        homeCode={homeCode}
        awayCode={awayCode}
        matchNumber={fixtureData.fixture.matchNumber}
        startDatetime={fixtureData.fixture.startDatetime}
        venueName={fixtureData.fixture.venueName}
        deadline={fixtureData.deadline}
        isLocked={fixtureData.isLocked}
      />

      {/* Last updated timestamp */}
      {lastUpdated !== null && (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Last updated: {formatLastUpdated(lastUpdated)}
        </p>
      )}

      {/* Locked banner (above the form) */}
      {fixtureData.isLocked && (
        <div
          className="flex items-center gap-[var(--sp-2)] rounded-[var(--radius-ds-md)] border px-[var(--sp-4)] py-[var(--sp-3)]"
          style={{
            borderColor: 'var(--prediction-locked)',
            backgroundColor: 'var(--bg-overlay)',
          }}
          role="alert"
        >
          <Lock
            size={16}
            strokeWidth={1.5}
            style={{ color: 'var(--prediction-locked)' }}
            aria-hidden="true"
          />
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Predictions locked
          </span>
        </div>
      )}

      {/* Prediction form */}
      <PredictionForm
        gangId={groupId}
        fixtureId={matchId}
        scenarios={scenarios}
        existingPredictions={existingPredictions}
        players={players}
        isLocked={fixtureData.isLocked}
        homeTeam={{ id: fixtureData.fixture.homeTeamId, code: homeCode }}
        awayTeam={{ id: fixtureData.fixture.awayTeamId, code: awayCode }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Match Header (sub-component)
// ---------------------------------------------------------------------------

interface MatchHeaderProps {
  homeCode: string
  awayCode: string
  matchNumber: number
  startDatetime: string
  venueName: string
  deadline: Date
  isLocked: boolean
}

function MatchHeader({
  homeCode,
  awayCode,
  matchNumber,
  startDatetime,
  venueName,
  deadline,
  isLocked,
}: MatchHeaderProps) {
  return (
    <header className="flex flex-col gap-[var(--sp-2)]">
      {/* Teams */}
      <div className="flex items-baseline gap-[var(--sp-2)]">
        <h1
          className="text-3xl font-bold"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}
        >
          {homeCode} vs {awayCode}
        </h1>
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Match {String(matchNumber)}
        </span>
      </div>

      {/* Date/time */}
      <div
        className="flex items-center gap-[var(--sp-1)] text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        <Clock size={14} strokeWidth={1.5} aria-hidden="true" />
        <time dateTime={startDatetime}>{formatMatchDateTime(startDatetime)}</time>
      </div>

      {/* Venue */}
      <div
        className="flex items-center gap-[var(--sp-1)] text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        <MapPin size={14} strokeWidth={1.5} aria-hidden="true" />
        <span>{venueName}</span>
      </div>

      {/* Deadline */}
      <div
        className="flex items-center gap-[var(--sp-1)] text-xs font-medium"
        style={{ color: isLocked ? 'var(--prediction-locked)' : 'var(--warning)' }}
      >
        {isLocked ? (
          <Lock size={12} strokeWidth={1.5} aria-hidden="true" />
        ) : (
          <Clock size={12} strokeWidth={1.5} aria-hidden="true" />
        )}
        <span>{isLocked ? 'Predictions locked' : `Deadline: ${formatDeadline(deadline)}`}</span>
      </div>
    </header>
  )
}
