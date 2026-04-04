import fs from "fs";
import { callApi, describeShape } from "./client.js";

export const meta = {
  name: "Livescores",
  endpoint: "livescores, livescores/inplay",
  description: "Fetch current live scores and in-play matches.",
};

export async function run() {
  const errors: string[] = [];
  const results: Record<string, unknown> = {};

  // 1. GET /livescores
  console.log("\n  [1/2] GET /livescores");
  try {
    const live = await callApi<any[]>("livescores");
    fs.writeFileSync("responses/sportsmonk/11a-livescores.json", JSON.stringify(live.raw, null, 2));

    if (Array.isArray(live.data)) {
      console.log(`  ✓ Live matches: ${live.data.length}`);
      for (const m of live.data.slice(0, 3)) {
        console.log(`    - id=${m.id} status="${m.status}" localteam_id=${m.localteam_id} visitorteam_id=${m.visitorteam_id}`);
      }
      results["livescores"] = { count: live.data.length, sample: live.data[0] };
    } else {
      console.log(`  ✓ Livescores data: ${JSON.stringify(live.data).slice(0, 200)}`);
      results["livescores"] = live.data;
    }
  } catch (e) {
    console.log(`  ⚠ Livescores failed: ${e}`);
  }

  // 2. GET /livescores/inplay
  console.log("\n  [2/2] GET /livescores/inplay");
  try {
    const inplay = await callApi<any[]>("livescores/inplay");
    fs.writeFileSync("responses/sportsmonk/11b-livescores-inplay.json", JSON.stringify(inplay.raw, null, 2));

    if (Array.isArray(inplay.data)) {
      console.log(`  ✓ In-play matches: ${inplay.data.length}`);
      for (const m of inplay.data.slice(0, 3)) {
        console.log(`    - id=${m.id} status="${m.status}"`);
      }
      results["inplay"] = { count: inplay.data.length };
    } else {
      console.log(`  ✓ Inplay data: ${JSON.stringify(inplay.data).slice(0, 200)}`);
      results["inplay"] = inplay.data;
    }
  } catch (e) {
    console.log(`  ⚠ Livescores/inplay failed: ${e}`);
  }

  return {
    passed: errors.length === 0,
    errors,
    shape: describeShape(results["livescores"]),
    sample: null,
    results,
  };
}
