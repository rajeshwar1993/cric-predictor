'use client'

import { useEffect } from 'react'
import { captureErrorBoundary } from '@/lib/analytics/error-handler'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    captureErrorBoundary(error, error.digest !== undefined ? { componentStack: error.digest } : {})
  }, [error])

  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center bg-[var(--bg-base)] px-5 text-[var(--text-primary)]">
        <div className="space-y-6 text-center">
          <h1 className="text-3xl font-bold">Clean bowled.</h1>
          <p className="max-w-xs text-base text-[var(--text-secondary)]">
            Something went wrong. Give it another shot.
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-[var(--brand)] px-6 font-semibold text-[var(--brand-on)] transition-colors hover:bg-[var(--brand-hover)]"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
