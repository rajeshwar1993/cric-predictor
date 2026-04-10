'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import {
  PHASE_LABELS,
  PHASE_ORDER,
  type MatchPredictionCell,
  type MatchPredictionMember,
  type MatchPredictionPhaseGroup,
  type MatchPredictionPlayer,
  type MatchPredictionScenario,
  type MatchPredictionTeam,
  type MatchPredictionsDataset,
} from '@/lib/dal/predictions-shared'
import type { MemberStatus, ResolutionPhase, ScenarioInputType } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Polling interval (30s — matches useMatchLeaderboard cadence). */
const POLL_INTERVAL_MS = 30_000

const DEPARTED_STATUSES: MemberStatus[] = ['left', 'removed']

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseMatchPredictionsResult {
  /** The reveal dataset, or null before the first successful fetch. */
  data: MatchPredictionsDataset | null
  /** True during the initial fetch before any data arrives. */
  isLoading: boolean
  /** Error message if the last fetch failed. */
  error: string | null
}

type ProfileShape = { display_name: string | null; avatar_url: string | null } | null

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * usePredictionReveal poller.
 *
 * Polls the reveal dataset (leaderboard + scenarios + predictions + teams +
 * players) every 30s when `enabled` is true. Pauses when the tab is hidden,
 * re-polls immediately when it becomes visible, and guards against concurrent
 * requests.
 *
 * Mirrors the `useMatchLeaderboard` pattern: uses a browser Supabase client
 * and re-implements the DAL query shape here (we can't import server-only
 * DAL code into client hooks).
 *
 * @see src/hooks/use-match-leaderboard.ts
 * @see src/lib/dal/predictions.ts#getMatchPredictions
 */
