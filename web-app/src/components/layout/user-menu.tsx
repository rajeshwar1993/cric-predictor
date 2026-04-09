'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SidePanel } from '@/components/ui/side-panel'
import { cn, getAvatarInitials } from '@/lib/utils'
import { signOut } from '@/lib/actions/auth'
import { toast } from 'sonner'

interface UserMenuProps {
  /** User's display name from v2_profiles. */
  displayName: string
  /** User's email from the auth user object. */
  email: string
}

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/profile', label: 'Profile' },
] as const

/**
 * User avatar button that opens a left-side SidePanel containing
 * the user's identity, navigation links, and a sign-out action.
 */
function UserMenu({ displayName, email }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const pathname = usePathname()

  function handleSignOut() {
    startTransition(async () => {
      const result = await signOut()
      if (result && !result.success) {
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open user menu"
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-bragg-lime/50"
      >
        <Avatar size="sm">
          <AvatarFallback>{getAvatarInitials(displayName)}</AvatarFallback>
        </Avatar>
      </button>

      <SidePanel
        side="left"
        title="Menu"
        open={open}
        onOpenChange={setOpen}
      >
        <div className="flex h-full flex-col">
          {/* User identity */}
          <div className="border-b border-wire pb-4">
            <p className="truncate font-display text-lg font-bold text-text-primary">
              {displayName}
            </p>
            <p className="truncate text-body-sm text-text-muted">{email}</p>
          </div>

          {/* Navigation links */}
          <nav className="mt-4 flex flex-col gap-1" aria-label="Main navigation">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'rounded-md px-3 py-2.5 text-body font-medium transition-colors duration-150 ease-out',
                    isActive
                      ? 'font-bold text-bragg-lime underline decoration-[3px] underline-offset-2'
                      : 'text-text-secondary hover:bg-light-concrete hover:text-text-primary',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Sign out */}
          <div className="mt-auto border-t border-wire pt-4">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isPending}
              className="w-full rounded-md px-3 py-2.5 text-left text-body font-medium text-electric-coral transition-colors duration-150 ease-out hover:bg-electric-coral/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? 'Signing out\u2026' : 'Sign Out'}
            </button>
          </div>
        </div>
      </SidePanel>
    </>
  )
}

export { UserMenu }
export type { UserMenuProps }
