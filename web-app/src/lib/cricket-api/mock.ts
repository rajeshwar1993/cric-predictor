import type {
  CricketApiClient,
  EventResponse,
} from "./types";

async function loadMockData<T>(path: string): Promise<T> {
  try {
    const data = await import(`@/lib/mock-data/${path}`);
    return data.default as T;
  } catch {
    throw new Error(`Mock data not found: ${path}`);
  }
}

export const mockClient: CricketApiClient = {
  async getEvents(params): Promise<EventResponse[]> {
    if (params.eventKey) {
      // Single match — load completed scorecard
      const event = await loadMockData<EventResponse>(
        `scorecards/match-${params.eventKey}/completed.json`
      );
      return [event];
    }
    // All matches
    return loadMockData<EventResponse[]>("matches.json");
  },

  async getLivescore(params): Promise<EventResponse[]> {
    if (params.matchKey) {
      const event = await loadMockData<EventResponse>(
        `scorecards/match-${params.matchKey}/completed.json`
      );
      return [event];
    }
    return loadMockData<EventResponse[]>("matches.json");
  },
};
