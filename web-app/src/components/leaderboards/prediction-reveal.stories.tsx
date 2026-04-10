import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PredictionReveal } from './prediction-reveal'
import type {
  MatchPredictionCell,
  MatchPredictionMember,
  MatchPredictionPhaseGroup,
  MatchPredictionScenario,
  MatchPredictionsDataset,
} from '@/lib/dal/predictions-shared'

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Leaderboards/PredictionReveal',
  component: PredictionReveal,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PredictionReveal>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Mock data builders
// ---------------------------------------------------------------------------

const CURRENT_USER_ID = 'user-you'

const TEAMS = {
  'team-mi': { code: 'MI', name: 'Mumbai Indians', color: '#004BA0' },
  'team-csk': { code: 'CSK', name: 'Chennai Super Kings', color: '#FDB913' },
  'team-rcb': { code: 'RCB', name: 'Royal Challengers Bengaluru', color: '#EC1C24' },
}

const PLAYERS = {
  'player-rohit': { name: 'Rohit Sharma' },
  'player-dhoni': { name: 'MS Dhoni' },
  'player-kohli': { name: 'Virat Kohli' },
}

function makeMember(
  userId: string,
  displayName: string,
  rank: number,
  overrides: Partial<MatchPredictionMember> = {},
): MatchPredictionMember {
  return {
    userId,
    displayName,
    avatarUrl: null,
    memberStatus: 'approved',
    rank,
    ...overrides,
  }
}

function makeScenario(
  id: string,
  title: string,
  overrides: Partial<MatchPredictionScenario> = {},
): MatchPredictionScenario {
  return {
    id,
    title,
    points: 10,
    inputType: 'team_select',
    correctAnswer: null,
    isResolved: false,
    isVoided: false,
    ...overrides,
  }
}

function makeCell(
  value: string,
  isCorrect: boolean | null,
  pointsEarned = 0,
): MatchPredictionCell {
  return { value, isCorrect, pointsEarned }
}

/**
 * Build a predictions map from a flat list of (scenarioId, userId, cell) tuples.
 */
