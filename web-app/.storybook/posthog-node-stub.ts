/**
 * Browser-safe stub for `posthog-node`.
 *
 * `posthog-node` parses `Error.stack` at module load (via
 * `createGetModuleFromFilename` in its error-tracking modifiers) and crashes
 * in a chromium environment where the stack format differs from Node's. In
 * production, Next.js strips `'use server'` files from the client bundle so
 * this never ships — but `vitest`'s browser mode has no RSC compiler and
 * bundles every transitive import of a story, including the server action
 * files that import `@/lib/analytics/server`.
 *
 * This stub is aliased to `posthog-node` ONLY for the `storybook` vitest
 * project (see `vitest.config.ts`). Stories don't actually exercise server
 * analytics — any call made through this stub is a silent no-op.
 *
 * The surface covers exactly the PostHog-node API that `server.ts` uses:
 * `new PostHog(key, options)`, `client.capture(...)`, `client.identify(...)`,
 * `client.flush()`. Extend here if another method is added to `server.ts`.
 */

export class PostHog {
  constructor(_key: string, _options?: Record<string, unknown>) {}

  capture(_payload: Record<string, unknown>): void {}

  identify(_payload: Record<string, unknown>): void {}

  async flush(): Promise<void> {}

  async shutdown(): Promise<void> {}
}
