'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { LoginForm } from '@/components/auth/login-form'
import { joinGang } from '@/lib/actions/gangs'

const STORAGE_KEY = 'bragg_pending_invite'

// ---------------------------------------------------------------------------
// InviteWriter — writes invite to localStorage for post-signin pickup
// ---------------------------------------------------------------------------

function InviteWriter({ code, gangName }: { code: string; gangName: string }) {
  useEffect(() => {
    try {
      const data = JSON.stringify({
        code,
        gangName,
        storedAt: Date.now(),
      })
      localStorage.setItem(STORAGE_KEY, data)
    } catch {
      // localStorage not available — skip
    }
  }, [code, gangName])

  return null
}

// ---------------------------------------------------------------------------
// UnauthJoinView — for unauthenticated users
// ---------------------------------------------------------------------------

export function UnauthJoinView({ code, gangName }: { code: string; gangName: string }) {
  return (
    <div className="flex flex-col gap-[var(--sp-6)]">
      <InviteWriter code={code} gangName={gangName} />

      <div className="text-center">
        <p className="text-base text-[var(--text-secondary)]">You&apos;ve been invited to</p>
        <h1 className="mt-[var(--sp-2)] font-heading text-2xl font-bold text-[var(--text-primary)]">
          {gangName}
        </h1>
      </div>

      <div className="rounded-[var(--radius-ds-lg)] border border-[var(--border-default)] bg-[var(--bg-raised)] p-[var(--sp-4)]">
        <p className="mb-[var(--sp-4)] text-center text-sm text-[var(--text-secondary)]">
          Sign in to join this gang
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AuthJoinView — for authenticated users who are not yet members
// ---------------------------------------------------------------------------

export function AuthJoinView({
  code,
  gangName,
  gangId,
}: {
  code: string
  gangName: string
  gangId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)

  function handleJoin() {
    setError(null)
    setPendingMessage(null)
    startTransition(async () => {
      const result = await joinGang(code)
      if (result.success) {
        // Clear localStorage invite
        try {
          localStorage.removeItem(STORAGE_KEY)
        } catch {
          // ignore
        }
        if (result.status === 'approved') {
          router.push(`/group/${gangId}`)
        } else {
          setPendingMessage('Request sent, waiting for admin approval')
        }
      } else {
        setError(result.message)
      }
    })
  }

  return (
    <div className="flex flex-col items-center gap-[var(--sp-6)]">
      <div className="text-center">
        <p className="text-base text-[var(--text-secondary)]">You&apos;ve been invited to</p>
        <h1 className="mt-[var(--sp-2)] font-heading text-2xl font-bold text-[var(--text-primary)]">
          {gangName}
        </h1>
      </div>

      {error !== null && (
        <p className="text-sm text-[var(--error)]" role="alert">
          {error}
        </p>
      )}

      {pendingMessage !== null && (
        <p className="text-sm text-[var(--warning)]" role="status">
          {pendingMessage}
        </p>
      )}

      {pendingMessage === null && (
        <Button onClick={handleJoin} disabled={isPending} className="w-full max-w-[280px]">
          {isPending ? <LoadingSpinner size="sm" /> : 'Join Gang'}
        </Button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// PendingRequestView — for users who already have a pending request
// ---------------------------------------------------------------------------

export function PendingRequestView({ gangName }: { gangName: string }) {
  return (
    <div className="flex flex-col items-center gap-[var(--sp-4)] text-center">
      <h1 className="font-heading text-2xl font-bold text-[var(--text-primary)]">{gangName}</h1>
      <p className="text-sm text-[var(--warning)]" role="status">
        Request already pending — waiting for admin approval
      </p>
    </div>
  )
}
