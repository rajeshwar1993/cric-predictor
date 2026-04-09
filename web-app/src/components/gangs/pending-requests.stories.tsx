import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import { PendingRequestCard } from './pending-request-card'

/**
 * Stories for the Pending Requests section (GANG-002).
 *
 * The `PendingRequests` server component is an async data-fetching wrapper.
 * These stories compose the `PendingRequestCard` client component directly
 * to demonstrate all visual states of the section.
 */

const neverResolves = fn().mockImplementation(() => new Promise(() => {}))
const resolveSuccess = fn().mockResolvedValue({ success: true })

const meta = {
  title: 'Gangs/PendingRequests',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* NoPending — renders nothing (empty state)                           */
/* ------------------------------------------------------------------ */

export const NoPending: Story = {
  render: () => (
    <section aria-label="Pending join requests">
      <h2 className="text-caption font-bold uppercase tracking-widest text-text-muted mb-3">
        Pending Requests
      </h2>
      <p className="text-body-sm text-text-muted">No pending requests shown — the section is hidden when empty.</p>
    </section>
  ),
}

/* ------------------------------------------------------------------ */
/* OneRequest — single pending member                                  */
/* ------------------------------------------------------------------ */

export const OneRequest: Story = {
  render: () => (
    <section aria-label="Pending join requests">
      <h2 className="text-caption font-bold uppercase tracking-widest text-text-muted mb-3">
        Pending Requests
      </h2>
      <div className="flex flex-col gap-2" role="list">
        <PendingRequestCard
          gangId="gang-001"
          userId="user-001"
          displayName="Rohit"
          requestedAt={new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()}
          onApprove={resolveSuccess}
          onReject={resolveSuccess}
        />
      </div>
    </section>
  ),
}

/* ------------------------------------------------------------------ */
/* MultipleRequests — 3 pending members                                */
/* ------------------------------------------------------------------ */

export const MultipleRequests: Story = {
  render: () => (
    <section aria-label="Pending join requests">
      <h2 className="text-caption font-bold uppercase tracking-widest text-text-muted mb-3">
        Pending Requests
      </h2>
      <div className="flex flex-col gap-2" role="list">
        <PendingRequestCard
          gangId="gang-001"
          userId="user-001"
          displayName="Rohit"
          requestedAt={new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()}
          onApprove={resolveSuccess}
          onReject={resolveSuccess}
        />
        <PendingRequestCard
          gangId="gang-001"
          userId="user-002"
          displayName="Virat"
          requestedAt={new Date(Date.now() - 30 * 60 * 1000).toISOString()}
          onApprove={resolveSuccess}
          onReject={resolveSuccess}
        />
        <PendingRequestCard
          gangId="gang-001"
          userId="user-003"
          displayName="Jasprit"
          requestedAt={new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()}
          onApprove={resolveSuccess}
          onReject={resolveSuccess}
        />
      </div>
    </section>
  ),
}

/* ------------------------------------------------------------------ */
/* ApproveLoading — approve button in loading state                    */
/* ------------------------------------------------------------------ */

export const ApproveLoading: Story = {
  render: () => (
    <section aria-label="Pending join requests">
      <h2 className="text-caption font-bold uppercase tracking-widest text-text-muted mb-3">
        Pending Requests
      </h2>
      <div className="flex flex-col gap-2" role="list">
        <PendingRequestCard
          gangId="gang-001"
          userId="user-001"
          displayName="Rohit"
          requestedAt={new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()}
          onApprove={neverResolves}
          onReject={resolveSuccess}
        />
      </div>
    </section>
  ),
}

/* ------------------------------------------------------------------ */
/* RejectLoading — reject button in loading state                      */
/* ------------------------------------------------------------------ */

export const RejectLoading: Story = {
  render: () => (
    <section aria-label="Pending join requests">
      <h2 className="text-caption font-bold uppercase tracking-widest text-text-muted mb-3">
        Pending Requests
      </h2>
      <div className="flex flex-col gap-2" role="list">
        <PendingRequestCard
          gangId="gang-001"
          userId="user-001"
          displayName="Rohit"
          requestedAt={new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()}
          onApprove={resolveSuccess}
          onReject={neverResolves}
        />
      </div>
    </section>
  ),
}
