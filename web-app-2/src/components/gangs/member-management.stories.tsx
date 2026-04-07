import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { MemberManagement } from './member-management'

const meta = {
  title: 'Gangs/MemberManagement',
  component: MemberManagement,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 480, padding: 'var(--sp-4)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MemberManagement>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    gangId: 'gang-1',
    members: [
      {
        userId: 'user-admin',
        displayName: 'Virat',
        role: 'admin',
        status: 'approved',
        isBlocked: false,
        isCurrentUser: true,
      },
      {
        userId: 'user-2',
        displayName: 'Rohit',
        role: 'member',
        status: 'approved',
        isBlocked: false,
        isCurrentUser: false,
      },
      {
        userId: 'user-3',
        displayName: 'MS Dhoni',
        role: 'member',
        status: 'pending',
        isBlocked: false,
        isCurrentUser: false,
      },
      {
        userId: 'user-4',
        displayName: 'Suresh',
        role: 'member',
        status: 'left',
        isBlocked: false,
        isCurrentUser: false,
      },
      {
        userId: 'user-5',
        displayName: 'Hardik',
        role: 'member',
        status: 'removed',
        isBlocked: false,
        isCurrentUser: false,
      },
    ],
  },
}

export const WithBlocked: Story = {
  args: {
    gangId: 'gang-1',
    members: [
      {
        userId: 'user-admin',
        displayName: 'Virat',
        role: 'admin',
        status: 'approved',
        isBlocked: false,
        isCurrentUser: true,
      },
      {
        userId: 'user-2',
        displayName: 'Rohit',
        role: 'member',
        status: 'approved',
        isBlocked: false,
        isCurrentUser: false,
      },
      {
        userId: 'user-3',
        displayName: 'Controversial Player',
        role: 'member',
        status: 'removed',
        isBlocked: true,
        isCurrentUser: false,
      },
      {
        userId: 'user-4',
        displayName: 'Another Blocked',
        role: 'member',
        status: 'left',
        isBlocked: true,
        isCurrentUser: false,
      },
    ],
  },
}
