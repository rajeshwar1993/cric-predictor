import type { DailySignup } from '@/lib/dal/admin/users'

interface UserGrowthChartProps {
  data: DailySignup[]
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-[#333333] bg-[#1a1a1a] p-6">
        <p className="text-sm text-text-muted">No signup data available.</p>
      </div>
    )
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="rounded-lg border border-[#333333] bg-[#1a1a1a]">
      <div className="border-b border-[#333333] px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Daily Signups (Last 30 Days)
        </h3>
      </div>
      <div className="flex items-end gap-1 overflow-x-auto px-4 py-4">
        {data.map((day) => {
          const heightPct = maxCount > 0 ? (day.count / maxCount) * 100 : 0
          return (
            <div
              key={day.date}
              className="flex min-w-[12px] flex-1 flex-col items-center gap-1"
            >
              <span className="text-[10px] text-text-muted">
                {day.count > 0 ? day.count : ''}
              </span>
              <div
                className="w-full rounded-t bg-bragg-lime/80 transition-all"
                style={{
                  height: `${Math.max(heightPct, day.count > 0 ? 4 : 1)}px`,
                  minHeight: day.count > 0 ? '4px' : '1px',
                  maxHeight: '120px',
                }}
              />
              <span className="text-[9px] text-text-muted">
                {day.date.substring(5)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
