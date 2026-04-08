import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import { NotificationItem, type NotificationData } from './notification-item'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const baseNotification: NotificationData = {
  id: '1',
  type: 'join_request',
  message: 'Someone requested to join your gang.',
  gangId: 'gang-1',
  fixtureId: null,
  isRead: false,
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Layout/NotificationItem',
  component: NotificationItem,
  tags: ['autodocs'],
  args: {
    onRead: fn(),
    onClose: fn(),
  },
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[320px] bg-[var(--bg-raised)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NotificationItem>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const Unread: Story = {
  args: {
    notification: baseNotification,
  },
}

export const Read: Story = {
  args: {
    notification: {
      ...baseNotification,
      isRead: true,
    },
  },
}

export const JoinApproved: Story = {
  args: {
    notification: {
      ...baseNotification,
      id: '2',
      type: 'join_approved',
      message: 'Your request to join the gang was approved.',
      isRead: false,
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30m ago
    },
  },
}

export const JoinRejected: Story = {
  args: {
    notification: {
      ...baseNotification,
      id: '3',
      type: 'join_rejected',
      message: 'Your request to join the gang was rejected.',
      gangId: 'gang-1',
      isRead: false,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3d ago
    },
  },
}

export const DeadlineReminder: Story = {
  args: {
    notification: {
      ...baseNotification,
      id: '4',
      type: 'deadline_reminder',
      message: 'Predictions close in 1 hour for CSK vs MI',
      gangId: 'gang-1',
      fixtureId: 'fixture-1',
      isRead: false,
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5m ago
    },
  },
}

export const ResultsAvailable: Story = {
  args: {
    notification: {
      ...baseNotification,
      id: '5',
      type: 'results_available',
      message: 'Results are in for CSK vs MI. Check the leaderboard!',
      gangId: 'gang-1',
      fixtureId: 'fixture-1',
      isRead: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1d ago
    },
  },
}

export const NewMember: Story = {
  args: {
    notification: {
      ...baseNotification,
      id: '6',
      type: 'new_member',
      message: 'A new member joined your gang.',
      isRead: false,
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10m ago
    },
  },
}

export const GangDeleted: Story = {
  args: {
    notification: {
      ...baseNotification,
      id: '7',
      type: 'gang_deleted',
      message: 'A gang you were in has been deleted.',
      gangId: null,
      isRead: true,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1w ago
    },
  },
}

export const AdminPromoted: Story = {
  args: {
    notification: {
      ...baseNotification,
      id: '8',
      type: 'admin_promoted',
      message: 'You have been promoted to admin of Cricket Legends.',
      gangId: 'gang-2',
      isRead: false,
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45m ago
    },
  },
}

export const JustNow: Story = {
  args: {
    notification: {
      ...baseNotification,
      id: '9',
      type: 'join_request',
      message: 'Someone requested to join your gang.',
      isRead: false,
      createdAt: new Date().toISOString(), // just now
    },
  },
}
