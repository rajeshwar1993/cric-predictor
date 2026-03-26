import type {
  CricketApiClient,
  SeriesMatch,
  MatchInfo,
  ScorecardResponse,
  SquadResponse,
} from "./types";

// Mock data imports — these are read from static JSON fixtures
// In production, these would come from the CricketData.org API

async function loadMockData<T>(path: string): Promise<T> {
  // Dynamic import for JSON fixtures in mock-data directory
  try {
    const data = await import(`@/lib/mock-data/${path}`);
    return data.default as T;
  } catch {
    throw new Error(`Mock data not found: ${path}`);
  }
}

export const mockClient: CricketApiClient = {
  async getSeriesMatches(_seriesId: string): Promise<SeriesMatch[]> {
    return loadMockData<SeriesMatch[]>("matches.json");
  },

  async getMatchInfo(matchId: string): Promise<MatchInfo> {
    // Load the completed scorecard as match info (subset of fields)
    const scorecard = await loadMockData<ScorecardResponse>(
      `scorecards/match-${matchId}/completed.json`
    );
    return scorecard as unknown as MatchInfo;
  },

  async getMatchScorecard(matchId: string): Promise<ScorecardResponse> {
    return loadMockData<ScorecardResponse>(
      `scorecards/match-${matchId}/completed.json`
    );
  },

  async getMatchSquad(matchId: string): Promise<SquadResponse> {
    return loadMockData<SquadResponse>(`squads/match-${matchId}.json`);
  },
};
