import type { SlugAccuracy } from '@/lib/dal/admin/predictions'
import { cn } from '@/lib/utils'

interface AccuracyBySlugTableProps {
  slugs: SlugAccuracy[]
}

export function AccuracyBySlugTable({ slugs }: AccuracyBySlugTableProps) {
  if (slugs.length === 0) {
    return (
      <div className="rounded-lg border border-wire bg-dark-concrete p-6">
        <p className="text-sm text-text-muted">No accuracy data available.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-wire bg-dark-concrete">
      <div className="border-b border-wire px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Accuracy by Scenario Slug
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-wire text-left text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Correct</th>
              <th className="px-4 py-3 text-right">Accuracy</th>
              <th className="px-4 py-3">Distribution</th>
            </tr>
          </thead>
          <tbody>
            {slugs.map((slug) => (
              <tr
                key={slug.slug}
                className="border-b border-mid-concrete last:border-b-0"
              >
                <td className="px-4 py-3 font-mono text-text-primary">
                  {slug.slug}
                </td>
                <td className="px-4 py-3 text-right text-text-secondary">
                  {slug.totalPredictions.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-green-400">
                  {slug.correctPredictions.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={cn(
                      'font-medium',
                      slug.accuracyRate >= 50
                        ? 'text-green-400'
                        : slug.accuracyRate >= 25
                          ? 'text-yellow-400'
                          : 'text-red-400',
                    )}
                  >
                    {slug.accuracyRate}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-wire">
                    <div
                      className="h-full rounded-full bg-bragg-lime"
                      style={{ width: `${slug.accuracyRate}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
