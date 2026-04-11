import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { StorybookConfig } from '@storybook/nextjs-vite'

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
    '@chromatic-com/storybook',
  ],
  framework: '@storybook/nextjs-vite',
  staticDirs: ['../public'],
  /**
   * Storybook runs stories in a browser environment. Two server-only
   * dependencies crash at module load when bundled for the browser:
   *
   * 1. `posthog-node` parses `Error.stack` at module load (its error-tracking
   *    modifier expects Node's v8 stack format) and throws
   *    `Cannot read properties of undefined (reading '1')` in chromium.
   *    Stories transitively import it via server actions → @/lib/analytics/server.
   *
   * 2. `next/web-vitals` re-exports a CJS bundle that calls `__dirname`
   *    at module load, which is undefined in ESM browser mode. Next's
   *    own compiler handles this in production but Storybook's vite build
   *    does not.
   *
   * In production Next.js strips `'use server'` files from the client bundle
   * so neither ships to the browser. Storybook has no RSC compiler so we
   * stub both modules with browser-safe no-ops for this config only. The
   * same aliases are mirrored in `vitest.config.ts` for the storybook
   * vitest project.
   */
  viteFinal: async (cfg) => {
    cfg.resolve = cfg.resolve ?? {}
    cfg.resolve.alias = {
      ...(cfg.resolve.alias as Record<string, string> | undefined),
      'posthog-node': path.join(dirname, 'posthog-node-stub.ts'),
      'next/web-vitals': path.join(dirname, 'next-web-vitals-stub.ts'),
    }
    cfg.optimizeDeps = cfg.optimizeDeps ?? {}
    cfg.optimizeDeps.exclude = [
      ...(cfg.optimizeDeps.exclude ?? []),
      'posthog-node',
      'next/web-vitals',
    ]
    return cfg
  },
}

export default config
