import type { Meta, StoryObj } from "@storybook/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "./dropdown-menu";
import { Button } from "./button";

const meta = {
  title: "UI/DropdownMenu",
  component: DropdownMenu,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ minHeight: 250, display: "flex", justifyContent: "center" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <DropdownMenu open>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Options
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Group Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Copy Invite Link</DropdownMenuItem>
        <DropdownMenuItem>View Standings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Leave Group</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
