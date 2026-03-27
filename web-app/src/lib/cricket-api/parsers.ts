import type {
  ScorecardEntry,
  CommentEntry,
  WicketEntry,
  ExtraEntry,
} from "@/types/cricket-api";

// ── Safe type coercion ──────────────────────────────────────────

/** Parse a string to integer, returning 0 for null/undefined/NaN. */
export function safeInt(val: string | undefined | null): number {
  const n = parseInt(val ?? "0", 10);
  return Number.isNaN(n) ? 0 : n;
}

/** Parse a string to float, returning 0 for null/undefined/NaN. */
export function safeFloat(val: string | undefined | null): number {
  const n = parseFloat(val ?? "0");
  return Number.isNaN(n) ? 0 : n;
}

// ── Scorecard entry filters ─────────────────────────────────────

export function filterBatsmen(entries: ScorecardEntry[]): ScorecardEntry[] {
  return entries.filter((e) => e.type === "Batsman");
}

export function filterBowlers(entries: ScorecardEntry[]): ScorecardEntry[] {
  return entries.filter((e) => e.type === "Bowler");
}

// ── Innings key helpers ─────────────────────────────────────────

/** Return the first key of a Record, or null if empty. */
export function getFirstInningsKey(
  obj: Record<string, unknown> | undefined | null
): string | null {
  if (!obj) return null;
  const keys = Object.keys(obj);
  return keys.length > 0 ? keys[0] : null;
}

/** Return all innings keys of a Record. */
export function getInningsKeys(
  obj: Record<string, unknown> | undefined | null
): string[] {
  if (!obj) return [];
  return Object.keys(obj);
}

/**
 * Extract the team name from an innings key.
 * e.g., "Royal Challengers Bengaluru 1 INN" → "Royal Challengers Bengaluru"
 */
export function teamNameFromInningsKey(key: string): string {
  return key.replace(/\s+\d+\s+INN$/i, "").trim();
}

// ── String parsers ──────────────────────────────────────────────

/**
 * Parse toss winner from API sentence.
 * e.g., "Royal Challengers Bengaluru, elected to bat first" → "Royal Challengers Bengaluru"
 */
export function parseTossWinner(eventToss: string | undefined | null): string | null {
  if (!eventToss || eventToss.trim() === "") return null;

  // Try common delimiters: ", elected to", ", chose to", ", opted to"
  for (const delim of [", elected to", ", chose to", ", opted to"]) {
    const idx = eventToss.indexOf(delim);
    if (idx > 0) return eventToss.slice(0, idx).trim();
  }

  // Fallback: split on first comma
  const commaIdx = eventToss.indexOf(",");
  if (commaIdx > 0) return eventToss.slice(0, commaIdx).trim();

  return null;
}

/**
 * Parse match winner from API status info string.
 * e.g., "RCB won by 5 wickets (with 22 balls remaining)" → "RCB"
 */
export function parseMatchWinner(
  eventStatusInfo: string | undefined | null
): string | null {
  if (!eventStatusInfo || eventStatusInfo.trim() === "") return null;

  const lower = eventStatusInfo.toLowerCase();
  if (
    lower.includes("no result") ||
    lower.includes("abandoned") ||
    lower.includes("cancelled")
  ) {
    return null;
  }

  // Pattern: "{Team} won by ..."
  const wonIdx = eventStatusInfo.indexOf(" won by");
  if (wonIdx > 0) return eventStatusInfo.slice(0, wonIdx).trim();

  // Pattern: "Match tied" with super over info — e.g., "Match tied (TeamA won Super Over)"
  const superOverMatch = eventStatusInfo.match(
    /\((.+?)\s+won\s+(?:the\s+)?[Ss]uper\s+[Oo]ver\)/
  );
  if (superOverMatch) return superOverMatch[1].trim();

  return null;
}

/**
 * Parse innings total string into runs and overs.
 * e.g., "185 ( 20 )" → { runs: 185, overs: 20 }
 * e.g., "142 ( 18.3 )" → { runs: 142, overs: 18.3 }
 */
export function parseInningsTotal(
  total: string | undefined | null
): { runs: number; overs: number } | null {
  if (!total || total.trim() === "") return null;

  const match = total.match(/(\d+)\s*\(\s*([\d.]+)\s*\)/);
  if (!match) return null;

  return {
    runs: parseInt(match[1], 10),
    overs: parseFloat(match[2]),
  };
}

/**
 * Parse over number from fall-of-wicket string.
 * e.g., "3.4 ov" → 3.4
 * e.g., "15.6" → 15.6
 */
export function parseOverNumber(fall: string | undefined | null): number | null {
  if (!fall || fall.trim() === "") return null;
  const cleaned = fall.replace(/\s*ov\s*$/i, "").trim();
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

// ── Derived data ────────────────────────────────────────────────

/**
 * Derive powerplay score (first 6 overs) from ball-by-ball comments.
 * Sums runs for all deliveries in the first innings where overs ≤ 6.0.
 */
export function derivePowerplayScore(
  comments: Record<string, CommentEntry[]> | undefined | null
): number | null {
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

/**
 * Derive powerplay wickets from fall-of-wicket data.
 * Counts first innings wickets that fell at or before over 6.0.
 */
export function derivePowerplayWickets(
  wickets: Record<string, WicketEntry[]> | undefined | null
): number | null {
  if (!wickets) return null;
  const firstKey = getFirstInningsKey(wickets);
  if (!firstKey) return null;

  const fow = wickets[firstKey];
  if (!fow || fow.length === 0) return 0;

  return fow.filter((w) => {
    const over = parseOverNumber(w.fall);
    return over !== null && over <= 6.0;
  }).length;
}

/**
 * Derive the over in which the first wicket of the match fell.
 * Returns the ceiling (e.g., "3.4 ov" → over 4).
 */
export function deriveFirstWicketOver(
  wickets: Record<string, WicketEntry[]> | undefined | null
): number | null {
  if (!wickets) return null;
  const firstKey = getFirstInningsKey(wickets);
  if (!firstKey) return null;

  const fow = wickets[firstKey];
  if (!fow || fow.length === 0) return null;

  const over = parseOverNumber(fow[0].fall);
  if (over === null) return null;

  return Math.ceil(over);
}

/**
 * Get the total runs for an innings from the extra object.
 */
export function getInningsRuns(
  extra: Record<string, ExtraEntry> | undefined | null,
  inningsKey: string
): number | null {
  if (!extra || !extra[inningsKey]) return null;
  const parsed = parseInningsTotal(extra[inningsKey].total);
  return parsed ? parsed.runs : null;
}

/**
 * Get the total overs for an innings from the extra object.
 */
export function getInningsOvers(
  extra: Record<string, ExtraEntry> | undefined | null,
  inningsKey: string
): number | null {
  if (!extra || !extra[inningsKey]) return null;
  const parsed = parseInningsTotal(extra[inningsKey].total);
  return parsed ? parsed.overs : null;
}
