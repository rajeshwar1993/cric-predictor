import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { SidePanel } from '@/components/ui/side-panel'
import type { Notification } from '@/types'

import { NotificationPanel } from './notification-panel'

/* ------------------------------------------------------------------ */
/* Fixtures                                                             */
/* ------------------------------------------------------------------ */

const NOW = Date.parse('2026-04-10T12:00:00Z')

function minsAgo(mins: number): string {
  return new Date(NOW - mins * 60 * 1000).toISOString()
}

const MIXED: Notification[] = [
  {
    id: 'n1',
    user_id: 'user-1',
    type: 'new_member',
    message: 'Virat K joined Street Legends.',
    gang_id: 'gang-1',
    fixture_id: null,
    is_read: false,
    created_at: minsAgo(2),
  },
  {
    id: 'n2',
    user_id: 'user-1',
    type: 'deadline_reminder',
    message: 'MI vs CSK starts in 15 minutes. Lock in your picks!',
    gang_id: 'gang-1',
    fixture_id: 'fx-1',
    is_read: false,
    created_at: minsAgo(45),
  },
  {
    id: 'n3',
    user_id: 'user-1',
    type: 'results_available',
    message: 'Match results for RCB vs GT are in. See how you did.',
    gang_id: 'gang-1',
    fixture_id: 'fx-2',
    is_read: true,
    created_at: minsAgo(180),
  },
  {
    id: 'n4',
    user_id: 'user-1',
    type: 'join_request',
    message: 'Rohit S wants to join Street Legends.',
    gang_id: 'gang-1',
    fixture_id: null,
    is_read: true,
    created_at: minsAgo(240),
  },
  {
    id: 'n5',
    user_id: 'user-1',
    type: 'admin_promoted',
    message: 'You are now an admin of Street Legends.',
    gang_id: 'gang-1',
    fixture_id: null,
    is_read: true,
    created_at: minsAgo(60 * 24),
  },
]

const ALL_UNREAD: Notification[] = MIXED.map((n) => ({ ...n, is_read: false }))
const ALL_READ: Notification[] = MIXED.map((n) => ({ ...n, is_read: true }))

/* ------------------------------------------------------------------ */
/* Wrapper that renders the panel inside an open SidePanel              */
/* ------------------------------------------------------------------ */

function PanelHarness(props: {
  notifications: Notification[]
  isLoading?: boolean
  unreadCount?: number
}) {
  const {
    notifications,
    isLoading = false,
    unreadCount = notifications.filter((n) => !n.is_read).length,
  } = props

  return (
    <div className="flex h-screen items-center justify-center bg-concrete-black">
      <SidePanel side="right" title="NOTIFICATIONS" open={true} onOpenChange={fn()}>
        <NotificationPanel
          notifications={notifications}
          isLoading={isLoading}
          unreadCount={unreadCount}
          onMarkRead={fn()}
          onRevertMarkRead={fn()}
          onMarkAllRead={fn()}
          onRestore={fn()}
          onNavigate={fn()}
        />
      </SidePanel>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Meta                                                                 */
/* ------------------------------------------------------------------ */

const meta = {
  title: 'Notifications/NotificationPanel',
  component: NotificationPanel,
  tags: ['autodocs'],
  args: {
    notifications: MIXED,
    isLoading: false,
    unreadCount: MIXED.filter((n) => !n.is_read).length,
    onMarkRead: fn(),
    onRevertMarkRead: fn(),
    onMarkAllRead: fn(),
    onRestore: fn(),
    onNavigate: fn(),
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof NotificationPanel>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Stories                                                              */
/* ------------------------------------------------------------------ */

export const Default: Story = {
  render: () => <PanelHarness notifications={MIXED} />,
}

export const AllUnread: Story = {
  render: () => <PanelHarness notifications={ALL_UNREAD} />,
}

export const AllRead: Story = {
  render: () => <PanelHarness notifications={ALL_READ} />,
}

export const Empty: Story = {
  render: () => <PanelHarness notifications={[]} />,
}

export const Loading: Story = {
  render: () => <PanelHarness notifications={[]} isLoading={true} />,
}
