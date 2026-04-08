import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PlayerPick } from './player-pick'
import { useState } from 'react'
import type { Player } from '@/lib/dal/predictions'

const meta = {
  title: 'Predictions/PlayerPick',
  component: PlayerPick,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PlayerPick>

export default meta
type Story = StoryObj<typeof meta>

const mockPlayers: Player[] = [
  { id: 'p1', name: 'Virat Kohli', teamId: 't1', teamCode: 'RCB', role: 'batsman' },
  { id: 'p2', name: 'MS Dhoni', teamId: 't2', teamCode: 'CSK', role: 'wicket-keeper' },
  { id: 'p3', name: 'Jasprit Bumrah', teamId: 't1', teamCode: 'RCB', role: 'bowler' },
  { id: 'p4', name: 'Ravindra Jadeja', teamId: 't2', teamCode: 'CSK', role: 'all-rounder' },
  { id: 'p5', name: 'Rohit Sharma', teamId: 't1', teamCode: 'RCB', role: 'batsman' },
  { id: 'p6', name: 'Ruturaj Gaikwad', teamId: 't2', teamCode: 'CSK', role: 'batsman' },
  { id: 'p7', name: 'Faf du Plessis', teamId: 't1', teamCode: 'RCB', role: 'batsman' },
  { id: 'p8', name: 'Devon Conway', teamId: 't2', teamCode: 'CSK', role: 'batsman' },
]

export const Default: Story = {
  args: {
    players: mockPlayers,
    value: null,
    onChange: () => {},
    title: 'Who will be top scorer?',
  },
}

export const WithSelection: Story = {
  args: {
    players: mockPlayers,
    value: 'p1',
    onChange: () => {},
    title: 'Who will be top scorer?',
  },
}

export const Disabled: Story = {
  args: {
    players: mockPlayers,
    value: 'p2',
    onChange: () => {},
    disabled: true,
    title: 'Who will be top scorer?',
  },
}

export const EmptyPlayers: Story = {
  args: {
    players: [],
    value: null,
    onChange: () => {},
    title: 'Select a player',
  },
}

export const Interactive: Story = {
  args: {
    players: mockPlayers,
    value: null,
    onChange: () => {},
    title: 'Who will be top scorer?',
  },
  render: () => {
    const [value, setValue] = useState<string | null>(null)
    return (
      <PlayerPick
        players={mockPlayers}
        value={value}
        onChange={setValue}
        title="Who will be top scorer?"
      />
    )
  },
}
