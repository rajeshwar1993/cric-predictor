import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Link from 'next/link'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { UserMenu } from './user-menu'

/**
 * Presentational wrapper that mirrors the NavBar Server Component layout.
 *
 * NavBar itself is an async Server Component and cannot be rendered directly
 * in Storybook. This wrapper reproduces the identical markup with mock data.
 */
function NavBarPresentation({
  displayName,
  email,
  unreadCount,
}: {
  displayName: string
  email: string
  unreadCount: number
}) {
  return (
    <nav
      className="sticky top-0 z-50 flex h-14 items-center justify-between border-b-2 border-dark-concrete bg-concrete-black px-4"
      aria-label="Primary"
    >
      <Link
        href="/dashboard"
        className="font-display text-lg font-bold uppercase tracking-tight text-text-primary"
      >
        BRAGG
      </Link>

      <div className="flex items-center gap-3">
        <NotificationBell
          userId="user-123"
          initialUnreadCount={unreadCount}
          // Static Storybook sandbox — skip the realtime subscription so
          // the bell renders from `initialUnreadCount` without hitting
          // the network.
          enableRealtime={false}
        />
        <UserMenu displayName={displayName} email={email} />
      </div>
    </nav>
  )
}

const meta = {
  title: 'Layout/NavBar',
  component: NavBarPresentation,
  tags: ['autodocs'],
  args: {
    displayName: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    unreadCount: 3,
  },
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/dashboard',
      },
    },
  },
} satisfies Meta<typeof NavBarPresentation>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default                                                             */
/* ------------------------------------------------------------------ */

export const Default: Story = {}

/* ------------------------------------------------------------------ */
/* Long display name — truncation handling                             */
/* ------------------------------------------------------------------ */

export const LongDisplayName: Story = {
  args: {
    displayName: 'Chandrasekhara Venkata Raman Subramanian',
    email: 'chandrasekhara.venkata.raman.subramanian@longdomainname.com',
    unreadCount: 99,
  },
}
