import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for Bragg E2E smoke tests.
 *
 * Run all tests:       npm run e2e
 * Open UI runner:      npm run e2e:ui
 *
 * Base URL is configurable via PLAYWRIGHT_BASE_URL so the same suite
 * runs against local dev, STG, and production.
 */
export default defineConfig({
  testDir: './e2e',

  /* Maximum time a single test can run */
  timeout: 60_000,

  /* Expect() timeout */
  expect: {
    timeout: 10_000,
  },

  /* Run tests sequentially in CI for stability, parallel locally */
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,

  /* Fail the build on CI if test.only is left in source */
  forbidOnly: !!process.env.CI,

  /* Retry failed tests once in CI */
  retries: process.env.CI ? 1 : 0,

  /* Reporter: concise in CI, rich locally */
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    /* Base URL — override with PLAYWRIGHT_BASE_URL for STG/PROD */
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001',

    /* Capture trace on first retry for debugging flakes */
    trace: 'on-first-retry',

    /* Screenshot only on failure to keep artifacts lean */
    screenshot: 'only-on-failure',

    /* Record video only on failure */
    video: 'retain-on-failure',
  },

  projects: [
    /* ── Desktop browsers ────────────────────────────── */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* ── Mobile viewports ────────────────────────────── */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Start the dev server automatically when running locally */
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3001',
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
