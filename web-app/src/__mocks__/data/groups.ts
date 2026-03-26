import type { GroupWithMeta } from "@/types";

export const MOCK_GROUP_OWNER: GroupWithMeta = {
  id: "group-001",
  name: "Office Cricket Gang",
  invite_code: "a1b2c3d4e5f6",
  created_by: "user-001",
  created_at: "2026-03-15T10:00:00Z",
  member_count: 8,
  user_role: "owner",
};

export const MOCK_GROUP_ADMIN: GroupWithMeta = {
  id: "group-002",
  name: "College Buddies",
  invite_code: "x7y8z9a0b1c2",
  created_by: "user-002",
  created_at: "2026-03-10T10:00:00Z",
  member_count: 12,
  user_role: "admin",
};

export const MOCK_GROUP_MEMBER: GroupWithMeta = {
  id: "group-003",
  name: "Family Predictions",
  invite_code: "d3e4f5g6h7i8",
  created_by: "user-003",
  created_at: "2026-03-20T10:00:00Z",
  member_count: 5,
  user_role: "member",
};

export const ALL_MOCK_GROUPS = [MOCK_GROUP_OWNER, MOCK_GROUP_ADMIN, MOCK_GROUP_MEMBER];
