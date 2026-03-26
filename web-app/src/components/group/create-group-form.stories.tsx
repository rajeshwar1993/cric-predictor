import type { Meta, StoryObj } from "@storybook/react";
import { CreateGroupForm } from "./create-group-form";

const meta = {
  title: "Group/CreateGroupForm",
  component: CreateGroupForm,
  tags: ["autodocs"],
} satisfies Meta<typeof CreateGroupForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
