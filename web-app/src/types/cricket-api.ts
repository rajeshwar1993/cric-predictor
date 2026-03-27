// api-cricket.com v2.0 API response types
// Reference: docs/api-cricket-integration-guide.md

// Response wrapper — { success: 1, result: [...] }
export interface ApiCricketResponse<T> {
  success: number;
  result: T;
}

// Unified event type returned by get_events and get_livescore.
// Contains match metadata, scorecard, ball-by-ball, wickets, extras, and lineups.
export interface EventResponse {
  event_key: string;
  event_date_start: string;
  event_date_stop: string;
  event_time: string;
  event_home_team: string;
  home_team_key: string;
  event_away_team: string;
  away_team_key: string;
  event_stadium: string;
  event_home_team_logo: string;
  event_away_team_logo: string;
  event_status: string;
  event_status_info: string;
  event_live: string;
  event_toss: string;
  event_man_of_match: string;
  event_service_home: string;
  event_service_away: string;
  event_home_final_result: string;
  event_away_final_result: string;
  event_home_rr: string | null;
  event_away_rr: string | null;
  event_type: string;
  league_name: string;
  league_key: string;
  league_round: string;
  league_season: string;
  scorecard: Record<string, ScorecardEntry[]>;
  comments: Record<string, CommentEntry[]>;
  wickets: Record<string, WicketEntry[]>;
  extra: Record<string, ExtraEntry>;
  lineups: LineupsResponse;
}

// Mixed batting/bowling entry — differentiated by `type` field.
// All numeric fields are strings; use safeInt/safeFloat from parsers.ts.
export interface ScorecardEntry {
  innings: string;
  player: string;
  type: "Batsman" | "Bowler";
  status: string;
  // Batting fields
  R: string;
  B: string;
  Min: string;
  "4s": string;
  "6s": string;
  SR: string;
  // Bowling fields
  O: string;
  M: string;
  W: string;
  ER: string;
}

// Ball-by-ball commentary entry
export interface CommentEntry {
  innings: string;
  overs: string;
  balls: string;
  runs: string;
  ended: string;
  post: string;
}

// Fall of wicket entry
export interface WicketEntry {
  innings: string;
  fall: string;        // "3.4 ov"
  balwer: string;      // Note: API typo for "bowler"
  batsman: string;     // Dismissal text, e.g., "c Markram b Bhuvneshwar 12"
  score: string;       // Team score at dismissal, e.g., "28/1"
}

// Extras and innings total
export interface ExtraEntry {
  innings: string;
  nr: string;
  text: string;           // "(w 6, nb 3, lb 2, b 1)"
  total: string;          // "185 ( 20 )" — runs ( overs )
  total_overs: string | null;
  percent_over: string | null;
}

// Playing XI lineups
export interface LineupsResponse {
  home_team: { starting_lineups: LineupPlayer[] };
  away_team: { starting_lineups: LineupPlayer[] };
}

export interface LineupPlayer {
  player: string;
}

// League metadata from get_leagues
export interface LeagueInfo {
  league_key: string;
  league_name: string;
  league_year: string;
}

// Client interface — both real and mock clients implement this
export interface CricketApiClient {
  getEvents(params: {
    leagueKey?: string;
    eventKey?: string;
    dateStart?: string;
    dateStop?: string;
  }): Promise<EventResponse[]>;
  getLivescore(params: {
    matchKey?: string;
    leagueKey?: string;
  }): Promise<EventResponse[]>;
}
