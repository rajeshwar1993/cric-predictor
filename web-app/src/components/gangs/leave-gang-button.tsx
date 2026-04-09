'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DestructiveActionDialog } from '@/components/ui/destructive-action-dialog'
import { toast } from '@/components/ui/toast'
import { leaveGang as leaveGangAction } from '@/lib/actions/gangs'
import type { ActionResult } from '@/types'

export interface LeaveGangButtonProps {
  gangId: string
  gangName: string
  /** Override leave action for Storybook/testing */
  onLeave?: (gangId: string) => Promise<ActionResult>
}

/**
 * LeaveGangButton -- destructive-variant button at the bottom of the gang page.
 * Opens a DestructiveActionDialog requiring the user to type the gang name
 * to confirm. On success, redirects to the dashboard.
 *
 * Only rendered for non-admin members (the page handles the isAdmin guard).
 *
 * @see docs/stories/GANG-004-leave-gang.md
 */
export function LeaveGangButton({
  gangId,
  gangName,
  onLeave = leaveGangAction,
}: LeaveGangButtonProps) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleConfirm() {
    setIsLoading(true)

    try {
      const result = await onLeave(gangId)

      if (result.success) {
        toast.success(`You have left ${gangName}`)
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
      <section className="mt-8" aria-label="Leave gang">
        <Button
          variant="destructive"
          onClick={() => setIsDialogOpen(true)}
          className="w-full"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Leave Gang
        </Button>
      </section>

      <DestructiveActionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={`Leave ${gangName}`}
        description="You will lose access to this gang. Your predictions and standings will remain visible to other members. You can rejoin later with an invite code."
        confirmValue={gangName}
        confirmLabel="Leave Gang"
        onConfirm={handleConfirm}
        isLoading={isLoading}
      />
    </>
  )
}
