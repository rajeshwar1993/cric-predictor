import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { JoinGangForm } from './join-gang-form'

const meta = {
  title: 'Gangs/JoinGangForm',
  component: JoinGangForm,
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
} satisfies Meta<typeof JoinGangForm>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default -- empty form                                               */
/* ------------------------------------------------------------------ */

export const Default: Story = {}

/* ------------------------------------------------------------------ */
/* WithCode -- valid code entered                                      */
/* ------------------------------------------------------------------ */

export const WithCode: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Invite code')
    await userEvent.type(input, 'XK42AB')

    const button = canvas.getByRole('button', { name: /join gang/i })
    await expect(button).toBeEnabled()
  },
}

/* ------------------------------------------------------------------ */
/* Loading -- submitting state with a never-resolving action            */
/* ------------------------------------------------------------------ */

export const Loading: Story = {
  args: {
    action: fn().mockImplementation(
      () => new Promise(() => {}), // never resolves -- keeps spinner visible
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Invite code')
    await userEvent.type(input, 'XK42AB')

    const button = canvas.getByRole('button', { name: /join gang/i })
    await userEvent.click(button)
  },
}

/* ------------------------------------------------------------------ */
/* SuccessApproved -- "You're in!" toast (auto-accept on)              */
/* ------------------------------------------------------------------ */

export const SuccessApproved: Story = {
  args: {
    action: fn().mockResolvedValue({
      success: true,
      data: { gangId: 'gang-abc', status: 'approved' },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Invite code')
    await userEvent.type(input, 'XK42AB')

    const button = canvas.getByRole('button', { name: /join gang/i })
    await userEvent.click(button)
  },
}

/* ------------------------------------------------------------------ */
/* SuccessPending -- "Request sent" toast (auto-accept off)            */
/* ------------------------------------------------------------------ */

export const SuccessPending: Story = {
  args: {
    action: fn().mockResolvedValue({
      success: true,
      data: { gangId: 'gang-abc', status: 'pending' },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Invite code')
    await userEvent.type(input, 'XK42AB')

    const button = canvas.getByRole('button', { name: /join gang/i })
    await userEvent.click(button)
  },
}

/* ------------------------------------------------------------------ */
/* InvalidCode -- validation error                                     */
/* ------------------------------------------------------------------ */

export const InvalidCode: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Invite code')
    // Type an invalid code (too short)
    await userEvent.type(input, 'AB')

    const button = canvas.getByRole('button', { name: /join gang/i })
    await expect(button).toBeDisabled()
  },
}

/* ------------------------------------------------------------------ */
/* GangFull -- gang full error from server action                      */
/* ------------------------------------------------------------------ */

export const GangFull: Story = {
  args: {
    action: fn().mockResolvedValue({
      success: false as const,
      error: 'This gang has reached its maximum of 20 members',
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Invite code')
    await userEvent.type(input, 'XK42AB')

    const button = canvas.getByRole('button', { name: /join gang/i })
    await userEvent.click(button)

    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'This gang has reached its maximum of 20 members',
    )
  },
}

/* ------------------------------------------------------------------ */
/* Blocked -- blocked error from server action                         */
/* ------------------------------------------------------------------ */

export const Blocked: Story = {
  args: {
    action: fn().mockResolvedValue({
      success: false as const,
      error: 'You are not able to join this gang',
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Invite code')
    await userEvent.type(input, 'XK42AB')

    const button = canvas.getByRole('button', { name: /join gang/i })
    await userEvent.click(button)

    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'You are not able to join this gang',
    )
  },
}
