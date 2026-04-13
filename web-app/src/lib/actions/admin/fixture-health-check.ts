'use server'

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { isSystemAdmin } from '@/lib/dal/admin/auth'
import { env } from '@/lib/env'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IssueSeverity = 'critical' | 'high' | 'medium'

export type FixType =
  | 'run_stale_cleanup'
  | 'mark_resolved'
  | 'update_status_to_completed'
  | 'update_status_to_live'
  | 'recalculate_standings'
  | 'manual'

export interface HealthCheckIssue {
  id: string
  severity: IssueSeverity
  title: string
  description: string
  fixType: FixType
  fixable: boolean
  fixLabel: string
  fixContext?: Record<string, string>
}

export interface HealthCheckResult {
  fixtureId: string
  checkedAt: string
  issues: HealthCheckIssue[]
  summary: {
    critical: number
    high: number
    medium: number
    total: number
    fixable: number
  }
}

export interface FixIssueResult {
  issueId: string
  success: boolean
  message: string
  details?: string
}

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const admin = await isSystemAdmin(user.id)
  if (!admin) return { error: 'Not authorized — system admin required' }

  return { userId: user.id }
}

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

export async function runFixtureHealthCheck(
  fixtureId: string,
): Promise<ActionResult<HealthCheckResult>> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  if (!fixtureId) {
    return { success: false, error: 'Missing fixtureId' }
  }

  try {
    const supabase = createServiceRoleClient()
    const now = Date.now()

    // Fetch all data needed for checks in parallel
    const [fixtureRes, resultsRes, liveScoresRes, scenariosRes] =
      await Promise.all([
        supabase
          .from('v2_league_season_fixtures')
          .select(
            'id, status, status_changed_at, start_datetime, pre_match_synced',
          )
          .eq('id', fixtureId)
          .maybeSingle(),
        supabase
          .from('v2_fixture_results')
          .select('fixture_id')
          .eq('fixture_id', fixtureId)
          .maybeSingle(),
        supabase
          .from('v2_fixture_live_scores')
          .select('fixture_id, last_polled_at')
          .eq('fixture_id', fixtureId)
          .maybeSingle(),
        supabase
          .from('v2_fixture_scenarios')
          .select('id, gang_id, slug, is_resolved, is_voided')
          .eq('fixture_id', fixtureId),
      ])

    if (fixtureRes.error) throw fixtureRes.error
    if (!fixtureRes.data) {
      return { success: false, error: 'Fixture not found' }
    }

    const fixture = fixtureRes.data
    const hasResults = resultsRes.data !== null
    const hasLiveScores = liveScoresRes.data !== null
    const lastPolledAt = liveScoresRes.data?.last_polled_at ?? null
    const scenarios = scenariosRes.data ?? []

    const issues: HealthCheckIssue[] = []

    const startTime = new Date(fixture.start_datetime).getTime()
    const statusChangedTime = new Date(fixture.status_changed_at).getTime()
    const hoursSinceStart = (now - startTime) / 3_600_000
    const minutesSinceStatusChange = (now - statusChangedTime) / 60_000

    // Scenario analysis
    const pendingScenarios = scenarios.filter(
      (s) => !s.is_resolved && !s.is_voided,
    )
    const invalidScenarios = scenarios.filter(
      (s) => s.is_resolved && s.is_voided,
    )
    const allScenariosSettled =
      scenarios.length > 0 && pendingScenarios.length === 0

    // ----- Check 1: Upcoming but past start -----
    if (fixture.status === 'upcoming' && startTime < now) {
      if (hoursSinceStart > 3) {
        issues.push({
          id: 'upcoming_overdue_critical',
          severity: 'critical',
          title: 'Upcoming but past start (>3h)',
          description: `Match started ${Math.round(hoursSinceStart)}h ago but status is still "upcoming". External data needed to determine correct status.`,
          fixType: 'manual',
          fixable: false,
          fixLabel: 'Run Stale Fixture Cleanup from the Fixtures list page',
        })
      } else {
        issues.push({
          id: 'upcoming_overdue_high',
          severity: 'high',
          title: 'Upcoming but past start',
          description: `Match started ${Math.round((now - startTime) / 60_000)} min ago but status is still "upcoming".`,
          fixType: 'manual',
          fixable: false,
          fixLabel: 'Run Stale Fixture Cleanup from the Fixtures list page',
        })
      }
    }

    // ----- Check 2: Live but start was >24h ago -----
    if (fixture.status === 'live' && hoursSinceStart > 24) {
      issues.push({
        id: 'live_stale_critical',
        severity: 'critical',
        title: 'Live but start was >24h ago',
        description: `Match started ${Math.round(hoursSinceStart)}h ago but is still marked "live". Likely stuck.`,
        fixType: 'manual',
        fixable: false,
        fixLabel: 'Run Stale Fixture Cleanup from the Fixtures list page',
      })
    }

    // ----- Check 3: Completed but no results row -----
    if (fixture.status === 'completed' && !hasResults) {
      issues.push({
        id: 'completed_no_results',
        severity: 'high',
        title: 'Completed but no results',
        description:
          'Fixture is marked "completed" but has no results row. Result sync may have failed.',
        fixType: 'manual',
        fixable: false,
        fixLabel: 'Trigger a result sync or run Stale Fixture Cleanup',
      })
    }

    // ----- Check 4: Completed and stuck >120 min -----
    if (
      fixture.status === 'completed' &&
      minutesSinceStatusChange > 120
    ) {
      issues.push({
        id: 'completed_stuck',
        severity: 'critical',
        title: 'Stuck in completed (>120 min)',
        description: `Fixture has been in "completed" status for ${Math.round(minutesSinceStatusChange)} min. Resolution may be blocked.`,
        fixType: 'run_stale_cleanup',
        fixable: true,
        fixLabel: 'Run Cleanup',
      })
    }

    // ----- Check 5: Completed with unresolved scenarios -----
    if (fixture.status === 'completed' && pendingScenarios.length > 0) {
      // Deduplicate by slug for the count
      const pendingSlugs = new Set(pendingScenarios.map((s) => s.slug))
      issues.push({
        id: 'completed_unresolved_scenarios',
        severity: 'high',
        title: 'Unresolved scenarios',
        description: `${pendingSlugs.size} scenario type(s) still pending across ${pendingScenarios.length} gang-scenario row(s).`,
        fixType: 'run_stale_cleanup',
        fixable: true,
        fixLabel: 'Run Cleanup',
      })
    }

    // ----- Check 6: Resolved with unresolved scenarios -----
    if (fixture.status === 'resolved' && pendingScenarios.length > 0) {
      const pendingSlugs = new Set(pendingScenarios.map((s) => s.slug))
      issues.push({
        id: 'resolved_unresolved_scenarios',
        severity: 'critical',
        title: 'Resolved but has unresolved scenarios',
        description: `Fixture is marked "resolved" but ${pendingSlugs.size} scenario type(s) are still pending (${pendingScenarios.length} rows).`,
        fixType: 'run_stale_cleanup',
        fixable: true,
        fixLabel: 'Run Cleanup',
      })
    }

    // ----- Check 7: Invalid scenario state (resolved AND voided) -----
    if (invalidScenarios.length > 0) {
      const slugs = [...new Set(invalidScenarios.map((s) => s.slug))]
      issues.push({
        id: 'invalid_scenario_state',
        severity: 'medium',
        title: 'Invalid scenario state',
        description: `${invalidScenarios.length} scenario(s) have both is_resolved and is_voided set to true: ${slugs.join(', ')}.`,
        fixType: 'manual',
        fixable: false,
        fixLabel: 'Requires manual database investigation',
      })
    }

    // ----- Check 8: All scenarios resolved but fixture not resolved -----
    if (fixture.status === 'completed' && allScenariosSettled) {
      issues.push({
        id: 'all_settled_not_resolved',
        severity: 'high',
        title: 'All scenarios settled but fixture not resolved',
        description:
          'Every scenario is resolved or voided, but the fixture status is still "completed".',
        fixType: 'mark_resolved',
        fixable: true,
        fixLabel: 'Mark Resolved',
      })
    }

    // ----- Check 9: Has results but status is upcoming/live -----
    if (hasResults && (fixture.status === 'upcoming' || fixture.status === 'live')) {
      issues.push({
        id: 'has_results_wrong_status',
        severity: 'high',
        title: 'Has results but status is not completed',
        description: `Fixture has a results row but status is "${fixture.status}". Should be "completed" or "resolved".`,
        fixType: 'update_status_to_completed',
        fixable: true,
        fixLabel: 'Update to Completed',
      })
    }

    // ----- Check 10: Live scores exist but status is upcoming -----
    if (hasLiveScores && fixture.status === 'upcoming') {
      issues.push({
        id: 'live_scores_upcoming',
        severity: 'medium',
        title: 'Live scores exist but status is upcoming',
        description:
          'Live score data has been recorded but the fixture is still marked "upcoming".',
        fixType: 'update_status_to_live',
        fixable: true,
        fixLabel: 'Update to Live',
      })
    }

    // ----- Check 11: Live with stale polling -----
    if (fixture.status === 'live' && lastPolledAt) {
      const polledTime = new Date(lastPolledAt).getTime()
      const minutesSincePolled = (now - polledTime) / 60_000
      if (minutesSincePolled > 5) {
        issues.push({
          id: 'live_stale_polling',
          severity: 'high',
          title: 'Live match with stale polling data',
          description: `Last polled ${Math.round(minutesSincePolled)} min ago. The live-poll cron may have stopped.`,
          fixType: 'manual',
          fixable: false,
          fixLabel: 'Check the live-poll-resolve-fixtures Edge Function',
        })
      }
    }

    // ----- Check 12: Live with no live score data -----
    if (fixture.status === 'live' && !hasLiveScores) {
      issues.push({
        id: 'live_no_scores',
        severity: 'high',
        title: 'Live match with no live score data',
        description:
          'Fixture is marked "live" but no live score row exists. Polling may not be running.',
        fixType: 'manual',
        fixable: false,
        fixLabel: 'Check the live-poll-resolve-fixtures Edge Function',
      })
    }

    // ----- Check 13: Pre-match not synced, starting soon -----
    if (fixture.status === 'upcoming' && !fixture.pre_match_synced) {
      const minutesUntilStart = (startTime - now) / 60_000
      if (minutesUntilStart <= 30 && minutesUntilStart > 0) {
        issues.push({
          id: 'prematch_not_synced',
          severity: 'medium',
          title: 'Pre-match not synced',
          description: `Match starts in ~${Math.round(minutesUntilStart)} min but pre-match data has not been synced.`,
          fixType: 'manual',
          fixable: false,
          fixLabel: 'Trigger pre-match sync manually',
        })
      }
    }

    // ----- Check 14: Standings missing for resolved fixture -----
    if (fixture.status === 'resolved' && scenarios.length > 0) {
      // Get unique gang IDs from scenarios
      const gangIds = [...new Set(scenarios.map((s) => s.gang_id))]

      // Check which gangs have predictions
      const { data: predictions } = await supabase
        .from('v2_predictions')
        .select('gang_id')
        .eq('fixture_id', fixtureId)
        .in('gang_id', gangIds)

      const gangsWithPredictions = new Set(
        (predictions ?? []).map((p) => p.gang_id),
      )

      if (gangsWithPredictions.size > 0) {
        // Check standings for gangs that have predictions
        const { data: standings } = await supabase
          .from('v2_gang_fixture_standings')
          .select('gang_id')
          .eq('fixture_id', fixtureId)
          .in('gang_id', Array.from(gangsWithPredictions))

        const gangsWithStandings = new Set(
          (standings ?? []).map((s) => s.gang_id),
        )

        // Fetch gang names for missing gangs
        const missingGangIds = Array.from(gangsWithPredictions).filter(
          (gId) => !gangsWithStandings.has(gId),
        )

        if (missingGangIds.length > 0) {
          const { data: gangs } = await supabase
            .from('v2_gangs')
            .select('id, name')
            .in('id', missingGangIds)

          const gangNameMap = new Map(
            (gangs ?? []).map((g) => [g.id, g.name]),
          )

          for (const gangId of missingGangIds) {
            const gangName = gangNameMap.get(gangId) ?? gangId
            issues.push({
              id: `standings_missing_${gangId}`,
              severity: 'high',
              title: `Standings missing for ${gangName}`,
              description: `Gang "${gangName}" has predictions for this fixture but no fixture standings rows.`,
              fixType: 'recalculate_standings',
              fixable: true,
              fixLabel: 'Recalculate Standings',
              fixContext: { gangId },
            })
          }
        }
      }
    }

    // Sort: critical first, then high, then medium
    const severityOrder: Record<IssueSeverity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
    }
    issues.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
    )

    const summary = {
      critical: issues.filter((i) => i.severity === 'critical').length,
      high: issues.filter((i) => i.severity === 'high').length,
      medium: issues.filter((i) => i.severity === 'medium').length,
      total: issues.length,
      fixable: issues.filter((i) => i.fixable).length,
    }

    return {
      success: true,
      data: {
        fixtureId,
        checkedAt: new Date().toISOString(),
        issues,
        summary,
      },
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

// ---------------------------------------------------------------------------
// Fix Issue
// ---------------------------------------------------------------------------

export async function fixHealthCheckIssue(
  fixtureId: string,
  issueId: string,
  fixType: FixType,
  fixContext?: Record<string, string>,
): Promise<ActionResult<FixIssueResult>> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  if (!fixtureId) {
    return { success: false, error: 'Missing fixtureId' }
  }

  if (fixType === 'manual') {
    return {
      success: false,
      error: 'This issue requires manual investigation and cannot be auto-fixed.',
    }
  }

  try {
    const supabase = createServiceRoleClient()

    switch (fixType) {
      case 'run_stale_cleanup': {
        const { data, error } = await supabase.functions.invoke(
          'cleanup-stale-fixtures',
          { body: { mode: 'fix', fixtureId } },
        )

        if (error) {
          return {
            success: true,
            data: {
              issueId,
              success: false,
              message: `Cleanup failed: ${error.message}`,
            },
          }
        }

        const result = data as {
          summary?: {
            scenariosResolved?: number
            scenariosVoided?: number
            fullyResolved?: boolean
          }
        } | null

        const resolved = result?.summary?.scenariosResolved ?? 0
        const voided = result?.summary?.scenariosVoided ?? 0
        const fullyResolved = result?.summary?.fullyResolved ?? false

        return {
          success: true,
          data: {
            issueId,
            success: true,
            message: fullyResolved
              ? 'Fixture fully resolved'
              : `Cleanup ran: ${resolved} resolved, ${voided} voided`,
            details: fullyResolved
              ? `All scenarios processed. ${resolved} resolved, ${voided} voided.`
              : `Partial progress: ${resolved} resolved, ${voided} voided. Re-run health check to verify.`,
          },
        }
      }

      case 'mark_resolved': {
        // Replicate mark_fixture_resolved RPC: update status + upsert resolved_at
        const { error: statusError } = await supabase
          .from('v2_league_season_fixtures')
          .update({ status: 'resolved' as const })
          .eq('id', fixtureId)
          .neq('status', 'resolved')

        if (statusError) {
          return {
            success: true,
            data: {
              issueId,
              success: false,
              message: `Failed to mark resolved: ${statusError.message}`,
            },
          }
        }

        // Upsert fixture_results with resolved_at
        await supabase
          .from('v2_fixture_results')
          .upsert(
            { fixture_id: fixtureId, resolved_at: new Date().toISOString() },
            { onConflict: 'fixture_id' },
          )

        return {
          success: true,
          data: {
            issueId,
            success: true,
            message: 'Fixture marked as resolved',
          },
        }
      }

      case 'update_status_to_completed': {
        const { error } = await supabase
          .from('v2_league_season_fixtures')
          .update({ status: 'completed' as const })
          .eq('id', fixtureId)

        if (error) {
          return {
            success: true,
            data: {
              issueId,
              success: false,
              message: `Failed to update status: ${error.message}`,
            },
          }
        }

        return {
          success: true,
          data: {
            issueId,
            success: true,
            message: 'Fixture status updated to "completed"',
          },
        }
      }

      case 'update_status_to_live': {
        const { error } = await supabase
          .from('v2_league_season_fixtures')
          .update({ status: 'live' as const })
          .eq('id', fixtureId)

        if (error) {
          return {
            success: true,
            data: {
              issueId,
              success: false,
              message: `Failed to update status: ${error.message}`,
            },
          }
        }

        return {
          success: true,
          data: {
            issueId,
            success: true,
            message: 'Fixture status updated to "live"',
          },
        }
      }

      case 'recalculate_standings': {
        const gangId = fixContext?.gangId
        if (!gangId) {
          return {
            success: false,
            error: 'Missing gangId in fix context',
          }
        }

        // Use untyped client — recalculate_full_standings is not in the
        // auto-generated Database type (it's a SECURITY DEFINER function
        // created in migrations but not picked up by type generation).
        const untypedClient = createClient(
          env.NEXT_PUBLIC_SUPABASE_URL,
          env.SUPABASE_SERVICE_ROLE_KEY,
        )
        const { error } = await untypedClient.rpc(
          'recalculate_full_standings',
          { p_gang_id: gangId, p_fixture_id: fixtureId },
        )

        if (error) {
          return {
            success: true,
            data: {
              issueId,
              success: false,
              message: `Failed to recalculate standings: ${error.message}`,
            },
          }
        }

        return {
          success: true,
          data: {
            issueId,
            success: true,
            message: 'Standings recalculated successfully',
          },
        }
      }

      default: {
        const _exhaustive: never = fixType
        return {
          success: false,
          error: `Unknown fix type: ${_exhaustive}`,
        }
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}
