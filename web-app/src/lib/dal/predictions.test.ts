import { createMockSupabaseClient, createMockQueryBuilder } from "@/test/helpers/mock-supabase";
import { MOCK_PREDICTIONS } from "@/__mocks__/data";

const mockClient = createMockSupabaseClient();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockClient)),
}));

import { getPredictionsForUser, upsertPredictions, getUserPredictionCount } from "./predictions";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getPredictionsForUser
// ---------------------------------------------------------------------------
describe("getPredictionsForUser", () => {
  it("returns predictions for given scenario IDs", async () => {
    const builder = createMockQueryBuilder(MOCK_PREDICTIONS);
    mockClient.from.mockReturnValue(builder);

    const result = await getPredictionsForUser("user-001", ["sc-01", "sc-02"]);
    expect(result).toEqual(MOCK_PREDICTIONS);
    expect(mockClient.from).toHaveBeenCalledWith("predictions");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-001");
    expect(builder.in).toHaveBeenCalledWith("scenario_id", ["sc-01", "sc-02"]);
  });

  it("returns empty array when scenarioIds is empty", async () => {
    const result = await getPredictionsForUser("user-001", []);
    expect(result).toEqual([]);
    expect(mockClient.from).not.toHaveBeenCalled();
  });

  it("returns empty array on error", async () => {
    const builder = createMockQueryBuilder(null as any, { message: "DB error" });
    mockClient.from.mockReturnValue(builder);

    const result = await getPredictionsForUser("user-001", ["sc-01"]);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// upsertPredictions
// ---------------------------------------------------------------------------
describe("upsertPredictions", () => {
  it("upserts multiple predictions and returns true", async () => {
    const builder = createMockQueryBuilder([]);
    mockClient.from.mockReturnValue(builder);

    const predictions = [
      { scenarioId: "sc-01", value: "CSK" },
      { scenarioId: "sc-02", value: "MI" },
    ];

    const result = await upsertPredictions("user-001", predictions);
    expect(result).toBe(true);
    expect(mockClient.from).toHaveBeenCalledWith("predictions");
    expect(builder.upsert).toHaveBeenCalled();
    // Verify the rows include the correct structure
    const upsertArg = builder.upsert.mock.calls[0][0];
    expect(upsertArg).toHaveLength(2);
    expect(upsertArg[0]).toMatchObject({ user_id: "user-001", scenario_id: "sc-01", value: "CSK" });
    expect(upsertArg[1]).toMatchObject({ user_id: "user-001", scenario_id: "sc-02", value: "MI" });
  });

  it("returns false on error", async () => {
    const builder = createMockQueryBuilder([], { message: "Upsert failed" });
    mockClient.from.mockReturnValue(builder);

    const result = await upsertPredictions("user-001", [{ scenarioId: "sc-01", value: "CSK" }]);
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getUserPredictionCount
// ---------------------------------------------------------------------------
describe("getUserPredictionCount", () => {
  it("returns count of predictions for approved scenarios", async () => {
    // First call: scenarios query
    const scenarioRows = [{ id: "sc-01" }, { id: "sc-02" }, { id: "sc-03" }];
    // Second call: predictions count
    let callIndex = 0;
    mockClient.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return createMockQueryBuilder(scenarioRows);
      }
      // For the count query, we need to handle the special select with head:true
      const countBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ count: 2, data: null, error: null }),
      };
      return countBuilder;
    });

    const result = await getUserPredictionCount("user-001", "group-001", 2);
    expect(result).toBe(2);
  });

  it("returns 0 when no scenarios exist", async () => {
    const builder = createMockQueryBuilder([]);
    mockClient.from.mockReturnValue(builder);

    const result = await getUserPredictionCount("user-001", "group-001", 999);
    expect(result).toBe(0);
  });
});
