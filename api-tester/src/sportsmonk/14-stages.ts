import fs from "fs";
import { callApi, describeShape } from "./client.js";

export const meta = {
  name: "Stages",
  endpoint: "stages/{id}",
  description: "Fetch stage details (group stage, playoffs, etc.) for IPL season.",
};

export async function run() {
  const errors: string[] = [];
  const results: Record<string, unknown> = {};
  const stageId = (globalThis as any).__sportsmonk_stage_id;

  if (!stageId) {
    console.log("  ⚠ No stage ID from previous tests — skipping");
    return { passed: true, errors: [], shape: {}, sample: null, results };
  }

  // GET /stages/{id}
  console.log(`\n  [1/1] GET /stages/${stageId}`);
  try {
    const stage = await callApi<any>(`stages/${stageId}`);
    fs.writeFileSync("responses/sportsmonk/14-stage.json", JSON.stringify(stage.raw, null, 2));

    if (stage.data) {
      console.log(`  ✓ Stage: id=${stage.data.id} name="${stage.data.name}" code="${stage.data.code}" type="${stage.data.type}"`);
      console.log(`    league_id=${stage.data.league_id} season_id=${stage.data.season_id}`);
      results["stage"] = stage.data;
    }
  } catch (e) {
    console.log(`  ⚠ Stage failed: ${e}`);
    errors.push(`Stage: ${e}`);
  }

  return {
    passed: errors.length === 0,
    errors,
    shape: describeShape(results["stage"] || {}),
    sample: results["stage"],
    results,
  };
}
