'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { captureErrorBoundary } from '@/lib/analytics/error-handler'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    captureErrorBoundary(error, error.digest !== undefined ? { componentStack: error.digest } : {})
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-[var(--sp-5)]">
      <div className="space-y-6 text-center">
        <Logo size="sm" />
        <h1 className="font-heading text-3xl font-bold text-[var(--text-primary)]">
          Clean bowled.
        </h1>
        <p className="max-w-xs text-base text-[var(--text-secondary)]">
          Something went wrong on our end. Give it another shot.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-12 items-center justify-center rounded-[length:var(--radius-ds-md)] bg-[var(--brand)] px-6 font-semibold text-[var(--brand-on)] transition-colors hover:bg-[var(--brand-hover)]"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-[length:var(--radius-ds-md)] border border-[var(--border-strong)] px-6 font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-overlay)]"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
