'use client'

import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RangePickProps {
  options: string[]
  value: string | null
  onChange: (bracket: string) => void
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RangePick({ options, value, onChange, disabled = false }: RangePickProps) {
  return (
    <div
      className="grid grid-cols-3 gap-[var(--sp-2)] sm:grid-cols-5"
      role="radiogroup"
      aria-label="Pick a range"
    >
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
            onClick={() => {
              onChange(option)
            }}
            className={cn(
              'flex h-10 items-center justify-center rounded-[var(--radius-ds-full)] border px-[var(--sp-3)] text-sm font-medium transition-all',
              'focus-visible:border-[var(--border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--brand-muted)] focus-visible:outline-none',
              'active:scale-[0.97]',
              'disabled:pointer-events-none disabled:opacity-40',
              isSelected
                ? 'border-[var(--brand)] bg-[var(--brand-muted)] text-[var(--brand)]'
                : 'border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] hover:border-[var(--border-strong)]',
            )}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
