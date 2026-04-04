import fs from "fs";
import { callApi, getLeagueId, describeShape } from "./client.js";

export const meta = {
  name: "Leagues",
  endpoint: "leagues",
  description: "Fetch all leagues, then fetch IPL league by ID with seasons included.",
};

export async function run() {
  const errors: string[] = [];
  const results: Record<string, unknown> = {};

  // 1. GET /leagues — all leagues
  console.log("\n  [1/2] GET /leagues");
  const allLeagues = await callApi<any[]>("leagues");
  fs.writeFileSync("responses/sportsmonk/01a-leagues-all.json", JSON.stringify(allLeagues.raw, null, 2));
  results["allLeagues"] = { count: allLeagues.data?.length, sample: allLeagues.data?.[0] };

  if (!Array.isArray(allLeagues.data)) {
    errors.push("Expected data to be an array");
  } else {
    console.log(`  ✓ Total leagues: ${allLeagues.data.length}`);
    const ipl = allLeagues.data.find((l: any) => l.id === Number(getLeagueId()));
    if (ipl) {
      console.log(`  ✓ IPL found: id=${ipl.id}, name="${ipl.name}", season_id=${ipl.season_id}`);
      // Store current season ID globally
      (globalThis as any).__sportsmonk_season_id = ipl.season_id;
    } else {
      errors.push("IPL not found in leagues");
    }
  }

  // 2. GET /leagues/{id}?include=seasons — IPL with seasons
  console.log("\n  [2/2] GET /leagues/{id}?include=seasons");
  const iplLeague = await callApi<any>(`leagues/${getLeagueId()}`, { include: "seasons" });
  fs.writeFileSync("responses/sportsmonk/01b-league-ipl-with-seasons.json", JSON.stringify(iplLeague.raw, null, 2));
  results["iplLeague"] = iplLeague.data;

  if (iplLeague.data?.seasons?.length) {
    console.log(`  ✓ IPL seasons available: ${iplLeague.data.seasons.length}`);
    const latest = iplLeague.data.seasons[iplLeague.data.seasons.length - 1];
    console.log(`  ✓ Latest season: id=${latest.id}, name="${latest.name}", code="${latest.code}"`);
  }

  return {
    passed: errors.length === 0,
    errors,
    shape: describeShape(allLeagues.data),
    sample: allLeagues.data?.[0],
    results,
  };
}
