import { logError, logWarn, registerTransport, clearTransports, type LogTransport } from "./logger";

describe("logError", () => {
  beforeEach(() => {
    clearTransports();
    vi.restoreAllMocks();
  });

  it("logs to console when ENABLE_DEBUG_LOGS is true", () => {
    vi.stubEnv("ENABLE_DEBUG_LOGS", "true");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logError({ layer: "dal", operation: "getGroupById", metadata: { groupId: "123" } }, new Error("not found"));

    expect(spy).toHaveBeenCalledWith(
      "[dal] getGroupById failed",
      expect.objectContaining({ groupId: "123" })
    );
  });

  it("does NOT log to console when ENABLE_DEBUG_LOGS is unset", () => {
    vi.stubEnv("ENABLE_DEBUG_LOGS", "");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logError({ layer: "dal", operation: "getGroupById" }, new Error("fail"));

    expect(spy).not.toHaveBeenCalled();
  });

  it("sends to registered transports regardless of env var", () => {
    vi.stubEnv("ENABLE_DEBUG_LOGS", "");
    const mockTransport: LogTransport = { send: vi.fn() };
    registerTransport(mockTransport);

    const error = new Error("db error");
    logError({ layer: "dal", operation: "getMatchById", metadata: { matchId: 5 } }, error);

    expect(mockTransport.send).toHaveBeenCalledWith(
      "error",
      "[dal] getMatchById failed",
      { layer: "dal", operation: "getMatchById", metadata: { matchId: 5 } },
      error
    );
  });

  it("sends to multiple transports", () => {
    const t1: LogTransport = { send: vi.fn() };
    const t2: LogTransport = { send: vi.fn() };
    registerTransport(t1);
    registerTransport(t2);

    logError({ layer: "action", operation: "createGroup" });

    expect(t1.send).toHaveBeenCalledOnce();
    expect(t2.send).toHaveBeenCalledOnce();
  });

  it("does not crash when transport throws", () => {
    const badTransport: LogTransport = {
      send: () => { throw new Error("transport broke"); },
    };
    registerTransport(badTransport);

    expect(() => logError({ layer: "dal", operation: "test" })).not.toThrow();
  });

  it("formats Error objects with message and code", () => {
    vi.stubEnv("ENABLE_DEBUG_LOGS", "true");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const supabaseError: any = new Error("Row not found");
    supabaseError.code = "PGRST116";
    supabaseError.details = "Results contain 0 rows";
    supabaseError.hint = null;

    logError({ layer: "dal", operation: "getGroupById" }, supabaseError);

    expect(spy).toHaveBeenCalledWith(
      "[dal] getGroupById failed",
      expect.objectContaining({
        error: expect.objectContaining({
          message: "Row not found",
          code: "PGRST116",
          details: "Results contain 0 rows",
        }),
      })
    );
  });

  it("handles non-Error objects as errors", () => {
    vi.stubEnv("ENABLE_DEBUG_LOGS", "true");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logError({ layer: "dal", operation: "test" }, { message: "plain object error" });

    expect(spy).toHaveBeenCalledWith(
      "[dal] test failed",
      expect.objectContaining({
        error: { message: "plain object error" },
      })
    );
  });
});

describe("logWarn", () => {
  beforeEach(() => {
    clearTransports();
    vi.restoreAllMocks();
  });

  it("logs to console when enabled", () => {
    vi.stubEnv("ENABLE_DEBUG_LOGS", "true");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    logWarn({ layer: "dal", operation: "getPlayersForMatch" }, "no squad data, falling back to roster");

    expect(spy).toHaveBeenCalledWith(
      "[dal] getPlayersForMatch: no squad data, falling back to roster",
      undefined
    );
  });

  it("sends to transports", () => {
    const t: LogTransport = { send: vi.fn() };
    registerTransport(t);

    logWarn({ layer: "hook", operation: "useRealtime" }, "subscription failed");

    expect(t.send).toHaveBeenCalledWith(
      "warn",
      "[hook] useRealtime: subscription failed",
      expect.any(Object)
    );
  });
});

describe("clearTransports", () => {
  it("removes all registered transports", () => {
    const t: LogTransport = { send: vi.fn() };
    registerTransport(t);
    clearTransports();

    logError({ layer: "dal", operation: "test" });

    expect(t.send).not.toHaveBeenCalled();
  });
});
