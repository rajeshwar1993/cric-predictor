import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getGangDetails } from '@/lib/actions/dal-gangs'
import { getSeasonStandings, getActiveSeason } from '@/lib/actions/dal-leaderboards'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StandingsPageProps {
  params: Promise<{ groupId: string }>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitial(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0) return '?'
  return (trimmed[0] ?? '?').toUpperCase()
}

function getRankColor(rank: number): string {
  if (rank === 1) return 'var(--rank-gold)'
  if (rank === 2) return 'var(--rank-silver)'
  if (rank === 3) return 'var(--rank-bronze)'
  return 'var(--text-secondary)'
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: StandingsPageProps): Promise<Metadata> {
  const { groupId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    return { title: 'Standings | Bragg' }
  }

  const gang = await getGangDetails(groupId, user.id)
  if (gang === null) {
    return { title: 'Standings | Bragg' }
  }

  return { title: `Standings — ${gang.name} | Bragg` }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function StandingsPage({ params }: StandingsPageProps) {
  const { groupId } = await params

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

  // Get active season
  const activeSeason = await getActiveSeason()

  if (activeSeason === null) {
    return (
      <div className="flex flex-col gap-[var(--sp-6)]">
        <Link
          href={`/group/${groupId}`}
          className="inline-flex items-center gap-[var(--sp-1)] text-sm font-medium transition-colors hover:opacity-80 text-[var(--text-secondary)]"
        >
          <ChevronLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Back to {gang.name}
        </Link>
        <EmptyState
          icon={<Trophy size={32} strokeWidth={1.5} />}
          title="No active season"
          description="Check back when a season starts"
        />
      </div>
    )
  }

  const seasonId = activeSeason.id
  const seasonName = activeSeason.name

  // Fetch standings
  const standings = await getSeasonStandings(groupId, seasonId)

  // Sort: active first, then inactive
  const sorted = [...standings].sort((a, b) => {
    const aInactive = a.memberStatus !== 'approved' ? 1 : 0
    const bInactive = b.memberStatus !== 'approved' ? 1 : 0
    if (aInactive !== bInactive) return aInactive - bInactive
    return a.rank - b.rank
  })

  return (
    <div className="flex flex-col gap-[var(--sp-6)]">
      {/* Back link */}
      <Link
        href={`/group/${groupId}`}
        className="inline-flex items-center gap-[var(--sp-1)] text-sm font-medium transition-colors hover:opacity-80 text-[var(--text-secondary)]"
      >
        <ChevronLeft size={16} strokeWidth={1.5} aria-hidden="true" />
        Back to {gang.name}
      </Link>

      {/* Header */}
      <header>
        <h1 className="font-heading text-3xl font-bold text-[var(--text-primary)]">Standings</h1>
        <p className="mt-[var(--sp-1)] text-sm text-[var(--text-secondary)]">
          {gang.name} &middot; {seasonName}
        </p>
      </header>

      {/* Standings table */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={<Trophy size={32} strokeWidth={1.5} />}
          title="The leaderboard's empty"
          description="Make your first pick to get on the board!"
          action={
            <Link
              href={`/group/${groupId}`}
              className="inline-flex h-12 items-center justify-center rounded-[var(--radius-ds-md)] bg-[var(--brand)] px-6 font-semibold text-[var(--brand-on)] transition-colors hover:bg-[var(--brand-hover)]"
            >
              View matches
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-ds-lg)] border border-[var(--border-default)]">
          {/* Header row */}
          <div className="hidden items-center gap-[var(--sp-3)] border-b border-[var(--border-default)] px-[var(--sp-4)] py-[var(--sp-2)] text-xs font-medium uppercase tracking-[0.05em] sm:flex bg-[var(--bg-overlay)] text-[var(--text-tertiary)]">
            <span className="w-8 shrink-0 text-right">#</span>
            <span className="flex-1">Name</span>
            <span className="hidden w-14 shrink-0 text-right sm:block">Matches</span>
            <span className="hidden w-14 shrink-0 text-right sm:block">Pts/M</span>
            <span className="hidden w-14 shrink-0 text-right sm:block">Acc %</span>
            <span className="w-16 shrink-0 text-right">Points</span>
          </div>

          {/* Rows */}
          <ul className="flex flex-col" role="list" aria-label="Season standings">
            {sorted.map((entry) => {
              const isCurrentUser = entry.userId === user.id
              const isInactive = entry.memberStatus !== 'approved'

              return (
                <li
                  key={entry.userId}
                  className={cn(
                    'flex items-center gap-[var(--sp-3)] border-b border-[var(--border-default)] px-[var(--sp-4)] py-[var(--sp-3)]',
                    isCurrentUser &&
                      'border-l-[3px] border-l-[var(--brand)] bg-[var(--brand-muted)]',
                    isInactive && 'opacity-50',
                  )}
                  style={{
                    minHeight: 56,
                    backgroundColor:
                      isCurrentUser && !isInactive ? 'var(--brand-muted)' : 'var(--bg-raised)',
                  }}
                  aria-label={`Rank ${String(entry.rank)}: ${entry.displayName}${isCurrentUser ? ' (you)' : ''} — ${String(entry.totalPoints)} points`}
                >
                  {/* Rank */}
                  <span
                    className="w-8 shrink-0 text-right text-lg font-bold tabular-nums"
                    style={{
                      color: getRankColor(entry.rank),
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {entry.rank}
                  </span>

                  {/* Avatar */}
                  <Avatar size="sm">
                    <AvatarFallback>{getInitial(entry.displayName)}</AvatarFallback>
                  </Avatar>

                  {/* Name */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-[var(--sp-1)]">
                      <span className="truncate text-base font-medium text-[var(--text-primary)]">
                        {entry.displayName}
                      </span>
                      {isCurrentUser && (
                        <span className="shrink-0 text-xs text-[var(--text-secondary)]">(you)</span>
                      )}
                    </div>
                    {isInactive && (
                      <span className="text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
                        {entry.memberStatus}
                      </span>
                    )}
                  </div>

                  {/* Matches predicted — hidden on mobile */}
                  <span
                    className="hidden w-14 shrink-0 text-right text-sm tabular-nums sm:block text-[var(--text-secondary)]"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {entry.matchesPredicted}
                  </span>

                  {/* Points per match — hidden on mobile */}
                  <span
                    className="hidden w-14 shrink-0 text-right text-sm tabular-nums sm:block text-[var(--text-secondary)]"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {entry.pointsPerMatch.toFixed(1)}
                  </span>

                  {/* Accuracy — hidden on mobile */}
                  <span
                    className="hidden w-14 shrink-0 text-right text-sm tabular-nums sm:block text-[var(--text-secondary)]"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {entry.accuracyPct}%
                  </span>

                  {/* Points — always visible */}
                  <span
                    className="shrink-0 text-lg font-bold tabular-nums text-[var(--brand)]"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {entry.totalPoints}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
