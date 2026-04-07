import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PendingInviteBanner } from './pending-invite-banner'

const meta = {
  title: 'Gangs/PendingInviteBanner',
  component: PendingInviteBanner,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 440, padding: 'var(--sp-4)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PendingInviteBanner>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'With Invite',
  beforeEach: () => {
    localStorage.setItem(
      'bragg_pending_invite',
      JSON.stringify({
        code: 'ABC123',
        gangName: 'The Sixes',
        storedAt: Date.now(),
      }),
    )
    return () => {
      localStorage.removeItem('bragg_pending_invite')
    }
  },
}

export const MultiplePending: Story = {
  name: 'Multiple (single banner)',
  beforeEach: () => {
    localStorage.setItem(
      'bragg_pending_invite',
      JSON.stringify({
        code: 'XYZ789',
        gangName: 'Mumbai Mavericks',
        storedAt: Date.now(),
      }),
    )
    return () => {
      localStorage.removeItem('bragg_pending_invite')
    }
  },
}

export const Empty: Story = {
  name: 'No Invite',
  beforeEach: () => {
    localStorage.removeItem('bragg_pending_invite')
  },
}
