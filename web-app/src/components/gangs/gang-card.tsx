import Link from 'next/link'
import type { MemberRole } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface GangCardProps {
  /** Unique gang identifier */
  id: string
  /** Gang display name */
  name: string
  /** User's role in this gang */
  role: MemberRole
  /** Number of approved members */
  memberCount: number
}

/**
 * Gang card — a clickable card linking to the gang page.
 *
 * Displays the gang name, member count, and the user's role badge.
 * Uses the shared Card primitive with design-system tokens.
 *
 * @see docs/stories/DASH-001-dashboard-page.md
 */
export function GangCard({ id, name, role, memberCount }: GangCardProps) {
  return (
    <Link
      href={`/group/${id}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bragg-lime focus-visible:ring-offset-2 focus-visible:ring-offset-concrete-black rounded-lg"
      aria-label={`View ${name} gang`}
    >
      <Card className="cursor-pointer border-l-4 border-l-bragg-lime hover:shadow-[4px_4px_0_var(--color-lime-shade)]">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-h3 text-text-primary">
            {name}
          </h3>
          <Badge variant={role === 'admin' ? 'lime' : 'default'}>
            {role === 'admin' ? 'ADMIN' : 'MEMBER'}
          </Badge>
        </div>
        <p className="text-caption text-text-muted">
          <span className="font-display font-bold text-text-secondary">{memberCount}</span>/20 members
        </p>
      </Card>
    </Link>
  )
}
