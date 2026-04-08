import Link from 'next/link'
import { Users, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface GangCardProps {
  gang: {
    id: string
    name: string
    memberCount: number
    role: 'admin' | 'member'
  }
}

export function GangCard({ gang }: GangCardProps) {
  return (
    <Link
      href={`/group/${gang.id}`}
      className={cn(
        'group/card flex min-h-[80px] flex-col justify-center gap-[var(--sp-2)] rounded-[var(--radius-ds-lg)] border border-[var(--border-default)] bg-[var(--bg-raised)] p-[var(--sp-4)] transition-colors hover:border-[var(--border-strong)] focus-visible:border-[var(--border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--brand-muted)] focus-visible:outline-none',
      )}
      aria-label={`${gang.name} \u2014 ${String(gang.memberCount)} member${gang.memberCount === 1 ? '' : 's'}${gang.role === 'admin' ? ', you are admin' : ''}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="truncate text-lg font-semibold text-[var(--text-primary)] font-body">
          {gang.name}
        </h3>
        {gang.role === 'admin' && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-ds-sm)] bg-[var(--brand-muted)] px-2 py-1 text-xs font-medium uppercase tracking-widest text-[var(--brand)]">
            <Crown size={12} strokeWidth={1.5} aria-hidden="true" />
            Admin
          </span>
        )}
      </div>
      <div className="flex items-center gap-[var(--sp-1)] text-sm text-[var(--text-secondary)]">
        <Users size={16} strokeWidth={1.5} aria-hidden="true" />
        <span>{gang.memberCount} in the squad</span>
      </div>
    </Link>
  )
}
