import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Input } from './input'

const meta = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    placeholder: 'Enter your display name…',
  },
}

export const WithValue: Story = {
  args: {
    defaultValue: 'CricketFan99',
  },
}

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
  },
}

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password…',
  },
}

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'you@example.com',
  },
}
