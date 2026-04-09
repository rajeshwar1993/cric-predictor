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
          avatar_url: string | null
          terms_version: string | null
          terms_accepted_at: string | null
          onboarding_completed: boolean
          is_deleted: boolean
          deleted_at: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          email: string
          date_of_birth?: string | null
          avatar_url?: string | null
          terms_version?: string | null
          terms_accepted_at?: string | null
          onboarding_completed?: boolean
          is_deleted?: boolean
          deleted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          email?: string
          date_of_birth?: string | null
          avatar_url?: string | null
          terms_version?: string | null
          terms_accepted_at?: string | null
          onboarding_completed?: boolean
          is_deleted?: boolean
          deleted_at?: string | null
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
          league_id: string
          season_id: string
          match_number: number
          home_team_id: string
          away_team_id: string
          venue: string | null
          scheduled_at: string
          status: Database['public']['Enums']['v2_match_status']
          toss_winner_team_id: string | null
          toss_decision: string | null
          winner_team_id: string | null
          lock_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          league_id: string
          season_id: string
          match_number: number
          home_team_id: string
          away_team_id: string
          venue?: string | null
          scheduled_at: string
          status?: Database['public']['Enums']['v2_match_status']
          toss_winner_team_id?: string | null
          toss_decision?: string | null
          winner_team_id?: string | null
          lock_time: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          season_id?: string
          match_number?: number
          home_team_id?: string
          away_team_id?: string
          venue?: string | null
          scheduled_at?: string
          status?: Database['public']['Enums']['v2_match_status']
          toss_winner_team_id?: string | null
          toss_decision?: string | null
          winner_team_id?: string | null
          lock_time?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      v2_fixture_scenarios: {
        Row: {
          id: string
          fixture_id: string
          title: string
          description: string | null
          input_type: Database['public']['Enums']['v2_scenario_input_type']
          options: Json | null
          resolution_phase: Database['public']['Enums']['v2_resolution_phase']
          correct_answer: string | null
          points_weight: number
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          fixture_id: string
          title: string
          description?: string | null
          input_type: Database['public']['Enums']['v2_scenario_input_type']
          options?: Json | null
          resolution_phase?: Database['public']['Enums']['v2_resolution_phase']
          correct_answer?: string | null
          points_weight?: number
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          fixture_id?: string
          title?: string
          description?: string | null
          input_type?: Database['public']['Enums']['v2_scenario_input_type']
          options?: Json | null
          resolution_phase?: Database['public']['Enums']['v2_resolution_phase']
          correct_answer?: string | null
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
          fixture_id: string
          scenario_id: string
          answer: string
          points_earned: number | null
          is_correct: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          gang_id: string
          fixture_id: string
          scenario_id: string
          answer: string
          points_earned?: number | null
          is_correct?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          gang_id?: string
          fixture_id?: string
          scenario_id?: string
          answer?: string
          points_earned?: number | null
          is_correct?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      v2_notifications: {
        Row: {
          id: string
          user_id: string
          type: Database['public']['Enums']['v2_notification_type']
          title: string
          body: string
          data: Json | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: Database['public']['Enums']['v2_notification_type']
          title: string
          body: string
          data?: Json | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: Database['public']['Enums']['v2_notification_type']
          title?: string
          body?: string
          data?: Json | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      v2_league_teams: {
        Row: {
          id: string
          league_id: string
          name: string
          short_name: string
          logo_url: string | null
          primary_color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          league_id: string
          name: string
          short_name: string
          logo_url?: string | null
          primary_color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          name?: string
          short_name?: string
          logo_url?: string | null
          primary_color?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      v2_players: {
        Row: {
          id: string
          name: string
          team_id: string
          role: string | null
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          team_id: string
          role?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          team_id?: string
          role?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      v2_fixture_live_scores: {
        Row: {
          id: string
          fixture_id: string
          innings: number
          batting_team_id: string
          runs: number
          wickets: number
          overs: number
          run_rate: number | null
          extras: number | null
          data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          fixture_id: string
          innings: number
          batting_team_id: string
          runs?: number
          wickets?: number
          overs?: number
          run_rate?: number | null
          extras?: number | null
          data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          fixture_id?: string
          innings?: number
          batting_team_id?: string
          runs?: number
          wickets?: number
          overs?: number
          run_rate?: number | null
          extras?: number | null
          data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      v2_gang_fixture_standings: {
        Row: {
          id: string
          gang_id: string
          fixture_id: string
          user_id: string
          total_points: number
          rank: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          gang_id: string
          fixture_id: string
          user_id: string
          total_points?: number
          rank?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          gang_id?: string
          fixture_id?: string
          user_id?: string
          total_points?: number
          rank?: number | null
          created_at?: string
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
    }
    Enums: {
      v2_match_status: 'scheduled' | 'live' | 'completed' | 'abandoned' | 'cancelled'
      v2_member_role: 'admin' | 'member'
      v2_member_status: 'pending' | 'approved' | 'rejected' | 'removed' | 'left'
      v2_scenario_input_type:
        | 'team_select'
        | 'player_select'
        | 'number_range'
        | 'over_range'
        | 'yes_no'
      v2_resolution_phase: 'toss' | 'innings_1' | 'innings_2' | 'post_match'
      v2_notification_type:
        | 'gang_invite'
        | 'join_request'
        | 'join_approved'
        | 'join_rejected'
        | 'new_member'
        | 'member_removed'
        | 'match_reminder'
        | 'results_ready'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
