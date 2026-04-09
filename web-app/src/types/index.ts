import type { Database } from './database'

// Table row types
export type Profile = Database['public']['Tables']['v2_profiles']['Row']
export type Gang = Database['public']['Tables']['v2_gangs']['Row']
export type GangMember = Database['public']['Tables']['v2_gang_members']['Row']
export type Fixture = Database['public']['Tables']['v2_league_season_fixtures']['Row']
export type FixtureScenario = Database['public']['Tables']['v2_fixture_scenarios']['Row']
export type Prediction = Database['public']['Tables']['v2_predictions']['Row']
export type Notification = Database['public']['Tables']['v2_notifications']['Row']
export type LeagueTeam = Database['public']['Tables']['v2_league_teams']['Row']
export type Player = Database['public']['Tables']['v2_players']['Row']
export type FixtureLiveScore = Database['public']['Tables']['v2_fixture_live_scores']['Row']
export type GangFixtureStanding = Database['public']['Tables']['v2_gang_fixture_standings']['Row']
export type GangSeasonStanding = Database['public']['Tables']['v2_gang_season_standings']['Row']
export type GangLeagueSeason = Database['public']['Tables']['v2_gang_league_seasons']['Row']
export type RateLimit = Database['public']['Tables']['v2_rate_limits']['Row']

// Insert types
export type ProfileInsert = Database['public']['Tables']['v2_profiles']['Insert']
export type GangInsert = Database['public']['Tables']['v2_gangs']['Insert']
export type GangMemberInsert = Database['public']['Tables']['v2_gang_members']['Insert']
export type PredictionInsert = Database['public']['Tables']['v2_predictions']['Insert']

// Update types
export type ProfileUpdate = Database['public']['Tables']['v2_profiles']['Update']
export type GangUpdate = Database['public']['Tables']['v2_gangs']['Update']
export type GangMemberUpdate = Database['public']['Tables']['v2_gang_members']['Update']

// Enum types
export type MatchStatus = Database['public']['Enums']['v2_match_status']
export type MemberRole = Database['public']['Enums']['v2_member_role']
export type MemberStatus = Database['public']['Enums']['v2_member_status']
export type ScenarioInputType = Database['public']['Enums']['v2_scenario_input_type']
export type ResolutionPhase = Database['public']['Enums']['v2_resolution_phase']
export type NotificationType = Database['public']['Enums']['v2_notification_type']

// Server action return type
export type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }
