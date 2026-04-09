import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, within, userEvent, fn } from 'storybook/test'
import { LoginForm } from './login-form'

const meta = {
  title: 'Auth/LoginForm',
  component: LoginForm,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-[400px] rounded-lg border border-wire bg-dark-concrete p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LoginForm>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — email input state                                         */
/* ------------------------------------------------------------------ */

export const Default: Story = {
  args: {},
}

/* ------------------------------------------------------------------ */
/* WithRedirect — has redirectTo param                                  */
/* ------------------------------------------------------------------ */

export const WithRedirect: Story = {
  args: {
    redirectTo: '/dashboard',
  },
}

/* ------------------------------------------------------------------ */
/* Sending — loading state (simulated via interaction)                  */
/* ------------------------------------------------------------------ */

export const Sending: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const emailInput = canvas.getByLabelText('Email address')
    const submitButton = canvas.getByRole('button', { name: /send magic link/i })

    await userEvent.type(emailInput, 'user@example.com')
    // Click submit to trigger sending state
    // Note: the form will call the real server action which will fail in Storybook,
    // but we can at least show the interaction
    await userEvent.click(submitButton)
  },
}

/* ------------------------------------------------------------------ */
/* Confirmation — check your email state                               */
/* ------------------------------------------------------------------ */

/**
 * Presentational wrapper to show the Confirmation state directly.
 * Since LoginForm manages its own state, we create a mock that
 * renders the confirmation layout.
 */
function ConfirmationState() {
  return (
    <div className="flex flex-col items-center gap-6 text-center" role="status" aria-live="polite">
      <div className="flex flex-col gap-2">
        <h2 className="text-h2 text-text-primary">Check your email</h2>
        <p className="text-body text-text-secondary">
          We sent a magic link to <strong className="text-text-primary">user@example.com</strong>
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border-2 border-wire bg-mid-concrete px-6 font-body text-sm font-bold uppercase tracking-[0.08em] text-text-primary transition-all duration-[150ms] ease-out outline-none hover:border-bragg-lime focus-visible:ring-[3px] focus-visible:ring-bragg-lime/50"
          onClick={fn()}
        >
          Resend magic link
        </button>

        <button
          type="button"
          className="text-body-sm text-vivid-blue transition-colors duration-[var(--duration-state)] hover:text-text-primary"
          onClick={fn()}
        >
          Use a different email
        </button>
      </div>
    </div>
  )
}

export const Confirmation: Story = {
  render: () => <ConfirmationState />,
}

/* ------------------------------------------------------------------ */
/* ResendCooldown — countdown visible                                   */
/* ------------------------------------------------------------------ */

function ResendCooldownState() {
  return (
    <div className="flex flex-col items-center gap-6 text-center" role="status" aria-live="polite">
      <div className="flex flex-col gap-2">
        <h2 className="text-h2 text-text-primary">Check your email</h2>
        <p className="text-body text-text-secondary">
          We sent a magic link to <strong className="text-text-primary">user@example.com</strong>
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          disabled
          className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-dark-concrete px-6 font-body text-sm font-bold uppercase tracking-[0.08em] text-text-muted transition-all duration-[150ms] ease-out outline-none disabled:pointer-events-none disabled:cursor-not-allowed"
        >
          Resend in 45s
        </button>

        <button
          type="button"
          className="text-body-sm text-vivid-blue transition-colors duration-[var(--duration-state)] hover:text-text-primary"
          onClick={fn()}
        >
          Use a different email
        </button>
      </div>
    </div>
  )
}

export const ResendCooldown: Story = {
  render: () => <ResendCooldownState />,
}

/* ------------------------------------------------------------------ */
/* Error — inline validation error                                     */
/* ------------------------------------------------------------------ */

export const Error: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const submitButton = canvas.getByRole('button', { name: /send magic link/i })

    // Submit with empty email to trigger validation error
    await userEvent.click(submitButton)

    // Verify the error message appears
    await expect(canvas.getByRole('alert')).toHaveTextContent('Email is required')
  },
}

/* ------------------------------------------------------------------ */
/* RateLimited — too many attempts message                             */
/* ------------------------------------------------------------------ */

function RateLimitedState() {
  return (
    <form noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="login-email-rl"
          className="text-caption flex items-center gap-2 text-text-secondary select-none"
        >
          Email address
        </label>
        <input
          id="login-email-rl"
          type="email"
          value="user@example.com"
          readOnly
          aria-invalid
          aria-describedby="login-email-rl-error"
          className="flex h-12 w-full min-w-0 rounded-md border-2 border-electric-coral bg-dark-concrete px-4 font-body text-base text-text-primary outline-none"
        />
        <p id="login-email-rl-error" className="text-body-sm text-electric-coral" role="alert">
          Too many attempts. Please try again later.
        </p>
      </div>

      <button
        type="submit"
        className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-bragg-lime px-6 font-body text-sm font-bold uppercase tracking-[0.08em] text-text-on-primary transition-all duration-[150ms] ease-out outline-none"
      >
        Send magic link
      </button>
    </form>
  )
}

export const RateLimited: Story = {
  render: () => <RateLimitedState />,
}
