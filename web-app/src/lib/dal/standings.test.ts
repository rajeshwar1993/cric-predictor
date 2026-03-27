import { createMockSupabaseClient, createMockQueryBuilder } from "@/test/helpers/mock-supabase";
import { MOCK_SEASON_STANDINGS, MOCK_MATCH_LEADERBOARD } from "@/__mocks__/data";

const mockClient = createMockSupabaseClient();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockClient)),
}));

import { getSeasonStandings, getMatchLeaderboard } from "./standings";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getSeasonStandings
// ---------------------------------------------------------------------------
describe("getSeasonStandings", () => {
  it("returns season standings for a group", async () => {
    const builder = createMockQueryBuilder(MOCK_SEASON_STANDINGS);
    mockClient.from.mockReturnValue(builder);

    const result = await getSeasonStandings("group-001");
    expect(result).toEqual(MOCK_SEASON_STANDINGS);
    expect(mockClient.from).toHaveBeenCalledWith("season_standings");
    expect(builder.eq).toHaveBeenCalledWith("group_id", "group-001");
    expect(builder.order).toHaveBeenCalledWith("rank", { ascending: true });
  });

  it("returns empty array on error", async () => {
    const builder = createMockQueryBuilder(null as any, { message: "Error" });
    mockClient.from.mockReturnValue(builder);

    const result = await getSeasonStandings("group-001");
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getMatchLeaderboard
// ---------------------------------------------------------------------------
describe("getMatchLeaderboard", () => {
  it("returns match leaderboard entries", async () => {
    const builder = createMockQueryBuilder(MOCK_MATCH_LEADERBOARD);
    mockClient.from.mockReturnValue(builder);

    const result = await getMatchLeaderboard("group-001", 1);
    expect(result).toEqual(MOCK_MATCH_LEADERBOARD);
    expect(mockClient.from).toHaveBeenCalledWith("match_leaderboard");
    expect(builder.eq).toHaveBeenCalledWith("group_id", "group-001");
    expect(builder.eq).toHaveBeenCalledWith("match_id", 1);
    expect(builder.order).toHaveBeenCalledWith("rank", { ascending: true });
  });

  it("returns empty array on error", async () => {
    const builder = createMockQueryBuilder(null as any, { message: "Error" });
    mockClient.from.mockReturnValue(builder);

    const result = await getMatchLeaderboard("group-001", 999);
    expect(result).toEqual([]);
  });
});
