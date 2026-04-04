import fs from "fs";
import { callApi, describeShape } from "./client.js";

export const meta = {
  name: "Venues",
  endpoint: "venues",
  description: "Fetch all venues and a specific venue by ID.",
};

export async function run() {
  const errors: string[] = [];
  const results: Record<string, unknown> = {};

  // 1. GET /venues
  console.log("\n  [1/2] GET /venues");
  const venues = await callApi<any[]>("venues");
  fs.writeFileSync("responses/sportsmonk/10a-venues-all.json", JSON.stringify(venues.raw, null, 2));

  let venueId: number | null = null;
  if (Array.isArray(venues.data)) {
    console.log(`  ✓ Total venues: ${venues.data.length}`);
    for (const v of venues.data.slice(0, 5)) {
      console.log(`    - id=${v.id} name="${v.name}" city="${v.city}" country_id=${v.country_id} capacity=${v.capacity}`);
    }
    venueId = venues.data[0]?.id;
    results["venues"] = { count: venues.data.length, sample: venues.data[0] };
  } else {
    errors.push("Expected data to be an array");
  }

  // 2. GET /venues/{id}
  if (venueId) {
    console.log(`\n  [2/2] GET /venues/${venueId}`);
    const venue = await callApi<any>(`venues/${venueId}`);
    fs.writeFileSync("responses/sportsmonk/10b-venue-single.json", JSON.stringify(venue.raw, null, 2));
    results["venueDetail"] = venue.data;
    if (venue.data) {
      console.log(`  ✓ Venue: id=${venue.data.id} name="${venue.data.name}" city="${venue.data.city}" capacity=${venue.data.capacity}`);
      console.log(`    floodlight=${venue.data.floodlight} image="${venue.data.image_path}"`);
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    shape: describeShape(venues.data),
    sample: venues.data?.[0],
    results,
  };
}
