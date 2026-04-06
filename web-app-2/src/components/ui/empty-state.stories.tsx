import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Users } from 'lucide-react'
import { EmptyState } from './empty-state'
import { Button } from './button'

const meta = {
  title: 'UI/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    icon: <Users size={32} />,
    title: 'No gangs yet',
    description: 'Create a gang to start predicting with your mates.',
  },
}

export const WithAction: Story = {
  args: {
    icon: <Users size={32} />,
    title: 'No gangs yet',
    description: 'Create a gang to start predicting with your mates.',
    action: <Button>Create gang</Button>,
  },
}

export const WithoutIcon: Story = {
  args: {
    title: 'Nothing here',
    description: 'Check back later for updates.',
  },
}

export const WithoutDescription: Story = {
  args: {
    icon: <Users size={32} />,
    title: 'No predictions made',
  },
}
