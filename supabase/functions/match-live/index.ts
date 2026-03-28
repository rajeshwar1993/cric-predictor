// Bragg — match-live Edge Function
// Live match engine: handles toss detection, live polling, progressive resolution,
// match completion, pre-match lineup retry, and proactive deadline locking.
//
// Schedule: Every 1 minute via pg_cron, gated to 12:00 PM – 1:00 AM IST.
// Manual: POST with optional { force_match_id, sync_squads_for_match, skip_window_check } body.

import {
  getSupabase,
  verifyAuth,
  fetchCricketApi,
  toCode,
  safeName,
  safeInt,
  getInningsKeys,
  getInningsOvers,
  getInningsRuns,
  filterBatsmen,
  filterBowlers,
  parseTossWinner,
  parseMatchWinner,
  derivePowerplayScore,
  derivePowerplayWickets,
  deriveFirstWicketOver,
} from "../_shared/deps.ts";

// ── Activation window ───────────────────────────────────────────
// 12:00 PM IST to 1:00 AM IST = 06:30 UTC to 19:30 UTC

function isInMatchWindow(): boolean {
  const now = new Date();
  const utcDecimal = now.getUTCHours() + now.getUTCMinutes() / 60;
  return !(utcDecimal >= 19.5 || utcDecimal < 6.5);
}

async function hasLiveMatches(): Promise<boolean> {
  const { count } = await getSupabase()
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("status", "live");
  return (count || 0) > 0;
}

// ── Main handler ────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const unauthorized = verifyAuth(req);
  if (unauthorized) return unauthorized;

  // Parse optional body for manual override
  let forceMatchId: number | null = null;
  let syncSquadsForMatch: number | null = null;
  let skipWindowCheck = false;

  try {
    const body = await req.json().catch(() => ({}));
    if (body.force_match_id) forceMatchId = Number(body.force_match_id);
    if (body.sync_squads_for_match) syncSquadsForMatch = Number(body.sync_squads_for_match);
    if (body.skip_window_check) skipWindowCheck = true;
  } catch {
    // No body — normal cron invocation
  }

  // Window check (skip if manual override or live matches exist)
  if (!skipWindowCheck && !forceMatchId && !syncSquadsForMatch) {
    if (!isInMatchWindow() && !(await hasLiveMatches())) {
      return new Response(JSON.stringify({ status: "inactive", reason: "outside match hours" }));
    }
  }

  // Manual squad sync for specific match
  if (syncSquadsForMatch) {
    const result = await syncLineupsForMatch(syncSquadsForMatch);
    return new Response(JSON.stringify({ status: "ok", squad_sync: result }));
  }

  const sb = getSupabase();
  const today = new Date().toISOString().split("T")[0];

  // Fetch today's matches
  let matchQuery = sb
    .from("matches")
    .select("*")
    .eq("date", today)
    .in("status", ["upcoming", "live"])
    .order("time_ist", { ascending: true });

  // If forcing a specific match, override the query
  if (forceMatchId) {
    matchQuery = sb
      .from("matches")
      .select("*")
      .eq("id", forceMatchId);
  }

  const { data: matches, error } = await matchQuery;

  if (error || !matches || matches.length === 0) {
    return new Response(JSON.stringify({ status: "ok", matches: 0 }));
  }

  const results = [];

  for (const match of matches) {
    // Skip if polled recently (unless forced)
    if (!forceMatchId && match.last_polled_at) {
      const lastPolled = new Date(match.last_polled_at).getTime();
      if (Date.now() - lastPolled < 50_000) {
        results.push({ match: match.match_number, action: "skipped_recent" });
        continue;
      }
    }

    if (!match.api_match_id) {
      results.push({ match: match.match_number, action: "no_api_id" });
      continue;
    }

    try {
      if (match.status === "upcoming") {
        // ── NEW: Pre-match lineup retry (1 hour before match) ──
        await maybeRetryLineups(match);

        // ── NEW: Proactive deadline lock ──
        await maybeEnforceDeadline(match);

        // Existing: check for toss / match start
        await processUpcoming(match);
        results.push({ match: match.match_number, action: "checked_upcoming" });
      } else if (match.status === "live") {
        await processLive(match);
        results.push({ match: match.match_number, action: "polled_live" });
      }
    } catch (err) {
      results.push({ match: match.match_number, action: "error", error: String(err) });
    }
  }

  return new Response(JSON.stringify({ status: "ok", results }));
});

// ── NEW: Pre-match lineup retry ─────────────────────────────────

