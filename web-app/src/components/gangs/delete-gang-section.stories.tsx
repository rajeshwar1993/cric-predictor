import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn, userEvent, within, expect } from 'storybook/test'
import { DeleteGangSection } from './delete-gang-section'

const meta = {
  title: 'Gangs/DeleteGangSection',
  component: DeleteGangSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    gangId: 'gang-001',
    gangName: 'Street Legends',
    onDelete: fn().mockResolvedValue({ success: true }),
  },
} satisfies Meta<typeof DeleteGangSection>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — destructive button visible, dialog closed                 */
/* ------------------------------------------------------------------ */

export const Default: Story = {}

/* ------------------------------------------------------------------ */
/* DeleteDialog — confirmation dialog open                              */
/* ------------------------------------------------------------------ */

export const DeleteDialog: Story = {
  args: {
    initialDialogOpen: true,
  },
  play: async () => {
    const body = within(document.body)
    await expect(
      body.getByText(/this will permanently delete the gang/i),
    ).toBeVisible()
  },
}

/* ------------------------------------------------------------------ */
/* DeleteLoading — deletion in progress (never-resolving promise)      */
/* ------------------------------------------------------------------ */

export const DeleteLoading: Story = {
  args: {
    initialDialogOpen: true,
    onDelete: fn().mockImplementation(
      () => new Promise(() => {}), // never resolves — keeps spinner visible
    ),
  },
  play: async () => {
    const body = within(document.body)
    const input = body.getByPlaceholderText('Street Legends')
    await userEvent.type(input, 'Street Legends')

    const confirmButton = body.getByRole('button', { name: /delete gang/i })
    await userEvent.click(confirmButton)
  },
}

/* ------------------------------------------------------------------ */
/* DeleteError — server returns an error                                */
/* ------------------------------------------------------------------ */

export const DeleteError: Story = {
  args: {
    initialDialogOpen: true,
    onDelete: fn().mockResolvedValue({
      success: false,
      error: 'Only gang admins can delete the gang',
    }),
  },
  play: async () => {
    const body = within(document.body)
    const input = body.getByPlaceholderText('Street Legends')
    await userEvent.type(input, 'Street Legends')

    const confirmButton = body.getByRole('button', { name: /delete gang/i })
    await userEvent.click(confirmButton)
  },
}
