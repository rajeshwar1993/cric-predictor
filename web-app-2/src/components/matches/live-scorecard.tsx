'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LiveScoreData {
  homeTeamScore: string | null
  awayTeamScore: string | null
  homeTeamOvers: number | null
  awayTeamOvers: number | null
  battingTeamId: string | null
  currentRunRate: number | null
  last6Balls: string | null
  strikerName: string | null
  strikerScore: string | null
  nonStrikerName: string | null
  nonStrikerScore: string | null
  currentBowler: string | null
  currentPartnership: string | null
  lastPolledAt: string | null
}

export interface TeamInfo {
  teamId: string
  code: string
  name: string
}

interface LiveScorecardProps {
  fixtureId: string
  initialScoreData: LiveScoreData | null
  homeTeam: TeamInfo
  awayTeam: TeamInfo
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 15_000
const STALE_THRESHOLD_MS = 60_000

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatOvers(overs: number | null): string {
  if (overs === null) return ''
  return `(${String(overs)})`
}

function getStaleText(lastPolledAt: string | null): string | null {
  if (lastPolledAt === null) return null
  const diff = Date.now() - new Date(lastPolledAt).getTime()
  if (diff < STALE_THRESHOLD_MS) return null

  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Last updated <1m ago'
  if (mins === 1) return 'Last updated 1m ago'
  return `Last updated ${String(mins)}m ago`
}

type BallType = 'dot' | 'run' | 'four' | 'six' | 'wicket' | 'extra'

interface BallPill {
  label: string
  type: BallType
}

function parseLast6Balls(raw: string | null): BallPill[] {
  if (raw === null || raw.trim() === '') return []

  return raw
    .split(/[,\s]+/)
    .filter((s) => s.length > 0)
    .slice(-6)
    .map((ball): BallPill => {
      const upper = ball.toUpperCase()

      if (upper === 'W') {
        return { label: 'W', type: 'wicket' }
      }
      if (upper === '0' || upper === '.') {
        return { label: '0', type: 'dot' }
      }
      if (upper === '4') {
        return { label: '4', type: 'four' }
      }
      if (upper === '6') {
        return { label: '6', type: 'six' }
      }
      if (
        upper.includes('WD') ||
        upper.includes('NB') ||
        upper.includes('WB') ||
        upper.includes('LB')
      ) {
        return { label: ball, type: 'extra' }
      }

      const num = parseInt(ball, 10)
      if (!isNaN(num) && num >= 1 && num <= 3) {
        return { label: ball, type: 'run' }
      }

      return { label: ball, type: 'run' }
    })
}

function getBallPillStyles(type: BallType): { backgroundColor: string; color: string } {
  switch (type) {
    case 'dot':
      return { backgroundColor: 'var(--bg-overlay)', color: 'var(--text-tertiary)' }
    case 'run':
      return { backgroundColor: 'var(--bg-overlay)', color: 'var(--text-primary)' }
    case 'four':
      return { backgroundColor: 'var(--info-muted)', color: 'var(--info)' }
    case 'six':
      return { backgroundColor: 'var(--brand-muted)', color: 'var(--brand)' }
    case 'wicket':
      return { backgroundColor: 'var(--error-muted)', color: 'var(--error)' }
    case 'extra':
      return { backgroundColor: 'var(--warning-muted)', color: 'var(--warning)' }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function toStrOrNull(val: unknown): string | null {
  if (val === null || val === undefined) return null
  if (typeof val === 'string') return val
  if (typeof val === 'number' || typeof val === 'boolean') return val.toString()
  return JSON.stringify(val)
}

function toNumOrNull(val: unknown): number | null {
  if (val === null || val === undefined) return null
  return Number(val)
}

function parseRowToScoreData(row: Record<string, unknown>): LiveScoreData {
  return {
    homeTeamScore: toStrOrNull(row.home_team_score),
    awayTeamScore: toStrOrNull(row.away_team_score),
    homeTeamOvers: toNumOrNull(row.home_team_overs),
    awayTeamOvers: toNumOrNull(row.away_team_overs),
    battingTeamId: toStrOrNull(row.batting_team_id),
    currentRunRate: toNumOrNull(row.current_run_rate),
    last6Balls: toStrOrNull(row.last_6_balls),
    strikerName: toStrOrNull(row.striker_name),
    strikerScore: toStrOrNull(row.striker_score),
    nonStrikerName: toStrOrNull(row.non_striker_name),
    nonStrikerScore: toStrOrNull(row.non_striker_score),
    currentBowler: toStrOrNull(row.current_bowler),
    currentPartnership: toStrOrNull(row.current_partnership),
    lastPolledAt: toStrOrNull(row.last_polled_at),
  }
}

export function LiveScorecard({
  fixtureId,
  initialScoreData,
  homeTeam,
  awayTeam,
}: LiveScorecardProps) {
  const [scoreData, setScoreData] = useState(initialScoreData)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLiveScore = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('v2_fixture_live_scores')
        .select('*')
        .eq('fixture_id', fixtureId)
        .single()

      if (error !== null) return

      const row = data as unknown as Record<string, unknown>
      setScoreData(parseRowToScoreData(row))
    } catch {
      // Silently fail — keep showing last known data
    }
  }, [fixtureId])

