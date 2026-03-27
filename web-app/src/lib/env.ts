/**
 * Validated environment variables.
 * Throws at import time if a required variable is missing —
 * fail fast on startup instead of at runtime.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const env = {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),

  // App
  NEXT_PUBLIC_APP_URL: optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: optional("NEXT_PUBLIC_APP_NAME", "Bragg"),
  NEXT_PUBLIC_MOCK_MODE: process.env.NEXT_PUBLIC_MOCK_MODE === "true",

  // Server-only (may not be set in client bundles)
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  CRICKET_API_KEY: process.env.CRICKET_API_KEY || "",
  CRICKET_API_BASE_URL: optional(
    "CRICKET_API_BASE_URL",
    "https://apiv2.api-cricket.com/cricket/"
  ),
  CRICKET_API_LEAGUE_KEY: process.env.CRICKET_API_LEAGUE_KEY || "",
  ENABLE_DEBUG_LOGS: process.env.ENABLE_DEBUG_LOGS === "true",
} as const;
