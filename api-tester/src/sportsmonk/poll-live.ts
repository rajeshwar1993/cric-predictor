/**
 * Sportmonks Live Match Poller
 *
 * Polls APIs that change during a live IPL match at 15-second intervals.
 *
 * Usage:
 *   npx tsx src/sportsmonk/poll-live.ts <count> [fixture_id]
 *   npx tsx src/sportsmonk/poll-live.ts 20              # 20 rounds (~15 min), auto-detect live fixtures
 *   npx tsx src/sportsmonk/poll-live.ts 40 69525        # 40 rounds (~30 min), track specific fixture
 *   npx tsx src/sportsmonk/poll-live.ts 80              # 80 rounds (~60 min), full match coverage
 *
 * What it polls each round:
 *   1. /livescores                                        — which matches are currently live
 *   2. /fixtures?filter[starts_between]=today             — today's IPL fixtures (status changes)
 *   3. /fixtures/{id}?include=batting,bowling,runs,       — full scorecard for each live/today fixture
 *      scoreboards,lineup,manofmatch,tosswon,venue
 *
 * Responses are saved to: responses/sportsmonk/live-<date>-<time>/round-NNN/
 * A manifest.json tracks all rounds and detected changes.
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { callApi, getLeagueId } from "./client.js";

// ─── Config ──────────────────────────────────────────────────────────────────

const INTERVAL_MS = 15_000; // 15 seconds between rounds
const count = parseInt(process.argv[2] || "10", 10);
const forcedFixtureId = process.argv[3] ? parseInt(process.argv[3], 10) : null;

if (isNaN(count) || count < 1) {
  console.error(
    "Usage: npx tsx src/sportsmonk/poll-live.ts <count> [fixture_id]",
  );
  console.error("  e.g., npx tsx src/sportsmonk/poll-live.ts 20");
  console.error("  e.g., npx tsx src/sportsmonk/poll-live.ts 40 69525");
  process.exit(1);
}

const leagueId = getLeagueId();
const now = new Date();
const sessionId = `live-${now.toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
const sessionDir = path.join("responses", "sportsmonk", sessionId);
const todayStr = now.toISOString().split("T")[0];

// Full includes for live fixture detail
// Nested includes (batting.batsman, etc.) resolve player names inline
const FIXTURE_INCLUDES = [
  "batting.batsman",
  "batting.bowler",
  "batting.catchstump",
  "bowling.bowler",
  "runs",
  "scoreboards",
  "lineup",
  "manofmatch",
  "tosswon",
  "venue",
  "localteam",
  "visitorteam",
  "winnerteam",
].join(",");

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApiCallResult {
  name: string;
  endpoint: string;
  success: boolean;
  itemCount: number | null;
  error: string | null;
  file: string;
}

interface RoundResult {
  round: number;
  timestamp: string;
  dir: string;
  apis: ApiCallResult[];
  durationMs: number;
  liveFixtureIds: number[];
  trackedFixtureIds: number[];
  fixtureStatuses: Record<number, string>;
}

interface FixtureSnapshot {
  id: number;
  status: string;
  localteam: string;
  visitorteam: string;
  score1: string;
  score2: string;
  battingCount: number;
  bowlingCount: number;
}

// ─── State ───────────────────────────────────────────────────────────────────

const trackedFixtureIds: number[] = forcedFixtureId ? [forcedFixtureId] : [];
let prevSnapshots: Map<number, FixtureSnapshot> = new Map();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function save(dir: string, filename: string, data: unknown) {
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2));
}

function ts(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function formatScore(runs: any[]): string {
  if (!Array.isArray(runs) || runs.length === 0) return "—";
  return runs
    .map((r: any) => `${r.score}/${r.wickets} (${r.overs})`)
    .join(", ");
}

function extractSnapshot(fixture: any): FixtureSnapshot {
  const runs = fixture.runs || [];
  const inn1 = runs.find((r: any) => r.inning === 1);
  const inn2 = runs.find((r: any) => r.inning === 2);
  return {
    id: fixture.id,
    status: fixture.status,
    localteam: fixture.localteam?.name || fixture.localteam_id,
    visitorteam: fixture.visitorteam?.name || fixture.visitorteam_id,
    score1: inn1 ? `${inn1.score}/${inn1.wickets} (${inn1.overs})` : "—",
    score2: inn2 ? `${inn2.score}/${inn2.wickets} (${inn2.overs})` : "—",
    battingCount: Array.isArray(fixture.batting) ? fixture.batting.length : 0,
    bowlingCount: Array.isArray(fixture.bowling) ? fixture.bowling.length : 0,
  };
}

function diffSnapshot(
  prev: FixtureSnapshot | undefined,
  curr: FixtureSnapshot,
): string[] {
  if (!prev) return ["NEW — first observation"];
  const changes: string[] = [];
  if (prev.status !== curr.status)
    changes.push(`status: ${prev.status} → ${curr.status}`);
  if (prev.score1 !== curr.score1)
    changes.push(`inn1: ${prev.score1} → ${curr.score1}`);
  if (prev.score2 !== curr.score2)
    changes.push(`inn2: ${prev.score2} → ${curr.score2}`);
  if (prev.battingCount !== curr.battingCount)
    changes.push(
      `batting entries: ${prev.battingCount} → ${curr.battingCount}`,
    );
  if (prev.bowlingCount !== curr.bowlingCount)
    changes.push(
      `bowling entries: ${prev.bowlingCount} → ${curr.bowlingCount}`,
    );
  return changes;
}

// ─── API Calls ───────────────────────────────────────────────────────────────

async function pollLivescores(
  roundDir: string,
): Promise<{ result: ApiCallResult; liveIds: number[] }> {
  const file = "livescores.json";
  try {
    const { raw, data } = await callApi<any[]>("livescores", {
      include:
        "batting,bowling,runs,scoreboards,localteam,visitorteam,tosswon,manofmatch",
    });
    save(roundDir, file, raw);

    const liveIds: number[] = [];
    if (Array.isArray(data)) {
      for (const m of data) {
        // Log every live match with score summary
        const runs = m.runs || [];
        const inn1 = runs.find((r: any) => r.inning === 1);
        const inn2 = runs.find((r: any) => r.inning === 2);
        const local = m.localteam?.code || m.localteam_id;
        const visitor = m.visitorteam?.code || m.visitorteam_id;
        const score1 = inn1
          ? `${inn1.score}/${inn1.wickets} (${inn1.overs})`
          : "—";
        const score2 = inn2
          ? `${inn2.score}/${inn2.wickets} (${inn2.overs})`
          : "—";
        const isIpl = m.league_id === Number(leagueId);
        const tag = isIpl ? "🏏 IPL" : "  " + (m.league_id || "?");
        console.log(
          `    ${tag} [${m.id}] ${local} ${score1} vs ${visitor} ${score2} — ${m.status} | ${m.note || ""}`,
        );

        if (isIpl) {
          liveIds.push(m.id);
        }
      }
    }

    return {
      result: {
        name: "livescores",
        endpoint: "livescores?include=batting,bowling,...",
        success: true,
        itemCount: Array.isArray(data) ? data.length : 0,
        error: null,
        file,
      },
      liveIds,
    };
  } catch (err) {
    save(roundDir, file, { error: String(err) });
    return {
      result: {
        name: "livescores",
        endpoint: "livescores",
        success: false,
        itemCount: null,
        error: String(err),
        file,
      },
      liveIds: [],
    };
  }
}

async function pollTodayFixtures(
  roundDir: string,
): Promise<{ result: ApiCallResult; fixtureIds: number[] }> {
  const file = "today-fixtures.json";
  try {
    const { raw, data } = await callApi<any[]>("fixtures", {
      "filter[league_id]": leagueId,
      "filter[starts_between]": `${todayStr},${todayStr}`,
      include: "localteam,visitorteam,runs",
    });
    save(roundDir, file, raw);

    const ids: number[] = [];
    if (Array.isArray(data)) {
      for (const f of data) {
        ids.push(f.id);
        const inn1 = f.runs?.find((r: any) => r.inning === 1);
        const inn2 = f.runs?.find((r: any) => r.inning === 2);
        console.log(
          `    ${f.localteam?.code || f.localteam_id} vs ${f.visitorteam?.code || f.visitorteam_id} — status=${f.status} | ${inn1 ? `${inn1.score}/${inn1.wickets}` : "—"} | ${inn2 ? `${inn2.score}/${inn2.wickets}` : "—"}`,
        );
      }
    }

    return {
      result: {
        name: "today-fixtures",
        endpoint: "fixtures?filter[starts_between]",
        success: true,
        itemCount: ids.length,
        error: null,
        file,
      },
      fixtureIds: ids,
    };
  } catch (err) {
    save(roundDir, file, { error: String(err) });
    return {
      result: {
        name: "today-fixtures",
        endpoint: "fixtures?filter[starts_between]",
        success: false,
        itemCount: null,
        error: String(err),
        file,
      },
      fixtureIds: [],
    };
  }
}

async function pollFixtureDetail(
  roundDir: string,
  fixtureId: number,
): Promise<{ result: ApiCallResult; snapshot: FixtureSnapshot | null }> {
  const file = `fixture-${fixtureId}.json`;
  try {
    const { raw, data } = await callApi<any>(`fixtures/${fixtureId}`, {
      include: FIXTURE_INCLUDES,
    });
    save(roundDir, file, raw);

    const snapshot = extractSnapshot(data);
    return {
      result: {
        name: `fixture-${fixtureId}`,
        endpoint: `fixtures/${fixtureId}?include=...`,
        success: true,
        itemCount: null,
        error: null,
        file,
      },
      snapshot,
    };
  } catch (err) {
    save(roundDir, file, { error: String(err) });
    return {
      result: {
        name: `fixture-${fixtureId}`,
        endpoint: `fixtures/${fixtureId}`,
        success: false,
        itemCount: null,
        error: String(err),
        file,
      },
      snapshot: null,
    };
  }
}

// ─── Round ───────────────────────────────────────────────────────────────────

async function runRound(roundNum: number): Promise<RoundResult> {
  const roundDir = path.join(
    sessionDir,
    `round-${String(roundNum).padStart(3, "0")}`,
  );
  ensureDir(roundDir);

  const start = Date.now();
  const apis: ApiCallResult[] = [];
  const fixtureStatuses: Record<number, string> = {};

  console.log(`\n  [${ts()}] Round ${roundNum}/${count}`);
  console.log(`  ${"─".repeat(55)}`);

  // 1. Livescores — detect live matches
  console.log("  📡 Checking livescores...");
  const { result: liveResult, liveIds } = await pollLivescores(roundDir);
  apis.push(liveResult);
  if (liveIds.length > 0) {
    console.log(`    🔴 Live IPL matches: ${liveIds.join(", ")}`);
  } else {
    console.log("    No live IPL matches right now");
  }

  // 2. Today's fixtures — get today's match list with status
  console.log("  📅 Today's IPL fixtures...");
  const { result: todayResult, fixtureIds: todayIds } =
    await pollTodayFixtures(roundDir);
  apis.push(todayResult);

  // Update tracked fixture list: merge live + today + forced
  const allRelevant = new Set([...trackedFixtureIds, ...liveIds, ...todayIds]);
  for (const id of allRelevant) {
    if (!trackedFixtureIds.includes(id)) {
      trackedFixtureIds.push(id);
      console.log(`    ➕ Now tracking fixture ${id}`);
    }
  }

  // 3. Detailed poll for each tracked fixture
  if (trackedFixtureIds.length > 0) {
    console.log(
      `  🏏 Polling ${trackedFixtureIds.length} fixture(s) with full scorecard...`,
    );
    for (const fixtureId of trackedFixtureIds) {
      const { result: fResult, snapshot } = await pollFixtureDetail(
        roundDir,
        fixtureId,
      );
      apis.push(fResult);

      if (snapshot) {
        fixtureStatuses[fixtureId] = snapshot.status;

        // Diff against previous round
        const prev = prevSnapshots.get(fixtureId);
        const changes = diffSnapshot(prev, snapshot);

        const label = `${snapshot.localteam} vs ${snapshot.visitorteam}`;
        if (changes.length > 0) {
          console.log(`    🔄 [${fixtureId}] ${label} — CHANGED:`);
          for (const c of changes) {
            console.log(`       • ${c}`);
          }
        } else {
          console.log(
            `    ⏸  [${fixtureId}] ${label} — ${snapshot.status} | ${snapshot.score1} | ${snapshot.score2} (no change)`,
          );
        }

        prevSnapshots.set(fixtureId, snapshot);
      }

      // Small delay between fixture calls
      await new Promise((r) => setTimeout(r, 200));
    }
  } else {
    console.log(
      "  ⚠  No fixtures to track. Run during a match day or pass a fixture_id.",
    );
  }

  const durationMs = Date.now() - start;
  console.log(`  ⏱  Round done in ${durationMs}ms`);

  return {
    round: roundNum,
    timestamp: ts(),
    dir: roundDir,
    apis,
    durationMs,
    liveFixtureIds: liveIds,
    trackedFixtureIds: [...trackedFixtureIds],
    fixtureStatuses,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const totalMinutes = Math.ceil((count * INTERVAL_MS) / 60000);

  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║  Sportmonks Live Match Poller                          ║");
  console.log(
    `║  ${count} rounds × 15s = ~${String(totalMinutes).padStart(3)} minutes                         ║`,
  );
  console.log(`║  Session: ${sessionId}       ║`);
  console.log("╚════════════════════════════════════════════════════════╝");
  console.log(`\n  League: IPL (id=${leagueId})`);
  console.log(`  Date: ${todayStr}`);
  if (forcedFixtureId) console.log(`  Forced fixture: ${forcedFixtureId}`);
  console.log(`  Output: ${sessionDir}/`);
  console.log(`\n  APIs polled each round:`);
  console.log(
    `    1. GET /livescores?include=batting,bowling,runs,scoreboards,localteam,visitorteam,...`,
  );
  console.log(
    `    2. GET /fixtures?filter[starts_between]=${todayStr}&include=localteam,visitorteam,runs`,
  );
  console.log(
    `    3. GET /fixtures/{id}?include=${FIXTURE_INCLUDES}  (per tracked fixture)`,
  );

  ensureDir(sessionDir);

  const allResults: RoundResult[] = [];
  const changeLog: {
    round: number;
    timestamp: string;
    fixtureId: number;
    changes: string[];
  }[] = [];

  for (let i = 1; i <= count; i++) {
    const result = await runRound(i);
    allResults.push(result);

    // Track changes for the changelog
    for (const [idStr, _status] of Object.entries(result.fixtureStatuses)) {
      const id = Number(idStr);
      const curr = prevSnapshots.get(id);
      // Changes already logged in runRound, but save for manifest
    }

    // Save manifest after each round
    const manifest = {
      session: sessionId,
      config: {
        count,
        intervalMs: INTERVAL_MS,
        leagueId,
        date: todayStr,
        forcedFixtureId,
        fixtureIncludes: FIXTURE_INCLUDES,
      },
      trackedFixtures: trackedFixtureIds,
      rounds: allResults.map((r) => ({
        round: r.round,
        timestamp: r.timestamp,
        durationMs: r.durationMs,
        liveFixtureIds: r.liveFixtureIds,
        trackedFixtureIds: r.trackedFixtureIds,
        fixtureStatuses: r.fixtureStatuses,
        apiCalls: r.apis.map((a) => ({
          name: a.name,
          success: a.success,
          itemCount: a.itemCount,
          error: a.error,
        })),
      })),
      summary: {
        totalRounds: allResults.length,
        totalApiCalls: allResults.reduce((s, r) => s + r.apis.length, 0),
        successfulCalls: allResults.reduce(
          (s, r) => s + r.apis.filter((a) => a.success).length,
          0,
        ),
        failedCalls: allResults.reduce(
          (s, r) => s + r.apis.filter((a) => !a.success).length,
          0,
        ),
      },
    };
    save(sessionDir, "manifest.json", manifest);

    // Wait between rounds (skip after last)
    if (i < count) {
      const nextIn = Math.max(0, INTERVAL_MS - result.durationMs);
      const nextSec = Math.ceil(nextIn / 1000);
      console.log(`\n  ⏳ Next round in ${nextSec}s...`);
      await new Promise((r) => setTimeout(r, nextIn));
    }
  }

  // ─── Final Summary ──────────────────────────────────────────────────────────
  const totalCalls = allResults.reduce((s, r) => s + r.apis.length, 0);
  const okCalls = allResults.reduce(
    (s, r) => s + r.apis.filter((a) => a.success).length,
    0,
  );

  console.log(`\n${"═".repeat(58)}`);
  console.log("  POLLING COMPLETE");
  console.log(`${"═".repeat(58)}\n`);
  console.log(`  Rounds:       ${allResults.length}/${count}`);
  console.log(
    `  API calls:    ${totalCalls} (${okCalls} ok, ${totalCalls - okCalls} failed)`,
  );
  console.log(
    `  Fixtures:     ${trackedFixtureIds.length} tracked (${trackedFixtureIds.join(", ")})`,
  );
  console.log(`  Output:       ${sessionDir}/`);
  console.log(`  Manifest:     ${sessionDir}/manifest.json`);

  // Print final fixture states
  if (prevSnapshots.size > 0) {
    console.log(`\n  Final fixture states:`);
    for (const [id, snap] of prevSnapshots) {
      console.log(
        `    [${id}] ${snap.localteam} vs ${snap.visitorteam} — ${snap.status}`,
      );
      console.log(`           Inn1: ${snap.score1} | Inn2: ${snap.score2}`);
      console.log(
        `           Batting entries: ${snap.battingCount} | Bowling entries: ${snap.bowlingCount}`,
      );
    }
  }

  console.log();
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
