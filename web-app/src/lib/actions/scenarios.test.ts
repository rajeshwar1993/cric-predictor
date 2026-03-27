import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticated,
} from "@/test/helpers/mock-supabase";
import { MOCK_SCENARIOS } from "@/__mocks__/data";

const mockClient = createMockSupabaseClient();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockClient)),
}));

vi.mock("@/lib/dal/scenarios");
vi.mock("@/lib/dal/members");

import * as scenariosDal from "@/lib/dal/scenarios";
import * as membersDal from "@/lib/dal/members";
import {
  createCustomScenario,
  approveScenario,
  rejectScenario,
  removeScenario,
} from "./scenarios";

const mockedScenDal = vi.mocked(scenariosDal);
const mockedMembersDal = vi.mocked(membersDal);

const groupId = "a0000000-0000-4000-8000-000000000001";
const scenarioId = "sc-custom-01";
const customScenario = MOCK_SCENARIOS.find((s) => s.id === "sc-custom-01")!;

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthenticatedUser(mockClient, "user-001");
  mockedMembersDal.getMembershipStatus.mockResolvedValue({ status: "approved", role: "admin" });
});

// ---------------------------------------------------------------------------
// createCustomScenario
// ---------------------------------------------------------------------------
describe("createCustomScenario", () => {
  it("fails validation for short title", async () => {
    const result = await createCustomScenario(groupId, 2, "Hi?", ["Yes", "No"], 10);
    expect(result.success).toBe(false);
    expect(result.error).toContain("at least 5 characters");
  });

  it("fails validation for fewer than 2 options", async () => {
    const result = await createCustomScenario(groupId, 2, "Will it rain today?", ["Yes"], 10);
    expect(result.success).toBe(false);
    expect(result.error).toContain("2 options");
  });

  it("fails validation for invalid points", async () => {
    const result = await createCustomScenario(groupId, 2, "Will it rain today?", ["Yes", "No"], 99 as any);
    expect(result.success).toBe(false);
  });

  it("returns error when not authenticated", async () => {
    mockUnauthenticated(mockClient);
    const result = await createCustomScenario(groupId, 2, "Will it rain today?", ["Yes", "No"], 10);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error when user is not group member", async () => {
    mockedMembersDal.getMembershipStatus.mockResolvedValue(null);

    const result = await createCustomScenario(groupId, 2, "Will it rain today?", ["Yes", "No"], 10);
    expect(result).toEqual({ success: false, error: "You're not in this squad" });
  });

  it("creates a custom scenario successfully", async () => {
    mockedScenDal.createCustomScenario.mockResolvedValue(customScenario);

    const result = await createCustomScenario(
      groupId, 2, "Will Dhoni hit a six in the last over?", ["Yes", "No"], 15
    );
    expect(result).toEqual({ success: true, data: customScenario });
    expect(mockedScenDal.createCustomScenario).toHaveBeenCalledWith({
      groupId,
      matchId: 2,
      createdBy: "user-001",
      title: "Will Dhoni hit a six in the last over?",
      options: ["Yes", "No"],
      points: 15,
    });
  });

  it("returns error when DAL create fails", async () => {
    mockedScenDal.createCustomScenario.mockResolvedValue(null);

    const result = await createCustomScenario(groupId, 2, "Will it rain today?", ["Yes", "No"], 10);
    expect(result).toEqual({ success: false, error: "Couldn't submit your wild card — try again" });
  });
});

// ---------------------------------------------------------------------------
// approveScenario
// ---------------------------------------------------------------------------
describe("approveScenario", () => {
  it("returns error when not authenticated", async () => {
    mockUnauthenticated(mockClient);
    const result = await approveScenario(groupId, scenarioId);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error when caller is a regular member", async () => {
    mockedMembersDal.getMembershipStatus.mockResolvedValue({ status: "approved", role: "member" });

    const result = await approveScenario(groupId, scenarioId);
    expect(result).toEqual({ success: false, error: "Only admins can approve scenarios" });
  });

  it("approves scenario with default points", async () => {
    mockedScenDal.updateScenarioApproval.mockResolvedValue(true);

    const result = await approveScenario(groupId, scenarioId);
    expect(result).toEqual({ success: true });
    expect(mockedScenDal.updateScenarioApproval).toHaveBeenCalledWith(scenarioId, "approved", undefined);
  });

  it("approves scenario with custom points", async () => {
    mockedScenDal.updateScenarioApproval.mockResolvedValue(true);

    const result = await approveScenario(groupId, scenarioId, 20);
    expect(result).toEqual({ success: true });
    expect(mockedScenDal.updateScenarioApproval).toHaveBeenCalledWith(scenarioId, "approved", 20);
  });

  it("returns error when DAL fails", async () => {
    mockedScenDal.updateScenarioApproval.mockResolvedValue(false);

    const result = await approveScenario(groupId, scenarioId);
    expect(result).toEqual({ success: false, error: "Failed to approve scenario" });
  });
});

// ---------------------------------------------------------------------------
// rejectScenario
// ---------------------------------------------------------------------------
describe("rejectScenario", () => {
  it("returns error when not authenticated", async () => {
    mockUnauthenticated(mockClient);
    const result = await rejectScenario(groupId, scenarioId);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error when caller is a regular member", async () => {
    mockedMembersDal.getMembershipStatus.mockResolvedValue({ status: "approved", role: "member" });

    const result = await rejectScenario(groupId, scenarioId);
    expect(result).toEqual({ success: false, error: "Only admins can reject scenarios" });
  });

  it("rejects scenario successfully", async () => {
    mockedScenDal.updateScenarioApproval.mockResolvedValue(true);

    const result = await rejectScenario(groupId, scenarioId);
    expect(result).toEqual({ success: true });
    expect(mockedScenDal.updateScenarioApproval).toHaveBeenCalledWith(scenarioId, "rejected");
  });

  it("returns error when DAL fails", async () => {
    mockedScenDal.updateScenarioApproval.mockResolvedValue(false);

    const result = await rejectScenario(groupId, scenarioId);
    expect(result).toEqual({ success: false, error: "Failed to reject scenario" });
  });
});

// ---------------------------------------------------------------------------
// removeScenario
// ---------------------------------------------------------------------------
describe("removeScenario", () => {
  it("returns error when not authenticated", async () => {
    mockUnauthenticated(mockClient);
    const result = await removeScenario(groupId, scenarioId);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error when caller is a regular member", async () => {
    mockedMembersDal.getMembershipStatus.mockResolvedValue({ status: "approved", role: "member" });

    const result = await removeScenario(groupId, scenarioId);
    expect(result).toEqual({ success: false, error: "Only admins can remove scenarios" });
  });

  it("removes scenario successfully", async () => {
    mockedScenDal.removeScenario.mockResolvedValue(true);

    const result = await removeScenario(groupId, scenarioId);
    expect(result).toEqual({ success: true });
    expect(mockedScenDal.removeScenario).toHaveBeenCalledWith(scenarioId, "user-001");
  });

  it("returns error when DAL fails", async () => {
    mockedScenDal.removeScenario.mockResolvedValue(false);

    const result = await removeScenario(groupId, scenarioId);
    expect(result).toEqual({ success: false, error: "Failed to remove scenario" });
  });
});
