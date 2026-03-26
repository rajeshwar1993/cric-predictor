import type { Meta, StoryObj } from "@storybook/react";
import { PredictionForm } from "./prediction-form";
import {
  MOCK_SCENARIOS,
  MOCK_PREDICTIONS,
  MOCK_PLAYERS,
} from "@/__mocks__/data";

const meta = {
  title: "Prediction/PredictionForm",
  component: PredictionForm,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof PredictionForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    groupId: "group-001",
    matchId: 2,
    teamA: "CSK",
    teamB: "MI",
    scenarios: MOCK_SCENARIOS,
    existingPredictions: MOCK_PREDICTIONS,
    players: MOCK_PLAYERS,
    isLocked: false,
    lastUpdated: null,
  },
};
