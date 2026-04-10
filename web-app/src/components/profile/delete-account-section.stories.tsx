import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn, userEvent, within, expect } from 'storybook/test'
import { DeleteAccountSection } from './delete-account-section'

const meta = {
  title: 'Profile/DeleteAccountSection',
  component: DeleteAccountSection,
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
    email: 'user@example.com',
    // Default to a never-resolving promise so the redirect path doesn't
    // try to actually navigate during stories that aren't testing it.
    onDelete: fn().mockImplementation(() => new Promise(() => {})),
  },
} satisfies Meta<typeof DeleteAccountSection>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — destructive button visible, dialog closed                 */
/* ------------------------------------------------------------------ */

export const Default: Story = {}

/* ------------------------------------------------------------------ */
/* DialogOpen — confirmation dialog open                                */
/* ------------------------------------------------------------------ */

export const DialogOpen: Story = {
  args: {
    initialDialogOpen: true,
  },
  play: async () => {
    const body = within(document.body)
    await expect(
      body.getByText(/this permanently deletes your account/i),
    ).toBeVisible()
  },
}

/* ------------------------------------------------------------------ */
/* TypedEmail — dialog open with the email typed in                    */
/* ------------------------------------------------------------------ */

export const TypedEmail: Story = {
  args: {
    initialDialogOpen: true,
  },
  play: async () => {
    const body = within(document.body)
    const input = body.getByPlaceholderText('user@example.com')
    await userEvent.type(input, 'user@example.com')

    // Confirm button should now be enabled
    const confirmButton = body.getByRole('button', {
      name: /delete account/i,
    })
    await expect(confirmButton).toBeEnabled()
  },
}

/* ------------------------------------------------------------------ */
/* Deleting — deletion in progress (never-resolving promise)            */
/* ------------------------------------------------------------------ */

export const Deleting: Story = {
  args: {
    initialDialogOpen: true,
    onDelete: fn().mockImplementation(
      () => new Promise(() => {}), // never resolves — keeps spinner visible
    ),
  },
  play: async () => {
    const body = within(document.body)
    const input = body.getByPlaceholderText('user@example.com')
    await userEvent.type(input, 'user@example.com')

    const confirmButton = body.getByRole('button', {
      name: /delete account/i,
    })
    await userEvent.click(confirmButton)
  },
}
