import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { StaleDataBadge } from './stale-data-badge'

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Matches/StaleDataBadge',
  component: StaleDataBadge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '24px', background: '#1A1A1A', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StaleDataBadge>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Data polled 1 minute ago. */
export const OneMinuteAgo: Story = {
  args: {
    lastPolledAt: new Date(Date.now() - 1 * 60_000).toISOString(),
  },
}

/** Data polled 5 minutes ago. */
export const FiveMinutesAgo: Story = {
  args: {
    lastPolledAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
}

/** Data polled 10 minutes ago — significantly stale. */
export const TenMinutesAgo: Story = {
  args: {
    lastPolledAt: new Date(Date.now() - 10 * 60_000).toISOString(),
  },
}
