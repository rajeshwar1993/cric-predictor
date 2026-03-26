import type { Meta, StoryObj } from "@storybook/react";
import { MatchLeaderboard } from "./match-leaderboard";
import { MOCK_MATCH_LEADERBOARD } from "@/__mocks__/data";

const meta = {
  title: "Leaderboard/MatchLeaderboard",
  component: MatchLeaderboard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof MatchLeaderboard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    entries: MOCK_MATCH_LEADERBOARD,
    currentUserId: "user-001",
  },
};

export const Empty: Story = {
  args: {
    entries: [],
    currentUserId: "user-001",
  },
};
