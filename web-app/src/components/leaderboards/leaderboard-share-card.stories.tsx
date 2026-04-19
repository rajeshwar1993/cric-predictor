import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { LeaderboardShareCardPreview } from './leaderboard-share-card'
import type { LeaderboardShareCardData } from './leaderboard-share-card'

const meta = {
  title: 'Leaderboards/LeaderboardShareCard',
  component: LeaderboardShareCardPreview,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'concrete-black',
      values: [{ name: 'concrete-black', value: '#111111' }],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LeaderboardShareCardPreview>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Shared data helpers                                                  */
/* ------------------------------------------------------------------ */

function makeCardData(overrides: Partial<LeaderboardShareCardData> = {}): LeaderboardShareCardData {
  return {
    rank: 1,
    displayName: 'CricketKing',
    correctCount: 14,
    totalScenarios: 19,
    points: 94,
    matchTitle: 'MI vs CSK',
    matchNumber: 32,
    gangName: 'The Dugout',
    memberCount: 8,
    seasonName: 'IPL 2026',
    ...overrides,
  }
}

/* ------------------------------------------------------------------ */
/* Stories                                                              */
/* ------------------------------------------------------------------ */

/** Rank #1 — sunburst-yellow badge, "Top of the table" headline */
export const Rank1: Story = {
  args: makeCardData({ rank: 1 }),
}

/** Rank #2 — bragg-lime badge, "On the podium" headline */
export const Rank2: Story = {
  args: makeCardData({
    rank: 2,
    displayName: 'BollerBhai',
    correctCount: 12,
    points: 82,
    matchTitle: 'RCB vs DC',
    matchNumber: 38,
  }),
}

/** Rank #3 — bragg-lime badge, "On the podium" headline */
export const Rank3: Story = {
  args: makeCardData({
    rank: 3,
    displayName: 'MS Dhoni',
    correctCount: 11,
    points: 76,
  }),
}

/** Rank #5 — neutral badge, "In the mix" headline */
export const Rank5: Story = {
  args: makeCardData({
    rank: 5,
    displayName: 'PredictorPro',
    correctCount: 9,
    points: 58,
    matchTitle: 'KKR vs SRH',
    matchNumber: 55,
    gangName: 'Gully Cricket',
    memberCount: 12,
  }),
}

/** Long display name — verifies CSS truncation */
export const LongName: Story = {
  args: makeCardData({
    rank: 2,
    displayName: 'SuperMegaUltraCricketPredictionMaster',
    gangName: 'The Super Long Gang Name That Goes On Forever',
    memberCount: 15,
  }),
}

/** Solo gang — 1 member */
export const SoloGang: Story = {
  args: makeCardData({
    rank: 1,
    memberCount: 1,
    gangName: 'Just Me',
  }),
}

/** Perfect score — all scenarios correct */
export const PerfectScore: Story = {
  args: makeCardData({
    rank: 1,
    correctCount: 19,
    totalScenarios: 19,
    points: 120,
    displayName: 'Nostradamus',
    matchTitle: 'GT vs LSG',
    matchNumber: 60,
  }),
}

/** Low score */
export const LowScore: Story = {
  args: makeCardData({
    rank: 8,
    correctCount: 3,
    totalScenarios: 19,
    points: 18,
    displayName: 'TryHarder',
    gangName: 'Bottom Feeders',
    memberCount: 8,
  }),
}
