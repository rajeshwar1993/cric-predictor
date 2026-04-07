import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { EmptyState } from '@/components/ui/empty-state'
import { UpcomingMatchCard } from './upcoming-match-card'
import { Calendar } from 'lucide-react'

/**
 * UpcomingMatchesSection is an async server component that cannot be rendered
 * directly in Storybook. Instead, we compose the same visual output using the
 * client sub-components so all states are testable.
 */

function UpcomingMatchesSectionStory({
  matches,
  gangId,
}: {
  matches: Array<{
    fixtureId: string
    matchNumber: number
    homeTeamCode: string
    awayTeamCode: string
    startDatetime: string
    venueName: string
    status: 'upcoming' | 'live'
    predictionDeadlineMins: number
  }>
  gangId: string
}) {
  return (
    <section aria-label="Upcoming matches" className="flex flex-col gap-[var(--sp-3)]">
      <h2 className="font-heading text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        Upcoming Matches
      </h2>

      {matches.length === 0 ? (
        <EmptyState
          icon={<Calendar size={32} strokeWidth={1.5} />}
          title="No matches on the horizon"
          description="Sit tight"
        />
      ) : (
        <div className="flex flex-col gap-[var(--sp-3)]">
          {matches.map((match) => (
            <UpcomingMatchCard key={match.fixtureId} match={match} gangId={gangId} />
          ))}
        </div>
      )}
    </section>
  )
}

const meta = {
  title: 'Matches/UpcomingMatchesSection',
  component: UpcomingMatchesSectionStory,
  parameters: {
    layout: 'padded',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480, padding: 'var(--sp-5)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UpcomingMatchesSectionStory>

export default meta
type Story = StoryObj<typeof meta>

const futureDate1 = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
const futureDate2 = new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString()
const futureDate3 = new Date(Date.now() + 54 * 60 * 60 * 1000).toISOString()

export const WithMatches: Story = {
  args: {
    gangId: 'gang-1',
    matches: [
      {
        fixtureId: 'fixture-1',
        matchNumber: 12,
        homeTeamCode: 'CSK',
        awayTeamCode: 'MI',
        startDatetime: futureDate1,
        venueName: 'M. A. Chidambaram Stadium, Chennai',
        status: 'upcoming',
        predictionDeadlineMins: 45,
      },
      {
        fixtureId: 'fixture-2',
        matchNumber: 13,
        homeTeamCode: 'RCB',
        awayTeamCode: 'KKR',
        startDatetime: futureDate2,
        venueName: 'M. Chinnaswamy Stadium, Bengaluru',
        status: 'upcoming',
        predictionDeadlineMins: 45,
      },
      {
        fixtureId: 'fixture-3',
        matchNumber: 14,
        homeTeamCode: 'DC',
        awayTeamCode: 'SRH',
        startDatetime: futureDate3,
        venueName: 'Arun Jaitley Stadium, Delhi',
        status: 'upcoming',
        predictionDeadlineMins: 45,
      },
    ],
  },
}

export const WithLiveMatch: Story = {
  args: {
    gangId: 'gang-1',
    matches: [
      {
        fixtureId: 'fixture-1',
        matchNumber: 11,
        homeTeamCode: 'RCB',
        awayTeamCode: 'KKR',
        startDatetime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        venueName: 'M. Chinnaswamy Stadium, Bengaluru',
        status: 'live',
        predictionDeadlineMins: 45,
      },
      {
        fixtureId: 'fixture-2',
        matchNumber: 12,
        homeTeamCode: 'CSK',
        awayTeamCode: 'MI',
        startDatetime: futureDate1,
        venueName: 'M. A. Chidambaram Stadium, Chennai',
        status: 'upcoming',
        predictionDeadlineMins: 45,
      },
      {
        fixtureId: 'fixture-3',
        matchNumber: 13,
        homeTeamCode: 'DC',
        awayTeamCode: 'SRH',
        startDatetime: futureDate2,
        venueName: 'Arun Jaitley Stadium, Delhi',
        status: 'upcoming',
        predictionDeadlineMins: 45,
      },
    ],
  },
}

export const EmptyStateStory: Story = {
  name: 'Empty State',
  args: {
    gangId: 'gang-1',
    matches: [],
  },
}

export const SingleMatch: Story = {
  args: {
    gangId: 'gang-1',
    matches: [
      {
        fixtureId: 'fixture-1',
        matchNumber: 1,
        homeTeamCode: 'GT',
        awayTeamCode: 'PBKS',
        startDatetime: futureDate1,
        venueName: 'Narendra Modi Stadium, Ahmedabad',
        status: 'upcoming',
        predictionDeadlineMins: 45,
      },
    ],
  },
}
