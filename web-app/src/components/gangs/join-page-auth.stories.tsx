import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { JoinPageAuth } from './join-page-auth'
import type { ActionResult } from '@/types'

const MOCK_GANG = {
  id: 'gang-123',
  name: 'Mumbai Mavericks',
  autoAccept: true,
}

/** Mock action that resolves to approved status. */
const approvedAction = async (): Promise<
  ActionResult<{ gangId: string; status: 'approved' | 'pending' }>
> => ({
  success: true,
  data: { gangId: 'gang-123', status: 'approved' },
})

/** Mock action that resolves to pending status. */
const pendingAction = async (): Promise<
  ActionResult<{ gangId: string; status: 'approved' | 'pending' }>
> => ({
  success: true,
  data: { gangId: 'gang-123', status: 'pending' },
})

/** Mock action that never resolves (for loading state). */
const loadingAction = () =>
  new Promise<ActionResult<{ gangId: string; status: 'approved' | 'pending' }>>(
    () => {
      // Never resolves — keeps loading state
    },
  )

/** Mock action that returns a gang-full error. */
const gangFullAction = async (): Promise<
  ActionResult<{ gangId: string; status: 'approved' | 'pending' }>
> => ({
  success: false,
  error: 'This gang has reached its maximum of 20 members',
})

const meta = {
  title: 'Gangs/JoinPageAuth',
  component: JoinPageAuth,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 440 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof JoinPageAuth>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — join confirmation (no existing membership)                */
/* ------------------------------------------------------------------ */

export const Default: Story = {
  args: {
    gang: MOCK_GANG,
    existingMembership: null,
    inviteCode: 'XK42AB',
    action: approvedAction,
  },
}

/* ------------------------------------------------------------------ */
/* AlreadyPending — request pending message                            */
/* ------------------------------------------------------------------ */

export const AlreadyPending: Story = {
  args: {
    gang: MOCK_GANG,
    existingMembership: { status: 'pending', isBlocked: false },
    inviteCode: 'XK42AB',
    action: pendingAction,
  },
}

/* ------------------------------------------------------------------ */
/* Rejected — retry option                                             */
/* ------------------------------------------------------------------ */

export const Rejected: Story = {
  args: {
    gang: MOCK_GANG,
    existingMembership: { status: 'rejected', isBlocked: false },
    inviteCode: 'XK42AB',
    action: approvedAction,
  },
}

/* ------------------------------------------------------------------ */
/* Blocked — cannot join message                                       */
/* ------------------------------------------------------------------ */

export const Blocked: Story = {
  args: {
    gang: MOCK_GANG,
    existingMembership: { status: 'rejected', isBlocked: true },
    inviteCode: 'XK42AB',
    action: approvedAction,
  },
}

/* ------------------------------------------------------------------ */
/* GangFull — max members (shown via action error)                     */
/* ------------------------------------------------------------------ */

export const GangFull: Story = {
  args: {
    gang: MOCK_GANG,
    existingMembership: null,
    inviteCode: 'XK42AB',
    action: gangFullAction,
  },
}

/* ------------------------------------------------------------------ */
/* Success — "You're in!" post-action state                            */
/* ------------------------------------------------------------------ */

export const Success: Story = {
  args: {
    gang: MOCK_GANG,
    existingMembership: null,
    inviteCode: 'XK42AB',
    action: approvedAction,
  },
}

/* ------------------------------------------------------------------ */
/* PendingApproval — "Request sent" post-action state                  */
/* ------------------------------------------------------------------ */

export const PendingApproval: Story = {
  args: {
    gang: { ...MOCK_GANG, autoAccept: false },
    existingMembership: null,
    inviteCode: 'XK42AB',
    action: pendingAction,
  },
}

/* ------------------------------------------------------------------ */
/* Loading — button in loading state                                   */
/* ------------------------------------------------------------------ */

export const Loading: Story = {
  args: {
    gang: MOCK_GANG,
    existingMembership: null,
    inviteCode: 'XK42AB',
    action: loadingAction,
  },
}

/* ------------------------------------------------------------------ */
/* Left — user previously left, can rejoin                             */
/* ------------------------------------------------------------------ */

export const PreviouslyLeft: Story = {
  args: {
    gang: MOCK_GANG,
    existingMembership: { status: 'left', isBlocked: false },
    inviteCode: 'XK42AB',
    action: approvedAction,
  },
}

/* ------------------------------------------------------------------ */
/* Removed — user was removed, can rejoin                              */
/* ------------------------------------------------------------------ */

export const PreviouslyRemoved: Story = {
  args: {
    gang: MOCK_GANG,
    existingMembership: { status: 'removed', isBlocked: false },
    inviteCode: 'XK42AB',
    action: approvedAction,
  },
}
