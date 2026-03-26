import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { PlayerPick } from "./player-pick";
import { MOCK_PLAYERS } from "@/__mocks__/data";

const meta = {
  title: "Prediction/PlayerPick",
  component: PlayerPick,
  tags: ["autodocs"],
  args: {
    players: MOCK_PLAYERS,
    onChange: fn(),
  },
} satisfies Meta<typeof PlayerPick>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: null,
  },
};

export const Selected: Story = {
  args: {
    value: "MS Dhoni",
  },
};

export const Disabled: Story = {
  args: {
    value: "Rohit Sharma",
    disabled: true,
  },
};
