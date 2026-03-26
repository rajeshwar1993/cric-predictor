// Bragg — Match Cron Edge Function
// Runs every minute via pg_cron. Handles:
// 1. Upcoming → Live transition (fetch squad, auto-lock predictions)
// 2. Live match polling (scorecard → write snapshot → progressive resolution)
// 3. Completed → final resolution pass

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRICKET_API_KEY = Deno.env.get("CRICKET_API_KEY") || "";
const CRICKET_API_BASE = Deno.env.get("CRICKET_API_BASE_URL") || "https://api.cricapi.com/v1";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ──────────────────────────────────────────────
// Activation window: 2 PM IST to 1 AM IST
// = 08:30 UTC to 19:30 UTC
// ──────────────────────────────────────────────
function isInMatchWindow(): boolean {
  const now = new Date();
  const utcDecimal = now.getUTCHours() + now.getUTCMinutes() / 60;
  // Active: 08:30 UTC to 19:30 UTC (2 PM IST to 1 AM IST)
  return !(utcDecimal >= 19.5 || utcDecimal < 8.5);
}

async function hasLiveMatches(): Promise<boolean> {
  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("status", "live");
  return (count || 0) > 0;
}

// ──────────────────────────────────────────────
// CricketData.org API helpers
// ──────────────────────────────────────────────
async function fetchCricketApi<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  if (!CRICKET_API_KEY) return null;

  const url = new URL(`${CRICKET_API_BASE}${endpoint}`);
  url.searchParams.set("apikey", CRICKET_API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== "success") return null;
    return json.data as T;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────
// Team name → code mapping
// ──────────────────────────────────────────────
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

function toCode(name: string | undefined): string | null {
  if (!name) return null;
  return TEAM_NAME_TO_CODE[name] || name;
}

