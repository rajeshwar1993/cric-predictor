import type { Meta, StoryObj } from "@storybook/react";
import { CustomScenarioForm } from "./custom-scenario-form";

const meta = {
  title: "Prediction/CustomScenarioForm",
  component: CustomScenarioForm,
  tags: ["autodocs"],
} satisfies Meta<typeof CustomScenarioForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shows the collapsed "Drop a Wild Card" button by default */
export const Default: Story = {
  args: {
    groupId: "group-001",
    matchId: 2,
  },
};
