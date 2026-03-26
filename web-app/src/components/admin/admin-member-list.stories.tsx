import type { Meta, StoryObj } from "@storybook/react";
import { AdminMemberList } from "./admin-member-list";
import { MOCK_MEMBERS } from "@/__mocks__/data";

const meta = {
  title: "Admin/AdminMemberList",
  component: AdminMemberList,
  tags: ["autodocs"],
} satisfies Meta<typeof AdminMemberList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AsOwner: Story = {
  args: {
    groupId: "group-001",
    members: MOCK_MEMBERS,
    callerRole: "owner",
    callerId: "user-001",
  },
};
