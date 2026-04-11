import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import type { Notification, NotificationType } from '@/types'

import { NotificationItem } from './notification-item'

/* ------------------------------------------------------------------ */
/* Fixture helpers                                                      */
/* ------------------------------------------------------------------ */

const NOW = Date.parse('2026-04-10T12:00:00Z')

function minsAgo(mins: number): string {
  return new Date(NOW - mins * 60 * 1000).toISOString()
}

function makeNotification(
  type: NotificationType,
  message: string,
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: `notif-${type}`,
    user_id: 'user-1',
    type,
    message,
    gang_id: 'gang-1',
    fixture_id: null,
    is_read: false,
    created_at: minsAgo(5),
    ...overrides,
  }
}

/* ------------------------------------------------------------------ */
/* Wrapper                                                              */
/* ------------------------------------------------------------------ */

function ItemHarness({ notification }: { notification: Notification }) {
  return (
    <div className="min-w-[320px] max-w-[380px] bg-dark-concrete">
      <NotificationItem
        notification={notification}
        onNavigate={fn()}
        onMarkRead={fn()}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Meta                                                                 */
/* ------------------------------------------------------------------ */

const meta = {
  title: 'Notifications/NotificationItem',
  component: NotificationItem,
  tags: ['autodocs'],
  args: {
    notification: makeNotification('new_member', 'Virat K joined Street Legends.'),
    onNavigate: fn(),
    onMarkRead: fn(),
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-[200px] items-center justify-center bg-concrete-black p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NotificationItem>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Generic unread/read variants                                         */
/* ------------------------------------------------------------------ */

export const Unread: Story = {
  render: () => (
    <ItemHarness
      notification={makeNotification(
        'new_member',
        'Virat K joined Street Legends.',
      )}
    />
  ),
}

export const Read: Story = {
  render: () => (
    <ItemHarness
      notification={makeNotification(
        'new_member',
        'Virat K joined Street Legends.',
        { is_read: true },
      )}
    />
  ),
}

/* ------------------------------------------------------------------ */
/* One story per notification type                                      */
/* ------------------------------------------------------------------ */

export const JoinRequest: Story = {
  render: () => (
    <ItemHarness
      notification={makeNotification(
        'join_request',
        'Rohit S wants to join Street Legends.',
      )}
    />
  ),
}

export const JoinApproved: Story = {
  render: () => (
    <ItemHarness
      notification={makeNotification(
        'join_approved',
        'Your request to join Street Legends was approved!',
      )}
    />
  ),
}

export const JoinRejected: Story = {
  render: () => (
    <ItemHarness
      notification={makeNotification(
        'join_rejected',
        'Your request to join Street Legends was declined.',
      )}
    />
  ),
}

export const NewMember: Story = {
  render: () => (
    <ItemHarness
      notification={makeNotification(
        'new_member',
        'Virat K joined Street Legends.',
      )}
    />
  ),
}

export const DeadlineReminder: Story = {
  render: () => (
    <ItemHarness
      notification={makeNotification(
        'deadline_reminder',
        'MI vs CSK starts in 15 minutes. Lock in your picks!',
        { fixture_id: 'fx-1' },
      )}
    />
  ),
}

export const ResultsAvailable: Story = {
  render: () => (
    <ItemHarness
      notification={makeNotification(
        'results_available',
        'Match results for RCB vs GT are in. See how you did.',
        { fixture_id: 'fx-2' },
      )}
    />
  ),
}

export const GangDeleted: Story = {
  render: () => (
    <ItemHarness
      notification={makeNotification(
        'gang_deleted',
        'Street Legends was deleted by the admin.',
        { gang_id: null },
      )}
    />
  ),
}

export const AdminPromoted: Story = {
  render: () => (
    <ItemHarness
      notification={makeNotification(
        'admin_promoted',
        'You are now an admin of Street Legends.',
      )}
    />
  ),
}
