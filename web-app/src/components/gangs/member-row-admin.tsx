'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DestructiveActionDialog } from '@/components/ui/destructive-action-dialog'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import {
  removeMember as removeMemberAction,
  blockMember as blockMemberAction,
  unblockMember as unblockMemberAction,
} from '@/lib/actions/gangs'
import type { ActionResult, MemberRole, MemberStatus } from '@/types'

export interface MemberRowAdminProps {
  gangId: string
  userId: string
  displayName: string | null
  role: MemberRole
  status: MemberStatus
  isBlocked: boolean
  /** Whether this row represents the currently-signed-in admin */
  isCurrentUser: boolean
  /** Override removeMember server action (Storybook/testing) */
  onRemove?: (gangId: string, userId: string) => Promise<ActionResult>
  /** Override blockMember server action (Storybook/testing) */
  onBlock?: (gangId: string, userId: string) => Promise<ActionResult>
  /** Override unblockMember server action (Storybook/testing) */
  onUnblock?: (gangId: string, userId: string) => Promise<ActionResult>
  /** Force the remove confirmation dialog open — Storybook only */
  initialRemoveDialogOpen?: boolean
}

/**
 * Derived state of a member row for rendering.
 */
type MemberVisualState =
  | { kind: 'active' }
  | { kind: 'removed' }
  | { kind: 'blocked' }
  | { kind: 'left' }
  | { kind: 'leftBlocked' }

function deriveState(
  status: MemberStatus,
  isBlocked: boolean,
): MemberVisualState {
  if (status === 'approved' && !isBlocked) return { kind: 'active' }
  // Data-integrity guard: if a row somehow ends up `approved + blocked`
  // (e.g. direct DB edit, failed race-guarded update), surface it as
  // "blocked" so the admin has an Unblock action to recover from the UI
  // instead of the row falling through to the generic "removed" fallback.
  if (status === 'approved' && isBlocked) return { kind: 'blocked' }
  if (status === 'removed' && isBlocked) return { kind: 'blocked' }
  if (status === 'removed') return { kind: 'removed' }
  if (status === 'left' && isBlocked) return { kind: 'leftBlocked' }
  if (status === 'left') return { kind: 'left' }
  // Fallback — should not be reached because MemberManagement filters
  // pending/rejected, but keeps the switch exhaustive.
  return { kind: 'removed' }
}

function statusLabel(state: MemberVisualState): string {
  switch (state.kind) {
    case 'active':
      return 'Active'
    case 'removed':
      return 'Removed'
    case 'blocked':
      return 'Blocked'
    case 'left':
      return 'Left'
    case 'leftBlocked':
      return 'Left & Blocked'
  }
}

/**
 * MemberRowAdmin — admin view of a single gang member with contextual
 * action buttons (Remove, Block, Unblock) depending on the member's
 * `status` + `is_blocked` combination.
 *
 * Remove opens a `DestructiveActionDialog` that requires typing the member's
 * display name. Block and Unblock fire immediately with optimistic UI.
 *
 * @see docs/stories/SET-002-member-management.md
 */
