'use client'

import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface YesNoPickerProps {
  /** Currently selected value: "Yes", "No", or empty string for no selection */
  value: string
  /** Callback when a value is selected */
  onChange: (value: string) => void
  /** Whether the picker is disabled (e.g., locked predictions) */
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

const OPTIONS = [
  { display: 'YES', value: 'Yes' },
  { display: 'NO', value: 'No' },
] as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * YesNoPicker — two toggle buttons for yes/no scenarios.
 *
 * Displays "YES" and "NO" labels via CSS uppercase. Stored values are "Yes"
 * and "No" (title case). Selected option has a lime background; unselected
 * has a dark surface. Selection is sticky.
 *
 * @see docs/stories/PRED-002-scenario-pickers.md
 */
export function YesNoPicker({
  value,
  onChange,
  disabled = false,
}: YesNoPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Select yes or no">
      {OPTIONS.map((option) => {
        const isSelected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={option.display}
            disabled={disabled}
            className={cn(
              'rounded-md px-4 py-3 font-body text-sm font-bold uppercase tracking-[0.08em] transition-all duration-[var(--duration-state)] ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bragg-lime focus-visible:ring-offset-2 focus-visible:ring-offset-concrete-black',
              isSelected
                ? 'bg-bragg-lime text-text-on-primary shadow-[4px_4px_0_var(--color-lime-shade)] motion-safe:animate-pop-in'
                : 'border border-wire bg-mid-concrete text-text-secondary hover:border-light-concrete hover:bg-light-concrete',
              disabled && 'cursor-not-allowed opacity-50',
            )}
            onClick={() => {
              if (!disabled) {
                onChange(option.value)
              }
            }}
          >
            {option.display}
          </button>
        )
      })}
    </div>
  )
}
