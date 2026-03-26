import type { GroupMember } from "@/types";
import { MOCK_USER, MOCK_USER_2, MOCK_USER_3, MOCK_USER_4, MOCK_USER_5 } from "./profiles";

export const MOCK_MEMBERS: GroupMember[] = [
  {
    group_id: "group-001",
    user_id: "user-001",
    status: "approved",
    role: "owner",
    joined_at: "2026-03-15T10:00:00Z",
    approved_at: "2026-03-15T10:00:00Z",
    profile: MOCK_USER,
  },
  {
    group_id: "group-001",
    user_id: "user-002",
    status: "approved",
    role: "admin",
    joined_at: "2026-03-16T10:00:00Z",
    approved_at: "2026-03-16T10:30:00Z",
    profile: MOCK_USER_2,
  },
  {
    group_id: "group-001",
    user_id: "user-003",
    status: "approved",
    role: "member",
    joined_at: "2026-03-17T10:00:00Z",
    approved_at: "2026-03-17T10:30:00Z",
    profile: MOCK_USER_3,
  },
  {
    group_id: "group-001",
    user_id: "user-004",
    status: "approved",
    role: "member",
    joined_at: "2026-03-18T10:00:00Z",
    approved_at: "2026-03-18T10:30:00Z",
    profile: MOCK_USER_4,
  },
];

export const MOCK_PENDING_REQUESTS: GroupMember[] = [
  {
    group_id: "group-001",
    user_id: "user-005",
    status: "pending",
    role: "member",
    joined_at: "2026-03-25T10:00:00Z",
    approved_at: null,
    profile: MOCK_USER_5,
  },
];
