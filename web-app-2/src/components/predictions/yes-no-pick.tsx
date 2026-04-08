'use client'

import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface YesNoPickProps {
  value: string | null
  onChange: (answer: string) => void
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function YesNoPick({ value, onChange, disabled = false }: YesNoPickProps) {
  const options = [
    { label: 'Yes', val: 'yes' },
    { label: 'No', val: 'no' },
  ] as const

  return (
    <div
      className="grid grid-cols-2 gap-[var(--sp-2)]"
      role="radiogroup"
      aria-label="Pick yes or no"
    >
      {options.map((opt) => {
        const isSelected = value === opt.val
        return (
          <button
            key={opt.val}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={opt.label}
            disabled={disabled}
            onClick={() => {
              onChange(opt.val)
            }}
            className={cn(
              'flex h-12 items-center justify-center rounded-[length:var(--radius-ds-md)] border text-base font-semibold transition-all',
              'focus-visible:border-[var(--border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--brand-muted)] focus-visible:outline-none',
              'active:scale-[0.97]',
              'disabled:pointer-events-none disabled:opacity-40',
              isSelected && opt.val === 'yes'
                ? 'border-[var(--success)] bg-[var(--success-muted)] text-[var(--success)]'
                : isSelected && opt.val === 'no'
                  ? 'border-[var(--error)] bg-[var(--error-muted)] text-[var(--error)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] hover:border-[var(--border-strong)]',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
