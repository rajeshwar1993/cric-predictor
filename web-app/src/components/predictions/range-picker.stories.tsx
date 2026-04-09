import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { RangePicker } from './range-picker'

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Predictions/RangePicker',
  component: RangePicker,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '480px', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    options: ['<140', '140-159', '160-179', '180-199', '200+'],
    value: '',
    onChange: () => {},
  },
} satisfies Meta<typeof RangePicker>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Five options — typical innings score range. */
export const FiveOptions: Story = {
  args: {
    options: ['<140', '140-159', '160-179', '180-199', '200+'],
    value: '',
  },
}

/** Three options — fewer brackets. */
export const ThreeOptions: Story = {
  args: {
    options: ['0-8', '9-12', '13+'],
    value: '',
  },
}

/** One option selected. */
export const Selected: Story = {
  args: {
    options: ['<140', '140-159', '160-179', '180-199', '200+'],
    value: '160-179',
  },
}

/** Disabled state — cannot interact. */
export const Disabled: Story = {
  args: {
    options: ['<140', '140-159', '160-179', '180-199', '200+'],
    value: '180-199',
    disabled: true,
  },
}

/** Interactive — click to select a range. */
export const Interactive: Story = {
  render: function InteractiveRangePicker() {
    const [value, setValue] = useState('')
    return (
      <RangePicker
        options={['<140', '140-159', '160-179', '180-199', '200+']}
        value={value}
        onChange={setValue}
      />
    )
  },
}
