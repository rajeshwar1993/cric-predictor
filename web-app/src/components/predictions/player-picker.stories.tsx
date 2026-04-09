import { useState } from 'react'
import { userEvent, within } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { FixtureTeam } from '@/lib/dal/fixtures'
import type { MatchPlayer } from '@/lib/dal/predictions'
import { PlayerPicker } from './player-picker'

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
  { id: 'p4', name: 'Hardik Pandya', teamId: 'team-mi-uuid', role: 'all-rounder' },
  { id: 'p5', name: 'Ishan Kishan', teamId: 'team-mi-uuid', role: 'wicket-keeper' },
]

const MOCK_AWAY_PLAYERS: MatchPlayer[] = [
  { id: 'p6', name: 'MS Dhoni', teamId: 'team-csk-uuid', role: 'wicket-keeper' },
  { id: 'p7', name: 'Ravindra Jadeja', teamId: 'team-csk-uuid', role: 'all-rounder' },
  { id: 'p8', name: 'Ruturaj Gaikwad', teamId: 'team-csk-uuid', role: 'batsman' },
  { id: 'p9', name: 'Devon Conway', teamId: 'team-csk-uuid', role: 'batsman' },
  { id: 'p10', name: 'Deepak Chahar', teamId: 'team-csk-uuid', role: 'bowler' },
]

const MOCK_PLAYERS = { home: MOCK_HOME_PLAYERS, away: MOCK_AWAY_PLAYERS }

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Predictions/PlayerPicker',
  component: PlayerPicker,
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
    players: MOCK_PLAYERS,
    homeTeam: MOCK_HOME_TEAM,
    awayTeam: MOCK_AWAY_TEAM,
    value: '',
    onChange: () => {},
  },
} satisfies Meta<typeof PlayerPicker>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** No player selected — shows placeholder. */
export const NoSelection: Story = {
  args: {
    value: '',
  },
}

/** Player already selected — shows name in trigger. */
export const PlayerSelected: Story = {
  args: {
    value: 'p1',
  },
}

/** Searching — popover open with search text entered. */
export const Searching: Story = {
  args: {
    value: '',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Open the popover by clicking the combobox trigger
    const trigger = canvas.getByRole('combobox')
    await userEvent.click(trigger)
    // Type a search query into the search input
    const input = await within(
      document.body
    ).findByPlaceholderText('Search players...')
    await userEvent.type(input, 'Rohit')
  },
}

/** Disabled state — cannot interact. */
export const Disabled: Story = {
  args: {
    value: 'p6',
    disabled: true,
  },
}

/** Interactive — open dropdown and select a player. */
export const Interactive: Story = {
  render: function InteractivePlayerPicker() {
    const [value, setValue] = useState('')
    return (
      <PlayerPicker
        players={MOCK_PLAYERS}
        homeTeam={MOCK_HOME_TEAM}
        awayTeam={MOCK_AWAY_TEAM}
        value={value}
        onChange={setValue}
      />
    )
  },
}
