import type { Meta, StoryObj } from "@storybook/react";
import { SeasonStandings } from "./season-standings";
import { MOCK_SEASON_STANDINGS } from "@/__mocks__/data";

const meta = {
  title: "Leaderboard/SeasonStandings",
  component: SeasonStandings,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof SeasonStandings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    entries: MOCK_SEASON_STANDINGS,
    currentUserId: "user-002",
  },
};

export const Empty: Story = {
  args: {
    entries: [],
    currentUserId: "user-001",
  },
};
