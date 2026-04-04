import fs from "fs";
import { callApi, describeShape } from "./client.js";

export const meta = {
  name: "Standings",
  endpoint: "standings/season/{id}",
  description: "Fetch league standings/points table for the current IPL season.",
};

export async function run() {
  const errors: string[] = [];
  const results: Record<string, unknown> = {};
  const seasonId = (globalThis as any).__sportsmonk_season_id || "1795";

  // GET /standings/season/{id}
  console.log(`\n  [1/1] GET /standings/season/${seasonId}`);
  const standings = await callApi<any[]>(`standings/season/${seasonId}`);
  fs.writeFileSync("responses/sportsmonk/08-standings.json", JSON.stringify(standings.raw, null, 2));

  if (Array.isArray(standings.data)) {
    console.log(`  ✓ Standing entries: ${standings.data.length}`);
    for (const s of standings.data) {
      console.log(`    - position=${s.position} team_id=${s.team_id} played=${s.played} won=${s.won} lost=${s.lost} draw=${s.draw} points=${s.points} nrr=${s.nrr} recent_form=${JSON.stringify(s.recent_form)}`);
    }
    results["standings"] = { count: standings.data.length, sample: standings.data[0] };
  } else if (standings.data && typeof standings.data === "object") {
    // Sometimes standings come as nested object
    console.log(`  ✓ Standings data type: ${typeof standings.data}`);
    console.log(`  ✓ Keys: ${Object.keys(standings.data).join(", ")}`);
    results["standings"] = standings.data;
  } else {
    errors.push("Unexpected standings data format");
  }

  return {
    passed: errors.length === 0,
    errors,
    shape: describeShape(standings.data),
    sample: Array.isArray(standings.data) ? standings.data?.[0] : standings.data,
    results,
  };
}
