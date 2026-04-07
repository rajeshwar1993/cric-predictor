'use client'

import { useCallback, useState } from 'react'
import { Copy, Share2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { trackEvent } from '@/lib/analytics/client'
import { GANG_INVITE_COPIED, GANG_INVITE_SHARED } from '@/lib/analytics/events'

export interface InviteShareProps {
  inviteCode: string
  gangName: string
}

export function InviteShare({ inviteCode, gangName }: InviteShareProps) {
  const [copied, setCopied] = useState(false)

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const shareUrl = `${appUrl}/join/${inviteCode}`
  const shareMessage = `Join ${gangName} on Bragg \u2014 the IPL prediction game built for bragging rights.\n\nGang Code: ${inviteCode}\n${shareUrl}`

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      trackEvent(GANG_INVITE_COPIED, { invite_code: inviteCode })
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      // Fallback: try copying the message instead
      try {
        await navigator.clipboard.writeText(shareMessage)
        setCopied(true)
        trackEvent(GANG_INVITE_COPIED, { invite_code: inviteCode })
        setTimeout(() => {
          setCopied(false)
        }, 2000)
      } catch {
        // Clipboard not available
      }
    }
  }, [shareUrl, shareMessage, inviteCode])

  const handleShare = useCallback(async () => {
    if (!canShare) {
      await handleCopy()
      return
    }

    try {
      await navigator.share({
        title: `Join ${gangName} on Bragg`,
        text: shareMessage,
        url: shareUrl,
      })
      trackEvent(GANG_INVITE_SHARED, { invite_code: inviteCode })
    } catch (err: unknown) {
      // User cancelled share sheet or not supported, fall back to copy
      if (err instanceof Error && err.name !== 'AbortError') {
        await handleCopy()
      }
    }
  }, [canShare, handleCopy, gangName, shareMessage, shareUrl, inviteCode])

  return (
    <div className="flex flex-col gap-[var(--sp-3)]">
      <div className="flex items-center gap-[var(--sp-3)] rounded-[length:var(--radius-ds-md)] border border-[var(--border-default)] bg-[var(--bg-inset)] px-[var(--sp-4)] py-[var(--sp-3)]">
        <code
          className="min-w-0 flex-1 truncate text-sm font-medium tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          {shareUrl}
        </code>
      </div>
      <div className="flex gap-[var(--sp-2)]">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void handleCopy()
          }}
          aria-label={copied ? 'Copied!' : 'Copy invite link'}
        >
          {copied ? (
            <Check size={16} strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Copy size={16} strokeWidth={1.5} aria-hidden="true" />
          )}
          {copied ? 'Copied!' : 'Copy link'}
        </Button>
        {canShare && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void handleShare()
            }}
            aria-label="Share invite link"
          >
            <Share2 size={16} strokeWidth={1.5} aria-hidden="true" />
            Share
          </Button>
        )}
      </div>
    </div>
  )
}
