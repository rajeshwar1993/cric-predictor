import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { MemberList } from './member-list'

const meta = {
  title: 'Gangs/MemberList',
  component: MemberList,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 440, padding: 'var(--sp-4)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MemberList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    members: [
      {
        userId: 'user-1',
        displayName: 'Virat',
        role: 'admin',
        status: 'approved',
        isCurrentUser: false,
        points: 0,
        rank: 1,
      },
      {
        userId: 'user-2',
        displayName: 'Rohit',
        role: 'member',
        status: 'approved',
        isCurrentUser: true,
        points: 0,
        rank: 2,
      },
      {
        userId: 'user-3',
        displayName: 'Hardik',
        role: 'member',
        status: 'approved',
        isCurrentUser: false,
        points: 0,
        rank: 3,
      },
      {
        userId: 'user-4',
        displayName: 'Suresh',
        role: 'member',
        status: 'left',
        isCurrentUser: false,
        points: 0,
        rank: null,
      },
    ],
  },
}

export const WithRanks: Story = {
  args: {
    members: [
      {
        userId: 'user-1',
        displayName: 'Virat',
        role: 'admin',
        status: 'approved',
        isCurrentUser: false,
        points: 120,
        rank: 1,
      },
      {
        userId: 'user-2',
        displayName: 'Rohit',
        role: 'member',
        status: 'approved',
        isCurrentUser: true,
        points: 95,
        rank: 2,
      },
      {
        userId: 'user-3',
        displayName: 'Hardik',
        role: 'member',
        status: 'approved',
        isCurrentUser: false,
        points: 88,
        rank: 3,
      },
      {
        userId: 'user-4',
        displayName: 'Jasprit',
        role: 'member',
        status: 'approved',
        isCurrentUser: false,
        points: 72,
        rank: 4,
      },
      {
        userId: 'user-5',
        displayName: 'KL Rahul',
        role: 'member',
        status: 'approved',
        isCurrentUser: false,
        points: 50,
        rank: 5,
      },
    ],
  },
}

export const SingleMember: Story = {
  args: {
    members: [
      {
        userId: 'user-1',
        displayName: 'Virat',
        role: 'admin',
        status: 'approved',
        isCurrentUser: true,
        points: 0,
        rank: 1,
      },
    ],
  },
}
