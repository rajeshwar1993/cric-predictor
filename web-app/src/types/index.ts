// Re-export database types for convenience
export type {
  Database,
  MatchStatus,
  MemberStatus,
  MemberRole,
  ScenarioType,
  ScenarioApproval,
} from "./database";

// Application-level types

export interface ActionResponse<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface Profile {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  date_of_birth: string | null;
  accepted_terms_at: string | null;
  onboarding_completed: boolean;
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface GroupWithMeta extends Group {
  member_count: number;
  user_role: import("./database").MemberRole;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  status: import("./database").MemberStatus;
  role: import("./database").MemberRole;
  joined_at: string;
  approved_at: string | null;
  profile?: Profile;
}

export interface Match {
  id: number;
  match_number: number;
  team_a: string;
  team_b: string;
  date: string;
  time_ist: string;
  venue: string;
  status: import("./database").MatchStatus;
}

export interface MatchWithResults extends Match {
  toss_winner: string | null;
  match_winner: string | null;
  top_scorer: string | null;
  top_scorer_runs: number | null;
  top_wicket_taker: string | null;
  top_wicket_taker_wickets: number | null;
  player_of_match: string | null;
  first_innings_score: number | null;
  total_match_runs: number | null;
  total_match_sixes: number | null;
  powerplay_score: number | null;
  powerplay_wickets: number | null;
}

export interface Team {
  code: string;
  name: string;
  short_name: string;
  color: string;
  text_on_color: "dark" | "light";
}

export interface Player {
  id: string;
  name: string;
  team_code: string;
  role: string | null;
}

export interface Scenario {
  id: string;
  group_id: string;
  match_id: number;
  created_by: string | null;
  type: import("./database").ScenarioType;
  system_category: string | null;
  title: string;
  description: string | null;
  options: string[];
  correct_answer: string | null;
  points: number;
  is_resolved: boolean;
  approval_status: import("./database").ScenarioApproval;
}

export interface Prediction {
  id: string;
  user_id: string;
  scenario_id: string;
  value: string;
  is_correct: boolean | null;
  points_earned: number;
  submitted_at: string;
}

export interface SeasonStanding {
  group_id: string;
  user_id: string;
  display_name: string;
  role: import("./database").MemberRole;
  matches_predicted: number;
  total_points: number;
  points_per_match: number;
  accuracy_pct: number;
  rank: number;
}

export interface MatchLeaderboardEntry {
  group_id: string;
  match_id: number;
  user_id: string;
  display_name: string;
  predicted_count: number;
  correct_count: number;
  resolved_count: number;
  match_points: number;
  earliest_submission: string;
  rank: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  group_id: string | null;
  match_id: number | null;
  is_read: boolean;
  created_at: string;
}

/**
 * Data shape for a completed match card.
 * Derived from the full Match row but narrowed to only the fields
 * the CompletedMatchCard component needs.
 * Satisfied by the full matches Row type via structural typing.
 */
export interface CompletedMatchCardData {
  id: number;
  match_number: number;
  team_a: string;
  team_b: string;
  date: string;
  time_ist: string;
  venue: string;
  match_winner: string | null;
  current_score_a: string | null;
  current_score_b: string | null;
  resolved_at: string | null;
}

/**
 * User's prediction performance summary for a single match.
 * Derived from MatchLeaderboardEntry but narrowed to display fields.
 */
export interface UserPredictionSummary {
  predicted_count: number;
  resolved_count: number;
  correct_count: number;
  points_earned: number;
}