async function maybeRetryLineups(match: any) {
  // Only retry if match starts within 1 hour
  const matchStart = new Date(`${match.date}T${match.time_ist}+05:30`);
  const now = new Date();
  const minutesUntilMatch = (matchStart.getTime() - now.getTime()) / 60000;

  if (minutesUntilMatch > 60 || minutesUntilMatch < 0) return;

  // Check if squads already populated
  const { count } = await getSupabase()
    .from("match_squads")
    .select("match_id", { count: "exact", head: true })
    .eq("match_id", match.id);

  if ((count || 0) > 0) return; // Already have squads

  console.log(`match-live: retrying lineup fetch for match ${match.id} (${minutesUntilMatch.toFixed(0)} min to start)`);
  await syncLineupsForMatch(match.id);
}

// ── NEW: Proactive deadline enforcement ─────────────────────────

async function maybeEnforceDeadline(match: any) {
  const matchStart = new Date(`${match.date}T${match.time_ist}+05:30`);
  const deadline = new Date(matchStart.getTime() - 45 * 60 * 1000);
  const now = new Date();

  if (now <= deadline) return; // Deadline hasn't passed yet

  // Lock predictions for all groups that haven't been locked yet
  const { data: unlocked } = await getSupabase()
    .from("match_group_settings")
    .select("group_id")
    .eq("match_id", match.id)
    .eq("is_locked", false);

  if (unlocked && unlocked.length > 0) {
    await getSupabase()
      .from("match_group_settings")
      .update({ is_locked: true })
      .eq("match_id", match.id)
      .eq("is_locked", false);

    console.log(`match-live: proactively locked predictions for match ${match.id} (${unlocked.length} groups)`);
  }
}

// ── Lineup sync helper ──────────────────────────────────────────

async function syncLineupsForMatch(matchId: number) {
  const sb = getSupabase();

  const { data: match } = await sb
    .from("matches")
    .select("id, api_match_id, team_a, team_b")
    .eq("id", matchId)
    .single();

  if (!match || !match.api_match_id) return { synced: 0, error: "no match or api_match_id" };

  const events = await fetchCricketApi("get_events", { event_key: match.api_match_id });
  if (!events || events.length === 0) return { synced: 0, error: "no API response" };

  const event = events[0];
  const homeLineup = event.lineups?.home_team?.starting_lineups;
  const awayLineup = event.lineups?.away_team?.starting_lineups;

  if ((!homeLineup || homeLineup.length === 0) && (!awayLineup || awayLineup.length === 0)) {
    return { synced: 0, error: "lineups not available yet" };
  }

  let synced = 0;

  for (const [lineup, teamCode] of [
    [homeLineup || [], match.team_a],
    [awayLineup || [], match.team_b],
  ] as const) {
    for (const p of lineup) {
      const name = safeName(p.player);
      if (!name) continue;

      // Upsert player
      const { data: existing } = await sb
        .from("players")
        .select("id")
        .eq("name", name)
        .eq("team_code", teamCode)
        .limit(1);

      let playerId: string;

      if (existing && existing.length > 0) {
        playerId = existing[0].id;
      } else {
        const { data: inserted, error } = await sb
          .from("players")
          .insert({ name, team_code: teamCode, is_active: true })
          .select("id")
          .single();

        if (error || !inserted) continue;
        playerId = inserted.id;
      }

      await sb.from("match_squads").upsert(
        { match_id: matchId, player_id: playerId, team_code: teamCode, is_playing_xi: true },
        { onConflict: "match_id,player_id" }
      );
      synced++;
    }
  }

  console.log(`match-live: synced ${synced} players for match ${matchId}`);
  return { synced };
}

// ── Process UPCOMING match ──────────────────────────────────────

async function processUpcoming(match: any) {
  const events = await fetchCricketApi("get_events", { event_key: match.api_match_id });
  if (!events || events.length === 0) return;

  const event = events[0];

  // ── NEW: Check for abandoned/cancelled ──
  const apiStatus = (event.event_status || "").toLowerCase();
  if (apiStatus.includes("abandon") || apiStatus.includes("cancel") || apiStatus.includes("no result")) {
    console.log(`match-live: match ${match.id} is ${event.event_status} — voiding`);
    await getSupabase().rpc("void_abandoned_match", { p_match_id: match.id });
    return;
  }

  // Check if match has started
  const isLive = event.event_live === "1";
  const tossWinner = parseTossWinner(event.event_toss);
  const hasStarted = isLive || tossWinner !== null;

  if (hasStarted) {
    await getSupabase()
      .from("matches")
      .update({
        status: "live",
        toss_winner: toCode(tossWinner),
        last_polled_at: new Date().toISOString(),
      })
      .eq("id", match.id);

    // Auto-lock predictions for all groups
    await getSupabase()
      .from("match_group_settings")
      .update({ is_locked: true })
      .eq("match_id", match.id);

    // Resolve toss_winner scenarios immediately
    await resolveScenariosByCategory(match.id, "toss_winner", toCode(tossWinner));
    return;
  }

  await getSupabase()
    .from("matches")
    .update({ last_polled_at: new Date().toISOString() })
    .eq("id", match.id);
}

