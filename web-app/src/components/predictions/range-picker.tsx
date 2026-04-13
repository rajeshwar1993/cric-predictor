'use client'

import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface RangePickerProps {
  /** Range bracket options (e.g., ["<140", "140-159", "160-179", "180-199", "200+"]) */
  options: string[]
  /** Currently selected bracket string, or empty string for no selection */
  value: string
  /** Callback when a bracket is selected */
  onChange: (bracket: string) => void
  /** Whether the picker is disabled (e.g., locked predictions) */
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * RangePicker — selectable chip row for range/bracket scenarios.
 *
 * Options are rendered as a flex-wrap row of chip buttons. Selected chip has
 * a lime background with offset shadow; unselected chips have a dark surface.
 * Single select only (sticky selection — tapping the same chip does not deselect).
 *
 * @see docs/stories/PRED-002-scenario-pickers.md
 */
export function RangePicker({
  options,
  value,
  onChange,
  disabled = false,
}: RangePickerProps) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select a range">
      {options.map((option) => {
        const isSelected = value === option
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={option}
            disabled={disabled}
            className={cn(
              'min-w-[3.5rem] rounded-md px-4 py-2.5 font-body text-sm font-bold uppercase tracking-wide transition-all duration-[var(--duration-state)] ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bragg-lime focus-visible:ring-offset-2 focus-visible:ring-offset-concrete-black',
              isSelected
                ? 'bg-bragg-lime text-text-on-primary shadow-[4px_4px_0_var(--color-lime-shade)] motion-safe:animate-pop-in'
                : 'border border-wire bg-mid-concrete text-text-secondary hover:border-light-concrete hover:bg-light-concrete',
              disabled && 'cursor-not-allowed opacity-50',
            )}
            onClick={() => {
              if (!disabled) {
                onChange(option)
              }
            }}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
