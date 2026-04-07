'use client'

import { useCallback, useState } from 'react'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DestructiveActionDialog } from '@/components/ui/destructive-action-dialog'
import { leaveGang } from '@/lib/actions/gang-members'

export interface LeaveGangButtonProps {
  gangId: string
  gangName: string
}

export function LeaveGangButton({ gangId, gangName }: LeaveGangButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = useCallback(async () => {
    setError(null)
    const result = await leaveGang(gangId)
    // leaveGang redirects on success, so we only handle errors
    if (!result.success) {
      setError(result.error)
    }
  }, [gangId])

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => {
          setDialogOpen(true)
        }}
        className="w-full justify-start"
        style={{ color: 'var(--error)' }}
        aria-label={`Leave ${gangName}`}
      >
        <LogOut size={20} strokeWidth={1.5} aria-hidden="true" />
        Leave Gang
      </Button>

      <DestructiveActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={`Leave ${gangName}?`}
        description="You will lose access to this gang. You can rejoin with an invite code unless you're blocked."
        confirmValue={gangName}
        confirmLabel="Leave Gang"
        onConfirm={handleConfirm}
      />

      {error !== null && (
        <p className="mt-2 text-sm" style={{ color: 'var(--error)' }} role="alert">
          {error}
        </p>
      )}
    </>
  )
}
