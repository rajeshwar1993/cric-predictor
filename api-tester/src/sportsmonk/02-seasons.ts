import fs from "fs";
import { callApi, describeShape } from "./client.js";

export const meta = {
  name: "Seasons",
  endpoint: "seasons",
  description: "Fetch all seasons, then fetch the current IPL season by ID with includes.",
};

export async function run() {
  const errors: string[] = [];
  const results: Record<string, unknown> = {};
  const seasonId = (globalThis as any).__sportsmonk_season_id || "1795";

  // 1. GET /seasons — all seasons
  console.log("\n  [1/2] GET /seasons");
  const allSeasons = await callApi<any[]>("seasons");
  fs.writeFileSync("responses/sportsmonk/02a-seasons-all.json", JSON.stringify(allSeasons.raw, null, 2));

  if (Array.isArray(allSeasons.data)) {
    console.log(`  ✓ Total seasons: ${allSeasons.data.length}`);
    const iplSeasons = allSeasons.data.filter((s: any) => s.league_id === 1);
    console.log(`  ✓ IPL seasons: ${iplSeasons.length}`);
    for (const s of iplSeasons) {
      console.log(`    - id=${s.id} name="${s.name}" code="${s.code}"`);
    }
    results["allSeasons"] = { count: allSeasons.data.length, iplSeasons: iplSeasons.length };
  } else {
    errors.push("Expected data to be an array");
  }

  // 2. GET /seasons/{id}?include=league,stages — current IPL season
  console.log(`\n  [2/2] GET /seasons/${seasonId}?include=league,stages`);
  const season = await callApi<any>(`seasons/${seasonId}`, { include: "league,stages" });
  fs.writeFileSync("responses/sportsmonk/02b-season-current.json", JSON.stringify(season.raw, null, 2));
  results["currentSeason"] = season.data;

  if (season.data) {
    console.log(`  ✓ Season: id=${season.data.id}, name="${season.data.name}", code="${season.data.code}"`);
    if (season.data.stages?.length) {
      console.log(`  ✓ Stages: ${season.data.stages.length}`);
      for (const st of season.data.stages) {
        console.log(`    - id=${st.id} name="${st.name}" code="${st.code}" type="${st.type}"`);
        // Store first stage ID for later tests
        if (!(globalThis as any).__sportsmonk_stage_id) {
          (globalThis as any).__sportsmonk_stage_id = st.id;
        }
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    shape: describeShape(allSeasons.data),
    sample: allSeasons.data?.[0],
    results,
  };
}
