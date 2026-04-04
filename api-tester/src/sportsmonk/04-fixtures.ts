import fs from "fs";
import { callApi, getLeagueId, describeShape } from "./client.js";

export const meta = {
  name: "Fixtures",
  endpoint: "fixtures",
  description: "Fetch fixtures for the current IPL season. Test with various includes to see available nested data.",
};

export async function run() {
  const errors: string[] = [];
  const results: Record<string, unknown> = {};
  const seasonId = (globalThis as any).__sportsmonk_season_id || "1795";

  // 1. GET /fixtures?filter[season_id]={seasonId} — fixtures for current season
  console.log(`\n  [1/3] GET /fixtures?filter[season_id]=${seasonId}&sort=starting_at`);
  const fixtures = await callApi<any[]>("fixtures", {
    "filter[season_id]": seasonId,
    sort: "starting_at",
  });
  fs.writeFileSync("responses/sportsmonk/04a-fixtures-season.json", JSON.stringify(fixtures.raw, null, 2));

  let fixtureId: number | null = null;
  let completedFixtureId: number | null = null;

  if (Array.isArray(fixtures.data)) {
    console.log(`  ✓ Total fixtures this season: ${fixtures.data.length}`);

    // Categorize by status
    const statusMap: Record<string, number> = {};
    for (const f of fixtures.data) {
      const status = f.status || "unknown";
      statusMap[status] = (statusMap[status] || 0) + 1;
    }
    console.log(`  ✓ Status breakdown:`);
    for (const [status, count] of Object.entries(statusMap)) {
      console.log(`    - ${status}: ${count}`);
    }

    // Find first fixture and first completed
    fixtureId = fixtures.data[0]?.id;
    const completed = fixtures.data.find((f: any) => f.status === "Finished" || f.status === "finished");
    if (completed) {
      completedFixtureId = completed.id;
      console.log(`  ✓ Completed fixture found: id=${completed.id}`);
    }

    // Store for later tests
    (globalThis as any).__sportsmonk_fixture_id = fixtureId;
    (globalThis as any).__sportsmonk_completed_fixture_id = completedFixtureId || fixtureId;

    results["fixtures"] = { count: fixtures.data.length, statuses: statusMap };
  } else {
    errors.push("Expected data to be an array");
  }

  // 2. GET /fixtures/{id}?include=... — single fixture with all includes
  const targetFixtureId = completedFixtureId || fixtureId;
  if (targetFixtureId) {
    const includes = [
      "localteam", "visitorteam", "batting", "bowling",
      "runs", "scoreboards", "lineup", "manofmatch",
      "tosswon", "venue", "stage", "season", "league",
    ].join(",");

    console.log(`\n  [2/3] GET /fixtures/${targetFixtureId}?include=${includes}`);
    try {
      const fixture = await callApi<any>(`fixtures/${targetFixtureId}`, { include: includes });
      fs.writeFileSync("responses/sportsmonk/04b-fixture-full.json", JSON.stringify(fixture.raw, null, 2));
      results["fixtureDetail"] = fixture.data;

      console.log(`  ✓ Fixture: id=${fixture.data?.id} status="${fixture.data?.status}"`);
      console.log(`  ✓ Round: ${fixture.data?.round}`);

      // Check which includes returned data
      const includeNames = includes.split(",");
      for (const inc of includeNames) {
        const val = fixture.data?.[inc];
        if (val !== undefined && val !== null) {
          if (Array.isArray(val)) {
            console.log(`  ✓ include[${inc}]: array[${val.length}]`);
          } else if (typeof val === "object") {
            console.log(`  ✓ include[${inc}]: object {${Object.keys(val).slice(0, 5).join(", ")}}`);
          } else {
            console.log(`  ✓ include[${inc}]: ${val}`);
          }
        } else {
          console.log(`  ⚠ include[${inc}]: null/undefined`);
        }
      }
    } catch (e) {
      console.log(`  ⚠ Fixture detail failed: ${e}`);
      errors.push(`Fixture detail: ${e}`);
    }
  }

  // 3. GET /fixtures?filter[league_id]={leagueId}&filter[season_id]={seasonId}&filter[starts_between]=... — date-filtered
  console.log(`\n  [3/3] GET /fixtures with date filter (last 30 days)`);
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateRange = `${thirtyDaysAgo.toISOString().split("T")[0]},${now.toISOString().split("T")[0]}`;

  try {
    const filtered = await callApi<any[]>("fixtures", {
      "filter[league_id]": getLeagueId(),
      "filter[season_id]": seasonId,
      "filter[starts_between]": dateRange,
    });
    fs.writeFileSync("responses/sportsmonk/04c-fixtures-recent.json", JSON.stringify(filtered.raw, null, 2));
    console.log(`  ✓ Fixtures in last 30 days: ${filtered.data?.length || 0}`);
    results["recentFixtures"] = { count: filtered.data?.length || 0 };
  } catch (e) {
    console.log(`  ⚠ Date-filtered fixtures failed: ${e}`);
  }

  return {
    passed: errors.length === 0,
    errors,
    shape: describeShape(fixtures.data),
    sample: fixtures.data?.[0],
    results,
  };
}
