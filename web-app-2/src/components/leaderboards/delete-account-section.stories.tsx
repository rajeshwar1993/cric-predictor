import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { DeleteAccountSection } from './delete-account-section'

const meta = {
  title: 'Leaderboards/DeleteAccountSection',
  component: DeleteAccountSection,
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
} satisfies Meta<typeof DeleteAccountSection>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    userEmail: 'virat@example.com',
  },
}
