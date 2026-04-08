import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PredictionForm } from './prediction-form'
import type { FixtureScenario, UserPrediction, Player } from '@/lib/dal/predictions'
import type { Team } from './team-pick'

const meta = {
  title: 'Predictions/PredictionForm',
  component: PredictionForm,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PredictionForm>

export default meta
type Story = StoryObj<typeof meta>

const homeTeam: Team = { id: 'team-csk', code: 'CSK', color: '#FDB913' }
const awayTeam: Team = { id: 'team-mi', code: 'MI', color: '#004BA0' }

const mockPlayers: Player[] = [
  { id: 'p1', name: 'Virat Kohli', teamId: 'team-csk', teamCode: 'CSK', role: 'batsman' },
  { id: 'p2', name: 'MS Dhoni', teamId: 'team-csk', teamCode: 'CSK', role: 'wicket-keeper' },
  { id: 'p3', name: 'Ruturaj Gaikwad', teamId: 'team-csk', teamCode: 'CSK', role: 'batsman' },
  { id: 'p4', name: 'Rohit Sharma', teamId: 'team-mi', teamCode: 'MI', role: 'batsman' },
  { id: 'p5', name: 'Jasprit Bumrah', teamId: 'team-mi', teamCode: 'MI', role: 'bowler' },
  { id: 'p6', name: 'Suryakumar Yadav', teamId: 'team-mi', teamCode: 'MI', role: 'batsman' },
]

const mockScenarios: FixtureScenario[] = [
  {
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
  },
  {
    id: 's2',
    templateId: 't2',
    fixtureId: 'f1',
    gangId: 'g1',
    leagueId: 'l1',
    seasonId: 'se1',
    slug: 'match_winner',
    title: 'Who wins the match?',
    inputType: 'team_pick',
    options: null,
    points: 10,
    resolutionPhase: 'end',
    isResolved: false,
    correctAnswer: null,
  },
  {
    id: 's3',
    templateId: 't3',
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
  },
  {
    id: 's4',
    templateId: 't4',
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
  },
  {
    id: 's5',
    templateId: 't5',
    fixtureId: 'f1',
    gangId: 'g1',
    leagueId: 'l1',
    seasonId: 'se1',
    slug: 'away_team_innings_score',
    title: 'MI innings score?',
    inputType: 'range',
    options: ['<140', '140-159', '160-179', '180-199', '200+'],
    points: 10,
    resolutionPhase: 'team_innings_end',
    isResolved: false,
    correctAnswer: null,
  },
  {
    id: 's6',
    templateId: 't6',
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
  },
  {
    id: 's7',
    templateId: 't7',
    fixtureId: 'f1',
    gangId: 'g1',
    leagueId: 'l1',
    seasonId: 'se1',
    slug: 'home_team_powerplay_runs',
    title: 'CSK powerplay runs?',
    inputType: 'range',
    options: ['<30', '30-39', '40-49', '50-59', '60+'],
    points: 10,
    resolutionPhase: 'team_powerplay_end',
    isResolved: false,
    correctAnswer: null,
  },
  {
    id: 's8',
    templateId: 't8',
    fixtureId: 'f1',
    gangId: 'g1',
    leagueId: 'l1',
    seasonId: 'se1',
    slug: 'player_of_match',
    title: 'Player of the match?',
    inputType: 'player_pick',
    options: null,
    points: 15,
    resolutionPhase: 'post_match',
    isResolved: false,
    correctAnswer: null,
  },
]

const existingPredictions: UserPrediction[] = [
  { id: 'pred-1', scenarioId: 's1', value: 'team-csk', submittedAt: '2026-04-06T10:00:00Z' },
  { id: 'pred-2', scenarioId: 's4', value: '160-179', submittedAt: '2026-04-06T10:00:00Z' },
]

export const Default: Story = {
  args: {
    gangId: 'g1',
    fixtureId: 'f1',
    scenarios: mockScenarios,
    existingPredictions: [],
    players: mockPlayers,
    isLocked: false,
    homeTeam,
    awayTeam,
  },
}

export const WithExistingPredictions: Story = {
  args: {
    gangId: 'g1',
    fixtureId: 'f1',
    scenarios: mockScenarios,
    existingPredictions,
    players: mockPlayers,
    isLocked: false,
    homeTeam,
    awayTeam,
  },
}

export const Locked: Story = {
  args: {
    gangId: 'g1',
    fixtureId: 'f1',
    scenarios: mockScenarios,
    existingPredictions,
    players: mockPlayers,
    isLocked: true,
    homeTeam,
    awayTeam,
  },
}

export const EmptyScenarios: Story = {
  args: {
    gangId: 'g1',
    fixtureId: 'f1',
    scenarios: [],
    existingPredictions: [],
    players: mockPlayers,
    isLocked: false,
    homeTeam,
    awayTeam,
  },
}
