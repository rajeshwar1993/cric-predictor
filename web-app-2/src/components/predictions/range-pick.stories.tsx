import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { RangePick } from './range-pick'
import { useState } from 'react'

const meta = {
  title: 'Predictions/RangePick',
  component: RangePick,
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
} satisfies Meta<typeof RangePick>

export default meta
type Story = StoryObj<typeof meta>

const scoreOptions = ['<140', '140-159', '160-179', '180-199', '200+']
const wicketOptions = ['0', '1', '2', '3', '4+']

export const Default: Story = {
  args: {
    options: scoreOptions,
    value: null,
    onChange: () => {},
  },
}

export const WithSelection: Story = {
  args: {
    options: scoreOptions,
    value: '160-179',
    onChange: () => {},
  },
}

export const Disabled: Story = {
  args: {
    options: scoreOptions,
    value: '180-199',
    onChange: () => {},
    disabled: true,
  },
}

export const WicketOptions: Story = {
  args: {
    options: wicketOptions,
    value: null,
    onChange: () => {},
  },
}

export const Interactive: Story = {
  args: {
    options: scoreOptions,
    value: null,
    onChange: () => {},
  },
  render: () => {
    const [value, setValue] = useState<string | null>(null)
    return <RangePick options={scoreOptions} value={value} onChange={setValue} />
  },
}
