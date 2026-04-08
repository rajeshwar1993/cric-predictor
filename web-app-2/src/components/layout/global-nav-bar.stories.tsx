import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { NotificationBell } from '@/components/layout/notification-bell'
import { UserMenu } from '@/components/layout/user-menu'
import type { NotificationData } from '@/components/layout/notification-item'

/**
 * Preview wrapper that renders the nav bar client pieces with mock data,
 * since the real GlobalNavBar is a server component that fetches from Supabase.
 */
function NavBarPreview({
  displayName = 'Rajesh Rudra',
  email = 'rajesh@example.com',
  userId = 'user-1',
  notifications = [],
}: {
  displayName?: string
  email?: string
  userId?: string
  notifications?: NotificationData[]
}) {
  const unreadCount = notifications.filter((n) => !n.isRead).length
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 flex h-[56px] items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-base)]/80 px-[var(--sp-5)] backdrop-blur-[12px]"
      role="banner"
    >
      <Link href="/dashboard" aria-label="Go to dashboard">
        <Logo size="sm" />
      </Link>

      <div className="flex items-center gap-1">
        <NotificationBell
          userId={userId}
          initialNotifications={notifications}
          initialUnreadCount={unreadCount}
        />
        <UserMenu displayName={displayName} email={email} />
      </div>
    </header>
  )
}

const meta = {
  title: 'Layout/GlobalNavBar',
  component: NavBarPreview,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof NavBarPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    displayName: 'Rajesh Rudra',
    email: 'rajesh@example.com',
    userId: 'user-1',
    notifications: [],
  },
}

export const WithUnreadNotifications: Story = {
  args: {
    displayName: 'Rajesh Rudra',
    email: 'rajesh@example.com',
    userId: 'user-1',
    notifications: [
      {
        id: '1',
        type: 'join_request',
        message: 'Someone requested to join your gang.',
        gangId: 'gang-1',
        fixtureId: null,
        isRead: false,
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        type: 'deadline_reminder',
        message: 'Predictions close in 1 hour for CSK vs MI',
        gangId: 'gang-1',
        fixtureId: 'fixture-1',
        isRead: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      {
        id: '3',
        type: 'results_available',
        message: 'Results are in for RCB vs DC. Check the leaderboard!',
        gangId: 'gang-1',
        fixtureId: 'fixture-2',
        isRead: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
}
