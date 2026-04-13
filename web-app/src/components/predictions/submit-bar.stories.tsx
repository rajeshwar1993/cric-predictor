import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import { SubmitBar } from './submit-bar'

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Predictions/SubmitBar',
  component: SubmitBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    pickedCount: 0,
    totalCount: 19,
    onSubmit: fn(),
    submitState: 'idle',
    disabled: true,
  },
} satisfies Meta<typeof SubmitBar>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Disabled — 0 picks made, button is disabled. */
export const Disabled: Story = {}

/** Partial — some picks made, button is enabled. */
export const Partial: Story = {
  args: {
    pickedCount: 10,
    disabled: false,
  },
}

/** Full — all picks made. */
export const Full: Story = {
  args: {
    pickedCount: 19,
    disabled: false,
  },
}

/** Submitting — loading state with spinner. */
export const Submitting: Story = {
  args: {
    pickedCount: 19,
    submitState: 'saving',
    disabled: false,
  },
}

/** Saved — confirmation state with checkmark and pop animation. */
export const Saved: Story = {
  args: {
    pickedCount: 19,
    submitState: 'saved',
    disabled: false,
  },
}
