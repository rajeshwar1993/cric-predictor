'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { formatTimeAgo } from '@/lib/format-date'
import { approveJoinRequest, rejectJoinRequest } from '@/lib/actions/gangs'
import type { ActionResult } from '@/types'

export interface PendingRequestCardProps {
  gangId: string
  userId: string
  displayName: string | null
  requestedAt: string
  /** Override approve action for Storybook/testing */
  onApprove?: (gangId: string, userId: string) => Promise<ActionResult>
  /** Override reject action for Storybook/testing */
  onReject?: (gangId: string, userId: string) => Promise<ActionResult>
}

/**
 * PendingRequestCard -- displays a single pending join request
 * with avatar, display name, relative timestamp, and approve/reject buttons.
 *
 * Optimistic UI: row is hidden immediately on action.
 * Toast feedback on success/error.
 *
 * @see docs/stories/GANG-002-pending-requests.md
 */
export function PendingRequestCard({
  gangId,
  userId,
  displayName,
  requestedAt,
  onApprove = approveJoinRequest,
  onReject = rejectJoinRequest,
}: PendingRequestCardProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  const name = displayName ?? 'Unknown'
  const initial = name.charAt(0).toUpperCase()
  const isBusy = isApproving || isRejecting

  async function handleApprove() {
    setIsApproving(true)
    setIsDismissed(true) // Optimistic removal

    try {
      const result = await onApprove(gangId, userId)

      if (result.success) {
        toast.success(`${name} has been approved!`)
      } else {
        toast.error(result.error)
        setIsDismissed(false) // Revert optimistic removal
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
      setIsDismissed(false)
    } finally {
      setIsApproving(false)
    }
  }

  async function handleReject() {
    setIsRejecting(true)
    setIsDismissed(true) // Optimistic removal

    try {
      const result = await onReject(gangId, userId)

      if (result.success) {
        toast.success(`${name} has been declined.`)
      } else {
        toast.error(result.error)
        setIsDismissed(false)
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
      setIsDismissed(false)
    } finally {
      setIsRejecting(false)
    }
  }

  if (isDismissed) {
    return null
  }

  return (
    <div
      className="flex items-center gap-3 rounded-lg bg-dark-concrete px-4 py-3"
      role="listitem"
    >
      {/* Avatar */}
      <Avatar size="sm">
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>

      {/* Name + timestamp */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body-sm font-semibold text-text-primary">
          {name}
        </span>
        <span className="text-caption text-text-muted">
          requested {formatTimeAgo(requestedAt)}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReject}
          disabled={isBusy}
          aria-label={`Reject ${name}`}
        >
          {isRejecting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            'Reject'
          )}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleApprove}
          disabled={isBusy}
          aria-label={`Approve ${name}`}
        >
          {isApproving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            'Approve'
          )}
        </Button>
      </div>
    </div>
  )
}
