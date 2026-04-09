import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { MatchTime } from './match-time'

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Matches/MatchTime',
  component: MatchTime,
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
} satisfies Meta<typeof MatchTime>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Match happening today at 7:30 PM. */
export const Today: Story = {
  args: {
    datetime: new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate(),
      19, 30, 0,
    ).toISOString(),
    className: 'text-body-sm text-text-secondary',
  },
}

/** Match happening tomorrow at 3:30 PM. */
export const Tomorrow: Story = {
  args: {
    datetime: new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate() + 1,
      15, 30, 0,
    ).toISOString(),
    className: 'text-body-sm text-text-secondary',
  },
}

/** Match happening next week. */
export const NextWeek: Story = {
  args: {
    datetime: new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate() + 7,
      19, 30, 0,
    ).toISOString(),
    className: 'text-body-sm text-text-secondary',
  },
}
