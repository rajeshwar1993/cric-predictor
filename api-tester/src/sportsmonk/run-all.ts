import "dotenv/config";
import fs from "fs";

import * as test01 from "./01-leagues.js";
import * as test02 from "./02-seasons.js";
import * as test03 from "./03-teams.js";
import * as test04 from "./04-fixtures.js";
import * as test05 from "./05-scoreboards.js";
import * as test06 from "./06-batting-bowling.js";
import * as test07 from "./07-runs.js";
import * as test08 from "./08-standings.js";
import * as test09 from "./09-players.js";
import * as test10 from "./10-venues.js";
import * as test11 from "./11-livescores.js";
import * as test12 from "./12-officials.js";
import * as test13 from "./13-countries.js";
import * as test14 from "./14-stages.js";

const tests = [
  test01, test02, test03, test04, test05, test06, test07,
  test08, test09, test10, test11, test12, test13, test14,
];

interface TestResult {
  name: string;
  endpoint: string;
  description: string;
  passed: boolean;
  errors: string[];
  shape: Record<string, string>;
  sample: unknown;
  results?: Record<string, unknown>;
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  Sportmonks Cricket API v2.0 — Explorer          ║");
  console.log("║  Testing all endpoints for IPL                    ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // Ensure response dir exists
  fs.mkdirSync("responses/sportsmonk", { recursive: true });

  const results: TestResult[] = [];

  for (const test of tests) {
    const { meta, run } = test;
    console.log(`\n${"═".repeat(60)}`);
    console.log(`  ${meta.name}`);
    console.log(`  ${meta.description}`);
    console.log(`  Endpoint: ${meta.endpoint}`);
    console.log(`${"═".repeat(60)}`);

    try {
      const result = await run();
      results.push({
        name: meta.name,
        endpoint: meta.endpoint,
        description: meta.description,
        ...result,
      });

      if (result.passed) {
        console.log(`\n  ✅ PASSED\n`);
      } else {
        console.log(`\n  ❌ FAILED:`);
        for (const err of result.errors) {
          console.log(`     - ${err}`);
        }
        console.log();
      }
    } catch (err) {
      console.error(`\n  ❌ EXCEPTION: ${err}\n`);
      results.push({
        name: meta.name,
        endpoint: meta.endpoint,
        description: meta.description,
        passed: false,
        errors: [String(err)],
        shape: {},
        sample: null,
      });
    }

    // Rate limit protection
    await new Promise((r) => setTimeout(r, 300));
  }

  // ── Summary ──
  console.log(`\n${"═".repeat(60)}`);
  console.log("  RESULTS SUMMARY");
  console.log(`${"═".repeat(60)}\n`);

  let allPassed = true;
  for (const r of results) {
    const icon = r.passed ? "✅" : "❌";
    console.log(`  ${icon} ${r.name} (${r.endpoint})${r.errors.length > 0 ? ` — ${r.errors[0].slice(0, 80)}` : ""}`);
    allPassed = allPassed && r.passed;
  }

  console.log(`\n  ${allPassed ? "🎉 All tests passed!" : "⚠ Some tests had issues."}`);
  console.log(`  Responses saved to: responses/sportsmonk/\n`);

  // Generate spec
  generateSpecSheet(results);

  process.exit(allPassed ? 0 : 1);
}

function generateSpecSheet(results: TestResult[]) {
  const lines: string[] = [];

  lines.push("# Sportmonks Cricket API v2.0 — API Spec");
  lines.push("");
  lines.push(`**Base URL:** \`${process.env.SPORTSMONK_API_BASE_URL || "https://cricket.sportmonks.com/api/v2.0/"}\``);
  lines.push("**Auth:** `api_token` query parameter");
  lines.push(`**Generated:** ${new Date().toISOString().split("T")[0]}`);
  lines.push(`**Tested against:** Live API with IPL data (league_id=1)`);
  lines.push("");
  lines.push("## Overview");
  lines.push("");
  lines.push("Sportmonks Cricket API uses a RESTful design with JSON responses. All endpoints return data wrapped in a `{ data: ... }` envelope. List endpoints include pagination via `links` and `meta` objects.");
  lines.push("");
  lines.push("### Authentication");
  lines.push("");
  lines.push("Append `?api_token=YOUR_TOKEN` to every request.");
  lines.push("");
  lines.push("### Includes (Eager Loading)");
  lines.push("");
  lines.push("Use `?include=relationship1,relationship2` to embed related resources in the response. This avoids N+1 queries. Available includes vary by endpoint.");
  lines.push("");
  lines.push("### Filtering");
  lines.push("");
  lines.push("Use `?filter[field]=value` for filtering. Common filters: `season_id`, `league_id`, `starts_between`.");
  lines.push("");
  lines.push("### Pagination");
  lines.push("");
  lines.push("List endpoints are paginated. Response includes `meta.current_page`, `meta.last_page`, `meta.total`. Navigate with `?page=N`.");
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const r of results) {
    lines.push(`## ${r.name}`);
    lines.push("");
    lines.push(`**Endpoint:** \`${r.endpoint}\``);
    lines.push("");
    lines.push(`**Description:** ${r.description}`);
    lines.push("");
    lines.push(`**Status:** ${r.passed ? "✅ PASS" : "❌ FAIL" + (r.errors.length > 0 ? ` — ${r.errors.join(", ")}` : "")}`);
    lines.push("");

    // Response shape
    if (Object.keys(r.shape).length > 0) {
      lines.push("### Response Fields");
      lines.push("");
      lines.push("| Field | Type / Sample Value |");
      lines.push("|-------|---------------------|");
      for (const [field, type] of Object.entries(r.shape)) {
        lines.push(`| \`${field}\` | ${type.replace(/\|/g, "\\|")} |`);
      }
      lines.push("");
    }

    // Sample
    if (r.sample) {
      lines.push("### Sample Response (first item)");
      lines.push("");
      lines.push("```json");
      lines.push(JSON.stringify(r.sample, null, 2));
      lines.push("```");
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  // Useful notes
  lines.push("## Key Notes for IPL Predict Integration");
  lines.push("");
  lines.push("### ID References");
  lines.push("- `league_id=1` → IPL");
  lines.push("- `season_id` changes each year — always resolve from `/leagues/1` → `season_id`");
  lines.push("- All entity IDs are integers (not strings)");
  lines.push("");
  lines.push("### Data Types");
  lines.push("- Numeric fields are actual numbers (not strings like api-cricket)");
  lines.push("- Dates are ISO 8601 strings");
  lines.push("- Boolean fields use actual `true`/`false`");
  lines.push("");
  lines.push("### Fixture Statuses");
  lines.push("- Check `status` field for: NS (Not Started), 1st Innings, 2nd Innings, Innings Break, Finished, Aban. (Abandoned), Cancl. (Cancelled)");
  lines.push("");
  lines.push("### Rate Limits");
  lines.push("- Check response headers for rate limit info");
  lines.push("- Add delays between bulk requests");
  lines.push("");
  lines.push("### Available Includes by Endpoint");
  lines.push("");
  lines.push("| Endpoint | Available Includes |");
  lines.push("|----------|-------------------|");
  lines.push("| `leagues/{id}` | seasons, country |");
  lines.push("| `seasons/{id}` | league, stages |");
  lines.push("| `fixtures/{id}` | localteam, visitorteam, batting, bowling, runs, scoreboards, lineup, manofmatch, tosswon, venue, stage, season, league |");
  lines.push("| `players/{id}` | career, teams, currentteams |");
  lines.push("| `teams/{id}` | country, squad |");
  lines.push("");

  const specPath = "responses/sportsmonk/SPORTMONKS_API_SPEC.md";
  fs.writeFileSync(specPath, lines.join("\n"));
  console.log(`  📄 Spec sheet generated: ${specPath}`);
}

main();
