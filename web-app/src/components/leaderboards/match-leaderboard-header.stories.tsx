import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { MatchLeaderboardHeader } from './match-leaderboard-header'
import type { FixtureWithTeams } from '@/lib/dal/fixtures'

const meta = {
  title: 'Leaderboards/MatchLeaderboardHeader',
  component: MatchLeaderboardHeader,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MatchLeaderboardHeader>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const baseFixture: FixtureWithTeams = {
  id: 'fixture-1',
  leagueId: 'league-1',
  seasonId: 'season-1',
  matchNumber: 12,
  startDatetime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  venueName: 'Wankhede Stadium, Mumbai',
  status: 'upcoming',
  homeTeam: {
    id: 'team-mi',
    name: 'Mumbai Indians',
    code: 'MI',
    color: '#004BA0',
    logoUrl: 'https://placehold.co/56x56/004BA0/fff?text=MI',
  },
  awayTeam: {
    id: 'team-csk',
    name: 'Chennai Super Kings',
    code: 'CSK',
    color: '#FDB913',
    logoUrl: 'https://placehold.co/56x56/FDB913/000?text=CSK',
  },
}

const liveFixture: FixtureWithTeams = {
  ...baseFixture,
  status: 'live',
  startDatetime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
}

const noLogoFixture: FixtureWithTeams = {
  ...baseFixture,
  homeTeam: {
    ...baseFixture.homeTeam,
    logoUrl: null,
  },
  awayTeam: {
    ...baseFixture.awayTeam,
    logoUrl: null,
  },
}

/* ------------------------------------------------------------------ */
/* Stories                                                              */
/* ------------------------------------------------------------------ */

/** Default — upcoming match with team logos */
export const Default: Story = {
  args: {
    fixture: baseFixture,
    isLive: false,
  },
}

/** Live match — shows LIVE badge with pulse indicator */
export const Live: Story = {
  args: {
    fixture: liveFixture,
    isLive: true,
  },
}

/** No logos — fallback team badge rendering with team code and color */
export const NoLogos: Story = {
  args: {
    fixture: noLogoFixture,
    isLive: false,
  },
}

/** Custom season label */
export const CustomSeasonLabel: Story = {
  args: {
    fixture: baseFixture,
    isLive: false,
    seasonLabel: 'IPL 2027',
  },
}
