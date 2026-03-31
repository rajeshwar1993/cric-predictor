import { loadTestEnv, getTestEnvName } from "./helpers/env";

// Load environment before any other imports that might read env vars
loadTestEnv();

import fs from "fs";
import path from "path";
import { seedFullTestEnvironment, type TestEnvironment } from "./helpers/seed";
import { cleanupTestData, getAdminClient } from "./helpers/supabase-admin";

const STATE_FILE = path.join(__dirname, "reports", ".test-state.json");

async function globalSetup() {
  const envName = getTestEnvName();
  console.log(`\n🌍 Test environment: ${envName}`);

  // ── Sanity checks ──────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing required env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
    );
  }

  const baseUrl = process.env.QA_BASE_URL || "http://localhost:3000";
  console.log(`🔗 QA_BASE_URL: ${baseUrl}`);
  console.log(`🔗 Supabase URL: ${supabaseUrl}`);

  // Verify the app is reachable
  try {
    const res = await fetch(baseUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    console.log(`✅ App reachable (HTTP ${res.status})`);
  } catch (err) {
    throw new Error(
      `Cannot reach QA_BASE_URL (${baseUrl}): ${err instanceof Error ? err.message : err}`
    );
  }

  // Verify Supabase DB connectivity
  try {
    const sb = getAdminClient();
    const { error } = await sb.from("teams").select("code").limit(1);
    if (error) throw error;
    console.log("✅ Supabase DB connected");
  } catch (err) {
    throw new Error(
      `Supabase DB connectivity check failed: ${err instanceof Error ? err.message : err}`
    );
  }

  // ── Seed ───────────────────────────────────────────────────────
  console.log("\n🧹 Cleaning up any previous test data...");
  await cleanupTestData();

  console.log("🌱 Seeding test environment...");
  const env: TestEnvironment = await seedFullTestEnvironment();

  // Write state to file so test specs can read it
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(env, null, 2));

  console.log("✅ Test environment ready");
  console.log(`   Users: ${Object.keys(env.users).join(", ")}`);
  console.log(`   Group: ${env.group.name} (${env.group.id})`);
  console.log(`   Matches: ${env.matches.match1.id}, ${env.matches.match2.id}`);
  console.log("");
}

export default globalSetup;

/** Read the test state created by global setup. */
export function getTestState(): TestEnvironment {
  const raw = fs.readFileSync(STATE_FILE, "utf-8");
  return JSON.parse(raw);
}
