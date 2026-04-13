import { Flag } from 'lucide-react'

import { ModerationTabs } from '@/components/admin/moderation/moderation-tabs'
import {
  getBlockedUsers,
  getDeletedAccounts,
  getModerationCounts,
  getPendingRequests,
} from '@/lib/dal/admin/moderation'

/**
 * ADM-014: Moderation page.
 *
 * Shows moderation counts and tabbed views for blocked users,
 * deleted accounts, and pending join requests.
 */
export default async function ModerationPage() {
  const [counts, blockedUsers, deletedAccounts, pendingRequests] =
    await Promise.all([
      getModerationCounts(),
      getBlockedUsers(),
      getDeletedAccounts(50),
      getPendingRequests(),
    ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Flag size={24} className="text-bragg-lime" />
        <h1 className="text-2xl font-bold text-text-primary">Moderation</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-wire bg-dark-concrete p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Blocked Members
          </p>
          <p className="mt-1 text-2xl font-bold text-red-400">
            {counts.blockedMembers}
          </p>
        </div>
        <div className="rounded-lg border border-wire bg-dark-concrete p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Deleted Accounts
          </p>
          <p className="mt-1 text-2xl font-bold text-text-secondary">
            {counts.deletedAccounts}
          </p>
        </div>
        <div className="rounded-lg border border-wire bg-dark-concrete p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Deleted Gangs
          </p>
          <p className="mt-1 text-2xl font-bold text-text-secondary">
            {counts.deletedGangs}
          </p>
        </div>
        <div className="rounded-lg border border-wire bg-dark-concrete p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Pending Requests
          </p>
          <p className="mt-1 text-2xl font-bold text-yellow-400">
            {counts.pendingRequests}
          </p>
        </div>
      </div>

      <ModerationTabs
        blockedUsers={blockedUsers}
        deletedAccounts={deletedAccounts}
        pendingRequests={pendingRequests}
      />
    </div>
  )
}
