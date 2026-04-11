'use client'

import { useReportWebVitals } from 'next/web-vitals'

import { trackEvent } from '@/lib/analytics/client'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'

/**
 * Shape of the metric callback payload delivered by `useReportWebVitals`.
 *
 * Next.js re-exports the `Metric` type from the bundled `web-vitals`
 * package under `next/dist/compiled/web-vitals`, but there are no
 * shipped type declarations for that module — so we redeclare the
 * subset of fields we depend on here. Keeping the shape local avoids
 * reaching into `next/dist/*` (which is not a stable public API).
 *
 * @see https://github.com/GoogleChrome/web-vitals#metric
 */
interface WebVitalMetric {
  name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  id: string
}

/**
 * Internal hook wrapper that registers the `useReportWebVitals`
 * callback when the subscriber is active.
 *
 * Hooks may not be called conditionally, so we split the production
 * gate into a dedicated subtree. The parent component decides at
 * render time whether to mount this subscriber at all.
 */
function WebVitalsSubscriber() {
  useReportWebVitals((metric: WebVitalMetric) => {
    trackEvent(ANALYTICS_EVENTS.WEB_VITALS, {
      metric_name: metric.name,
      metric_value: metric.value,
      metric_rating: metric.rating,
      metric_id: metric.id,
      page:
        typeof window !== 'undefined' ? window.location.pathname : null,
    })
  })

  return null
}

/**
 * WebVitalsReporter — forwards Core Web Vitals (LCP, INP, CLS, etc.)
 * from the browser to PostHog via our existing `trackEvent` helper.
 *
 * ## Behaviour
 * - In **production** we mount a hook subscriber that fires the
 *   `web_vitals` analytics event on every reported metric.
 * - In every other environment (`development`, `test`) we render
 *   nothing and do NOT subscribe. Dev web-vitals numbers are not
 *   representative of production performance, and emitting them
 *   would pollute our PostHog datasets.
 *
 * Renders `null`; there is no visual output. Must be mounted
 * somewhere inside the PostHog provider tree so the capture call
 * reaches an initialised client.
 *
 * @see docs/stories/PERF-002-web-vitals-seo.md
 */
export function WebVitalsReporter() {
  if (process.env.NODE_ENV !== 'production') {
    return null
  }

  return <WebVitalsSubscriber />
}
