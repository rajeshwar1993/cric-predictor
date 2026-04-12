import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { ResolutionPhase } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResolutionOverview {
  total: number
  resolved: number
  voided: number
  pending: number
  resolutionRate: number
}

export interface ResolutionByPhase {
  phase: ResolutionPhase
  resolved: number
  pending: number
  total: number
}

export interface ResolutionBySlug {
  slug: string
  total: number
  resolved: number
  voided: number
  pending: number
  accuracyRate: number
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get resolution overview for a season — total/resolved/voided/pending counts.
 */
export async function getResolutionOverview(
  seasonId: string,
): Promise<ResolutionOverview> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('v2_fixture_scenarios')
    .select('is_resolved, is_voided')
    .eq('season_id', seasonId)

  if (error) throw new Error(`getResolutionOverview failed: ${error.message}`)

  const rows = data ?? []
  const total = rows.length
  const resolved = rows.filter((r) => r.is_resolved && !r.is_voided).length
  const voided = rows.filter((r) => r.is_voided).length
  const pending = rows.filter((r) => !r.is_resolved && !r.is_voided).length
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0

  return { total, resolved, voided, pending, resolutionRate }
}

/**
 * Group scenarios by resolution_phase with resolved/pending counts.
 */
export async function getResolutionByPhase(
  seasonId: string,
): Promise<ResolutionByPhase[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('v2_fixture_scenarios')
    .select('resolution_phase, is_resolved, is_voided')
    .eq('season_id', seasonId)

  if (error) throw new Error(`getResolutionByPhase failed: ${error.message}`)

  const rows = data ?? []
  const phaseMap = new Map<
    ResolutionPhase,
    { resolved: number; pending: number; total: number }
  >()

  for (const row of rows) {
    const phase = row.resolution_phase
    const existing = phaseMap.get(phase) ?? { resolved: 0, pending: 0, total: 0 }
    existing.total++
    if (row.is_resolved && !row.is_voided) {
      existing.resolved++
    } else if (!row.is_voided) {
      existing.pending++
    }
    phaseMap.set(phase, existing)
  }

  return Array.from(phaseMap.entries()).map(([phase, counts]) => ({
    phase,
    ...counts,
  }))
}

/**
 * Group scenarios by slug with resolved/voided/pending counts and accuracy rate.
 */
export async function getResolutionBySlug(
  seasonId: string,
): Promise<ResolutionBySlug[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('v2_fixture_scenarios')
    .select('slug, is_resolved, is_voided')
    .eq('season_id', seasonId)

  if (error) throw new Error(`getResolutionBySlug failed: ${error.message}`)

  const rows = data ?? []
  const slugMap = new Map<
    string,
    { total: number; resolved: number; voided: number; pending: number }
  >()

  for (const row of rows) {
    const existing = slugMap.get(row.slug) ?? {
      total: 0,
      resolved: 0,
      voided: 0,
      pending: 0,
    }
    existing.total++
    if (row.is_voided) {
      existing.voided++
    } else if (row.is_resolved) {
      existing.resolved++
    } else {
      existing.pending++
    }
    slugMap.set(row.slug, existing)
  }

  return Array.from(slugMap.entries()).map(([slug, counts]) => ({
    slug,
    ...counts,
    accuracyRate:
      counts.total > 0
        ? Math.round((counts.resolved / counts.total) * 100)
        : 0,
  }))
}
