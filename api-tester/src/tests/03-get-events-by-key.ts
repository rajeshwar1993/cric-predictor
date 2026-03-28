import fs from "fs";
import { callApi, describeShape } from "../client.js";

export const meta = {
  name: "get_events (by event_key)",
  description: "Fetch a single match's full data including scorecard, ball-by-ball, wickets, extras, and lineups. Used post-match for result extraction.",
  params: { event_key: "match identifier from get_events" },
  paramsDescription: "event_key (required) — obtained from get_events list",
};

export async function run() {
  const errors: string[] = [];

  const eventKey =
    (globalThis as any).__test_completed_event_key ||
    (globalThis as any).__test_event_key;

  if (!eventKey) {
    return { passed: false, errors: ["No event_key available from test 02"], shape: {}, sample: null };
  }

  meta.params = { event_key: eventKey };

  const { result, raw } = await callApi<any[]>("get_events", { event_key: eventKey });

  fs.writeFileSync("responses/03-get-events-by-key.json", JSON.stringify(raw, null, 2));

  if (!Array.isArray(result) || result.length === 0) {
    errors.push("Expected non-empty array");
    return { passed: false, errors, shape: {}, sample: null };
  }

  const event = result[0];
  console.log(`  ✓ Match: ${event.event_home_team} vs ${event.event_away_team} (${event.event_status})`);

  // ── Scorecard validation ──
  if (event.scorecard && typeof event.scorecard === "object") {
    const inningsKeys = Object.keys(event.scorecard);
    console.log(`  ✓ Scorecard innings: ${inningsKeys.length} (${inningsKeys.join(", ")})`);

    if (inningsKeys.length > 0) {
      const firstInnings = event.scorecard[inningsKeys[0]];
      if (Array.isArray(firstInnings) && firstInnings.length > 0) {
        const entry = firstInnings[0];
        const scorecardFields = ["innings", "player", "type", "R", "status"];
        for (const f of scorecardFields) {
          if (!(f in entry)) errors.push(`Scorecard entry missing field: ${f}`);
        }
        console.log(`  ✓ Scorecard entry type: "${entry.type}" (expected: Batsman or Bowler)`);
        console.log(`  ✓ Scorecard values are strings: R="${entry.R}", B="${entry.B}", 6s="${entry["6s"]}"`);

        // Check batting vs bowling differentiation
        const batsmen = firstInnings.filter((e: any) => e.type === "Batsman");
        const bowlers = firstInnings.filter((e: any) => e.type === "Bowler");
        console.log(`  ✓ First innings: ${batsmen.length} batsmen, ${bowlers.length} bowlers`);

        if (bowlers.length > 0) {
          const bowler = bowlers[0];
          const bowlerFields = ["O", "M", "W", "ER"];
          for (const f of bowlerFields) {
            if (!(f in bowler)) errors.push(`Bowler entry missing field: ${f}`);
          }
        }
      } else {
        console.log("  ⚠ First innings scorecard is empty (match may not have started)");
      }
    }
  } else {
    console.log("  ⚠ Scorecard is empty or missing (match may be upcoming)");
  }

  // ── Wickets validation ──
  if (event.wickets && typeof event.wickets === "object") {
    const wicketKeys = Object.keys(event.wickets);
    console.log(`  ✓ Wickets innings: ${wicketKeys.length}`);

    if (wicketKeys.length > 0) {
      const firstFow = event.wickets[wicketKeys[0]];
      if (Array.isArray(firstFow) && firstFow.length > 0) {
        const w = firstFow[0];
        const fowFields = ["fall", "score", "balwer", "batsman"];
        for (const f of fowFields) {
          if (!(f in w)) errors.push(`Wicket entry missing field: ${f}`);
        }
        console.log(`  ✓ First wicket: fall="${w.fall}", score="${w.score}"`);
      }
    }
  } else {
    console.log("  ⚠ Wickets data is empty or missing");
  }

  // ── Comments (ball-by-ball) validation ──
  if (event.comments && typeof event.comments === "object") {
    const commentKeys = Object.keys(event.comments);
    console.log(`  ✓ Comments innings: ${commentKeys.length}`);

    if (commentKeys.length > 0) {
      const firstComments = event.comments[commentKeys[0]];
      if (Array.isArray(firstComments) && firstComments.length > 0) {
        const c = firstComments[0];
        const commentFields = ["overs", "runs", "post"];
        for (const f of commentFields) {
          if (!(f in c)) errors.push(`Comment entry missing field: ${f}`);
        }
        console.log(`  ✓ First ball: overs="${c.overs}", runs="${c.runs}"`);
        console.log(`  ✓ Total balls in first innings: ${firstComments.length}`);
      }
    }
  } else {
    console.log("  ⚠ Comments (ball-by-ball) is empty or missing");
  }

  // ── Extra (totals) validation ──
  if (event.extra && typeof event.extra === "object") {
    const extraKeys = Object.keys(event.extra);
    console.log(`  ✓ Extra innings: ${extraKeys.length}`);

    if (extraKeys.length > 0) {
      const firstExtra = event.extra[extraKeys[0]];
      if (firstExtra && firstExtra.total) {
        console.log(`  ✓ First innings total: "${firstExtra.total}" (expected format: "185 ( 20 )")`);
        const match = firstExtra.total.match(/(\d+)\s*\(\s*([\d.]+)\s*\)/);
        if (match) {
          console.log(`  ✓ Parsed: runs=${match[1]}, overs=${match[2]}`);
        } else {
          errors.push(`Extra total format unexpected: "${firstExtra.total}"`);
        }
      }
    }
  } else {
    console.log("  ⚠ Extra data is empty or missing");
  }

  // ── Lineups validation ──
  if (event.lineups && typeof event.lineups === "object") {
    const home = event.lineups.home_team?.starting_lineups;
    const away = event.lineups.away_team?.starting_lineups;
    console.log(`  ✓ Home XI: ${Array.isArray(home) ? home.length : 0} players`);
    console.log(`  ✓ Away XI: ${Array.isArray(away) ? away.length : 0} players`);

    if (Array.isArray(home) && home.length > 0 && !home[0].player) {
      errors.push("Lineup entry missing 'player' field");
    }
  } else {
    console.log("  ⚠ Lineups data is empty or missing");
  }

  return {
    passed: errors.length === 0,
    errors,
    shape: describeShape(event),
    sample: {
      event_key: event.event_key,
      event_status: event.event_status,
      event_toss: event.event_toss || "(empty)",
      event_man_of_match: event.event_man_of_match || "(empty)",
      scorecard_innings: Object.keys(event.scorecard || {}).length,
      comments_innings: Object.keys(event.comments || {}).length,
      wickets_innings: Object.keys(event.wickets || {}).length,
      extra_innings: Object.keys(event.extra || {}).length,
    },
  };
}
