import { renderHook, act } from "@testing-library/react";
import { useCountdown } from "./use-countdown";

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a countdown string for a future date", () => {
    const now = new Date("2026-03-27T10:00:00Z");
    vi.setSystemTime(now);

    // 2 hours in the future
    const target = new Date("2026-03-27T12:00:00Z");
    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.display).toBe("2h 0m");
    expect(result.current.isExpired).toBe(false);
  });

  it("updates display every second", () => {
    const now = new Date("2026-03-27T10:00:00Z");
    vi.setSystemTime(now);

    // 2 minutes in the future
    const target = new Date("2026-03-27T10:02:00Z");
    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.display).toBe("2m");

    // Advance 60 seconds
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.display).toBe("1m");
  });

  it('shows "Expired" for a past date', () => {
    const now = new Date("2026-03-27T12:00:00Z");
    vi.setSystemTime(now);

    const target = new Date("2026-03-27T10:00:00Z");
    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.display).toBe("Expired");
    expect(result.current.isExpired).toBe(true);
  });

  it("returns expired state when target is null", () => {
    const { result } = renderHook(() => useCountdown(null));

    expect(result.current.display).toBe("");
    expect(result.current.isExpired).toBe(true);
  });

  it("cleans up interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");
    const now = new Date("2026-03-27T10:00:00Z");
    vi.setSystemTime(now);

    const target = new Date("2026-03-27T12:00:00Z");
    const { unmount } = renderHook(() => useCountdown(target));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
