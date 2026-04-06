import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { NotificationBell } from '@/components/layout/notification-bell'
import { UserMenu } from '@/components/layout/user-menu'

/**
 * Preview wrapper that renders the nav bar client pieces with mock data,
 * since the real GlobalNavBar is a server component that fetches from Supabase.
 */
function NavBarPreview({
  displayName = 'Rajesh Rudra',
  email = 'rajesh@example.com',
  unreadCount = 0,
}: {
  displayName?: string
  email?: string
  unreadCount?: number
}) {
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 flex h-[56px] items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-base)]/80 px-[var(--sp-5)] backdrop-blur-[12px]"
      role="banner"
    >
      <Link href="/dashboard" aria-label="Go to dashboard">
        <Logo size="sm" />
      </Link>

      <div className="flex items-center gap-1">
        <NotificationBell unreadCount={unreadCount} />
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
    unreadCount: 0,
  },
}

export const WithUnreadNotifications: Story = {
  args: {
    displayName: 'Rajesh Rudra',
    email: 'rajesh@example.com',
    unreadCount: 12,
  },
}
