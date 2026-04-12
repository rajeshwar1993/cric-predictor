import { Target } from 'lucide-react'

import { ResolutionByPhaseTable } from '@/components/admin/scenarios/resolution-by-phase'
import { ResolutionBySlugTable } from '@/components/admin/scenarios/resolution-by-slug'
import { ResolutionOverviewCards } from '@/components/admin/scenarios/resolution-overview'
import {
  getResolutionByPhase,
  getResolutionBySlug,
  getResolutionOverview,
} from '@/lib/dal/admin/scenarios'

/**
 * ADM-005: Scenario Resolution page.
 *
 * Shows resolution status across all scenarios for the active season.
 * Uses a hardcoded season ID — in production this would come from
 * the active season lookup.
 */
export default async function ScenariosPage() {
  // TODO: Replace with dynamic active season lookup
  const seasonId = 'ipl-2026'

  const [overview, byPhase, bySlug] = await Promise.all([
    getResolutionOverview(seasonId),
    getResolutionByPhase(seasonId),
    getResolutionBySlug(seasonId),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Target size={24} className="text-bragg-lime" />
        <h1 className="text-2xl font-bold text-text-primary">
          Scenario Resolution
        </h1>
      </div>

      <ResolutionOverviewCards overview={overview} />
      <ResolutionByPhaseTable phases={byPhase} />
      <ResolutionBySlugTable slugs={bySlug} />
    </div>
  )
}
