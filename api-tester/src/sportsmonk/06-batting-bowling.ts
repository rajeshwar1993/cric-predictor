import fs from "fs";
import { callApi, describeShape } from "./client.js";

export const meta = {
  name: "Batting & Bowling (via Fixture include)",
  endpoint: "fixtures/{id}?include=batting,bowling",
  description: "Batting/bowling NOT available as standalone endpoints (404). Access via fixture include. Shows individual player scorecards.",
};

export async function run() {
  const errors: string[] = [];
  const results: Record<string, unknown> = {};
  const fixtureId = (globalThis as any).__sportsmonk_completed_fixture_id;

  if (!fixtureId) {
    return { passed: true, errors: ["No completed fixture ID available — skipped"], shape: {}, sample: null, results };
  }

  // GET /fixtures/{id}?include=batting,bowling
  console.log(`\n  [1/1] GET /fixtures/${fixtureId}?include=batting,bowling`);
  const fixture = await callApi<any>(`fixtures/${fixtureId}`, { include: "batting,bowling" });
  const batting = fixture.data?.batting || [];
  const bowling = fixture.data?.bowling || [];

  fs.writeFileSync("responses/sportsmonk/06a-batting.json", JSON.stringify({ data: batting }, null, 2));
  fs.writeFileSync("responses/sportsmonk/06b-bowling.json", JSON.stringify({ data: bowling }, null, 2));

  // Batting
  if (Array.isArray(batting)) {
    console.log(`\n  ✓ Batting entries: ${batting.length}`);
    const innings = [...new Set(batting.map((b: any) => b.scoreboard))];
    console.log(`  ✓ Innings: ${innings.join(", ")}`);
    for (const b of batting.slice(0, 5)) {
      console.log(`    - player_id=${b.player_id} score=${b.score} ball=${b.ball} 4s=${b.four_x} 6s=${b.six_x} SR=${b.rate} scoreboard=${b.scoreboard} fow_score=${b.fow_score} fow_balls=${b.fow_balls}`);
    }
    results["batting"] = { count: batting.length, innings, sample: batting[0] };
  } else {
    errors.push("Batting: expected array");
  }

  // Bowling
  if (Array.isArray(bowling)) {
    console.log(`\n  ✓ Bowling entries: ${bowling.length}`);
    for (const b of bowling.slice(0, 5)) {
      console.log(`    - player_id=${b.player_id} overs=${b.overs} medians=${b.medians} runs=${b.runs} wickets=${b.wickets} rate=${b.rate} wide=${b.wide} noball=${b.noball} scoreboard=${b.scoreboard}`);
    }
    results["bowling"] = { count: bowling.length, sample: bowling[0] };
  } else {
    errors.push("Bowling: expected array");
  }

  return {
    passed: errors.length === 0,
    errors,
    shape: describeShape(batting),
    sample: batting[0],
    results,
  };
}
