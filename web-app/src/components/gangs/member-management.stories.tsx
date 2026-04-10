import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import { MemberManagement } from './member-management'
import type { GangDetailMember } from '@/lib/dal/gangs'

function makeMember(
  overrides: Partial<GangDetailMember> & { userId: string },
): GangDetailMember {
  return {
    displayName: 'Member',
    email: 'member@test.com',
    role: 'member',
    status: 'approved',
    isBlocked: false,
    ...overrides,
  }
}

const ADMIN_ID = 'admin-001'

const mixedMembers: GangDetailMember[] = [
  makeMember({
    userId: ADMIN_ID,
    displayName: 'Rajesh K',
    email: 'raj@test.com',
    role: 'admin',
    status: 'approved',
  }),
  makeMember({
    userId: 'user-002',
    displayName: 'Virat Kohli',
    status: 'approved',
  }),
  makeMember({
    userId: 'user-003',
    displayName: 'Rohit Sharma',
    status: 'approved',
  }),
  makeMember({
    userId: 'user-004',
    displayName: 'Hardik Pandya',
    status: 'removed',
    isBlocked: false,
  }),
  makeMember({
    userId: 'user-005',
    displayName: 'Naughty Neil',
    status: 'removed',
    isBlocked: true,
  }),
  makeMember({
    userId: 'user-006',
    displayName: 'Bailed Ben',
    status: 'left',
    isBlocked: false,
  }),
]

const allActiveMembers: GangDetailMember[] = [
  makeMember({
    userId: ADMIN_ID,
    displayName: 'Rajesh K',
    email: 'raj@test.com',
    role: 'admin',
    status: 'approved',
  }),
  makeMember({
    userId: 'user-002',
    displayName: 'Virat Kohli',
    status: 'approved',
  }),
  makeMember({
    userId: 'user-003',
    displayName: 'Rohit Sharma',
    status: 'approved',
  }),
  makeMember({
    userId: 'user-004',
    displayName: 'MS Dhoni',
    status: 'approved',
  }),
]

const meta = {
  title: 'Gangs/MemberManagement',
  component: MemberManagement,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    gangId: 'gang-001',
    currentUserId: ADMIN_ID,
    members: mixedMembers,
    onRemove: fn().mockResolvedValue({ success: true }),
    onBlock: fn().mockResolvedValue({ success: true }),
    onUnblock: fn().mockResolvedValue({ success: true }),
  },
} satisfies Meta<typeof MemberManagement>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — mixed: 1 admin, 2 approved, 1 removed, 1 blocked, 1 left  */
/* ------------------------------------------------------------------ */

export const Default: Story = {}

/* ------------------------------------------------------------------ */
/* AllActive — every member is an approved active member                */
/* ------------------------------------------------------------------ */

export const AllActive: Story = {
  args: {
    members: allActiveMembers,
  },
}

/* ------------------------------------------------------------------ */
/* RemoveDialog — simple layout with two rows so users can click       */
/* "Remove" on the non-admin row to exercise the confirmation dialog.  */
/* ------------------------------------------------------------------ */

export const RemoveDialog: Story = {
  args: {
    members: [
      makeMember({
        userId: ADMIN_ID,
        displayName: 'Rajesh K',
        role: 'admin',
        status: 'approved',
      }),
      makeMember({
        userId: 'user-002',
        displayName: 'Virat Kohli',
        status: 'approved',
      }),
    ],
  },
}

/* ------------------------------------------------------------------ */
/* Loading — remove action never resolves so the dialog stays loading  */
/* ------------------------------------------------------------------ */

export const Loading: Story = {
  args: {
    onRemove: fn().mockImplementation(
      () => new Promise(() => {}), // never resolves — keeps spinner visible
    ),
    onBlock: fn().mockImplementation(
      () => new Promise(() => {}), // never resolves
    ),
    onUnblock: fn().mockImplementation(
      () => new Promise(() => {}), // never resolves
    ),
  },
}
