import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { seedFullTestEnvironment, type TestEnvironment } from "./helpers/seed";
import { cleanupTestData } from "./helpers/supabase-admin";

const STATE_FILE = path.join(__dirname, "reports", ".test-state.json");

async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, ".env.qa") });

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
