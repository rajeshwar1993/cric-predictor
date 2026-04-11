/**
 * Browser-safe stub for `next/web-vitals`.
 *
 * `next/web-vitals` re-exports a CJS bundle of the `web-vitals` package
 * that calls `__dirname` at module load, which is undefined in vitest's
 * ESM browser mode. In production Next's compiler handles CJS→ESM interop,
 * but vitest-browser doesn't. This stub is aliased to `next/web-vitals`
 * only for the `storybook` vitest project (see `vitest.config.ts`).
 *
 * The only consumer is `web-vitals-reporter.tsx`, which uses
 * `useReportWebVitals` as a side-effect hook. In Storybook we never
 * actually want the hook to fire, so the stub is a no-op.
 */

import type { ReactNode } from 'react'

type Metric = {
  name: string
  value: number
  id: string
  rating: 'good' | 'needs-improvement' | 'poor'
}

export function useReportWebVitals(_cb: (metric: Metric) => void): void {}

// `next/web-vitals` also re-exports this legacy API shape; include a
// minimal stub so any transitive import keeps resolving.
export function NextWebVitalsMetric(_: ReactNode): ReactNode {
  return null
}
