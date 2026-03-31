import { createMockSupabaseClient, createMockQueryBuilder } from "@/test/helpers/mock-supabase";
import { MOCK_MATCH_UPCOMING, MOCK_MATCH_COMPLETED } from "@/__mocks__/data";

const mockClient = createMockSupabaseClient();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockClient)),
}));

import {
  getMatchById,
  getUpcomingMatches,
  getMatchDeadlineInfo,
  updateMatchResults,
  resolveMatchPredictions,
} from "./matches";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getMatchById
// ---------------------------------------------------------------------------
describe("getMatchById", () => {
  it("returns the match when found", async () => {
    const builder = createMockQueryBuilder([MOCK_MATCH_UPCOMING]);
    mockClient.from.mockReturnValue(builder);

    const result = await getMatchById(2);
    expect(result).toEqual(MOCK_MATCH_UPCOMING);
    expect(mockClient.from).toHaveBeenCalledWith("matches");
    expect(builder.eq).toHaveBeenCalledWith("id", 2);
    expect(builder.single).toHaveBeenCalled();
  });

  it("returns null when not found", async () => {
    const builder = createMockQueryBuilder([], { message: "Not found" });
    mockClient.from.mockReturnValue(builder);

    const result = await getMatchById(999);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getUpcomingMatches
// ---------------------------------------------------------------------------
describe("getUpcomingMatches", () => {
  it("returns upcoming matches ordered by date", async () => {
    const builder = createMockQueryBuilder([MOCK_MATCH_UPCOMING]);
    mockClient.from.mockReturnValue(builder);

    const result = await getUpcomingMatches();
    expect(result).toEqual([MOCK_MATCH_UPCOMING]);
    expect(mockClient.from).toHaveBeenCalledWith("matches");
    expect(builder.in).toHaveBeenCalledWith("status", ["upcoming", "live"]);
    expect(builder.order).toHaveBeenCalledWith("date", { ascending: true });
    expect(builder.limit).toHaveBeenCalledWith(5);
  });

  it("respects custom limit", async () => {
    const builder = createMockQueryBuilder([MOCK_MATCH_UPCOMING]);
    mockClient.from.mockReturnValue(builder);

    await getUpcomingMatches(10);
    expect(builder.limit).toHaveBeenCalledWith(10);
  });

  it("returns empty array on error", async () => {
    const builder = createMockQueryBuilder(null as any, { message: "Error" });
    mockClient.from.mockReturnValue(builder);

    const result = await getUpcomingMatches();
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getMatchDeadlineInfo
// ---------------------------------------------------------------------------
describe("getMatchDeadlineInfo", () => {
  it("returns date, time_ist and status", async () => {
    const deadlineInfo = { date: "2026-03-29", time_ist: "19:30", status: "upcoming" };
    const builder = createMockQueryBuilder([deadlineInfo]);
    mockClient.from.mockReturnValue(builder);

    const result = await getMatchDeadlineInfo(2);
    expect(result).toEqual(deadlineInfo);
    expect(builder.select).toHaveBeenCalledWith("date, time_ist, status");
    expect(builder.eq).toHaveBeenCalledWith("id", 2);
    expect(builder.single).toHaveBeenCalled();
  });

  it("returns null on error", async () => {
    const builder = createMockQueryBuilder([], { message: "Not found" });
    mockClient.from.mockReturnValue(builder);

    const result = await getMatchDeadlineInfo(999);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateMatchResults
// ---------------------------------------------------------------------------
describe("updateMatchResults", () => {
  it("updates match and returns true on success", async () => {
    const builder = createMockQueryBuilder([{ id: 1 }]);
    mockClient.from.mockReturnValue(builder);

    const result = await updateMatchResults(1, {
      match_winner: "RCB",
      toss_winner: "RCB",
    });

    expect(result).toBe(true);
    expect(mockClient.from).toHaveBeenCalledWith("matches");
    expect(builder.update).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", 1);
  });

  it("returns false on error", async () => {
    const builder = createMockQueryBuilder([], { message: "Update error" });
    mockClient.from.mockReturnValue(builder);

    const result = await updateMatchResults(1, { match_winner: "RCB" });
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveMatchPredictions
// ---------------------------------------------------------------------------
describe("resolveMatchPredictions", () => {
  it("calls the rpc and returns true on success", async () => {
    mockClient.rpc.mockResolvedValue({ error: null });

    const result = await resolveMatchPredictions(1);
    expect(result).toBe(true);
    expect(mockClient.rpc).toHaveBeenCalledWith("resolve_match_predictions", {
      p_match_id: 1,
    });
  });

  it("returns false when rpc errors", async () => {
    mockClient.rpc.mockResolvedValue({ error: { message: "RPC failed" } });

    const result = await resolveMatchPredictions(1);
    expect(result).toBe(false);
  });
});
