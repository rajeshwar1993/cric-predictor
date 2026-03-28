// Shared dependencies and utilities for all Bragg Edge Functions.
// Both sync-data and match-live import from here to avoid duplication.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Environment ─────────────────────────────────────────────────

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
export const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
export const CRICKET_API_KEY = Deno.env.get("CRICKET_API_KEY") || "";
export const CRICKET_API_BASE =
  Deno.env.get("CRICKET_API_BASE_URL") || "https://apiv2.api-cricket.com/cricket/";
export const CRICKET_API_LEAGUE_KEY = Deno.env.get("CRICKET_API_LEAGUE_KEY") || "";

export function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ── Auth guard ──────────────────────────────────────────────────

/**
 * Auth is handled at two levels:
 * 1. Supabase gateway — verifies JWT (when deployed without --no-verify-jwt)
 * 2. This function — additional check for service role (optional, defense-in-depth)
 *
 * For pg_cron: service role key is sent as Bearer token → passes both checks.
 * For manual invocation: pass service role or anon key as Bearer token.
 * Deploy with --no-verify-jwt for open access (testing only).
 */
export function verifyAuth(_req: Request): Response | null {
  // Gateway JWT verification handles auth.
  // If you need stricter checks, uncomment:
  // const authHeader = req.headers.get("Authorization");
  // if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  return null;
}

// ── Cricket API client ──────────────────────────────────────────

export async function fetchCricketApi(
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
    if (!res.ok) {
      console.error(`Cricket API HTTP ${res.status}: ${method}`, await res.text().catch(() => ""));
      return null;
    }
    const json = await res.json();
    if (json.success !== 1) {
      console.error(`Cricket API error: ${method}`, JSON.stringify(json).slice(0, 200));
      return null;
    }
    return json.result as any[];
  } catch (err) {
    console.error(`Cricket API fetch failed: ${method}`, String(err));
    return null;
  }
}

// ── Team name mapping ───────────────────────────────────────────

export const TEAM_NAME_TO_CODE: Record<string, string> = {
  "Chennai Super Kings": "CSK",
  "Mumbai Indians": "MI",
  "Royal Challengers Bangalore": "RCB",
  "Royal Challengers Bengaluru": "RCB",
  "Royal Challengers Bangalore ": "RCB", // trailing space variant
  "Kolkata Knight Riders": "KKR",
  "Delhi Capitals": "DC",
  "Delhi Daredevils": "DC", // old name (pre-2019)
  "Sunrisers Hyderabad": "SRH",
  "Rajasthan Royals": "RR",
  "Punjab Kings": "PBKS",
  "Kings XI Punjab": "PBKS", // old name (pre-2021)
  "Gujarat Titans": "GT",
  "Lucknow Super Giants": "LSG",
};

export function toCode(name: string | undefined | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  const code = TEAM_NAME_TO_CODE[trimmed];
  if (!code) {
    console.warn(`Unknown team name from API: "${trimmed}"`);
    return null;
  }
  return code;
}

// ── Input sanitization ──────────────────────────────────────────

const SAFE_PLAYER_NAME = /^[a-zA-Z0-9\s.\-'()]+$/;
const MAX_PLAYER_NAME_LENGTH = 100;

export function safeName(name: string | undefined | null): string | null {
  if (!name) return null;
  const trimmed = name.trim().slice(0, MAX_PLAYER_NAME_LENGTH);
  if (trimmed.length === 0) return null;
  if (!SAFE_PLAYER_NAME.test(trimmed)) {
    console.warn(`Invalid player name from API: "${trimmed.slice(0, 50)}"`);
    return null;
  }
  return trimmed;
}

/**
 * Extract team name from an innings key.
 * e.g., "Sunrisers Hyderabad 1 INN" → "Sunrisers Hyderabad"
 */
export function teamNameFromInningsKey(key: string): string {
  return key.replace(/\s+\d+\s+INN$/i, "").trim();
}

// ── Parsing utilities ───────────────────────────────────────────

export function safeInt(val: string | undefined | null): number {
  const n = parseInt(val ?? "0", 10);
  return Number.isNaN(n) ? 0 : n;
}

export function safeFloat(val: string | undefined | null): number {
  const n = parseFloat(val ?? "0");
  return Number.isNaN(n) ? 0 : n;
}

export function getFirstInningsKey(obj: Record<string, unknown> | undefined | null): string | null {
  if (!obj) return null;
  const keys = Object.keys(obj);
  return keys.length > 0 ? keys[0] : null;
}

export function getInningsKeys(obj: Record<string, unknown> | undefined | null): string[] {
  if (!obj) return [];
  return Object.keys(obj);
}

export function filterBatsmen(entries: any[]): any[] {
  return entries.filter((e) => e.type === "Batsman");
}

export function filterBowlers(entries: any[]): any[] {
  return entries.filter((e) => e.type === "Bowler");
}

export function parseTossWinner(eventToss: string | undefined | null): string | null {
  if (!eventToss || eventToss.trim() === "") return null;
  for (const delim of [", elected to", ", chose to", ", opted to"]) {
    const idx = eventToss.indexOf(delim);
    if (idx > 0) return eventToss.slice(0, idx).trim();
  }
  const commaIdx = eventToss.indexOf(",");
  if (commaIdx > 0) return eventToss.slice(0, commaIdx).trim();
  return null;
}

export function parseMatchWinner(eventStatusInfo: string | undefined | null): string | null {
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

export function parseInningsTotal(total: string | undefined | null): { runs: number; overs: number } | null {
  if (!total || total.trim() === "") return null;
  const match = total.match(/(\d+)\s*\(\s*([\d.]+)\s*\)/);
  if (!match) return null;
  return { runs: parseInt(match[1], 10), overs: parseFloat(match[2]) };
}

export function parseOverNumber(fall: string | undefined | null): number | null {
  if (!fall || fall.trim() === "") return null;
  const cleaned = fall.replace(/\s*ov\s*$/i, "").trim();
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

export function derivePowerplayScore(comments: Record<string, any[]> | undefined | null): number | null {
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

export function derivePowerplayWickets(wickets: Record<string, any[]> | undefined | null): number | null {
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

export function deriveFirstWicketOver(wickets: Record<string, any[]> | undefined | null): number | null {
  if (!wickets) return null;
  const firstKey = getFirstInningsKey(wickets);
  if (!firstKey) return null;
  const fow = wickets[firstKey];
  if (!fow || fow.length === 0) return null;
  const over = parseOverNumber(fow[0].fall);
  if (over === null) return null;
  return Math.ceil(over);
}

export function getInningsRuns(extra: Record<string, any> | undefined | null, key: string): number | null {
  if (!extra || !extra[key]) return null;
  const parsed = parseInningsTotal(extra[key].total);
  return parsed ? parsed.runs : null;
}

export function getInningsOvers(extra: Record<string, any> | undefined | null, key: string): number | null {
  if (!extra || !extra[key]) return null;
  const parsed = parseInningsTotal(extra[key].total);
  return parsed ? parsed.overs : null;
}
