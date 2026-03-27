import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticated,
} from "@/test/helpers/mock-supabase";

const mockClient = createMockSupabaseClient();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockClient)),
}));

vi.mock("@/lib/dal/matches");
vi.mock("@/lib/dal/members");

import * as matchesDal from "@/lib/dal/matches";
import * as membersDal from "@/lib/dal/members";
import { enterResults, updateGroupSettings } from "./admin";

const mockedMatchesDal = vi.mocked(matchesDal);
const mockedMembersDal = vi.mocked(membersDal);

const groupId = "a0000000-0000-4000-8000-000000000001";
const matchId = 1;

const validResults = {
  matchWinner: "RCB",
  tossWinner: "RCB",
  topScorer: "Virat Kohli",
  topScorerRuns: 72,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthenticatedUser(mockClient, "user-001");
  mockedMembersDal.getMembershipStatus.mockResolvedValue({ status: "approved", role: "owner" });
});

// ---------------------------------------------------------------------------
// enterResults
// ---------------------------------------------------------------------------
describe("enterResults", () => {
  it("fails validation when matchWinner is missing", async () => {
    const result = await enterResults(groupId, matchId, { tossWinner: "RCB" });
    expect(result.success).toBe(false);
  });

  it("fails validation when tossWinner is missing", async () => {
    const result = await enterResults(groupId, matchId, { matchWinner: "RCB" });
    expect(result.success).toBe(false);
  });

  it("returns error when not authenticated", async () => {
    mockUnauthenticated(mockClient);
    const result = await enterResults(groupId, matchId, validResults);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error when caller is not admin/owner", async () => {
    mockedMembersDal.getMembershipStatus.mockResolvedValue({ status: "approved", role: "member" });

    const result = await enterResults(groupId, matchId, validResults);
    expect(result).toEqual({ success: false, error: "Only admins can enter results" });
  });

  it("enters results and triggers resolution successfully", async () => {
    mockedMatchesDal.updateMatchResults.mockResolvedValue(true);
    mockedMatchesDal.resolveMatchPredictions.mockResolvedValue(true);

    const result = await enterResults(groupId, matchId, validResults);
    expect(result).toEqual({ success: true });
    expect(mockedMatchesDal.updateMatchResults).toHaveBeenCalledWith(
      matchId,
      expect.objectContaining({
        match_winner: "RCB",
        toss_winner: "RCB",
        top_scorer: "Virat Kohli",
        top_scorer_runs: 72,
      })
    );
    expect(mockedMatchesDal.resolveMatchPredictions).toHaveBeenCalledWith(matchId);
  });

  it("returns error when update fails", async () => {
    mockedMatchesDal.updateMatchResults.mockResolvedValue(false);

    const result = await enterResults(groupId, matchId, validResults);
    expect(result).toEqual({ success: false, error: "Failed to update match results" });
  });

  it("returns partial error when resolution fails", async () => {
    mockedMatchesDal.updateMatchResults.mockResolvedValue(true);
    mockedMatchesDal.resolveMatchPredictions.mockResolvedValue(false);

    const result = await enterResults(groupId, matchId, validResults);
    expect(result).toEqual({ success: false, error: "Results saved but resolution failed" });
  });
});

// ---------------------------------------------------------------------------
// updateGroupSettings
// ---------------------------------------------------------------------------
describe("updateGroupSettings", () => {
  it("returns error when not authenticated", async () => {
    mockUnauthenticated(mockClient);
    const result = await updateGroupSettings(groupId, matchId, { isLocked: true });
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error when caller is not admin/owner", async () => {
    mockedMembersDal.getMembershipStatus.mockResolvedValue({ status: "approved", role: "member" });

    const result = await updateGroupSettings(groupId, matchId, { isLocked: true });
    expect(result).toEqual({ success: false, error: "Only admins can update settings" });
  });

  it("updates settings successfully", async () => {
    mockedMatchesDal.upsertMatchGroupSettings.mockResolvedValue(true);

    const result = await updateGroupSettings(groupId, matchId, {
      predictionDeadline: "2026-03-29T18:45:00Z",
      isLocked: false,
    });
    expect(result).toEqual({ success: true });
    expect(mockedMatchesDal.upsertMatchGroupSettings).toHaveBeenCalledWith(
      groupId,
      matchId,
      { prediction_deadline: "2026-03-29T18:45:00Z", is_locked: false }
    );
  });

  it("returns error when DAL fails", async () => {
    mockedMatchesDal.upsertMatchGroupSettings.mockResolvedValue(false);

    const result = await updateGroupSettings(groupId, matchId, { isLocked: true });
    expect(result).toEqual({ success: false, error: "Failed to update settings" });
  });
});
