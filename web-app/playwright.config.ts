import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

// Load E2E env vars from .env.e2e (ignored by git)
dotenv.config({ path: path.resolve(__dirname, '.env.e2e') })

/**
 * Playwright E2E test configuration.
 *
 * Runs against the **staging** environment (https://bragg-staging.vercel.app/).
 * No local dev server — tests hit staging directly.
 *
 * Suite ordering: Numbered spec files (01-onboarding → 10-cleanup) run
 * sequentially because each suite builds on state from the previous one.
 *
 * @see docs/e2e-test-plan.md
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',

  // Suites run sequentially (state-dependent); individual tests within a
  // suite may opt into parallel via test.describe.configure({ mode: 'parallel' }).
  fullyParallel: false,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Sequential suite execution

  reporter: [
    ['html', { outputFolder: './e2e/test-results/html-report' }],
    ['list'],
  ],

  // Global setup creates test users; teardown deletes them.
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://bragg-staging.vercel.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },

  // Per-test timeout — staging can be slow
  timeout: 60_000,
  expect: { timeout: 15_000 },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 14'] },
    },
  ],

  // No webServer block — tests hit staging directly.
})
