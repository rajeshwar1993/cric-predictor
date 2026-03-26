import type { Meta, StoryObj } from "@storybook/react";
import { EmptyState } from "./empty-state";
import { Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const meta = {
  title: "Shared/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: Trophy,
    title: "No predictions yet",
    description: "Predictions will appear here once the match starts.",
  },
};

export const WithAction: Story = {
  args: {
    icon: Users,
    title: "No groups yet",
    description: "Create or join a group to start predicting with friends.",
    action: <Button>Create Group</Button>,
  },
};
