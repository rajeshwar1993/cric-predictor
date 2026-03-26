import { fn } from "@storybook/test";

export const markNotificationRead = fn()
  .mockName("markNotificationRead")
  .mockResolvedValue({ success: true });

export const markAllNotificationsRead = fn()
  .mockName("markAllNotificationsRead")
  .mockResolvedValue({ success: true });
