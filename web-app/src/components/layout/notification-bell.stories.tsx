import type { Meta, StoryObj } from "@storybook/react";
import { NotificationBell } from "./notification-bell";

const meta = {
  title: "Layout/NotificationBell",
  component: NotificationBell,
  tags: ["autodocs"],
} satisfies Meta<typeof NotificationBell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    userId: "user-001",
  },
};
