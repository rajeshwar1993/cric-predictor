import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PendingRequests } from './pending-requests'

const meta = {
  title: 'Gangs/PendingRequests',
  component: PendingRequests,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 440, padding: 'var(--sp-4)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PendingRequests>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    gangId: 'gang-1',
    requests: [
      {
        userId: 'user-1',
        displayName: 'Virat',
        requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        userId: 'user-2',
        displayName: 'Rohit Sharma',
        requestedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      {
        userId: 'user-3',
        displayName: 'MS Dhoni',
        requestedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
    ],
  },
}

export const Empty: Story = {
  args: {
    gangId: 'gang-1',
    requests: [],
  },
}

export const Loading: Story = {
  name: 'Single Request',
  args: {
    gangId: 'gang-1',
    requests: [
      {
        userId: 'user-1',
        displayName: 'KL Rahul',
        requestedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
    ],
  },
}
