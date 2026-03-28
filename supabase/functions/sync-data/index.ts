// Bragg — sync-data Edge Function
// Daily sync: fetches fixtures from api-cricket.com and populates/updates the matches table.
// Also attempts lineup sync for today's matches and cleans up stale data.
//
// Schedule: Daily at 5:00 AM IST (23:30 UTC previous day)
// Manual: POST with optional { date_start, date_stop } body to override range.

import {
  getSupabase,
  verifyAuth,
  fetchCricketApi,
  toCode,
  safeName,
  CRICKET_API_LEAGUE_KEY,
} from "../_shared/deps.ts";

/**
 * api-cricket.com returns event_time ~3.5 hours behind IST.
 * Add 3:30 to get the actual match time in IST.
 */
function adjustTimeIST(apiTime: string | undefined | null): string | null {
  if (!apiTime) return null;
  const parts = apiTime.split(":");
  if (parts.length < 2) return null;

  let hours = parseInt(parts[0], 10);
  let minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;

  // Add 3 hours 30 minutes
  minutes += 30;
  hours += 3;
  if (minutes >= 60) {
    minutes -= 60;
    hours += 1;
  }
  if (hours >= 24) {
    hours -= 24; // Overflow past midnight
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

Deno.serve(async (req: Request) => {
  const unauthorized = verifyAuth(req);
  if (unauthorized) return unauthorized;

  const results: any[] = [];

  // ── Parse optional body for manual override ───────────────────
  let dateStart: string;
  let dateStop: string;

  try {
    const body = await req.json().catch(() => ({}));
    const today = new Date();

    if (body.date_start) {
      dateStart = body.date_start;
    } else {
      dateStart = today.toISOString().split("T")[0];
    }

    if (body.date_stop) {
      dateStop = body.date_stop;
    } else {
      const stop = new Date(today);
      stop.setDate(stop.getDate() + 10);
      dateStop = stop.toISOString().split("T")[0];
    }
  } catch {
    const today = new Date();
    dateStart = today.toISOString().split("T")[0];
    const stop = new Date(today);
    stop.setDate(stop.getDate() + 10);
    dateStop = stop.toISOString().split("T")[0];
  }

  console.log(`sync-data: fetching fixtures ${dateStart} → ${dateStop}`);

  // ── Step 1: Fetch fixtures from API ───────────────────────────

  const events = await fetchCricketApi("get_events", {
    league_key: CRICKET_API_LEAGUE_KEY,
    date_start: dateStart,
    date_stop: dateStop,
  });

  if (!events || events.length === 0) {
    console.log("sync-data: no events returned from API");
    return new Response(JSON.stringify({ status: "ok", fixtures: 0, results }));
  }

  console.log(`sync-data: ${events.length} events from API`);

  const sb = getSupabase();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const event of events) {
    const teamA = toCode(event.event_home_team);
    const teamB = toCode(event.event_away_team);

    if (!teamA || !teamB) {
      console.warn(`sync-data: skipping event ${event.event_key} — unknown team(s): ${event.event_home_team} / ${event.event_away_team}`);
      skipped++;
      continue;
    }

    const eventKey = event.event_key;
    const matchDate = event.event_date_start;
    const matchTime = adjustTimeIST(event.event_time) || "19:30";
    const venue = event.event_stadium || "TBD";
    const matchNumber = parseInt(event.league_round || "0", 10);

    // Check if match already exists (by api_match_id OR by teams + date)
    const { data: existing } = await sb
      .from("matches")
      .select("id, api_match_id, date, time_ist, venue, status")
      .or(`api_match_id.eq.${eventKey},and(team_a.eq.${teamA},team_b.eq.${teamB},date.eq.${matchDate})`)
      .limit(1);

    if (existing && existing.length > 0) {
      const match = existing[0];

      // Don't update completed/live matches
      if (match.status !== "upcoming") {
        skipped++;
        continue;
      }

      // Update if anything changed (date, time, venue, api_match_id)
      const changes: Record<string, unknown> = {};
      if (!match.api_match_id && eventKey) changes.api_match_id = eventKey;
      if (match.date !== matchDate) changes.date = matchDate;
      if (match.time_ist !== matchTime) changes.time_ist = matchTime;
      if (match.venue !== venue) changes.venue = venue;

      if (Object.keys(changes).length > 0) {
        const { error } = await sb
          .from("matches")
          .update(changes)
          .eq("id", match.id);

        if (error) {
          console.error(`sync-data: failed to update match ${match.id}:`, error.message);
        } else {
          console.log(`sync-data: updated match ${match.id} — ${Object.keys(changes).join(", ")}`);
          updated++;
        }
      } else {
        skipped++;
      }
    } else {
      // Insert new match
      const { error } = await sb.from("matches").insert({
        match_number: matchNumber || undefined,
        team_a: teamA,
        team_b: teamB,
        date: matchDate,
        time_ist: matchTime,
        venue,
        api_match_id: eventKey,
        status: "upcoming",
      });

      if (error) {
        // match_number conflict — try without it (auto-assign later)
        if (error.message?.includes("match_number")) {
          const { error: retryErr } = await sb.from("matches").insert({
            match_number: Date.now() % 100000, // Temporary unique number
            team_a: teamA,
            team_b: teamB,
            date: matchDate,
            time_ist: matchTime,
            venue,
            api_match_id: eventKey,
            status: "upcoming",
          });
          if (retryErr) {
            console.error(`sync-data: failed to insert match ${teamA} vs ${teamB}:`, retryErr.message);
          } else {
            console.log(`sync-data: inserted ${teamA} vs ${teamB} on ${matchDate}`);
            inserted++;
          }
        } else {
          console.error(`sync-data: failed to insert match ${teamA} vs ${teamB}:`, error.message);
        }
      } else {
        console.log(`sync-data: inserted ${teamA} vs ${teamB} on ${matchDate}`);
        inserted++;
      }
    }

    // ── Step 2: Attempt lineup sync for today's matches ─────────
    const today = new Date().toISOString().split("T")[0];
    if (matchDate === today && event.lineups) {
      await syncLineups(sb, eventKey, event, teamA, teamB);
    }
  }

  results.push({ fixtures: { inserted, updated, skipped } });

  // ── Step 3: Cleanup stale matches ─────────────────────────────
  const staleResult = await cleanupStaleMatches(sb);
  results.push({ staleCleanup: staleResult });

  console.log(`sync-data: done — inserted=${inserted}, updated=${updated}, skipped=${skipped}`);

  return new Response(JSON.stringify({ status: "ok", results }));
});

// ── Lineup sync ─────────────────────────────────────────────────

async function syncLineups(
  sb: ReturnType<typeof getSupabase>,
  eventKey: string,
  event: any,
  teamA: string,
  teamB: string
) {
  const homeLineup = event.lineups?.home_team?.starting_lineups;
  const awayLineup = event.lineups?.away_team?.starting_lineups;

  if ((!homeLineup || homeLineup.length === 0) && (!awayLineup || awayLineup.length === 0)) {
    console.log(`sync-data: no lineups available for ${eventKey}`);
    return;
  }

  // Find the match in DB
  const { data: match } = await sb
    .from("matches")
    .select("id")
    .eq("api_match_id", eventKey)
    .single();

  if (!match) return;

  const allPlayers: Array<{ name: string; teamCode: string }> = [];

  for (const p of homeLineup || []) {
    const name = safeName(p.player);
    if (name) allPlayers.push({ name, teamCode: teamA });
  }
  for (const p of awayLineup || []) {
    const name = safeName(p.player);
    if (name) allPlayers.push({ name, teamCode: teamB });
  }

  if (allPlayers.length === 0) return;

  // Upsert players
  for (const p of allPlayers) {
    // Check if player exists by name + team
    const { data: existing } = await sb
      .from("players")
      .select("id")
      .eq("name", p.name)
      .eq("team_code", p.teamCode)
      .limit(1);

    let playerId: string;

    if (existing && existing.length > 0) {
      playerId = existing[0].id;
    } else {
      const { data: inserted, error } = await sb
        .from("players")
        .insert({ name: p.name, team_code: p.teamCode, is_active: true })
        .select("id")
        .single();

      if (error || !inserted) {
        console.warn(`sync-data: failed to insert player ${p.name}: ${error?.message}`);
        continue;
      }
      playerId = inserted.id;
    }

    // Upsert match_squad
    await sb.from("match_squads").upsert(
      {
        match_id: match.id,
        player_id: playerId,
        team_code: p.teamCode,
        is_playing_xi: true,
      },
      { onConflict: "match_id,player_id" }
    );
  }

  console.log(`sync-data: synced ${allPlayers.length} players for match ${match.id}`);
}

// ── Stale match cleanup ─────────────────────────────────────────

async function cleanupStaleMatches(sb: ReturnType<typeof getSupabase>) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const cutoff = yesterday.toISOString().split("T")[0];

  // Find matches with date in the past that are still "upcoming"
  const { data: stale } = await sb
    .from("matches")
    .select("id, match_number, team_a, team_b, date, api_match_id")
    .eq("status", "upcoming")
    .lt("date", cutoff);

  if (!stale || stale.length === 0) return { staleCount: 0 };

  console.log(`sync-data: found ${stale.length} stale match(es)`);

  for (const match of stale) {
    // Check API for actual status
    if (match.api_match_id) {
      const events = await fetchCricketApi("get_events", { event_key: match.api_match_id });
      if (events && events.length > 0) {
        const event = events[0];
        const status = event.event_status?.toLowerCase() || "";

        if (status.includes("abandon") || status.includes("cancel") || status.includes("no result")) {
          console.log(`sync-data: voiding abandoned match ${match.id} (${match.team_a} vs ${match.team_b})`);
          await sb.rpc("void_abandoned_match", { p_match_id: match.id });
          continue;
        }

        if (status === "finished") {
          console.log(`sync-data: stale match ${match.id} is actually finished — marking for live engine to process`);
          // Don't resolve here — let match-live handle it properly
          continue;
        }
      }
    }

    // If no API data or unknown status, just log warning
    console.warn(`sync-data: match ${match.id} (${match.team_a} vs ${match.team_b} on ${match.date}) is stale — needs manual review`);
  }

  return { staleCount: stale.length };
}
