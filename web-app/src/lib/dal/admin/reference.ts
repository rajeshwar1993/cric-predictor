import 'server-only'

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { Database } from '@/types/database'

// ---------------------------------------------------------------------------
// Row types (re-exported for component props)
// ---------------------------------------------------------------------------

export type Sport = Database['public']['Tables']['v2_sports']['Row']

export type League = Database['public']['Tables']['v2_leagues']['Row'] & {
  sport_name: string
}

export type Season = Database['public']['Tables']['v2_seasons']['Row']

type PlayerRow = Database['public']['Tables']['v2_players']['Row']
type TeamRow = Database['public']['Tables']['v2_league_teams']['Row']

export type TeamWithPlayerCount = TeamRow & {
  playerCount: number
  players: Pick<
    PlayerRow,
    'id' | 'name' | 'role' | 'batting_style' | 'bowling_style' | 'is_active'
  >[]
}

export type PlayerWithTeam = PlayerRow & {
  team: { id: string; name: string; code: string } | null
  isUnassigned: boolean
}

export type ScenarioTemplate =
  Database['public']['Tables']['v2_scenario_templates']['Row']

// ---------------------------------------------------------------------------
// DAL functions
// ---------------------------------------------------------------------------

export async function getSports(): Promise<Sport[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('v2_sports')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

export async function getLeagues(): Promise<League[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('v2_leagues')
    .select('*, v2_sports(name)')
    .order('name')

  if (error) throw error

  return (data ?? []).map((league) => {
    const sportRelation = league.v2_sports as unknown as { name: string } | null
    return {
      id: league.id,
      api_id: league.api_id,
      sport_id: league.sport_id,
      name: league.name,
      code: league.code,
      is_active: league.is_active,
      created_at: league.created_at,
      sport_name: sportRelation?.name ?? 'Unknown',
    }
  })
}

export async function getSeasons(): Promise<Season[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('v2_seasons')
    .select('*')
    .order('year', { ascending: false })

  if (error) throw error
  return data
}

export async function getTeamsWithPlayerCount(
  leagueId?: string,
): Promise<TeamWithPlayerCount[]> {
  const supabase = createServiceRoleClient()

  // Get active season
  const seasonQuery = supabase
    .from('v2_seasons')
    .select('id')
    .eq('is_active', true)

  if (leagueId) {
    seasonQuery.eq('league_id', leagueId)
  }

  const { data: season } = await seasonQuery.maybeSingle()

  if (!season) return []

  // Get all teams (optionally filtered by league)
  const teamsQuery = supabase
    .from('v2_league_teams')
    .select('*')
    .order('name')

  if (leagueId) {
    teamsQuery.eq('league_id', leagueId)
  }

  const { data: teams, error: teamsError } = await teamsQuery

  if (teamsError) throw teamsError

  // Get player assignments for active season
  const { data: assignments } = await supabase
    .from('v2_league_season_team_players')
    .select(
      'team_id, v2_players(id, name, role, batting_style, bowling_style, is_active)',
    )
    .eq('season_id', season.id)

  return (teams ?? []).map((team) => {
    const teamAssignments = (assignments ?? []).filter(
      (a) => a.team_id === team.id,
    )

    const players = teamAssignments
      .map((a) => a.v2_players as unknown as Pick<
        PlayerRow,
        'id' | 'name' | 'role' | 'batting_style' | 'bowling_style' | 'is_active'
      > | null)
      .filter(
        (p): p is Pick<
          PlayerRow,
          'id' | 'name' | 'role' | 'batting_style' | 'bowling_style' | 'is_active'
        > => p !== null,
      )

    return {
      ...team,
      playerCount: players.length,
      players,
    }
  })
}

export async function getPlayers(
  seasonId?: string,
): Promise<PlayerWithTeam[]> {
  const supabase = createServiceRoleClient()

  // If no season ID provided, find the active season
  let activeSeasonId = seasonId
  if (!activeSeasonId) {
    const { data: season } = await supabase
      .from('v2_seasons')
      .select('id')
      .eq('is_active', true)
      .maybeSingle()

    activeSeasonId = season?.id
  }

  // Get all players
  const { data: players, error: playersError } = await supabase
    .from('v2_players')
    .select('*')
    .order('name')

  if (playersError) throw playersError

  // Get team assignments for the season (if we have a season)
  let assignments: {
    player_id: string
    team_id: string
    v2_league_teams: unknown
  }[] = []

  if (activeSeasonId) {
    const { data: assignmentData } = await supabase
      .from('v2_league_season_team_players')
      .select('player_id, team_id, v2_league_teams(id, name, code)')
      .eq('season_id', activeSeasonId)

    assignments = (assignmentData ?? []) as typeof assignments
  }

  return (players ?? []).map((player) => {
    const assignment = assignments.find((a) => a.player_id === player.id)
    const teamData = assignment?.v2_league_teams as {
      id: string
      name: string
      code: string
    } | null

    return {
      ...player,
      team: teamData ?? null,
      isUnassigned: !assignment,
    }
  })
}

export async function getScenarioTemplates(): Promise<ScenarioTemplate[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('v2_scenario_templates')
    .select('*')
    .order('resolution_phase')
    .order('slug')

  if (error) throw error
  return data
}
