'use client'

import { useState } from 'react'

import type { BlockedUser, DeletedAccount, PendingRequest } from '@/lib/dal/admin/moderation'
import { cn } from '@/lib/utils'

import { BlockedUsersTable } from './blocked-users-table'
import { DeletedAccountsTable } from './deleted-accounts-table'
import { PendingRequestsTable } from './pending-requests-table'

interface ModerationTabsProps {
  blockedUsers: BlockedUser[]
  deletedAccounts: DeletedAccount[]
  pendingRequests: PendingRequest[]
}

type TabId = 'blocked' | 'deleted' | 'pending'

interface Tab {
  id: TabId
  label: string
  count: number
}

export function ModerationTabs({
  blockedUsers,
  deletedAccounts,
  pendingRequests,
}: ModerationTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('blocked')

  const tabs: Tab[] = [
    { id: 'blocked', label: 'Blocked Users', count: blockedUsers.length },
    { id: 'deleted', label: 'Deleted Accounts', count: deletedAccounts.length },
    { id: 'pending', label: 'Pending Requests', count: pendingRequests.length },
  ]

  return (
    <div className="space-y-4">
      {/* Tab buttons */}
      <div className="flex gap-1 rounded-lg border border-[#333333] bg-[#111111] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-[#242424] text-bragg-lime'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-xs',
                activeTab === tab.id
                  ? 'bg-bragg-lime/10 text-bragg-lime'
                  : 'bg-[#242424] text-text-muted',
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'blocked' && <BlockedUsersTable users={blockedUsers} />}
      {activeTab === 'deleted' && (
        <DeletedAccountsTable accounts={deletedAccounts} />
      )}
      {activeTab === 'pending' && (
        <PendingRequestsTable requests={pendingRequests} />
      )}
    </div>
  )
}
