import { createMockSupabaseClient, createMockQueryBuilder } from "@/test/helpers/mock-supabase";
import { MOCK_PLAYERS_CSK, MOCK_PLAYERS_MI, MOCK_PLAYERS } from "@/__mocks__/data";

const mockClient = createMockSupabaseClient();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockClient)),
}));

import { getPlayersForTeam, getPlayersForMatch } from "./players";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getPlayersForTeam
// ---------------------------------------------------------------------------
describe("getPlayersForTeam", () => {
  it("returns active players for a team", async () => {
    const builder = createMockQueryBuilder(MOCK_PLAYERS_CSK);
    mockClient.from.mockReturnValue(builder);

    const result = await getPlayersForTeam("CSK");
    expect(result).toEqual(MOCK_PLAYERS_CSK);
    expect(mockClient.from).toHaveBeenCalledWith("players");
    expect(builder.eq).toHaveBeenCalledWith("team_code", "CSK");
    expect(builder.eq).toHaveBeenCalledWith("is_active", true);
    expect(builder.order).toHaveBeenCalledWith("name", { ascending: true });
  });

  it("returns empty array on error", async () => {
    const builder = createMockQueryBuilder(null as any, { message: "Error" });
    mockClient.from.mockReturnValue(builder);

    const result = await getPlayersForTeam("INVALID");
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getPlayersForMatch
// ---------------------------------------------------------------------------
describe("getPlayersForMatch", () => {
  it("returns players from match_squads when available", async () => {
    const squadRows = MOCK_PLAYERS.map((p) => ({ player: p }));
    const builder = createMockQueryBuilder(squadRows);
    mockClient.from.mockReturnValue(builder);

    const result = await getPlayersForMatch(2);
    expect(result).toHaveLength(MOCK_PLAYERS.length);
    expect(mockClient.from).toHaveBeenCalledWith("match_squads");
  });

  it("falls back to team rosters when no squad data", async () => {
    let callIndex = 0;
    mockClient.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // match_squads returns empty
        return createMockQueryBuilder([]);
      }
      if (callIndex === 2) {
        // matches lookup for team_a, team_b
        return createMockQueryBuilder([{ team_a: "CSK", team_b: "MI" }]);
      }
      // players query
      return createMockQueryBuilder(MOCK_PLAYERS);
    });

    const result = await getPlayersForMatch(2);
    expect(result).toEqual(MOCK_PLAYERS);
  });

  it("returns empty array when match not found in fallback", async () => {
    let callIndex = 0;
    mockClient.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return createMockQueryBuilder([]);
      }
      // matches lookup returns null (error)
      return createMockQueryBuilder([], { message: "Not found" });
    });

    const result = await getPlayersForMatch(999);
    expect(result).toEqual([]);
  });
});
