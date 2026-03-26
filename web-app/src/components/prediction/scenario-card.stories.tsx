import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { ScenarioCard } from "./scenario-card";
import { MOCK_SCENARIOS, MOCK_PLAYERS } from "@/__mocks__/data";

const meta = {
  title: "Prediction/ScenarioCard",
  component: ScenarioCard,
  tags: ["autodocs"],
  args: {
    teamA: "CSK",
    teamB: "MI",
    players: MOCK_PLAYERS,
    value: null,
    onChange: fn(),
    disabled: false,
  },
} satisfies Meta<typeof ScenarioCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** match_winner — renders TeamPick */
export const TeamWinner: Story = {
  args: {
    scenario: MOCK_SCENARIOS[0], // sc-01: "Who will win?"
  },
};

/** first_innings_score — renders RangePick */
export const RangeBracket: Story = {
  args: {
    scenario: MOCK_SCENARIOS[5], // sc-06: "First Innings Score?"
  },
};

/** batsman_fifty — renders YesNoPick */
export const YesNo: Story = {
  args: {
    scenario: MOCK_SCENARIOS[8], // sc-09: "Will any batsman score 50+?"
  },
};

/** top_scorer — renders PlayerPick */
export const PlayerPick: Story = {
  args: {
    scenario: MOCK_SCENARIOS[2], // sc-03: "Top Scorer?"
  },
};
