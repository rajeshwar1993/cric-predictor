import { BarChart3 } from 'lucide-react'

import { AccuracyBySlugTable } from '@/components/admin/predictions/accuracy-by-slug'
import { PredictionVolumeCards } from '@/components/admin/predictions/prediction-volume'
import { getAccuracyBySlug, getPredictionVolume } from '@/lib/dal/admin/predictions'

/**
 * ADM-008: Prediction Insights page.
 *
 * Shows prediction volume and per-slug accuracy rates.
 */
export default async function PredictionsPage() {
  // TODO: Replace with dynamic active season lookup
  const seasonId = 'ipl-2026'

  const [volume, accuracyBySlug] = await Promise.all([
    getPredictionVolume(),
    getAccuracyBySlug(seasonId),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 size={24} className="text-bragg-lime" />
        <h1 className="text-2xl font-bold text-text-primary">
          Prediction Insights
        </h1>
      </div>

      <PredictionVolumeCards volume={volume} />
      <AccuracyBySlugTable slugs={accuracyBySlug} />
    </div>
  )
}
