import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn, userEvent, within, expect } from 'storybook/test'
import { LeaveGangButton } from './leave-gang-button'

const meta = {
  title: 'Gangs/LeaveGangButton',
  component: LeaveGangButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    gangId: 'gang-001',
    gangName: 'Mumbai Mavericks',
    onLeave: fn().mockResolvedValue({ success: true }),
  },
} satisfies Meta<typeof LeaveGangButton>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — button visible, dialog closed                             */
/* ------------------------------------------------------------------ */

export const Default: Story = {}

/* ------------------------------------------------------------------ */
/* DialogOpen — confirmation dialog shown after clicking Leave Gang     */
/* ------------------------------------------------------------------ */

export const DialogOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', { name: /leave gang/i })
    await userEvent.click(button)

    // Dialog should now be visible in the document
    const body = within(document.body)
    await expect(
      body.getByText(/you will lose access to this gang/i),
    ).toBeVisible()
  },
}

/* ------------------------------------------------------------------ */
/* TypedConfirmation — user has typed gang name, confirm enabled        */
/* ------------------------------------------------------------------ */

export const TypedConfirmation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', { name: /leave gang/i })
    await userEvent.click(button)

    // Type the gang name in the confirmation input
    const body = within(document.body)
    const input = body.getByPlaceholderText('Mumbai Mavericks')
    await userEvent.type(input, 'Mumbai Mavericks')

    // Confirm button should now be enabled
    const confirmButton = body.getByRole('button', { name: /leave gang/i })
    await expect(confirmButton).toBeEnabled()
  },
}

/* ------------------------------------------------------------------ */
/* Loading — leaving in progress (never-resolving promise)             */
/* ------------------------------------------------------------------ */

export const Loading: Story = {
  args: {
    onLeave: fn().mockImplementation(
      () => new Promise(() => {}), // never resolves — keeps spinner visible
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', { name: /leave gang/i })
    await userEvent.click(button)

    // Type the gang name and click confirm
    const body = within(document.body)
    const input = body.getByPlaceholderText('Mumbai Mavericks')
    await userEvent.type(input, 'Mumbai Mavericks')

    const confirmButton = body.getByRole('button', { name: /leave gang/i })
    await userEvent.click(confirmButton)
  },
}
