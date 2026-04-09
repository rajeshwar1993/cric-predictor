import { getPendingRequests } from '@/lib/dal/gangs'
import { PendingRequestCard } from '@/components/gangs/pending-request-card'

export interface PendingRequestsProps {
  gangId: string
}

/**
 * PendingRequests -- server component wrapper that fetches pending
 * join requests and renders PendingRequestCard client islands.
 *
 * Renders nothing if there are no pending requests.
 * Only displayed when the current user is an admin (guarded in page.tsx).
 *
 * @see docs/stories/GANG-002-pending-requests.md
 */
export async function PendingRequests({ gangId }: PendingRequestsProps) {
  const pendingRequests = await getPendingRequests(gangId)

  if (pendingRequests.length === 0) {
    return null
  }

  return (
    <section className="mt-8" aria-label="Pending join requests">
      <h2 className="text-caption font-bold uppercase tracking-widest text-text-muted mb-3">
        Pending Requests
      </h2>
      <div className="flex flex-col gap-2" role="list">
        {pendingRequests.map((request) => (
          <PendingRequestCard
            key={request.userId}
            gangId={gangId}
            userId={request.userId}
            displayName={request.displayName}
            requestedAt={request.requestedAt}
          />
        ))}
      </div>
    </section>
  )
}
