import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticated,
} from "@/test/helpers/mock-supabase";
import { MOCK_GROUP_OWNER, ALL_MOCK_GROUPS } from "@/__mocks__/data";

const mockClient = createMockSupabaseClient();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockClient)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));
vi.mock("@/lib/analytics/server", () => ({
  trackServerEvent: vi.fn(),
  ANALYTICS_EVENTS: {
    GROUP_CREATED: "group_created",
    GROUP_JOIN_REQUESTED: "group_join_requested",
    GROUP_MEMBER_APPROVED: "group_member_approved",
    GROUP_MEMBER_REJECTED: "group_member_rejected",
    GROUP_MEMBER_PROMOTED: "group_member_promoted",
    GROUP_MEMBER_DEMOTED: "group_member_demoted",
    GROUP_MEMBER_REMOVED: "group_member_removed",
  },
}));

vi.mock("@/lib/dal/groups");
vi.mock("@/lib/dal/members");

import * as groupsDal from "@/lib/dal/groups";
import * as membersDal from "@/lib/dal/members";
import { createGroup, joinGroup, manageMember } from "./groups";

const mockedGroupsDal = vi.mocked(groupsDal);
const mockedMembersDal = vi.mocked(membersDal);

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthenticatedUser(mockClient, "user-001");
  // Default: group has fewer than 10 members (not full)
  mockedMembersDal.getMembers.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// createGroup
// ---------------------------------------------------------------------------
describe("createGroup", () => {
  it("fails validation for short name", async () => {
    const result = await createGroup("AB");
    expect(result.success).toBe(false);
    expect(result.error).toContain("at least 3 characters");
  });

  it("fails validation for long name", async () => {
    const result = await createGroup("A".repeat(51));
    expect(result.success).toBe(false);
    expect(result.error).toContain("at most 50 characters");
  });

  it("returns error when not authenticated", async () => {
    mockUnauthenticated(mockClient);
    const result = await createGroup("Valid Group Name");
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns rate limit error when user has max groups", async () => {
    // Create enough mock groups to hit the limit
    const manyGroups = Array.from({ length: 10 }, (_, i) => ({
      ...MOCK_GROUP_OWNER,
      id: `group-${i}`,
    }));
    mockedGroupsDal.getGroupsByUser.mockResolvedValue(manyGroups);

    const result = await createGroup("New Group");
    expect(result.success).toBe(false);
    expect(result.error).toContain("at most 10 squads");
  });

  it("creates a group successfully", async () => {
    mockedGroupsDal.getGroupsByUser.mockResolvedValue([MOCK_GROUP_OWNER]);
    const newGroup = { id: "group-new", name: "New Group", invite_code: "abc123def456", created_by: "user-001", created_at: "2026-03-27T00:00:00Z" };
    mockedGroupsDal.createGroup.mockResolvedValue(newGroup);

    const result = await createGroup("New Group");
    expect(result).toEqual({ success: true, data: newGroup });
    expect(mockedGroupsDal.createGroup).toHaveBeenCalledWith("New Group", "user-001");
  });

  it("returns error when DAL create fails", async () => {
    mockedGroupsDal.getGroupsByUser.mockResolvedValue([]);
    mockedGroupsDal.createGroup.mockResolvedValue(null);

    const result = await createGroup("New Group");
    expect(result).toEqual({ success: false, error: "Couldn't create your squad — try again" });
  });
});

// ---------------------------------------------------------------------------
// joinGroup
// ---------------------------------------------------------------------------
describe("joinGroup", () => {
  it("returns error when not authenticated", async () => {
    mockUnauthenticated(mockClient);
    const result = await joinGroup("a1b2c3d4e5f6");
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error for invalid invite code", async () => {
    mockedGroupsDal.getGroupByInviteCode.mockResolvedValue(null);

    const result = await joinGroup("bad_code");
    expect(result).toEqual({ success: false, error: "Invalid invite code" });
  });

  it("returns error when user is already approved member", async () => {
    mockedGroupsDal.getGroupByInviteCode.mockResolvedValue(MOCK_GROUP_OWNER);
    mockedMembersDal.getMembershipStatus.mockResolvedValue({ status: "approved", role: "member" });

    const result = await joinGroup("a1b2c3d4e5f6");
    expect(result).toEqual({ success: false, error: "You're already in this squad" });
  });

  it("returns error when request is pending", async () => {
    mockedGroupsDal.getGroupByInviteCode.mockResolvedValue(MOCK_GROUP_OWNER);
    mockedMembersDal.getMembershipStatus.mockResolvedValue({ status: "pending", role: "member" });

    const result = await joinGroup("a1b2c3d4e5f6");
    expect(result).toEqual({ success: false, error: "Your request is already pending — hang tight" });
  });

  it("submits join request successfully", async () => {
    mockedGroupsDal.getGroupByInviteCode.mockResolvedValue(MOCK_GROUP_OWNER);
    mockedMembersDal.getMembershipStatus.mockResolvedValue(null);
    mockedMembersDal.requestToJoin.mockResolvedValue(true);

    const result = await joinGroup("a1b2c3d4e5f6");
    expect(result).toEqual({ success: true });
    expect(mockedMembersDal.requestToJoin).toHaveBeenCalledWith("group-001", "user-001");
  });

  it("returns error when join request fails", async () => {
    mockedGroupsDal.getGroupByInviteCode.mockResolvedValue(MOCK_GROUP_OWNER);
    mockedMembersDal.getMembershipStatus.mockResolvedValue(null);
    mockedMembersDal.requestToJoin.mockResolvedValue(false);

    const result = await joinGroup("a1b2c3d4e5f6");
    expect(result).toEqual({ success: false, error: "Couldn't get you in — try again" });
  });
});

