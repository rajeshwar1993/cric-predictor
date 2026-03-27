import type { Meta, StoryObj } from "@storybook/react";
import { InviteLink } from "./invite-link";

const meta = {
  title: "Group/InviteLink",
  component: InviteLink,
  tags: ["autodocs"],
} satisfies Meta<typeof InviteLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    inviteCode: "a1b2c3d4e5f6",
    groupName: "The Legends",
    inviterName: "Rajesh",
  },
};
