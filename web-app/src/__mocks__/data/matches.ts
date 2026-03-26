import type { Match, MatchWithResults } from "@/types";

export const MOCK_MATCH_UPCOMING: Match = {
  id: 2,
  match_number: 2,
  team_a: "CSK",
  team_b: "MI",
  date: "2026-03-29",
  time_ist: "19:30",
  venue: "MA Chidambaram Stadium, Chennai",
  status: "upcoming",
};

export const MOCK_MATCH_LIVE: Match & { current_score_a: string; current_score_b: string; current_overs_a: number; current_overs_b: number; current_batting_team: string } = {
  id: 1,
  match_number: 1,
  team_a: "RCB",
  team_b: "SRH",
  date: "2026-03-28",
  time_ist: "19:30",
  venue: "M. Chinnaswamy Stadium, Bengaluru",
  status: "live",
  current_score_a: "186/5",
  current_score_b: "142/6",
  current_overs_a: 20,
  current_overs_b: 16.3,
  current_batting_team: "SRH",
};

export const MOCK_MATCH_COMPLETED: MatchWithResults = {
  id: 1,
  match_number: 1,
  team_a: "RCB",
  team_b: "SRH",
  date: "2026-03-28",
  time_ist: "19:30",
  venue: "M. Chinnaswamy Stadium, Bengaluru",
  status: "completed",
  toss_winner: "RCB",
  match_winner: "RCB",
  top_scorer: "Virat Kohli",
  top_scorer_runs: 72,
  top_wicket_taker: "Mohammed Siraj",
  top_wicket_taker_wickets: 3,
  player_of_match: "Virat Kohli",
  first_innings_score: 186,
  total_match_runs: 357,
  total_match_sixes: 18,
  powerplay_score: 52,
  powerplay_wickets: 1,
};
