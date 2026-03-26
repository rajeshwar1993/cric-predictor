import type { Meta, StoryObj } from "@storybook/react";
import { UserMenu } from "./user-menu";

const meta = {
  title: "Layout/UserMenu",
  component: UserMenu,
  tags: ["autodocs"],
} satisfies Meta<typeof UserMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    displayName: "Rajesh Kumar",
    email: "rajesh@example.com",
  },
};
