/**
 * Auto-generated Supabase database types.
 *
 * PLACEHOLDER — This file will be overwritten by `npm run db:types`
 * once a local Supabase instance is running.
 *
 * Command: cd ../supabase/supabase && npx supabase gen types typescript --local > ../../web-app/src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      v2_profiles: {
        Row: {
          id: string
          display_name: string | null
          email: string
          date_of_birth: string | null
          terms_version: string | null
          terms_accepted_at: string | null
          onboarding_completed: boolean
          is_deleted: boolean
          deleted_at: string | null
          is_system_admin: boolean
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          email: string
          date_of_birth?: string | null
          terms_version?: string | null
          terms_accepted_at?: string | null
          onboarding_completed?: boolean
          is_deleted?: boolean
          deleted_at?: string | null
          is_system_admin?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          email?: string
          date_of_birth?: string | null
          terms_version?: string | null
          terms_accepted_at?: string | null
          onboarding_completed?: boolean
          is_deleted?: boolean
          deleted_at?: string | null
          is_system_admin?: boolean
          created_at?: string
        }
        Relationships: []
      }
      v2_gangs: {
        Row: {
          id: string
          name: string
          invite_code: string
          created_by: string
          auto_accept: boolean
          is_deleted: boolean
          deleted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          invite_code?: string
          created_by: string
          auto_accept?: boolean
          is_deleted?: boolean
          deleted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          invite_code?: string
          created_by?: string
          auto_accept?: boolean
          is_deleted?: boolean
          deleted_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      v2_gang_members: {
        Row: {
          gang_id: string
          user_id: string
          role: Database['public']['Enums']['v2_member_role']
          status: Database['public']['Enums']['v2_member_status']
          is_blocked: boolean
          requested_at: string
          approved_at: string | null
          departed_at: string | null
        }
        Insert: {
          gang_id: string
          user_id: string
          role?: Database['public']['Enums']['v2_member_role']
          status?: Database['public']['Enums']['v2_member_status']
          is_blocked?: boolean
          requested_at?: string
          approved_at?: string | null
          departed_at?: string | null
        }
        Update: {
          gang_id?: string
          user_id?: string
          role?: Database['public']['Enums']['v2_member_role']
          status?: Database['public']['Enums']['v2_member_status']
          is_blocked?: boolean
          requested_at?: string
          approved_at?: string | null
          departed_at?: string | null
        }
        Relationships: []
      }
      v2_gang_league_seasons: {
        Row: {
          gang_id: string
          league_id: string
          season_id: string
          prediction_deadline_mins: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          gang_id: string
          league_id: string
          season_id: string
          prediction_deadline_mins?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          gang_id?: string
          league_id?: string
          season_id?: string
          prediction_deadline_mins?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      v2_league_season_fixtures: {
        Row: {
          id: string
          api_id: string
          league_id: string
          season_id: string
          match_number: number
          home_team_id: string
          away_team_id: string
          start_datetime: string
          venue_id: string | null
          venue_name: string
          status: Database['public']['Enums']['v2_match_status']
          status_changed_at: string
          pre_match_synced: boolean
          round: string
          created_at: string
        }
        Insert: {
          id?: string
          api_id: string
          league_id: string
          season_id: string
          match_number: number
          home_team_id: string
          away_team_id: string
          start_datetime: string
          venue_id?: string | null
          venue_name: string
          status?: Database['public']['Enums']['v2_match_status']
          status_changed_at?: string
          pre_match_synced?: boolean
          round: string
          created_at?: string
        }
        Update: {
          id?: string
          api_id?: string
          league_id?: string
          season_id?: string
          match_number?: number
          home_team_id?: string
          away_team_id?: string
          start_datetime?: string
          venue_id?: string | null
          venue_name?: string
          status?: Database['public']['Enums']['v2_match_status']
          status_changed_at?: string
          pre_match_synced?: boolean
          round?: string
          created_at?: string
        }
        Relationships: []
      }
      v2_fixture_scenarios: {
        Row: {
          id: string
          template_id: string | null
          league_id: string
          season_id: string
          fixture_id: string
          gang_id: string
          type: string
          slug: string
          title: string
          description: string | null
          input_type: Database['public']['Enums']['v2_scenario_input_type']
          options: Json | null
          points: number
          resolution_phase: Database['public']['Enums']['v2_resolution_phase']
          correct_answer: string | null
          is_resolved: boolean
          is_voided: boolean
          points_weight: number
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_id?: string | null
          league_id: string
          season_id: string
          fixture_id: string
          gang_id: string
          type?: string
          slug: string
          title: string
          description?: string | null
          input_type: Database['public']['Enums']['v2_scenario_input_type']
          options?: Json | null
          points: number
          resolution_phase?: Database['public']['Enums']['v2_resolution_phase']
          correct_answer?: string | null
          is_resolved?: boolean
          is_voided?: boolean
          points_weight?: number
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_id?: string | null
          league_id?: string
          season_id?: string
          fixture_id?: string
          gang_id?: string
          type?: string
          slug?: string
          title?: string
          description?: string | null
          input_type?: Database['public']['Enums']['v2_scenario_input_type']
          options?: Json | null
          points?: number
          resolution_phase?: Database['public']['Enums']['v2_resolution_phase']
          correct_answer?: string | null
          is_resolved?: boolean
          is_voided?: boolean
          points_weight?: number
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      v2_predictions: {
        Row: {
          id: string
          user_id: string
          gang_id: string
          league_id: string
          season_id: string
          fixture_id: string
          scenario_id: string
          value: string
          points_earned: number
          is_correct: boolean | null
          submitted_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          gang_id: string
          league_id: string
          season_id: string
          fixture_id: string
          scenario_id: string
          value: string
          points_earned?: number
          is_correct?: boolean | null
          submitted_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          gang_id?: string
          league_id?: string
          season_id?: string
          fixture_id?: string
          scenario_id?: string
          value?: string
          points_earned?: number
          is_correct?: boolean | null
          submitted_at?: string
          created_at?: string
        }
        Relationships: []
      }
      v2_notifications: {
        Row: {
          id: string
          user_id: string
          type: Database['public']['Enums']['v2_notification_type']
          message: string
          gang_id: string | null
          fixture_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: Database['public']['Enums']['v2_notification_type']
          message: string
          gang_id?: string | null
          fixture_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: Database['public']['Enums']['v2_notification_type']
          message?: string
          gang_id?: string | null
          fixture_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      v2_league_teams: {
        Row: {
          id: string
          api_id: string
          league_id: string
          name: string
          code: string
          color: string
          logo_url: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          api_id: string
          league_id: string
          name: string
          code: string
          color: string
          logo_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          api_id?: string
          league_id?: string
          name?: string
          code?: string
          color?: string
          logo_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      v2_players: {
        Row: {
          id: string
          api_id: string
          name: string
          role: string | null
          batting_style: string | null
          bowling_style: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          api_id: string
          name: string
          role?: string | null
          batting_style?: string | null
          bowling_style?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          api_id?: string
          name?: string
          role?: string | null
          batting_style?: string | null
          bowling_style?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      v2_fixture_live_scores: {
        Row: {
          fixture_id: string
          home_team_score: string | null
          away_team_score: string | null
          home_team_overs: number | null
          away_team_overs: number | null
          batting_team_id: string | null
          current_run_rate: number | null
          last_6_balls: string | null
          striker_name: string | null
          striker_score: string | null
          non_striker_name: string | null
          non_striker_score: string | null
          current_bowler: string | null
          current_partnership: string | null
          raw_scorecard_json: Json | null
          last_polled_at: string | null
          home_team_max_overs_seen: number | null
          away_team_max_overs_seen: number | null
          updated_at: string
        }
        Insert: {
          fixture_id: string
          home_team_score?: string | null
          away_team_score?: string | null
          home_team_overs?: number | null
          away_team_overs?: number | null
          batting_team_id?: string | null
          current_run_rate?: number | null
          last_6_balls?: string | null
          striker_name?: string | null
          striker_score?: string | null
          non_striker_name?: string | null
          non_striker_score?: string | null
          current_bowler?: string | null
          current_partnership?: string | null
          raw_scorecard_json?: Json | null
          last_polled_at?: string | null
          home_team_max_overs_seen?: number | null
          away_team_max_overs_seen?: number | null
          updated_at?: string
        }
        Update: {
          fixture_id?: string
          home_team_score?: string | null
          away_team_score?: string | null
          home_team_overs?: number | null
          away_team_overs?: number | null
          batting_team_id?: string | null
          current_run_rate?: number | null
          last_6_balls?: string | null
          striker_name?: string | null
          striker_score?: string | null
          non_striker_name?: string | null
          non_striker_score?: string | null
          current_bowler?: string | null
          current_partnership?: string | null
          raw_scorecard_json?: Json | null
          last_polled_at?: string | null
          home_team_max_overs_seen?: number | null
          away_team_max_overs_seen?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      v2_fixture_results: {
        Row: {
          fixture_id: string
          toss_winner_id: string | null
          match_winner_id: string | null
          top_scorer_id: string | null
          top_wicket_taker_id: string | null
          most_sixes_player_id: string | null
          player_of_match_id: string | null
          home_team_innings_score: number | null
          away_team_innings_score: number | null
          home_team_powerplay_runs: number | null
          away_team_powerplay_runs: number | null
          home_team_powerplay_wickets_lost: number | null
          away_team_powerplay_wickets_lost: number | null
          total_match_runs: number | null
          total_match_sixes: number | null
          total_match_wickets: number | null
          total_match_catches: number | null
          first_wicket_over: number | null
          fifty_scored: boolean | null
          bowler_three_wickets: boolean | null
          super_over: boolean | null
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          fixture_id: string
          toss_winner_id?: string | null
          match_winner_id?: string | null
          top_scorer_id?: string | null
          top_wicket_taker_id?: string | null
          most_sixes_player_id?: string | null
          player_of_match_id?: string | null
          home_team_innings_score?: number | null
          away_team_innings_score?: number | null
          home_team_powerplay_runs?: number | null
          away_team_powerplay_runs?: number | null
          home_team_powerplay_wickets_lost?: number | null
          away_team_powerplay_wickets_lost?: number | null
          total_match_runs?: number | null
          total_match_sixes?: number | null
          total_match_wickets?: number | null
          total_match_catches?: number | null
          first_wicket_over?: number | null
          fifty_scored?: boolean | null
          bowler_three_wickets?: boolean | null
          super_over?: boolean | null
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          fixture_id?: string
          toss_winner_id?: string | null
          match_winner_id?: string | null
          top_scorer_id?: string | null
          top_wicket_taker_id?: string | null
          most_sixes_player_id?: string | null
          player_of_match_id?: string | null
          home_team_innings_score?: number | null
          away_team_innings_score?: number | null
          home_team_powerplay_runs?: number | null
          away_team_powerplay_runs?: number | null
          home_team_powerplay_wickets_lost?: number | null
          away_team_powerplay_wickets_lost?: number | null
          total_match_runs?: number | null
          total_match_sixes?: number | null
          total_match_wickets?: number | null
          total_match_catches?: number | null
          first_wicket_over?: number | null
          fifty_scored?: boolean | null
          bowler_three_wickets?: boolean | null
          super_over?: boolean | null
          resolved_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      v2_gang_fixture_standings: {
        Row: {
          gang_id: string
          season_id: string
          fixture_id: string
          user_id: string
          predicted_count: number
          resolved_count: number
          correct_count: number
          points_earned: number
          last_submitted_at: string | null
          rank: number | null
          updated_at: string
        }
        Insert: {
          gang_id: string
          season_id?: string
          fixture_id: string
          user_id: string
          predicted_count?: number
          resolved_count?: number
          correct_count?: number
          points_earned?: number
          last_submitted_at?: string | null
          rank?: number | null
          updated_at?: string
        }
        Update: {
          gang_id?: string
          season_id?: string
          fixture_id?: string
          user_id?: string
          predicted_count?: number
          resolved_count?: number
          correct_count?: number
          points_earned?: number
          last_submitted_at?: string | null
          rank?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      v2_gang_season_standings: {
        Row: {
          gang_id: string
          season_id: string
          user_id: string
          matches_predicted: number
          total_points: number
          total_correct: number
          total_resolved: number
          accuracy_pct: number
          points_per_match: number
          rank: number | null
          updated_at: string
        }
        Insert: {
          gang_id: string
          season_id: string
          user_id: string
          matches_predicted?: number
          total_points?: number
          total_correct?: number
          total_resolved?: number
          accuracy_pct?: number
          points_per_match?: number
          rank?: number | null
          updated_at?: string
        }
        Update: {
          gang_id?: string
          season_id?: string
          user_id?: string
          matches_predicted?: number
          total_points?: number
          total_correct?: number
          total_resolved?: number
          accuracy_pct?: number
          points_per_match?: number
          rank?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      v2_rate_limits: {
        Row: {
          id: string
          user_id: string
          action: string
          window_start: string
          count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          window_start: string
          count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          window_start?: string
          count?: number
          created_at?: string
        }
        Relationships: []
      }
      v2_league_season_team_players: {
        Row: {
          league_id: string
          season_id: string
          team_id: string
          player_id: string
          created_at: string
        }
        Insert: {
          league_id: string
          season_id: string
          team_id: string
          player_id: string
          created_at?: string
        }
        Update: {
          league_id?: string
          season_id?: string
          team_id?: string
          player_id?: string
          created_at?: string
        }
        Relationships: []
      }
      v2_sports: {
        Row: {
          id: string
          api_id: string
          name: string
          code: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          api_id: string
          name: string
          code: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          api_id?: string
          name?: string
          code?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      v2_leagues: {
        Row: {
          id: string
          api_id: string
          sport_id: string
          name: string
          code: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          api_id: string
          sport_id: string
          name: string
          code: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          api_id?: string
          sport_id?: string
          name?: string
          code?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      v2_seasons: {
        Row: {
          id: string
          api_id: string
          league_id: string
          name: string
          year: number
          start_date: string | null
          end_date: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          api_id: string
          league_id: string
          name: string
          year: number
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          api_id?: string
          league_id?: string
          name?: string
          year?: number
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      v2_scenario_templates: {
        Row: {
          id: string
          sport_id: string
          slug: string
          title: string
          input_type: Database['public']['Enums']['v2_scenario_input_type']
          options: Json | null
          points: number
          resolution_phase: Database['public']['Enums']['v2_resolution_phase']
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sport_id: string
          slug: string
          title: string
          input_type: Database['public']['Enums']['v2_scenario_input_type']
          options?: Json | null
          points: number
          resolution_phase: Database['public']['Enums']['v2_resolution_phase']
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          sport_id?: string
          slug?: string
          title?: string
          input_type?: Database['public']['Enums']['v2_scenario_input_type']
          options?: Json | null
          points?: number
          resolution_phase?: Database['public']['Enums']['v2_resolution_phase']
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_gang: {
        Args: {
          p_gang_name: string
          p_creator_id: string
        }
        Returns: string
      }
      delete_account: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
      get_gang_by_invite_code: {
        Args: {
          p_invite_code: string
        }
        Returns: {
          id: string
          name: string
          auto_accept: boolean
          is_deleted: boolean
          created_by: string
        }[]
      }
      get_members_who_predicted: {
        Args: {
          p_gang_id: string
          p_fixture_id: string
        }
        Returns: string[]
      }
      create_join_request_notification: {
        Args: {
          p_admin_user_id: string
          p_gang_id: string
        }
        Returns: undefined
      }
      create_new_member_notification: {
        Args: {
          p_admin_user_id: string
          p_gang_id: string
        }
        Returns: undefined
      }
      create_join_approved_notification: {
        Args: {
          p_user_id: string
          p_gang_id: string
        }
        Returns: undefined
      }
      create_join_rejected_notification: {
        Args: {
          p_user_id: string
          p_gang_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      v2_match_status: 'upcoming' | 'live' | 'completed' | 'resolved' | 'abandoned' | 'no_result'
      v2_member_role: 'admin' | 'member'
      v2_member_status: 'pending' | 'approved' | 'rejected' | 'removed' | 'left'
      v2_scenario_input_type:
        | 'team_select'
        | 'player_select'
        | 'number_range'
        | 'over_range'
        | 'yes_no'
      v2_resolution_phase: 'toss' | 'first_wicket' | 'team_powerplay_end' | 'mid_match' | 'team_innings_end' | 'end' | 'post_match'
      v2_notification_type:
        | 'join_request'
        | 'join_approved'
        | 'join_rejected'
        | 'new_member'
        | 'deadline_reminder'
        | 'results_available'
        | 'gang_deleted'
        | 'admin_promoted'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
