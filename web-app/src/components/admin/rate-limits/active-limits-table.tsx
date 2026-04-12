import type { ActiveRateLimit } from '@/lib/dal/admin/rate-limits'

interface ActiveLimitsTableProps {
  limits: ActiveRateLimit[]
}

export function ActiveLimitsTable({ limits }: ActiveLimitsTableProps) {
  if (limits.length === 0) {
    return (
      <div className="rounded-lg border border-[#333333] bg-[#1a1a1a] p-6">
        <p className="text-sm text-text-muted">
          No active rate limit entries in the last hour.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[#333333] bg-[#1a1a1a]">
      <div className="border-b border-[#333333] px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Active Rate Limit Entries
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#333333] text-left text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3 text-right">Count</th>
              <th className="px-4 py-3">Window Start</th>
            </tr>
          </thead>
          <tbody>
            {limits.map((limit) => (
              <tr
                key={limit.id}
                className="border-b border-[#242424] last:border-b-0"
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="text-text-primary">
                      {limit.displayName ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-text-muted">{limit.userEmail}</p>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-text-secondary">
                  {limit.action}
                </td>
                <td className="px-4 py-3 text-right font-medium text-bragg-lime">
                  {limit.count}
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {new Date(limit.windowStart).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
