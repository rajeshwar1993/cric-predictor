import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { LeaveGangButton } from './leave-gang-button'

const meta = {
  title: 'Gangs/LeaveGangButton',
  component: LeaveGangButton,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 400, padding: 'var(--sp-4)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LeaveGangButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    gangId: 'gang-1',
    gangName: 'The Sixes',
  },
}
