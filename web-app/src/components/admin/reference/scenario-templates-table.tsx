'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'

import { cn, truncate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { ScenarioTemplateForm } from './scenario-template-form'
import {
  toggleScenarioTemplateActive,
  deleteScenarioTemplate,
} from '@/lib/actions/admin/scenario-templates'
import type { ScenarioTemplate, Sport } from '@/lib/dal/admin/reference'
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
  seededCounts: Record<string, number>
  sports: Sport[]
}

export function ScenarioTemplatesTable({
  templates,
  seededCounts,
  sports,
}: ScenarioTemplatesTableProps) {
  const activeTemplates = templates.filter((t) => t.is_active)
  const totalActivePoints = activeTemplates.reduce(
    (sum, t) => sum + t.points,
    0,
  )
  const pointsBudgetOk = totalActivePoints === 210

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] =
    useState<ScenarioTemplate | null>(null)

  // Confirm dialogs state
  const [toggleConfirm, setToggleConfirm] = useState<{
    template: ScenarioTemplate
    newState: boolean
  } | null>(null)
  const [deleteConfirm, setDeleteConfirm] =
    useState<ScenarioTemplate | null>(null)

  // Transition for toggle/delete
  const [isPending, startTransition] = useTransition()

  const existingSlugs = templates.map((t) => t.slug)

  function handleCreate() {
    setEditingTemplate(null)
    setFormOpen(true)
  }

  function handleEdit(template: ScenarioTemplate) {
    setEditingTemplate(template)
    setFormOpen(true)
  }

  function handleToggle(template: ScenarioTemplate, newState: boolean) {
    if (!newState) {
      // Deactivating: show confirmation
      setToggleConfirm({ template, newState })
    } else {
      // Activating: no confirmation needed
      performToggle(template.id, true)
    }
  }

  function performToggle(templateId: string, newState: boolean) {
    startTransition(async () => {
      const result = await toggleScenarioTemplateActive(templateId, newState)
      if (result.success) {
        toast.success(
          newState ? 'Template activated' : 'Template deactivated',
        )
      } else {
        toast.error(result.error)
      }
      setToggleConfirm(null)
    })
  }

  function handleDeleteConfirm(template: ScenarioTemplate) {
    setDeleteConfirm(template)
  }

  function performDelete(templateId: string) {
    startTransition(async () => {
      const result = await deleteScenarioTemplate(templateId)
      if (result.success) {
        toast.success('Template deleted')
      } else {
        toast.error(result.error)
      }
      setDeleteConfirm(null)
    })
  }

  return (
    <div className="space-y-4">
      {/* Summary + Add button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-secondary">
            {templates.length} templates &middot; {activeTemplates.length}{' '}
            active
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
        <Button size="sm" onClick={handleCreate}>
          <Plus className="size-4" />
          Add template
        </Button>
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
              <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-widest text-text-secondary">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => {
              const optionsStr = formatOptions(template.options)
              const truncatedOptions = truncate(optionsStr, 80)
              const seeded = seededCounts[template.id] ?? 0
              const canDelete = seeded === 0

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
                      <span className="text-sm text-text-muted">
                        {'\u2014'}
                      </span>
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
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={(checked) =>
                        handleToggle(template, checked)
                      }
                      aria-label={`Toggle ${template.slug} ${template.is_active ? 'inactive' : 'active'}`}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => handleEdit(template)}
                        aria-label={`Edit ${template.slug}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      {canDelete ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-electric-coral hover:text-electric-coral"
                          onClick={() => handleDeleteConfirm(template)}
                          aria-label={`Delete ${template.slug}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : (
                        <span
                          className="inline-flex size-8 cursor-not-allowed items-center justify-center text-text-muted"
                          title="Cannot delete — this template has been seeded to fixtures. Deactivate it instead."
                        >
                          <Trash2 className="size-3.5" />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {templates.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No scenario templates found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit form dialog */}
      <ScenarioTemplateForm
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editingTemplate}
        seededCount={editingTemplate ? (seededCounts[editingTemplate.id] ?? 0) : 0}
        sports={sports}
        existingSlugs={existingSlugs}
      />

      {/* Toggle deactivation confirmation dialog */}
      {toggleConfirm && (
        <Dialog
          open={!!toggleConfirm}
          onOpenChange={(open) => {
            if (!open) setToggleConfirm(null)
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Deactivate template?</DialogTitle>
              <DialogDescription>
                Deactivating this template means it won&apos;t be seeded for
                future fixtures.
                {(seededCounts[toggleConfirm.template.id] ?? 0) > 0 && (
                  <>
                    {' '}
                    {seededCounts[toggleConfirm.template.id]} existing seeded
                    scenario{(seededCounts[toggleConfirm.template.id] ?? 0) !== 1 ? 's' : ''}{' '}
                    will not be affected.
                  </>
                )}{' '}
                Continue?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setToggleConfirm(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  performToggle(
                    toggleConfirm.template.id,
                    toggleConfirm.newState,
                  )
                }
                loading={isPending}
                disabled={isPending}
              >
                Deactivate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <Dialog
          open={!!deleteConfirm}
          onOpenChange={(open) => {
            if (!open) setDeleteConfirm(null)
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete template?</DialogTitle>
              <DialogDescription>
                Permanently delete template &ldquo;{deleteConfirm.slug}&rdquo;?
                This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setDeleteConfirm(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => performDelete(deleteConfirm.id)}
                loading={isPending}
                disabled={isPending}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
