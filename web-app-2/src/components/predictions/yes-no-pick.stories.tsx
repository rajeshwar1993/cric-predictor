import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { YesNoPick } from './yes-no-pick'
import { useState } from 'react'

const meta = {
  title: 'Predictions/YesNoPick',
  component: YesNoPick,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof YesNoPick>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    value: null,
    onChange: () => {},
  },
}

export const YesSelected: Story = {
  args: {
    value: 'yes',
    onChange: () => {},
  },
}

export const NoSelected: Story = {
  args: {
    value: 'no',
    onChange: () => {},
  },
}

export const Disabled: Story = {
  args: {
    value: 'yes',
    onChange: () => {},
    disabled: true,
  },
}

export const Interactive: Story = {
  args: {
    value: null,
    onChange: () => {},
  },
  render: () => {
    const [value, setValue] = useState<string | null>(null)
    return <YesNoPick value={value} onChange={setValue} />
  },
}
