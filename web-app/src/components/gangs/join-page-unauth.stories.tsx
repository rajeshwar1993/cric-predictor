import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { JoinPageUnauth } from './join-page-unauth'

const meta = {
  title: 'Gangs/JoinPageUnauth',
  component: JoinPageUnauth,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof JoinPageUnauth>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — gang name + login form                                    */
/* ------------------------------------------------------------------ */

export const Default: Story = {
  args: {
    gangName: 'Mumbai Mavericks',
    inviteCode: 'XK42AB',
  },
}

/* ------------------------------------------------------------------ */
/* Long gang name — tests wrapping                                     */
/* ------------------------------------------------------------------ */

export const LongGangName: Story = {
  args: {
    gangName: 'The Super Duper Mega Ultra Cricket Prediction Masters',
    inviteCode: 'LONG01',
  },
}
