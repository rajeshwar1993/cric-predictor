'use client'

import { useCallback, useState } from 'react'

interface UseResetAttemptsResult {
  /** How many times the user has hit "Try again" so far. */
  attempts: number
  /** True once `attempts >= maxAttempts`. */
  hasExhausted: boolean
  /** Increments the attempt counter and calls the underlying `reset`. */
  handleReset: () => void
}

/**
 * Track how many times the user has clicked "Try again" on a Next.js
 * route-level error boundary, so the boundary can stop offering the
 * action after a few failures and surface an escape hatch instead of
 * letting the user get stuck in a reset loop.
 *
 * Shared between `(app)/profile/error.tsx`, `(app)/group/[groupId]/error.tsx`,
 * and any future error boundaries — keeps the behaviour consistent and
 * gives us one place to tweak the limit.
 */
export function useResetAttempts(
  reset: () => void,
  maxAttempts = 2,
): UseResetAttemptsResult {
  const [attempts, setAttempts] = useState(0)

  const handleReset = useCallback(() => {
    setAttempts((current) => current + 1)
    reset()
  }, [reset])

  return {
    attempts,
    hasExhausted: attempts >= maxAttempts,
    handleReset,
  }
}
