import fs from "fs";
import { callApi, describeShape } from "./client.js";

export const meta = {
  name: "Countries",
  endpoint: "countries",
  description: "Fetch all countries. Useful for resolving country_id references.",
};

export async function run() {
  const errors: string[] = [];
  const results: Record<string, unknown> = {};

  // GET /countries
  console.log("\n  [1/1] GET /countries");
  try {
    const countries = await callApi<any[]>("countries");
    fs.writeFileSync("responses/sportsmonk/13-countries.json", JSON.stringify(countries.raw, null, 2));

    if (Array.isArray(countries.data)) {
      console.log(`  ✓ Total countries: ${countries.data.length}`);
      // Find India
      const india = countries.data.find((c: any) => c.name?.toLowerCase().includes("india"));
      if (india) {
        console.log(`  ✓ India: id=${india.id} name="${india.name}" continent="${india.continent}"`);
      }
      for (const c of countries.data.slice(0, 5)) {
        console.log(`    - id=${c.id} name="${c.name}" continent="${c.continent}"`);
      }
      results["countries"] = { count: countries.data.length, sample: countries.data[0] };
    }
  } catch (e) {
    console.log(`  ⚠ Countries failed: ${e}`);
    errors.push(`Countries: ${e}`);
  }

  return {
    passed: errors.length === 0,
    errors,
    shape: describeShape(results["countries"]),
    sample: null,
    results,
  };
}
