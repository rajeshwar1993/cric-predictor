import type { GangSizeBracket } from '@/lib/dal/admin/gangs'

interface GangSizeChartProps {
  data: GangSizeBracket[]
}

export function GangSizeChart({ data }: GangSizeChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-[#333333] bg-[#1a1a1a] p-6">
        <p className="text-sm text-text-muted">No gang size data available.</p>
      </div>
    )
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="rounded-lg border border-[#333333] bg-[#1a1a1a]">
      <div className="border-b border-[#333333] px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Gang Size Distribution
        </h3>
      </div>
      <div className="space-y-3 p-4">
        {data.map((bracket) => {
          const widthPct =
            maxCount > 0 ? (bracket.count / maxCount) * 100 : 0
          return (
            <div key={bracket.bracket} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-sm text-text-secondary">
                {bracket.bracket}
              </span>
              <div className="flex-1">
                <div className="h-6 w-full overflow-hidden rounded bg-[#242424]">
                  <div
                    className="flex h-full items-center rounded bg-bragg-lime/80 px-2 transition-all"
                    style={{ width: `${Math.max(widthPct, bracket.count > 0 ? 5 : 0)}%` }}
                  >
                    {bracket.count > 0 && (
                      <span className="text-xs font-medium text-black">
                        {bracket.count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
