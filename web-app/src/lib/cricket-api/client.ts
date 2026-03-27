import type {
  CricketApiClient,
  ApiCricketResponse,
  EventResponse,
} from "./types";

const API_BASE =
  process.env.CRICKET_API_BASE_URL || "https://apiv2.api-cricket.com/cricket/";
const API_KEY = process.env.CRICKET_API_KEY || "";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchApi<T>(
  method: string,
  params: Record<string, string> = {},
  retries = MAX_RETRIES
): Promise<T> {
  const url = new URL(API_BASE);
  url.searchParams.set("method", method);
  url.searchParams.set("APIkey", API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status >= 500 && attempt < retries) {
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        throw new Error(
          `api-cricket.com error: ${response.status} ${response.statusText}`
        );
      }

      const json: ApiCricketResponse<T> = await response.json();

      if (json.success !== 1) {
        throw new Error(`api-cricket.com returned success: ${json.success}`);
      }

      return json.result;
    } catch (error) {
      if (attempt < retries && error instanceof TypeError) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      throw error;
    }
  }

  throw new Error("api-cricket.com: max retries exceeded");
}

export const realClient: CricketApiClient = {
  async getEvents(params): Promise<EventResponse[]> {
    const queryParams: Record<string, string> = {};
    if (params.leagueKey) queryParams.league_key = params.leagueKey;
    if (params.eventKey) queryParams.event_key = params.eventKey;
    if (params.dateStart) queryParams.date_start = params.dateStart;
    if (params.dateStop) queryParams.date_stop = params.dateStop;
    return fetchApi<EventResponse[]>("get_events", queryParams);
  },

  async getLivescore(params): Promise<EventResponse[]> {
    const queryParams: Record<string, string> = {};
    if (params.matchKey) queryParams.match_key = params.matchKey;
    if (params.leagueKey) queryParams.league_key = params.leagueKey;
    return fetchApi<EventResponse[]>("get_livescore", queryParams);
  },
};
