import type { Meta, StoryObj } from "@storybook/react";
import { Toaster } from "./sonner";
import { Button } from "./button";
import { toast } from "sonner";

const meta = {
  title: "UI/Sonner",
  component: Toaster,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllToasts: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Toaster />
      <Button onClick={() => toast.success("Prediction submitted!")}>
        Success
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.error("Failed to save prediction.")}
      >
        Error
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.info("Match starts in 45 minutes.")}
      >
        Info
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.warning("Predictions close soon!")}
      >
        Warning
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.loading("Saving...")}
      >
        Loading
      </Button>
    </div>
  ),
};
