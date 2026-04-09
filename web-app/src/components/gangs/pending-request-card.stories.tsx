import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import { PendingRequestCard } from './pending-request-card'

const meta = {
  title: 'Gangs/PendingRequestCard',
  component: PendingRequestCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    gangId: 'gang-001',
    userId: 'user-001',
    displayName: 'Rohit',
    requestedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3h ago
    onApprove: fn().mockResolvedValue({ success: true }),
    onReject: fn().mockResolvedValue({ success: true }),
  },
} satisfies Meta<typeof PendingRequestCard>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — single pending request card                               */
/* ------------------------------------------------------------------ */

export const Default: Story = {}

/* ------------------------------------------------------------------ */
/* NullDisplayName — fallback to "Unknown"                             */
/* ------------------------------------------------------------------ */

export const NullDisplayName: Story = {
  args: {
    displayName: null,
  },
}

/* ------------------------------------------------------------------ */
/* ApproveLoading — approve button in loading state                    */
/* ------------------------------------------------------------------ */

export const ApproveLoading: Story = {
  args: {
    onApprove: fn().mockImplementation(
      () => new Promise(() => {}), // never resolves — keeps spinner visible
    ),
  },
}

/* ------------------------------------------------------------------ */
/* RejectLoading — reject button in loading state                      */
/* ------------------------------------------------------------------ */

export const RejectLoading: Story = {
  args: {
    onReject: fn().mockImplementation(
      () => new Promise(() => {}), // never resolves — keeps spinner visible
    ),
  },
}

/* ------------------------------------------------------------------ */
/* RecentRequest — "Just now" timestamp                                */
/* ------------------------------------------------------------------ */

export const RecentRequest: Story = {
  args: {
    requestedAt: new Date().toISOString(),
  },
}

/* ------------------------------------------------------------------ */
/* OldRequest — "5d ago" timestamp                                     */
/* ------------------------------------------------------------------ */

export const OldRequest: Story = {
  args: {
    requestedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
}
