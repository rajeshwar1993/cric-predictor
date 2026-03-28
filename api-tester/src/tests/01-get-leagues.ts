import fs from "fs";
import { callApi, describeShape } from "../client.js";

export const meta = {
  name: "get_leagues",
  description: "Fetch all available cricket leagues/tournaments. Used to find the IPL league_key.",
  params: {} as Record<string, string>,
  paramsDescription: "None required.",
};

interface LeagueEntry {
  league_key: string;
  league_name: string;
  league_year: string;
}

export async function run() {
  const errors: string[] = [];

  const { result, raw } = await callApi<LeagueEntry[]>("get_leagues");

  // Save response
  fs.writeFileSync("responses/01-get-leagues.json", JSON.stringify(raw, null, 2));

  // Validate structure
  if (!Array.isArray(result)) {
    errors.push("Expected result to be an array");
    return { passed: false, errors, shape: {}, sample: null };
  }

  if (result.length === 0) {
    errors.push("Result array is empty — no leagues returned");
    return { passed: false, errors, shape: {}, sample: null };
  }

  const first = result[0];
  if (!first.league_key) errors.push("Missing league_key");
  if (!first.league_name) errors.push("Missing league_name");

  // Find IPL
  const ipl = result.find(
    (l) => l.league_name.toLowerCase().includes("ipl") || l.league_name.toLowerCase().includes("indian premier")
  );

  if (ipl) {
    console.log(`  ✓ Found IPL: league_key=${ipl.league_key}, name="${ipl.league_name}", year=${ipl.league_year}`);
  } else {
    errors.push("IPL league not found in results");
  }

  console.log(`  ✓ Total leagues: ${result.length}`);

  return {
    passed: errors.length === 0,
    errors,
    shape: describeShape(first),
    sample: first,
    resultCount: result.length,
  };
}
