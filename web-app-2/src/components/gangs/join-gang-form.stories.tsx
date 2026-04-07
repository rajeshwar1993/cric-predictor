import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { JoinGangForm } from './join-gang-form'

const meta = {
  title: 'Gangs/JoinGangForm',
  component: JoinGangForm,
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
} satisfies Meta<typeof JoinGangForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Pending: Story = {
  name: 'Pending Approval',
  parameters: {
    docs: {
      description: {
        story:
          'Shows the pending message after submitting a join request to a gang with manual approval.',
      },
    },
  },
}

export const Error: Story = {
  name: 'Error State',
  parameters: {
    docs: {
      description: {
        story: 'Shows the form with an inline error after a failed join attempt.',
      },
    },
  },
}
