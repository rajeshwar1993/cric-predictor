import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn, userEvent, within, expect } from 'storybook/test'
import { ProfileInfo } from './profile-info'

const meta = {
  title: 'Profile/ProfileInfo',
  component: ProfileInfo,
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
    displayName: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    dateOfBirth: '1995-03-28',
    joinedAt: '2026-03-01T00:00:00Z',
    onUpdateDisplayName: fn().mockResolvedValue({ success: true }),
  },
} satisfies Meta<typeof ProfileInfo>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — display mode with name, email, DOB, joined date           */
/* ------------------------------------------------------------------ */

export const Default: Story = {}

/* ------------------------------------------------------------------ */
/* Editing — input shown with current value                            */
/* ------------------------------------------------------------------ */

export const Editing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Click the first "edit display name" button (the name itself is also
    // a button with the same accessible label).
    const editButton = canvas.getByRole('button', {
      name: /edit display name/i,
    })
    await userEvent.click(editButton)

    await expect(
      canvas.getByRole('textbox', { name: /display name/i }),
    ).toBeVisible()
  },
}

/* ------------------------------------------------------------------ */
/* ValidationError — server returns a "name too short" / collision     */
/* ------------------------------------------------------------------ */

export const ValidationError: Story = {
  args: {
    onUpdateDisplayName: fn().mockResolvedValue({
      success: false,
      error:
        "A member in 'Mumbai Mavericks' already has this name. Pick something different.",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const editButton = canvas.getByRole('button', {
      name: /edit display name/i,
    })
    await userEvent.click(editButton)

    const input = canvas.getByRole('textbox', { name: /display name/i })
    await userEvent.clear(input)
    await userEvent.type(input, 'Virat')

    const saveButton = canvas.getByRole('button', { name: /^save$/i })
    await userEvent.click(saveButton)

    await expect(canvas.getByRole('alert')).toBeVisible()
  },
}

/* ------------------------------------------------------------------ */
/* Saving — save in progress (never resolves)                          */
/* ------------------------------------------------------------------ */

export const Saving: Story = {
  args: {
    onUpdateDisplayName: fn().mockImplementation(
      () => new Promise(() => {}),
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const editButton = canvas.getByRole('button', {
      name: /edit display name/i,
    })
    await userEvent.click(editButton)

    const input = canvas.getByRole('textbox', { name: /display name/i })
    await userEvent.clear(input)
    await userEvent.type(input, 'New Name')

    const saveButton = canvas.getByRole('button', { name: /^save$/i })
    await userEvent.click(saveButton)
  },
}

/* ------------------------------------------------------------------ */
/* NoDateOfBirth — DOB row falls back to "Not set"                     */
/* ------------------------------------------------------------------ */

export const NoDateOfBirth: Story = {
  args: {
    dateOfBirth: null,
  },
}
