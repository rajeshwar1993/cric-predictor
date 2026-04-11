import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    projects: [
      // Unit / integration tests — runs in jsdom (fast, no browser needed)
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/**/*.stories.{ts,tsx}', 'e2e/**'],
          setupFiles: [path.join(dirname, 'vitest.setup.ts')],
        },
        resolve: {
          alias: { '@': path.join(dirname, 'src') },
        },
      },
      // Storybook tests — runs stories in a real browser via Playwright
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(dirname, '.storybook') })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
        resolve: {
          alias: {
            '@': path.join(dirname, 'src'),
            // `posthog-node` crashes at module load in chromium (Error.stack
            // parsing differs from Node). Stories transitively import it via
            // server actions → @/lib/analytics/server. Stub it out for the
            // storybook project only; unit tests already mock the server
            // analytics module per-test.
            'posthog-node': path.join(dirname, '.storybook/posthog-node-stub.ts'),
            // `next/web-vitals` re-exports a CJS bundle that calls `__dirname`
            // at module load, which is undefined in ESM browser mode. Next's
            // compiler handles this in production but vitest-browser doesn't.
            'next/web-vitals': path.join(dirname, '.storybook/next-web-vitals-stub.ts'),
          },
        },
      },
    ],
  },
})
