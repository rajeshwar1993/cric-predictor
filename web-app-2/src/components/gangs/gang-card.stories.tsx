import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { GangCard } from './gang-card'

const meta = {
  title: 'Gangs/GangCard',
  component: GangCard,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 400, padding: 'var(--sp-4)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GangCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    gang: {
      id: 'gang-1',
      name: 'The Sixes',
      memberCount: 5,
      role: 'member',
    },
  },
}

export const AdminRole: Story = {
  args: {
    gang: {
      id: 'gang-2',
      name: 'Mumbai Mavericks',
      memberCount: 12,
      role: 'admin',
    },
  },
}

export const ManyMembers: Story = {
  args: {
    gang: {
      id: 'gang-3',
      name: 'IPL Fantasy League Champions 2026',
      memberCount: 20,
      role: 'member',
    },
  },
}
