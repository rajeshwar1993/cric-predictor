import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { YesNoPicker } from './yes-no-picker'

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Predictions/YesNoPicker',
  component: YesNoPicker,
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
    value: '',
    onChange: () => {},
  },
} satisfies Meta<typeof YesNoPicker>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** No selection — neither yes nor no picked. */
export const NoSelection: Story = {
  args: {
    value: '',
  },
}

/** "Yes" selected. */
export const YesSelected: Story = {
  args: {
    value: 'Yes',
  },
}

/** "No" selected. */
export const NoSelected: Story = {
  args: {
    value: 'No',
  },
}

/** Disabled state — cannot interact. */
export const Disabled: Story = {
  args: {
    value: 'Yes',
    disabled: true,
  },
}

/** Interactive — click to toggle between yes and no. */
export const Interactive: Story = {
  render: function InteractiveYesNoPicker() {
    const [value, setValue] = useState('')
    return <YesNoPicker value={value} onChange={setValue} />
  },
}
