import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { TeamPick } from './team-pick'
import { useState } from 'react'

const meta = {
  title: 'Predictions/TeamPick',
  component: TeamPick,
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
} satisfies Meta<typeof TeamPick>

export default meta
type Story = StoryObj<typeof meta>

const teamA = { id: 'team-a-uuid', code: 'CSK', color: '#FDB913' }
const teamB = { id: 'team-b-uuid', code: 'MI', color: '#004BA0' }

export const Default: Story = {
  args: {
    teamA,
    teamB,
    value: null,
    onChange: () => {},
  },
}

export const TeamASelected: Story = {
  args: {
    teamA,
    teamB,
    value: 'team-a-uuid',
    onChange: () => {},
  },
}

export const TeamBSelected: Story = {
  args: {
    teamA,
    teamB,
    value: 'team-b-uuid',
    onChange: () => {},
  },
}

export const Disabled: Story = {
  args: {
    teamA,
    teamB,
    value: 'team-a-uuid',
    onChange: () => {},
    disabled: true,
  },
}

export const Interactive: Story = {
  args: {
    teamA,
    teamB,
    value: null,
    onChange: () => {},
  },
  render: () => {
    const [value, setValue] = useState<string | null>(null)
    return <TeamPick teamA={teamA} teamB={teamB} value={value} onChange={setValue} />
  },
}
