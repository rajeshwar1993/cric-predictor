'use client'

import { useReportWebVitals } from 'next/web-vitals'
import { useCallback } from 'react'
import { trackEvent } from '@/lib/analytics/client'
import { WEB_VITALS_CLS, WEB_VITALS_INP, WEB_VITALS_LCP } from '@/lib/analytics/events'

const METRIC_EVENT_MAP: Record<string, string> = {
  LCP: WEB_VITALS_LCP,
  INP: WEB_VITALS_INP,
  CLS: WEB_VITALS_CLS,
} as const

export function WebVitalsReporter() {
  useReportWebVitals(
    useCallback((metric: { name: string; value: number; rating?: string; id: string }) => {
      const eventName = METRIC_EVENT_MAP[metric.name]
      if (eventName !== undefined) {
        trackEvent(eventName, {
          metric_value: metric.value,
          metric_rating: metric.rating,
          metric_id: metric.id,
        })
      }
    }, []),
  )

  return null
}
