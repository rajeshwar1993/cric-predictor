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
/* Three unread notifications                                          */
/* ------------------------------------------------------------------ */

export const ThreeUnread: Story = {
  args: {
    initialUnreadCount: 3,
  },
}

/* ------------------------------------------------------------------ */
/* 99+ unread notifications                                            */
/* ------------------------------------------------------------------ */

export const NinetyNinePlus: Story = {
  args: {
    initialUnreadCount: 150,
  },
}

/* ------------------------------------------------------------------ */
/* Pulsing — a new notification just arrived                            */
/*                                                                      */
/* The pulse animation is driven by a realtime INSERT event, which is   */
/* not available in a static Storybook sandbox. This story previews the  */
/* unread badge so designers can eyeball the idle treatment; the live   */
/* pulse is triggered at runtime by the `useNotifications` hook.        */
/* ------------------------------------------------------------------ */

export const PulsingNew: Story = {
  args: {
    initialUnreadCount: 1,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Pulse animation fires at runtime when a new notification arrives via the realtime subscription. Storybook shows the static badge preview.',
      },
    },
  },
}
