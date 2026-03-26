import { fn } from "@storybook/test";

export const submitPredictions = fn()
  .mockName("submitPredictions")
  .mockResolvedValue({ success: true });
