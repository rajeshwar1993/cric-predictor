// Bragg — Match Cron Edge Function
// Runs every minute via pg_cron. Handles:
// 1. Upcoming → Live transition (toss detection, auto-lock predictions)
// 2. Live match polling (scorecard → write snapshot → progressive resolution)
// 3. Completed → final resolution pass
//
// API Provider: api-cricket.com v2.0

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRICKET_API_KEY = Deno.env.get("CRICKET_API_KEY") || "";
const CRICKET_API_BASE =
  Deno.env.get("CRICKET_API_BASE_URL") || "https://apiv2.api-cricket.com/cricket/";
const CRICKET_API_LEAGUE_KEY = Deno.env.get("CRICKET_API_LEAGUE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Parsing utilities (duplicated from web-app/src/lib/cricket-api/parsers.ts
//    because Deno edge functions can't import from the Next.js module tree) ──

function safeInt(val: string | undefined | null): number {
  const n = parseInt(val ?? "0", 10);
  return Number.isNaN(n) ? 0 : n;
}

function safeFloat(val: string | undefined | null): number {
  const n = parseFloat(val ?? "0");
  return Number.isNaN(n) ? 0 : n;
}

function getFirstInningsKey(obj: Record<string, unknown> | undefined | null): string | null {
  if (!obj) return null;
  const keys = Object.keys(obj);
  return keys.length > 0 ? keys[0] : null;
}

function getInningsKeys(obj: Record<string, unknown> | undefined | null): string[] {
  if (!obj) return [];
  return Object.keys(obj);
}

function filterBatsmen(entries: any[]): any[] {
  return entries.filter((e) => e.type === "Batsman");
}

function filterBowlers(entries: any[]): any[] {
  return entries.filter((e) => e.type === "Bowler");
}

function parseTossWinner(eventToss: string | undefined | null): string | null {
  if (!eventToss || eventToss.trim() === "") return null;
  for (const delim of [", elected to", ", chose to", ", opted to"]) {
    const idx = eventToss.indexOf(delim);
    if (idx > 0) return eventToss.slice(0, idx).trim();
  }
  const commaIdx = eventToss.indexOf(",");
  if (commaIdx > 0) return eventToss.slice(0, commaIdx).trim();
  return null;
}

function parseMatchWinner(eventStatusInfo: string | undefined | null): string | null {
  if (!eventStatusInfo || eventStatusInfo.trim() === "") return null;
  const lower = eventStatusInfo.toLowerCase();
  if (lower.includes("no result") || lower.includes("abandoned") || lower.includes("cancelled")) {
    return null;
  }
  const wonIdx = eventStatusInfo.indexOf(" won by");
  if (wonIdx > 0) return eventStatusInfo.slice(0, wonIdx).trim();
  const superOverMatch = eventStatusInfo.match(/\((.+?)\s+won\s+(?:the\s+)?[Ss]uper\s+[Oo]ver\)/);
  if (superOverMatch) return superOverMatch[1].trim();
  return null;
}

function parseInningsTotal(total: string | undefined | null): { runs: number; overs: number } | null {
  if (!total || total.trim() === "") return null;
  const match = total.match(/(\d+)\s*\(\s*([\d.]+)\s*\)/);
  if (!match) return null;
  return { runs: parseInt(match[1], 10), overs: parseFloat(match[2]) };
}

function parseOverNumber(fall: string | undefined | null): number | null {
  if (!fall || fall.trim() === "") return null;
  const cleaned = fall.replace(/\s*ov\s*$/i, "").trim();
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

function derivePowerplayScore(comments: Record<string, any[]> | undefined | null): number | null {
  if (!comments) return null;
  const firstKey = getFirstInningsKey(comments);
  if (!firstKey) return null;
  const balls = comments[firstKey];
  if (!balls || balls.length === 0) return null;
  let total = 0;
  for (const ball of balls) {
    const over = parseFloat(ball.overs);
    if (Number.isNaN(over) || over > 6.0) break;
    total += safeInt(ball.runs);
  }
  return total;
}

function derivePowerplayWickets(wickets: Record<string, any[]> | undefined | null): number | null {
  if (!wickets) return null;
  const firstKey = getFirstInningsKey(wickets);
  if (!firstKey) return null;
  const fow = wickets[firstKey];
  if (!fow || fow.length === 0) return 0;
  return fow.filter((w: any) => {
    const over = parseOverNumber(w.fall);
    return over !== null && over <= 6.0;
  }).length;
}

function deriveFirstWicketOver(wickets: Record<string, any[]> | undefined | null): number | null {
  if (!wickets) return null;
  const firstKey = getFirstInningsKey(wickets);
  if (!firstKey) return null;
  const fow = wickets[firstKey];
  if (!fow || fow.length === 0) return null;
  const over = parseOverNumber(fow[0].fall);
  if (over === null) return null;
  return Math.ceil(over);
}

function getInningsRuns(extra: Record<string, any> | undefined | null, key: string): number | null {
  if (!extra || !extra[key]) return null;
  const parsed = parseInningsTotal(extra[key].total);
  return parsed ? parsed.runs : null;
}

function getInningsOvers(extra: Record<string, any> | undefined | null, key: string): number | null {
  if (!extra || !extra[key]) return null;
  const parsed = parseInningsTotal(extra[key].total);
  return parsed ? parsed.overs : null;
}

// ── Team name mapping ───────────────────────────────────────────

const TEAM_NAME_TO_CODE: Record<string, string> = {
  "Chennai Super Kings": "CSK",
  "Mumbai Indians": "MI",
  "Royal Challengers Bangalore": "RCB",
  "Royal Challengers Bengaluru": "RCB",
  "Kolkata Knight Riders": "KKR",
  "Delhi Capitals": "DC",
  "Sunrisers Hyderabad": "SRH",
  "Rajasthan Royals": "RR",
  "Punjab Kings": "PBKS",
  "Gujarat Titans": "GT",
  "Lucknow Super Giants": "LSG",
};

function toCode(name: string | undefined | null): string | null {
  if (!name) return null;
  return TEAM_NAME_TO_CODE[name] || name;
}

// ── Activation window ───────────────────────────────────────────
// 2 PM IST to 1 AM IST = 08:30 UTC to 19:30 UTC

function isInMatchWindow(): boolean {
  const now = new Date();
  const utcDecimal = now.getUTCHours() + now.getUTCMinutes() / 60;
  return !(utcDecimal >= 19.5 || utcDecimal < 8.5);
}

async function hasLiveMatches(): Promise<boolean> {
  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("status", "live");
  return (count || 0) > 0;
}

// ── api-cricket.com API helper ──────────────────────────────────

async function fetchCricketApi(
  method: string,
  params: Record<string, string> = {}
): Promise<any[] | null> {
  if (!CRICKET_API_KEY) return null;

  const url = new URL(CRICKET_API_BASE);
  url.searchParams.set("method", method);
  url.searchParams.set("APIkey", CRICKET_API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success !== 1) return null;
    return json.result as any[];
  } catch {
    return null;
  }
}

// ── Main handler ────────────────────────────────────────────────

Deno.serve(async () => {
  if (!isInMatchWindow() && !(await hasLiveMatches())) {
    return new Response(JSON.stringify({ status: "inactive", reason: "outside match hours" }));
  }

  const today = new Date().toISOString().split("T")[0];
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .eq("date", today)
    .in("status", ["upcoming", "live"])
    .order("time_ist", { ascending: true });

  if (error || !matches || matches.length === 0) {
    return new Response(JSON.stringify({ status: "ok", matches: 0 }));
  }

  const results = [];

  for (const match of matches) {
    if (match.last_polled_at) {
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

// ── Process UPCOMING match ──────────────────────────────────────

async function processUpcoming(match: any) {
  const events = await fetchCricketApi("get_events", { event_key: match.api_match_id });
  if (!events || events.length === 0) return;

  const event = events[0];

  // Check if match has started — toss happened or event_live is "1"
  const isLive = event.event_live === "1";
  const tossWinner = parseTossWinner(event.event_toss);
  const hasStarted = isLive || tossWinner !== null;

  if (hasStarted) {
    await supabase
      .from("matches")
      .update({
        status: "live",
        toss_winner: toCode(tossWinner),
        last_polled_at: new Date().toISOString(),
      })
      .eq("id", match.id);

    // Auto-lock predictions for all groups
    await supabase
      .from("match_group_settings")
      .update({ is_locked: true })
      .eq("match_id", match.id);

    // Resolve toss_winner scenarios immediately
    await resolveScenariosByCategory(match.id, "toss_winner", toCode(tossWinner));
    return;
  }

  await supabase
    .from("matches")
    .update({ last_polled_at: new Date().toISOString() })
    .eq("id", match.id);
}

// ── Process LIVE match ──────────────────────────────────────────

async function processLive(match: any) {
  const events = await fetchCricketApi("get_livescore", { match_key: match.api_match_id });
  if (!events || events.length === 0) return;

  const event = events[0];

  // Write live snapshot
  const snapshot: Record<string, any> = {
    last_polled_at: new Date().toISOString(),
    live_scorecard_json: event,
  };

  // Live scores — already formatted as "185/4"
  if (event.event_service_home) {
    snapshot.current_score_a = event.event_service_home;
  }
  if (event.event_service_away) {
    snapshot.current_score_b = event.event_service_away;
  }

  // Overs from extra object
  const inningsKeys = getInningsKeys(event.extra);
  if (inningsKeys.length > 0) {
    snapshot.current_overs_a = getInningsOvers(event.extra, inningsKeys[0]);
  }
  if (inningsKeys.length > 1) {
    snapshot.current_overs_b = getInningsOvers(event.extra, inningsKeys[1]);
  }

  // Check if match completed
  if (event.event_status === "Finished") {
    snapshot.status = "completed";
    snapshot.match_winner = toCode(parseMatchWinner(event.event_status_info));
    snapshot.resolved_at = new Date().toISOString();

    // Parse full results
    const scorecardKeys = getInningsKeys(event.scorecard);
    if (scorecardKeys.length > 0) {
      Object.assign(snapshot, parseFullResults(event));
    }

    await supabase.from("matches").update(snapshot).eq("id", match.id);

    // Run full resolution
    await supabase.rpc("resolve_match_predictions", { p_match_id: match.id });
    return;
  }

  // Still live — write snapshot and do progressive resolution
  await supabase.from("matches").update(snapshot).eq("id", match.id);
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

  // Phase 1: Toss (already handled in processUpcoming)

  // Phase 2: First wicket over
  const fwo = deriveFirstWicketOver(event.wickets);
  if (fwo !== null) {
    let bracket: string;
    if (fwo <= 2) bracket = "1-2";
    else if (fwo <= 4) bracket = "3-4";
    else if (fwo <= 6) bracket = "5-6";
    else bracket = "7+";
    await resolveScenariosByCategory(matchId, "first_wicket_over", bracket);
  }

  // Phase 3: Powerplay (after 6 overs in first innings)
  if (firstOvers >= 6) {
    // Powerplay score from ball-by-ball
    const ppScore = derivePowerplayScore(event.comments);
    if (ppScore !== null) {
      let bracket: string;
      if (ppScore < 40) bracket = "<40";
      else if (ppScore >= 71) bracket = "71+";
      else if (ppScore >= 56) bracket = "56-70";
      else bracket = "40-55";
      await resolveScenariosByCategory(matchId, "powerplay_score", bracket);
    }

    // Powerplay wickets from fall-of-wickets
    const ppWickets = derivePowerplayWickets(event.wickets);
    if (ppWickets !== null) {
      await resolveScenariosByCategory(
        matchId,
        "powerplay_wickets",
        ppWickets >= 3 ? "3+" : String(ppWickets)
      );
    }
  }

  // Phase 4: Mid-match milestones
  const allBatsmen = [
    ...filterBatsmen(firstEntries),
    ...filterBatsmen(secondEntries),
  ];
  const allBowlers = [
    ...filterBowlers(firstEntries),
    ...filterBowlers(secondEntries),
  ];

  // Batsman 50+
  if (allBatsmen.some((b: any) => safeInt(b.R) >= 50)) {
    await resolveScenariosByCategory(matchId, "batsman_fifty", "Yes");
  }

  // Bowler 3+ wickets
  if (allBowlers.some((b: any) => safeInt(b.W) >= 3)) {
    await resolveScenariosByCategory(matchId, "bowler_three_wkt", "Yes");
  }

  // Phase 5: Innings break — resolve first_innings_score
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

  // First innings
  results.first_innings_score = getInningsRuns(event.extra, firstKey);
  results.first_innings_wickets = filterBowlers(firstEntries).reduce(
    (s: number, b: any) => s + safeInt(b.W), 0
  );

  // Player of match
  if (event.event_man_of_match && event.event_man_of_match.trim() !== "") {
    results.player_of_match = event.event_man_of_match.trim();
  }

  // Total match stats
  if (secondKey) {
    const r1 = getInningsRuns(event.extra, firstKey) || 0;
    const r2 = getInningsRuns(event.extra, secondKey) || 0;
    const w1 = filterBowlers(firstEntries).reduce((s: number, b: any) => s + safeInt(b.W), 0);
    const w2 = filterBowlers(secondEntries).reduce((s: number, b: any) => s + safeInt(b.W), 0);
    results.total_match_runs = r1 + r2;
    results.total_match_wickets = w1 + w2;
  }

  const allBatsmen = [
    ...filterBatsmen(firstEntries),
    ...filterBatsmen(secondEntries),
  ];
  const allBowlers = [
    ...filterBowlers(firstEntries),
    ...filterBowlers(secondEntries),
  ];

  // Total sixes
  results.total_match_sixes = allBatsmen.reduce(
    (sum: number, b: any) => sum + safeInt(b["6s"]), 0
  );

  // Top scorer
  let topRuns = -1;
  let topScorerName = "";
  for (const b of allBatsmen) {
    const runs = safeInt(b.R);
    if (runs > topRuns) {
      topRuns = runs;
      topScorerName = b.player;
    }
  }
  if (topRuns > 0) {
    results.top_scorer = topScorerName;
    results.top_scorer_runs = topRuns;
  }

  // Most sixes player
  let mostSixes = 0;
  let mostSixesName = "";
  for (const b of allBatsmen) {
    const sixes = safeInt(b["6s"]);
    if (sixes > mostSixes) {
      mostSixes = sixes;
      mostSixesName = b.player;
    }
  }
  if (mostSixes > 0) {
    results.most_sixes_player = mostSixesName;
  }

  // Top wicket taker
  let topW = -1;
  let topBowlerName = "";
  for (const b of allBowlers) {
    const w = safeInt(b.W);
    if (w > topW) {
      topW = w;
      topBowlerName = b.player;
    }
  }
  if (topW > 0) {
    results.top_wicket_taker = topBowlerName;
    results.top_wicket_taker_wickets = topW;
  }

  // Booleans
  results.batsman_scored_fifty = allBatsmen.some((b: any) => safeInt(b.R) >= 50);
  results.bowler_took_three = allBowlers.some((b: any) => safeInt(b.W) >= 3);
  results.had_super_over = inningsKeys.length > 2;

  // Powerplay from ball-by-ball
  const ppScore = derivePowerplayScore(event.comments);
  if (ppScore !== null) results.powerplay_score = ppScore;

  // Powerplay wickets from fall-of-wickets
  const ppWickets = derivePowerplayWickets(event.wickets);
  if (ppWickets !== null) results.powerplay_wickets = ppWickets;

  // First wicket over
  const fwo = deriveFirstWicketOver(event.wickets);
  if (fwo !== null) results.first_wicket_over = fwo;

  return results;
}

// ── Resolve scenarios by category ───────────────────────────────
// Uses a DB function to resolve scenario + score predictions atomically.
// If the cron crashes, either all predictions for a scenario are scored or none.

async function resolveScenariosByCategory(
  matchId: number,
  category: string,
  correctAnswer: string | null
) {
  if (!correctAnswer) return;

  const { error } = await supabase.rpc("resolve_scenarios_by_category", {
    p_match_id: matchId,
    p_category: category,
    p_correct_answer: correctAnswer,
  });

  if (error) {
    console.error(`resolveScenariosByCategory failed: match=${matchId} cat=${category}`, error.message);
  }
}
