import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PredictionRevealTable } from './prediction-reveal-table'

const meta = {
  title: 'Leaderboards/PredictionRevealTable',
  component: PredictionRevealTable,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 480, padding: 'var(--sp-4)', overflow: 'auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PredictionRevealTable>

export default meta
type Story = StoryObj<typeof meta>

const mockScenarios = [
  {
    id: 's1',
    slug: 'toss-winner',
    title: 'Toss Winner',
    points: 2,
    correctAnswer: 'CSK',
    isResolved: true,
    isVoided: false,
    resolutionPhase: 'toss',
  },
  {
    id: 's2',
    slug: 'first-wicket',
    title: 'First Wicket',
    points: 3,
    correctAnswer: 'V Kohli',
    isResolved: true,
    isVoided: false,
    resolutionPhase: 'first_wicket',
  },
  {
    id: 's3',
    slug: 'powerplay-runs',
    title: 'PP Runs',
    points: 3,
    correctAnswer: '41-50',
    isResolved: true,
    isVoided: false,
    resolutionPhase: 'team_powerplay_end',
  },
  {
    id: 's4',
    slug: 'match-winner',
    title: 'Match Winner',
    points: 5,
    correctAnswer: 'MI',
    isResolved: true,
    isVoided: false,
    resolutionPhase: 'end',
  },
  {
    id: 's5',
    slug: 'total-sixes',
    title: 'Total Sixes',
    points: 2,
    correctAnswer: null,
    isResolved: false,
    isVoided: false,
    resolutionPhase: 'end',
  },
]

const mockMembers = [
  { userId: 'user-1', displayName: 'Virat', rank: 1, memberStatus: 'approved' as const },
  { userId: 'user-2', displayName: 'Rohit', rank: 2, memberStatus: 'approved' as const },
  { userId: 'user-3', displayName: 'Hardik', rank: 3, memberStatus: 'approved' as const },
  { userId: 'user-4', displayName: 'Jasprit', rank: 4, memberStatus: 'approved' as const },
]

const mockPredictions: Record<
  string,
  Record<string, { value: string; isCorrect: boolean | null; pointsEarned: number }>
> = {
  'user-1': {
    s1: { value: 'CSK', isCorrect: true, pointsEarned: 2 },
    s2: { value: 'R Sharma', isCorrect: false, pointsEarned: 0 },
    s3: { value: '41-50', isCorrect: true, pointsEarned: 3 },
    s4: { value: 'MI', isCorrect: true, pointsEarned: 5 },
    s5: { value: '8-10', isCorrect: null, pointsEarned: 0 },
  },
  'user-2': {
    s1: { value: 'MI', isCorrect: false, pointsEarned: 0 },
    s2: { value: 'V Kohli', isCorrect: true, pointsEarned: 3 },
    s3: { value: '31-40', isCorrect: false, pointsEarned: 0 },
    s4: { value: 'MI', isCorrect: true, pointsEarned: 5 },
    s5: { value: '6-8', isCorrect: null, pointsEarned: 0 },
  },
  'user-3': {
    s1: { value: 'CSK', isCorrect: true, pointsEarned: 2 },
    s3: { value: '51-60', isCorrect: false, pointsEarned: 0 },
    s4: { value: 'CSK', isCorrect: false, pointsEarned: 0 },
  },
  'user-4': {
    s1: { value: 'MI', isCorrect: false, pointsEarned: 0 },
    s2: { value: 'S Gill', isCorrect: false, pointsEarned: 0 },
    s3: { value: '41-50', isCorrect: true, pointsEarned: 3 },
    s4: { value: 'MI', isCorrect: true, pointsEarned: 5 },
  },
}

export const Default: Story = {
  args: {
    members: mockMembers,
    scenarios: mockScenarios,
    predictions: mockPredictions,
    currentUserId: 'user-2',
  },
}

export const WithLeftMember: Story = {
  args: {
    members: [
      ...mockMembers,
      { userId: 'user-5', displayName: 'Suresh', rank: 5, memberStatus: 'left' as const },
    ],
    scenarios: mockScenarios,
    predictions: {
      ...mockPredictions,
      'user-5': {
        s1: { value: 'CSK', isCorrect: true, pointsEarned: 2 },
      },
    },
    currentUserId: 'user-2',
  },
}

export const NoPredictions: Story = {
  args: {
    members: mockMembers,
    scenarios: mockScenarios,
    predictions: {},
    currentUserId: 'user-1',
  },
}

export const SoloGang: Story = {
  args: {
    members: [
      { userId: 'user-1', displayName: 'Virat', rank: 1, memberStatus: 'approved' as const },
    ],
    scenarios: mockScenarios,
    predictions: {
      'user-1': {
        s1: { value: 'CSK', isCorrect: true, pointsEarned: 2 },
      },
    },
    currentUserId: 'user-1',
  },
}

export const AllResolved: Story = {
  args: {
    members: mockMembers,
    scenarios: mockScenarios.map((s) => ({
      ...s,
      isResolved: true,
      correctAnswer: s.correctAnswer ?? 'N/A',
    })),
    predictions: mockPredictions,
    currentUserId: 'user-2',
  },
}
