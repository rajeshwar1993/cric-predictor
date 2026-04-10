import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import { MemberRowAdmin } from './member-row-admin'

const meta = {
  title: 'Gangs/MemberRowAdmin',
  component: MemberRowAdmin,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    gangId: 'gang-001',
    userId: 'user-001',
    displayName: 'Virat',
    role: 'member',
    status: 'approved',
    isBlocked: false,
    isCurrentUser: false,
    onRemove: fn().mockResolvedValue({ success: true }),
    onBlock: fn().mockResolvedValue({ success: true }),
    onUnblock: fn().mockResolvedValue({ success: true }),
  },
} satisfies Meta<typeof MemberRowAdmin>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Active — approved, not blocked. Remove + Block buttons shown.       */
/* ------------------------------------------------------------------ */

export const Active: Story = {}

/* ------------------------------------------------------------------ */
/* AdminRow — admin target shows ADMIN badge, no action buttons.       */
/* ------------------------------------------------------------------ */

export const AdminRow: Story = {
  args: {
    role: 'admin',
    displayName: 'Raj',
  },
}

/* ------------------------------------------------------------------ */
/* CurrentUserRow — admin viewing their own row. No buttons.           */
/* ------------------------------------------------------------------ */

export const CurrentUserRow: Story = {
  args: {
    role: 'admin',
    displayName: 'You',
    isCurrentUser: true,
  },
}

/* ------------------------------------------------------------------ */
/* Removed — status=removed, not blocked. Greyed out, no actions.      */
/* ------------------------------------------------------------------ */

export const Removed: Story = {
  args: {
    status: 'removed',
    isBlocked: false,
  },
}

/* ------------------------------------------------------------------ */
/* Blocked — status=removed + is_blocked=true. Unblock visible.        */
/* ------------------------------------------------------------------ */

export const Blocked: Story = {
  args: {
    status: 'removed',
    isBlocked: true,
  },
}

/* ------------------------------------------------------------------ */
/* ApprovedBlocked — data-integrity edge case: status=approved +       */
/* is_blocked=true. Rendered as Blocked so admin can Unblock and       */
/* recover from the UI instead of the row silently greying out.        */
/* ------------------------------------------------------------------ */

export const ApprovedBlocked: Story = {
  args: {
    status: 'approved',
    isBlocked: true,
  },
}

/* ------------------------------------------------------------------ */
/* Left — status=left, not blocked. Greyed out, no actions.            */
/* ------------------------------------------------------------------ */

export const Left: Story = {
  args: {
    status: 'left',
    isBlocked: false,
  },
}

/* ------------------------------------------------------------------ */
/* LeftBlocked — status=left + is_blocked=true. Unblock visible.       */
/* ------------------------------------------------------------------ */

export const LeftBlocked: Story = {
  args: {
    status: 'left',
    isBlocked: true,
  },
}

/* ------------------------------------------------------------------ */
/* NullDisplayName — fallback to "Unknown"                             */
/* ------------------------------------------------------------------ */

export const NullDisplayName: Story = {
  args: {
    displayName: null,
  },
}

/* ------------------------------------------------------------------ */
/* RemoveDialogOpen — the remove confirmation dialog is open           */
/* ------------------------------------------------------------------ */

export const RemoveDialogOpen: Story = {
  args: {
    initialRemoveDialogOpen: true,
  },
}

/* ------------------------------------------------------------------ */
/* BlockLoading — block action in progress (never-resolving promise)   */
/* ------------------------------------------------------------------ */

export const BlockLoading: Story = {
  args: {
    onBlock: fn().mockImplementation(
      () => new Promise(() => {}), // never resolves
    ),
  },
}
