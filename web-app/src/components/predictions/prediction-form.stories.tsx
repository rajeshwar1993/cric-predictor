import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { FixtureTeam } from '@/lib/dal/fixtures'
import type { MatchPlayer } from '@/lib/dal/predictions'
import type { ScenarioGroupData } from './scenario-list'
import { PredictionForm } from './prediction-form'

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
      description: 'The big one - pick the winning team',
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

const TOTAL_SCENARIOS = ALL_GROUPS.reduce(
  (sum, g) => sum + g.scenarios.length,
  0,
)

// Pre-populated predictions covering roughly half the scenarios
const PARTIAL_PREDICTIONS: Record<string, string> = {
  's-toss-winner': MOCK_HOME_TEAM.id,
  's-mi-pp-runs': '40-49',
  's-fifty': 'Yes',
  's-match-winner': MOCK_AWAY_TEAM.id,
}

// All scenarios filled
const FULL_PREDICTIONS: Record<string, string> = {
  's-toss-winner': MOCK_HOME_TEAM.id,
  's-mi-pp-runs': '40-49',
  's-csk-pp-runs': '50-59',
  's-fifty': 'Yes',
  's-first-wicket-over': '4-6',
  's-match-winner': MOCK_AWAY_TEAM.id,
  's-total-runs': '320-359',
  's-potm': 'p5',
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Predictions/PredictionForm',
  component: PredictionForm,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    gangId: 'gang-123',
    fixtureId: 'fixture-456',
    groups: ALL_GROUPS,
    homeTeam: MOCK_HOME_TEAM,
    awayTeam: MOCK_AWAY_TEAM,
    players: MOCK_PLAYERS,
    initialPredictions: {},
    lastSubmittedAt: null,
    totalScenarios: TOTAL_SCENARIOS,
  },
} satisfies Meta<typeof PredictionForm>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Empty — no picks yet, submit button disabled. */
export const Empty: Story = {}

/** Partially filled — some picks made, submit button enabled. */
export const PartiallyFilled: Story = {
  args: {
    initialPredictions: PARTIAL_PREDICTIONS,
  },
}

/** Fully filled — all picks made. */
export const FullyFilled: Story = {
  args: {
    initialPredictions: FULL_PREDICTIONS,
  },
}

/** With existing predictions — pre-populated from previous submit, shows last submitted time. */
export const WithExistingPredictions: Story = {
  args: {
    initialPredictions: FULL_PREDICTIONS,
    lastSubmittedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
}

// NOTE: Submitting/loading state is internal to PredictionForm (isSubmitting).
// It cannot be driven via story args. Loading state coverage is provided by
// SubmitBar stories (see submit-bar.stories.tsx).
