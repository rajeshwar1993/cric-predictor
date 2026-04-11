'use client'

import { useEffect } from 'react'

import { identifyUser } from '@/lib/analytics/client'

interface IdentifyUserProps {
  /** The authenticated Supabase user id from the server. */
  userId: string
}

/**
 * Pure client island that calls `posthog.identify(userId)` once on mount.
 *
 * Rendered from the authenticated `(app)` layout so any signed-in render of
 * any app page hydrates and identifies the current user against PostHog.
 * Subsequent client navigations stay identified — PostHog persists the
 * distinct id in localStorage until `resetIdentity()` is called on sign-out.
 *
 * Renders nothing — analytics-only side effect.
 */
export function IdentifyUser({ userId }: IdentifyUserProps) {
  useEffect(() => {
    if (!userId) return
    identifyUser(userId)
  }, [userId])

  return null
}
