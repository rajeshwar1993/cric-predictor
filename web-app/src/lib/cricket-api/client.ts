import type {
  CricketApiClient,
  CricketApiResponse,
  SeriesMatch,
  MatchInfo,
  ScorecardResponse,
  SquadResponse,
} from "./types";

const API_BASE = process.env.CRICKET_API_BASE_URL || "https://api.cricapi.com/v1";
const API_KEY = process.env.CRICKET_API_KEY || "";

async function fetchApi<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${API_BASE}${endpoint}`);
  url.searchParams.set("apikey", API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`CricketData API error: ${response.status} ${response.statusText}`);
  }

  const json: CricketApiResponse<T> = await response.json();

  if (json.status !== "success") {
    throw new Error(`CricketData API returned status: ${json.status}`);
  }

  return json.data;
}

export const realClient: CricketApiClient = {
  async getSeriesMatches(seriesId: string): Promise<SeriesMatch[]> {
    return fetchApi<SeriesMatch[]>("/series_info", { id: seriesId });
  },

  async getMatchInfo(matchId: string): Promise<MatchInfo> {
    return fetchApi<MatchInfo>("/match_info", { id: matchId });
  },

  async getMatchScorecard(matchId: string): Promise<ScorecardResponse> {
    return fetchApi<ScorecardResponse>("/match_scorecard", { id: matchId });
  },

  async getMatchSquad(matchId: string): Promise<SquadResponse> {
    return fetchApi<SquadResponse>("/match_squad", { id: matchId });
  },
};
