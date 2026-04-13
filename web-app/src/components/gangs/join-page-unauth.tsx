'use client'

import { useEffect } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import {
  STORAGE_KEY,
  type PendingInvite,
} from '@/components/gangs/pending-invite-banner'
import { BraggWordmark } from '@/components/ui/bragg-wordmark'

interface JoinPageUnauthProps {
  gangName: string
  inviteCode: string
}

/**
 * Join page for unauthenticated users.
 *
 * Shows the gang name, a login form (magic link), and stores the invite
 * in localStorage so the PendingInviteBanner on the dashboard can pick
 * it up after auth.
 *
 * @see docs/stories/JOIN-001-join-page.md
 */
export function JoinPageUnauth({ gangName, inviteCode }: JoinPageUnauthProps) {
  // Store the pending invite in localStorage on mount
  useEffect(() => {
    const pendingInvite: PendingInvite = {
      code: inviteCode,
      gangName,
      storedAt: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingInvite))
  }, [inviteCode, gangName])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <BraggWordmark as="h1" tone="primary" className="mb-8 text-center" />

        {/* Invite message */}
        <p className="text-body mb-6 text-center text-text-secondary">
          You&apos;ve been invited to join{' '}
          <strong className="text-bragg-lime">{gangName}</strong>
        </p>

        {/* Form card */}
        <div className="rounded-2xl border border-wire bg-dark-concrete p-6">
          <LoginForm redirectTo="/dashboard" />
        </div>

        {/* Disclaimer */}
        <p className="text-body-sm mt-6 text-center text-text-muted">
          Bragg is a free prediction game for entertainment purposes only. No
          real money. No betting. No prizes.
        </p>
      </div>
    </div>
  )
}