export function MemberRowAdmin({
  gangId,
  userId,
  displayName,
  role,
  status,
  isBlocked,
  isCurrentUser,
  onRemove = removeMemberAction,
  onBlock = blockMemberAction,
  onUnblock = unblockMemberAction,
  initialRemoveDialogOpen = false,
}: MemberRowAdminProps) {
  const [localStatus, setLocalStatus] = useState<MemberStatus>(status)
  const [localIsBlocked, setLocalIsBlocked] = useState(isBlocked)
  const [isDialogOpen, setIsDialogOpen] = useState(initialRemoveDialogOpen)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isBlocking, setIsBlocking] = useState(false)
  const [isUnblocking, setIsUnblocking] = useState(false)

  const name = displayName ?? 'Unknown'
  // `Array.from` splits by code points so we correctly pick up the first
  // glyph for emoji prefixes and non-BMP scripts. `charAt(0)` would split
  // surrogate pairs and produce a broken character in the avatar.
  const initial = Array.from(name)[0]?.toUpperCase() ?? '?'
  const state = deriveState(localStatus, localIsBlocked)
  const isDeparted = state.kind !== 'active'
  const isAdmin = role === 'admin'
  const isBusy = isRemoving || isBlocking || isUnblocking

  async function handleConfirmRemove() {
    setIsRemoving(true)

    // Optimistic update — row immediately reflects removed state.
    const prevStatus = localStatus
    setLocalStatus('removed')

    try {
      const result = await onRemove(gangId, userId)

      if (result.success) {
        toast.success(`${name} removed`)
        setIsDialogOpen(false)
      } else {
        // Keep the dialog open so the admin can retry without retyping the
        // member's name. DestructiveActionDialog blocks close while isLoading.
        toast.error(result.error)
        setLocalStatus(prevStatus)
      }
    } catch {
      // Same rationale as above — keep the dialog open for retry.
      toast.error('Something went wrong. Please try again.')
      setLocalStatus(prevStatus)
    } finally {
      setIsRemoving(false)
    }
  }

  async function handleBlock() {
    setIsBlocking(true)

    // Optimistic update — blocking an approved member also transitions
    // the row to 'removed' status server-side.
    const prevStatus = localStatus
    const prevBlocked = localIsBlocked
    if (localStatus === 'approved') {
      setLocalStatus('removed')
    }
    setLocalIsBlocked(true)

    try {
      const result = await onBlock(gangId, userId)

      if (result.success) {
        toast.success(`${name} blocked`)
      } else {
        toast.error(result.error)
        setLocalStatus(prevStatus)
        setLocalIsBlocked(prevBlocked)
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
      setLocalStatus(prevStatus)
      setLocalIsBlocked(prevBlocked)
    } finally {
      setIsBlocking(false)
    }
  }

  async function handleUnblock() {
    setIsUnblocking(true)

    // Optimistic — the row simply un-blocks. Status is NOT reinstated.
    const prevBlocked = localIsBlocked
    setLocalIsBlocked(false)

    try {
      const result = await onUnblock(gangId, userId)

      if (result.success) {
        toast.success(`${name} unblocked`)
      } else {
        toast.error(result.error)
        setLocalIsBlocked(prevBlocked)
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
      setLocalIsBlocked(prevBlocked)
    } finally {
      setIsUnblocking(false)
    }
  }

  return (
    <>
      <div
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-lg bg-dark-concrete px-4 py-3',
          // Departed rows carry the muted look via the already-muted
          // token colors applied to the name + status text below. We
          // avoid an `opacity-60` multiplier here because compounding
          // opacity on top of already-muted tokens can push the text
          // below WCAG AA contrast on darker surfaces.
        )}
        role="listitem"
        data-state={state.kind}
      >
        {/* Avatar */}
        <Avatar size="sm">
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>

        {/* Name + role badge + status */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                'truncate text-body-sm font-semibold',
                isDeparted ? 'text-text-muted' : 'text-text-primary',
              )}
            >
              {name}
            </span>
            {isAdmin && (
              <Badge variant="lime" className="shrink-0">
                Admin
              </Badge>
            )}
          </div>
          <span
            className={cn(
              'text-caption',
              isDeparted ? 'text-text-muted' : 'text-text-secondary',
            )}
          >
            {statusLabel(state)}
          </span>
        </div>

        {/* Action buttons */}
        {!isCurrentUser && !isAdmin && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {state.kind === 'active' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBlock}
                  disabled={isBusy}
                  aria-label={`Block ${name}`}
                >
                  {isBlocking ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    'Block'
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsDialogOpen(true)}
                  disabled={isBusy}
                  aria-label={`Remove ${name}`}
                >
                  {isRemoving ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    'Remove'
                  )}
                </Button>
              </>
            )}
            {(state.kind === 'blocked' || state.kind === 'leftBlocked') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUnblock}
                disabled={isBusy}
                aria-label={`Unblock ${name}`}
              >
                {isUnblocking ? (
                  <Loader2
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  'Unblock'
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Remove confirmation dialog — only mounted for non-admin targets */}
      {!isCurrentUser && !isAdmin && (
        <DestructiveActionDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title={`Remove ${name}`}
          description="This member will lose access to the gang. Their predictions and standings will remain visible. They can rejoin with an invite code."
          confirmValue={name}
          confirmLabel="Remove Member"
          onConfirm={handleConfirmRemove}
          isLoading={isRemoving}
        />
      )}
    </>
  )
}
