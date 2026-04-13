import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ScenarioCard } from './scenario-card'

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Predictions/ScenarioCard',
  component: ScenarioCard,
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
} satisfies Meta<typeof ScenarioCard>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Default — team selection scenario, not yet picked. */
export const TeamPick: Story = {
  args: {
    title: 'Who will win the toss?',
    points: 10,
    isPicked: false,
  },
}

/** Player selection scenario. */
export const PlayerPick: Story = {
  args: {
    title: 'Who will be the top scorer?',

    points: 20,
    isPicked: false,
  },
}

/** Range bracket selection scenario. */
export const Range: Story = {
  args: {
    title: 'Total match runs?',

    points: 15,
    isPicked: false,
  },
}

/** Yes/No toggle scenario. */
export const YesNo: Story = {
  args: {
    title: 'Will there be a fifty scored?',
    points: 10,
    isPicked: false,
  },
}

/** With selected answer — shows the picked indicator. */
export const Picked: Story = {
  args: {
    title: 'Who will win the toss?',
    points: 10,
    isPicked: true,
    children: (
      <div className="rounded-md bg-mid-concrete px-3 py-2 text-body-sm text-text-secondary">
        Mumbai Indians
      </div>
    ),
  },
}

/** Without selected answer — no picked indicator. */
export const NotPicked: Story = {
  args: {
    title: 'First wicket in which over?',

    points: 15,
    isPicked: false,
  },
}

/** Showing high point value badge. */
export const WithPoints: Story = {
  args: {
    title: 'Who will win the match?',

    points: 25,
    isPicked: false,
  },
}

/** With description and picker children. */
export const WithPickerPlaceholder: Story = {
  args: {
    title: 'Total match sixes?',

    points: 10,
    isPicked: false,
    children: (
      <div className="flex gap-2">
        {['0-8', '9-12', '13-16', '17+'].map((range) => (
          <button
            key={range}
            className="rounded-md border border-wire bg-mid-concrete px-3 py-2 text-body-sm text-text-secondary hover:border-bragg-lime"
          >
            {range}
          </button>
        ))}
      </div>
    ),
  },
}

/** Picked with previous submission value displayed. */
export const PreviouslySubmitted: Story = {
  args: {
    title: 'Will there be a super over?',
    points: 30,
    isPicked: true,
    children: (
      <div className="rounded-md bg-mid-concrete px-3 py-2 text-body-sm text-text-secondary">
        No
      </div>
    ),
  },
}
