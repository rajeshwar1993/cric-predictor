'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ShareCardProps extends React.ComponentProps<'div'> {
  /** User's rank in the leaderboard */
  rank: number
  /** User's display name */
  displayName: string
  /** Number of correct predictions */
  correctCount: number
  /** Total number of scenarios */
  totalScenarios: number
  /** Total points earned */
  points: number
  /** Match title (e.g., "MI vs CSK") */
  matchTitle: string
  /** Match number (e.g., 42) */
  matchNumber: number
  /** Season name (e.g., "IPL 2026") */
  seasonName: string
}

/* ------------------------------------------------------------------ */
/* Image Export                                                         */
/* ------------------------------------------------------------------ */

async function exportShareCard(element: HTMLElement): Promise<Blob> {
  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(element, {
    backgroundColor: '#111111',
    scale: 2, // 2x for retina quality
  })
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to generate image blob'))
        }
      },
      'image/png'
    )
  })
}

async function handleShare(cardRef: HTMLElement): Promise<void> {
  const blob = await exportShareCard(cardRef)
  const file = new File([blob], 'bragg-result.png', { type: 'image/png' })

  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'My Bragg Result' })
  } else {
    // Desktop fallback: download the image
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bragg-result.png'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function ShareCard({
  rank,
  displayName,
  correctCount,
  totalScenarios,
  points,
  matchTitle,
  matchNumber,
  seasonName,
  className,
  ...props
}: ShareCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = React.useState(false)

  async function onShare() {
    if (!cardRef.current || sharing) return
    setSharing(true)
    try {
      await handleShare(cardRef.current)
    } catch (error: unknown) {
      // Ignore user cancellation (e.g. dismissing the native share sheet)
      const isAbort =
        error instanceof DOMException && error.name === 'AbortError'
      if (!isAbort) {
        console.error('[ShareCard] Export failed:', error)
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className={cn('flex flex-col items-center gap-4', className)} {...props}>
      {/* Card — this is the element captured as a screenshot */}
      <div
        ref={cardRef}
        data-slot="share-card"
        className="relative flex aspect-square w-full max-w-[320px] flex-col justify-between overflow-hidden rounded-lg border-[3px] border-bragg-lime bg-gradient-to-b from-concrete-black to-dark-concrete p-6"
      >
        {/* Top section: Rank + Name */}
        <div>
          <span
            className={cn(
              'font-display text-[72px] font-bold leading-none',
              rank === 1 ? 'text-sunburst-yellow' : 'text-bragg-lime'
            )}
          >
            #{rank}
          </span>
          <p className="mt-2 truncate text-h2 text-text-primary">
            {displayName}
          </p>
        </div>

        {/* Bottom section: Stats + Watermark */}
        <div>
          <div className="mb-4 flex gap-4">
            <div>
              <span className="font-display text-lg font-bold tabular-nums text-bragg-lime">
                {correctCount}/{totalScenarios}
              </span>
              <p className="text-caption text-text-muted">Correct</p>
            </div>
            <div>
              <span className="font-display text-lg font-bold tabular-nums text-text-primary">
                {points}
              </span>
              <p className="text-caption text-text-muted">Points</p>
            </div>
            <div>
              <span className="font-display text-lg font-bold text-text-secondary">
                {matchTitle}
              </span>
              <p className="text-caption text-text-muted">Match {matchNumber}</p>
            </div>
          </div>
          <p className="text-caption text-text-muted">BRAGG . {seasonName}</p>
        </div>

        {/* Logo watermark */}
        <div
          className="absolute bottom-4 right-4 font-display text-[48px] font-bold leading-none text-text-primary opacity-20"
          aria-hidden="true"
        >
          B
        </div>
      </div>

      {/* Share button — outside the card ref so it's not captured */}
      <Button
        variant="default"
        onClick={onShare}
        disabled={sharing}
        aria-label="Share result as image"
      >
        {sharing ? 'Sharing...' : 'Share Result'}
      </Button>
    </div>
  )
}

export { ShareCard, exportShareCard }
export type { ShareCardProps }
