'use client'

import { useReportWebVitals } from 'next/web-vitals'

import { trackEvent } from '@/lib/analytics/client'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'

/**
 * Infer the metric callback shape directly from `useReportWebVitals`.
 *
 * Next.js's public types reference an internal `next/dist/compiled/web-vitals`
 * module that ships no `.d.ts` file, so we cannot import the canonical
 * `Metric` type. Reaching for the parameter type via `Parameters<>` is the
 * type-safe equivalent — if Next ever changes the callback signature this
 * compiles against the new shape automatically.
 */
type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0]
type WebVitalMetric = Parameters<ReportWebVitalsCallback>[0]

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
    // Defensive runtime guard. The inferred Metric type narrows the static
    // surface but the callback runs on whatever the bundled web-vitals lib
    // produces at runtime, so we sanity-check the two fields we forward
    // before sending. A malformed metric quietly drops instead of polluting
    // PostHog with NaNs / undefined names.
    if (typeof metric.value !== 'number' || typeof metric.name !== 'string') {
      return
    }

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
