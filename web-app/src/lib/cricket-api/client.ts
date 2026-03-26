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
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchApi<T>(
  endpoint: string,
  params: Record<string, string> = {},
  retries = MAX_RETRIES
): Promise<T> {
  const url = new URL(`${API_BASE}${endpoint}`);
  url.searchParams.set("apikey", API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        cache: "no-store",
      });

      if (!response.ok) {
        // Retry on 5xx, fail fast on 4xx
        if (response.status >= 500 && attempt < retries) {
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        throw new Error(`CricketData API error: ${response.status} ${response.statusText}`);
      }

      const json: CricketApiResponse<T> = await response.json();

      if (json.status !== "success") {
        throw new Error(`CricketData API returned status: ${json.status}`);
      }

      return json.data;
    } catch (error) {
      if (attempt < retries && error instanceof TypeError) {
        // Network error — retry
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      throw error;
    }
  }

  throw new Error("CricketData API: max retries exceeded");
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
