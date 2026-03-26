import { fn } from "@storybook/test";

export const enterResults = fn()
  .mockName("enterResults")
  .mockResolvedValue({ success: true });

export const updateGroupSettings = fn()
  .mockName("updateGroupSettings")
  .mockResolvedValue({ success: true });
