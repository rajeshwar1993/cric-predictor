import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import { toast } from './toast'
import { Toaster } from './toaster'
import { Button } from './button'

/**
 * Toast story wrapper — renders the Toaster provider so toast() calls work.
 */
function ToastDemo({ triggerToast }: { triggerToast: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <Toaster />
      <Button onClick={triggerToast}>Show Toast</Button>
    </div>
  )
}

const meta = {
  title: 'UI/Toast',
  component: ToastDemo,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof ToastDemo>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Individual type stories                                              */
/* ------------------------------------------------------------------ */

export const Success: Story = {
  args: {
    triggerToast: fn(() => {
      toast.success('Prediction saved!', {
        description: 'Good luck — results drop after the match.',
      })
    }),
  },
}

export const Error: Story = {
  args: {
    triggerToast: fn(() => {
      toast.error('Something went wrong', {
        description: 'We couldn\u2019t save your prediction. Please try again.',
      })
    }),
  },
}

export const Warning: Story = {
  args: {
    triggerToast: fn(() => {
      toast.warning('Deadline approaching', {
        description: 'Predictions close in 15 minutes.',
      })
    }),
  },
}

export const Info: Story = {
  args: {
    triggerToast: fn(() => {
      toast.info('Scores updating', {
        description: 'Live scores will refresh shortly.',
      })
    }),
  },
}

/* ------------------------------------------------------------------ */
/* Stacked — multiple toasts visible                                    */
/* ------------------------------------------------------------------ */

export const Stacked: Story = {
  args: {
    triggerToast: fn(() => {
      toast.success('Prediction saved!')
      setTimeout(() => toast.info('New match starting soon'), 300)
      setTimeout(() => toast.warning('Deadline in 5 minutes'), 600)
    }),
  },
}

/* ------------------------------------------------------------------ */
/* Auto-dismiss — shows timeout behavior                                */
/* ------------------------------------------------------------------ */

export const AutoDismiss: Story = {
  args: {
    triggerToast: fn(() => {
      toast.success('This will dismiss in 4 seconds', {
        description: 'Watch it disappear automatically.',
      })
    }),
  },
}
