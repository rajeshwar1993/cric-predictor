import type { Meta, StoryObj } from "@storybook/react";
import { ExpandablePicks } from "./expandable-picks";

const meta = {
  title: "Leaderboard/ExpandablePicks",
  component: ExpandablePicks,
  tags: ["autodocs"],
} satisfies Meta<typeof ExpandablePicks>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    userId: "user-001",
    groupId: "group-001",
    matchId: 1,
  },
};
