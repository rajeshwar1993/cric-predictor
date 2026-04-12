import { cn, truncate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { ScenarioTemplate } from '@/lib/dal/admin/reference'
import type { Json } from '@/types/database'

/**
 * Safely stringify JSON options for display.
 */
function formatOptions(options: Json | null): string {
  if (options === null || options === undefined) return '\u2014'
  try {
    return JSON.stringify(options)
  } catch {
    return '\u2014'
  }
}

interface ScenarioTemplatesTableProps {
  templates: ScenarioTemplate[]
}

export function ScenarioTemplatesTable({
  templates,
}: ScenarioTemplatesTableProps) {
  const activeTemplates = templates.filter((t) => t.is_active)
  const totalActivePoints = activeTemplates.reduce(
    (sum, t) => sum + t.points,
    0,
  )
  const pointsBudgetOk = totalActivePoints === 210

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-text-secondary">
          {templates.length} templates &middot; {activeTemplates.length} active
        </span>
        <span
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium',
            pointsBudgetOk
              ? 'bg-bragg-lime/15 text-bragg-lime'
              : 'bg-electric-coral/15 text-electric-coral',
          )}
        >
          Points budget: {totalActivePoints}/210
          {!pointsBudgetOk && ' \u26A0'}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-wire">
        <table className="w-full">
          <thead>
            <tr className="bg-dark-concrete">
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Slug
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Title
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Input Type
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Options
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Points
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Phase
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => {
              const optionsStr = formatOptions(template.options)
              const truncatedOptions = truncate(optionsStr, 80)

              return (
                <tr
                  key={template.id}
                  className={cn(
                    'border-t border-wire bg-concrete-black transition-colors hover:bg-dark-concrete',
                    !template.is_active && 'opacity-50',
                  )}
                >
                  <td className="px-4 py-2.5 font-mono text-sm text-bragg-lime">
                    {template.slug}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-text-primary">
                    {template.title}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="default">{template.input_type}</Badge>
                  </td>
                  <td className="max-w-[300px] px-4 py-2.5">
                    {optionsStr === '\u2014' ? (
                      <span className="text-sm text-text-muted">{'\u2014'}</span>
                    ) : (
                      <span
                        className="inline-block max-w-full truncate rounded bg-mid-concrete px-2 py-0.5 font-mono text-xs text-text-secondary"
                        title={optionsStr}
                      >
                        {truncatedOptions}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-sm font-medium text-text-primary">
                    {template.points}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-text-secondary">
                    {template.resolution_phase}
                  </td>
                  <td className="px-4 py-2.5">
                    {template.is_active ? (
                      <Badge variant="lime">Active</Badge>
                    ) : (
                      <Badge variant="default">Inactive</Badge>
                    )}
                  </td>
                </tr>
              )
            })}
            {templates.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No scenario templates found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
