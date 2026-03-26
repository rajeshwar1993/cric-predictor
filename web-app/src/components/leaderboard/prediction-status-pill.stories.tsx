import type { Meta, StoryObj } from "@storybook/react";
import { PredictionStatusPill } from "./prediction-status-pill";

const meta = {
  title: "Leaderboard/PredictionStatusPill",
  component: PredictionStatusPill,
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: ["correct", "wrong", "on_track", "in_danger", "pending"],
    },
  },
} satisfies Meta<typeof PredictionStatusPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Correct: Story = {
  args: { status: "correct" },
};

export const Wrong: Story = {
  args: { status: "wrong" },
};

export const OnTrack: Story = {
  args: { status: "on_track" },
};

export const InDanger: Story = {
  args: { status: "in_danger" },
};

export const Pending: Story = {
  args: { status: "pending" },
};

export const AllStatuses: Story = {
  args: { status: "correct" },
  render: () => (
    <div className="flex flex-wrap gap-3">
      <PredictionStatusPill status="correct" />
      <PredictionStatusPill status="wrong" />
      <PredictionStatusPill status="on_track" />
      <PredictionStatusPill status="in_danger" />
      <PredictionStatusPill status="pending" />
    </div>
  ),
};
