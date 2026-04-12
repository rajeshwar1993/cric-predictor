import type { ResolutionByPhase } from '@/lib/dal/admin/scenarios'
import { cn } from '@/lib/utils'

interface ResolutionByPhaseTableProps {
  phases: ResolutionByPhase[]
}

export function ResolutionByPhaseTable({ phases }: ResolutionByPhaseTableProps) {
  if (phases.length === 0) {
    return (
      <div className="rounded-lg border border-[#333333] bg-[#1a1a1a] p-6">
        <p className="text-sm text-text-muted">No phase data available.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[#333333] bg-[#1a1a1a]">
      <div className="border-b border-[#333333] px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Resolution by Phase
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#333333] text-left text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3">Phase</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Resolved</th>
              <th className="px-4 py-3 text-right">Pending</th>
              <th className="px-4 py-3 text-right">Progress</th>
            </tr>
          </thead>
          <tbody>
            {phases.map((phase) => {
              const pct =
                phase.total > 0
                  ? Math.round((phase.resolved / phase.total) * 100)
                  : 0
              return (
                <tr
                  key={phase.phase}
                  className="border-b border-[#242424] last:border-b-0"
                >
                  <td className="px-4 py-3 font-mono text-text-primary">
                    {phase.phase}
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary">
                    {phase.total}
                  </td>
                  <td className="px-4 py-3 text-right text-green-400">
                    {phase.resolved}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-3 text-right',
                      phase.pending > 0 ? 'text-orange-400' : 'text-text-muted',
                    )}
                  >
                    {phase.pending}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#333333]">
                        <div
                          className="h-full rounded-full bg-bragg-lime"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-muted">{pct}%</span>
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
