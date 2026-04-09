import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { FixtureTeam } from '@/lib/dal/fixtures'
import type { MatchPlayer } from '@/lib/dal/predictions'
import { ScenarioInput } from './scenario-input'

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

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Predictions/ScenarioInput',
  component: ScenarioInput,
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
    inputType: 'team_select',
    homeTeam: MOCK_HOME_TEAM,
    awayTeam: MOCK_AWAY_TEAM,
    players: MOCK_PLAYERS,
    value: '',
    onChange: () => {},
  },
} satisfies Meta<typeof ScenarioInput>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Team select input type. */
export const TeamSelect: Story = {
  args: {
    inputType: 'team_select',
    value: '',
  },
}

/** Player select input type. */
export const PlayerSelect: Story = {
  args: {
    inputType: 'player_select',
    value: '',
  },
}

/** Number range input type. */
export const NumberRange: Story = {
  args: {
    inputType: 'number_range',
    options: ['<140', '140-159', '160-179', '180-199', '200+'],
    value: '',
  },
}

/** Over range input type. */
export const OverRange: Story = {
  args: {
    inputType: 'over_range',
    options: ['1-6', '7-10', '11-15', '16-20'],
    value: '',
  },
}

/** Yes/No input type. */
export const YesNo: Story = {
  args: {
    inputType: 'yes_no',
    value: '',
  },
}

/** All types in a column — demonstrates all picker variants together. */
export const AllTypes: Story = {
  render: function AllTypesDemo() {
    const [teamValue, setTeamValue] = useState('')
    const [playerValue, setPlayerValue] = useState('')
    const [rangeValue, setRangeValue] = useState('')
    const [yesNoValue, setYesNoValue] = useState('')

    return (
      <div className="flex flex-col gap-6">
        <div>
          <p className="mb-2 text-caption text-text-muted">Team Select</p>
          <ScenarioInput
            inputType="team_select"
            homeTeam={MOCK_HOME_TEAM}
            awayTeam={MOCK_AWAY_TEAM}
            players={MOCK_PLAYERS}
            value={teamValue}
            onChange={setTeamValue}
          />
        </div>
        <div>
          <p className="mb-2 text-caption text-text-muted">Player Select</p>
          <ScenarioInput
            inputType="player_select"
            homeTeam={MOCK_HOME_TEAM}
            awayTeam={MOCK_AWAY_TEAM}
            players={MOCK_PLAYERS}
            value={playerValue}
            onChange={setPlayerValue}
          />
        </div>
        <div>
          <p className="mb-2 text-caption text-text-muted">Number Range</p>
          <ScenarioInput
            inputType="number_range"
            options={['<140', '140-159', '160-179', '180-199', '200+']}
            homeTeam={MOCK_HOME_TEAM}
            awayTeam={MOCK_AWAY_TEAM}
            players={MOCK_PLAYERS}
            value={rangeValue}
            onChange={setRangeValue}
          />
        </div>
        <div>
          <p className="mb-2 text-caption text-text-muted">Yes / No</p>
          <ScenarioInput
            inputType="yes_no"
            homeTeam={MOCK_HOME_TEAM}
            awayTeam={MOCK_AWAY_TEAM}
            players={MOCK_PLAYERS}
            value={yesNoValue}
            onChange={setYesNoValue}
          />
        </div>
      </div>
    )
  },
}
