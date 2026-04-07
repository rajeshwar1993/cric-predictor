import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { InviteShare } from './invite-share'

const meta = {
  title: 'Gangs/InviteShare',
  component: InviteShare,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 440, padding: 'var(--sp-4)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InviteShare>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    inviteCode: 'ABC123',
    gangName: 'The Sixes',
  },
}
