// CricketData.org API response types
// Based on tech_plan.md Section 3

export interface CricketApiResponse<T> {
  apikey: string;
  data: T;
  status: string;
  info: {
    hitsToday: number;
    hitsUsed: number;
    hitsLimit: number;
    credits: number;
    server: number;
    offsetRows: number;
    totalRows: number;
    queryTime: number;
    s: number;
    cache: number;
  };
}

export interface SeriesMatch {
  id: string;
  name: string;
  matchType: string;
  status: string;
  venue: string;
  date: string;
  dateTimeGMT: string;
  teams: string[];
  teamInfo: TeamInfo[];
  score: ScoreInfo[];
  fantasyEnabled: boolean;
  bbbEnabled: boolean;
  hasSquad: boolean;
}

export interface TeamInfo {
  name: string;
  shortname: string;
  img: string;
}

export interface ScoreInfo {
  r: number;
  w: number;
  o: number;
  inning: string;
}

export interface MatchInfo {
  id: string;
  name: string;
  matchType: string;
  status: string;
  venue: string;
  date: string;
  dateTimeGMT: string;
  teams: string[];
  teamInfo: TeamInfo[];
  score: ScoreInfo[];
  tossWinner: string;
  tossChoice: string;
  matchWinner: string;
  series_id: string;
  fantasyEnabled: boolean;
  bbbEnabled: boolean;
  hasSquad: boolean;
  matchStarted: boolean;
  matchEnded: boolean;
}

export interface ScorecardResponse {
  id: string;
  name: string;
  matchType: string;
  status: string;
  venue: string;
  date: string;
  dateTimeGMT: string;
  teams: string[];
  teamInfo: TeamInfo[];
  score: ScoreInfo[];
  tossWinner: string;
  tossChoice: string;
  matchWinner: string;
  matchStarted: boolean;
  matchEnded: boolean;
  scorecard: InningsScorecard[];
}

export interface FallOfWicket {
  batsman: PlayerRef;
  wkt_nbr: number;
  score_at_dismissal: number;
  overs_at_dismissal: number;
}

export interface InningsScorecard {
  batting: BattingEntry[];
  bowling: BowlingEntry[];
  extras: ExtrasInfo;
  totals: TotalsInfo;
  inning: string;
  fow?: FallOfWicket[];
}

export interface BattingEntry {
  batsman: PlayerRef;
  dismissal: string;
  "dismissal-text": string;
  r: number;
  b: number;
  "4s": number;
  "6s": number;
  sr: number;
}

export interface BowlingEntry {
  bowler: PlayerRef;
  o: number;
  m: number;
  r: number;
  w: number;
  nb: number;
  wd: number;
  eco: number;
}

export interface PlayerRef {
  id: string;
  name: string;
}

export interface ExtrasInfo {
  r: number;
  b: number;
}

export interface TotalsInfo {
  r: number;
  w: number;
  o: number;
}

export interface SquadResponse {
  id: string;
  name: string;
  matchType: string;
  status: string;
  venue: string;
  date: string;
  dateTimeGMT: string;
  teams: string[];
  teamInfo: TeamInfo[];
  players: SquadTeam[];
}

export interface SquadTeam {
  teamName: string;
  shortname: string;
  players: SquadPlayer[];
}

export interface SquadPlayer {
  id: string;
  name: string;
  battingStyle?: string;
  bowlingStyle?: string;
  country?: string;
  playerImg?: string;
}

// Client interface — both real and mock clients implement this
export interface CricketApiClient {
  getSeriesMatches(seriesId: string): Promise<SeriesMatch[]>;
  getMatchInfo(matchId: string): Promise<MatchInfo>;
  getMatchScorecard(matchId: string): Promise<ScorecardResponse>;
  getMatchSquad(matchId: string): Promise<SquadResponse>;
}
