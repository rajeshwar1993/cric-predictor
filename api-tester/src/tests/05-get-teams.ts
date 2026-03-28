import fs from "fs";
import { callApi, getLeagueKey, describeShape } from "../client.js";

export const meta = {
  name: "get_teams",
  description: "Fetch team metadata (name, key, logo) for a league. Used to build team_key → team_code mapping and display team logos.",
  params: { league_key: "IPL league key" },
  paramsDescription: "league_key (required)",
};

interface TeamEntry {
  team_key: string;
  team_name: string;
  team_logo: string;
}

const EXPECTED_IPL_TEAMS = [
  "Chennai Super Kings", "Mumbai Indians", "Royal Challengers",
  "Kolkata Knight Riders", "Delhi Capitals", "Sunrisers Hyderabad",
  "Rajasthan Royals", "Punjab Kings", "Gujarat Titans", "Lucknow Super Giants",
];

export async function run() {
  const errors: string[] = [];
  const leagueKey = getLeagueKey();

  meta.params = { league_key: leagueKey };

  const { result, raw } = await callApi<TeamEntry[]>("get_teams", {
    league_key: leagueKey,
  });

  fs.writeFileSync("responses/05-get-teams.json", JSON.stringify(raw, null, 2));

  if (!Array.isArray(result)) {
    errors.push("Expected result to be an array");
    return { passed: false, errors, shape: {}, sample: null };
  }

  console.log(`  ✓ Teams found: ${result.length}`);

  if (result.length === 0) {
    errors.push("No teams returned");
    return { passed: false, errors, shape: {}, sample: null };
  }

  // Validate structure
  const first = result[0];
  if (!first.team_key) errors.push("Missing team_key");
  if (!first.team_name) errors.push("Missing team_name");

  // Check for known IPL teams
  const teamNames = result.map((t) => t.team_name);
  console.log("  ✓ Teams:");
  for (const team of result) {
    const hasLogo = team.team_logo && team.team_logo.length > 0 ? "✓ logo" : "✗ no logo";
    console.log(`    ${team.team_key} → ${team.team_name} (${hasLogo})`);
  }

  // Check if we can find the expected teams (partial match)
  for (const expected of EXPECTED_IPL_TEAMS) {
    const found = teamNames.some((n) => n.toLowerCase().includes(expected.toLowerCase().split(" ")[0]));
    if (!found) {
      console.log(`  ⚠ Expected team not found: ${expected}`);
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    shape: describeShape(first),
    sample: first,
    resultCount: result.length,
    teamMapping: Object.fromEntries(result.map((t) => [t.team_key, t.team_name])),
  };
}
