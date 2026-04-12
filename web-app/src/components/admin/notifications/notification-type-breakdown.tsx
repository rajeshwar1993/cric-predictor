import type { NotificationTypeBreakdown } from '@/lib/dal/admin/notifications'

interface NotificationTypeBreakdownTableProps {
  types: NotificationTypeBreakdown[]
}

export function NotificationTypeBreakdownTable({
  types,
}: NotificationTypeBreakdownTableProps) {
  if (types.length === 0) {
    return (
      <div className="rounded-lg border border-[#333333] bg-[#1a1a1a] p-6">
        <p className="text-sm text-text-muted">No notification data available.</p>
      </div>
    )
  }

  const maxCount = Math.max(...types.map((t) => t.count), 1)

  return (
    <div className="rounded-lg border border-[#333333] bg-[#1a1a1a]">
      <div className="border-b border-[#333333] px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Notifications by Type
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#333333] text-left text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Count</th>
              <th className="px-4 py-3">Distribution</th>
            </tr>
          </thead>
          <tbody>
            {types.map((type) => {
              const pct =
                maxCount > 0
                  ? Math.round((type.count / maxCount) * 100)
                  : 0
              return (
                <tr
                  key={type.type}
                  className="border-b border-[#242424] last:border-b-0"
                >
                  <td className="px-4 py-3 font-mono text-text-primary">
                    {type.type}
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary">
                    {type.count.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-[#333333]">
                      <div
                        className="h-full rounded-full bg-bragg-lime"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
