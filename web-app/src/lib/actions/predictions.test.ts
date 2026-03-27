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

vi.mock("@/lib/dal/predictions");
vi.mock("@/lib/dal/scenarios");
vi.mock("@/lib/dal/members");
vi.mock("@/lib/dal/matches");
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    isDeadlinePassed: vi.fn().mockReturnValue(false),
  };
});

import * as predictionsDal from "@/lib/dal/predictions";
import * as scenariosDal from "@/lib/dal/scenarios";
import * as membersDal from "@/lib/dal/members";
import * as matchesDal from "@/lib/dal/matches";
import { isDeadlinePassed } from "@/lib/utils";
import { submitPredictions } from "./predictions";

const mockedPredDal = vi.mocked(predictionsDal);
const mockedScenDal = vi.mocked(scenariosDal);
const mockedMembersDal = vi.mocked(membersDal);
const mockedMatchesDal = vi.mocked(matchesDal);
const mockedIsDeadlinePassed = vi.mocked(isDeadlinePassed);

const groupId = "group-001";
const matchId = 2;

// Use UUID-formatted scenario IDs to pass Zod validation
const UUID_SC_01 = "a0000000-0000-4000-8000-000000000001";
const UUID_SC_02 = "a0000000-0000-4000-8000-000000000002";
const UUID_SC_INVALID = "a0000000-0000-4000-8000-000000000099";
const UUID_SC_INVALID2 = "a0000000-0000-4000-8000-000000000098";

const validPredictions = [
  { scenarioId: UUID_SC_01, value: "CSK" },
  { scenarioId: UUID_SC_02, value: "MI" },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthenticatedUser(mockClient, "user-001");

  // Default happy-path mocks
  mockedMembersDal.getMembershipStatus.mockResolvedValue({ status: "approved", role: "member" });
  mockedMatchesDal.getMatchDeadlineInfo.mockResolvedValue({ date: "2026-03-29", time_ist: "19:30", status: "upcoming" });
  mockedMatchesDal.getMatchGroupSettings.mockResolvedValue(null);
  mockedIsDeadlinePassed.mockReturnValue(false);
  // Use scenarios with UUID IDs to match what the validator expects
  const scenariosWithUuids = MOCK_SCENARIOS.map((s, i) => ({
    ...s,
    id: `a0000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  }));
  mockedScenDal.getScenariosForMatch.mockResolvedValue(scenariosWithUuids as any);
  mockedPredDal.upsertPredictions.mockResolvedValue(true);
});

describe("submitPredictions", () => {
  // --- validation ---
  it("fails validation for empty predictions array", async () => {
    const result = await submitPredictions(groupId, matchId, []);
    expect(result.success).toBe(false);
    expect(result.error).toContain("at least one prediction");
  });

  it("fails validation for prediction with empty value", async () => {
    const result = await submitPredictions(groupId, matchId, [
      { scenarioId: UUID_SC_01, value: "" },
    ]);
    expect(result.success).toBe(false);
  });

  // --- auth ---
  it("returns error when not authenticated", async () => {
    mockUnauthenticated(mockClient);
    const result = await submitPredictions(groupId, matchId, validPredictions);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  // --- membership ---
  it("returns error when user is not group member", async () => {
    mockedMembersDal.getMembershipStatus.mockResolvedValue(null);

    const result = await submitPredictions(groupId, matchId, validPredictions);
    expect(result).toEqual({ success: false, error: "You're not in this squad" });
  });

  it("returns error when membership is pending", async () => {
    mockedMembersDal.getMembershipStatus.mockResolvedValue({ status: "pending", role: "member" });

    const result = await submitPredictions(groupId, matchId, validPredictions);
    expect(result).toEqual({ success: false, error: "You're not in this squad" });
  });

  // --- match checks ---
  it("returns error when match not found", async () => {
    mockedMatchesDal.getMatchDeadlineInfo.mockResolvedValue(null);

    const result = await submitPredictions(groupId, matchId, validPredictions);
    expect(result).toEqual({ success: false, error: "Match not found" });
  });

  it("returns error when match is not upcoming (live)", async () => {
    mockedMatchesDal.getMatchDeadlineInfo.mockResolvedValue({ date: "2026-03-28", time_ist: "19:30", status: "live" });

    const result = await submitPredictions(groupId, matchId, validPredictions);
    expect(result).toEqual({ success: false, error: "Picks are closed for this match" });
  });

  it("returns error when match is completed", async () => {
    mockedMatchesDal.getMatchDeadlineInfo.mockResolvedValue({ date: "2026-03-28", time_ist: "19:30", status: "completed" });

    const result = await submitPredictions(groupId, matchId, validPredictions);
    expect(result).toEqual({ success: false, error: "Picks are closed for this match" });
  });

  // --- locked ---
  it("returns error when predictions are locked", async () => {
    mockedMatchesDal.getMatchGroupSettings.mockResolvedValue({
      prediction_deadline: null,
      is_locked: true,
      scenarios_published: true,
    });

    const result = await submitPredictions(groupId, matchId, validPredictions);
    expect(result).toEqual({ success: false, error: "Picks are locked for this match" });
  });

  // --- deadline ---
  it("returns error when deadline has passed", async () => {
    mockedIsDeadlinePassed.mockReturnValue(true);

    const result = await submitPredictions(groupId, matchId, validPredictions);
    expect(result).toEqual({ success: false, error: "Too late — the deadline has passed" });
  });

  // --- scenario filtering ---
  it("filters out predictions for invalid scenario IDs", async () => {
    const predictions = [
      { scenarioId: UUID_SC_01, value: "CSK" },
      { scenarioId: UUID_SC_INVALID, value: "MI" },
    ];

    const result = await submitPredictions(groupId, matchId, predictions);
    expect(result).toEqual({ success: true });
    // Only UUID_SC_01 should be passed to upsert (UUID_SC_INVALID is not in scenarios)
    expect(mockedPredDal.upsertPredictions).toHaveBeenCalledWith("user-001", [
      { scenarioId: UUID_SC_01, value: "CSK" },
    ]);
  });

  it("returns error when all predictions are for invalid scenarios", async () => {
    const predictions = [
      { scenarioId: UUID_SC_INVALID, value: "CSK" },
      { scenarioId: UUID_SC_INVALID2, value: "MI" },
    ];

    const result = await submitPredictions(groupId, matchId, predictions);
    expect(result).toEqual({ success: false, error: "No valid picks to lock in" });
  });

  // --- happy path ---
  it("submits predictions successfully", async () => {
    const result = await submitPredictions(groupId, matchId, validPredictions);
    expect(result).toEqual({ success: true });
    expect(mockedPredDal.upsertPredictions).toHaveBeenCalledWith("user-001", validPredictions);
  });

  it("returns error when upsert fails", async () => {
    mockedPredDal.upsertPredictions.mockResolvedValue(false);

    const result = await submitPredictions(groupId, matchId, validPredictions);
    expect(result).toEqual({ success: false, error: "Couldn't lock those in — try again" });
  });
});
