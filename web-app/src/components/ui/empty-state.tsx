import * as React from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface EmptyStateProps extends React.ComponentProps<'div'> {
  /** Lucide icon component to render at 48px */
  icon: LucideIcon
  /** Headline text (H3 style) */
  headline: string
  /** Description text (Body Small style) */
  description: string
  /** Optional action element (button, link, etc.) */
  action?: React.ReactNode
}

function EmptyState({
  icon: Icon,
  headline,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-6 py-12 text-center',
        className
      )}
      {...props}
    >
      <Icon
        className="size-12 text-text-muted"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-1">
        <h3 className="text-h3 text-text-primary">{headline}</h3>
        <p className="text-body-sm text-text-secondary">{description}</p>
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export { EmptyState }
export type { EmptyStateProps }
