import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ProfileStats } from './profile-stats'

const meta = {
  title: 'Profile/ProfileStats',
  component: ProfileStats,
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
} satisfies Meta<typeof ProfileStats>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — typical mid-season stats                                   */
/* ------------------------------------------------------------------ */

export const Default: Story = {
  args: {
    stats: {
      gangsCount: 4,
      totalPredicted: 28,
      accuracy: 64,
      totalPoints: 132,
    },
  },
}

/* ------------------------------------------------------------------ */
/* NewUser — empty state, no predictions yet                            */
/* ------------------------------------------------------------------ */

export const NewUser: Story = {
  args: {
    stats: {
      gangsCount: 1,
      totalPredicted: 0,
      accuracy: 0,
      totalPoints: 0,
    },
  },
}

/* ------------------------------------------------------------------ */
/* HighAccuracy — showcase 85% accuracy                                 */
/* ------------------------------------------------------------------ */

export const HighAccuracy: Story = {
  args: {
    stats: {
      gangsCount: 6,
      totalPredicted: 40,
      accuracy: 85,
      totalPoints: 287,
    },
  },
}
