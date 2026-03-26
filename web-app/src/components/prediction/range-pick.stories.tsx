import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { RangePick } from "./range-pick";

const meta = {
  title: "Prediction/RangePick",
  component: RangePick,
  tags: ["autodocs"],
} satisfies Meta<typeof RangePick>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    options: ["<150", "150-169", "170-189", "190+"],
    value: null,
    onChange: fn(),
  },
};

export const Selected: Story = {
  args: {
    options: ["<150", "150-169", "170-189", "190+"],
    value: "170-189",
    onChange: fn(),
  },
};

export const Disabled: Story = {
  args: {
    options: ["<150", "150-169", "170-189", "190+"],
    value: "170-189",
    onChange: fn(),
    disabled: true,
  },
};
