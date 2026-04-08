'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { trackServerEvent } from '@/lib/analytics/server'
import { PREDICTION_SUBMITTED } from '@/lib/analytics/events'
import { rateLimit, formatRetryAfter, RATE_LIMITS } from '@/lib/rate-limit'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PredictionPick {
  scenarioId: string
  value: string
}

type SubmitResult = { success: true; count: number } | { success: false; error: string }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toStr(val: unknown): string {
  return String(val)
}

/**
 * Helper to check if a Supabase query result has an error.
 * Avoids no-unnecessary-condition lint rule issues with permissive Database types.
 */
function hasError(result: { error: unknown }): boolean {
  return result.error !== null && result.error !== undefined
}

/**
 * Helper to check if query data is missing.
 */
function hasNoData(result: { data: unknown }): boolean {
  return result.data === null || result.data === undefined
}

// ---------------------------------------------------------------------------
// submitPredictions
// ---------------------------------------------------------------------------

/**
 * Validates auth, gang membership, prediction window, and upserts predictions.
 *
 * Window check: now >= start - 12h AND now < start - deadline_mins
 */
export async function submitPredictions(
  gangId: string,
  fixtureId: string,
  picks: PredictionPick[],
): Promise<SubmitResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    return { success: false, error: 'You must be signed in' }
  }

  // Rate limit check
  const rl = rateLimit(user.id, 'submit_predictions', RATE_LIMITS.submit_predictions)
  if (!rl.allowed) {
    return {
      success: false,
      error: `Too many requests. Please try again in ${formatRetryAfter(rl.retryAfterMs ?? 0)}.`,
    }
  }

  // Validate non-empty picks
  const validPicks = picks.filter((p) => p.value.trim().length > 0)
  if (validPicks.length === 0) {
    return { success: false, error: 'Pick at least one scenario' }
  }

  const serviceClient = createServiceRoleClient()

  // Step 1: Verify gang membership (approved)
  const memberResult = await serviceClient
    .from('v2_gang_members')
    .select('status')
    .eq('gang_id', gangId)
    .eq('user_id', user.id)
    .single()

  if (hasError(memberResult) || hasNoData(memberResult)) {
    return { success: false, error: "You're not in this gang" }
  }

  const memberData = memberResult.data as Record<string, unknown>
  if (toStr(memberData['status']) !== 'approved') {
    return { success: false, error: "You're not in this gang" }
  }

  // Step 2: Get fixture details
  const fixtureResult = await serviceClient
    .from('v2_league_season_fixtures')
    .select('id, league_id, season_id, start_datetime, status')
    .eq('id', fixtureId)
    .single()

  if (hasError(fixtureResult) || hasNoData(fixtureResult)) {
    return { success: false, error: 'Match not found' }
  }

  const fixture = fixtureResult.data as Record<string, unknown>
  const fixtureStatus = toStr(fixture['status'])
  const startDatetime = new Date(toStr(fixture['start_datetime']))
  const leagueId = toStr(fixture['league_id'])
  const seasonId = toStr(fixture['season_id'])

  if (fixtureStatus !== 'upcoming') {
    return { success: false, error: 'Match has already started' }
  }

  // Step 3: Get gang's prediction deadline
  const seasonResult = await serviceClient
    .from('v2_gang_league_seasons')
    .select('prediction_deadline_mins')
    .eq('gang_id', gangId)
    .eq('season_id', seasonId)
    .single()

  if (hasError(seasonResult) || hasNoData(seasonResult)) {
    return { success: false, error: "Your gang isn't enrolled in this season" }
  }

  const seasonData = seasonResult.data as Record<string, unknown>
  const deadlineMins = Number(seasonData['prediction_deadline_mins'])
  const deadline = new Date(startDatetime.getTime() - deadlineMins * 60 * 1000)
  const windowOpensAt = new Date(startDatetime.getTime() - 12 * 60 * 60 * 1000)
  const now = new Date()

  // Step 4: Check prediction window
  if (now < windowOpensAt) {
    const diffMs = windowOpensAt.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const timeLabel =
      diffHours > 0 ? `${String(diffHours)}h ${String(diffMinutes)}m` : `${String(diffMinutes)}m`
    return {
      success: false,
      error: `Predictions open ${timeLabel} from now`,
    }
  }

  if (now >= deadline) {
    return { success: false, error: 'Predictions are locked for this match' }
  }

  // Step 5: Validate scenario IDs belong to this (gang, fixture)
  const scenarioIds = validPicks.map((p) => p.scenarioId)
  const scenarioResult = await serviceClient
    .from('v2_fixture_scenarios')
    .select('id')
    .eq('gang_id', gangId)
    .eq('fixture_id', fixtureId)
    .in('id', scenarioIds)

  if (hasError(scenarioResult) || hasNoData(scenarioResult)) {
    return { success: false, error: 'Something went wrong. Please try again.' }
  }

  const validScenarioIds = new Set(
    (scenarioResult.data as Array<{ id: unknown }>).map((s) => toStr(s.id)),
  )
  const confirmedPicks = validPicks.filter((p) => validScenarioIds.has(p.scenarioId))

  if (confirmedPicks.length === 0) {
    return { success: false, error: 'Pick at least one scenario' }
  }

  // Step 6: Check for existing predictions to determine is_update
  const existingResult = await serviceClient
    .from('v2_predictions')
    .select('id')
    .eq('user_id', user.id)
    .eq('gang_id', gangId)
    .eq('fixture_id', fixtureId)
    .limit(1)

  const isUpdate =
    !hasNoData(existingResult) &&
    Array.isArray(existingResult.data) &&
    existingResult.data.length > 0

  // Step 7: Upsert predictions
  const upsertRows = confirmedPicks.map((p) => ({
    user_id: user.id,
    scenario_id: p.scenarioId,
    gang_id: gangId,
    league_id: leagueId,
    season_id: seasonId,
    fixture_id: fixtureId,
    value: p.value,
    submitted_at: new Date().toISOString(),
  }))

  const upsertResult = await serviceClient.from('v2_predictions').upsert(upsertRows, {
    onConflict: 'user_id,scenario_id',
  })

  if (hasError(upsertResult)) {
    return { success: false, error: "Couldn't save predictions. Try again." }
  }

  // Step 8: Analytics + revalidation
  trackServerEvent(user.id, PREDICTION_SUBMITTED, {
    gang_id: gangId,
    fixture_id: fixtureId,
    prediction_count: confirmedPicks.length,
    is_update: isUpdate,
  })

  revalidatePath(`/group/${gangId}/predict/${fixtureId}`)
  revalidatePath(`/group/${gangId}`)

  return { success: true, count: confirmedPicks.length }
}
