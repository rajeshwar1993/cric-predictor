'use client'

import * as React from 'react'
import Image from 'next/image'
import { Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportShareCard } from '@/components/ui/share-card'
import { toast } from '@/components/ui/toast'
import { trackEvent } from '@/lib/analytics/client'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface LeaderboardShareCardData {
  /** User's rank in the match leaderboard */
  rank: number
  /** User's display name */
  displayName: string
  /** User's avatar URL (optional) */
  avatarUrl?: string
  /** Number of correct predictions */
  correctCount: number
  /** Total number of resolved scenarios */
  totalScenarios: number
  /** Total points earned */
  points: number
  /** Match title (e.g., "MI vs CSK") */
  matchTitle: string
  /** Match number (e.g., 32) */
  matchNumber: number
  /** Gang name */
  gangName: string
  /** Total approved members in the gang */
  memberCount: number
  /** Season name (e.g., "IPL 2026") */
  seasonName?: string
}

export interface LeaderboardShareButtonProps {
  /** Card data for rendering the off-screen share card */
  cardData: LeaderboardShareCardData
  /** Gang ID for analytics */
  gangId: string
  /** Fixture ID for analytics */
  fixtureId: string
  /** Whether the fixture is resolved (share only available after resolution) */
  isResolved: boolean
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getRankHeadline(rank: number): string {
  if (rank === 1) return 'Top of the table'
  if (rank <= 3) return 'On the podium'
  return 'In the mix'
}

function getRankSubtext(rank: number, memberCount: number, gangName: string): string {
  if (rank === 1) return `Leading ${gangName}`
  return `Ranked #${rank} of ${memberCount} in ${gangName}`
}

function getRankBadgeClass(rank: number): string {
  if (rank === 1) return 'text-sunburst-yellow'
  if (rank <= 3) return 'text-bragg-lime'
  return 'text-text-secondary'
}

/* ------------------------------------------------------------------ */
/* ShareCardVisual — the off-screen card captured as PNG               */
/* ------------------------------------------------------------------ */

const ShareCardVisual = React.forwardRef<HTMLDivElement, LeaderboardShareCardData>(
  function ShareCardVisual(
    {
      rank,
      displayName,
      avatarUrl,
      correctCount,
      totalScenarios,
      points,
      matchTitle,
      matchNumber,
      gangName,
      memberCount,
      seasonName = 'IPL 2026',
    },
    ref,
  ) {
    const headline = getRankHeadline(rank)
    const subtext = getRankSubtext(rank, memberCount, gangName)
    const rankBadgeClass = getRankBadgeClass(rank)

    return (
      <div
        ref={ref}
        data-slot="leaderboard-share-card"
        className="relative flex aspect-square w-[320px] flex-col justify-between overflow-hidden rounded-2xl border-[3px] border-bragg-lime bg-gradient-to-b from-concrete-black to-dark-concrete p-6"
      >
        {/* Top section: Headline + Rank + Name */}
        <div>
          <p className="font-body text-body-sm uppercase tracking-widest text-text-muted">
            {headline}
          </p>
          <span
            className={cn(
              'font-display text-[72px] font-bold leading-none',
              rankBadgeClass,
            )}
          >
            #{rank}
          </span>
          <div className="mt-2 flex items-center gap-2">
            {avatarUrl && (
              <Image
                src={avatarUrl}
                alt=""
                width={32}
                height={32}
                className="size-8 rounded-full object-cover"
              />
            )}
            <p className="truncate font-display text-h3 font-bold uppercase text-text-primary">
              {displayName}
            </p>
          </div>
        </div>

        {/* Bottom section: Stats + Context + Branding */}
        <div>
          {/* Stats line */}
          <p className="mb-2 font-body text-base text-text-secondary">
            <span className="font-display font-bold tabular-nums text-bragg-lime">
              {correctCount}/{totalScenarios}
            </span>
            <span className="text-text-muted"> correct</span>
            <span className="mx-1 text-text-muted">&middot;</span>
            <span className="font-display font-bold tabular-nums text-text-primary">
              {points}
            </span>
            <span className="ml-1 text-text-muted">pts</span>
          </p>

          {/* Match context */}
          <p className="mb-1 font-body text-body-sm text-text-muted">
            {matchTitle} &middot; Match {matchNumber}
          </p>

          {/* Gang context */}
          <p className="mb-4 font-body text-body-sm text-text-muted">
            {subtext}
          </p>

          {/* Branding */}
          <div className="flex items-center justify-between">
            <p className="font-body text-caption text-text-muted">
              {seasonName}
            </p>
            <p className="font-body text-caption text-text-muted">
              bragg.app
            </p>
          </div>
        </div>

        {/* Logo watermark */}
        <div className="absolute bottom-4 right-4 opacity-20" aria-hidden="true">
          <Image src="/logo.png" alt="" width={48} height={48} />
        </div>
      </div>
    )
  },
)

/* ------------------------------------------------------------------ */
/* LeaderboardShareButton — icon button + hidden card for export       */
/* ------------------------------------------------------------------ */

/**
 * LeaderboardShareButton — renders a share icon button on the current user's
 * leaderboard row and an off-screen share card for PNG export.
 *
 * When tapped, captures the hidden card as a PNG and triggers the native
 * share sheet (mobile) or downloads the file (desktop).
 *
 * @see docs/new-requirements/leaderboard-share-card.md
 */
export function LeaderboardShareButton({
  cardData,
  gangId,
  fixtureId,
  isResolved,
}: LeaderboardShareButtonProps) {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = React.useState(false)

  const analyticsPayload = React.useMemo(
    () => ({
      gang_id: gangId,
      fixture_id: fixtureId,
      rank: cardData.rank,
      points: cardData.points,
      member_count: cardData.memberCount,
    }),
    [gangId, fixtureId, cardData.rank, cardData.points, cardData.memberCount],
  )

  const handleShare = React.useCallback(async () => {
    if (!cardRef.current || sharing) return

    trackEvent(ANALYTICS_EVENTS.LEADERBOARD_SHARE_TRIGGERED, analyticsPayload)
    setSharing(true)

    try {
      const blob = await exportShareCard(cardRef.current)
      const file = new File([blob], 'bragg-leaderboard.png', { type: 'image/png' })

      if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My Bragg Ranking' })
      } else {
        // Desktop fallback: download the image
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'bragg-leaderboard.png'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }

      trackEvent(ANALYTICS_EVENTS.LEADERBOARD_SHARE_COMPLETED, analyticsPayload)
    } catch (error: unknown) {
      const isAbort =
        error instanceof DOMException && error.name === 'AbortError'
      if (isAbort) {
        trackEvent(ANALYTICS_EVENTS.LEADERBOARD_SHARE_CANCELLED, analyticsPayload)
      } else {
        console.error('[LeaderboardShareButton] Export failed:', error)
        toast.error("Couldn't generate image. Try again.")
      }
    } finally {
      setSharing(false)
    }
  }, [sharing, analyticsPayload])

