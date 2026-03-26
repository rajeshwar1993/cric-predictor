import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { ErrorState } from "./error-state";

const meta = {
  title: "Shared/ErrorState",
  component: ErrorState,
  tags: ["autodocs"],
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithRetry: Story = {
  args: {
    message: "Failed to load leaderboard data.",
    onRetry: fn(),
  },
};
