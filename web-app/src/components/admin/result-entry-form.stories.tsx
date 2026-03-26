import type { Meta, StoryObj } from "@storybook/react";
import { ResultEntryForm } from "./result-entry-form";

const meta = {
  title: "Admin/ResultEntryForm",
  component: ResultEntryForm,
  tags: ["autodocs"],
} satisfies Meta<typeof ResultEntryForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    groupId: "group-001",
    matchId: 2,
    teamA: "CSK",
    teamB: "MI",
  },
};
