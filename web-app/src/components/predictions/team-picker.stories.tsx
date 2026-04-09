import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { FixtureTeam } from '@/lib/dal/fixtures'
import { TeamPicker } from './team-picker'

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

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Predictions/TeamPicker',
  component: TeamPicker,
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
    homeTeam: MOCK_HOME_TEAM,
    awayTeam: MOCK_AWAY_TEAM,
    value: '',
    onChange: () => {},
  },
} satisfies Meta<typeof TeamPicker>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** No team selected. */
export const NoSelection: Story = {
  args: {
    value: '',
  },
}

/** Home team (MI) selected. */
export const HomeSelected: Story = {
  args: {
    value: 'team-mi-uuid',
  },
}

/** Away team (CSK) selected. */
export const AwaySelected: Story = {
  args: {
    value: 'team-csk-uuid',
  },
}

/** Disabled state — cannot interact. */
export const Disabled: Story = {
  args: {
    value: 'team-mi-uuid',
    disabled: true,
  },
}

/** Interactive — click to toggle selection. */
export const Interactive: Story = {
  render: function InteractiveTeamPicker() {
    const [value, setValue] = useState('')
    return (
      <TeamPicker
        homeTeam={MOCK_HOME_TEAM}
        awayTeam={MOCK_AWAY_TEAM}
        value={value}
        onChange={setValue}
      />
    )
  },
}
