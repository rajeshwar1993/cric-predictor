import type { Meta, StoryObj } from "@storybook/react";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";

const meta = {
  title: "UI/Avatar",
  component: Avatar,
  tags: ["autodocs"],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://i.pravatar.cc/150?u=rajesh" alt="Rajesh" />
      <AvatarFallback>RK</AvatarFallback>
    </Avatar>
  ),
};

export const FallbackInitials: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>PS</AvatarFallback>
    </Avatar>
  ),
};
