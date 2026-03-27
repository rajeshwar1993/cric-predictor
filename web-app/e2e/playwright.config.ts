import { defineConfig } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.qa") });

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 1,
  workers: 1, // Sequential — tests share DB state
  fullyParallel: false,
  use: {
    baseURL: process.env.QA_BASE_URL || "http://localhost:3000",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  outputDir: "./reports/results",
  globalSetup: require.resolve("./global-setup"),
  globalTeardown: require.resolve("./global-teardown"),
  reporter: [
    ["list"],
    ["html", { outputFolder: "./reports/html", open: "never" }],
    [path.resolve(__dirname, "./helpers/failure-logger.ts")],
  ],
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
