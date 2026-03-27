// Auto-generated types from Supabase schema.
// Run `npx supabase gen types typescript --local > src/types/database.ts`
// to regenerate after schema changes.
//
// Placeholder until Supabase local is set up. These match the schema in
// docs/tech_plan.md Section 2.

export type MatchStatus = "upcoming" | "live" | "completed" | "abandoned" | "no_result";
export type MemberStatus = "pending" | "approved" | "rejected" | "removed";
export type MemberRole = "owner" | "admin" | "member";
export type ScenarioType = "system" | "custom";
export type ScenarioApproval = "auto_approved" | "pending" | "approved" | "rejected";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          email: string;
          avatar_url: string | null;
          date_of_birth: string | null;
          accepted_terms_at: string | null;
          onboarding_completed: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          email: string;
          avatar_url?: string | null;
          date_of_birth?: string | null;
          accepted_terms_at?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          email?: string;
          avatar_url?: string | null;
          date_of_birth?: string | null;
          accepted_terms_at?: string | null;
          onboarding_completed?: boolean;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code?: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          name?: string;
        };
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          status: MemberStatus;
          role: MemberRole;
          joined_at: string;
          approved_at: string | null;
        };
        Insert: {
          group_id: string;
          user_id: string;
          status?: MemberStatus;
          role?: MemberRole;
          joined_at?: string;
          approved_at?: string | null;
        };
        Update: {
          status?: MemberStatus;
          role?: MemberRole;
          approved_at?: string | null;
        };
      };
      matches: {
        Row: {
          id: number;
          match_number: number;
          team_a: string;
          team_b: string;
          date: string;
          time_ist: string;
          venue: string;
          status: MatchStatus;
          toss_winner: string | null;
          match_winner: string | null;
          top_scorer: string | null;
          top_scorer_runs: number | null;
          top_wicket_taker: string | null;
          top_wicket_taker_wickets: number | null;
          player_of_match: string | null;
          first_innings_score: number | null;
          first_innings_wickets: number | null;
          total_match_runs: number | null;
          total_match_wickets: number | null;
          total_match_sixes: number | null;
          powerplay_score: number | null;
          powerplay_wickets: number | null;
          had_super_over: boolean | null;
          most_sixes_player: string | null;
          first_wicket_over: number | null;
          batsman_scored_fifty: boolean | null;
          bowler_took_three: boolean | null;
          current_score_a: string | null;
          current_score_b: string | null;
          current_overs_a: number | null;
          current_overs_b: number | null;
          current_batting_team: string | null;
          live_scorecard_json: Record<string, unknown> | null;
          last_polled_at: string | null;
          api_match_id: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          match_number: number;
          team_a: string;
          team_b: string;
          date: string;
          time_ist: string;
          venue: string;
          status?: MatchStatus;
          api_match_id?: string | null;
        };
        Update: {
          status?: MatchStatus;
          toss_winner?: string | null;
          match_winner?: string | null;
          top_scorer?: string | null;
          top_scorer_runs?: number | null;
          top_wicket_taker?: string | null;
          top_wicket_taker_wickets?: number | null;
          player_of_match?: string | null;
          first_innings_score?: number | null;
          first_innings_wickets?: number | null;
          total_match_runs?: number | null;
          total_match_wickets?: number | null;
          total_match_sixes?: number | null;
          powerplay_score?: number | null;
          powerplay_wickets?: number | null;
          had_super_over?: boolean | null;
          most_sixes_player?: string | null;
          first_wicket_over?: number | null;
          batsman_scored_fifty?: boolean | null;
          bowler_took_three?: boolean | null;
          current_score_a?: string | null;
          current_score_b?: string | null;
          current_overs_a?: number | null;
          current_overs_b?: number | null;
          current_batting_team?: string | null;
          live_scorecard_json?: Record<string, unknown> | null;
          last_polled_at?: string | null;
          resolved_at?: string | null;
        };
      };
      match_group_settings: {
        Row: {
          group_id: string;
          match_id: number;
          prediction_deadline: string | null;
          is_locked: boolean;
        };
        Insert: {
          group_id: string;
          match_id: number;
          prediction_deadline?: string | null;
          is_locked?: boolean;
        };
        Update: {
          prediction_deadline?: string | null;
          is_locked?: boolean;
        };
      };
      teams: {
        Row: {
          code: string;
          name: string;
          short_name: string;
          color: string;
          text_on_color: string;
          created_at: string;
        };
        Insert: {
          code: string;
          name: string;
          short_name: string;
          color: string;
          text_on_color?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          short_name?: string;
          color?: string;
          text_on_color?: string;
        };
      };
      players: {
        Row: {
          id: string;
          api_player_id: string | null;
          name: string;
          team_code: string;
          role: string | null;
          batting_style: string | null;
          bowling_style: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          api_player_id?: string | null;
          name: string;
          team_code: string;
          role?: string | null;
          batting_style?: string | null;
          bowling_style?: string | null;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          team_code?: string;
          role?: string | null;
          is_active?: boolean;
        };
      };
      match_squads: {
        Row: {
          match_id: number;
          player_id: string;
          team_code: string;
          is_playing_xi: boolean;
          created_at: string;
        };
        Insert: {
          match_id: number;
          player_id: string;
          team_code: string;
          is_playing_xi?: boolean;
        };
        Update: {
          is_playing_xi?: boolean;
        };
      };
      scenarios: {
        Row: {
          id: string;
          group_id: string;
          match_id: number;
          created_by: string | null;
          type: ScenarioType;
          system_category: string | null;
          title: string;
          description: string | null;
          options: unknown[];
          correct_answer: string | null;
          points: number;
          is_resolved: boolean;
          approval_status: ScenarioApproval;
          is_removed: boolean;
          removed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          match_id: number;
          created_by?: string | null;
          type?: ScenarioType;
          system_category?: string | null;
          title: string;
          description?: string | null;
          options?: unknown[];
          correct_answer?: string | null;
          points?: number;
          approval_status?: ScenarioApproval;
        };
        Update: {
          correct_answer?: string | null;
          points?: number;
          is_resolved?: boolean;
          approval_status?: ScenarioApproval;
          is_removed?: boolean;
          removed_by?: string | null;
        };
      };
      predictions: {
        Row: {
          id: string;
          user_id: string;
          scenario_id: string;
          value: string;
          is_correct: boolean | null;
          points_earned: number;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          scenario_id: string;
          value: string;
          is_correct?: boolean | null;
          points_earned?: number;
          submitted_at?: string;
        };
        Update: {
          value?: string;
          is_correct?: boolean | null;
          points_earned?: number;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          message: string;
          group_id: string | null;
          match_id: number | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          message: string;
          group_id?: string | null;
          match_id?: number | null;
          is_read?: boolean;
        };
        Update: {
          is_read?: boolean;
        };
      };
      points_config: {
        Row: {
          system_category: string;
          label: string;
          description: string | null;
          default_options: unknown[];
          points: number;
          is_auto_scorable: boolean;
          resolution_phase: string | null;
        };
        Insert: {
          system_category: string;
          label: string;
          description?: string | null;
          default_options?: unknown[];
          points: number;
          is_auto_scorable?: boolean;
          resolution_phase?: string | null;
        };
        Update: {
          label?: string;
          description?: string | null;
          default_options?: unknown[];
          points?: number;
          is_auto_scorable?: boolean;
          resolution_phase?: string | null;
        };
      };
    };
    Views: {
      season_standings: {
        Row: {
          group_id: string;
          user_id: string;
          display_name: string;
          role: MemberRole;
          matches_predicted: number;
          total_points: number;
          points_per_match: number;
          accuracy_pct: number;
          rank: number;
        };
      };
      match_leaderboard: {
        Row: {
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
        };
      };
    };
    Functions: {
      seed_system_scenarios: {
        Args: { p_group_id: string; p_match_id: number };
        Returns: void;
      };
      resolve_match_predictions: {
        Args: { p_match_id: number };
        Returns: void;
      };
      void_abandoned_match: {
        Args: { p_match_id: number };
        Returns: void;
      };
    };
    Enums: {
      match_status: MatchStatus;
      member_status: MemberStatus;
      member_role: MemberRole;
      scenario_type: ScenarioType;
      scenario_approval: ScenarioApproval;
    };
  };
}
