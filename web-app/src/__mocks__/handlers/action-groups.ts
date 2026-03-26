import { fn } from "@storybook/test";

export const createGroup = fn()
  .mockName("createGroup")
  .mockResolvedValue({ success: true, data: { id: "group-new", name: "New Group", invite_code: "newcode123ab", created_by: "user-001", created_at: new Date().toISOString() } });

export const joinGroup = fn()
  .mockName("joinGroup")
  .mockResolvedValue({ success: true });

export const manageMember = fn()
  .mockName("manageMember")
  .mockResolvedValue({ success: true });
