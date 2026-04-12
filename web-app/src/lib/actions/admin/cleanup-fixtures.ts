'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { isSystemAdmin } from '@/lib/dal/admin/auth'

// ---------------------------------------------------------------------------
// Response types (mirror the edge function contracts)
// ---------------------------------------------------------------------------

export interface StaleFixtureEntry {
  fixtureId: string
  apiId: string
  round: string | null
  homeTeam: { code: string; name: string }
  awayTeam: { code: string; name: string }
  dbStatus: string
  sportmonksStatus: string
  mappedStatus: string
  startDatetime: string
  statusChangedAt: string
  hoursSinceStart: number
  hoursSinceStatusChange: number
  unresolvedScenarios: number
  totalScenarios: number
  staleness: string
  fixable: boolean
}

export interface IdentifyResult {
  success: boolean
  error?: string
  data?: {
    staleFixtures: StaleFixtureEntry[]
    summary: {
      totalScanned: number
      staleCount: number
      apiErrors: number
      durationMs: number
    }
  }
}

export interface FixAction {
  action: string
  slug?: string
  answer?: string
  from?: string
  to?: string
  reason?: string
  count?: number
}

export interface FixResult {
  success: boolean
  error?: string
  data?: {
    fixtureId: string
    apiId: string
    actions: FixAction[]
    summary: {
      scenariosResolved: number
      scenariosSkipped: number
      scenariosVoided: number
      scenariosAlreadyResolved: number
      scenariosReconciled: number
      fullyResolved: boolean
      notificationsSent: number
      durationMs: number
    }
  }
}

// ---------------------------------------------------------------------------
// Server actions
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

/**
 * Scan for stale fixtures and cross-reference with Sportmonks.
 * Read-only — never modifies data.
 */
export async function identifyStaleFixtures(): Promise<IdentifyResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  try {
    const serviceClient = createServiceRoleClient()
    const { data, error } = await serviceClient.functions.invoke(
      'cleanup-stale-fixtures',
      { body: { mode: 'identify' } }
    )

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as IdentifyResult['data'] }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

/**
 * Fix a single stale fixture by running the full resolution pipeline
 * using fresh Sportmonks data.
 */
export async function fixStaleFixture(fixtureId: string): Promise<FixResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  if (!fixtureId) {
    return { success: false, error: 'Missing fixtureId' }
  }

  try {
    const serviceClient = createServiceRoleClient()
    const { data, error } = await serviceClient.functions.invoke(
      'cleanup-stale-fixtures',
      { body: { mode: 'fix', fixtureId } }
    )

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as FixResult['data'] }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}
