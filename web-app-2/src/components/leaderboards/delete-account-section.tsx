'use client'

import { useCallback, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DestructiveActionDialog } from '@/components/ui/destructive-action-dialog'
import { deleteAccount } from '@/lib/actions/account'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeleteAccountSectionProps {
  userEmail: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DeleteAccountSection({ userEmail }: DeleteAccountSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleDelete = useCallback(async () => {
    await deleteAccount()
    // deleteAccount redirects on success, so this line won't be reached
  }, [])

  return (
    <div className="flex flex-col gap-[var(--sp-3)]">
      <h3
        className="text-sm font-medium uppercase tracking-[0.05em]"
        style={{ color: 'var(--error)' }}
      >
        Danger zone
      </h3>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Permanently delete your account and all associated data. This cannot be undone.
      </p>
      <Button
        variant="destructive"
        onClick={() => {
          setIsDialogOpen(true)
        }}
        className="w-fit"
      >
        <Trash2 size={16} strokeWidth={1.5} className="mr-[var(--sp-1)]" aria-hidden="true" />
        Delete account
      </Button>

      <DestructiveActionDialog
        title="Delete your account?"
        description="This will permanently delete your account, predictions, and remove you from all gangs. This action cannot be undone."
        confirmValue={userEmail}
        confirmLabel="Delete account"
        onConfirm={handleDelete}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  )
}
