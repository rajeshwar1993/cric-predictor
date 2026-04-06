'use client'

import { Bell } from 'lucide-react'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

interface NotificationBellProps {
  unreadCount?: number
}

export function NotificationBell({ unreadCount = 0 }: NotificationBellProps) {
  const displayCount = unreadCount > 9 ? '9+' : String(unreadCount)

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              unreadCount > 0 ? `${String(unreadCount)} unread notifications` : 'Notifications'
            }
          />
        }
      >
        <span className="relative inline-flex items-center justify-center">
          <Bell className="size-5" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 flex min-w-[18px] items-center justify-center rounded-full bg-[var(--error)] px-1 text-[10px] font-semibold leading-none text-white"
              aria-hidden="true"
            >
              {displayCount}
            </span>
          )}
        </span>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[min(320px,85vw)] border-l border-[var(--border-default)] bg-[var(--bg-raised)]"
      >
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription className="sr-only">Your notifications</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-[var(--sp-5)] py-[var(--sp-10)]">
          <Bell className="size-8 text-[var(--text-tertiary)]" strokeWidth={1.5} />
          <p className="text-center font-heading text-xl font-semibold text-[var(--text-primary)]">
            No notifications yet
          </p>
          <p className="text-center text-sm text-[var(--text-secondary)]">
            When something happens, you&apos;ll see it here.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
