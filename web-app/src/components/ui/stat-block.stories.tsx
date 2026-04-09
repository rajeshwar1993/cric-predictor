import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState, useEffect } from 'react'
import { StatBlock } from './stat-block'

const meta = {
  title: 'UI/StatBlock',
  component: StatBlock,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['default', 'sm'],
    },
    color: {
      control: 'color',
    },
  },
} satisfies Meta<typeof StatBlock>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Individual stories                                                   */
/* ------------------------------------------------------------------ */

export const Default: Story = {
  args: {
    value: '14/19',
    label: 'Correct',
  },
}

export const Rank: Story = {
  args: {
    value: '#1',
    label: 'Rank',
  },
}

export const Error: Story = {
  args: {
    value: '5',
    label: 'Wrong',
    color: 'var(--color-electric-coral)',
  },
}

export const Points: Story = {
  args: {
    value: '87',
    label: 'Points',
    color: 'var(--color-electric-coral)',
  },
}

export const SmallSize: Story = {
  args: {
    value: '3/5',
    label: 'Correct',
    size: 'sm',
  },
}

/* ------------------------------------------------------------------ */
/* Row — 4 stat blocks in a row (mimics design system screenshot)       */
/* ------------------------------------------------------------------ */

export const Row: Story = {
  args: {
    value: '14/19',
    label: 'Correct',
  },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <StatBlock value="14/19" label="Correct" />
      <StatBlock
        value="#1"
        label="Rank"
        color="var(--color-sunburst-yellow)"
      />
      <StatBlock
        value="5"
        label="Wrong"
        color="var(--color-electric-coral)"
      />
      <StatBlock
        value="87"
        label="Points"
        color="var(--color-ultraviolet)"
      />
    </div>
  ),
}

/* ------------------------------------------------------------------ */
/* Animated Update — shows score-pop animation                          */
/* ------------------------------------------------------------------ */

function AnimatedStatBlock() {
  const [score, setScore] = useState(14)

  useEffect(() => {
    const interval = setInterval(() => {
      setScore((prev) => (prev >= 19 ? 14 : prev + 1))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-caption text-text-muted">
        Value updates every 2 seconds — watch the pop animation
      </p>
      <StatBlock value={`${score}/19`} label="Correct" />
    </div>
  )
}

export const AnimatedUpdate: Story = {
  args: {
    value: '14/19',
    label: 'Correct',
  },
  render: () => <AnimatedStatBlock />,
}
