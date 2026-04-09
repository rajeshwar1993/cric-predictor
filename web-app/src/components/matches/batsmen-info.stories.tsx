import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { BatsmenInfo } from './batsmen-info'

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Matches/BatsmenInfo',
  component: BatsmenInfo,
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
} satisfies Meta<typeof BatsmenInfo>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Both batsmen at the crease with scores. */
export const BothBatsmen: Story = {
  args: {
    strikerName: 'MS Dhoni',
    strikerScore: '45(32)',
    nonStrikerName: 'Ravindra Jadeja',
    nonStrikerScore: '23(18)',
  },
}

/** Only the striker is available (non-striker data missing). */
export const OnlyStriker: Story = {
  args: {
    strikerName: 'Virat Kohli',
    strikerScore: '89(62)',
    nonStrikerName: null,
    nonStrikerScore: null,
  },
}

/** No batsman data — component renders nothing. */
export const NoData: Story = {
  args: {
    strikerName: null,
    strikerScore: null,
    nonStrikerName: null,
    nonStrikerScore: null,
  },
}
