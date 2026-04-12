import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PredictionVolume {
  total: number
  today: number
  thisWeek: number
}

export interface SlugAccuracy {
  slug: string
  totalPredictions: number
  correctPredictions: number
  accuracyRate: number
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get prediction volume — total, today, and this week.
 */
export async function getPredictionVolume(): Promise<PredictionVolume> {
  const supabase = createServiceRoleClient()

  // Total count
  const { count: total, error: totalError } = await supabase
    .from('v2_predictions')
    .select('id', { count: 'exact', head: true })

  if (totalError)
    throw new Error(`getPredictionVolume total failed: ${totalError.message}`)

  // Today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { count: today, error: todayError } = await supabase
    .from('v2_predictions')
    .select('id', { count: 'exact', head: true })
    .gte('submitted_at', todayStart.toISOString())

  if (todayError)
    throw new Error(`getPredictionVolume today failed: ${todayError.message}`)

  // This week
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  const { count: thisWeek, error: weekError } = await supabase
    .from('v2_predictions')
    .select('id', { count: 'exact', head: true })
    .gte('submitted_at', weekStart.toISOString())

  if (weekError)
    throw new Error(`getPredictionVolume week failed: ${weekError.message}`)

  return {
    total: total ?? 0,
    today: today ?? 0,
    thisWeek: thisWeek ?? 0,
  }
}

/**
 * Get per-slug accuracy rates for a season.
 */
export async function getAccuracyBySlug(
  seasonId: string,
): Promise<SlugAccuracy[]> {
  const supabase = createServiceRoleClient()

  // Get all predictions for the season that have been resolved (is_correct is not null)
  const { data: predictions, error } = await supabase
    .from('v2_predictions')
    .select('scenario_id, is_correct')
    .eq('season_id', seasonId)
    .not('is_correct', 'is', null)

  if (error) throw new Error(`getAccuracyBySlug predictions failed: ${error.message}`)

  // Get scenario slugs
  const scenarioIds = [
    ...new Set((predictions ?? []).map((p) => p.scenario_id)),
  ]

  if (scenarioIds.length === 0) return []

  const { data: scenarios, error: scenarioError } = await supabase
    .from('v2_fixture_scenarios')
    .select('id, slug')
    .in('id', scenarioIds)

  if (scenarioError)
    throw new Error(`getAccuracyBySlug scenarios failed: ${scenarioError.message}`)

  const scenarioSlugMap = new Map(
    (scenarios ?? []).map((s) => [s.id, s.slug]),
  )

  // Aggregate by slug
  const slugStats = new Map<
    string,
    { total: number; correct: number }
  >()

  for (const p of predictions ?? []) {
    const slug = scenarioSlugMap.get(p.scenario_id)
    if (!slug) continue
    const existing = slugStats.get(slug) ?? { total: 0, correct: 0 }
    existing.total++
    if (p.is_correct) existing.correct++
    slugStats.set(slug, existing)
  }

  return Array.from(slugStats.entries())
    .map(([slug, stats]) => ({
      slug,
      totalPredictions: stats.total,
      correctPredictions: stats.correct,
      accuracyRate:
        stats.total > 0
          ? Math.round((stats.correct / stats.total) * 100)
          : 0,
    }))
    .sort((a, b) => b.totalPredictions - a.totalPredictions)
}
