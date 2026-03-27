import { createMockSupabaseClient, createMockQueryBuilder } from "@/test/helpers/mock-supabase";

const mockClient = createMockSupabaseClient();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockClient)),
}));

import { getAllTeams, getTeamByCode } from "./teams";

const MOCK_TEAMS = [
  { code: "CSK", name: "Chennai Super Kings", short_name: "Chennai", color: "#F9CD05", text_on_color: "dark" as const },
  { code: "MI", name: "Mumbai Indians", short_name: "Mumbai", color: "#004BA0", text_on_color: "light" as const },
];

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getAllTeams
// ---------------------------------------------------------------------------
describe("getAllTeams", () => {
  it("returns all teams ordered by name", async () => {
    const builder = createMockQueryBuilder(MOCK_TEAMS);
    mockClient.from.mockReturnValue(builder);

    const result = await getAllTeams();
    expect(result).toEqual(MOCK_TEAMS);
    expect(mockClient.from).toHaveBeenCalledWith("teams");
    expect(builder.select).toHaveBeenCalledWith("code, name, short_name, color, text_on_color");
    expect(builder.order).toHaveBeenCalledWith("name", { ascending: true });
  });

  it("returns empty array on error", async () => {
    const builder = createMockQueryBuilder(null as any, { message: "Error" });
    mockClient.from.mockReturnValue(builder);

    const result = await getAllTeams();
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getTeamByCode
// ---------------------------------------------------------------------------
describe("getTeamByCode", () => {
  it("returns team matching the code", async () => {
    const builder = createMockQueryBuilder([MOCK_TEAMS[0]]);
    mockClient.from.mockReturnValue(builder);

    const result = await getTeamByCode("CSK");
    expect(result).toEqual(MOCK_TEAMS[0]);
    expect(builder.eq).toHaveBeenCalledWith("code", "CSK");
    expect(builder.single).toHaveBeenCalled();
  });

  it("returns null for unknown code", async () => {
    const builder = createMockQueryBuilder([], { message: "Not found" });
    mockClient.from.mockReturnValue(builder);

    const result = await getTeamByCode("UNKNOWN");
    expect(result).toBeNull();
  });
});
