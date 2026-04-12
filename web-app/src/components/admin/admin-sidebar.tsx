'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  Flag,
  Home,
  LogOut,
  Shield,
  Target,
  Trophy,
  Users,
} from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import { signOut as signOutAction } from '@/lib/actions/auth'

const navItems = [
  { label: 'Overview', href: '/admin/overview', icon: Home },
  { label: 'Fixtures', href: '/admin/fixtures', icon: Calendar },
  { label: 'Scenarios', href: '/admin/scenarios', icon: Target },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Gangs', href: '/admin/gangs', icon: Shield },
  { label: 'Predictions', href: '/admin/predictions', icon: BarChart3 },
  { label: 'Standings', href: '/admin/standings', icon: Trophy },
  { label: 'Reference Data', href: '/admin/reference', icon: Database },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell },
  { label: 'Operations', href: '/admin/operations', icon: Activity },
  { label: 'Data Integrity', href: '/admin/integrity', icon: CheckCircle },
  { label: 'Rate Limits', href: '/admin/rate-limits', icon: Clock },
  { label: 'Moderation', href: '/admin/moderation', icon: Flag },
] as const

interface AdminSidebarProps {
  displayName: string | null
}

export function AdminSidebar({ displayName }: AdminSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'flex h-dvh flex-col border-r border-[#333333] bg-[#111111] transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#333333] px-4 py-4">
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold uppercase tracking-wider text-bragg-lime">
              Bragg Admin
            </p>
            {displayName && (
              <p className="truncate text-xs text-text-secondary">{displayName}</p>
            )}
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-[#242424] hover:text-text-primary"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-bragg-lime/10 font-medium text-bragg-lime'
                      : 'text-text-secondary hover:bg-[#1a1a1a] hover:text-text-primary',
                    collapsed && 'justify-center px-0',
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Sign out */}
      <div className="border-t border-[#333333] px-2 py-3">
        <form action={async () => { await signOutAction() }}>
          <button
            type="submit"
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-[#1a1a1a] hover:text-text-primary',
              collapsed && 'justify-center px-0',
            )}
            title={collapsed ? 'Sign out' : undefined}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </form>
      </div>
    </aside>
  )
}
