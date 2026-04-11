'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect, useRef } from 'react'

import { captureError } from '@/lib/analytics/error-handler'

export function PHProvider({ children }: { children: React.ReactNode }) {
  const initializedRef = useRef(false)

  useEffect(() => {
    // Initialise PostHog once per page. Guarded by initializedRef so
    // StrictMode's double-invoke in dev doesn't re-init the client.
    if (!initializedRef.current) {
      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
      if (!key) {
        console.warn(
          '[PHProvider] NEXT_PUBLIC_POSTHOG_KEY is not set — PostHog analytics disabled.',
        )
        // No key → no analytics → no point attaching global error
        // listeners. Returning undefined here means no cleanup runs,
        // which is safe under StrictMode.
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
    }

    // ── Global client error capture ──────────────────────────────────
    // Forwards uncaught browser errors and unhandled promise rejections
    // to PostHog via the existing captureError helper. The route-level
    // error.tsx boundaries cover React render errors; these listeners
    // pick up everything else (event handlers, async work, third-party
    // scripts). Each listener encodes its own `source` so triage can
    // tell the two streams apart.
    //
    // Listener registration lives OUTSIDE the initializedRef guard so
    // that StrictMode's double-mount correctly pairs add/remove on each
    // effect run. If both add and remove were skipped on the second
    // run, the first cleanup would strip the listeners and leave the
    // dev page with no global error capture.
    const handleError = (event: ErrorEvent) => {
      captureError(event.error ?? new Error(event.message), {
        source: 'window.error',
        metadata: {
          page_path:
            typeof window !== 'undefined' ? window.location.pathname : null,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const error = reason instanceof Error ? reason : new Error(String(reason))
      captureError(error, {
        source: 'unhandledrejection',
        metadata: {
          page_path:
            typeof window !== 'undefined' ? window.location.pathname : null,
        },
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
