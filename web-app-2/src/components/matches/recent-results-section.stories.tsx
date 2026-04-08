import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { RecentResult } from '@/lib/actions/dal-matches'
import { ResultCard } from './result-card'

/**
 * RecentResultsSection is an async server component that cannot be rendered
 * directly in Storybook. Instead, we compose the same visual output using
 * the client sub-components so all states are testable.
 */

function RecentResultsSectionStory({
  gangId,
  results,
}: {
  gangId: string
  results: RecentResult[]
}) {
  if (results.length === 0) {
    return null
  }

  return (
    <section aria-label="Recent results" className="flex flex-col gap-[var(--sp-3)]">
      <h2 className="font-heading text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        Recent Results
      </h2>

      <div className="flex flex-col gap-[var(--sp-3)]">
        {results.map((result) => (
          <ResultCard key={result.fixtureId} result={result} gangId={gangId} />
        ))}
      </div>
    </section>
  )
}

const meta = {
  title: 'Matches/RecentResultsSection',
  component: RecentResultsSectionStory,
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
} satisfies Meta<typeof RecentResultsSectionStory>

export default meta
type Story = StoryObj<typeof meta>

const resolvedMatch: RecentResult = {
  fixtureId: 'fixture-1',
  matchNumber: 10,
  homeTeamCode: 'CSK',
  awayTeamCode: 'MI',
  startDatetime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'resolved',
  winnerName: 'Chennai Super Kings',
  winnerCode: 'CSK',
  homeScore: 185,
  awayScore: 162,
  userStats: {
    predictedCount: 15,
    correctCount: 9,
    pointsEarned: 42,
  },
  totalScenarios: 19,
}

const completedMatch: RecentResult = {
  fixtureId: 'fixture-2',
  matchNumber: 9,
  homeTeamCode: 'RCB',
  awayTeamCode: 'KKR',
  startDatetime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'completed',
  winnerName: null,
  winnerCode: null,
  homeScore: 178,
  awayScore: 180,
  userStats: {
    predictedCount: 19,
    correctCount: 0,
    pointsEarned: 0,
  },
  totalScenarios: 19,
}

const abandonedMatch: RecentResult = {
  fixtureId: 'fixture-3',
  matchNumber: 8,
  homeTeamCode: 'DC',
  awayTeamCode: 'SRH',
  startDatetime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'abandoned',
  winnerName: null,
  winnerCode: null,
  homeScore: null,
  awayScore: null,
  userStats: null,
  totalScenarios: 19,
}

export const Default: Story = {
  args: {
    gangId: 'gang-1',
    results: [resolvedMatch, completedMatch, abandonedMatch],
  },
}

export const AllResolved: Story = {
  args: {
    gangId: 'gang-1',
    results: [
      resolvedMatch,
      {
        ...resolvedMatch,
        fixtureId: 'fixture-4',
        matchNumber: 7,
        homeTeamCode: 'PBKS',
        awayTeamCode: 'GT',
        winnerName: 'Gujarat Titans',
        winnerCode: 'GT',
        homeScore: 155,
        awayScore: 156,
        userStats: { predictedCount: 18, correctCount: 12, pointsEarned: 56 },
      },
      {
        ...resolvedMatch,
        fixtureId: 'fixture-5',
        matchNumber: 6,
        homeTeamCode: 'LSG',
        awayTeamCode: 'RR',
        winnerName: 'Rajasthan Royals',
        winnerCode: 'RR',
        homeScore: 140,
        awayScore: 141,
        userStats: { predictedCount: 17, correctCount: 10, pointsEarned: 48 },
      },
    ],
  },
}

export const SingleResult: Story = {
  args: {
    gangId: 'gang-1',
    results: [resolvedMatch],
  },
}

export const EmptyNoResults: Story = {
  name: 'No Results (Hidden)',
  args: {
    gangId: 'gang-1',
    results: [],
  },
}
