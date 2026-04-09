import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { FixtureTeam } from '@/lib/dal/fixtures'
import type { MatchPlayer } from '@/lib/dal/predictions'
import type { ScenarioGroupData } from './scenario-list'
import { ScenarioList } from './scenario-list'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_HOME_TEAM: FixtureTeam = {
  id: 'team-mi-uuid',
  name: 'Mumbai Indians',
  code: 'MI',
  color: '#004BA0',
  logoUrl: null,
}

const MOCK_AWAY_TEAM: FixtureTeam = {
  id: 'team-csk-uuid',
  name: 'Chennai Super Kings',
  code: 'CSK',
  color: '#FFCB05',
  logoUrl: null,
}

const MOCK_HOME_PLAYERS: MatchPlayer[] = [
  { id: 'p1', name: 'Rohit Sharma', teamId: 'team-mi-uuid', role: 'batsman' },
  { id: 'p2', name: 'Jasprit Bumrah', teamId: 'team-mi-uuid', role: 'bowler' },
  { id: 'p3', name: 'Suryakumar Yadav', teamId: 'team-mi-uuid', role: 'batsman' },
]

const MOCK_AWAY_PLAYERS: MatchPlayer[] = [
  { id: 'p4', name: 'MS Dhoni', teamId: 'team-csk-uuid', role: 'wicket-keeper' },
  { id: 'p5', name: 'Ravindra Jadeja', teamId: 'team-csk-uuid', role: 'all-rounder' },
  { id: 'p6', name: 'Ruturaj Gaikwad', teamId: 'team-csk-uuid', role: 'batsman' },
]

const MOCK_PLAYERS = { home: MOCK_HOME_PLAYERS, away: MOCK_AWAY_PLAYERS }

// -- Scenario groups covering multiple phases and picker types ---------------

const TOSS_GROUP: ScenarioGroupData = {
  phase: 'toss',
  label: 'TOSS',
  scenarios: [
    {
      id: 's-toss-winner',
      title: 'Who will win the toss?',
      description: null,
      inputType: 'team_select',
      options: null,
      pointsWeight: 10,
    },
  ],
}

const POWERPLAY_GROUP: ScenarioGroupData = {
  phase: 'team_powerplay_end',
  label: 'POWERPLAY',
  scenarios: [
    {
      id: 's-mi-pp-runs',
      title: 'MI powerplay runs?',
      description: 'Predict Mumbai Indians powerplay score',
      inputType: 'number_range',
      options: ['<30', '30-39', '40-49', '50-59', '60+'],
      pointsWeight: 10,
    },
    {
      id: 's-csk-pp-runs',
      title: 'CSK powerplay runs?',
      description: 'Predict Chennai Super Kings powerplay score',
      inputType: 'number_range',
      options: ['<30', '30-39', '40-49', '50-59', '60+'],
      pointsWeight: 10,
    },
  ],
}

const MID_MATCH_GROUP: ScenarioGroupData = {
  phase: 'mid_match',
  label: 'DURING MATCH',
  scenarios: [
    {
      id: 's-fifty',
      title: 'Will there be a fifty scored?',
      description: null,
      inputType: 'yes_no',
      options: null,
      pointsWeight: 10,
    },
    {
      id: 's-first-wicket-over',
      title: 'First wicket in which over?',
      description: 'Predict the over when the first wicket falls',
      inputType: 'over_range',
      options: ['1-3', '4-6', '7-10', '11-15', '16-20'],
      pointsWeight: 15,
    },
  ],
}

const END_GROUP: ScenarioGroupData = {
  phase: 'end',
  label: 'MATCH END',
  scenarios: [
    {
      id: 's-match-winner',
      title: 'Who will win the match?',
      description: 'The big one — pick the winning team',
      inputType: 'team_select',
      options: null,
      pointsWeight: 25,
    },
    {
      id: 's-total-runs',
      title: 'Total match runs?',
      description: 'Predict the combined total of both innings',
      inputType: 'number_range',
      options: ['<280', '280-319', '320-359', '360-399', '400+'],
      pointsWeight: 15,
    },
  ],
}

const POST_MATCH_GROUP: ScenarioGroupData = {
  phase: 'post_match',
  label: 'POST MATCH',
  scenarios: [
    {
      id: 's-potm',
      title: 'Player of the match?',
      description: 'Select the player you think will be awarded POTM',
      inputType: 'player_select',
      options: null,
      pointsWeight: 20,
    },
  ],
}

const ALL_GROUPS: ScenarioGroupData[] = [
  TOSS_GROUP,
  POWERPLAY_GROUP,
  MID_MATCH_GROUP,
  END_GROUP,
  POST_MATCH_GROUP,
]

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Predictions/ScenarioList',
  component: ScenarioList,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '480px', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    groups: ALL_GROUPS,
    homeTeam: MOCK_HOME_TEAM,
    awayTeam: MOCK_AWAY_TEAM,
    players: MOCK_PLAYERS,
    initialPredictions: {},
    disabled: false,
  },
} satisfies Meta<typeof ScenarioList>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Default — multiple phase groups with mixed picker types, no existing predictions. */
export const Default: Story = {}

/** Pre-populated from previous submissions. */
export const WithExistingPredictions: Story = {
  args: {
    initialPredictions: {
      's-toss-winner': MOCK_HOME_TEAM.id,
      's-mi-pp-runs': '40-49',
      's-fifty': 'Yes',
      's-match-winner': MOCK_AWAY_TEAM.id,
      's-potm': 'p5',
    },
  },
}

/** Only one phase group rendered. */
export const SingleGroup: Story = {
  args: {
    groups: [END_GROUP],
  },
}

/** No scenarios to display. */
export const Empty: Story = {
  args: {
    groups: [],
  },
}

/** All inputs disabled (e.g., locked predictions). */
export const Disabled: Story = {
  args: {
    initialPredictions: {
      's-toss-winner': MOCK_HOME_TEAM.id,
      's-match-winner': MOCK_AWAY_TEAM.id,
    },
    disabled: true,
  },
}
