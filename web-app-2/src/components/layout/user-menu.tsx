'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, LogOut, User } from 'lucide-react'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { getAvatarInitials } from '@/lib/utils'
import { signOut } from '@/lib/actions/auth'

interface UserMenuProps {
  displayName: string | null
  email: string | null
}

export function UserMenu({ displayName, email }: UserMenuProps) {
  const initials = getAvatarInitials(displayName, email)
  const [isSigningOut, setIsSigningOut] = useState(false)

  function handleSignOut() {
    setIsSigningOut(true)
    signOut().catch(() => {
      setIsSigningOut(false)
    })
  }

  return (
    <Sheet>
      <SheetTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Open user menu" />}>
        <Avatar size="sm">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-[min(320px,85vw)] border-r border-[var(--border-default)] bg-[var(--bg-raised)]"
      >
        <SheetHeader>
          <SheetTitle className="sr-only">User menu</SheetTitle>
          <SheetDescription className="sr-only">Navigation and account actions</SheetDescription>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              {displayName !== null && displayName.length > 0 && (
                <p className="truncate text-base font-semibold text-[var(--text-primary)]">
                  {displayName}
                </p>
              )}
              {email !== null && email.length > 0 && (
                <p className="truncate text-sm text-[var(--text-secondary)]">{email}</p>
              )}
            </div>
          </div>
        </SheetHeader>

        <nav className="flex flex-col gap-1 px-2 py-2" aria-label="User menu">
          <SheetClose
            render={
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-overlay)]"
              />
            }
          >
            <LayoutDashboard className="size-5" strokeWidth={1.5} />
            Dashboard
          </SheetClose>

          <SheetClose
            render={
              <Link
                href="/profile"
                className="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-overlay)]"
              />
            }
          >
            <User className="size-5" strokeWidth={1.5} />
            Profile
          </SheetClose>

          <Separator className="my-2 bg-[var(--border-default)]" />

          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-[var(--error)] transition-colors hover:bg-[var(--bg-overlay)] disabled:opacity-40"
          >
            <LogOut className="size-5" strokeWidth={1.5} />
            {isSigningOut ? 'Signing out...' : 'Sign out'}
          </button>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
