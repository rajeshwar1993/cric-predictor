import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { YesNoPick } from "./yes-no-pick";

const meta = {
  title: "Prediction/YesNoPick",
  component: YesNoPick,
  tags: ["autodocs"],
} satisfies Meta<typeof YesNoPick>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: null,
    onChange: fn(),
  },
};

export const YesSelected: Story = {
  args: {
    value: "Yes",
    onChange: fn(),
  },
};

export const Disabled: Story = {
  args: {
    value: "No",
    onChange: fn(),
    disabled: true,
  },
};
