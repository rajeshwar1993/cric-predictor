import { UsersRound } from 'lucide-react'
import type { GangDetailMember } from '@/lib/dal/gangs'
import type { ActionResult } from '@/types'
import { EmptyState } from '@/components/ui/empty-state'
import { MemberRowAdmin } from './member-row-admin'

export interface MemberManagementProps {
  gangId: string
  members: GangDetailMember[]
  currentUserId: string
  /** Override removeMember server action (Storybook/testing) */
  onRemove?: (gangId: string, userId: string) => Promise<ActionResult>
  /** Override blockMember server action (Storybook/testing) */
  onBlock?: (gangId: string, userId: string) => Promise<ActionResult>
  /** Override unblockMember server action (Storybook/testing) */
  onUnblock?: (gangId: string, userId: string) => Promise<ActionResult>
}

/**
 * MemberManagement — the MEMBERS section of the gang settings page.
 *
 * Renders every member row EXCEPT pending/rejected ones, sorted so the
 * active members appear first and departed/blocked members appear below.
 *
 * Server component — just filters and sorts. The per-row interactivity
 * (action buttons, dialogs, toasts) lives in `MemberRowAdmin`.
 *
 * @see docs/stories/SET-002-member-management.md
 */
export function MemberManagement({
  gangId,
  members,
  currentUserId,
  onRemove,
  onBlock,
  onUnblock,
}: MemberManagementProps) {
  // Only approved / removed / left members are relevant here. Pending and
  // rejected rows are surfaced elsewhere (pending requests on the gang page).
  // Note: this intentionally keeps `approved + is_blocked=true` rows even
  // though that combination should not normally occur — it lets the admin
  // recover from a data-integrity bug via the Unblock button in the row.
  const visibleMembers = members.filter(
    (m) =>
      m.status === 'approved' ||
      m.status === 'removed' ||
      m.status === 'left',
  )

  // Sort: active members first, departed/blocked below. Within each bucket
  // keep admins on top, then alphabetical by display name.
  const sorted = [...visibleMembers].sort((a, b) => {
    const aActive = a.status === 'approved' && !a.isBlocked ? 0 : 1
    const bActive = b.status === 'approved' && !b.isBlocked ? 0 : 1
    if (aActive !== bActive) return aActive - bActive

    const aAdmin = a.role === 'admin' ? 0 : 1
    const bAdmin = b.role === 'admin' ? 0 : 1
    if (aAdmin !== bAdmin) return aAdmin - bAdmin

    const aName = a.displayName ?? 'Unknown'
    const bName = b.displayName ?? 'Unknown'
    return aName.localeCompare(bName)
  })

  // An empty-ish gang shows only the admin row with no action buttons,
  // which looks like an empty list. Surface an explicit empty state when
  // the admin is the only member the list can act on.
  const hasNonAdminMembers = sorted.some((m) => m.role !== 'admin')

  return (
    <section
      className="mt-8 rounded-lg border border-wire bg-dark-concrete p-6"
      aria-label="Member management"
    >
      <h2 className="text-h3 font-bold uppercase tracking-[0.02em] text-text-primary">
        Members
      </h2>
      <p className="mt-2 text-body-sm text-text-secondary">
        Remove, block, or unblock members. Admins cannot be removed.
      </p>

      {hasNonAdminMembers ? (
        <div className="mt-4 flex flex-col gap-2" role="list">
          {sorted.map((m) => (
            <MemberRowAdmin
              key={m.userId}
              gangId={gangId}
              userId={m.userId}
              displayName={m.displayName}
              role={m.role}
              status={m.status}
              isBlocked={m.isBlocked}
              isCurrentUser={m.userId === currentUserId}
              onRemove={onRemove}
              onBlock={onBlock}
              onUnblock={onUnblock}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-4"
          icon={UsersRound}
          headline="No other members yet"
          description="Share your invite code to grow the gang."
        />
      )}
    </section>
  )
}
