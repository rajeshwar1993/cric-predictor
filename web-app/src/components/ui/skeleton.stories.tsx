import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  Skeleton,
  MatchCardSkeleton,
  LeaderboardRowSkeleton,
  ScenarioCardSkeleton,
  PageSkeleton,
} from './skeleton'

const meta = {
  title: 'UI/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'heading', 'card', 'avatar', 'block'],
    },
  },
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Base variants                                                        */
/* ------------------------------------------------------------------ */

export const Text: Story = {
  args: {
    variant: 'text',
    className: 'w-48',
  },
}

export const Heading: Story = {
  args: {
    variant: 'heading',
    className: 'w-64',
  },
}

export const CardVariant: Story = {
  args: {
    variant: 'card',
    className: 'w-[360px]',
  },
}

export const Avatar: Story = {
  args: {
    variant: 'avatar',
  },
}

export const Block: Story = {
  args: {
    variant: 'block',
    className: 'h-16 w-32 rounded-md',
  },
}

/* ------------------------------------------------------------------ */
/* All variants grid                                                    */
/* ------------------------------------------------------------------ */

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6 w-[360px]">
      <div>
        <p className="text-caption mb-2 text-text-muted">Text</p>
        <Skeleton variant="text" />
      </div>
      <div>
        <p className="text-caption mb-2 text-text-muted">Heading</p>
        <Skeleton variant="heading" />
      </div>
      <div>
        <p className="text-caption mb-2 text-text-muted">Card</p>
        <Skeleton variant="card" />
      </div>
      <div>
        <p className="text-caption mb-2 text-text-muted">Avatar</p>
        <Skeleton variant="avatar" />
      </div>
      <div>
        <p className="text-caption mb-2 text-text-muted">Block (custom)</p>
        <Skeleton variant="block" className="h-20 w-40 rounded-lg" />
      </div>
    </div>
  ),
}

/* ------------------------------------------------------------------ */
/* Pre-built compositions                                               */
/* ------------------------------------------------------------------ */

export const MatchCard: Story = {
  render: () => <MatchCardSkeleton className="w-[360px]" />,
}

export const LeaderboardRow: Story = {
  render: () => (
    <div className="w-[360px]">
      <LeaderboardRowSkeleton />
      <LeaderboardRowSkeleton />
      <LeaderboardRowSkeleton />
    </div>
  ),
}

export const ScenarioCard: Story = {
  render: () => <ScenarioCardSkeleton className="w-[360px]" />,
}

export const Page: Story = {
  render: () => <PageSkeleton className="w-[480px]" />,
  parameters: {
    layout: 'padded',
  },
}
