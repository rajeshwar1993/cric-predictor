import { createClient } from "@/lib/supabase/server";
import type { Player } from "@/types";

export async function getPlayersForTeam(teamCode: string): Promise<Player[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("id, name, team_code, role")
    .eq("team_code", teamCode)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data;
}

export async function getMatchSquad(
  matchId: number,
  teamCode: string
): Promise<Player[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_squads")
    .select(`
      player:players (
        id,
        name,
        team_code,
        role
      )
    `)
    .eq("match_id", matchId)
    .eq("team_code", teamCode)
    .order("is_playing_xi", { ascending: false });

  if (error || !data) return [];
  return data
    .filter((d) => d.player)
    .map((d) => d.player as unknown as Player);
}

export async function getPlayersForMatch(matchId: number): Promise<Player[]> {
  const supabase = await createClient();

  // First try match_squads, fall back to full team rosters
  const { data: squadData } = await supabase
    .from("match_squads")
    .select(`
      player:players (
        id,
        name,
        team_code,
        role
      )
    `)
    .eq("match_id", matchId);

  if (squadData && squadData.length > 0) {
    return squadData
      .filter((d) => d.player)
      .map((d) => d.player as unknown as Player);
  }

  // Fall back: get all active players for both teams in this match
  const { data: match } = await supabase
    .from("matches")
    .select("team_a, team_b")
    .eq("id", matchId)
    .single();

  if (!match) return [];

  const { data, error } = await supabase
    .from("players")
    .select("id, name, team_code, role")
    .in("team_code", [match.team_a, match.team_b])
    .eq("is_active", true)
    .order("team_code")
    .order("name");

  if (error || !data) return [];
  return data;
}

export async function upsertPlayersFromApi(
  players: Array<{
    apiPlayerId: string;
    name: string;
    teamCode: string;
    battingStyle?: string;
    bowlingStyle?: string;
  }>
): Promise<boolean> {
  const supabase = await createClient();
  const rows = players.map((p) => ({
    api_player_id: p.apiPlayerId,
    name: p.name,
    team_code: p.teamCode,
    batting_style: p.battingStyle || null,
    bowling_style: p.bowlingStyle || null,
    is_active: true,
  }));

  const { error } = await supabase
    .from("players")
    .upsert(rows, { onConflict: "api_player_id" });

  return !error;
}
