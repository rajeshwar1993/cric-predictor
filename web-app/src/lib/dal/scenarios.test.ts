import { createMockSupabaseClient, createMockQueryBuilder } from "@/test/helpers/mock-supabase";
import { MOCK_SCENARIOS } from "@/__mocks__/data";

const mockClient = createMockSupabaseClient();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockClient)),
}));

import { getScenariosForMatch, seedSystemScenarios, createCustomScenario } from "./scenarios";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getScenariosForMatch
// ---------------------------------------------------------------------------
describe("getScenariosForMatch", () => {
  it("returns approved scenarios for a group+match", async () => {
    const builder = createMockQueryBuilder(MOCK_SCENARIOS);
    mockClient.from.mockReturnValue(builder);

    const result = await getScenariosForMatch("group-001", 2);
    expect(result).toEqual(MOCK_SCENARIOS);
    expect(mockClient.from).toHaveBeenCalledWith("scenarios");
    expect(builder.eq).toHaveBeenCalledWith("group_id", "group-001");
    expect(builder.eq).toHaveBeenCalledWith("match_id", 2);
    expect(builder.eq).toHaveBeenCalledWith("is_removed", false);
    expect(builder.in).toHaveBeenCalledWith("approval_status", ["auto_approved", "approved"]);
    expect(builder.order).toHaveBeenCalledWith("type", { ascending: true });
    expect(builder.order).toHaveBeenCalledWith("points", { ascending: false });
  });

  it("returns empty array on error", async () => {
    const builder = createMockQueryBuilder(null as any, { message: "Error" });
    mockClient.from.mockReturnValue(builder);

    const result = await getScenariosForMatch("group-001", 2);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// seedSystemScenarios
// ---------------------------------------------------------------------------
describe("seedSystemScenarios", () => {
  it("calls rpc and returns true on success", async () => {
    mockClient.rpc.mockResolvedValue({ error: null });

    const result = await seedSystemScenarios("group-001", 2);
    expect(result).toBe(true);
    expect(mockClient.rpc).toHaveBeenCalledWith("seed_system_scenarios", {
      p_group_id: "group-001",
      p_match_id: 2,
    });
  });

  it("returns false when rpc errors", async () => {
    mockClient.rpc.mockResolvedValue({ error: { message: "RPC error" } });

    const result = await seedSystemScenarios("group-001", 2);
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createCustomScenario
// ---------------------------------------------------------------------------
describe("createCustomScenario", () => {
  it("inserts and returns the created scenario", async () => {
    const customScenario = MOCK_SCENARIOS.find((s) => s.id === "sc-custom-01")!;
    const builder = createMockQueryBuilder([customScenario]);
    mockClient.from.mockReturnValue(builder);

    const result = await createCustomScenario({
      groupId: "group-001",
      matchId: 2,
      createdBy: "user-003",
      title: "Will Dhoni hit a six in the last over?",
      options: ["Yes", "No"],
      points: 15,
    });

    expect(result).toEqual(customScenario);
    expect(mockClient.from).toHaveBeenCalledWith("scenarios");
    expect(builder.insert).toHaveBeenCalledWith({
      group_id: "group-001",
      match_id: 2,
      created_by: "user-003",
      type: "custom",
      title: "Will Dhoni hit a six in the last over?",
      options: ["Yes", "No"],
      points: 15,
      approval_status: "pending",
    });
    expect(builder.single).toHaveBeenCalled();
  });

  it("returns null on error", async () => {
    const builder = createMockQueryBuilder([], { message: "Insert failed" });
    mockClient.from.mockReturnValue(builder);

    const result = await createCustomScenario({
      groupId: "group-001",
      matchId: 2,
      createdBy: "user-003",
      title: "Some question?",
      options: ["Yes", "No"],
      points: 10,
    });

    expect(result).toBeNull();
  });
});
