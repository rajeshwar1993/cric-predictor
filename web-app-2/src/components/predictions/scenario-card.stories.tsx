import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ScenarioCard } from './scenario-card'
import { useState } from 'react'
import type { FixtureScenario, Player } from '@/lib/dal/predictions'
import type { Team } from './team-pick'

const meta = {
  title: 'Predictions/ScenarioCard',
  component: ScenarioCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 400 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScenarioCard>

export default meta
type Story = StoryObj<typeof meta>

const teamA: Team = { id: 'team-a-uuid', code: 'CSK', color: '#FDB913' }
const teamB: Team = { id: 'team-b-uuid', code: 'MI', color: '#004BA0' }

const mockPlayers: Player[] = [
  { id: 'p1', name: 'Virat Kohli', teamId: 'team-a-uuid', teamCode: 'CSK', role: 'batsman' },
  { id: 'p2', name: 'MS Dhoni', teamId: 'team-b-uuid', teamCode: 'MI', role: 'wicket-keeper' },
  { id: 'p3', name: 'Jasprit Bumrah', teamId: 'team-b-uuid', teamCode: 'MI', role: 'bowler' },
]

const teamPickScenario: FixtureScenario = {
  id: 's1',
  templateId: 't1',
  fixtureId: 'f1',
  gangId: 'g1',
  leagueId: 'l1',
  seasonId: 'se1',
  slug: 'toss_winner',
  title: 'Who wins the toss?',
  inputType: 'team_pick',
  options: null,
  points: 5,
  resolutionPhase: 'toss',
  isResolved: false,
  correctAnswer: null,
}

const playerPickScenario: FixtureScenario = {
  id: 's2',
  templateId: 't2',
  fixtureId: 'f1',
  gangId: 'g1',
  leagueId: 'l1',
  seasonId: 'se1',
  slug: 'top_scorer',
  title: 'Who will be the top scorer?',
  inputType: 'player_pick',
  options: null,
  points: 15,
  resolutionPhase: 'end',
  isResolved: false,
  correctAnswer: null,
}

const rangeScenario: FixtureScenario = {
  id: 's3',
  templateId: 't3',
  fixtureId: 'f1',
  gangId: 'g1',
  leagueId: 'l1',
  seasonId: 'se1',
  slug: 'home_team_innings_score',
  title: 'CSK innings score?',
  inputType: 'range',
  options: ['<140', '140-159', '160-179', '180-199', '200+'],
  points: 10,
  resolutionPhase: 'team_innings_end',
  isResolved: false,
  correctAnswer: null,
}

const yesNoScenario: FixtureScenario = {
  id: 's4',
  templateId: 't4',
  fixtureId: 'f1',
  gangId: 'g1',
  leagueId: 'l1',
  seasonId: 'se1',
  slug: 'any_fifty',
  title: 'Will anyone score 50+?',
  inputType: 'yes_no',
  options: null,
  points: 5,
  resolutionPhase: 'end',
  isResolved: false,
  correctAnswer: null,
}

export const TeamPickCard: Story = {
  args: {
    scenario: teamPickScenario,
    teamA,
    teamB,
    players: mockPlayers,
    value: null,
    onChange: () => {},
  },
}

export const TeamPickWithSelection: Story = {
  args: {
    scenario: teamPickScenario,
    teamA,
    teamB,
    players: mockPlayers,
    value: 'team-a-uuid',
    onChange: () => {},
  },
}

export const PlayerPickCard: Story = {
  args: {
    scenario: playerPickScenario,
    teamA,
    teamB,
    players: mockPlayers,
    value: null,
    onChange: () => {},
  },
}

export const RangePickCard: Story = {
  args: {
    scenario: rangeScenario,
    teamA,
    teamB,
    players: mockPlayers,
    value: null,
    onChange: () => {},
  },
}

export const YesNoPickCard: Story = {
  args: {
    scenario: yesNoScenario,
    teamA,
    teamB,
    players: mockPlayers,
    value: null,
    onChange: () => {},
  },
}

export const DisabledCard: Story = {
  args: {
    scenario: teamPickScenario,
    teamA,
    teamB,
    players: mockPlayers,
    value: 'team-a-uuid',
    onChange: () => {},
    disabled: true,
  },
}

export const InteractiveTeamPick: Story = {
  args: {
    scenario: teamPickScenario,
    teamA,
    teamB,
    players: mockPlayers,
    value: null,
    onChange: () => {},
  },
  render: () => {
    const [value, setValue] = useState<string | null>(null)
    return (
      <ScenarioCard
        scenario={teamPickScenario}
        teamA={teamA}
        teamB={teamB}
        players={mockPlayers}
        value={value}
        onChange={setValue}
      />
    )
  },
}

export const InteractiveRange: Story = {
  args: {
    scenario: rangeScenario,
    teamA,
    teamB,
    players: mockPlayers,
    value: null,
    onChange: () => {},
  },
  render: () => {
    const [value, setValue] = useState<string | null>(null)
    return (
      <ScenarioCard
        scenario={rangeScenario}
        teamA={teamA}
        teamB={teamB}
        players={mockPlayers}
        value={value}
        onChange={setValue}
      />
    )
  },
}
