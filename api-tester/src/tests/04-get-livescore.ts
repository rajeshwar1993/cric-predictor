import fs from "fs";
import { callApi, getLeagueKey, describeShape } from "../client.js";

export const meta = {
  name: "get_livescore",
  description: "Fetch currently live matches. Used by the cron to poll live scores every minute. Returns same structure as get_events but with real-time data.",
  params: { league_key: "IPL league key (or match_key for single match)" },
  paramsDescription: "league_key (optional) — filter by league. match_key (optional) — filter by specific match.",
};

export async function run() {
  const errors: string[] = [];
  const leagueKey = getLeagueKey();

  meta.params = { league_key: leagueKey };

  const { result, raw } = await callApi<any[]>("get_livescore", {
    league_key: leagueKey,
  });

  fs.writeFileSync("responses/04-get-livescore.json", JSON.stringify(raw, null, 2));

  if (!Array.isArray(result)) {
    errors.push("Expected result to be an array");
    return { passed: false, errors, shape: {}, sample: null };
  }

  console.log(`  ✓ Live matches: ${result.length}`);

  if (result.length === 0) {
    console.log("  ⚠ No live IPL matches right now — this is expected outside match hours");
    return {
      passed: true,
      errors: [],
      shape: {},
      sample: null,
      resultCount: 0,
      note: "Empty result is valid when no matches are live",
    };
  }

  const event = result[0];

  // Validate same structure as get_events
  const requiredFields = [
    "event_key", "event_home_team", "event_away_team",
    "event_status", "event_live", "event_service_home", "event_service_away",
  ];
  for (const field of requiredFields) {
    if (!(field in event)) errors.push(`Missing field: ${field}`);
  }

  console.log(`  ✓ Live match: ${event.event_home_team} vs ${event.event_away_team}`);
  console.log(`  ✓ Score: ${event.event_service_home} — ${event.event_service_away}`);
  console.log(`  ✓ event_live: "${event.event_live}" (expected: "1" for live)`);

  // Check nested objects
  for (const obj of ["scorecard", "comments", "wickets", "extra"]) {
    if (obj in event) {
      console.log(`  ✓ ${obj}: ${Object.keys(event[obj] || {}).length} keys`);
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    shape: describeShape(event),
    sample: {
      event_key: event.event_key,
      event_home_team: event.event_home_team,
      event_away_team: event.event_away_team,
      event_live: event.event_live,
      event_service_home: event.event_service_home,
      event_service_away: event.event_service_away,
    },
    resultCount: result.length,
  };
}
