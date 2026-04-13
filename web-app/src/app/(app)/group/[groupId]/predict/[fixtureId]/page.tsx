import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getFixtureWithTeams } from '@/lib/dal/fixtures'
import { getMembershipStatus } from '@/lib/dal/gangs'
import {
  getFixtureScenarios,
  getUserPredictions,
  getMatchPlayers,
  getGangLeagueSeason,
  groupScenariosByPhase,
} from '@/lib/dal/predictions'
import { PREDICTION_WINDOW_MS } from '@/lib/constants'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { PredictPageHeader } from '@/components/predictions/predict-page-header'
import { WindowNotOpenMessage } from '@/components/predictions/window-not-open-message'
import { PredictionForm } from '@/components/predictions/prediction-form'
import { PredictPageAnalytics } from '@/components/predictions/predict-page-analytics'
import type { ScenarioGroupData } from '@/components/predictions/scenario-list'
import { Button } from '@/components/ui/button'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PredictPageProps {
  params: Promise<{ groupId: string; fixtureId: string }>
}

// ---------------------------------------------------------------------------
// Prediction window status
// ---------------------------------------------------------------------------

type WindowStatus = 'not_open' | 'open' | 'locked'

/** Buffer (in ms) to close the UI slightly before the DB deadline.
 *  Prevents the case where the server shows "open" but the DB's `now()`
 *  in RLS policies already considers the deadline passed. */
const DEADLINE_BUFFER_MS = 30_000

