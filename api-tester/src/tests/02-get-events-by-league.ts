import fs from "fs";
import { callApi, getLeagueKey, describeShape } from "../client.js";

export const meta = {
  name: "get_events (by league + date range)",
  description: "Fetch match fixtures for a league within a date range. Used to seed IPL match schedule and fetch completed scorecards.",
  params: { league_key: "IPL league key", date_start: "yyyy-mm-dd", date_stop: "yyyy-mm-dd" },
  paramsDescription: "league_key (required), date_start (required), date_stop (required)",
};

export async function run() {
  const errors: string[] = [];
  const leagueKey = getLeagueKey();

  // Use a date range around current IPL season
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 7);
  const stop = new Date(today);
  stop.setDate(stop.getDate() + 7);

  const dateStart = start.toISOString().split("T")[0];
  const dateStop = stop.toISOString().split("T")[0];

  meta.params = { league_key: leagueKey, date_start: dateStart, date_stop: dateStop };

  const { result, raw } = await callApi<any[]>("get_events", {
    league_key: leagueKey,
    date_start: dateStart,
    date_stop: dateStop,
  });

  fs.writeFileSync("responses/02-get-events-by-league.json", JSON.stringify(raw, null, 2));

  if (!Array.isArray(result)) {
    errors.push("Expected result to be an array");
    return { passed: false, errors, shape: {}, sample: null };
  }

  console.log(`  ✓ Matches found: ${result.length}`);

  if (result.length === 0) {
    console.log("  ⚠ No matches in date range — try adjusting dates");
    return { passed: true, errors: [], shape: {}, sample: null, resultCount: 0 };
  }

  const event = result[0];

  // Validate top-level fields
  const requiredFields = [
    "event_key", "event_date_start", "event_time", "event_home_team",
    "event_away_team", "event_stadium", "event_status", "event_live",
  ];
  for (const field of requiredFields) {
    if (!(field in event)) errors.push(`Missing field: ${field}`);
  }

  // Validate nested objects exist (may be empty)
  const nestedObjects = ["scorecard", "comments", "wickets", "extra", "lineups"];
  for (const obj of nestedObjects) {
    if (!(obj in event)) errors.push(`Missing nested object: ${obj}`);
    else console.log(`  ✓ ${obj}: ${typeof event[obj]} (${Object.keys(event[obj] || {}).length} keys)`);
  }

  // Check optional match-result fields
  const optionalFields = ["event_toss", "event_man_of_match", "event_status_info"];
  for (const field of optionalFields) {
    if (field in event) {
      console.log(`  ✓ ${field}: "${String(event[field]).slice(0, 60)}"`);
    } else {
      console.log(`  ⚠ ${field}: not present`);
    }
  }

  // Log first match summary
  console.log(`  ✓ First match: ${event.event_home_team} vs ${event.event_away_team} (${event.event_status})`);

  // Export event_key for test 03
  (globalThis as any).__test_event_key = event.event_key;

  // Find a completed match for deeper testing in test 03
  const completed = result.find((e: any) => e.event_status === "Finished");
  if (completed) {
    (globalThis as any).__test_completed_event_key = completed.event_key;
    console.log(`  ✓ Completed match found: ${completed.event_key} (${completed.event_home_team} vs ${completed.event_away_team})`);
  }

  return {
    passed: errors.length === 0,
    errors,
    shape: describeShape(event),
    sample: {
      event_key: event.event_key,
      event_home_team: event.event_home_team,
      event_away_team: event.event_away_team,
      event_date_start: event.event_date_start,
      event_time: event.event_time,
      event_status: event.event_status,
      event_live: event.event_live,
      event_toss: event.event_toss || "(empty)",
      event_man_of_match: event.event_man_of_match || "(empty)",
    },
    resultCount: result.length,
  };
}
