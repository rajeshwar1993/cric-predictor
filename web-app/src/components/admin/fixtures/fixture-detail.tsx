import Link from 'next/link'
import { ArrowLeft, Check, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { FixtureDetailData, MatchStatus } from '@/lib/dal/admin/fixtures'

// ---------------------------------------------------------------------------
// Status badge config (same as table)
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<MatchStatus, { label: string; bgClass: string; textClass: string }> = {
  upcoming: { label: 'Upcoming', bgClass: 'bg-blue-500/20', textClass: 'text-blue-400' },
  live: { label: 'Live', bgClass: 'bg-green-500/20', textClass: 'text-green-400' },
  completed: { label: 'Completed', bgClass: 'bg-amber-500/20', textClass: 'text-amber-400' },
  resolved: { label: 'Resolved', bgClass: 'bg-neutral-500/20', textClass: 'text-neutral-400' },
  abandoned: { label: 'Abandoned', bgClass: 'bg-red-500/20', textClass: 'text-red-400' },
  no_result: { label: 'No Result', bgClass: 'bg-red-500/20', textClass: 'text-red-400' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDatetime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  })
}

function boolLabel(val: boolean | null): string {
  if (val === null) return '\u2014'
  return val ? 'Yes' : 'No'
}

function numOrDash(val: number | null): string {
  if (val === null) return '\u2014'
  return String(val)
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface FixtureDetailProps {
  data: FixtureDetailData
}

export function FixtureDetail({ data }: FixtureDetailProps) {
  const statusConfig = STATUS_BADGE[data.status]

  return (
    <div className="space-y-6">
      {/* Back link + title */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/fixtures"
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-dark-concrete hover:text-text-primary"
          aria-label="Back to fixtures"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-h2 text-text-primary">
            Match #{data.matchNumber}
          </h1>
          <p className="text-sm text-text-secondary">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full align-middle"
              style={{ backgroundColor: data.homeTeam.color }}
            />{' '}
            {data.homeTeam.name} ({data.homeTeam.code}) vs{' '}
            <span
              className="inline-block h-2.5 w-2.5 rounded-full align-middle"
              style={{ backgroundColor: data.awayTeam.color }}
            />{' '}
            {data.awayTeam.name} ({data.awayTeam.code})
          </p>
        </div>
        <span
          className={cn(
            'ml-auto inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
            statusConfig.bgClass,
            statusConfig.textClass,
          )}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* Metadata */}
      <MetadataSection data={data} />

      {/* Results */}
      <ResultsSection data={data} />

      {/* Live Scores */}
      <LiveScoresSection data={data} />

      {/* Scenarios */}
      <ScenariosSection data={data} />

      {/* Predictions */}
      <PredictionsSection data={data} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Metadata Section
// ---------------------------------------------------------------------------

function MetadataSection({ data }: { data: FixtureDetailData }) {
  const fields: { label: string; value: string }[] = [
    { label: 'Fixture ID', value: data.id },
    { label: 'API ID', value: data.apiId },
    { label: 'League ID', value: data.leagueId },
    { label: 'Season ID', value: data.seasonId },
    { label: 'Round', value: data.round },
    { label: 'Start', value: formatDatetime(data.startDatetime) },
    { label: 'Venue', value: data.venueName },
    { label: 'Venue ID', value: data.venueId ?? '\u2014' },
    { label: 'Status', value: data.status },
    { label: 'Status Changed', value: formatDatetime(data.statusChangedAt) },
    { label: 'Pre-match Synced', value: data.preMatchSynced ? 'Yes' : 'No' },
    { label: 'Created At', value: formatDatetime(data.createdAt) },
  ]

  return (
    <SectionCard title="Metadata">
      <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <div key={f.label}>
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
              {f.label}
            </p>
            <p className="mt-0.5 break-all font-mono text-sm text-text-primary">
              {f.value}
            </p>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Results Section
// ---------------------------------------------------------------------------

function ResultsSection({ data }: { data: FixtureDetailData }) {
  const r = data.results

  if (!r) {
    return (
      <SectionCard title="Results">
        <p className="py-4 text-center text-sm text-text-muted">
          No results available yet
        </p>
      </SectionCard>
    )
  }

  const fields: { label: string; value: string }[] = [
    { label: 'Toss Winner', value: r.tossWinner ?? '\u2014' },
    { label: 'Match Winner', value: r.matchWinner ?? '\u2014' },
    { label: 'Top Scorer', value: r.topScorer ?? '\u2014' },
    { label: 'Top Wicket Taker', value: r.topWicketTaker ?? '\u2014' },
    { label: 'Most Sixes Player', value: r.mostSixesPlayer ?? '\u2014' },
    { label: 'Player of Match', value: r.playerOfMatch ?? '\u2014' },
    {
      label: `${data.homeTeam.code} Innings`,
      value: numOrDash(r.homeTeamInningsScore),
    },
    {
      label: `${data.awayTeam.code} Innings`,
      value: numOrDash(r.awayTeamInningsScore),
    },
    {
      label: `${data.homeTeam.code} PP Runs`,
      value: numOrDash(r.homeTeamPowerplayRuns),
    },
    {
      label: `${data.awayTeam.code} PP Runs`,
      value: numOrDash(r.awayTeamPowerplayRuns),
    },
    {
      label: `${data.homeTeam.code} PP Wickets`,
      value: numOrDash(r.homeTeamPowerplayWicketsLost),
    },
    {
      label: `${data.awayTeam.code} PP Wickets`,
      value: numOrDash(r.awayTeamPowerplayWicketsLost),
    },
    { label: 'Total Runs', value: numOrDash(r.totalMatchRuns) },
    { label: 'Total Sixes', value: numOrDash(r.totalMatchSixes) },
    { label: 'Total Wickets', value: numOrDash(r.totalMatchWickets) },
    { label: 'Total Catches', value: numOrDash(r.totalMatchCatches) },
    { label: 'First Wicket Over', value: numOrDash(r.firstWicketOver) },
    { label: 'Fifty Scored', value: boolLabel(r.fiftyScored) },
    { label: 'Bowler 3+ Wickets', value: boolLabel(r.bowlerThreeWickets) },
    { label: 'Super Over', value: boolLabel(r.superOver) },
    {
      label: 'Resolved At',
      value: r.resolvedAt ? formatDatetime(r.resolvedAt) : '\u2014',
    },
  ]

  return (
    <SectionCard title="Results">
      <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <div key={f.label}>
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
              {f.label}
            </p>
            <p className="mt-0.5 text-sm text-text-primary">{f.value}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Live Scores Section
// ---------------------------------------------------------------------------

function LiveScoresSection({ data }: { data: FixtureDetailData }) {
  const ls = data.liveScores

  if (!ls) {
    return (
      <SectionCard title="Live Scores">
        <p className="py-4 text-center text-sm text-text-muted">
          No live data available
        </p>
      </SectionCard>
    )
  }

  const fields: { label: string; value: string }[] = [
    {
      label: `${data.homeTeam.code} Score`,
      value: ls.homeTeamScore ?? '\u2014',
    },
    {
      label: `${data.awayTeam.code} Score`,
      value: ls.awayTeamScore ?? '\u2014',
    },
    {
      label: `${data.homeTeam.code} Overs`,
      value: ls.homeTeamOvers !== null ? String(ls.homeTeamOvers) : '\u2014',
    },
    {
      label: `${data.awayTeam.code} Overs`,
      value: ls.awayTeamOvers !== null ? String(ls.awayTeamOvers) : '\u2014',
    },
    {
      label: 'Run Rate',
      value: ls.currentRunRate !== null ? ls.currentRunRate.toFixed(2) : '\u2014',
    },
    { label: 'Last 6 Balls', value: ls.last6Balls ?? '\u2014' },
    { label: 'Striker', value: ls.strikerName ?? '\u2014' },
    { label: 'Striker Score', value: ls.strikerScore ?? '\u2014' },
    { label: 'Non-Striker', value: ls.nonStrikerName ?? '\u2014' },
    { label: 'Non-Striker Score', value: ls.nonStrikerScore ?? '\u2014' },
    { label: 'Current Bowler', value: ls.currentBowler ?? '\u2014' },
    { label: 'Partnership', value: ls.currentPartnership ?? '\u2014' },
    {
      label: 'Last Polled',
      value: ls.lastPolledAt ? formatDatetime(ls.lastPolledAt) : '\u2014',
    },
    { label: 'Updated At', value: formatDatetime(ls.updatedAt) },
  ]

  return (
    <SectionCard title="Live Scores">
      <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <div key={f.label}>
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
              {f.label}
            </p>
            <p className="mt-0.5 text-sm text-text-primary">{f.value}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Scenarios Section
// ---------------------------------------------------------------------------

function ScenariosSection({ data }: { data: FixtureDetailData }) {
  if (data.scenariosByGang.length === 0) {
    return (
      <SectionCard title="Scenarios">
        <p className="py-4 text-center text-sm text-text-muted">
          No scenarios seeded for this fixture
        </p>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Scenarios">
      <div className="space-y-4">
        {data.scenariosByGang.map((group) => (
          <div key={group.gangId}>
            <h4 className="mb-2 text-sm font-medium text-text-primary">
              {group.gangName}
              <span className="ml-2 text-text-muted">
                ({group.scenarios.length} scenario
                {group.scenarios.length === 1 ? '' : 's'})
              </span>
            </h4>
            <div className="overflow-x-auto rounded-md border border-wire">
              <table className="w-full">
                <thead>
                  <tr className="bg-dark-concrete">
                    <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-widest text-text-muted">
                      Slug
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-widest text-text-muted">
                      Title
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-widest text-text-muted">
                      Phase
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-widest text-text-muted">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-widest text-text-muted">
                      Answer
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.scenarios.map((s) => (
                    <tr
                      key={s.id}
                      className="border-t border-wire/50"
                    >
                      <td className="px-3 py-2 font-mono text-xs text-text-secondary">
                        {s.slug}
                      </td>
                      <td className="max-w-[300px] truncate px-3 py-2 text-sm text-text-primary">
                        {s.title}
                      </td>
                      <td className="px-3 py-2 text-xs text-text-secondary">
                        {s.resolutionPhase}
                      </td>
                      <td className="px-3 py-2">
                        <ScenarioStatusBadge
                          isResolved={s.isResolved}
                          isVoided={s.isVoided}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-text-secondary">
                        {s.correctAnswer ?? '\u2014'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function ScenarioStatusBadge({
  isResolved,
  isVoided,
}: {
  isResolved: boolean
  isVoided: boolean
}) {
  if (isVoided) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] font-medium text-red-400">
        <X size={10} /> Voided
      </span>
    )
  }
  if (isResolved) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-[11px] font-medium text-green-400">
        <Check size={10} /> Resolved
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-yellow-500/20 px-2 py-0.5 text-[11px] font-medium text-yellow-400">
      Pending
    </span>
  )
}

// ---------------------------------------------------------------------------
// Predictions Section
// ---------------------------------------------------------------------------

function PredictionsSection({ data }: { data: FixtureDetailData }) {
  if (data.predictionsByGang.length === 0) {
    return (
      <SectionCard title="Predictions">
        <p className="py-4 text-center text-sm text-text-muted">
          No predictions submitted for this fixture
        </p>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Predictions">
      <div className="overflow-x-auto rounded-md border border-wire">
        <table className="w-full">
          <thead>
            <tr className="bg-dark-concrete">
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-widest text-text-muted">
                Gang
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-widest text-text-muted">
                Total Predictions
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-widest text-text-muted">
                Unique Users
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-widest text-text-muted">
                Members
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-widest text-text-muted">
                Participation
              </th>
            </tr>
          </thead>
          <tbody>
            {data.predictionsByGang.map((g) => {
              const participationPct =
                g.totalMembers > 0
                  ? Math.round((g.distinctUsers / g.totalMembers) * 100)
                  : 0

              return (
                <tr
                  key={g.gangId}
                  className="border-t border-wire/50"
                >
                  <td className="px-4 py-2.5 text-sm font-medium text-text-primary">
                    {g.gangName}
                  </td>
                  <td className="px-4 py-2.5 text-sm tabular-nums text-text-secondary">
                    {g.totalPredictions}
                  </td>
                  <td className="px-4 py-2.5 text-sm tabular-nums text-text-secondary">
                    {g.distinctUsers}
                  </td>
                  <td className="px-4 py-2.5 text-sm tabular-nums text-text-secondary">
                    {g.totalMembers}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-light-concrete">
                        <div
                          className="h-full rounded-full bg-bragg-lime"
                          style={{
                            width: `${Math.min(participationPct, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-text-muted">
                        {participationPct}%
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Shared section card
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-wire bg-concrete-black p-4">
      <h3 className="mb-4 text-sm font-medium uppercase tracking-widest text-text-secondary">
        {title}
      </h3>
      {children}
    </div>
  )
}
