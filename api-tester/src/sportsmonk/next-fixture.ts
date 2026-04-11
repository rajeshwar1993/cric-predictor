import "dotenv/config";
import { callApi, getLeagueId } from "./client.js";

async function main() {
  const leagueId = getLeagueId();
  const today = new Date().toISOString().split("T")[0];
  const future = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split("T")[0];

  const { data } = await callApi<any[]>("fixtures", {
    "filter[league_id]": leagueId,
    "filter[starts_between]": `${today},${future}`,
    include: "localteam,visitorteam,venue",
    sort: "starting_at",
  });

  const arr = Array.isArray(data) ? data : [];
  const upcoming = arr
    .filter((f: any) => f.status === "NS" || f.status === "Not Started")
    .sort((a: any, b: any) => new Date(a.starting_at).getTime() - new Date(b.starting_at).getTime());

  if (upcoming.length === 0) {
    console.log("No upcoming NS fixtures found in next 60 days.");
    console.log("All fixtures returned:", arr.length);
    for (const f of arr.slice(0, 5)) {
      console.log("  -", f.id, f.status, f.starting_at, f.localteam?.name, "vs", f.visitorteam?.name);
    }
    return;
  }

  const next = upcoming[0];
  console.log("");
  console.log("Next upcoming IPL fixture:");
  console.log("  id:         ", next.id);
  console.log("  starting_at:", next.starting_at);
  console.log("  status:     ", next.status);
  console.log("  teams:      ", next.localteam?.name, "vs", next.visitorteam?.name);
  console.log("  venue:      ", next.venue?.name, "—", next.venue?.city);
  console.log("  round:      ", next.round);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
