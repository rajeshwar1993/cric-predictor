import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ProfileNameEdit } from './profile-name-edit'

const meta = {
  title: 'Leaderboards/ProfileNameEdit',
  component: ProfileNameEdit,
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
} satisfies Meta<typeof ProfileNameEdit>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    currentName: 'Virat',
  },
}

export const LongName: Story = {
  args: {
    currentName: 'Mahendra Singh Dhoni',
  },
}
