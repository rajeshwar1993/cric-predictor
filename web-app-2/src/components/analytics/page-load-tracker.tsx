'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics/client'
import { PAGE_LOAD_TIME } from '@/lib/analytics/events'

export function PageLoadTracker() {
  const pathname = usePathname()
  const startRef = useRef(0)

  useEffect(() => {
    if (startRef.current > 0) {
      const duration = Math.round(performance.now() - startRef.current)
      trackEvent(PAGE_LOAD_TIME, {
        page_path: pathname,
        duration_ms: duration,
      })
    }
    startRef.current = performance.now()
  }, [pathname])

  return null
}
