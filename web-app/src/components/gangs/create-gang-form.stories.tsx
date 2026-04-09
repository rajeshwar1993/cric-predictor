import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { CreateGangForm } from './create-gang-form'

const meta = {
  title: 'Gangs/CreateGangForm',
  component: CreateGangForm,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CreateGangForm>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — empty form                                                 */
/* ------------------------------------------------------------------ */

export const Default: Story = {}

/* ------------------------------------------------------------------ */
/* Filled — with a valid gang name entered                              */
/* ------------------------------------------------------------------ */

export const Filled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Gang name')
    await userEvent.type(input, 'Mumbai Mavericks')

    const button = canvas.getByRole('button', { name: /create gang/i })
    await expect(button).toBeEnabled()
  },
}

/* ------------------------------------------------------------------ */
/* ValidationError — name too short                                     */
/* ------------------------------------------------------------------ */

export const ValidationError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Gang name')
    await userEvent.type(input, 'AB')

    // The button should be disabled when name is too short
    const button = canvas.getByRole('button', { name: /create gang/i })
    await expect(button).toBeDisabled()
  },
}

/* ------------------------------------------------------------------ */
/* Loading — submitting state with a never-resolving action              */
/* ------------------------------------------------------------------ */

export const Loading: Story = {
  args: {
    action: fn().mockImplementation(
      () => new Promise(() => {}), // never resolves — keeps spinner visible
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Gang name')
    await userEvent.type(input, 'Mumbai Mavericks')

    // Click submit — the mocked action never resolves, so loading state persists
    const button = canvas.getByRole('button', { name: /create gang/i })
    await userEvent.click(button)
  },
}

/* ------------------------------------------------------------------ */
/* MaxGangsError — limit reached error via mocked action                 */
/* ------------------------------------------------------------------ */

export const MaxGangsError: Story = {
  args: {
    action: fn().mockResolvedValue({
      success: false as const,
      error: "You've reached the maximum of 40 gangs.",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Gang name')
    await userEvent.type(input, 'Yet Another Gang')

    // Submit the form — mocked action returns the max-gangs error
    const button = canvas.getByRole('button', { name: /create gang/i })
    await userEvent.click(button)

    // Verify the error message is displayed
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      "You've reached the maximum of 40 gangs.",
    )
  },
}
