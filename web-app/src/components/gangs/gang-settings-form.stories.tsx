import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn, userEvent, within, expect } from 'storybook/test'
import { GangSettingsForm } from './gang-settings-form'

const meta = {
  title: 'Gangs/GangSettingsForm',
  component: GangSettingsForm,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    gangId: 'gang-001',
    initialName: 'Street Legends',
    initialAutoAccept: false,
    initialPredictionDeadlineMins: 45,
    onUpdateName: fn().mockResolvedValue({ success: true }),
    onUpdateAutoAccept: fn().mockResolvedValue({ success: true }),
    onUpdatePredictionDeadline: fn().mockResolvedValue({ success: true }),
  },
} satisfies Meta<typeof GangSettingsForm>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — pre-populated with current values                         */
/* ------------------------------------------------------------------ */

export const Default: Story = {}

/* ------------------------------------------------------------------ */
/* AutoAcceptOn — auto-accept toggle initially on                       */
/* ------------------------------------------------------------------ */

export const AutoAcceptOn: Story = {
  args: {
    initialAutoAccept: true,
  },
}

/* ------------------------------------------------------------------ */
/* CustomDeadline — stored deadline differs from default                */
/* ------------------------------------------------------------------ */

export const CustomDeadline: Story = {
  args: {
    initialPredictionDeadlineMins: 120,
  },
}

/* ------------------------------------------------------------------ */
/* Saving — name save in progress (never resolves)                     */
/* ------------------------------------------------------------------ */

export const Saving: Story = {
  args: {
    onUpdateName: fn().mockImplementation(
      () => new Promise(() => {}), // never resolves — keeps spinner visible
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText(/gang name/i)
    await userEvent.clear(input)
    await userEvent.type(input, 'Neon Nights')

    const saveButton = canvas.getByRole('button', { name: /save name/i })
    await userEvent.click(saveButton)
  },
}

/* ------------------------------------------------------------------ */
/* NameError — server returns a validation error                       */
/* ------------------------------------------------------------------ */

export const NameError: Story = {
  args: {
    onUpdateName: fn().mockResolvedValue({
      success: false,
      error: 'Gang name must be 3-50 characters',
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText(/gang name/i)
    await userEvent.clear(input)
    await userEvent.type(input, 'Neon Nights')

    const saveButton = canvas.getByRole('button', { name: /save name/i })
    await userEvent.click(saveButton)
  },
}

/* ------------------------------------------------------------------ */
/* DeadlineError — client-side validation failure                       */
/* ------------------------------------------------------------------ */

export const DeadlineError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText(/minutes before match start/i)
    await userEvent.clear(input)
    await userEvent.type(input, '5')

    const saveButton = canvas.getByRole('button', { name: /save deadline/i })
    await userEvent.click(saveButton)

    await expect(
      canvas.getByText(/at least 15 minutes/i),
    ).toBeVisible()
  },
}
