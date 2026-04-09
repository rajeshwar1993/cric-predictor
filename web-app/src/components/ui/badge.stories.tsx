import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Badge } from './badge'

const meta = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'lime',
        'coral',
        'yellow',
        'purple',
        'blue',
        'outline',
      ],
    },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Individual variants                                                 */
/* ------------------------------------------------------------------ */

export const Default: Story = {
  args: {
    children: 'Default',
    variant: 'default',
  },
}

export const Lime: Story = {
  args: {
    children: 'Live',
    variant: 'lime',
  },
}

export const Coral: Story = {
  args: {
    children: 'Incorrect',
    variant: 'coral',
  },
}

export const Yellow: Story = {
  args: {
    children: 'Upcoming',
    variant: 'yellow',
  },
}

export const Purple: Story = {
  args: {
    children: 'Rare',
    variant: 'purple',
  },
}

export const Blue: Story = {
  args: {
    children: 'Info',
    variant: 'blue',
  },
}

export const Outline: Story = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
}

/* ------------------------------------------------------------------ */
/* All variants row                                                    */
/* ------------------------------------------------------------------ */

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant="default">Pending</Badge>
      <Badge variant="lime">Live</Badge>
      <Badge variant="coral">Loss</Badge>
      <Badge variant="yellow">Upcoming</Badge>
      <Badge variant="purple">Rare</Badge>
      <Badge variant="blue">Info</Badge>
      <Badge variant="outline">Draft</Badge>
    </div>
  ),
}

/* ------------------------------------------------------------------ */
/* Usage context — real labels used in the app                         */
/* ------------------------------------------------------------------ */

export const UsageContext: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-caption mb-3 text-text-secondary">Match Status</p>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="lime">Live</Badge>
          <Badge variant="yellow">Upcoming</Badge>
          <Badge variant="default">Completed</Badge>
        </div>
      </div>

      <div>
        <p className="text-caption mb-3 text-text-secondary">
          Prediction Results
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="lime">Correct</Badge>
          <Badge variant="coral">Incorrect</Badge>
          <Badge variant="default">Pending</Badge>
        </div>
      </div>

      <div>
        <p className="text-caption mb-3 text-text-secondary">Special</p>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="lime">Featured</Badge>
          <Badge variant="purple">Rare</Badge>
          <Badge variant="blue">Info</Badge>
          <Badge variant="outline">Draft</Badge>
        </div>
      </div>
    </div>
  ),
}
