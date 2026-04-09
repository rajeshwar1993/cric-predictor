import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Last6Balls } from './last-6-balls'

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Matches/Last6Balls',
  component: Last6Balls,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '480px', width: '100%', padding: '24px', background: '#1A1A1A', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Last6Balls>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Mixed over with all ball types: single, four, wicket, dot, six, double. */
export const Mixed: Story = {
  args: {
    balls: '1 4 W 0 6 2',
  },
}

/** All dot balls — defensive over. */
export const AllDots: Story = {
  args: {
    balls: '0 0 0 0 0 0',
  },
}

/** Big over with multiple boundaries. */
export const BigOver: Story = {
  args: {
    balls: '4 6 6 4 1 6',
  },
}

/** Wicket-heavy over. */
export const WicketHeavy: Story = {
  args: {
    balls: 'W 0 W 1 0 W',
  },
}

/** Single ball remaining data. */
export const SingleBall: Story = {
  args: {
    balls: '6',
  },
}
