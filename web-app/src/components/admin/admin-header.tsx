'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

const ROUTE_LABELS: Record<string, string> = {
  overview: 'Overview',
  fixtures: 'Fixtures',
  scenarios: 'Scenarios',
  users: 'Users',
  gangs: 'Gangs',
  predictions: 'Predictions',
  standings: 'Standings',
  reference: 'Reference Data',
  notifications: 'Notifications',
  operations: 'Operations',
  integrity: 'Data Integrity',
  'rate-limits': 'Rate Limits',
  moderation: 'Moderation',
}

export function AdminHeader() {
  const pathname = usePathname()

  // Build breadcrumbs from pathname: /admin/fixtures/abc → ["fixtures", "abc"]
  const segments = pathname.replace('/admin', '').split('/').filter(Boolean)

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-[#333333] bg-[#111111] px-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        <Link href="/admin/overview" className="text-text-secondary transition-colors hover:text-text-primary">
          Admin
        </Link>
        {segments.map((segment, index) => {
          const href = '/admin/' + segments.slice(0, index + 1).join('/')
          const label = ROUTE_LABELS[segment] ?? segment
          const isLast = index === segments.length - 1

          return (
            <span key={href} className="flex items-center gap-1.5">
              <ChevronRight size={14} className="text-text-muted" />
              {isLast ? (
                <span className="font-medium text-text-primary">{label}</span>
              ) : (
                <Link href={href} className="text-text-secondary transition-colors hover:text-text-primary">
                  {label}
                </Link>
              )}
            </span>
          )
        })}
      </nav>
    </header>
  )
}