export function useMatchPredictions(
  gangId: string,
  fixtureId: string,
  enabled: boolean,
): UseMatchPredictionsResult {
  const [data, setData] = useState<MatchPredictionsDataset | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabaseRef = useRef(createBrowserClient())
  const isPollingRef = useRef(false)

  const poll = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return
    }

    if (isPollingRef.current) return
    isPollingRef.current = true

    try {
      // Step 1: leaderboard (members + ordering + profile + status)
      const { data: standings, error: standingsError } = await supabaseRef.current
        .from('v2_gang_fixture_standings')
        .select(
          `
          user_id, rank,
          v2_profiles (display_name, avatar_url)
        `,
        )
        .eq('gang_id', gangId)
        .eq('fixture_id', fixtureId)
        .order('rank', { ascending: true, nullsFirst: false })

      if (standingsError) {
        setError(standingsError.message)
        return
      }

      let members: MatchPredictionMember[] = []

      if (standings && standings.length > 0) {
        const userIds = standings.map((s) => s.user_id)
        const { data: memberRows, error: membersError } = await supabaseRef.current
          .from('v2_gang_members')
          .select('user_id, status')
          .eq('gang_id', gangId)
          .in('user_id', userIds)

        if (membersError) {
          setError(membersError.message)
          return
        }

        const statusMap = new Map<string, MemberStatus>(
          (memberRows ?? []).map((m) => [m.user_id, m.status]),
        )

        const mapped: MatchPredictionMember[] = standings.map((row) => {
          const profile = row.v2_profiles as unknown as ProfileShape
          return {
            userId: row.user_id,
            displayName: profile?.display_name ?? null,
            avatarUrl: profile?.avatar_url ?? null,
            memberStatus: statusMap.get(row.user_id) ?? 'approved',
            rank: row.rank,
          }
        })

        const active = mapped.filter(
          (m) => !DEPARTED_STATUSES.includes(m.memberStatus),
        )
        const departed = mapped.filter((m) =>
          DEPARTED_STATUSES.includes(m.memberStatus),
        )
        members = [...active, ...departed]
      }

      // Empty early-out: no members → empty dataset.
      if (members.length === 0) {
        setData({
          members: [],
          phases: [],
          predictionsByScenarioByUser: new Map(),
          teamsById: {},
          playersById: {},
        })
        setError(null)
        return
      }

      // Step 2: scenarios
      const { data: scenarioRows, error: scenariosError } = await supabaseRef.current
        .from('v2_fixture_scenarios')
        .select(
          'id, title, input_type, points, resolution_phase, correct_answer, is_resolved, is_voided, sort_order',
        )
        .eq('gang_id', gangId)
        .eq('fixture_id', fixtureId)
        .order('sort_order', { ascending: true })

      if (scenariosError) {
        setError(scenariosError.message)
        return
      }

      const scenarioInputTypeById = new Map<string, ScenarioInputType>()
      const phaseGroups = new Map<ResolutionPhase, MatchPredictionScenario[]>()

      for (const row of scenarioRows ?? []) {
        scenarioInputTypeById.set(row.id, row.input_type)
        const phase = row.resolution_phase as ResolutionPhase
        const scenario: MatchPredictionScenario = {
          id: row.id,
          title: row.title,
          points: row.points,
          inputType: row.input_type,
          correctAnswer: row.correct_answer,
          isResolved: row.is_resolved,
          isVoided: row.is_voided,
        }
        const existing = phaseGroups.get(phase)
        if (existing) existing.push(scenario)
        else phaseGroups.set(phase, [scenario])
      }

      const phases: MatchPredictionPhaseGroup[] = PHASE_ORDER
        .filter((p) => phaseGroups.has(p))
        .map((p) => ({
          phase: p,
          label: PHASE_LABELS[p],
          scenarios: phaseGroups.get(p)!,
        }))

      // Step 3: predictions
      const { data: predictionRows, error: predictionsError } = await supabaseRef.current
        .from('v2_predictions')
        .select('user_id, scenario_id, value, is_correct, points_earned')
        .eq('gang_id', gangId)
        .eq('fixture_id', fixtureId)

      if (predictionsError) {
        setError(predictionsError.message)
        return
      }

      const predictionsByScenarioByUser = new Map<
        string,
        Map<string, MatchPredictionCell>
      >()
      const teamIds = new Set<string>()
      const playerIds = new Set<string>()

      for (const row of predictionRows ?? []) {
        const scenarioMap =
          predictionsByScenarioByUser.get(row.scenario_id) ??
          new Map<string, MatchPredictionCell>()
        scenarioMap.set(row.user_id, {
          value: row.value,
          isCorrect: row.is_correct,
          pointsEarned: row.points_earned,
        })
        predictionsByScenarioByUser.set(row.scenario_id, scenarioMap)

        const inputType = scenarioInputTypeById.get(row.scenario_id)
        if (inputType === 'team_select' && row.value) teamIds.add(row.value)
        if (inputType === 'player_select' && row.value) playerIds.add(row.value)
      }

      // Include correct-answer UUIDs for display resolution
      for (const group of phases) {
        for (const scenario of group.scenarios) {
          if (!scenario.correctAnswer) continue
          if (scenario.inputType === 'team_select') {
            teamIds.add(scenario.correctAnswer)
          } else if (scenario.inputType === 'player_select') {
            playerIds.add(scenario.correctAnswer)
          }
        }
      }

      // Step 4: team lookup
      const teamsById: Record<string, MatchPredictionTeam> = {}
      if (teamIds.size > 0) {
        const { data: teamRows, error: teamsError } = await supabaseRef.current
          .from('v2_league_teams')
          .select('id, code, name, color')
          .in('id', Array.from(teamIds))

        if (teamsError) {
          setError(teamsError.message)
          return
        }

        for (const t of teamRows ?? []) {
          teamsById[t.id] = { code: t.code, name: t.name, color: t.color }
        }
      }

      // Step 5: player lookup
      const playersById: Record<string, MatchPredictionPlayer> = {}
      if (playerIds.size > 0) {
        const { data: playerRows, error: playersError } = await supabaseRef.current
          .from('v2_players')
          .select('id, name')
          .in('id', Array.from(playerIds))

        if (playersError) {
          setError(playersError.message)
          return
        }

        for (const p of playerRows ?? []) {
          playersById[p.id] = { name: p.name }
        }
      }

      setData({
        members,
        phases,
        predictionsByScenarioByUser,
        teamsById,
        playersById,
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions')
    } finally {
      isPollingRef.current = false
      setIsLoading(false)
    }
  }, [gangId, fixtureId])

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    let active = true

    const wrappedPoll = async () => {
      if (!active) return
      await poll()
    }

    // Initial fetch
    wrappedPoll()

    const intervalId = setInterval(wrappedPoll, POLL_INTERVAL_MS)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && active) {
        wrappedPoll()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      active = false
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [poll, enabled])

  return { data, isLoading, error }
}
