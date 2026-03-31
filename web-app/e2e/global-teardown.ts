import { loadTestEnv } from "./helpers/env";

// Load environment before any other imports that might read env vars
loadTestEnv();

import { cleanupTestData } from "./helpers/supabase-admin";

async function globalTeardown() {
  if (process.env.KEEP_TEST_DATA === "true") {
    console.log(
      "\n⏭️  KEEP_TEST_DATA=true — skipping cleanup. Remove manually when done.\n"
    );
    return;
  }

  console.log("\n🧹 Cleaning up test data...");
  await cleanupTestData();
  console.log("✅ Test data cleaned up\n");
}

export default globalTeardown;
