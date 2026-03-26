import type { Meta, StoryObj } from "@storybook/react";
import { PendingApprovals } from "./pending-approvals";
import { MOCK_PENDING_REQUESTS } from "@/__mocks__/data";

const meta = {
  title: "Admin/PendingApprovals",
  component: PendingApprovals,
  tags: ["autodocs"],
} satisfies Meta<typeof PendingApprovals>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    groupId: "group-001",
    requests: MOCK_PENDING_REQUESTS,
  },
};
