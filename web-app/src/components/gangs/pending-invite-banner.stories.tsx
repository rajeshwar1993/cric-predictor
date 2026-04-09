import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PendingInviteBanner } from './pending-invite-banner'

const meta = {
  title: 'Gangs/PendingInviteBanner',
  component: PendingInviteBanner,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PendingInviteBanner>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default -- with invite data                                         */
/* ------------------------------------------------------------------ */

export const Default: Story = {
  args: {
    initialInvite: {
      code: 'XK42AB',
      gangName: 'Mumbai Mavericks',
      storedAt: Date.now(),
    },
  },
}

/* ------------------------------------------------------------------ */
/* Hidden -- no pending invite (renders null)                           */
/* ------------------------------------------------------------------ */

export const Hidden: Story = {
  args: {
    initialInvite: null,
  },
}
