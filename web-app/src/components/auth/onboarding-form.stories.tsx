import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, within, userEvent } from 'storybook/test'
import { OnboardingForm } from './onboarding-form'

const meta = {
  title: 'Auth/OnboardingForm',
  component: OnboardingForm,
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
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OnboardingForm>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — empty form                                                */
/* ------------------------------------------------------------------ */

export const Default: Story = {
  args: {},
}

/* ------------------------------------------------------------------ */
/* Filled — all fields populated                                       */
/* ------------------------------------------------------------------ */

export const Filled: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const nameInput = canvas.getByLabelText('Display name')
    await userEvent.type(nameInput, 'Virat Fan 18')

    const dobInput = canvas.getByLabelText('Date of birth')
    await userEvent.type(dobInput, '1995-06-15')

    const checkbox = canvas.getByRole('checkbox')
    await userEvent.click(checkbox)
  },
}

/* ------------------------------------------------------------------ */
/* ValidationErrors — display name too short, DOB missing, terms off   */
/* ------------------------------------------------------------------ */

export const ValidationErrors: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Type a single character for display name (too short)
    const nameInput = canvas.getByLabelText('Display name')
    await userEvent.type(nameInput, 'A')

    // Submit without filling other fields
    const submitButton = canvas.getByRole('button', { name: /get started/i })
    await userEvent.click(submitButton)

    // Verify validation errors appear
    await expect(canvas.getByText('Display name must be at least 2 characters')).toBeInTheDocument()
    await expect(canvas.getByText('Date of birth is required')).toBeInTheDocument()
    await expect(
      canvas.getByText('You must accept the Terms of Service and Privacy Policy'),
    ).toBeInTheDocument()
  },
}

/* ------------------------------------------------------------------ */
/* Loading — submitting state (simulated)                              */
/* ------------------------------------------------------------------ */

function LoadingState() {
  return (
    <form noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="loading-name"
          className="text-caption flex items-center gap-2 text-text-secondary select-none"
        >
          Display name
        </label>
        <input
          id="loading-name"
          type="text"
          value="Virat Fan 18"
          readOnly
          disabled
          className="flex h-12 w-full min-w-0 rounded-md border-2 border-wire bg-dark-concrete px-4 font-body text-base text-text-primary opacity-50 outline-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="loading-dob"
          className="text-caption flex items-center gap-2 text-text-secondary select-none"
        >
          Date of birth
        </label>
        <input
          id="loading-dob"
          type="date"
          value="1995-06-15"
          readOnly
          disabled
          className="flex h-12 w-full min-w-0 rounded-md border-2 border-wire bg-dark-concrete px-4 font-body text-base text-text-primary opacity-50 outline-none"
        />
      </div>

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
          I agree to the Terms of Service and Privacy Policy
        </span>
      </div>

      <button
        type="submit"
        disabled
        className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-dark-concrete px-6 font-body text-sm font-bold uppercase tracking-[0.08em] text-text-muted disabled:pointer-events-none disabled:cursor-not-allowed"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-spin"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        Setting up...
      </button>
    </form>
  )
}

export const Loading: Story = {
  render: () => <LoadingState />,
}

/* ------------------------------------------------------------------ */
/* UnderAge — shows age restriction error                              */
/* ------------------------------------------------------------------ */

export const UnderAge: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const nameInput = canvas.getByLabelText('Display name')
    await userEvent.type(nameInput, 'Young Player')

    // Enter a date that makes the user under 18
    const dobInput = canvas.getByLabelText('Date of birth')
    await userEvent.type(dobInput, '2015-01-01')

    const checkbox = canvas.getByRole('checkbox')
    await userEvent.click(checkbox)

    const submitButton = canvas.getByRole('button', { name: /get started/i })
    await userEvent.click(submitButton)

    // Verify age error appears
    await expect(
      canvas.getByText('You must be 18 or older to use Bragg'),
    ).toBeInTheDocument()
  },
}
