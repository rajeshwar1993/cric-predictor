import { fn } from "@storybook/test";

export const signInWithMagicLink = fn()
  .mockName("signInWithMagicLink")
  .mockResolvedValue({ success: true });

export const signOut = fn()
  .mockName("signOut")
  .mockResolvedValue(undefined);