  useEffect(() => {
    // Start polling via interval — first tick fires after POLL_INTERVAL_MS.
    // initialScoreData covers the first render; interval keeps it fresh.
    intervalRef.current = setInterval(() => {
      void fetchLiveScore()
    }, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchLiveScore])

  const staleText = getStaleText(scoreData?.lastPolledAt ?? null)
  const isBattingHome = scoreData?.battingTeamId === homeTeam.teamId
  const isBattingAway = scoreData?.battingTeamId === awayTeam.teamId
  const balls = parseLast6Balls(scoreData?.last6Balls ?? null)

  return (
    <article
      className="flex flex-col gap-[var(--sp-3)] rounded-[var(--radius-ds-lg)] border border-[var(--border-default)] bg-[var(--bg-raised)] p-[var(--sp-4)]"
      aria-label={`Live scorecard: ${homeTeam.code} vs ${awayTeam.code}`}
      aria-live="polite"
    >
      {/* Header: LIVE badge + stale indicator */}
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center gap-[var(--sp-1)] rounded-[var(--radius-ds-sm)] px-[8px] py-[4px] text-xs font-medium uppercase tracking-[0.05em]"
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

        {staleText !== null && (
          <span
            className="inline-flex items-center gap-[var(--sp-1)] rounded-[var(--radius-ds-sm)] px-[6px] py-[2px] text-xs font-medium"
            style={{
              backgroundColor: 'var(--warning-muted)',
              color: 'var(--warning)',
            }}
            role="status"
          >
            <AlertTriangle size={12} strokeWidth={1.5} aria-hidden="true" />
            {staleText}
          </span>
        )}
      </div>

      {/* Team scores */}
      <div className="flex flex-col gap-[var(--sp-2)]">
        {/* Home team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[var(--sp-2)]">
            {isBattingHome && (
              <span
                className="inline-block h-[6px] w-[6px] rounded-full"
                style={{ backgroundColor: 'var(--brand)' }}
                aria-label="Currently batting"
              />
            )}
            <span
              className="text-base font-semibold"
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {homeTeam.code}
            </span>
          </div>
          <div className="flex items-baseline gap-[var(--sp-1)]">
            <span
              className="tabular-nums"
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: 'var(--text-4xl)',
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {scoreData?.homeTeamScore ?? '-'}
            </span>
            <span className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
              {formatOvers(scoreData?.homeTeamOvers ?? null)}
            </span>
          </div>
        </div>

        {/* Away team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[var(--sp-2)]">
            {isBattingAway && (
              <span
                className="inline-block h-[6px] w-[6px] rounded-full"
                style={{ backgroundColor: 'var(--brand)' }}
                aria-label="Currently batting"
              />
            )}
            <span
              className="text-base font-semibold"
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {awayTeam.code}
            </span>
          </div>
          <div className="flex items-baseline gap-[var(--sp-1)]">
            <span
              className="tabular-nums"
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: 'var(--text-4xl)',
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {scoreData?.awayTeamScore ?? '-'}
            </span>
            <span className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
              {formatOvers(scoreData?.awayTeamOvers ?? null)}
            </span>
          </div>
        </div>
      </div>

      {/* Run rate */}
      {scoreData !== null && scoreData.currentRunRate !== null && (
        <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          CRR: {scoreData.currentRunRate.toFixed(2)}
        </div>
      )}

      {/* Last 6 balls */}
      {balls.length > 0 && (
        <div className="flex flex-col gap-[var(--sp-1)]">
          <span
            className="text-xs font-medium uppercase tracking-[0.05em]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Last 6 balls
          </span>
          <div className="flex items-center gap-[var(--sp-1)]" aria-label="Last 6 balls">
            {balls.map((ball, i) => {
              const styles = getBallPillStyles(ball.type)
              return (
                <span
                  key={i}
                  className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: styles.backgroundColor,
                    color: styles.color,
                  }}
                  aria-label={
                    ball.type === 'wicket'
                      ? 'Wicket'
                      : ball.type === 'four'
                        ? 'Four'
                        : ball.type === 'six'
                          ? 'Six'
                          : ball.type === 'extra'
                            ? 'Extra'
                            : ball.type === 'dot'
                              ? 'Dot ball'
                              : `${ball.label} run${ball.label === '1' ? '' : 's'}`
                  }
                >
                  {ball.label}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Batsmen */}
      {scoreData !== null &&
        (scoreData.strikerName !== null || scoreData.nonStrikerName !== null) && (
          <div className="flex flex-col gap-[var(--sp-1)]">
            <span
              className="text-xs font-medium uppercase tracking-[0.05em]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Batting
            </span>
            <div className="flex flex-col gap-[var(--sp-1)]">
              {scoreData.strikerName !== null && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[var(--sp-1)]">
                    <span
                      className="inline-block h-[6px] w-[6px] rounded-full"
                      style={{ backgroundColor: 'var(--brand)' }}
                      aria-label="On strike"
                    />
                    <span
                      className="text-base font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {scoreData.strikerName}
                    </span>
                  </div>
                  <span
                    className="text-lg font-bold tabular-nums"
                    style={{
                      color: 'var(--text-primary)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {scoreData.strikerScore ?? '0'}
                  </span>
                </div>
              )}
              {scoreData.nonStrikerName !== null && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[var(--sp-1)]">
                    <span
                      className="inline-block h-[6px] w-[6px] rounded-full"
                      style={{ backgroundColor: 'transparent' }}
                      aria-hidden="true"
                    />
                    <span
                      className="text-base font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {scoreData.nonStrikerName}
                    </span>
                  </div>
                  <span
                    className="text-lg font-bold tabular-nums"
                    style={{
                      color: 'var(--text-secondary)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {scoreData.nonStrikerScore ?? '0'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Bowler */}
      {scoreData !== null && scoreData.currentBowler !== null && (
        <div className="flex flex-col gap-[var(--sp-1)]">
          <span
            className="text-xs font-medium uppercase tracking-[0.05em]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Bowling
          </span>
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {scoreData.currentBowler}
          </span>
        </div>
      )}

      {/* Partnership */}
      {scoreData !== null && scoreData.currentPartnership !== null && (
        <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Partnership: {scoreData.currentPartnership}
        </div>
      )}

      {/* Predictions locked indicator */}
      <div
        className="flex items-center gap-[var(--sp-1)] text-xs font-medium"
        style={{ color: 'var(--prediction-locked)' }}
      >
        <Lock size={12} strokeWidth={1.5} aria-hidden="true" />
        <span>Predictions locked</span>
      </div>
    </article>
  )
}

// Re-export helper for testing in stories
export { parseLast6Balls, getBallPillStyles, getStaleText }
