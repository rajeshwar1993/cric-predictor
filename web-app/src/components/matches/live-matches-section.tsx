'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { LiveFixture } from '@/lib/dal/fixtures'
import { createBrowserClient } from '@/lib/supabase/client'
import { LiveScorecard } from './live-scorecard'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How often to re-check for new live fixtures (60 seconds) */
const FIXTURE_RECHECK_INTERVAL_MS = 60_000

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LiveMatchesSectionProps {
  /** The gang/group ID */
  gangId: string
  /** Initial live fixtures passed from the server component */
  initialLiveFixtures: LiveFixture[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * LiveMatchesSection — client component that renders live scorecards
 * for all currently live fixtures in a gang.
 *
 * Receives initial data from the server and periodically re-checks
 * (~60s) for newly live fixtures. Each scorecard handles its own
 * 15s score polling via the useLiveScores hook.
 *
 * Renders nothing when there are no live fixtures.
 *
 * @see docs/stories/MTCH-002-live-scorecard.md
 */
export function LiveMatchesSection({
  gangId,
  initialLiveFixtures,
}: LiveMatchesSectionProps) {
  const [liveFixtures, setLiveFixtures] = useState<LiveFixture[]>(initialLiveFixtures)
  const supabaseRef = useRef(createBrowserClient())

  // Re-check for new live fixtures periodically
  const recheckFixtures = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return
    }

    try {
      // First get the gang's active league season
      const { data: gangSeason } = await supabaseRef.current
        .from('v2_gang_league_seasons')
        .select('league_id, season_id')
        .eq('gang_id', gangId)
        .eq('is_active', true)
        .single()

      if (!gangSeason) return

      // Fetch live fixtures with team data
      const { data: fixtures } = await supabaseRef.current
        .from('v2_league_season_fixtures')
        .select(
          `
          id,
          match_number,
          start_datetime,
          venue_name,
          status,
          home_team:v2_league_teams!home_team_id (id, name, code, color, logo_url),
          away_team:v2_league_teams!away_team_id (id, name, code, color, logo_url)
        `,
        )
        .eq('league_id', gangSeason.league_id)
        .eq('season_id', gangSeason.season_id)
        .eq('status', 'live')
        .order('start_datetime', { ascending: true })

      if (fixtures && fixtures.length > 0) {
        const mapped: LiveFixture[] = fixtures.map((row) => {
          const homeTeam = row.home_team as unknown as {
            id: string
            name: string
            code: string
            color: string
            logo_url: string | null
          }
          const awayTeam = row.away_team as unknown as {
            id: string
            name: string
            code: string
            color: string
            logo_url: string | null
          }
          return {
            id: row.id,
            leagueId: gangSeason.league_id,
            seasonId: gangSeason.season_id,
            matchNumber: row.match_number,
            startDatetime: row.start_datetime,
            venueName: row.venue_name,
            status: 'live' as const,
            homeTeam: {
              id: homeTeam.id,
              name: homeTeam.name,
              code: homeTeam.code,
              color: homeTeam.color,
              logoUrl: homeTeam.logo_url,
            },
            awayTeam: {
              id: awayTeam.id,
              name: awayTeam.name,
              code: awayTeam.code,
              color: awayTeam.color,
              logoUrl: awayTeam.logo_url,
            },
          }
        })
        setLiveFixtures(mapped)
      } else {
        setLiveFixtures([])
      }
    } catch {
      // Non-critical: keep showing existing data on error
    }
  }, [gangId])

  useEffect(() => {
    let active = true

    const intervalId = setInterval(() => {
      if (active) recheckFixtures()
    }, FIXTURE_RECHECK_INTERVAL_MS)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && active) {
        recheckFixtures()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      active = false
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [recheckFixtures])

  // Render nothing if no live fixtures
  if (liveFixtures.length === 0) {
    return null
  }

  return (
    <section className={cn('mt-8')} aria-label="Live matches">
      {/* Section title with pulsing green dot */}
      <h2 className="mb-4 flex items-center gap-2 text-caption text-text-muted">
        <span
          className="inline-block size-2 motion-safe:animate-pulse rounded-full bg-success"
          aria-hidden="true"
        />
        LIVE
      </h2>

      <div className="flex flex-col gap-4">
        {liveFixtures.map((fixture) => (
          <LiveScorecard
            key={fixture.id}
            fixture={fixture}
            gangId={gangId}
          />
        ))}
      </div>
    </section>
  )
}
