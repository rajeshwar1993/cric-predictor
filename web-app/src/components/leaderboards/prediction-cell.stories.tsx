import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PredictionCell } from './prediction-cell'

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Leaderboards/PredictionCell',
  component: PredictionCell,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    // PredictionCell renders a <td>, so wrap it in a valid table shell.
    (Story) => (
      <table className="bg-dark-concrete">
        <tbody>
          <tr>
            <Story />
          </tr>
        </tbody>
      </table>
    ),
  ],
} satisfies Meta<typeof PredictionCell>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories — states
// ---------------------------------------------------------------------------

export const Correct: Story = {
  args: {
    value: 'team-mi',
    displayValue: 'MI',
    isCorrect: true,
    isResolved: true,
    isVoided: false,
    ariaLabel: 'Alice predicted MI, correct',
  },
}

export const Incorrect: Story = {
  args: {
    value: 'team-csk',
    displayValue: 'CSK',
    isCorrect: false,
    isResolved: true,
    isVoided: false,
    ariaLabel: 'Bob predicted CSK, incorrect',
  },
}

export const Unresolved: Story = {
  args: {
    value: 'team-mi',
    displayValue: 'MI',
    isCorrect: null,
    isResolved: false,
    isVoided: false,
    ariaLabel: 'Alice predicted MI, not yet resolved',
  },
}

export const NotPredicted: Story = {
  args: {
    value: null,
    displayValue: null,
    isCorrect: null,
    isResolved: true,
    isVoided: false,
    ariaLabel: 'Charlie did not predict',
  },
}

export const Voided: Story = {
  args: {
    value: 'player-7',
    displayValue: 'Some Player',
    isCorrect: null,
    isResolved: false,
    isVoided: true,
    ariaLabel: 'Scenario voided',
  },
}

// ---------------------------------------------------------------------------
// Stories — input type formats
// ---------------------------------------------------------------------------

export const TeamPick: Story = {
  args: {
    value: 'team-mi',
    displayValue: 'MI',
    isCorrect: true,
    isResolved: true,
    isVoided: false,
    ariaLabel: 'Alice predicted MI, correct',
  },
}

export const PlayerPick: Story = {
  args: {
    value: 'player-1',
    displayValue: 'Rohit Sharma',
    isCorrect: true,
    isResolved: true,
    isVoided: false,
    ariaLabel: 'Alice predicted Rohit Sharma, correct',
  },
}

export const RangePick: Story = {
  args: {
    value: '160-179',
    displayValue: '160-179',
    isCorrect: false,
    isResolved: true,
    isVoided: false,
    ariaLabel: 'Bob predicted 160-179, incorrect',
  },
}

export const YesNoPick: Story = {
  args: {
    value: 'yes',
    displayValue: 'YES',
    isCorrect: true,
    isResolved: true,
    isVoided: false,
    ariaLabel: 'Alice predicted YES, correct',
  },
}

// ---------------------------------------------------------------------------
// Stories — current-user highlight
// ---------------------------------------------------------------------------

export const CurrentUserColumn: Story = {
  args: {
    value: 'team-mi',
    displayValue: 'MI',
    isCorrect: null,
    isResolved: false,
    isVoided: false,
    isCurrentUser: true,
    ariaLabel: 'You predicted MI, not yet resolved',
  },
}
