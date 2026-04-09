import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { MatchDeadline } from './match-deadline'

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Matches/MatchDeadline',
  component: MatchDeadline,
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
} satisfies Meta<typeof MatchDeadline>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Prediction window opens at a future time. */
export const OpensAt: Story = {
  args: {
    deadline: new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate() + 1,
      7, 30, 0,
    ).toISOString(),
    label: 'Opens at',
    className: 'text-caption text-text-muted',
  },
}

/** Prediction window closes at a future time. */
export const ClosesAt: Story = {
  args: {
    deadline: new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate(),
      18, 45, 0,
    ).toISOString(),
    label: 'Closes at',
    className: 'text-caption text-text-muted',
  },
}
