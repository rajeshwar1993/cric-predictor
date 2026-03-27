import type { Meta, StoryObj } from "@storybook/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog";
import { Button } from "./button";

const meta = {
  title: "UI/Dialog",
  component: Dialog,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ minHeight: 400 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Squad</DialogTitle>
          <DialogDescription>
            Give your prediction squad a name to get started.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <input
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            placeholder="Squad name"
          />
        </div>
        <DialogFooter>
          <Button>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