function getWindowStatus(
  startDatetime: string,
  predictionDeadlineMins: number,
  fixtureStatus: string,
): WindowStatus {
  // Any status other than 'upcoming' means locked
  if (fixtureStatus !== 'upcoming') return 'locked'

  const now = new Date()
  const startTime = new Date(startDatetime)

  // Deadline = start_datetime minus prediction_deadline_mins, with safety buffer
  const deadline = new Date(
    startTime.getTime() - predictionDeadlineMins * 60 * 1000 - DEADLINE_BUFFER_MS,
  )
  if (now >= deadline) return 'locked'

  // Window opens 12 hours before start
  const windowOpens = new Date(startTime.getTime() - PREDICTION_WINDOW_MS)
  if (now < windowOpens) return 'not_open'

  return 'open'
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: PredictPageProps): Promise<Metadata> {
  const { fixtureId } = await params
  const fixture = await getFixtureWithTeams(fixtureId)

  if (!fixture) {
    return { title: 'Predict' }
  }

  const matchLabel = `${fixture.homeTeam.code} vs ${fixture.awayTeam.code}`

  return {
    title: `Predict — ${matchLabel}`,
    description: `Make your predictions for ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`,
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * PredictPage — the prediction page for a specific fixture within a gang.
 *
 * Server Component that:
 * 1. Verifies auth and gang membership
 * 2. Validates the fixture belongs to the gang's active season
 * 3. Determines the prediction window status (not_open / open / locked)
 * 4. Fetches scenarios + existing predictions
 * 5. Renders the appropriate state
 *
 * @see docs/stories/PRED-001-predict-page.md
 */
export default async function PredictPage({ params }: PredictPageProps) {
  const { groupId, fixtureId } = await params

  // ---------------------------------------------------------------------------
  // Auth gate
  // ---------------------------------------------------------------------------
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ---------------------------------------------------------------------------
  // Membership gate — user must be approved member of this gang
  // ---------------------------------------------------------------------------
  const membership = await getMembershipStatus(groupId, user.id)

  if (!membership || membership.status !== 'approved') {
    redirect('/dashboard')
  }

  // ---------------------------------------------------------------------------
  // Gang league season — needed for deadline and fixture validation
  // ---------------------------------------------------------------------------
  const gangSeason = await getGangLeagueSeason(groupId)

  if (!gangSeason) {
    notFound()
  }

  // ---------------------------------------------------------------------------
  // Fixture validation — must exist and belong to the gang's active season
  // ---------------------------------------------------------------------------
  const fixture = await getFixtureWithTeams(fixtureId)

  if (!fixture) {
    notFound()
  }

  // Verify the fixture belongs to the gang's active league season.
  // Prevents users from crafting a URL with any arbitrary fixtureId.
  if (
    fixture.leagueId !== gangSeason.leagueId ||
    fixture.seasonId !== gangSeason.seasonId
  ) {
    notFound()
  }

  // ---------------------------------------------------------------------------
  // Prediction window status
  // ---------------------------------------------------------------------------
  const windowStatus = getWindowStatus(
    fixture.startDatetime,
    gangSeason.predictionDeadlineMins,
    fixture.status,
  )

  // ---------------------------------------------------------------------------
  // Fetch data for open window
  // ---------------------------------------------------------------------------
  const [scenarios, predictions, players] = await Promise.all([
    windowStatus === 'open' ? getFixtureScenarios(groupId, fixtureId) : Promise.resolve([]),
    windowStatus === 'open'
      ? getUserPredictions(groupId, fixtureId, user.id)
      : Promise.resolve([]),
    windowStatus === 'open'
      ? getMatchPlayers(gangSeason.seasonId, fixture.homeTeam.id, fixture.awayTeam.id)
      : Promise.resolve([]),
  ])

  // Build initial predictions as a plain object for the client component: scenarioId → value
  const initialPredictions: Record<string, string> = {}
  for (const p of predictions) {
    initialPredictions[p.scenarioId] = p.value
  }

  // Compute last submitted timestamp from predictions
  const firstPrediction = predictions[0]
  const lastSubmittedAt = firstPrediction
    ? predictions.reduce((latest, p) => {
        return p.submittedAt > latest ? p.submittedAt : latest
      }, firstPrediction.submittedAt)
    : null

  // Group scenarios by phase
  const scenarioGroups = groupScenariosByPhase(scenarios)

  // Map scenario groups for the client component (serializable data)
  const clientGroups: ScenarioGroupData[] = scenarioGroups.map((g) => ({
    phase: g.phase,
    label: g.label,
    scenarios: g.scenarios.map((s) => ({
      id: s.id,
      title: s.title,
      inputType: s.inputType,
      options: s.options,
      points: s.points,
    })),
  }))

  // Group players by team for the pickers
  const groupedPlayers = {
    home: players.filter((p) => p.teamId === fixture.homeTeam.id),
    away: players.filter((p) => p.teamId === fixture.awayTeam.id),
  }

  // Window opens 12h before start
  const windowOpensAt = new Date(
    new Date(fixture.startDatetime).getTime() - PREDICTION_WINDOW_MS,
  ).toISOString()

  return (
    <PageWrapper className="py-8">
      <PredictPageAnalytics
        gangId={groupId}
        fixtureId={fixtureId}
        lastSubmittedAt={lastSubmittedAt}
      />
      <PredictPageHeader
        fixture={fixture}
        predictionDeadlineMins={gangSeason.predictionDeadlineMins}
        isWindowOpen={windowStatus === 'open'}
      />

      {/* Not open — prediction window hasn't started */}
      {windowStatus === 'not_open' && (
        <WindowNotOpenMessage opensAt={windowOpensAt} gangId={groupId} />
      )}

      {/* Locked — deadline passed or fixture not upcoming */}
      {windowStatus === 'locked' && (
        <PredictionsLockedMessage fixtureId={fixtureId} gangId={groupId} />
      )}

      {/* Open — show scenario groups with pickers + submit bar */}
      {windowStatus === 'open' && (
        <div className="mt-8 flex flex-col gap-8">
          {clientGroups.length === 0 ? (
            <NoScenariosMessage />
          ) : (
            <PredictionForm
              gangId={groupId}
              fixtureId={fixtureId}
              groups={clientGroups}
              homeTeam={fixture.homeTeam}
              awayTeam={fixture.awayTeam}
              players={groupedPlayers}
              initialPredictions={initialPredictions}
              lastSubmittedAt={lastSubmittedAt}
              totalScenarios={scenarios.length}
            />
          )}
        </div>
      )}
    </PageWrapper>
  )
}

// ---------------------------------------------------------------------------
// Status message components
// ---------------------------------------------------------------------------

function PredictionsLockedMessage({
  fixtureId,
  gangId,
}: {
  fixtureId: string
  gangId: string
}) {
  return (
    <div className="mt-12 flex flex-col items-center gap-4 text-center">
      <div className="flex flex-col gap-2">
        <p className="font-display text-h3 font-bold uppercase text-text-primary">
          Predictions locked
        </p>
        <p className="text-body-sm text-text-muted">
          The prediction window has closed. Check the match leaderboard to see how you did.
        </p>
      </div>
      <Link href={`/group/${gangId}/match/${fixtureId}`}>
        <Button variant="secondary" size="sm">
          View leaderboard
        </Button>
      </Link>
    </div>
  )
}

function NoScenariosMessage() {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <p className="font-display text-h3 font-bold text-text-primary">
        No scenarios yet
      </p>
      <p className="text-body-sm text-text-muted">
        Scenarios for this match haven&apos;t been generated yet. Check back closer to match time.
      </p>
    </div>
  )
}
