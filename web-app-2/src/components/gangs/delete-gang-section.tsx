'use client'

import { useCallback, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DestructiveActionDialog } from '@/components/ui/destructive-action-dialog'
import { deleteGang } from '@/lib/actions/gangs'

export interface DeleteGangSectionProps {
  gangId: string
  gangName: string
}

export function DeleteGangSection({ gangId, gangName }: DeleteGangSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = useCallback(async () => {
    setError(null)
    const result = await deleteGang(gangId)
    // deleteGang redirects on success, so we only handle errors
    if (!result.success) {
      setError(result.error)
    }
  }, [gangId])

  return (
    <section aria-label="Danger zone">
      <div
        className="rounded-[length:var(--radius-ds-lg)] border p-[var(--sp-4)]"
        style={{ borderColor: 'var(--error-muted)' }}
      >
        <h3
          className="mb-[var(--sp-2)] font-heading text-lg font-semibold"
          style={{ color: 'var(--error)' }}
        >
          Danger Zone
        </h3>
        <p className="mb-[var(--sp-4)] text-sm" style={{ color: 'var(--text-secondary)' }}>
          Deleting a gang is permanent. All members will be removed and all data will be lost.
        </p>

        <Button
          variant="destructive"
          onClick={() => {
            setDialogOpen(true)
          }}
        >
          <Trash2 size={20} strokeWidth={1.5} aria-hidden="true" />
          Delete Gang
        </Button>

        {error !== null && (
          <p className="mt-[var(--sp-2)] text-sm" style={{ color: 'var(--error)' }} role="alert">
            {error}
          </p>
        )}
      </div>

      <DestructiveActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={`Delete ${gangName}?`}
        description="This will permanently delete the gang and remove all members. This action cannot be undone."
        confirmValue={gangName}
        confirmLabel="Delete Gang"
        onConfirm={handleConfirm}
      />
    </section>
  )
}
