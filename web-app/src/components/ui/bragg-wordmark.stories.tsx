import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { BraggWordmark } from './bragg-wordmark'

const meta = {
  title: 'UI/BraggWordmark',
  component: BraggWordmark,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="bg-concrete-black p-8 text-text-primary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BraggWordmark>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — lime tone, decorative <p>                                 */
/* ------------------------------------------------------------------ */

export const Default: Story = {}

/* ------------------------------------------------------------------ */
/* Heading — `as="h1"` for pages where the wordmark IS the title       */
/* ------------------------------------------------------------------ */

export const Heading: Story = {
  args: {
    as: 'h1',
  },
}

/* ------------------------------------------------------------------ */
/* Primary tone — for standalone surfaces like the login form          */
/* ------------------------------------------------------------------ */

export const PrimaryTone: Story = {
  args: {
    as: 'h1',
    tone: 'primary',
  },
}

/* ------------------------------------------------------------------ */
/* Decorative — sibling heading carries the title                      */
/* ------------------------------------------------------------------ */

export const Decorative: Story = {
  args: {
    decorative: true,
  },
}
