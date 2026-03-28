/**
 * API Poller — Calls all cricket API endpoints N times at 30-second intervals.
 *
 * Usage:
 *   npx tsx src/poll.ts <count>
 *   npx tsx src/poll.ts 10        # 10 rounds, ~5 minutes
 *   npx tsx src/poll.ts 20        # 20 rounds, ~10 minutes
 *
 * Each round calls:
 *   1. get_events (by league + date range) — match list with scorecards
 *   2. get_events (by event_key)           — detailed single match
 *   3. get_livescore                       — live matches only
 *
 * Responses are saved to responses/poll/<timestamp>/<api-name>.json
 * A summary manifest is written to responses/poll/<timestamp>/manifest.json
 *
 * get_leagues and get_teams are called once (round 1 only) since they rarely change.
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { callApi, getLeagueKey } from "./client.js";

// ─── Config ──────────────────────────────────────────────────────────────────

const INTERVAL_MS = 30_000; // 30 seconds between rounds
const count = parseInt(process.argv[2] || "10", 10);

if (isNaN(count) || count < 1) {
  console.error("Usage: npx tsx src/poll.ts <count>\n  e.g., npx tsx src/poll.ts 10");
  process.exit(1);
}

const leagueKey = getLeagueKey();
const sessionId = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const sessionDir = path.join("responses", "poll", sessionId);

// Today +/- 1 day for event range
const today = new Date();
const dateStart = new Date(today);
dateStart.setDate(dateStart.getDate() - 1);
const dateStop = new Date(today);
dateStop.setDate(dateStop.getDate() + 1);
const dateStartStr = dateStart.toISOString().split("T")[0];
const dateStopStr = dateStop.toISOString().split("T")[0];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function save(roundDir: string, filename: string, data: unknown) {
  fs.writeFileSync(path.join(roundDir, filename), JSON.stringify(data, null, 2));
}

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

interface RoundResult {
  round: number;
  timestamp: string;
  dir: string;
  apis: ApiCallResult[];
  durationMs: number;
}

interface ApiCallResult {
  name: string;
  success: boolean;
  itemCount: number | null;
  error: string | null;
  file: string;
}

// ─── API Call Wrappers ───────────────────────────────────────────────────────

async function pollEventsByLeague(roundDir: string): Promise<ApiCallResult> {
  const file = "get_events_by_league.json";
  try {
    const { raw, result } = await callApi<any[]>("get_events", {
      league_key: leagueKey,
      date_start: dateStartStr,
      date_stop: dateStopStr,
    });
    save(roundDir, file, raw);
    return { name: "get_events (league)", success: true, itemCount: Array.isArray(result) ? result.length : 0, error: null, file };
  } catch (err) {
    save(roundDir, file, { error: String(err) });
    return { name: "get_events (league)", success: false, itemCount: null, error: String(err), file };
  }
}

async function pollEventByKey(roundDir: string, eventKey: string): Promise<ApiCallResult> {
  const file = `get_event_${eventKey}.json`;
  try {
    const { raw, result } = await callApi<any[]>("get_events", { event_key: eventKey });
    save(roundDir, file, raw);
    const event = Array.isArray(result) && result.length > 0 ? result[0] : null;
    return {
      name: `get_events (key=${eventKey})`,
      success: true,
      itemCount: event ? Object.keys(event.scorecard || {}).length : 0,
      error: null,
      file,
    };
  } catch (err) {
    save(roundDir, file, { error: String(err) });
    return { name: `get_events (key=${eventKey})`, success: false, itemCount: null, error: String(err), file };
  }
}

async function pollLivescore(roundDir: string): Promise<ApiCallResult> {
  const file = "get_livescore.json";
  try {
    const { raw, result } = await callApi<any[]>("get_livescore", { league_key: leagueKey });
    save(roundDir, file, raw);
    return { name: "get_livescore", success: true, itemCount: Array.isArray(result) ? result.length : 0, error: null, file };
  } catch (err) {
    save(roundDir, file, { error: String(err) });
    return { name: "get_livescore", success: false, itemCount: null, error: String(err), file };
  }
}

async function pollTeams(roundDir: string): Promise<ApiCallResult> {
  const file = "get_teams.json";
  try {
    const { raw, result } = await callApi<any[]>("get_teams", { league_key: leagueKey });
    save(roundDir, file, raw);
    return { name: "get_teams", success: true, itemCount: Array.isArray(result) ? result.length : 0, error: null, file };
  } catch (err) {
    save(roundDir, file, { error: String(err) });
    return { name: "get_teams", success: false, itemCount: null, error: String(err), file };
  }
}

async function pollLeagues(roundDir: string): Promise<ApiCallResult> {
  const file = "get_leagues.json";
  try {
    const { raw, result } = await callApi<any[]>("get_leagues");
    save(roundDir, file, raw);
    return { name: "get_leagues", success: true, itemCount: Array.isArray(result) ? result.length : 0, error: null, file };
  } catch (err) {
    save(roundDir, file, { error: String(err) });
    return { name: "get_leagues", success: false, itemCount: null, error: String(err), file };
  }
}

// ─── Main Loop ───────────────────────────────────────────────────────────────

async function runRound(roundNum: number, eventKeys: string[]): Promise<RoundResult> {
  const roundDir = path.join(sessionDir, `round-${String(roundNum).padStart(3, "0")}`);
  ensureDir(roundDir);

  const start = Date.now();
  const apis: ApiCallResult[] = [];

  console.log(`\n  [${timestamp()}] Round ${roundNum}/${count}`);
  console.log(`  ${"─".repeat(50)}`);

  // Static APIs — only round 1
  if (roundNum === 1) {
    apis.push(await pollLeagues(roundDir));
    apis.push(await pollTeams(roundDir));
  }

  // Events by league (always — captures match list + inline scorecards)
  const leagueResult = await pollEventsByLeague(roundDir);
  apis.push(leagueResult);

  // Discover event keys from the league response for per-match polling
  if (leagueResult.success && eventKeys.length === 0) {
    try {
      const leagueFile = path.join(roundDir, "get_events_by_league.json");
      const leagueData = JSON.parse(fs.readFileSync(leagueFile, "utf-8"));
      if (Array.isArray(leagueData.result)) {
        for (const event of leagueData.result) {
          if (event.event_key && !eventKeys.includes(event.event_key)) {
            eventKeys.push(event.event_key);
          }
        }
      }
    } catch { /* ignore parse errors */ }
  }

  // Per-match detail (for each discovered event)
  for (const key of eventKeys) {
    apis.push(await pollEventByKey(roundDir, key));
  }

  // Livescore
  apis.push(await pollLivescore(roundDir));

  const durationMs = Date.now() - start;

  // Print summary
  for (const api of apis) {
    const icon = api.success ? "+" : "x";
    const count = api.itemCount !== null ? ` (${api.itemCount} items)` : "";
    const err = api.error ? ` — ${api.error.slice(0, 60)}` : "";
    console.log(`    [${icon}] ${api.name}${count}${err}`);
  }
  console.log(`  Done in ${durationMs}ms`);

  return { round: roundNum, timestamp: timestamp(), dir: roundDir, apis, durationMs };
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  Bragg API Poller                                ║");
  console.log(`║  ${count} rounds × 30s interval = ~${Math.ceil((count * INTERVAL_MS) / 60000)} minutes        ║`);
  console.log(`║  Session: ${sessionId}              ║`);
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`\n  League key: ${leagueKey}`);
  console.log(`  Date range: ${dateStartStr} → ${dateStopStr}`);
  console.log(`  Output: ${sessionDir}/`);

  ensureDir(sessionDir);

  const allResults: RoundResult[] = [];
  const eventKeys: string[] = []; // Discovered from first round

  for (let i = 1; i <= count; i++) {
    const result = await runRound(i, eventKeys);
    allResults.push(result);

    // Save manifest after each round (incremental)
    const manifest = {
      session: sessionId,
      config: {
        count,
        intervalMs: INTERVAL_MS,
        leagueKey,
        dateRange: { start: dateStartStr, stop: dateStopStr },
        discoveredEventKeys: eventKeys,
      },
      rounds: allResults,
      summary: {
        totalRounds: allResults.length,
        totalApiCalls: allResults.reduce((sum, r) => sum + r.apis.length, 0),
        successfulCalls: allResults.reduce((sum, r) => sum + r.apis.filter((a) => a.success).length, 0),
        failedCalls: allResults.reduce((sum, r) => sum + r.apis.filter((a) => !a.success).length, 0),
      },
    };
    save(sessionDir, "manifest.json", manifest);

    // Wait between rounds (skip after last round)
    if (i < count) {
      const nextIn = Math.max(0, INTERVAL_MS - result.durationMs);
      console.log(`\n  Waiting ${Math.ceil(nextIn / 1000)}s until next round...`);
      await new Promise((r) => setTimeout(r, nextIn));
    }
  }

  // ─── Final Summary ──────────────────────────────────────────────────────────
  const totalCalls = allResults.reduce((sum, r) => sum + r.apis.length, 0);
  const successCalls = allResults.reduce((sum, r) => sum + r.apis.filter((a) => a.success).length, 0);
  const failedCalls = totalCalls - successCalls;
  const totalFiles = allResults.reduce((sum, r) => sum + r.apis.length, 0);

  console.log("\n══════════════════════════════════════════════════");
  console.log("  POLLING COMPLETE");
  console.log("══════════════════════════════════════════════════\n");
  console.log(`  Rounds:     ${allResults.length}/${count}`);
  console.log(`  API calls:  ${totalCalls} (${successCalls} ok, ${failedCalls} failed)`);
  console.log(`  Files:      ${totalFiles} response files`);
  console.log(`  Events:     ${eventKeys.length} matches tracked (${eventKeys.join(", ")})`);
  console.log(`  Output:     ${sessionDir}/`);
  console.log(`  Manifest:   ${sessionDir}/manifest.json\n`);
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
