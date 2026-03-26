import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { TeamPick } from "./team-pick";

const meta = {
  title: "Prediction/TeamPick",
  component: TeamPick,
  tags: ["autodocs"],
  args: {
    teamA: "CSK",
    teamB: "MI",
    onChange: fn(),
  },
} satisfies Meta<typeof TeamPick>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: null,
  },
};

export const CSKSelected: Story = {
  args: {
    value: "CSK",
  },
};

export const Disabled: Story = {
  args: {
    value: "MI",
    disabled: true,
  },
};
