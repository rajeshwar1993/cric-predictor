'use client'

import { useSyncExternalStore, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { joinGang } from '@/lib/actions/gangs'
import { useState } from 'react'

const STORAGE_KEY = 'bragg_pending_invite'
const EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

interface StoredInvite {
  code: string
  gangName: string
  storedAt: number
}

// Track version to trigger re-reads
let storeVersion = 0

function subscribe(callback: () => void): () => void {
  const handler = () => {
    callback()
  }
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener('storage', handler)
  }
}

function getSnapshot(): StoredInvite | null {
  // Use storeVersion to force re-read after mutations
  void storeVersion

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null

    const parsed = JSON.parse(raw) as StoredInvite

    // Check expiry
    if (Date.now() - parsed.storedAt > EXPIRY_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return parsed
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function getServerSnapshot(): StoredInvite | null {
  return null
}

function clearInvite(): void {
  localStorage.removeItem(STORAGE_KEY)
  storeVersion += 1
}

export function PendingInviteBanner() {
  const router = useRouter()
  const invite = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [dismissed, setDismissed] = useState(false)

  function handleDismiss() {
    clearInvite()
    setDismissed(true)
  }

  function handleJoin() {
    if (invite === null) return

    setError(null)
    startTransition(async () => {
      const result = await joinGang(invite.code)
      if (result.success) {
        clearInvite()
        if (result.status === 'approved') {
          router.push(`/group/${result.gangId}`)
        } else {
          setDismissed(true)
        }
      } else {
        setError(result.message)
      }
    })
  }

  if (invite === null || dismissed) return null

  return (
    <div
      className="flex flex-col gap-[var(--sp-3)] rounded-[var(--radius-ds-lg)] border border-[var(--border-default)] p-[var(--sp-4)] bg-[var(--warning-muted)]"
      role="status"
      aria-label="Pending gang invite"
    >
      <div className="flex items-start gap-[var(--sp-3)]">
        <Clock
          size={20}
          strokeWidth={1.5}
          className="mt-0.5 shrink-0 text-[var(--warning)]"
          aria-hidden="true"
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--warning)]">
            You were invited to join{' '}
            <strong className="font-semibold text-[var(--text-primary)]">{invite.gangName}</strong>
          </p>
          {error !== null && (
            <p className="mt-1 text-sm text-[var(--error)]" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-[var(--sp-2)]">
        <Button size="sm" onClick={handleJoin} disabled={isPending}>
          {isPending ? <LoadingSpinner size="sm" /> : 'Join Gang'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDismiss} disabled={isPending}>
          Dismiss
        </Button>
      </div>
    </div>
  )
}
