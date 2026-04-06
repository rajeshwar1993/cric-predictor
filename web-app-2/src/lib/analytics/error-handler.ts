'use client'

import posthog from 'posthog-js'
import { ERROR_BOUNDARY_CAUGHT, UNHANDLED_ERROR } from './events'

/**
 * Capture an error from a React error boundary.
 */
export function captureErrorBoundary(error: Error, errorInfo?: { componentStack?: string }) {
  posthog.capture(ERROR_BOUNDARY_CAUGHT, {
    error_message: error.message,
    error_stack: error.stack,
    component_stack: errorInfo?.componentStack,
  })
}

/**
 * Initialize global error listeners for unhandled errors and rejections.
 * Call once in the app root (e.g., in PostHogProvider useEffect).
 */
export function initGlobalErrorHandlers() {
  if (typeof window === 'undefined') return

  window.addEventListener('error', (event) => {
    posthog.capture(UNHANDLED_ERROR, {
      error_message: event.message,
      error_source: event.filename,
      error_line: event.lineno,
      error_col: event.colno,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason)
    posthog.capture(UNHANDLED_ERROR, {
      error_message: reason,
      error_type: 'unhandled_rejection',
    })
  })
}
