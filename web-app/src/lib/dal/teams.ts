import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import type { Team } from "@/types";

export async function getAllTeams(): Promise<Team[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("code, name, short_name, color, text_on_color")
    .order("name", { ascending: true });

  if (error || !data) {
    if (error) logError({ layer: "dal", operation: "getAllTeams", metadata: {} }, error);
    return [];
  }
  return data as Team[];
}

export async function getTeamByCode(code: string): Promise<Team | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("code, name, short_name, color, text_on_color")
    .eq("code", code)
    .single();

  if (error) {
    logError({ layer: "dal", operation: "getTeamByCode", metadata: { code } }, error);
    return null;
  }
  return data as Team;
}