// ── Process LIVE match ──────────────────────────────────────────

async function processLive(match: any) {
  const events = await fetchCricketApi("get_livescore", { match_key: match.api_match_id });
  if (!events || events.length === 0) return;

  const event = events[0];

  // ── NEW: Check for abandoned during live ──
  const apiStatus = (event.event_status || "").toLowerCase();
  if (apiStatus.includes("abandon") || apiStatus.includes("cancel") || apiStatus.includes("no result")) {
    console.log(`match-live: live match ${match.id} abandoned — voiding`);
    await getSupabase().rpc("void_abandoned_match", { p_match_id: match.id });
    return;
  }

  // Write live snapshot
  const snapshot: Record<string, any> = {
    last_polled_at: new Date().toISOString(),
    live_scorecard_json: event,
  };

  if (event.event_service_home) snapshot.current_score_a = event.event_service_home;
  if (event.event_service_away) snapshot.current_score_b = event.event_service_away;

  const inningsKeys = getInningsKeys(event.extra);
  if (inningsKeys.length > 0) snapshot.current_overs_a = getInningsOvers(event.extra, inningsKeys[0]);
  if (inningsKeys.length > 1) snapshot.current_overs_b = getInningsOvers(event.extra, inningsKeys[1]);

  // Check if match completed
  if (event.event_status === "Finished") {
    snapshot.status = "completed";
    snapshot.match_winner = toCode(parseMatchWinner(event.event_status_info));
    snapshot.resolved_at = new Date().toISOString();

    const scorecardKeys = getInningsKeys(event.scorecard);
    if (scorecardKeys.length > 0) {
      Object.assign(snapshot, parseFullResults(event));
    }

    await getSupabase().from("matches").update(snapshot).eq("id", match.id);
    await getSupabase().rpc("resolve_match_predictions", { p_match_id: match.id });
    return;
  }

  // Still live — write snapshot and do progressive resolution
  await getSupabase().from("matches").update(snapshot).eq("id", match.id);
  await progressiveResolve(match.id, event);
}

// ── Progressive scenario resolution ─────────────────────────────

async function progressiveResolve(matchId: number, event: any) {
  const scorecardKeys = getInningsKeys(event.scorecard);
  if (scorecardKeys.length === 0) return;

  const firstKey = scorecardKeys[0];
  const secondKey = scorecardKeys.length > 1 ? scorecardKeys[1] : null;
  const firstEntries = event.scorecard[firstKey] || [];
  const secondEntries = secondKey ? event.scorecard[secondKey] || [] : [];
  const firstOvers = getInningsOvers(event.extra, firstKey) ?? 0;

  // Phase 2: First wicket over
  try {
    const fwo = deriveFirstWicketOver(event.wickets);
    if (fwo !== null) {
      let bracket: string;
      if (fwo <= 2) bracket = "1-2";
      else if (fwo <= 4) bracket = "3-4";
      else if (fwo <= 6) bracket = "5-6";
      else bracket = "7+";
      await resolveScenariosByCategory(matchId, "first_wicket_over", bracket);
    }
  } catch (err) {
    console.error(`progressiveResolve phase 2 failed: match=${matchId}`, err);
  }

  // Phase 3: Powerplay
  try {
    if (firstOvers >= 6) {
      const ppScore = derivePowerplayScore(event.comments);
      if (ppScore !== null) {
        let bracket: string;
        if (ppScore < 40) bracket = "<40";
        else if (ppScore >= 71) bracket = "71+";
        else if (ppScore >= 56) bracket = "56-70";
        else bracket = "40-55";
        await resolveScenariosByCategory(matchId, "powerplay_score", bracket);
      }

      const ppWickets = derivePowerplayWickets(event.wickets);
      if (ppWickets !== null) {
        await resolveScenariosByCategory(matchId, "powerplay_wickets", ppWickets >= 3 ? "3+" : String(ppWickets));
      }
    }
  } catch (err) {
    console.error(`progressiveResolve phase 3 failed: match=${matchId}`, err);
  }

  // Phase 4: Mid-match milestones
  try {
    const allBatsmen = [...filterBatsmen(firstEntries), ...filterBatsmen(secondEntries)];
    const allBowlers = [...filterBowlers(firstEntries), ...filterBowlers(secondEntries)];

    if (allBatsmen.some((b: any) => safeInt(b.R) >= 50)) {
      await resolveScenariosByCategory(matchId, "batsman_fifty", "Yes");
    }
    if (allBowlers.some((b: any) => safeInt(b.W) >= 3)) {
      await resolveScenariosByCategory(matchId, "bowler_three_wkt", "Yes");
    }
  } catch (err) {
    console.error(`progressiveResolve phase 4 failed: match=${matchId}`, err);
  }

  // Phase 5: Innings break
  try {
    const firstRuns = getInningsRuns(event.extra, firstKey);
    const firstInningsComplete =
      secondKey !== null && (firstOvers >= 20 || filterBowlers(firstEntries).reduce((s: number, b: any) => s + safeInt(b.W), 0) >= 10);

    if (firstInningsComplete && firstRuns !== null && firstRuns > 0) {
      let bracket: string;
      if (firstRuns < 150) bracket = "<150";
      else if (firstRuns >= 190) bracket = "190+";
      else if (firstRuns >= 170) bracket = "170-189";
      else bracket = "150-169";
      await resolveScenariosByCategory(matchId, "first_innings_score", bracket);
    }
  } catch (err) {
    console.error(`progressiveResolve phase 5 failed: match=${matchId}`, err);
  }
}