// ──────────────────────────────────────────────
// Main handler
// ──────────────────────────────────────────────
Deno.serve(async () => {
  // Run inside match window OR if any match is currently live (handles rain delays)
  if (!isInMatchWindow() && !(await hasLiveMatches())) {
    return new Response(JSON.stringify({ status: "inactive", reason: "outside match hours" }));
  }

  // Get today's matches that need processing
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
    // Skip if polled within last 50 seconds (prevent overlap)
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

// ──────────────────────────────────────────────
// Process UPCOMING match
// ──────────────────────────────────────────────
async function processUpcoming(match: any) {
  const info = await fetchCricketApi<any>("/match_info", { id: match.api_match_id });
  if (!info) return;

  // Check if match has started
  if (info.matchStarted) {
    // Transition to LIVE
    await supabase
      .from("matches")
      .update({
        status: "live",
        toss_winner: toCode(info.tossWinner),
        last_polled_at: new Date().toISOString(),
      })
      .eq("id", match.id);

    // Auto-lock predictions for all groups
    await supabase
      .from("match_group_settings")
      .update({ is_locked: true })
      .eq("match_id", match.id);

    // Resolve toss_winner scenarios immediately
    await resolveScenariosByCategory(match.id, "toss_winner", toCode(info.tossWinner));

    return;
  }

  // Update last_polled_at
  await supabase
    .from("matches")
    .update({ last_polled_at: new Date().toISOString() })
    .eq("id", match.id);
}

// ──────────────────────────────────────────────
// Process LIVE match
// ──────────────────────────────────────────────
async function processLive(match: any) {
  const scorecard = await fetchCricketApi<any>("/match_scorecard", { id: match.api_match_id });
  if (!scorecard) return;

  // Write live snapshot
  const snapshot: Record<string, any> = {
    last_polled_at: new Date().toISOString(),
    live_scorecard_json: scorecard,
  };

  if (scorecard.score && scorecard.score.length > 0) {
    snapshot.current_score_a = `${scorecard.score[0].r}/${scorecard.score[0].w}`;
    snapshot.current_overs_a = scorecard.score[0].o;
    if (scorecard.score.length > 1) {
      snapshot.current_score_b = `${scorecard.score[1].r}/${scorecard.score[1].w}`;
      snapshot.current_overs_b = scorecard.score[1].o;
    }
  }

  // Check if match completed
  if (scorecard.matchEnded) {
    snapshot.status = "completed";
    snapshot.match_winner = toCode(scorecard.matchWinner);
    snapshot.resolved_at = new Date().toISOString();

    // Parse full results
    if (scorecard.scorecard && scorecard.scorecard.length > 0) {
      Object.assign(snapshot, parseFullResults(scorecard));
    }

    await supabase.from("matches").update(snapshot).eq("id", match.id);

    // Run full resolution
    await supabase.rpc("resolve_match_predictions", { p_match_id: match.id });
    return;
  }

  // Still live — write snapshot and do progressive resolution
  await supabase.from("matches").update(snapshot).eq("id", match.id);

  // Progressive resolution based on available data
  await progressiveResolve(match.id, scorecard);
}

// ──────────────────────────────────────────────
// Progressive scenario resolution
// ──────────────────────────────────────────────
async function progressiveResolve(matchId: number, scorecard: any) {
  if (!scorecard.scorecard || scorecard.scorecard.length === 0) return;

  const firstInnings = scorecard.scorecard[0];
  const secondInnings = scorecard.scorecard[1];

  // Phase 1: Toss (already handled in processUpcoming)

  // Phase 2: First wicket over
  if (firstInnings.fow && firstInnings.fow.length > 0) {
    const firstWicketOver = Math.ceil(firstInnings.fow[0].overs_at_dismissal);
    let bracket: string;
    if (firstWicketOver <= 2) bracket = "1-2";
    else if (firstWicketOver <= 4) bracket = "3-4";
    else if (firstWicketOver <= 6) bracket = "5-6";
    else bracket = "7+";
    await resolveScenariosByCategory(matchId, "first_wicket_over", bracket);
  }

  // Phase 3: Powerplay (after 6 overs in first innings)
  if (firstInnings.totals.o >= 6 || (firstInnings.totals.O && firstInnings.totals.O >= 6)) {
    // Estimate powerplay from FOW data if available
    const ppOvers = 6;
    if (firstInnings.fow) {
      const ppWickets = firstInnings.fow.filter(
        (f: any) => f.overs_at_dismissal <= 6
      ).length;
      await resolveScenariosByCategory(matchId, "powerplay_wickets",
        ppWickets >= 3 ? "3+" : String(ppWickets)
      );
    }
  }

  // Phase 4: Mid-match milestones
  const allBatting = [
    ...firstInnings.batting,
    ...(secondInnings?.batting || []),
  ];
  const allBowling = [
    ...firstInnings.bowling,
    ...(secondInnings?.bowling || []),
  ];

  // Batsman 50+
  const anyFifty = allBatting.some((b: any) => b.r >= 50);
  if (anyFifty) {
    await resolveScenariosByCategory(matchId, "batsman_fifty", "Yes");
  }

  // Bowler 3+ wickets
  const anyThreeWickets = allBowling.some((b: any) => b.w >= 3);
  if (anyThreeWickets) {
    await resolveScenariosByCategory(matchId, "bowler_three_wkt", "Yes");
  }

  // Phase 5: Innings break — only resolve when first innings is actually complete
  // (all out or 20 overs bowled, confirmed by second innings having started)
  const firstInningsOvers = firstInnings.totals.o || firstInnings.totals.O || 0;
  const firstInningsComplete = secondInnings && (firstInningsOvers >= 20 || (firstInnings.totals.w || firstInnings.totals.W || 0) >= 10);
  if (firstInningsComplete) {
    const firstInningsScore = firstInnings.totals.r || firstInnings.totals.R;
    if (firstInningsScore != null && firstInningsScore > 0) {
      let bracket: string;
      if (firstInningsScore < 150) bracket = "<150";
      else if (firstInningsScore >= 190) bracket = "190+";
      else if (firstInningsScore >= 170) bracket = "170-189";
      else bracket = "150-169";
      await resolveScenariosByCategory(matchId, "first_innings_score", bracket);
    }
  }
}

// ──────────────────────────────────────────────
// Parse full results from completed scorecard
// ──────────────────────────────────────────────
function parseFullResults(scorecard: any): Record<string, any> {
  const results: Record<string, any> = {};
  const allInnings = scorecard.scorecard || [];

  if (allInnings.length === 0) return results;

  const firstInnings = allInnings[0];
  const secondInnings = allInnings[1];

  results.first_innings_score = firstInnings.totals.r || firstInnings.totals.R;
  results.first_innings_wickets = firstInnings.totals.w || firstInnings.totals.W;

  if (secondInnings) {
    const r1 = firstInnings.totals.r || firstInnings.totals.R || 0;
    const r2 = secondInnings.totals.r || secondInnings.totals.R || 0;
    const w1 = firstInnings.totals.w || firstInnings.totals.W || 0;
    const w2 = secondInnings.totals.w || secondInnings.totals.W || 0;
    results.total_match_runs = r1 + r2;
    results.total_match_wickets = w1 + w2;
  }

  const allBatting = [
    ...firstInnings.batting,
    ...(secondInnings?.batting || []),
  ];
  const allBowling = [
    ...firstInnings.bowling,
    ...(secondInnings?.bowling || []),
  ];

  // Total sixes
  results.total_match_sixes = allBatting.reduce((sum: number, b: any) => sum + (b["6s"] || 0), 0);

  // Top scorer
  const topBatter = allBatting.reduce((top: any, b: any) => (b.r > (top?.r || 0) ? b : top), null);
  if (topBatter) {
    results.top_scorer = topBatter.batsman.name;
    results.top_scorer_runs = topBatter.r;
  }

  // Top wicket taker
  const topBowler = allBowling.reduce((top: any, b: any) => (b.w > (top?.w || 0) ? b : top), null);
  if (topBowler) {
    results.top_wicket_taker = topBowler.bowler.name;
    results.top_wicket_taker_wickets = topBowler.w;
  }

  // Most sixes player
  const mostSixes = allBatting.reduce((top: any, b: any) => ((b["6s"] || 0) > (top?.["6s"] || 0) ? b : top), null);
  if (mostSixes && mostSixes["6s"] > 0) {
    results.most_sixes_player = mostSixes.batsman.name;
  }

  // Booleans
  results.batsman_scored_fifty = allBatting.some((b: any) => b.r >= 50);
  results.bowler_took_three = allBowling.some((b: any) => b.w >= 3);
  results.had_super_over = allInnings.length > 2;

  // Powerplay from FOW
  if (firstInnings.fow) {
    const ppWickets = firstInnings.fow.filter((f: any) => f.overs_at_dismissal <= 6).length;
    results.powerplay_wickets = ppWickets;
  }

  // First wicket over
  if (firstInnings.fow && firstInnings.fow.length > 0) {
    results.first_wicket_over = Math.ceil(firstInnings.fow[0].overs_at_dismissal);
  }

  return results;
}

// ──────────────────────────────────────────────
// Resolve scenarios by category
// ──────────────────────────────────────────────
async function resolveScenariosByCategory(
  matchId: number,
  category: string,
  correctAnswer: string | null
) {
  if (!correctAnswer) return;

  // Atomic update: only updates rows that are still unresolved (race-safe)
  const { data: resolved } = await supabase
    .from("scenarios")
    .update({ correct_answer: correctAnswer, is_resolved: true })
    .eq("match_id", matchId)
    .eq("system_category", category)
    .eq("is_resolved", false)
    .eq("is_removed", false)
    .select("id, points");

  if (!resolved || resolved.length === 0) return;

  // Score predictions for each resolved scenario
  for (const scenario of resolved) {
    await supabase
      .from("predictions")
      .update({ is_correct: true, points_earned: scenario.points })
      .eq("scenario_id", scenario.id)
      .eq("value", correctAnswer);

    await supabase
      .from("predictions")
      .update({ is_correct: false, points_earned: 0 })
      .eq("scenario_id", scenario.id)
      .neq("value", correctAnswer);
  }
}
