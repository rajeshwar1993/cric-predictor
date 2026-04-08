'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { approveMember, rejectMember } from '@/lib/actions/gang-members'

export interface PendingRequest {
  userId: string
  displayName: string
  requestedAt: string
}

export interface PendingRequestsProps {
  gangId: string
  requests: PendingRequest[]
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then

  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${String(minutes)}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${String(hours)}h ago`

  const days = Math.floor(hours / 24)
  return `${String(days)}d ago`
}

function PendingRequestRow({ gangId, request }: { gangId: string; request: PendingRequest }) {
  const router = useRouter()
  const [isApproving, startApproving] = useTransition()
  const [isRejecting, startRejecting] = useTransition()

  const isLoading = isApproving || isRejecting

  function handleApprove() {
    startApproving(async () => {
      await approveMember(gangId, request.userId)
      router.refresh()
    })
  }

  function handleReject() {
    startRejecting(async () => {
      await rejectMember(gangId, request.userId)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center justify-between gap-[var(--sp-3)] rounded-[var(--radius-ds-md)] border border-[var(--border-default)] bg-[var(--bg-raised)] p-[var(--sp-3)]">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
          {request.displayName}
        </p>
        <p className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
          <Clock size={12} strokeWidth={1.5} aria-hidden="true" />
          {formatTimeAgo(request.requestedAt)}
        </p>
      </div>
      <div className="flex shrink-0 gap-[var(--sp-2)]">
        <Button size="xs" onClick={handleApprove} disabled={isLoading}>
          {isApproving ? <LoadingSpinner size="sm" /> : 'Approve'}
        </Button>
        <Button size="xs" variant="outline" onClick={handleReject} disabled={isLoading}>
          {isRejecting ? <LoadingSpinner size="sm" /> : 'Reject'}
        </Button>
      </div>
    </div>
  )
}

export function PendingRequests({ gangId, requests }: PendingRequestsProps) {
  if (requests.length === 0) return null

  return (
    <section aria-label="Pending join requests">
      <h3 className="mb-[var(--sp-3)] font-heading text-lg font-semibold text-[var(--text-primary)]">
        Pending Requests{' '}
        <span className="inline-flex min-w-[20px] items-center justify-center rounded-[var(--radius-ds-full)] px-1.5 py-0.5 text-xs font-medium bg-[var(--warning-muted)] text-[var(--warning)]">
          {requests.length}
        </span>
      </h3>
      <div className="flex flex-col gap-[var(--sp-2)]">
        {requests.map((request) => (
          <PendingRequestRow key={request.userId} gangId={gangId} request={request} />
        ))}
      </div>
    </section>
  )
}
