import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPostHogTransport } from "./transport";
import type { LogContext } from "@/lib/logger";

// Mock the client and server modules
const mockCapture = vi.fn();
vi.mock("./client", () => ({
  getPostHogClient: () => ({ capture: mockCapture }),
}));
vi.mock("./server", () => ({
  getPostHogServer: () => ({ capture: mockCapture }),
}));

describe("PostHog LogTransport", () => {
  const transport = createPostHogTransport();
  const context: LogContext = {
    layer: "dal",
    operation: "getGroupById",
    metadata: { groupId: "abc-123" },
  };

  beforeEach(() => {
    mockCapture.mockClear();
  });

  it("forwards error-level logs", async () => {
    transport.send("error", "[dal] getGroupById failed", context);
    // Wait for dynamic import
    await new Promise((r) => setTimeout(r, 50));
    expect(mockCapture).toHaveBeenCalled();
  });

  it("forwards warn-level logs", async () => {
    transport.send("warn", "[dal] getGroupById: unexpected state", context);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockCapture).toHaveBeenCalled();
  });

  it("ignores debug-level logs", async () => {
    transport.send("debug", "debug message", context);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it("ignores info-level logs", async () => {
    transport.send("info", "info message", context);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockCapture).not.toHaveBeenCalled();
  });
});
