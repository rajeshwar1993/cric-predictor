import type { Meta, StoryObj } from "@storybook/react";
import { JoinGroupForm } from "./join-group-form";

const meta = {
  title: "Group/JoinGroupForm",
  component: JoinGroupForm,
  tags: ["autodocs"],
} satisfies Meta<typeof JoinGroupForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
