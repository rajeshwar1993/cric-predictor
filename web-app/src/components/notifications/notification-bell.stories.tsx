import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { NotificationBell } from './notification-bell'

const meta = {
  title: 'Notifications/NotificationBell',
  component: NotificationBell,
  tags: ['autodocs'],
  args: {
    userId: 'user-123',
    initialUnreadCount: 0,
  },
  decorators: [
    (Story) => (
      <div className="flex h-16 items-center justify-center bg-concrete-black px-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NotificationBell>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* No unread notifications                                             */
/* ------------------------------------------------------------------ */

export const NoUnread: Story = {
  args: {
    initialUnreadCount: 0,
  },
}

/* ------------------------------------------------------------------ */
/* With unread count: 3                                                */
/* ------------------------------------------------------------------ */

export const WithUnread3: Story = {
  args: {
    initialUnreadCount: 3,
  },
}

/* ------------------------------------------------------------------ */
/* With unread count: 9                                                */
/* ------------------------------------------------------------------ */

export const WithUnread9: Story = {
  args: {
    initialUnreadCount: 9,
  },
}

/* ------------------------------------------------------------------ */
/* With unread count: 99+ (over 99)                                    */
/* ------------------------------------------------------------------ */

export const WithUnread99Plus: Story = {
  args: {
    initialUnreadCount: 150,
  },
}
