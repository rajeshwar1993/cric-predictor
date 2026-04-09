import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, within, userEvent } from 'storybook/test'
import { Loader2 } from 'lucide-react'
import { AcceptTermsForm } from './accept-terms-form'

const meta = {
  title: 'Auth/AcceptTermsForm',
  component: AcceptTermsForm,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-[400px] rounded-2xl border border-wire bg-dark-concrete p-6">
        <p className="text-body-sm mb-6 text-text-secondary">
          We&apos;ve made changes to our{' '}
          <a href="/terms" className="text-vivid-blue underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-vivid-blue underline">
            Privacy Policy
          </a>
          . Please review and accept to continue.
        </p>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AcceptTermsForm>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — unchecked, button disabled                                */
/* ------------------------------------------------------------------ */

export const Default: Story = {
  args: {},
}

/* ------------------------------------------------------------------ */
/* Checked — checkbox checked, button enabled                          */
/* ------------------------------------------------------------------ */

export const Checked: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const checkbox = canvas.getByRole('checkbox')
    await userEvent.click(checkbox)

    const button = canvas.getByRole('button', { name: /continue/i })
    await expect(button).toBeEnabled()
  },
}

/* ------------------------------------------------------------------ */
/* Loading — submitting state (simulated)                              */
/* ------------------------------------------------------------------ */

function LoadingState() {
  return (
    <form noValidate className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 size-4 shrink-0 rounded-[4px] border-2 border-bragg-lime bg-bragg-lime opacity-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text-on-primary"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <span className="text-body-sm leading-snug text-text-secondary">
          I accept the updated Terms of Service and Privacy Policy
        </span>
      </div>

      <button
        type="submit"
        disabled
        className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-dark-concrete px-6 font-body text-sm font-bold uppercase tracking-[0.08em] text-text-muted disabled:pointer-events-none disabled:cursor-not-allowed"
      >
        <Loader2 className="size-4 animate-spin" />
        Updating...
      </button>
    </form>
  )
}

export const Loading: Story = {
  render: () => <LoadingState />,
}
