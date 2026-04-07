import { Crown } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export interface MemberListMember {
  userId: string
  displayName: string
  role: 'admin' | 'member'
  status: 'pending' | 'approved' | 'rejected' | 'removed' | 'left'
  isCurrentUser: boolean
  points?: number
  rank?: number | null
}

export interface MemberListProps {
  members: MemberListMember[]
}

function getInitial(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0) return '?'
  return (trimmed[0] ?? '?').toUpperCase()
}

export function MemberList({ members }: MemberListProps) {
  // Sort: active first, then by points DESC, then alphabetical
  const sorted = [...members].sort((a, b) => {
    const aActive = a.status === 'approved' ? 0 : 1
    const bActive = b.status === 'approved' ? 0 : 1
    if (aActive !== bActive) return aActive - bActive

    const aPoints = a.points ?? 0
    const bPoints = b.points ?? 0
    if (aPoints !== bPoints) return bPoints - aPoints

    return a.displayName.localeCompare(b.displayName)
  })

  return (
    <section aria-label="Members">
      <ul className="flex flex-col" role="list">
        {sorted.map((member, index) => {
          const isInactive = member.status !== 'approved'

          return (
            <li
              key={member.userId}
              className={cn(
                'flex items-center gap-[var(--sp-3)] border-b border-[var(--border-default)] px-[var(--sp-4)] py-[var(--sp-3)]',
                member.isCurrentUser && 'bg-[var(--brand-muted)]',
                isInactive && 'opacity-50',
              )}
              style={{ minHeight: 56 }}
            >
              {/* Rank */}
              <span
                className="w-8 shrink-0 text-right text-lg font-bold tabular-nums"
                style={{
                  color:
                    index === 0
                      ? 'var(--rank-gold)'
                      : index === 1
                        ? 'var(--rank-silver)'
                        : index === 2
                          ? 'var(--rank-bronze)'
                          : 'var(--text-secondary)',
                }}
              >
                {member.rank ?? index + 1}
              </span>

              {/* Avatar */}
              <Avatar size="sm">
                <AvatarFallback>{getInitial(member.displayName)}</AvatarFallback>
              </Avatar>

              {/* Name + Role */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-[var(--sp-1)]">
                  <span
                    className="truncate text-base font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {member.displayName}
                  </span>
                  {member.isCurrentUser && (
                    <span className="shrink-0 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      (you)
                    </span>
                  )}
                  {member.role === 'admin' && (
                    <Crown
                      size={14}
                      strokeWidth={1.5}
                      className="shrink-0"
                      style={{ color: 'var(--brand)' }}
                      aria-label="Admin"
                    />
                  )}
                </div>
                {isInactive && (
                  <span
                    className="text-xs uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {member.status}
                  </span>
                )}
              </div>

              {/* Points */}
              <span
                className="shrink-0 text-lg font-bold tabular-nums"
                style={{ color: 'var(--brand)' }}
              >
                {member.points ?? 0} pts
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