// ---------------------------------------------------------------------------
// manageMember — all 10 authz paths
// ---------------------------------------------------------------------------
describe("manageMember", () => {
  const groupId = "a0000000-0000-4000-8000-000000000001";
  const targetId = "a0000000-0000-4000-8000-000000000002";

  it("fails validation for invalid groupId", async () => {
    const result = await manageMember("bad-id", targetId, "approve");
    expect(result.success).toBe(false);
  });

  it("returns error when not authenticated", async () => {
    mockUnauthenticated(mockClient);
    const result = await manageMember(groupId, targetId, "approve");
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error when caller is not admin/owner", async () => {
    mockedMembersDal.getMembershipStatus.mockResolvedValue({ status: "approved", role: "member" });

    const result = await manageMember(groupId, targetId, "approve");
    expect(result).toEqual({ success: false, error: "Only admins can manage members" });
  });

  // --- approve ---
  it("approves a member successfully (caller is admin)", async () => {
    mockedMembersDal.getMembershipStatus.mockResolvedValue({ status: "approved", role: "admin" });
    mockedMembersDal.updateMemberStatus.mockResolvedValue({ ok: true, capacityExceeded: false });

    const result = await manageMember(groupId, targetId, "approve");
    expect(result).toEqual({ success: true });
    expect(mockedMembersDal.updateMemberStatus).toHaveBeenCalledWith(groupId, targetId, "approved");
  });

  // --- reject ---
  it("rejects a member successfully (caller is owner)", async () => {
    mockedMembersDal.getMembershipStatus.mockResolvedValue({ status: "approved", role: "owner" });
    mockedMembersDal.updateMemberStatus.mockResolvedValue({ ok: true, capacityExceeded: false });

    const result = await manageMember(groupId, targetId, "reject");
    expect(result).toEqual({ success: true });
    expect(mockedMembersDal.updateMemberStatus).toHaveBeenCalledWith(groupId, targetId, "rejected");
  });

  // --- promote ---
  it("promotes a member when caller is owner", async () => {
    mockedMembersDal.getMembershipStatus.mockResolvedValue({ status: "approved", role: "owner" });
    mockedMembersDal.updateMemberRole.mockResolvedValue(true);

    const result = await manageMember(groupId, targetId, "promote");
    expect(result).toEqual({ success: true });
    expect(mockedMembersDal.updateMemberRole).toHaveBeenCalledWith(groupId, targetId, "admin");
  });

  it("blocks promote when caller is admin (not owner)", async () => {
    mockedMembersDal.getMembershipStatus.mockResolvedValue({ status: "approved", role: "admin" });

    const result = await manageMember(groupId, targetId, "promote");
    expect(result).toEqual({ success: false, error: "Only the owner can promote members" });
  });

  // --- demote ---
  it("demotes an admin when caller is owner", async () => {
    mockedMembersDal.getMembershipStatus.mockResolvedValue({ status: "approved", role: "owner" });
    mockedMembersDal.updateMemberRole.mockResolvedValue(true);

    const result = await manageMember(groupId, targetId, "demote");
    expect(result).toEqual({ success: true });
    expect(mockedMembersDal.updateMemberRole).toHaveBeenCalledWith(groupId, targetId, "member");
  });

  it("blocks demote when caller is admin (not owner)", async () => {
    mockedMembersDal.getMembershipStatus.mockResolvedValue({ status: "approved", role: "admin" });

    const result = await manageMember(groupId, targetId, "demote");
    expect(result).toEqual({ success: false, error: "Only the owner can demote admins" });
  });

  // --- remove ---
  it("removes a member when caller is owner", async () => {
    // First call: caller status; second call: target status
    mockedMembersDal.getMembershipStatus
      .mockResolvedValueOnce({ status: "approved", role: "owner" })
      .mockResolvedValueOnce({ status: "approved", role: "member" });
    mockedMembersDal.removeMember.mockResolvedValue(true);

    const result = await manageMember(groupId, targetId, "remove");
    expect(result).toEqual({ success: true });
  });

  it("blocks removing the group owner", async () => {
    mockedMembersDal.getMembershipStatus
      .mockResolvedValueOnce({ status: "approved", role: "owner" })
      .mockResolvedValueOnce({ status: "approved", role: "owner" });

    const result = await manageMember(groupId, targetId, "remove");
    expect(result).toEqual({ success: false, error: "Can't remove the squad owner" });
  });

  it("blocks self-removal", async () => {
    // Caller and target are the same user
    const callerUuid = "a0000000-0000-4000-8000-000000000099";
    mockAuthenticatedUser(mockClient, callerUuid);
    // First call: caller membership (admin); second call: target membership (admin -- same person)
    mockedMembersDal.getMembershipStatus
      .mockResolvedValueOnce({ status: "approved", role: "admin" })
      .mockResolvedValueOnce({ status: "approved", role: "admin" });

    const result = await manageMember(groupId, callerUuid, "remove");
    expect(result).toEqual({ success: false, error: "Cannot remove yourself" });
  });

  it("blocks admin removing another admin", async () => {
    mockedMembersDal.getMembershipStatus
      .mockResolvedValueOnce({ status: "approved", role: "admin" })
      .mockResolvedValueOnce({ status: "approved", role: "admin" });

    const result = await manageMember(groupId, targetId, "remove");
    expect(result).toEqual({ success: false, error: "Only the owner can remove admins" });
  });
});
