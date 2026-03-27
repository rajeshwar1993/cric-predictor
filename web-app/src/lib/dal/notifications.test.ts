import { createMockSupabaseClient, createMockQueryBuilder } from "@/test/helpers/mock-supabase";
import { MOCK_NOTIFICATIONS } from "@/__mocks__/data";

const mockClient = createMockSupabaseClient();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockClient)),
}));

import { getNotifications, getUnreadCount, markRead, markAllRead, createNotification } from "./notifications";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getNotifications
// ---------------------------------------------------------------------------
describe("getNotifications", () => {
  it("returns notifications for a user", async () => {
    const builder = createMockQueryBuilder(MOCK_NOTIFICATIONS);
    mockClient.from.mockReturnValue(builder);

    const result = await getNotifications("user-001");
    expect(result).toEqual(MOCK_NOTIFICATIONS);
    expect(mockClient.from).toHaveBeenCalledWith("notifications");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-001");
    expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(builder.limit).toHaveBeenCalledWith(20);
  });

  it("respects custom limit", async () => {
    const builder = createMockQueryBuilder(MOCK_NOTIFICATIONS.slice(0, 2));
    mockClient.from.mockReturnValue(builder);

    await getNotifications("user-001", 2);
    expect(builder.limit).toHaveBeenCalledWith(2);
  });

  it("returns empty array on error", async () => {
    const builder = createMockQueryBuilder(null as any, { message: "Error" });
    mockClient.from.mockReturnValue(builder);

    const result = await getNotifications("user-001");
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getUnreadCount
// ---------------------------------------------------------------------------
describe("getUnreadCount", () => {
  it("returns the count of unread notifications", async () => {
    const countBuilder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (resolve: any) => resolve({ count: 3, data: null, error: null }),
    };
    mockClient.from.mockReturnValue(countBuilder);

    const result = await getUnreadCount("user-001");
    expect(result).toBe(3);
    expect(countBuilder.select).toHaveBeenCalledWith("id", { count: "exact", head: true });
  });

  it("returns 0 when no unread notifications", async () => {
    const countBuilder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (resolve: any) => resolve({ count: 0, data: null, error: null }),
    };
    mockClient.from.mockReturnValue(countBuilder);

    const result = await getUnreadCount("user-001");
    expect(result).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// markRead
// ---------------------------------------------------------------------------
describe("markRead", () => {
  it("marks a single notification as read", async () => {
    const builder = createMockQueryBuilder([]);
    mockClient.from.mockReturnValue(builder);

    const result = await markRead("notif-01");
    expect(result).toBe(true);
    expect(builder.update).toHaveBeenCalledWith({ is_read: true });
    expect(builder.eq).toHaveBeenCalledWith("id", "notif-01");
  });

  it("returns false on error", async () => {
    const builder = createMockQueryBuilder([], { message: "Error" });
    mockClient.from.mockReturnValue(builder);

    const result = await markRead("notif-01");
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// markAllRead
// ---------------------------------------------------------------------------
describe("markAllRead", () => {
  it("marks all unread notifications as read for a user", async () => {
    const builder = createMockQueryBuilder([]);
    mockClient.from.mockReturnValue(builder);

    const result = await markAllRead("user-001");
    expect(result).toBe(true);
    expect(builder.update).toHaveBeenCalledWith({ is_read: true });
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-001");
    expect(builder.eq).toHaveBeenCalledWith("is_read", false);
  });

  it("returns false on error", async () => {
    const builder = createMockQueryBuilder([], { message: "Error" });
    mockClient.from.mockReturnValue(builder);

    const result = await markAllRead("user-001");
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createNotification
// ---------------------------------------------------------------------------
describe("createNotification", () => {
  it("inserts a notification and returns true", async () => {
    const builder = createMockQueryBuilder([]);
    mockClient.from.mockReturnValue(builder);

    const result = await createNotification({
      userId: "user-001",
      type: "results_in",
      message: "Results are in!",
      groupId: "group-001",
      matchId: 1,
    });

    expect(result).toBe(true);
    expect(mockClient.from).toHaveBeenCalledWith("notifications");
    expect(builder.insert).toHaveBeenCalledWith({
      user_id: "user-001",
      type: "results_in",
      message: "Results are in!",
      group_id: "group-001",
      match_id: 1,
    });
  });

  it("inserts without optional fields", async () => {
    const builder = createMockQueryBuilder([]);
    mockClient.from.mockReturnValue(builder);

    const result = await createNotification({
      userId: "user-001",
      type: "approved",
      message: "You have been approved!",
    });

    expect(result).toBe(true);
    expect(builder.insert).toHaveBeenCalledWith({
      user_id: "user-001",
      type: "approved",
      message: "You have been approved!",
      group_id: undefined,
      match_id: undefined,
    });
  });

  it("returns false on error", async () => {
    const builder = createMockQueryBuilder([], { message: "Insert failed" });
    mockClient.from.mockReturnValue(builder);

    const result = await createNotification({
      userId: "user-001",
      type: "test",
      message: "Test",
    });

    expect(result).toBe(false);
  });
});