// ── Parse full results from completed event ─────────────────────

function parseFullResults(event: any): Record<string, any> {
  const results: Record<string, any> = {};
  const inningsKeys = getInningsKeys(event.scorecard);
  if (inningsKeys.length === 0) return results;

  const firstKey = inningsKeys[0];
  const secondKey = inningsKeys.length > 1 ? inningsKeys[1] : null;
  const firstEntries = event.scorecard[firstKey] || [];
  const secondEntries = secondKey ? event.scorecard[secondKey] || [] : [];

  results.first_innings_score = getInningsRuns(event.extra, firstKey);
  results.first_innings_wickets = filterBowlers(firstEntries).reduce((s: number, b: any) => s + safeInt(b.W), 0);

  const potm = safeName(event.event_man_of_match);
  if (potm) results.player_of_match = potm;

  if (secondKey) {
    const r1 = getInningsRuns(event.extra, firstKey) || 0;
    const r2 = getInningsRuns(event.extra, secondKey) || 0;
    const w1 = filterBowlers(firstEntries).reduce((s: number, b: any) => s + safeInt(b.W), 0);
    const w2 = filterBowlers(secondEntries).reduce((s: number, b: any) => s + safeInt(b.W), 0);
    results.total_match_runs = r1 + r2;
    results.total_match_wickets = w1 + w2;
  }

  const allBatsmen = [...filterBatsmen(firstEntries), ...filterBatsmen(secondEntries)];
  const allBowlers = [...filterBowlers(firstEntries), ...filterBowlers(secondEntries)];

  results.total_match_sixes = allBatsmen.reduce((sum: number, b: any) => sum + safeInt(b["6s"]), 0);

  let topRuns = -1, topScorerName = "";
  for (const b of allBatsmen) { const r = safeInt(b.R); if (r > topRuns) { topRuns = r; topScorerName = b.player; } }
  if (topRuns > 0) { const n = safeName(topScorerName); if (n) { results.top_scorer = n; results.top_scorer_runs = topRuns; } }

  let mostSixes = 0, mostSixesName = "";
  for (const b of allBatsmen) { const s = safeInt(b["6s"]); if (s > mostSixes) { mostSixes = s; mostSixesName = b.player; } }
  if (mostSixes > 0) { const n = safeName(mostSixesName); if (n) results.most_sixes_player = n; }

  let topW = -1, topBowlerName = "";
  for (const b of allBowlers) { const w = safeInt(b.W); if (w > topW) { topW = w; topBowlerName = b.player; } }
  if (topW > 0) { const n = safeName(topBowlerName); if (n) { results.top_wicket_taker = n; results.top_wicket_taker_wickets = topW; } }

  results.batsman_scored_fifty = allBatsmen.some((b: any) => safeInt(b.R) >= 50);
  results.bowler_took_three = allBowlers.some((b: any) => safeInt(b.W) >= 3);
  results.had_super_over = inningsKeys.length > 2;

  const ppScore = derivePowerplayScore(event.comments);
  if (ppScore !== null) results.powerplay_score = ppScore;
  const ppWickets = derivePowerplayWickets(event.wickets);
  if (ppWickets !== null) results.powerplay_wickets = ppWickets;
  const fwo = deriveFirstWicketOver(event.wickets);
  if (fwo !== null) results.first_wicket_over = fwo;

  return results;
}

// ── Resolve scenarios by category ───────────────────────────────

async function resolveScenariosByCategory(matchId: number, category: string, correctAnswer: string | null) {
  if (!correctAnswer) return;
  const { error } = await getSupabase().rpc("resolve_scenarios_by_category", {
    p_match_id: matchId,
    p_category: category,
    p_correct_answer: correctAnswer,
  });
  if (error) {
    console.error(`resolveScenariosByCategory failed: match=${matchId} cat=${category}`, error.message);
  }
}
