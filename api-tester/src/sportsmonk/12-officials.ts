import fs from "fs";
import { callApi, describeShape } from "./client.js";

export const meta = {
  name: "Officials",
  endpoint: "officials",
  description: "Fetch match officials (umpires, referees).",
};

export async function run() {
  const errors: string[] = [];
  const results: Record<string, unknown> = {};

  // GET /officials
  console.log("\n  [1/1] GET /officials");
  try {
    const officials = await callApi<any[]>("officials");
    fs.writeFileSync("responses/sportsmonk/12-officials.json", JSON.stringify(officials.raw, null, 2));

    if (Array.isArray(officials.data)) {
      console.log(`  ✓ Total officials: ${officials.data.length}`);
      for (const o of officials.data.slice(0, 5)) {
        console.log(`    - id=${o.id} fullname="${o.fullname}" country_id=${o.country_id}`);
      }
      results["officials"] = { count: officials.data.length, sample: officials.data[0] };
    }
  } catch (e) {
    console.log(`  ⚠ Officials failed: ${e}`);
    errors.push(`Officials: ${e}`);
  }

  return {
    passed: errors.length === 0,
    errors,
    shape: describeShape(results["officials"]),
    sample: null,
    results,
  };
}
