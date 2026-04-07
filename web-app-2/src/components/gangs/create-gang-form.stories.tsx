import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CreateGangForm } from './create-gang-form'

const meta = {
  title: 'Gangs/CreateGangForm',
  component: CreateGangForm,
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
} satisfies Meta<typeof CreateGangForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithError: Story = {
  name: 'Error State',
  parameters: {
    docs: {
      description: {
        story: 'Shows the form with an inline error after a failed submission.',
      },
    },
  },
}

export const Loading: Story = {
  name: 'Loading State',
  parameters: {
    docs: {
      description: {
        story: 'Shows the form during submission with the loading spinner.',
      },
    },
  },
}
