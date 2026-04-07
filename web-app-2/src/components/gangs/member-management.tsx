'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, ShieldOff, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { DestructiveActionDialog } from '@/components/ui/destructive-action-dialog'
import {
  approveMember,
  rejectMember,
  removeMember,
  blockMember,
  unblockMember,
} from '@/lib/actions/gang-members'

export interface ManagedMember {
  userId: string
  displayName: string
  role: 'admin' | 'member'
  status: 'pending' | 'approved' | 'rejected' | 'removed' | 'left'
  isBlocked: boolean
  isCurrentUser: boolean
}

export interface MemberManagementProps {
  gangId: string
  members: ManagedMember[]
}

function StatusBadge({ status, isBlocked }: { status: string; isBlocked: boolean }) {
  if (isBlocked) {
    return (
      <span
        className="inline-flex items-center rounded-[length:var(--radius-ds-sm)] px-2 py-0.5 text-xs font-medium uppercase tracking-wider"
        style={{ backgroundColor: 'var(--error-muted)', color: 'var(--error)' }}
      >
        Blocked
      </span>
    )
  }

  const styles: Record<string, { bg: string; color: string }> = {
    pending: { bg: 'var(--warning-muted)', color: 'var(--warning)' },
    approved: { bg: 'var(--success-muted)', color: 'var(--success)' },
    rejected: { bg: 'var(--error-muted)', color: 'var(--error)' },
    removed: { bg: 'var(--bg-overlay)', color: 'var(--text-tertiary)' },
    left: { bg: 'var(--bg-overlay)', color: 'var(--text-tertiary)' },
  }

  const style = styles[status] ?? styles['left']

  return (
    <span
      className="inline-flex items-center rounded-[length:var(--radius-ds-sm)] px-2 py-0.5 text-xs font-medium uppercase tracking-wider"
      style={{ backgroundColor: style?.bg, color: style?.color }}
    >
      {status}
    </span>
  )
}

function MemberRow({ gangId, member }: { gangId: string; member: ManagedMember }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)

  const handleAction = useCallback(
    (action: (gangId: string, userId: string) => Promise<{ success: boolean }>) => {
      startTransition(async () => {
        await action(gangId, member.userId)
        router.refresh()
      })
    },
    [gangId, member.userId, router],
  )

  const handleRemoveConfirm = useCallback(async () => {
    await removeMember(gangId, member.userId)
    router.refresh()
    setRemoveDialogOpen(false)
  }, [gangId, member.userId, router])

  // Admin's own row -- no actions
  if (member.isCurrentUser) {
    return (
      <div
        className="flex items-center justify-between gap-[var(--sp-3)] border-b border-[var(--border-default)] px-[var(--sp-4)] py-[var(--sp-3)]"
        style={{ minHeight: 56 }}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {member.displayName}{' '}
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              (you)
            </span>
          </p>
        </div>
        <StatusBadge status={member.status} isBlocked={member.isBlocked} />
      </div>
    )
  }

  return (
    <>
      <div
        className="flex items-center justify-between gap-[var(--sp-3)] border-b border-[var(--border-default)] px-[var(--sp-4)] py-[var(--sp-3)]"
        style={{ minHeight: 56 }}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {member.displayName}
          </p>
          <StatusBadge status={member.status} isBlocked={member.isBlocked} />
        </div>

        <div className="flex shrink-0 gap-[var(--sp-1)]">
          {isPending && <LoadingSpinner size="sm" />}

          {!isPending && member.status === 'pending' && (
            <>
              <Button
                size="xs"
                onClick={() => {
                  handleAction(approveMember)
                }}
              >
                Approve
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  handleAction(rejectMember)
                }}
              >
                Reject
              </Button>
            </>
          )}

          {!isPending && member.status === 'approved' && !member.isBlocked && (
            <>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => {
                  setRemoveDialogOpen(true)
                }}
                aria-label={`Remove ${member.displayName}`}
              >
                <Trash2 size={16} strokeWidth={1.5} style={{ color: 'var(--error)' }} />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => {
                  handleAction(blockMember)
                }}
                aria-label={`Block ${member.displayName}`}
              >
                <Shield size={16} strokeWidth={1.5} style={{ color: 'var(--warning)' }} />
              </Button>
            </>
          )}

          {!isPending && member.isBlocked && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                handleAction(unblockMember)
              }}
              aria-label={`Unblock ${member.displayName}`}
            >
              <ShieldOff size={16} strokeWidth={1.5} aria-hidden="true" />
              Unblock
            </Button>
          )}

          {!isPending &&
            !member.isBlocked &&
            (member.status === 'removed' || member.status === 'left') && (
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  handleAction(blockMember)
                }}
                aria-label={`Block ${member.displayName}`}
              >
                <Shield size={16} strokeWidth={1.5} aria-hidden="true" />
                Block
              </Button>
            )}
        </div>
      </div>

      <DestructiveActionDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title={`Remove ${member.displayName}?`}
        description="This member will be removed from the gang. They can rejoin with an invite code unless you block them."
        confirmValue={member.displayName}
        confirmLabel="Remove"
        onConfirm={handleRemoveConfirm}
      />
    </>
  )
}

export function MemberManagement({ gangId, members }: MemberManagementProps) {
  return (
    <section aria-label="Member management">
      <h3
        className="mb-[var(--sp-3)] font-heading text-lg font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        Members{' '}
        <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
          ({members.length})
        </span>
      </h3>
      <div className="overflow-hidden rounded-[length:var(--radius-ds-lg)] border border-[var(--border-default)] bg-[var(--bg-raised)]">
        {members.map((member) => (
          <MemberRow key={member.userId} gangId={gangId} member={member} />
        ))}
      </div>
    </section>
  )
}
