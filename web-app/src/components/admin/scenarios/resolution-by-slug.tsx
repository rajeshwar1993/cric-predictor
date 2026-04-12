import type { ResolutionBySlug } from '@/lib/dal/admin/scenarios'
import { cn } from '@/lib/utils'

interface ResolutionBySlugTableProps {
  slugs: ResolutionBySlug[]
}

export function ResolutionBySlugTable({ slugs }: ResolutionBySlugTableProps) {
  if (slugs.length === 0) {
    return (
      <div className="rounded-lg border border-[#333333] bg-[#1a1a1a] p-6">
        <p className="text-sm text-text-muted">No slug data available.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[#333333] bg-[#1a1a1a]">
      <div className="border-b border-[#333333] px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Resolution by Slug
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#333333] text-left text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Resolved</th>
              <th className="px-4 py-3 text-right">Voided</th>
              <th className="px-4 py-3 text-right">Pending</th>
              <th className="px-4 py-3 text-right">Resolution %</th>
            </tr>
          </thead>
          <tbody>
            {slugs.map((slug) => (
              <tr
                key={slug.slug}
                className="border-b border-[#242424] last:border-b-0"
              >
                <td className="px-4 py-3 font-mono text-text-primary">
                  {slug.slug}
                </td>
                <td className="px-4 py-3 text-right text-text-secondary">
                  {slug.total}
                </td>
                <td className="px-4 py-3 text-right text-green-400">
                  {slug.resolved}
                </td>
                <td
                  className={cn(
                    'px-4 py-3 text-right',
                    slug.voided > 0 ? 'text-yellow-400' : 'text-text-muted',
                  )}
                >
                  {slug.voided}
                </td>
                <td
                  className={cn(
                    'px-4 py-3 text-right',
                    slug.pending > 0 ? 'text-orange-400' : 'text-text-muted',
                  )}
                >
                  {slug.pending}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={cn(
                      'font-medium',
                      slug.accuracyRate === 100
                        ? 'text-green-400'
                        : slug.accuracyRate > 50
                          ? 'text-bragg-lime'
                          : 'text-orange-400',
                    )}
                  >
                    {slug.accuracyRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
