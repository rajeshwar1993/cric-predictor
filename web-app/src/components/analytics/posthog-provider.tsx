'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

import { captureError } from '@/lib/analytics/error-handler'

// ---------------------------------------------------------------------------
// Eager module-level init
// ---------------------------------------------------------------------------
//
// React fires `useEffect` callbacks bottom-up — child effects run BEFORE
// parent effects. If `posthog.init()` lived inside the PHProvider effect,
// any descendant client island that called `posthog.identify()` or
// `posthog.capture()` from its own effect would race the init and the
// SDK would silently no-op (`__loaded === false`). The first identify
// call would be dropped, and because `(app)` layout persists across
// client navigations the effect never re-runs — so the whole session
// stays anonymous.
//
// We side-step the race entirely by initialising PostHog at module load
// time. By the moment ANY component effect runs, `posthog.__loaded` is
// already true, so identify / capture / web-vitals all work on the very
// first render.
//
// Guards:
//   - `typeof window !== 'undefined'`: never run on the server (SSR /
//     RSC / Node tests). Without this guard the import would explode the
//     moment a Server Component graph reaches the file.
//   - `process.env.NODE_ENV !== 'test'`: skip in jsdom/vitest so unit
//     tests that import this module (or one of its consumers) don't get
//     a half-initialised PostHog client. Tests mock `posthog-js` directly.
//   - `initialized` flag: posthog-js's `init` is idempotent in production,
//     but the flag makes the no-op explicit and survives Fast Refresh
//     module re-evaluation in dev.

let initialized = false

if (
  typeof window !== 'undefined' &&
  process.env.NODE_ENV !== 'test' &&
  !initialized
) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) {
    console.warn(
      '[PHProvider] NEXT_PUBLIC_POSTHOG_KEY is not set — PostHog analytics disabled.',
    )
  } else {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
      // Session recording OFF by default — gated behind feature flag
      disable_session_recording: true,
    })
    initialized = true
  }
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // ── Global client error capture ──────────────────────────────────
    // Forwards uncaught browser errors and unhandled promise rejections
    // to PostHog via the existing captureError helper. The route-level
    // error.tsx boundaries cover React render errors; these listeners
    // pick up everything else (event handlers, async work, third-party
    // scripts). Each listener encodes its own `source` so triage can
    // tell the two streams apart.
    //
    // posthog.init() ran at module load time (see top of file) so by
    // the time this effect runs the SDK is already loaded and ready.
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
