'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import { initGlobalErrorHandlers } from '@/lib/analytics/error-handler'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env['NEXT_PUBLIC_POSTHOG_KEY']
    const host = process.env['NEXT_PUBLIC_POSTHOG_HOST']
    if (key === undefined || key === '' || host === undefined || host === '') {
      return
    }

    posthog.init(key, {
      api_host: host,
      capture_pageview: true,
      capture_pageleave: true,
      disable_session_recording: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-ph-mask]',
      },
    })

    // Gate session recording behind feature flag
    posthog.onFeatureFlags(() => {
      const isEnabled = posthog.isFeatureEnabled('session-recording-enabled') === true
      if (isEnabled) {
        posthog.startSessionRecording()
      }
    })

    // Initialize global error handlers
    initGlobalErrorHandlers()
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
