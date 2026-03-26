import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { Loader2, Plus } from "lucide-react";

const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "outline", "secondary", "ghost", "destructive", "link"],
    },
    size: {
      control: "select",
      options: ["default", "xs", "sm", "lg", "icon"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Predict Now" },
};

export const Outline: Story = {
  args: { children: "Copy Invite Link", variant: "outline" },
};

export const Ghost: Story = {
  args: { children: "Cancel", variant: "ghost" },
};

export const Destructive: Story = {
  args: { children: "Remove Member", variant: "destructive" },
};

export const Small: Story = {
  args: { children: "Approve", size: "sm" },
};

export const WithIcon: Story = {
  render: () => (
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      Create Group
    </Button>
  ),
};

export const Loading: Story = {
  render: () => (
    <Button disabled>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Submitting...
    </Button>
  ),
};

export const GlowCTA: Story = {
  render: () => (
    <Button className="font-display font-semibold bg-gradient-to-br from-[var(--cyan)] to-[color-mix(in_srgb,var(--cyan),#000_20%)] text-[var(--bg-deep)] btn-glow">
      Predict Now
    </Button>
  ),
};
