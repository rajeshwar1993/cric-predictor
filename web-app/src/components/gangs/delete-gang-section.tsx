'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DestructiveActionDialog } from '@/components/ui/destructive-action-dialog'
import { toast } from '@/components/ui/toast'
import { deleteGang as deleteGangAction } from '@/lib/actions/gangs'
import type { ActionResult } from '@/types'

export interface DeleteGangSectionProps {
  gangId: string
  gangName: string
  /** Override delete action for Storybook/testing */
  onDelete?: (gangId: string) => Promise<ActionResult>
  /** Force the confirmation dialog open — Storybook/testing only */
  initialDialogOpen?: boolean
}

/**
 * DeleteGangSection -- the Danger Zone card on the gang settings page.
 *
 * Renders a destructive button that opens a DestructiveActionDialog requiring
 * the admin to type the gang name to confirm. On success, redirects to the
 * dashboard and fires a success toast; on failure, surfaces the error via a
 * persistent error toast and closes the dialog.
 *
 * Only rendered for admins (the settings page handles the gating).
 *
 * @see docs/stories/SET-001-gang-settings.md
 */
export function DeleteGangSection({
  gangId,
  gangName,
  onDelete = deleteGangAction,
  initialDialogOpen = false,
}: DeleteGangSectionProps) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(initialDialogOpen)
  const [isLoading, setIsLoading] = useState(false)

  async function handleConfirm() {
    setIsLoading(true)

    try {
      const result = await onDelete(gangId)

      if (result.success) {
        toast.success(`${gangName} has been deleted`)
        router.push('/dashboard')
      } else {
        toast.error(result.error)
        setIsDialogOpen(false)
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
      setIsDialogOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <section
        className="mt-8 rounded-lg border-2 border-electric-coral/40 bg-dark-concrete p-6"
        aria-label="Danger zone"
      >
        <h2 className="text-h3 font-bold uppercase tracking-[0.02em] text-electric-coral">
          Danger Zone
        </h2>
        <p className="mt-2 text-body-sm text-text-secondary">
          Deleting the gang is permanent. All members will be notified and lose
          access immediately.
        </p>
        <Button
          variant="destructive"
          onClick={() => setIsDialogOpen(true)}
          className="mt-4 w-full sm:w-auto"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Delete Gang
        </Button>
      </section>

      <DestructiveActionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={`Delete ${gangName}`}
        description="This will permanently delete the gang. All members will be notified. This cannot be undone."
        confirmValue={gangName}
        confirmLabel="Delete Gang"
        onConfirm={handleConfirm}
        isLoading={isLoading}
      />
    </>
  )
}
