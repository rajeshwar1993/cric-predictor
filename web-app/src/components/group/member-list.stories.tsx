import type { Meta, StoryObj } from "@storybook/react";
import { MemberList } from "./member-list";
import { MOCK_MEMBERS } from "@/__mocks__/data";

const meta = {
  title: "Group/MemberList",
  component: MemberList,
  tags: ["autodocs"],
} satisfies Meta<typeof MemberList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    members: MOCK_MEMBERS,
  },
};
