import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LiveScorecard, type LiveScoreData, type TeamInfo } from './live-scorecard'

/**
 * LiveMatchesSection is an async server component that cannot be rendered
 * directly in Storybook. Instead, we compose the same visual output using
 * the client sub-components so all states are testable.
 */

interface LiveFixtureStory {
  fixtureId: string
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  initialScoreData: LiveScoreData | null
}

function LiveMatchesSectionStory({
  gangId,
  fixtures,
}: {
  gangId: string
  fixtures: LiveFixtureStory[]
}) {
  if (fixtures.length === 0) {
    return null
  }

  return (
    <section aria-label="Live matches" className="flex flex-col gap-[var(--sp-3)]">
      <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
        Live Matches
      </h2>

      <div className="flex flex-col gap-[var(--sp-3)]">
        {fixtures.map((fixture) => (
          <div key={fixture.fixtureId} className="flex flex-col gap-[var(--sp-2)]">
            <LiveScorecard
              fixtureId={fixture.fixtureId}
              initialScoreData={fixture.initialScoreData}
              homeTeam={fixture.homeTeam}
              awayTeam={fixture.awayTeam}
            />
            <Link href={`/group/${gangId}/match/${fixture.fixtureId}`} tabIndex={-1}>
              <Button
                variant="secondary"
                className="w-full"
                aria-label={`View match leaderboard for ${fixture.homeTeam.code} vs ${fixture.awayTeam.code}`}
              >
                View Match Leaderboard
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}

const meta = {
  title: 'Matches/LiveMatchesSection',
  component: LiveMatchesSectionStory,
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
} satisfies Meta<typeof LiveMatchesSectionStory>

export default meta
type Story = StoryObj<typeof meta>

const fullScoreData: LiveScoreData = {
  homeTeamScore: '185/4',
  awayTeamScore: '92/3',
  homeTeamOvers: 20,
  awayTeamOvers: 10.3,
  battingTeamId: 'team-away-1',
  currentRunRate: 8.76,
  last6Balls: '1,4,W,0,6,2',
  strikerName: 'R Sharma',
  strikerScore: '42 (28)',
  nonStrikerName: 'S Iyer',
  nonStrikerScore: '18 (15)',
  currentBowler: 'D Chahar 2-0-18-1',
  currentPartnership: '38 (24)',
  lastPolledAt: new Date().toISOString(),
}

export const SingleLiveMatch: Story = {
  args: {
    gangId: 'gang-1',
    fixtures: [
      {
        fixtureId: 'fixture-1',
        homeTeam: { teamId: 'team-home-1', code: 'CSK', name: 'Chennai Super Kings' },
        awayTeam: { teamId: 'team-away-1', code: 'MI', name: 'Mumbai Indians' },
        initialScoreData: fullScoreData,
      },
    ],
  },
}

export const DoubleHeader: Story = {
  args: {
    gangId: 'gang-1',
    fixtures: [
      {
        fixtureId: 'fixture-1',
        homeTeam: { teamId: 'team-home-1', code: 'CSK', name: 'Chennai Super Kings' },
        awayTeam: { teamId: 'team-away-1', code: 'MI', name: 'Mumbai Indians' },
        initialScoreData: fullScoreData,
      },
      {
        fixtureId: 'fixture-2',
        homeTeam: { teamId: 'team-home-2', code: 'RCB', name: 'Royal Challengers Bengaluru' },
        awayTeam: { teamId: 'team-away-2', code: 'KKR', name: 'Kolkata Knight Riders' },
        initialScoreData: {
          homeTeamScore: '45/1',
          awayTeamScore: null,
          homeTeamOvers: 5.2,
          awayTeamOvers: null,
          battingTeamId: 'team-home-2',
          currentRunRate: 8.49,
          last6Balls: '0,1,4,0,2,1',
          strikerName: 'V Kohli',
          strikerScore: '28 (19)',
          nonStrikerName: 'F du Plessis',
          nonStrikerScore: '15 (13)',
          currentBowler: 'S Narine 1-0-8-0',
          currentPartnership: '32 (21)',
          lastPolledAt: new Date().toISOString(),
        },
      },
    ],
  },
}

export const EmptyNoFixtures: Story = {
  name: 'No Live Fixtures (Hidden)',
  args: {
    gangId: 'gang-1',
    fixtures: [],
  },
}
