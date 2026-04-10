import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { Switch } from './switch'
import { Label } from './label'

const meta = {
  title: 'UI/Switch',
  component: Switch,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    checked: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — off, uncontrolled                                         */
/* ------------------------------------------------------------------ */

export const Default: Story = {}

/* ------------------------------------------------------------------ */
/* Checked — on state                                                   */
/* ------------------------------------------------------------------ */

export const Checked: Story = {
  args: {
    defaultChecked: true,
  },
}

/* ------------------------------------------------------------------ */
/* Disabled — off                                                       */
/* ------------------------------------------------------------------ */

export const Disabled: Story = {
  args: {
    disabled: true,
  },
}

/* ------------------------------------------------------------------ */
/* DisabledChecked — on, but disabled                                   */
/* ------------------------------------------------------------------ */

export const DisabledChecked: Story = {
  args: {
    disabled: true,
    defaultChecked: true,
  },
}

/* ------------------------------------------------------------------ */
/* WithLabel — labelled toggle row                                      */
/* ------------------------------------------------------------------ */

export const WithLabel: Story = {
  render: function WithLabelStory() {
    const [checked, setChecked] = useState(true)
    return (
      <div className="flex w-[320px] items-center justify-between gap-3">
        <Label htmlFor="auto-accept-demo" className="flex-1 normal-case">
          Auto-accept join requests
        </Label>
        <Switch
          id="auto-accept-demo"
          checked={checked}
          onCheckedChange={setChecked}
        />
      </div>
    )
  },
}
