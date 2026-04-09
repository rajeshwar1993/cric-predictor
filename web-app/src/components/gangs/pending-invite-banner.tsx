'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { joinGangByCode } from '@/lib/actions/gangs'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import type { ActionResult } from '@/types'

/** Shape of the pending invite stored in localStorage. */
export interface PendingInvite {
  code: string
  gangName: string
  storedAt: number // Date.now() timestamp
}

export const STORAGE_KEY = 'bragg_pending_invite'
const EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

interface PendingInviteBannerProps {
  /** Override the server action for testing/Storybook. Defaults to the real `joinGangByCode`. */
  action?: (inviteCode: string) => Promise<ActionResult<{ gangId: string; status: 'approved' | 'pending' }>>
  /** Override the initial invite for testing/Storybook (skips localStorage read). */
  initialInvite?: PendingInvite | null
}

/**
 * Banner shown at the top of the dashboard when the user has a pending
 * invite from an invite link flow (stored in localStorage).
 *
 * Auto-expires after 24 hours. Join triggers the `joinGangByCode` action;
 * Dismiss clears localStorage and hides the banner.
 *
 * @see docs/stories/DASH-003-join-gang.md
 */
export function PendingInviteBanner({
  action = joinGangByCode,
  initialInvite,
}: PendingInviteBannerProps) {
  const [invite, setInvite] = useState<PendingInvite | null>(
    initialInvite ?? null,
  )
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Skip localStorage read if initialInvite was provided (Storybook/testing)
    if (initialInvite !== undefined) return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return

      const parsed = JSON.parse(stored) as PendingInvite

      // Check 24h expiry
      if (Date.now() - parsed.storedAt > EXPIRY_MS) {
        localStorage.removeItem(STORAGE_KEY)
        return
      }

      setInvite(parsed)
    } catch {
      // Invalid JSON or localStorage error -- clear and move on
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [initialInvite])

  function handleDismiss() {
    localStorage.removeItem(STORAGE_KEY)
    setInvite(null)
  }

  async function handleJoin() {
    if (!invite) return

    setIsLoading(true)
    try {
      const result = await action(invite.code)

      if (result.success) {
        localStorage.removeItem(STORAGE_KEY)
        setInvite(null)

        if (result.data?.status === 'approved') {
          toast.success("You're in!")
          router.push(`/group/${result.data.gangId}`)
        } else {
          toast.success('Request sent! Waiting for admin approval.')
        }
      } else {
        // Handle "already a member" redirect
        if (result.error.startsWith('already_a_member:')) {
          const gangId = result.error.split(':')[1]
          localStorage.removeItem(STORAGE_KEY)
          setInvite(null)
          toast.info("You're already a member of this gang.")
          router.push(`/group/${gangId}`)
          return
        }
        toast.error(result.error)
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!invite) return null

  return (
    <div
      className="bg-lime-wash border border-lime-wire rounded-lg p-4 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      role="status"
      aria-label="Pending gang invite"
    >
      <p className="text-body text-text-primary">
        You&apos;ve been invited to join{' '}
        <strong className="text-bragg-lime">{invite.gangName}</strong>
      </p>
      <div className="flex gap-2 shrink-0">
        <Button
          size="sm"
          onClick={handleJoin}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Joining...
            </>
          ) : (
            'Join'
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          disabled={isLoading}
        >
          Dismiss
        </Button>
      </div>
    </div>
  )
}
