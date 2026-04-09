import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { LeaderboardRow } from './leaderboard-row'

const meta = {
  title: 'Leaderboards/LeaderboardRow',
  component: LeaderboardRow,
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
} satisfies Meta<typeof LeaderboardRow>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Individual rank stories                                              */
/* ------------------------------------------------------------------ */

export const Rank1: Story = {
  args: {
    rank: 1,
    displayName: 'Rajesh K',
    score: 142,
    subtitle: '18/19 correct',
  },
}

export const Rank2: Story = {
  args: {
    rank: 2,
    displayName: 'Virat K',
    score: 138,
    subtitle: '17/19 correct',
  },
}

export const Rank3: Story = {
  args: {
    rank: 3,
    displayName: 'MS Dhoni',
    score: 126,
    subtitle: '15/19 correct',
  },
}

export const RegularRank: Story = {
  args: {
    rank: 5,
    displayName: 'Rohit Sharma',
    score: 98,
    subtitle: '12/19 correct',
  },
}

/* ------------------------------------------------------------------ */
/* State stories                                                        */
/* ------------------------------------------------------------------ */

export const CurrentUser: Story = {
  args: {
    rank: 4,
    displayName: 'You',
    score: 110,
    isCurrentUser: true,
    subtitle: '14/19 correct',
  },
}

export const DepartedMember: Story = {
  args: {
    rank: 7,
    displayName: 'Former Player',
    score: 45,
    isDeparted: true,
    subtitle: '6/19 correct',
  },
}

/* ------------------------------------------------------------------ */
/* Full leaderboard                                                     */
/* ------------------------------------------------------------------ */

export const FullLeaderboard: Story = {
  args: {
    rank: 1,
    displayName: 'Rajesh K',
    score: 142,
  },
  render: () => (
    <div className="flex flex-col">
      <LeaderboardRow
        rank={1}
        displayName="Rajesh K"
        score={142}
        subtitle="18/19 correct"
      />
      <LeaderboardRow
        rank={2}
        displayName="Virat K"
        score={138}
        subtitle="17/19 correct"
      />
      <LeaderboardRow
        rank={3}
        displayName="MS Dhoni"
        score={126}
        subtitle="15/19 correct"
      />
      <LeaderboardRow
        rank={4}
        displayName="Rohit S"
        score={110}
        isCurrentUser
        subtitle="14/19 correct"
      />
      <LeaderboardRow
        rank={5}
        displayName="Jasprit B"
        score={98}
        subtitle="12/19 correct"
      />
      <LeaderboardRow
        rank={6}
        displayName="KL Rahul"
        score={87}
        subtitle="10/19 correct"
      />
      <LeaderboardRow
        rank={7}
        displayName="Former Player"
        score={45}
        isDeparted
        subtitle="6/19 correct"
      />
      <LeaderboardRow
        rank={8}
        displayName="New Joiner"
        score={12}
        subtitle="2/19 correct"
      />
    </div>
  ),
}
