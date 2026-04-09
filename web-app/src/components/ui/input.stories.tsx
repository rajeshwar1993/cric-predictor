import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Input } from './input'
import { Label } from './label'

const meta = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search'],
    },
    disabled: {
      control: 'boolean',
    },
    placeholder: {
      control: 'text',
    },
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default                                                             */
/* ------------------------------------------------------------------ */

export const Default: Story = {
  args: {
    placeholder: 'Enter your name...',
    type: 'text',
  },
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <Story />
      </div>
    ),
  ],
}

/* ------------------------------------------------------------------ */
/* Focused (click to see focus ring)                                   */
/* ------------------------------------------------------------------ */

export const Focused: Story = {
  args: {
    placeholder: 'Click me to see focus state...',
    autoFocus: true,
  },
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <Story />
      </div>
    ),
  ],
}

/* ------------------------------------------------------------------ */
/* With Value                                                          */
/* ------------------------------------------------------------------ */

export const WithValue: Story = {
  args: {
    defaultValue: 'rajesh.kumar@example.com',
    type: 'email',
  },
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <Story />
      </div>
    ),
  ],
}

/* ------------------------------------------------------------------ */
/* Error (via aria-invalid)                                            */
/* ------------------------------------------------------------------ */

export const Error: Story = {
  args: {
    defaultValue: 'invalid-email',
    'aria-invalid': true,
    type: 'email',
  },
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <p className="text-caption mb-2 text-text-secondary">
          Using aria-invalid for error state
        </p>
        <Story />
        <p className="mt-2 text-xs text-electric-coral">
          Please enter a valid email address.
        </p>
      </div>
    ),
  ],
}

/* ------------------------------------------------------------------ */
/* Error (via data-error)                                              */
/* ------------------------------------------------------------------ */

export const ErrorDataAttribute: Story = {
  render: () => (
    <div className="w-[320px]">
      <p className="text-caption mb-2 text-text-secondary">
        Using data-error attribute for error state
      </p>
      <Input defaultValue="bad-value" data-error="true" />
      <p className="mt-2 text-xs text-electric-coral">
        This field has an error.
      </p>
    </div>
  ),
}

/* ------------------------------------------------------------------ */
/* Disabled                                                            */
/* ------------------------------------------------------------------ */

export const Disabled: Story = {
  args: {
    defaultValue: 'Cannot edit this',
    disabled: true,
  },
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <Story />
      </div>
    ),
  ],
}

/* ------------------------------------------------------------------ */
/* With Label                                                          */
/* ------------------------------------------------------------------ */

export const WithLabel: Story = {
  render: () => (
    <div className="flex w-[320px] flex-col gap-2">
      <Label htmlFor="email-input">Email Address</Label>
      <Input
        id="email-input"
        type="email"
        placeholder="you@example.com"
      />
    </div>
  ),
}

/* ------------------------------------------------------------------ */
/* With Label and Error                                                */
/* ------------------------------------------------------------------ */

export const WithLabelAndError: Story = {
  render: () => (
    <div className="flex w-[320px] flex-col gap-2">
      <Label htmlFor="error-input">Gang Name</Label>
      <Input
        id="error-input"
        defaultValue="A"
        aria-invalid
        aria-describedby="error-message"
      />
      <p id="error-message" className="text-xs text-electric-coral">
        Gang name must be at least 3 characters.
      </p>
    </div>
  ),
}
