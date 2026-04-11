'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { captureServerError, trackEvent } from '@/lib/analytics/server'
import { withTiming } from '@/lib/analytics/timing'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import { PREDICTION_WINDOW_MS } from '@/lib/constants'
import type { ActionResult } from '@/types'

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const pickSchema = z.object({
  scenarioId: z.string().uuid(),
  value: z.string().min(1, 'Value is required'),
})

const submitPredictionsSchema = z.object({
  gangId: z.string().uuid(),
  fixtureId: z.string().uuid(),
  picks: z.array(pickSchema).min(1, 'At least 1 pick is required'),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse scenario options from JSON to string[].
 */
function parseScenarioOptions(options: unknown): string[] {
  if (!options) return []
  if (Array.isArray(options)) {
    return options.filter((o): o is string => typeof o === 'string')
  }
  return []
}

/**
 * Validate a single pick value against its scenario's input type.
 */
function validatePickValue(
  value: string,
  inputType: string,
  options: unknown,
  homeTeamId: string,
  awayTeamId: string,
  playerIds: Set<string>,
): string | null {
  switch (inputType) {
    case 'team_select':
      if (value !== homeTeamId && value !== awayTeamId) {
        return 'Invalid team selection'
      }
      break

    case 'player_select':
      if (!playerIds.has(value)) {
        return 'Invalid player selection'
      }
      break

    case 'number_range':
    case 'over_range': {
      const parsedOptions = parseScenarioOptions(options)
      if (parsedOptions.length === 0) {
        return 'Scenario has no valid options'
      }
      if (!parsedOptions.includes(value)) {
        return 'Invalid range selection'
      }
      break
    }

    case 'yes_no':
      if (value !== 'Yes' && value !== 'No') {
        return 'Must be Yes or No'
      }
      break

    default:
      return 'Unknown scenario input type'
  }

  return null
}

// ---------------------------------------------------------------------------
// submitPredictions
// ---------------------------------------------------------------------------

/**
 * Submit predictions for a fixture within a gang.
 *
 * Flow: auth → rate limit (60/hr) → Zod validate → verify approved membership
 * → verify fixture.status === 'upcoming' → verify prediction window open
 * → verify all scenarioIds belong to fixture → validate each pick value
 * → batch upsert to v2_predictions → analytics → revalidatePath → success
 *
 * @see docs/stories/PRED-003-prediction-submit.md
 */
export async function submitPredictions(
  gangId: string,
  fixtureId: string,
  picks: Array<{ scenarioId: string; value: string }>,
): Promise<ActionResult> {
  const supabase = await createServerClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const userId = user.id

  return withTiming('submitPredictions', userId, async () => {
    // Rate limit: 60 per hour
    const rl = await rateLimit(userId, 'submit_predictions', {
      max: 60,
      windowSeconds: 3600,
    })
    if (!rl.allowed) {
      return { success: false, error: 'Too many requests. Try again later.' }
    }

    // Zod validation
    const parsed = submitPredictionsSchema.safeParse({ gangId, fixtureId, picks })
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return { success: false, error: firstIssue?.message ?? 'Invalid input' }
    }

    const { gangId: validGangId, fixtureId: validFixtureId, picks: validPicks } = parsed.data

    // Verify approved membership
    const { data: membership } = await supabase
      .from('v2_gang_members')
      .select('status')
      .eq('gang_id', validGangId)
      .eq('user_id', userId)
      .eq('status', 'approved')
      .maybeSingle()

    if (!membership) {
      return { success: false, error: 'You are not a member of this gang' }
    }

    // Fetch fixture with team IDs
    const { data: fixture, error: fixtureError } = await supabase
      .from('v2_league_season_fixtures')
      .select('id, status, start_datetime, home_team_id, away_team_id, league_id, season_id')
      .eq('id', validFixtureId)
      .single()

    if (fixtureError || !fixture) {
      if (fixtureError) {
        await captureServerError(userId, fixtureError, {
          source: 'submitPredictions',
          metadata: {
            stage: 'fetch_fixture',
            gang_id: validGangId,
            fixture_id: validFixtureId,
          },
        })
      }
      return { success: false, error: 'Fixture not found' }
    }

    // Verify fixture status is upcoming
    if (fixture.status !== 'upcoming') {
      return { success: false, error: 'Predictions are locked for this match' }
    }

    // Fetch gang league season for deadline info
    const { data: gangSeason } = await supabase
      .from('v2_gang_league_seasons')
      .select('league_id, season_id, prediction_deadline_mins')
      .eq('gang_id', validGangId)
      .eq('is_active', true)
      .single()

    if (!gangSeason) {
      return { success: false, error: 'No active season found for this gang' }
    }

    // Verify fixture belongs to this gang's season
    if (fixture.league_id !== gangSeason.league_id || fixture.season_id !== gangSeason.season_id) {
      return { success: false, error: 'Fixture not found' }
    }

    // Verify prediction window is open
    const now = new Date()
    const startTime = new Date(fixture.start_datetime)
    const deadlineMins = gangSeason.prediction_deadline_mins ?? 45
    const deadline = new Date(startTime.getTime() - deadlineMins * 60 * 1000)

    if (now >= deadline) {
      return { success: false, error: 'Prediction deadline has passed' }
    }

    // Window opens PREDICTION_WINDOW_HOURS before start
    const windowOpens = new Date(startTime.getTime() - PREDICTION_WINDOW_MS)
    if (now < windowOpens) {
      return { success: false, error: 'Prediction window is not open yet' }
    }

    // Fetch scenarios for this fixture + gang to validate picks
    const { data: scenarios, error: scenariosError } = await supabase
      .from('v2_fixture_scenarios')
      .select('id, input_type, options, gang_id')
      .eq('fixture_id', validFixtureId)
      .eq('gang_id', validGangId)

    if (scenariosError || !scenarios) {
      if (scenariosError) {
        await captureServerError(userId, scenariosError, {
          source: 'submitPredictions',
          metadata: {
            stage: 'fetch_scenarios',
            gang_id: validGangId,
            fixture_id: validFixtureId,
          },
        })
      }
      return { success: false, error: 'Failed to load scenarios' }
    }

    // Build scenario lookup map
    const scenarioMap = new Map(
      scenarios.map((s) => [s.id, { inputType: s.input_type, options: s.options }]),
    )

    // Verify all scenarioIds belong to this fixture
    for (const pick of validPicks) {
      if (!scenarioMap.has(pick.scenarioId)) {
        return { success: false, error: 'Invalid scenario' }
      }
    }

    // Fetch players for player_select validation
    const hasPlayerSelect = validPicks.some((p) => {
      const scenario = scenarioMap.get(p.scenarioId)
      return scenario?.inputType === 'player_select'
    })

    let playerIds = new Set<string>()
    if (hasPlayerSelect) {
      const { data: players } = await supabase
        .from('v2_league_season_team_players')
        .select('player_id')
        .eq('season_id', gangSeason.season_id)
        .in('team_id', [fixture.home_team_id, fixture.away_team_id])

      if (players) {
        playerIds = new Set(players.map((p) => p.player_id))
      }
    }

    // Validate each pick value against its scenario's input type
    for (const pick of validPicks) {
      const scenario = scenarioMap.get(pick.scenarioId)!
      const error = validatePickValue(
        pick.value,
        scenario.inputType,
        scenario.options,
        fixture.home_team_id,
        fixture.away_team_id,
        playerIds,
      )
      if (error) {
        return { success: false, error }
      }
    }

    // Batch upsert to v2_predictions
    const now_iso = new Date().toISOString()
    const rows = validPicks.map((pick) => ({
      user_id: userId,
      gang_id: validGangId,
      league_id: gangSeason.league_id,
      season_id: gangSeason.season_id,
      fixture_id: validFixtureId,
      scenario_id: pick.scenarioId,
      value: pick.value,
      submitted_at: now_iso,
    }))

    const { error: upsertError } = await supabase
      .from('v2_predictions')
      .upsert(rows, { onConflict: 'user_id,scenario_id' })

    if (upsertError) {
      await captureServerError(userId, upsertError, {
        source: 'submitPredictions',
        metadata: {
          stage: 'upsert',
          gang_id: validGangId,
          fixture_id: validFixtureId,
          pick_count: validPicks.length,
        },
      })
      return { success: false, error: 'Failed to save predictions. Please try again.' }
    }

    // Awaited so the event flushes before the serverless invocation
    // suspends. trackEvent already swallows internal flush errors, but we
    // wrap the call defensively so a future change to the analytics
    // module cannot break the submission flow.
    try {
      await trackEvent(userId, ANALYTICS_EVENTS.PREDICTION_SUBMITTED, {
        gang_id: validGangId,
        fixture_id: validFixtureId,
        pick_count: validPicks.length,
      })
    } catch {
      // Swallow analytics errors — they must never break the submission flow
    }

    // Revalidate paths
    revalidatePath(`/group/${validGangId}`)
    revalidatePath(`/group/${validGangId}/predict/${validFixtureId}`)

    return { success: true }
  })
}
