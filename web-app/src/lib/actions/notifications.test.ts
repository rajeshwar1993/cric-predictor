import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticated,
} from "@/test/helpers/mock-supabase";

const mockClient = createMockSupabaseClient();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockClient)),
}));

vi.mock("@/lib/dal/notifications");

import * as notificationsDal from "@/lib/dal/notifications";
import { markNotificationRead, markAllNotificationsRead } from "./notifications";

const mockedNotifDal = vi.mocked(notificationsDal);

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthenticatedUser(mockClient, "user-001");
});

// ---------------------------------------------------------------------------
// markNotificationRead
// ---------------------------------------------------------------------------
describe("markNotificationRead", () => {
  it("returns error when not authenticated", async () => {
    mockUnauthenticated(mockClient);
    const result = await markNotificationRead("notif-01");
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("marks notification as read successfully", async () => {
    mockedNotifDal.markRead.mockResolvedValue(true);

    const result = await markNotificationRead("notif-01");
    expect(result).toEqual({ success: true });
    expect(mockedNotifDal.markRead).toHaveBeenCalledWith("notif-01");
  });

  it("returns error when DAL fails", async () => {
    mockedNotifDal.markRead.mockResolvedValue(false);

    const result = await markNotificationRead("notif-01");
    expect(result).toEqual({ success: false, error: "Failed to mark as read" });
  });
});

// ---------------------------------------------------------------------------
// markAllNotificationsRead
// ---------------------------------------------------------------------------
describe("markAllNotificationsRead", () => {
  it("returns error when not authenticated", async () => {
    mockUnauthenticated(mockClient);
    const result = await markAllNotificationsRead();
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("marks all notifications as read successfully", async () => {
    mockedNotifDal.markAllRead.mockResolvedValue(true);

    const result = await markAllNotificationsRead();
    expect(result).toEqual({ success: true });
    expect(mockedNotifDal.markAllRead).toHaveBeenCalledWith("user-001");
  });

  it("returns error when DAL fails", async () => {
    mockedNotifDal.markAllRead.mockResolvedValue(false);

    const result = await markAllNotificationsRead();
    expect(result).toEqual({ success: false, error: "Failed to mark all as read" });
  });
});
