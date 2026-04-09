'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'
import { Copy, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { trackEvent } from '@/lib/analytics/client'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'

export interface InviteShareProps {
  /** Full invite URL (constructed on the server) */
  inviteUrl: string
  /** Invite code for the share text */
  inviteCode: string
  /** Gang name for the share text */
  gangName: string
  /** Current user's display name for the share text */
  inviterName: string
}

// ---------------------------------------------------------------------------
// Detect navigator.share support using useSyncExternalStore (SSR-safe)
// ---------------------------------------------------------------------------

/** navigator.share never changes at runtime — no subscriptions needed. */
function subscribeNoop(cb: () => void) {
  // No external store changes to subscribe to
  void cb
  return () => {}
}

function getCanShareSnapshot(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

function getCanShareServerSnapshot(): boolean {
  return false
}

/**
 * InviteShare — client component for copy-to-clipboard and native share.
 *
 * - "Copy invite link" copies the invite URL and shows "Copied!" for 2 seconds.
 * - "Share" uses `navigator.share()` on mobile. Hidden on desktop when not available.
 * - Fires `INVITE_COPIED` or `INVITE_SHARED` analytics events.
 *
 * @see docs/stories/GANG-001-gang-page-header.md
 */
export function InviteShare({
  inviteUrl,
  inviteCode,
  gangName,
  inviterName,
}: InviteShareProps) {
  const [copied, setCopied] = useState(false)
  const canShare = useSyncExternalStore(
    subscribeNoop,
    getCanShareSnapshot,
    getCanShareServerSnapshot,
  )

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      trackEvent(ANALYTICS_EVENTS.INVITE_COPIED, {
        gangName,
        inviteCode,
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      // Clipboard API may fail in some contexts — warn and degrade gracefully
      console.warn('Failed to copy to clipboard:', error)
    }
  }, [inviteUrl, gangName, inviteCode])

  const handleShare = useCallback(async () => {
    if (!canShare) {
      // Fallback to copy on desktop
      await handleCopy()
      return
    }

    try {
      await navigator.share({
        title: `Join ${gangName} on Bragg`,
        text: `${inviterName} invited you to join ${gangName}. Use code ${inviteCode} or click the link.`,
        url: inviteUrl,
      })
      trackEvent(ANALYTICS_EVENTS.INVITE_SHARED, {
        gangName,
        inviteCode,
      })
    } catch (err) {
      // User cancelled share — not an error
      if (err instanceof Error && err.name !== 'AbortError') {
        // Fallback to copy if share fails for other reasons
        await handleCopy()
      }
    }
  }, [canShare, gangName, inviterName, inviteCode, inviteUrl, handleCopy])

  return (
    <div className="flex gap-3" role="group" aria-label="Invite actions">
      <Button
        variant="secondary"
        onClick={handleCopy}
        aria-label={copied ? 'Invite link copied' : 'Copy invite link'}
        aria-live="polite"
      >
        <Copy className="size-4" aria-hidden="true" />
        {copied ? 'Copied!' : 'Copy invite link'}
      </Button>

      {canShare && (
        <Button
          variant="secondary"
          onClick={handleShare}
          aria-label="Share invite link"
        >
          <Share2 className="size-4" aria-hidden="true" />
          Share
        </Button>
      )}
    </div>
  )
}
