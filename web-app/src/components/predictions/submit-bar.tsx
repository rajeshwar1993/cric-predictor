'use client'

import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SubmitState = 'idle' | 'saving' | 'saved'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SubmitBarProps {
  /** Number of scenarios that have a selection */
  pickedCount: number
  /** Total number of scenarios */
  totalCount: number
  /** Callback when the submit button is clicked */
  onSubmit: () => void
  /** Current submission state */
  submitState: SubmitState
  /** Whether the submit button is disabled (e.g., 0 picks) */
  disabled: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SubmitBar — sticky bottom bar showing prediction progress and submit button.
 *
 * Fixed at the bottom of the viewport, above the safe area. Shows a
 * progress counter (e.g. "5/19 picked") and a "Lock Predictions" button
 * that triggers form submission. Slides up with a smooth animation on mount.
 *
 * Three visual states:
 *   - `idle`: "Lock Predictions" — ready to submit
 *   - `saving`: Loader2 spinner + "Saving..." — server action in progress
 *   - `saved`: Check icon + "Locked!" with pop animation — confirmation
 *
 * @see docs/stories/PRED-003-prediction-submit.md
 */
export function SubmitBar({
  pickedCount,
  totalCount,
  onSubmit,
  submitState,
  disabled,
}: SubmitBarProps) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40',
        'border-t border-wire bg-dark-concrete',
        'pb-[env(safe-area-inset-bottom)]',
        'animate-in slide-in-from-bottom duration-300',
      )}
      role="toolbar"
      aria-label="Prediction submission"
    >
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        {/* Progress counter */}
        <span className="text-body-sm font-medium text-text-secondary">
          <span
            className={cn(
              'font-display font-bold',
              pickedCount > 0 ? 'text-bragg-lime' : 'text-text-muted',
            )}
          >
            {pickedCount}
          </span>
          <span className="text-text-muted">/{totalCount}</span>{' '}
          picked
        </span>

        {/* Submit button */}
        <Button
          onClick={onSubmit}
          disabled={disabled || submitState !== 'idle'}
          aria-busy={submitState === 'saving'}
          className={cn(
            submitState === 'saved' && 'animate-score-pop bg-success text-text-on-primary',
          )}
        >
          {submitState === 'saving' && (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Saving...
            </>
          )}
          {submitState === 'saved' && (
            <>
              <Check className="size-4" aria-hidden="true" />
              Locked!
            </>
          )}
          {submitState === 'idle' && 'Lock Predictions'}
        </Button>
      </div>
    </div>
  )
}
