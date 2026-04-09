import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Users, Target, UserPlus } from 'lucide-react'
import { EmptyState } from './empty-state'
import { Button } from './button'

const meta = {
  title: 'UI/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Stories                                                              */
/* ------------------------------------------------------------------ */

export const NoGangs: Story = {
  args: {
    icon: Users,
    headline: 'No gangs yet',
    description:
      'Create a gang or join one with an invite code to start predicting.',
    action: <Button>Create a Gang</Button>,
  },
}

export const NoPredictions: Story = {
  args: {
    icon: Target,
    headline: 'No predictions',
    description:
      'You haven\u2019t made any predictions yet. Pick a match and start flexing.',
    action: <Button>Predict Now</Button>,
  },
}

export const NoMembers: Story = {
  args: {
    icon: UserPlus,
    headline: 'Invite your friends',
    description:
      'Your gang is empty. Share the invite link and get your crew on board.',
    action: (
      <Button variant="secondary">Copy Invite Link</Button>
    ),
  },
}

export const WithoutAction: Story = {
  args: {
    icon: Target,
    headline: 'No results yet',
    description: 'Results will appear once the match is complete.',
  },
}
