import { createMockSupabaseClient, createMockQueryBuilder } from "@/test/helpers/mock-supabase";
import { MOCK_GROUP_OWNER, MOCK_GROUP_ADMIN } from "@/__mocks__/data";

const mockClient = createMockSupabaseClient();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockClient)),
}));

import { getGroupById, getGroupsByUser, getGroupByInviteCode, createGroup } from "./groups";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getGroupById
// ---------------------------------------------------------------------------
describe("getGroupById", () => {
  it("returns the group when found", async () => {
    const builder = createMockQueryBuilder([MOCK_GROUP_OWNER]);
    mockClient.from.mockReturnValue(builder);

    const result = await getGroupById("group-001");
    expect(result).toEqual(MOCK_GROUP_OWNER);
    expect(mockClient.from).toHaveBeenCalledWith("groups");
    expect(builder.eq).toHaveBeenCalledWith("id", "group-001");
    expect(builder.single).toHaveBeenCalled();
  });

  it("returns null when not found (error)", async () => {
    const builder = createMockQueryBuilder([], { message: "Not found" });
    mockClient.from.mockReturnValue(builder);

    const result = await getGroupById("nonexistent");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getGroupsByUser
// ---------------------------------------------------------------------------
describe("getGroupsByUser", () => {
  it("returns mapped groups with member counts and user roles", async () => {
    // First call: group_members join groups
    const memberRows = [
      {
        group_id: "group-001",
        role: "owner",
        groups: { id: "group-001", name: "Office Cricket Gang", invite_code: "a1b2c3d4e5f6", created_by: "user-001", created_at: "2026-03-15T10:00:00Z" },
      },
      {
        group_id: "group-002",
        role: "admin",
        groups: { id: "group-002", name: "College Buddies", invite_code: "x7y8z9a0b1c2", created_by: "user-002", created_at: "2026-03-10T10:00:00Z" },
      },
    ];
    // Second call: member counts
    const countRows = [
      { group_id: "group-001" },
      { group_id: "group-001" },
      { group_id: "group-001" },
      { group_id: "group-002" },
      { group_id: "group-002" },
    ];

    let callIndex = 0;
    mockClient.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return createMockQueryBuilder(memberRows);
      return createMockQueryBuilder(countRows);
    });

    const result = await getGroupsByUser("user-001");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "group-001", member_count: 3, user_role: "owner" });
    expect(result[1]).toMatchObject({ id: "group-002", member_count: 2, user_role: "admin" });
  });

  it("returns empty array on error", async () => {
    const builder = createMockQueryBuilder(null as any, { message: "DB error" });
    mockClient.from.mockReturnValue(builder);

    const result = await getGroupsByUser("user-001");
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getGroupByInviteCode
// ---------------------------------------------------------------------------
describe("getGroupByInviteCode", () => {
  it("returns the group matching the invite code", async () => {
    const builder = createMockQueryBuilder([MOCK_GROUP_OWNER]);
    mockClient.from.mockReturnValue(builder);

    const result = await getGroupByInviteCode("a1b2c3d4e5f6");
    expect(result).toEqual(MOCK_GROUP_OWNER);
    expect(builder.eq).toHaveBeenCalledWith("invite_code", "a1b2c3d4e5f6");
  });

  it("returns null for invalid invite code", async () => {
    const builder = createMockQueryBuilder([], { message: "Not found" });
    mockClient.from.mockReturnValue(builder);

    const result = await getGroupByInviteCode("bad_code");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createGroup
// ---------------------------------------------------------------------------
describe("createGroup", () => {
  it("creates a group and adds creator as owner", async () => {
    const createdGroup = { id: "group-new", name: "New Group", invite_code: "xyz123abc456", created_by: "user-001", created_at: "2026-03-27T10:00:00Z" };

    let callIndex = 0;
    mockClient.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // groups insert
        return createMockQueryBuilder([createdGroup]);
      }
      // group_members insert
      return createMockQueryBuilder([]);
    });

    const result = await createGroup("New Group", "user-001");
    expect(result).toEqual(createdGroup);
  });

  it("returns null when group insert fails", async () => {
    const builder = createMockQueryBuilder([], { message: "Insert error" });
    mockClient.from.mockReturnValue(builder);

    const result = await createGroup("Fail Group", "user-001");
    expect(result).toBeNull();
  });

  it("returns null when member insert fails", async () => {
    const createdGroup = { id: "group-new", name: "New Group", invite_code: "xyz", created_by: "user-001", created_at: "2026-03-27T10:00:00Z" };

    let callIndex = 0;
    mockClient.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return createMockQueryBuilder([createdGroup]);
      }
      return createMockQueryBuilder([], { message: "Member insert error" });
    });

    const result = await createGroup("New Group", "user-001");
    expect(result).toBeNull();
  });
});
