import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /** Lucide icon or any React node displayed above the headline. */
  icon?: ReactNode
  /** Headline text — short, encouraging, not scolding. */
  title: string
  /** Supporting description (max ~45 characters recommended). */
  description?: string
  /** Optional CTA button or link. */
  action?: ReactNode
  className?: string
}

/**
 * Reusable empty state layout per Bragg design system.
 *
 * Centered vertically in available space with icon, headline,
 * description, and optional action button.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center px-[var(--sp-5)] py-[var(--sp-12)] text-center',
        className,
      )}
    >
      {icon !== undefined ? (
        <div className="mb-[var(--sp-4)]" style={{ color: 'var(--text-tertiary)' }}>
          {icon}
        </div>
      ) : null}
      <h2 className="font-heading text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h2>
      {description !== undefined && description.length > 0 ? (
        <p
          className="mt-[var(--sp-2)] max-w-[45ch] text-base"
          style={{ color: 'var(--text-secondary)' }}
        >
          {description}
        </p>
      ) : null}
      {action !== undefined ? <div className="mt-[var(--sp-6)]">{action}</div> : null}
    </div>
  )
}
