import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn, userEvent, within, expect } from 'storybook/test'
import { InviteShare } from './invite-share'

const meta = {
  title: 'Gangs/InviteShare',
  component: InviteShare,
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
} satisfies Meta<typeof InviteShare>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — copy + share buttons                                      */
/* ------------------------------------------------------------------ */

export const Default: Story = {
  args: {
    inviteUrl: 'https://bragg.app/join/XK42AB',
    inviteCode: 'XK42AB',
    gangName: 'Mumbai Mavericks',
    inviterName: 'Raj',
  },
}

/* ------------------------------------------------------------------ */
/* Copied — "Copied!" feedback state after clicking copy button        */
/* ------------------------------------------------------------------ */

export const Copied: Story = {
  args: {
    inviteUrl: 'https://bragg.app/join/XK42AB',
    inviteCode: 'XK42AB',
    gangName: 'Mumbai Mavericks',
    inviterName: 'Raj',
  },
  play: async ({ canvasElement }) => {
    const mockWriteText = fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    })
    const canvas = within(canvasElement)
    const copyButton = canvas.getByRole('button', { name: /copy/i })
    await userEvent.click(copyButton)
    await expect(canvas.getByText(/copied/i)).toBeInTheDocument()
  },
}

/* ------------------------------------------------------------------ */
/* NoShareAPI — desktop fallback (no share button visible)             */
/* Note: On desktop browsers without navigator.share, the Share        */
/* button is automatically hidden by the component.                    */
/* ------------------------------------------------------------------ */

export const NoShareAPI: Story = {
  args: {
    inviteUrl: 'https://bragg.app/join/XK42AB',
    inviteCode: 'XK42AB',
    gangName: 'Delhi Dynamos',
    inviterName: 'Virat',
  },
}
