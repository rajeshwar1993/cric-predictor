import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { UpcomingMatchCard } from './upcoming-match-card'

const meta = {
  title: 'Matches/UpcomingMatchCard',
  component: UpcomingMatchCard,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 400, padding: 'var(--sp-4)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UpcomingMatchCard>

export default meta
type Story = StoryObj<typeof meta>

const futureDate = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
const soonDate = new Date(Date.now() + 90 * 60 * 1000).toISOString()
const farFutureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

export const Default: Story = {
  args: {
    gangId: 'gang-1',
    match: {
      fixtureId: 'fixture-1',
      matchNumber: 12,
      homeTeamCode: 'CSK',
      awayTeamCode: 'MI',
      startDatetime: futureDate,
      venueName: 'M. A. Chidambaram Stadium, Chennai',
      status: 'upcoming',
      predictionDeadlineMins: 45,
    },
  },
}

export const LiveMatch: Story = {
  args: {
    gangId: 'gang-1',
    match: {
      fixtureId: 'fixture-2',
      matchNumber: 11,
      homeTeamCode: 'RCB',
      awayTeamCode: 'KKR',
      startDatetime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      venueName: 'M. Chinnaswamy Stadium, Bengaluru',
      status: 'live',
      predictionDeadlineMins: 45,
    },
  },
}

export const UrgentDeadline: Story = {
  args: {
    gangId: 'gang-1',
    match: {
      fixtureId: 'fixture-3',
      matchNumber: 13,
      homeTeamCode: 'DC',
      awayTeamCode: 'SRH',
      startDatetime: soonDate,
      venueName: 'Arun Jaitley Stadium, Delhi',
      status: 'upcoming',
      predictionDeadlineMins: 45,
    },
  },
}

export const FarFutureMatch: Story = {
  args: {
    gangId: 'gang-1',
    match: {
      fixtureId: 'fixture-4',
      matchNumber: 25,
      homeTeamCode: 'PBKS',
      awayTeamCode: 'GT',
      startDatetime: farFutureDate,
      venueName: 'IS Bindra Stadium, Mohali',
      status: 'upcoming',
      predictionDeadlineMins: 45,
    },
  },
}
