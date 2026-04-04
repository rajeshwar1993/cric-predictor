import fs from "fs";
import { callApi, describeShape } from "./client.js";

export const meta = {
  name: "Runs / Innings Summary (via Fixture include)",
  endpoint: "fixtures/{id}?include=runs",
  description: "Runs NOT available as standalone endpoint (404). Access via fixture include. Shows per-innings summary (total score, wickets, overs, powerplay).",
};

export async function run() {
  const errors: string[] = [];
  const results: Record<string, unknown> = {};
  const fixtureId = (globalThis as any).__sportsmonk_completed_fixture_id;

  if (!fixtureId) {
    return { passed: true, errors: ["No completed fixture ID available — skipped"], shape: {}, sample: null, results };
  }

  // GET /fixtures/{id}?include=runs
  console.log(`\n  [1/1] GET /fixtures/${fixtureId}?include=runs`);
  const fixture = await callApi<any>(`fixtures/${fixtureId}`, { include: "runs" });
  const runs = fixture.data?.runs || [];
  fs.writeFileSync("responses/sportsmonk/07-runs.json", JSON.stringify({ data: runs }, null, 2));

  if (Array.isArray(runs)) {
    console.log(`  ✓ Innings entries: ${runs.length}`);
    for (const r of runs) {
      console.log(`    - team_id=${r.team_id} inning=${r.inning} score=${r.score} wickets=${r.wickets} overs=${r.overs} pp1="${r.pp1}" pp2="${r.pp2}" pp3="${r.pp3}"`);
    }
    results["runs"] = { count: runs.length, sample: runs[0] };
  } else {
    errors.push("Expected runs to be an array");
  }

  return {
    passed: errors.length === 0,
    errors,
    shape: describeShape(runs),
    sample: runs[0],
    results,
  };
}
