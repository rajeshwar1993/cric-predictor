import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ScenarioGroup } from './scenario-group'
import { ScenarioCard } from './scenario-card'

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Predictions/ScenarioGroup',
  component: ScenarioGroup,
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
} satisfies Meta<typeof ScenarioGroup>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Toss group — single scenario. */
export const TossGroup: Story = {
  args: {
    phase: 'toss',
    label: 'TOSS',
    children: (
      <ScenarioCard
        title="Who will win the toss?"
        pointsWeight={10}
        isPicked={false}
      />
    ),
  },
}

/** Match End group — multiple scenarios. */
export const MatchEndGroup: Story = {
  args: {
    phase: 'end',
    label: 'MATCH END',
    children: (
      <>
        <ScenarioCard
          title="Who will win the match?"
          pointsWeight={25}
          isPicked={true}
        >
          <div className="rounded-md bg-mid-concrete px-3 py-2 text-body-sm text-text-secondary">
            Chennai Super Kings
          </div>
        </ScenarioCard>
        <ScenarioCard
          title="Total match runs?"
          description="Predict the combined total of both innings"
          pointsWeight={15}
          isPicked={false}
        />
        <ScenarioCard
          title="Total match sixes?"
          pointsWeight={10}
          isPicked={false}
        />
        <ScenarioCard
          title="Total match wickets?"
          pointsWeight={10}
          isPicked={true}
        >
          <div className="rounded-md bg-mid-concrete px-3 py-2 text-body-sm text-text-secondary">
            13-16
          </div>
        </ScenarioCard>
        <ScenarioCard
          title="Will there be a super over?"
          pointsWeight={30}
          isPicked={false}
        />
      </>
    ),
  },
}

/** All phase groups — full predict page preview. */
export const AllGroups: Story = {
  args: {
    phase: 'toss',
    label: 'TOSS',
    children: null,
  },
  render: () => (
    <div className="flex flex-col gap-8">
      <ScenarioGroup phase="toss" label="TOSS">
        <ScenarioCard
          title="Who will win the toss?"
          pointsWeight={10}
          isPicked={true}
        >
          <div className="rounded-md bg-mid-concrete px-3 py-2 text-body-sm text-text-secondary">
            MI
          </div>
        </ScenarioCard>
      </ScenarioGroup>

      <ScenarioGroup phase="first_wicket" label="FIRST WICKET">
        <ScenarioCard
          title="First wicket in which over?"
          description="Predict the over when the first wicket falls"
          pointsWeight={15}
          isPicked={false}
        />
      </ScenarioGroup>

      <ScenarioGroup phase="team_powerplay_end" label="POWERPLAY">
        <ScenarioCard
          title="MI powerplay runs?"
          pointsWeight={10}
          isPicked={false}
        />
        <ScenarioCard
          title="CSK powerplay runs?"
          pointsWeight={10}
          isPicked={false}
        />
      </ScenarioGroup>

      <ScenarioGroup phase="mid_match" label="DURING MATCH">
        <ScenarioCard
          title="Will there be a fifty scored?"
          pointsWeight={10}
          isPicked={true}
        >
          <div className="rounded-md bg-mid-concrete px-3 py-2 text-body-sm text-text-secondary">
            Yes
          </div>
        </ScenarioCard>
      </ScenarioGroup>

      <ScenarioGroup phase="end" label="MATCH END">
        <ScenarioCard
          title="Who will win the match?"
          pointsWeight={25}
          isPicked={false}
        />
        <ScenarioCard
          title="Total match sixes?"
          pointsWeight={10}
          isPicked={false}
        />
      </ScenarioGroup>

      <ScenarioGroup phase="post_match" label="POST MATCH">
        <ScenarioCard
          title="Player of the match?"
          description="Select the player you think will be awarded POTM"
          pointsWeight={20}
          isPicked={false}
        />
      </ScenarioGroup>
    </div>
  ),
}

/** First wicket group — single scenario with description. */
export const FirstWicketGroup: Story = {
  args: {
    phase: 'first_wicket',
    label: 'FIRST WICKET',
    children: (
      <ScenarioCard
        title="First wicket in which over?"
        description="Predict the over when the first wicket falls"
        pointsWeight={15}
        isPicked={false}
      />
    ),
  },
}

/** Powerplay group — two scenarios (home + away). */
export const PowerplayGroup: Story = {
  args: {
    phase: 'team_powerplay_end',
    label: 'POWERPLAY',
    children: (
      <>
        <ScenarioCard
          title="MI powerplay runs?"
          pointsWeight={10}
          isPicked={true}
        >
          <div className="rounded-md bg-mid-concrete px-3 py-2 text-body-sm text-text-secondary">
            45-55
          </div>
        </ScenarioCard>
        <ScenarioCard
          title="CSK powerplay runs?"
          pointsWeight={10}
          isPicked={false}
        />
      </>
    ),
  },
}
