import type { Meta, StoryObj } from "@storybook/react";
import { GroupCard } from "./group-card";
import { MOCK_GROUP_OWNER, MOCK_GROUP_MEMBER } from "@/__mocks__/data";

const meta = {
  title: "Group/GroupCard",
  component: GroupCard,
  tags: ["autodocs"],
} satisfies Meta<typeof GroupCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OwnerRole: Story = {
  args: {
    group: MOCK_GROUP_OWNER,
  },
};

export const MemberRole: Story = {
  args: {
    group: MOCK_GROUP_MEMBER,
  },
};
