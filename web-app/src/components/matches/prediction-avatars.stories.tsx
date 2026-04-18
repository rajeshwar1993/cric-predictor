import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PredictionAvatars } from './prediction-avatars'
import type { PredictedMember } from '@/lib/dal/fixtures'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMember(name: string, index: number): PredictedMember {
  return { userId: `user-${index}`, displayName: name }
}

const SAMPLE_MEMBERS: PredictedMember[] = [
  makeMember('Rajesh Kumar', 1),
  makeMember('Virat Kohli', 2),
  makeMember('MS Dhoni', 3),
  makeMember('Rohit Sharma', 4),
  makeMember('Jasprit Bumrah', 5),
  makeMember('Rishabh Pant', 6),
  makeMember('KL Rahul', 7),
  makeMember('Hardik Pandya', 8),
  makeMember('Ravindra Jadeja', 9),
  makeMember('Suryakumar Yadav', 10),
  makeMember('Mohammed Shami', 11),
  makeMember('Shubman Gill', 12),
  makeMember('Shreyas Iyer', 13),
  makeMember('Ishan Kishan', 14),
  makeMember('Yuzvendra Chahal', 15),
]

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Matches/PredictionAvatars',
  component: PredictionAvatars,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '480px', width: '100%', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PredictionAvatars>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Empty members array — renders nothing. */
export const NoPredictions: Story = {
  args: {
    members: [],
  },
}

/** Single member prediction. */
export const OneMember: Story = {
  args: {
    members: SAMPLE_MEMBERS.slice(0, 1),
  },
}

/** Three members — no overflow. */
export const FewMembers: Story = {
  args: {
    members: SAMPLE_MEMBERS.slice(0, 3),
  },
}

/** Exactly maxVisible (4) members — no overflow pill. */
export const FullRow: Story = {
  args: {
    members: SAMPLE_MEMBERS.slice(0, 4),
  },
}

/** 6 members — shows 4 avatars + "+2" overflow pill. */
export const Overflow: Story = {
  args: {
    members: SAMPLE_MEMBERS.slice(0, 6),
  },
}

/** 15 members — shows 4 avatars + "+11" overflow pill. */
export const ManyOverflow: Story = {
  args: {
    members: SAMPLE_MEMBERS,
  },
}
