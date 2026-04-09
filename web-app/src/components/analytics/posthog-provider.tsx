'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect, useRef } from 'react'

export function PHProvider({ children }: { children: React.ReactNode }) {
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) {
      console.warn(
        '[PHProvider] NEXT_PUBLIC_POSTHOG_KEY is not set — PostHog analytics disabled.',
      )
      return
    }

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
      // Session recording OFF by default — gated behind feature flag
      disable_session_recording: true,
    })
    initializedRef.current = true
  }, [])

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
