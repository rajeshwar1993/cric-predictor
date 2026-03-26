import type { Meta, StoryObj } from "@storybook/react";
import { JoinGroupClient } from "./join-group-client";

const meta = {
  title: "Group/JoinGroupClient",
  component: JoinGroupClient,
  tags: ["autodocs"],
  args: {
    groupId: "group-001",
    groupName: "Office Cricket Gang",
    inviteCode: "a1b2c3d4e5f6",
  },
} satisfies Meta<typeof JoinGroupClient>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoMembership: Story = {
  args: {
    currentStatus: null,
  },
};

export const Pending: Story = {
  args: {
    currentStatus: "pending",
  },
};

export const Rejected: Story = {
  args: {
    currentStatus: "rejected",
  },
};
