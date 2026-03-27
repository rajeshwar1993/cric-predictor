import dotenv from "dotenv";
import path from "path";
import { cleanupTestData } from "./helpers/supabase-admin";

async function globalTeardown() {
  dotenv.config({ path: path.resolve(__dirname, ".env.qa") });

  console.log("\n🧹 Cleaning up test data...");
  await cleanupTestData();
  console.log("✅ Test data cleaned up\n");
}

export default globalTeardown;
