import fs from "fs";
import { callApi, describeShape } from "./client.js";

export const meta = {
  name: "Players",
  endpoint: "players/{id}",
  description: "Fetch a specific player by ID with career stats included.",
};

export async function run() {
  const errors: string[] = [];
  const results: Record<string, unknown> = {};
  const playerId = (globalThis as any).__sportsmonk_player_id;

  if (!playerId) {
    // Use a known player ID (Virat Kohli = 2 in sportmonks, or try to find one)
    console.log("  ⚠ No player ID from previous test, trying known IDs...");
  }

  const targetId = playerId || 2; // Fallback

  // 1. GET /players/{id}
  console.log(`\n  [1/2] GET /players/${targetId}`);
  try {
    const player = await callApi<any>(`players/${targetId}`);
    fs.writeFileSync("responses/sportsmonk/09a-player.json", JSON.stringify(player.raw, null, 2));

    if (player.data) {
      console.log(`  ✓ Player: id=${player.data.id} fullname="${player.data.fullname}" country_id=${player.data.country_id}`);
      console.log(`    position="${player.data.position?.name || "N/A"}" battingstyle="${player.data.battingstyle}" bowlingstyle="${player.data.bowlingstyle}"`);
      console.log(`    dateofbirth="${player.data.dateofbirth}" image="${player.data.image_path}"`);
      results["player"] = player.data;
    }
  } catch (e) {
    console.log(`  ⚠ Player fetch failed: ${e}`);
    errors.push(`Player fetch: ${e}`);
  }

  // 2. GET /players/{id}?include=career — with career stats
  console.log(`\n  [2/2] GET /players/${targetId}?include=career`);
  try {
    const playerCareer = await callApi<any>(`players/${targetId}`, { include: "career" });
    fs.writeFileSync("responses/sportsmonk/09b-player-career.json", JSON.stringify(playerCareer.raw, null, 2));

    if (playerCareer.data?.career?.length) {
      console.log(`  ✓ Career entries: ${playerCareer.data.career.length}`);
      for (const c of playerCareer.data.career.slice(0, 5)) {
        console.log(`    - type="${c.type}" season_id=${c.season_id} batting=${JSON.stringify(c.batting || {}).slice(0, 80)} bowling=${JSON.stringify(c.bowling || {}).slice(0, 80)}`);
      }
      results["career"] = { count: playerCareer.data.career.length, sample: playerCareer.data.career[0] };
    }
  } catch (e) {
    console.log(`  ⚠ Player career failed: ${e}`);
  }

  return {
    passed: errors.length === 0,
    errors,
    shape: describeShape(results["player"] || {}),
    sample: results["player"],
    results,
  };
}
