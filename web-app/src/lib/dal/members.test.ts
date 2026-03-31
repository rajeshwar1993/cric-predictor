import { createMockSupabaseClient, createMockQueryBuilder } from "@/test/helpers/mock-supabase";
import { MOCK_MEMBERS, MOCK_PENDING_REQUESTS } from "@/__mocks__/data";

const mockClient = createMockSupabaseClient();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockClient)),
}));

import {
  getMembers,
  getPendingRequests,
  getMembershipStatus,
  requestToJoin,
  updateMemberStatus,
  removeMember,
} from "./members";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getMembers
// ---------------------------------------------------------------------------
describe("getMembers", () => {
  it("returns approved members with profiles", async () => {
    const builder = createMockQueryBuilder(MOCK_MEMBERS);
    mockClient.from.mockReturnValue(builder);

    const result = await getMembers("group-001");
    expect(result).toHaveLength(MOCK_MEMBERS.length);
    expect(builder.eq).toHaveBeenCalledWith("group_id", "group-001");
    expect(builder.eq).toHaveBeenCalledWith("status", "approved");
    expect(builder.order).toHaveBeenCalledWith("role", { ascending: true });
  });

  it("returns empty array on error", async () => {
    const builder = createMockQueryBuilder(null as any, { message: "Error" });
    mockClient.from.mockReturnValue(builder);

    const result = await getMembers("group-001");
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getPendingRequests
// ---------------------------------------------------------------------------
describe("getPendingRequests", () => {
  it("returns pending requests for a group", async () => {
    const builder = createMockQueryBuilder(MOCK_PENDING_REQUESTS);
    mockClient.from.mockReturnValue(builder);

    const result = await getPendingRequests("group-001");
    expect(result).toHaveLength(1);
    expect(builder.eq).toHaveBeenCalledWith("status", "pending");
    expect(builder.order).toHaveBeenCalledWith("joined_at", { ascending: true });
  });

  it("returns empty array when no pending requests", async () => {
    const builder = createMockQueryBuilder([]);
    mockClient.from.mockReturnValue(builder);

    const result = await getPendingRequests("group-001");
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getMembershipStatus
// ---------------------------------------------------------------------------
describe("getMembershipStatus", () => {
  it("returns status and role when membership exists", async () => {
    const builder = createMockQueryBuilder([{ status: "approved", role: "owner" }]);
    mockClient.from.mockReturnValue(builder);

    const result = await getMembershipStatus("group-001", "user-001");
    expect(result).toEqual({ status: "approved", role: "owner" });
    expect(builder.eq).toHaveBeenCalledWith("group_id", "group-001");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-001");
    expect(builder.single).toHaveBeenCalled();
  });

  it("returns null when no membership exists", async () => {
    const builder = createMockQueryBuilder([], { message: "Not found" });
    mockClient.from.mockReturnValue(builder);

    const result = await getMembershipStatus("group-001", "user-999");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// requestToJoin
// ---------------------------------------------------------------------------
describe("requestToJoin", () => {
  it("returns true on successful upsert", async () => {
    const builder = createMockQueryBuilder([]);
    mockClient.from.mockReturnValue(builder);

    const result = await requestToJoin("group-001", "user-005");
    expect(result).toBe(true);
    expect(builder.upsert).toHaveBeenCalledWith(
      { group_id: "group-001", user_id: "user-005", status: "pending", role: "member" },
      { onConflict: "group_id,user_id" }
    );
  });

  it("returns false on error", async () => {
    const builder = createMockQueryBuilder([], { message: "Upsert failed" });
    mockClient.from.mockReturnValue(builder);

    const result = await requestToJoin("group-001", "user-005");
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateMemberStatus
// ---------------------------------------------------------------------------
describe("updateMemberStatus", () => {
  it("returns { ok: true } when status is updated to approved", async () => {
    const builder = createMockQueryBuilder([{ user_id: "user-005" }]);
    mockClient.from.mockReturnValue(builder);

    const result = await updateMemberStatus("group-001", "user-005", "approved");
    expect(result).toEqual({ ok: true });
    expect(builder.update).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("group_id", "group-001");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-005");
  });

  it("returns { ok: true } when status is updated to rejected", async () => {
    const builder = createMockQueryBuilder([{ user_id: "user-005" }]);
    mockClient.from.mockReturnValue(builder);

    const result = await updateMemberStatus("group-001", "user-005", "rejected");
    expect(result).toEqual({ ok: true });
  });

  it("returns { ok: false } on error", async () => {
    const builder = createMockQueryBuilder([], { message: "Update failed" });
    mockClient.from.mockReturnValue(builder);

    const result = await updateMemberStatus("group-001", "user-005", "approved");
    expect(result).toEqual({ ok: false, capacityExceeded: false });
  });
});

// ---------------------------------------------------------------------------
// removeMember
// ---------------------------------------------------------------------------
describe("removeMember", () => {
  it("returns true on success", async () => {
    const builder = createMockQueryBuilder([{ user_id: "user-003" }]);
    mockClient.from.mockReturnValue(builder);

    const result = await removeMember("group-001", "user-003");
    expect(result).toBe(true);
    expect(builder.update).toHaveBeenCalledWith({ status: "removed" });
  });

  it("returns false on error", async () => {
    const builder = createMockQueryBuilder([], { message: "Delete failed" });
    mockClient.from.mockReturnValue(builder);

    const result = await removeMember("group-001", "user-003");
    expect(result).toBe(false);
  });
});
