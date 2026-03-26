import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./card";

const meta = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Match #1</CardTitle>
      </CardHeader>
    </Card>
  ),
};

export const WithContent: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>CSK vs MI</CardTitle>
        <CardDescription>IPL 2026 — Match 2 · Chennai</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Predict 16 scenarios and compete with your group.
        </p>
      </CardContent>
      <CardFooter>
        <span className="text-xs text-muted-foreground">
          Predictions close 45 min before match
        </span>
      </CardFooter>
    </Card>
  ),
};
