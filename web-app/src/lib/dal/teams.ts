import { createClient } from "@/lib/supabase/server";
import type { Team } from "@/types";

export async function getAllTeams(): Promise<Team[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("code, name, short_name, color, text_on_color")
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data as Team[];
}

export async function getTeamByCode(code: string): Promise<Team | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("code, name, short_name, color, text_on_color")
    .eq("code", code)
    .single();

  if (error) return null;
  return data as Team;
}
