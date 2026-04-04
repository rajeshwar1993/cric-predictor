import fs from "fs";
import { callApi, describeShape } from "./client.js";

export const meta = {
  name: "Scoreboards (via Fixture include)",
  endpoint: "fixtures/{id}?include=scoreboards",
  description: "Scoreboards are NOT available as standalone endpoints (404). Access via fixture include. Shows innings totals, extras, overs, wickets.",
};

export async function run() {
  const errors: string[] = [];
  const results: Record<string, unknown> = {};
  const fixtureId = (globalThis as any).__sportsmonk_completed_fixture_id;

  if (!fixtureId) {
    return { passed: true, errors: ["No completed fixture ID available — skipped"], shape: {}, sample: null, results };
  }

  // GET /fixtures/{id}?include=scoreboards
  console.log(`\n  [1/1] GET /fixtures/${fixtureId}?include=scoreboards`);
  const fixture = await callApi<any>(`fixtures/${fixtureId}`, { include: "scoreboards" });
  const scoreboards = fixture.data?.scoreboards || [];
  fs.writeFileSync("responses/sportsmonk/05-scoreboards.json", JSON.stringify({ data: scoreboards }, null, 2));

  if (Array.isArray(scoreboards)) {
    console.log(`  ✓ Scoreboard entries: ${scoreboards.length}`);
    for (const sb of scoreboards) {
      console.log(`    - type="${sb.type}" scoreboard="${sb.scoreboard}" team_id=${sb.team_id} total=${sb.total} overs=${sb.overs} wickets=${sb.wickets} wide=${sb.wide} noball_runs=${sb.noball_runs} bye=${sb.bye} leg_bye=${sb.leg_bye}`);
    }
    results["scoreboards"] = { count: scoreboards.length, sample: scoreboards[0] };
  } else {
    errors.push("Expected scoreboards to be an array");
  }

  return {
    passed: errors.length === 0,
    errors,
    shape: describeShape(scoreboards),
    sample: scoreboards[0],
    results,
  };
}
