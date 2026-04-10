import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { LeaderboardCountdown } from './leaderboard-countdown'

const meta = {
  title: 'Leaderboards/LeaderboardCountdown',
  component: LeaderboardCountdown,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LeaderboardCountdown>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Stories                                                              */
/* ------------------------------------------------------------------ */

/** Countdown with several hours remaining */
export const Default: Story = {
  args: {
    deadline: new Date(Date.now() + 3 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
  },
}

/** Countdown with only minutes remaining */
export const MinutesRemaining: Story = {
  args: {
    deadline: new Date(Date.now() + 12 * 60 * 1000 + 30 * 1000).toISOString(),
  },
}

/** Countdown with only seconds remaining */
export const SecondsRemaining: Story = {
  args: {
    deadline: new Date(Date.now() + 45 * 1000).toISOString(),
  },
}

/**
 * Locked — deadline has passed. Shows "Predictions are now locked"
 * message with a refresh button. The `onExpire` callback fires once
 * when the countdown transitions from counting to expired.
 */
export const Locked: Story = {
  args: {
    deadline: new Date(Date.now() - 60 * 1000).toISOString(),
    onExpire: () => {
      // In production, this triggers router.refresh() via LeaderboardCountdownWithRefresh
    },
  },
}