  const disabled = !isResolved || sharing
  const tooltipText = !isResolved ? 'Available after match ends' : undefined

  return (
    <>
      {/* Share icon button */}
      <button
        type="button"
        onClick={handleShare}
        disabled={disabled}
        title={tooltipText}
        className={cn(
          'flex size-9 items-center justify-center rounded-lg transition-colors',
          'text-bragg-lime hover:bg-lime-wash',
          'disabled:cursor-not-allowed disabled:text-text-muted disabled:opacity-50 disabled:hover:bg-transparent',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bragg-lime',
        )}
        aria-label={
          !isResolved
            ? 'Share ranking — available after all results are in'
            : 'Share your ranking'
        }
      >
        <Share2 className="size-5" aria-hidden="true" />
      </button>

      {/* Off-screen card for html2canvas capture */}
      <div
        className="pointer-events-none fixed -left-[9999px] -top-[9999px]"
        aria-hidden="true"
      >
        <ShareCardVisual ref={cardRef} {...cardData} />
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Standalone ShareCard preview (for Storybook)                        */
/* ------------------------------------------------------------------ */

/**
 * LeaderboardShareCardPreview — renders the share card visually for
 * Storybook preview purposes. Not used in production.
 */
export function LeaderboardShareCardPreview(props: LeaderboardShareCardData) {
  return (
    <div className="flex flex-col items-center gap-4">
      <ShareCardVisual {...props} />
    </div>
  )
}
