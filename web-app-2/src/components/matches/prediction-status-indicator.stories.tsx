import type { Meta, StoryObj } from '@storybook/nextjs-vite'

// ---------------------------------------------------------------------------
// Since the real component is a server component that calls the DAL,
// we create a client-friendly presentational variant for Storybook.
// ---------------------------------------------------------------------------

interface MemberPredictionStatus {
  userId: string
  displayName: string
  hasPredicted: boolean
}

// Inline SVG icons for storybook (avoid server-only lucide issue)
function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[var(--success)]"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function CircleIcon() {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[var(--text-tertiary)]"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}

function PredictionChip({ status }: { status: MemberPredictionStatus }) {
  const initial = status.displayName.charAt(0).toUpperCase()

  return (
    <div
      className="inline-flex items-center gap-[var(--sp-1)] rounded-[var(--radius-ds-full)] px-[var(--sp-2)] py-[2px] bg-[var(--bg-overlay)]"
      title={
        status.hasPredicted
          ? `${status.displayName} has predicted`
          : `${status.displayName} hasn't predicted`
      }
    >
      <span
        className="flex h-5 w-5 items-center justify-center rounded-[var(--radius-ds-full)] text-[10px] font-semibold"
        style={{
          backgroundColor: status.hasPredicted ? 'var(--success-muted)' : 'var(--bg-inset)',
          color: status.hasPredicted ? 'var(--success)' : 'var(--text-tertiary)',
          border: `1px solid ${status.hasPredicted ? 'var(--success)' : 'var(--border-default)'}`,
        }}
        aria-hidden="true"
      >
        {initial}
      </span>
      {status.hasPredicted ? <CheckIcon /> : <CircleIcon />}
      <span
        className="max-w-[80px] truncate text-xs font-medium"
        style={{ color: status.hasPredicted ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
      >
        {status.displayName}
      </span>
    </div>
  )
}

/** Presentational version for Storybook */
function PredictionStatusIndicatorStory({
  members,
  isVisible = true,
}: {
  members: MemberPredictionStatus[]
  isVisible?: boolean
}) {
  if (!isVisible) return null
  if (members.length === 0) return null

  const sorted = [...members].sort((a, b) => {
    if (a.hasPredicted !== b.hasPredicted) {
      return a.hasPredicted ? -1 : 1
    }
    return a.displayName.localeCompare(b.displayName)
  })

  const predictedCount = sorted.filter((s) => s.hasPredicted).length

  return (
    <div className="flex flex-col gap-[var(--sp-2)]" aria-label="Prediction status">
      <p className="text-xs font-medium text-[var(--text-secondary)]">
        {String(predictedCount)}/{String(members.length)} predicted
      </p>
      <div className="flex flex-wrap gap-[var(--sp-2)]">
        {sorted.map((status) => (
          <PredictionChip key={status.userId} status={status} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Matches/PredictionStatusIndicator',
  component: PredictionStatusIndicatorStory,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story: React.ComponentType) => (
      <div style={{ width: 400, padding: 'var(--sp-4)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PredictionStatusIndicatorStory>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

const allMembers: MemberPredictionStatus[] = [
  { userId: 'u1', displayName: 'Virat', hasPredicted: true },
  { userId: 'u2', displayName: 'Rohit', hasPredicted: true },
  { userId: 'u3', displayName: 'Bumrah', hasPredicted: false },
  { userId: 'u4', displayName: 'Dhoni', hasPredicted: false },
  { userId: 'u5', displayName: 'Surya', hasPredicted: true },
]

export const Default: Story = {
  args: {
    members: allMembers,
    isVisible: true,
  },
}

export const AllPredicted: Story = {
  args: {
    members: allMembers.map((m) => ({ ...m, hasPredicted: true })),
    isVisible: true,
  },
}

export const NonePredicted: Story = {
  args: {
    members: allMembers.map((m) => ({ ...m, hasPredicted: false })),
    isVisible: true,
  },
}