function buildPredictionsMap(
  entries: Array<[string, string, MatchPredictionCell]>,
): Map<string, Map<string, MatchPredictionCell>> {
  const map = new Map<string, Map<string, MatchPredictionCell>>()
  for (const [scenarioId, userId, cell] of entries) {
    const inner = map.get(scenarioId) ?? new Map<string, MatchPredictionCell>()
    inner.set(userId, cell)
    map.set(scenarioId, inner)
  }
  return map
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FOUR_MEMBERS: MatchPredictionMember[] = [
  makeMember('user-1', 'Rajesh', 1),
  makeMember('user-2', 'Virat', 2),
  makeMember(CURRENT_USER_ID, 'You', 3),
  makeMember('user-3', 'Rohit', 4),
]

const EIGHT_MEMBERS: MatchPredictionMember[] = [
  makeMember('user-1', 'Rajesh', 1),
  makeMember('user-2', 'Virat', 2),
  makeMember('user-3', 'MS', 3),
  makeMember(CURRENT_USER_ID, 'You', 4),
  makeMember('user-4', 'Rohit', 5),
  makeMember('user-5', 'Jasprit', 6),
  makeMember('user-6', 'KL', 7),
  makeMember('user-7', 'Hardik', 8),
]

const SCENARIO_TOSS = makeScenario('s-toss', 'Who will win the toss?', {
  points: 10,
  inputType: 'team_select',
  correctAnswer: 'team-mi',
  isResolved: true,
})

const SCENARIO_TOSS_CHOICE = makeScenario('s-toss-2', 'Bat or bowl first?', {
  points: 5,
  inputType: 'yes_no',
  correctAnswer: 'yes',
  isResolved: true,
})

const SCENARIO_FIRST_WICKET = makeScenario(
  's-fw',
  'First wicket in which over?',
  {
    points: 15,
    inputType: 'over_range',
    correctAnswer: '3-4',
    isResolved: true,
  },
)

const SCENARIO_POWERPLAY = makeScenario('s-pp', 'Powerplay score?', {
  points: 15,
  inputType: 'number_range',
  correctAnswer: '60-79',
  isResolved: false,
})

const SCENARIO_MATCH_WINNER = makeScenario('s-mw', 'Match winner?', {
  points: 25,
  inputType: 'team_select',
  correctAnswer: null,
  isResolved: false,
})

const SCENARIO_MOTM = makeScenario('s-motm', 'Player of the match?', {
  points: 30,
  inputType: 'player_select',
  correctAnswer: null,
  isResolved: false,
})

// ---------------------------------------------------------------------------
// Story: FullyResolved — all scenarios resolved, mix of correct/incorrect
// ---------------------------------------------------------------------------

const fullyResolvedPhases: MatchPredictionPhaseGroup[] = [
  {
    phase: 'toss',
    label: 'TOSS',
    scenarios: [SCENARIO_TOSS, SCENARIO_TOSS_CHOICE],
  },
  {
    phase: 'first_wicket',
    label: 'FIRST WICKET',
    scenarios: [SCENARIO_FIRST_WICKET],
  },
  {
    phase: 'end',
    label: 'MATCH END',
    scenarios: [
      { ...SCENARIO_MATCH_WINNER, isResolved: true, correctAnswer: 'team-mi' },
    ],
  },
]

const fullyResolvedData: MatchPredictionsDataset = {
  members: FOUR_MEMBERS,
  phases: fullyResolvedPhases,
  predictionsByScenarioByUser: buildPredictionsMap([
    ['s-toss', 'user-1', makeCell('team-mi', true, 10)],
    ['s-toss', 'user-2', makeCell('team-csk', false, 0)],
    ['s-toss', CURRENT_USER_ID, makeCell('team-mi', true, 10)],
    ['s-toss', 'user-3', makeCell('team-csk', false, 0)],

    ['s-toss-2', 'user-1', makeCell('yes', true, 5)],
    ['s-toss-2', 'user-2', makeCell('yes', true, 5)],
    ['s-toss-2', CURRENT_USER_ID, makeCell('no', false, 0)],
    // user-3 did not predict

    ['s-fw', 'user-1', makeCell('3-4', true, 15)],
    ['s-fw', 'user-2', makeCell('5-6', false, 0)],
    ['s-fw', CURRENT_USER_ID, makeCell('3-4', true, 15)],
    ['s-fw', 'user-3', makeCell('1-2', false, 0)],

    ['s-mw', 'user-1', makeCell('team-mi', true, 25)],
    ['s-mw', 'user-2', makeCell('team-csk', false, 0)],
    ['s-mw', CURRENT_USER_ID, makeCell('team-mi', true, 25)],
    ['s-mw', 'user-3', makeCell('team-rcb', false, 0)],
  ]),
  teamsById: TEAMS,
  playersById: PLAYERS,
}

export const FullyResolved: Story = {
  args: {
    data: fullyResolvedData,
    currentUserId: CURRENT_USER_ID,
  },
}

// ---------------------------------------------------------------------------
// Story: PartiallyResolved — some scenarios unresolved
// ---------------------------------------------------------------------------

const partiallyResolvedPhases: MatchPredictionPhaseGroup[] = [
  {
    phase: 'toss',
    label: 'TOSS',
    scenarios: [SCENARIO_TOSS],
  },
  {
    phase: 'team_powerplay_end',
    label: 'POWERPLAY',
    scenarios: [SCENARIO_POWERPLAY],
  },
  {
    phase: 'end',
    label: 'MATCH END',
    scenarios: [SCENARIO_MATCH_WINNER],
  },
]

const partiallyResolvedData: MatchPredictionsDataset = {
  members: FOUR_MEMBERS,
  phases: partiallyResolvedPhases,
  predictionsByScenarioByUser: buildPredictionsMap([
    ['s-toss', 'user-1', makeCell('team-mi', true, 10)],
    ['s-toss', 'user-2', makeCell('team-csk', false, 0)],
    ['s-toss', CURRENT_USER_ID, makeCell('team-mi', true, 10)],
    ['s-toss', 'user-3', makeCell('team-mi', true, 10)],

    ['s-pp', 'user-1', makeCell('60-79', null, 0)],
    ['s-pp', 'user-2', makeCell('80-99', null, 0)],
    ['s-pp', CURRENT_USER_ID, makeCell('40-59', null, 0)],

    ['s-mw', 'user-1', makeCell('team-mi', null, 0)],
    ['s-mw', 'user-2', makeCell('team-csk', null, 0)],
    ['s-mw', CURRENT_USER_ID, makeCell('team-mi', null, 0)],
    ['s-mw', 'user-3', makeCell('team-rcb', null, 0)],
  ]),
  teamsById: TEAMS,
  playersById: PLAYERS,
}

export const PartiallyResolved: Story = {
  args: {
    data: partiallyResolvedData,
    currentUserId: CURRENT_USER_ID,
  },
}

// ---------------------------------------------------------------------------
// Story: LiveMatch — scenarios resolving progressively, includes voided
// ---------------------------------------------------------------------------

const liveMatchPhases: MatchPredictionPhaseGroup[] = [
  {
    phase: 'toss',
    label: 'TOSS',
    scenarios: [{ ...SCENARIO_TOSS, isResolved: true }],
  },
  {
    phase: 'first_wicket',
    label: 'FIRST WICKET',
    scenarios: [{ ...SCENARIO_FIRST_WICKET, isResolved: true }],
  },
  {
    phase: 'team_powerplay_end',
    label: 'POWERPLAY',
    scenarios: [SCENARIO_POWERPLAY],
  },
  {
    phase: 'post_match',
    label: 'POST MATCH',
    scenarios: [
      {
        ...SCENARIO_MOTM,
        isVoided: true,
        isResolved: false,
      },
    ],
  },
]

const liveMatchData: MatchPredictionsDataset = {
  members: FOUR_MEMBERS,
  phases: liveMatchPhases,
  predictionsByScenarioByUser: buildPredictionsMap([
    ['s-toss', 'user-1', makeCell('team-mi', true, 10)],
    ['s-toss', 'user-2', makeCell('team-mi', true, 10)],
    ['s-toss', CURRENT_USER_ID, makeCell('team-csk', false, 0)],
    ['s-toss', 'user-3', makeCell('team-mi', true, 10)],

    ['s-fw', 'user-1', makeCell('3-4', true, 15)],
    ['s-fw', 'user-2', makeCell('5-6', false, 0)],
    ['s-fw', CURRENT_USER_ID, makeCell('3-4', true, 15)],

    ['s-pp', 'user-1', makeCell('60-79', null, 0)],
    ['s-pp', CURRENT_USER_ID, makeCell('80-99', null, 0)],

    ['s-motm', 'user-1', makeCell('player-rohit', null, 0)],
    ['s-motm', 'user-2', makeCell('player-dhoni', null, 0)],
    ['s-motm', CURRENT_USER_ID, makeCell('player-kohli', null, 0)],
  ]),
  teamsById: TEAMS,
  playersById: PLAYERS,
}

export const LiveMatch: Story = {
  args: {
    data: liveMatchData,
    currentUserId: CURRENT_USER_ID,
  },
}

// ---------------------------------------------------------------------------
// Story: SingleMember — solo gang empty state
// ---------------------------------------------------------------------------

export const SingleMember: Story = {
  args: {
    data: {
      members: [makeMember(CURRENT_USER_ID, 'You', 1)],
      phases: fullyResolvedPhases,
      predictionsByScenarioByUser: buildPredictionsMap([
        ['s-toss', CURRENT_USER_ID, makeCell('team-mi', true, 10)],
      ]),
      teamsById: TEAMS,
      playersById: PLAYERS,
    },
    currentUserId: CURRENT_USER_ID,
  },
}

// ---------------------------------------------------------------------------
// Story: NoPredictions — members exist but no one predicted
// ---------------------------------------------------------------------------

export const NoPredictions: Story = {
  args: {
    data: {
      members: FOUR_MEMBERS,
      phases: fullyResolvedPhases,
      predictionsByScenarioByUser: new Map(),
      teamsById: TEAMS,
      playersById: PLAYERS,
    },
    currentUserId: CURRENT_USER_ID,
  },
}

// ---------------------------------------------------------------------------
// Story: FourMembers — fits on mobile
// ---------------------------------------------------------------------------

export const FourMembers: Story = {
  args: {
    data: fullyResolvedData,
    currentUserId: CURRENT_USER_ID,
  },
}

// ---------------------------------------------------------------------------
// Story: EightMembers — requires horizontal scroll
// ---------------------------------------------------------------------------

const eightMemberPredictions = buildPredictionsMap([
  ['s-toss', 'user-1', makeCell('team-mi', true, 10)],
  ['s-toss', 'user-2', makeCell('team-csk', false, 0)],
  ['s-toss', 'user-3', makeCell('team-mi', true, 10)],
  ['s-toss', CURRENT_USER_ID, makeCell('team-mi', true, 10)],
  ['s-toss', 'user-4', makeCell('team-csk', false, 0)],
  ['s-toss', 'user-5', makeCell('team-mi', true, 10)],
  ['s-toss', 'user-6', makeCell('team-csk', false, 0)],
  ['s-toss', 'user-7', makeCell('team-mi', true, 10)],

  ['s-fw', 'user-1', makeCell('3-4', true, 15)],
  ['s-fw', 'user-2', makeCell('5-6', false, 0)],
  ['s-fw', 'user-3', makeCell('1-2', false, 0)],
  ['s-fw', CURRENT_USER_ID, makeCell('3-4', true, 15)],
  ['s-fw', 'user-4', makeCell('7+', false, 0)],
  ['s-fw', 'user-5', makeCell('3-4', true, 15)],
  ['s-fw', 'user-6', makeCell('5-6', false, 0)],
  ['s-fw', 'user-7', makeCell('3-4', true, 15)],
])

export const EightMembers: Story = {
  args: {
    data: {
      members: EIGHT_MEMBERS,
      phases: [
        { phase: 'toss', label: 'TOSS', scenarios: [SCENARIO_TOSS] },
        {
          phase: 'first_wicket',
          label: 'FIRST WICKET',
          scenarios: [SCENARIO_FIRST_WICKET],
        },
      ],
      predictionsByScenarioByUser: eightMemberPredictions,
      teamsById: TEAMS,
      playersById: PLAYERS,
    },
    currentUserId: CURRENT_USER_ID,
  },
}
