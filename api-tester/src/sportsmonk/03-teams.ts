import fs from "fs";
import { callApi, describeShape } from "./client.js";

export const meta = {
  name: "Teams",
  endpoint: "teams, teams/{id}, teams/{id}/squad/{season_id}",
  description: "Fetch all teams, a specific IPL team, and its squad for the current season.",
};

export async function run() {
  const errors: string[] = [];
  const results: Record<string, unknown> = {};
  const seasonId = (globalThis as any).__sportsmonk_season_id || "1795";

  // 1. GET /teams — all teams
  console.log("\n  [1/3] GET /teams");
  const allTeams = await callApi<any[]>("teams");
  fs.writeFileSync("responses/sportsmonk/03a-teams-all.json", JSON.stringify(allTeams.raw, null, 2));

  if (Array.isArray(allTeams.data)) {
    console.log(`  ✓ Total teams: ${allTeams.data.length}`);

    // Show IPL teams (country_id 153732 = India, non-national)
    const iplTeams = allTeams.data.filter((t: any) => t.country_id === 153732 && !t.national_team);
    console.log(`  ✓ Indian franchise teams: ${iplTeams.length}`);
    for (const t of iplTeams.slice(0, 12)) {
      console.log(`    - id=${t.id} name="${t.name}" code="${t.code}"`);
    }
    results["allTeams"] = { count: allTeams.data.length, iplTeams: iplTeams.length };
  } else {
    errors.push("Expected data to be an array");
  }

  // 2. GET /teams/2 — CSK (a known IPL team)
  const teamId = 2; // CSK
  console.log(`\n  [2/3] GET /teams/${teamId}`);
  const team = await callApi<any>(`teams/${teamId}`);
  fs.writeFileSync("responses/sportsmonk/03b-team-single.json", JSON.stringify(team.raw, null, 2));
  results["singleTeam"] = team.data;
  console.log(`  ✓ Team: id=${team.data?.id} name="${team.data?.name}" code="${team.data?.code}" national=${team.data?.national_team}`);

  // 3. GET /teams/{id}/squad/{season_id} — CSK squad for current IPL season
  console.log(`\n  [3/3] GET /teams/${teamId}/squad/${seasonId}`);
  try {
    const squad = await callApi<any>(`teams/${teamId}/squad/${seasonId}`);
    fs.writeFileSync("responses/sportsmonk/03c-team-squad.json", JSON.stringify(squad.raw, null, 2));

    const players = squad.data?.squad || [];
    if (Array.isArray(players)) {
      console.log(`  ✓ Squad size: ${players.length}`);
      for (const p of players.slice(0, 5)) {
        console.log(`    - id=${p.id} fullname="${p.fullname}" position="${p.position?.name || "N/A"}" batting="${p.battingstyle}" bowling="${p.bowlingstyle}"`);
        // Store a player ID for later
        if (!(globalThis as any).__sportsmonk_player_id) {
          (globalThis as any).__sportsmonk_player_id = p.id;
        }
      }
      results["squad"] = { count: players.length, sample: players[0] };
    }
  } catch (e) {
    console.log(`  ⚠ Squad endpoint failed: ${e}`);
    errors.push(`Squad: ${e}`);
  }

  return {
    passed: errors.length === 0,
    errors,
    shape: describeShape(allTeams.data),
    sample: allTeams.data?.[0],
    results,
  };
}
