import { Target } from 'lucide-react'

import { ResolutionByPhaseTable } from '@/components/admin/scenarios/resolution-by-phase'
import { ResolutionBySlugTable } from '@/components/admin/scenarios/resolution-by-slug'
import { ResolutionOverviewCards } from '@/components/admin/scenarios/resolution-overview'
import {
  getResolutionByPhase,
  getResolutionBySlug,
  getResolutionOverview,
} from '@/lib/dal/admin/scenarios'
import { getActiveSeason } from '@/lib/dal/admin/fixtures'

/**
 * ADM-005: Scenario Resolution page.
 *
 * Shows resolution status across all scenarios for the active season.
 */
export default async function ScenariosPage() {
  const season = await getActiveSeason()

  if (!season) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Target size={24} className="text-bragg-lime" />
          <h1 className="text-2xl font-bold text-text-primary">
            Scenario Resolution
          </h1>
        </div>
        <div className="rounded-lg border border-wire bg-concrete-black px-4 py-12 text-center">
          <p className="text-sm text-text-muted">
            No active season found. Scenario data will appear once a season is
            activated.
          </p>
        </div>
      </div>
    )
  }

  const seasonId = season.id

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
