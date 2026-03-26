import { fn } from "@storybook/test";

export const createCustomScenario = fn()
  .mockName("createCustomScenario")
  .mockResolvedValue({ success: true, data: { id: "sc-new" } });

export const approveScenario = fn()
  .mockName("approveScenario")
  .mockResolvedValue({ success: true });

export const rejectScenario = fn()
  .mockName("rejectScenario")
  .mockResolvedValue({ success: true });

export const removeScenario = fn()
  .mockName("removeScenario")
  .mockResolvedValue({ success: true });
