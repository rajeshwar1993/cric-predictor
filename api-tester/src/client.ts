import "dotenv/config";

const API_BASE = process.env.CRICKET_API_BASE_URL || "https://apiv2.api-cricket.com/cricket/";
const API_KEY = process.env.CRICKET_API_KEY || "";

if (!API_KEY) {
  console.error("❌ CRICKET_API_KEY is not set. Copy .env.example to .env and add your key.");
  process.exit(1);
}

export interface ApiResponse<T> {
  success: number;
  result: T;
}

/**
 * Call an api-cricket.com endpoint.
 * Returns the full JSON response (including wrapper) for inspection.
 */
export async function callApi<T = unknown>(
  method: string,
  params: Record<string, string> = {}
): Promise<{ raw: ApiResponse<T>; result: T; url: string }> {
  const url = new URL(API_BASE);
  url.searchParams.set("method", method);
  url.searchParams.set("APIkey", API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  // Build a safe URL for logging (mask API key)
  const safeUrl = url.toString().replace(API_KEY, "***");

  console.log(`  → ${method} ${safeUrl}`);

  const res = await fetch(url.toString());

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as ApiResponse<T>;

  if (json.success !== 1) {
    throw new Error(`API returned success=${json.success}: ${JSON.stringify(json).slice(0, 200)}`);
  }

  return { raw: json, result: json.result, url: safeUrl };
}

export function getLeagueKey(): string {
  return process.env.CRICKET_API_LEAGUE_KEY || "9785";
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
      shape[key] = `object {${Object.keys(value as object).slice(0, 5).join(", ")}${Object.keys(value as object).length > 5 ? ", ..." : ""}}`;
    } else {
      shape[key] = `${typeof value}: ${String(value).slice(0, 60)}`;
    }
  }
  return shape;
}
