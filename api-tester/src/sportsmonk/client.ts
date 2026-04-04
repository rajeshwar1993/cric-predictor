import "dotenv/config";

const API_BASE = process.env.SPORTSMONK_API_BASE_URL || "https://cricket.sportmonks.com/api/v2.0/";
const API_KEY = process.env.SPORTSMONK_API_KEY || "";
const IPL_LEAGUE_ID = process.env.SPORTSMONK_IPL_LEAGUE_ID || "1";

if (!API_KEY) {
  console.error("❌ SPORTSMONK_API_KEY is not set in .env");
  process.exit(1);
}

export interface SportmonkResponse<T = unknown> {
  data: T;
  links?: { first?: string; last?: string; prev?: string | null; next?: string | null };
  meta?: { current_page?: number; from?: number; last_page?: number; per_page?: number; to?: number; total?: number };
}

/**
 * Call a Sportmonks Cricket API endpoint.
 */
export async function callApi<T = unknown>(
  path: string,
  params: Record<string, string> = {}
): Promise<{ raw: SportmonkResponse<T>; data: T; url: string }> {
  const url = new URL(path, API_BASE);
  url.searchParams.set("api_token", API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const safeUrl = url.toString().replace(API_KEY, "***");
  console.log(`  → GET ${safeUrl}`);

  const res = await fetch(url.toString());

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 500)}`);
  }

  const json = (await res.json()) as SportmonkResponse<T>;

  return { raw: json, data: json.data, url: safeUrl };
}

export function getLeagueId(): string {
  return IPL_LEAGUE_ID;
}

/** Describe the shape of an object for the spec sheet. */
export function describeShape(obj: unknown, depth = 0): Record<string, string> {
  if (obj === null || obj === undefined) return { "(value)": String(obj) };
  if (Array.isArray(obj)) {
    if (obj.length === 0) return { "(array)": "empty []" };
    return describeShape(obj[0], depth);
  }
  if (typeof obj !== "object") return { "(value)": `${typeof obj}: ${String(obj).slice(0, 80)}` };

  const shape: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value === null || value === undefined) {
      shape[key] = "null";
    } else if (Array.isArray(value)) {
      shape[key] = value.length === 0 ? "array (empty)" : `array[${value.length}] of ${typeof value[0]}`;
    } else if (typeof value === "object") {
      shape[key] = `object {${Object.keys(value as object).slice(0, 6).join(", ")}${Object.keys(value as object).length > 6 ? ", ..." : ""}}`;
    } else {
      shape[key] = `${typeof value}: ${String(value).slice(0, 60)}`;
    }
  }
  return shape;
}
