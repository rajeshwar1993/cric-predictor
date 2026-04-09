import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ShareCard } from './share-card'

const meta = {
  title: 'UI/ShareCard',
  component: ShareCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'concrete-black',
      values: [{ name: 'concrete-black', value: '#111111' }],
    },
  },
} satisfies Meta<typeof ShareCard>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Stories                                                              */
/* ------------------------------------------------------------------ */

/** Rank 1 — gold/sunburst-yellow accent for the champion */
export const Rank1: Story = {
  args: {
    rank: 1,
    displayName: 'CricketKing',
    correctCount: 16,
    totalScenarios: 19,
    points: 94,
    matchTitle: 'MI vs CSK',
    matchNumber: 42,
    seasonName: 'IPL 2026',
  },
}

/** Rank 2 — lime accent for runner-up */
export const Rank2: Story = {
  args: {
    rank: 2,
    displayName: 'BollerBhai',
    correctCount: 14,
    totalScenarios: 19,
    points: 82,
    matchTitle: 'RCB vs DC',
    matchNumber: 38,
    seasonName: 'IPL 2026',
  },
}

/** Rank 5 — regular rank with lime accent */
export const Rank5: Story = {
  args: {
    rank: 5,
    displayName: 'PredictorPro',
    correctCount: 11,
    totalScenarios: 19,
    points: 65,
    matchTitle: 'KKR vs SRH',
    matchNumber: 55,
    seasonName: 'IPL 2026',
  },
}

/** Perfect score — all scenarios correct */
export const PerfectScore: Story = {
  args: {
    rank: 1,
    displayName: 'Nostradamus',
    correctCount: 19,
    totalScenarios: 19,
    points: 120,
    matchTitle: 'GT vs LSG',
    matchNumber: 60,
    seasonName: 'IPL 2026',
  },
}

/** Low score — only a few correct */
export const LowScore: Story = {
  args: {
    rank: 12,
    displayName: 'TryHarder',
    correctCount: 5,
    totalScenarios: 19,
    points: 28,
    matchTitle: 'PBKS vs RR',
    matchNumber: 15,
    seasonName: 'IPL 2026',
  },
}

/** Long name — verifies CSS truncation */
export const LongName: Story = {
  args: {
    rank: 3,
    displayName: 'SuperMegaUltraCricketPredictionMaster',
    correctCount: 13,
    totalScenarios: 19,
    points: 76,
    matchTitle: 'MI vs RCB',
    matchNumber: 7,
    seasonName: 'IPL 2026',
  },
}

/** Export preview — shows the card at a fixed size (what the PNG looks like) */
export const ExportPreview: Story = {
  args: {
    rank: 1,
    displayName: 'ChampionPlayer',
    correctCount: 17,
    totalScenarios: 19,
    points: 102,
    matchTitle: 'CSK vs MI',
    matchNumber: 74,
    seasonName: 'IPL 2026',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows the share card as it would appear when exported as a PNG — fixed at 320px width, square aspect ratio.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
}
