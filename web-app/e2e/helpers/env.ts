import dotenv from "dotenv";
import path from "path";

/**
 * Determine the current test environment from the TEST_ENV env var.
 * Returns "staging" when TEST_ENV=staging, otherwise "local".
 */
export function getTestEnvName(): "local" | "staging" {
  const raw = process.env.TEST_ENV?.toLowerCase().trim();
  if (raw && raw !== "local" && raw !== "staging") {
    throw new Error(
      `Invalid TEST_ENV="${raw}". Use "local" or "staging".`
    );
  }
  return raw === "staging" ? "staging" : "local";
}

/**
 * Load the correct .env files based on the TEST_ENV environment variable.
 *
 * - **local** (default): Loads `web-app/e2e/.env.qa` (current behavior).
 * - **staging**: Loads `web-app/.env.staging` first (Supabase creds, API keys),
 *   then `web-app/e2e/.env.staging` with `override: true` so e2e-specific
 *   vars (QA_BASE_URL, email domain) win.
 */
export function loadTestEnv(): void {
  const envName = getTestEnvName();
  const e2eDir = path.resolve(__dirname, "..");
  const webAppDir = path.resolve(e2eDir, "..");

  if (envName === "staging") {
    // 1. App-level staging env (Supabase creds, API keys)
    dotenv.config({ path: path.join(webAppDir, ".env.staging") });
    // 2. E2E-specific staging overrides (QA_BASE_URL, email domain)
    dotenv.config({
      path: path.join(e2eDir, ".env.staging"),
      override: true,
    });
  } else {
    // Local/QA: single env file (existing behavior)
    dotenv.config({ path: path.join(e2eDir, ".env.qa") });
  }
}
