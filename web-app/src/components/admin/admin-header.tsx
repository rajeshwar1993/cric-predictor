'use client'

import { useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, RefreshCw } from 'lucide-react'

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
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Build breadcrumbs from pathname: /admin/fixtures/abc → ["fixtures", "abc"]
  const segments = pathname.replace('/admin', '').split('/').filter(Boolean)

  function handleRefresh() {
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-wire bg-concrete-black px-6">
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
      <button
        onClick={handleRefresh}
        disabled={isPending}
        aria-label="Refresh page data"
        className="ml-auto rounded-md p-1.5 text-text-secondary transition-colors hover:bg-dark-concrete hover:text-text-primary disabled:opacity-50"
      >
        <RefreshCw size={16} className={isPending ? 'animate-spin' : ''} />
      </button>
    </header>
  )
}
