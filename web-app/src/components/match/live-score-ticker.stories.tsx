import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { LiveScoreTicker } from "./live-score-ticker";

const meta = {
  title: "Match/LiveScoreTicker",
  component: LiveScoreTicker,
  tags: ["autodocs"],
  args: {
    onUpdate: fn(),
  },
} satisfies Meta<typeof LiveScoreTicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LiveMatch: Story = {
  args: {
    matchId: 1,
    teamA: "RCB",
    teamB: "SRH",
    initialScoreA: "186/5",
    initialScoreB: "142/6",
    initialOversA: 20,
    initialOversB: 16.3,
    initialBattingTeam: "SRH",
    status: "live",
  },
};

export const NotLive: Story = {
  args: {
    matchId: 2,
    teamA: "CSK",
    teamB: "MI",
    initialScoreA: null,
    initialScoreB: null,
    initialOversA: null,
    initialOversB: null,
    initialBattingTeam: null,
    status: "upcoming",
  },
};
