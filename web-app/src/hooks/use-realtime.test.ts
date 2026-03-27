import { renderHook } from "@testing-library/react";
import { createMockSupabaseClient } from "@/test/helpers/mock-supabase";

const mockChannel: any = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
};
mockChannel.subscribe.mockReturnValue(mockChannel);

const mockBrowserClient = createMockSupabaseClient({
  channel: vi.fn(() => mockChannel),
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockBrowserClient),
}));

import { useRealtime } from "./use-realtime";

describe("useRealtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks on channel
    mockChannel.on.mockReturnThis();
    mockChannel.subscribe.mockReturnValue(mockChannel);
    (mockBrowserClient.channel as ReturnType<typeof vi.fn>).mockReturnValue(mockChannel);
  });

  it("subscribes to a channel on mount", () => {
    const callback = vi.fn();
    renderHook(() => useRealtime("predictions", undefined, callback));

    expect(mockBrowserClient.channel).toHaveBeenCalledWith("predictions-changes");
    expect(mockChannel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        event: "*",
        schema: "public",
        table: "predictions",
        filter: undefined,
      }),
      expect.any(Function)
    );
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it("passes the filter to the channel subscription", () => {
    const callback = vi.fn();
    renderHook(() =>
      useRealtime("notifications", "user_id=eq.user-001", callback)
    );

    expect(mockChannel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        filter: "user_id=eq.user-001",
      }),
      expect.any(Function)
    );
  });

  it("invokes the callback when realtime event fires", () => {
    const callback = vi.fn();
    renderHook(() => useRealtime("matches", undefined, callback));

    // Extract the handler that was passed to .on()
    const handler = mockChannel.on.mock.calls[0][2];
    const fakePayload = { eventType: "INSERT", new: { id: 1 } };
    handler(fakePayload);

    expect(callback).toHaveBeenCalledWith(fakePayload);
  });

  it("removes the channel on unmount", () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() =>
      useRealtime("scenarios", undefined, callback)
    );

    unmount();

    expect(mockBrowserClient.removeChannel).toHaveBeenCalledWith(mockChannel);
  });
});
