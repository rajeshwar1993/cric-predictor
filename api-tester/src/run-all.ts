import "dotenv/config";
import fs from "fs";

import * as test01 from "./tests/01-get-leagues.js";
import * as test02 from "./tests/02-get-events-by-league.js";
import * as test03 from "./tests/03-get-events-by-key.js";
import * as test04 from "./tests/04-get-livescore.js";
import * as test05 from "./tests/05-get-teams.js";

const tests = [test01, test02, test03, test04, test05];
const generateSpec = process.argv.includes("--spec");

interface TestResult {
  name: string;
  description: string;
  params: Record<string, string>;
  paramsDescription: string;
  passed: boolean;
  errors: string[];
  shape: Record<string, string>;
  sample: unknown;
  [key: string]: unknown;
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  api-cricket.com API Tester                  ║");
  console.log("║  Testing all endpoints used by Bragg          ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  const results: TestResult[] = [];

  for (const test of tests) {
    const { meta, run } = test;
    console.log(`\n── ${meta.name} ──`);
    console.log(`   ${meta.description}\n`);

    try {
      const result = await run();
      results.push({
        name: meta.name,
        description: meta.description,
        params: meta.params,
        paramsDescription: meta.paramsDescription,
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
        description: meta.description,
        params: meta.params,
        paramsDescription: meta.paramsDescription,
        passed: false,
        errors: [String(err)],
        shape: {},
        sample: null,
      });
    }

    // Small delay between calls to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  // ── Summary ──
  console.log("\n══════════════════════════════════════════════");
  console.log("  RESULTS SUMMARY");
  console.log("══════════════════════════════════════════════\n");

  let allPassed = true;
  for (const r of results) {
    const icon = r.passed ? "✅" : "❌";
    console.log(`  ${icon} ${r.name}${r.errors.length > 0 ? ` (${r.errors.length} errors)` : ""}`);
    allPassed = allPassed && r.passed;
  }

  console.log(`\n  ${allPassed ? "🎉 All tests passed!" : "⚠ Some tests failed."}`);
  console.log(`  Responses saved to: responses/\n`);

  // ── Generate spec sheet ──
  if (generateSpec || true) {
    generateSpecSheet(results);
  }

  process.exit(allPassed ? 0 : 1);
}

function generateSpecSheet(results: TestResult[]) {
  const lines: string[] = [];

  lines.push("# api-cricket.com API Spec Sheet");
  lines.push("");
  lines.push(`**Base URL:** \`${process.env.CRICKET_API_BASE_URL || "https://apiv2.api-cricket.com/cricket/"}\``);
  lines.push("**Auth:** `APIkey` query parameter");
  lines.push(`**Generated:** ${new Date().toISOString().split("T")[0]}`);
  lines.push(`**Tested against:** Live API with real IPL data`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const r of results) {
    lines.push(`## ${r.name}`);
    lines.push("");
    lines.push(`**Description:** ${r.description}`);
    lines.push("");
    lines.push(`**Status:** ${r.passed ? "PASS" : "FAIL" + (r.errors.length > 0 ? ` — ${r.errors.join(", ")}` : "")}`);
    lines.push("");

    // Request
    lines.push("### Request");
    lines.push("");
    lines.push("```");
    lines.push(`GET ?method=${r.name.split(" ")[0]}&APIkey=***${Object.entries(r.params).map(([k, v]) => `&${k}=${v}`).join("")}`);
    lines.push("```");
    lines.push("");
    lines.push("| Parameter | Description |");
    lines.push("|-----------|-------------|");
    lines.push("| `method` | API method name |");
    lines.push("| `APIkey` | Authentication key |");
    for (const [k, v] of Object.entries(r.params)) {
      lines.push(`| \`${k}\` | ${v} |`);
    }
    lines.push("");

    // Response shape
    if (Object.keys(r.shape).length > 0) {
      lines.push("### Response Fields");
      lines.push("");
      lines.push("| Field | Type / Sample Value |");
      lines.push("|-------|---------------------|");
      for (const [field, type] of Object.entries(r.shape)) {
        lines.push(`| \`${field}\` | ${type} |`);
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

  lines.push("## Notes");
  lines.push("");
  lines.push("- All numeric values in scorecard entries are **strings** (e.g., `R: \"72\"`, not `R: 72`). Must use `parseInt()` / `parseFloat()` when consuming.");
  lines.push("- Scorecard entries mix batting and bowling in the same array, differentiated by `type: \"Batsman\"` vs `type: \"Bowler\"`.");
  lines.push("- Fall-of-wickets `fall` field format is `\"3.4 ov\"` — parse with `parseFloat(fall.replace(\" ov\", \"\"))`.");
  lines.push("- Extra `total` field format is `\"185 ( 20 )\"` — parse with regex `/(\\ d+)\\s*\\(\\s*([\\d.]+)\\s*\\)/`.");
  lines.push("- `event_toss` format: `\"Team Name, elected to bat first\"` — split on `\", elected to\"` to extract team.");
  lines.push("- `event_status_info` for winner: `\"Team won by X wickets\"` — parse `\" won by\"` to extract team.");
  lines.push("- `event_live`: `\"1\"` = live, `\"0\"` = not live (string, not boolean).");
  lines.push("- `balwer` in wickets is a typo in the API (not \"bowler\") — use as-is.");
  lines.push("");

  const specPath = "API_SPEC.md";
  fs.writeFileSync(specPath, lines.join("\n"));
  console.log(`  📄 Spec sheet generated: ${specPath}`);
}

main();
