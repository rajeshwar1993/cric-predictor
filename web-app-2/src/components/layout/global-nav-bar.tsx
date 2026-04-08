import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/logo'
import { NotificationBell } from '@/components/layout/notification-bell'
import { UserMenu } from '@/components/layout/user-menu'
import { getLatestNotifications } from '@/lib/dal/notifications'

/**
 * Global navigation bar — shown on all authenticated pages.
 *
 * Server component that fetches the user profile and renders
 * client subcomponents for interactive elements (notification bell, user menu).
 *
 * Design: fixed top, 56px height, bg-base at 80% opacity with
 * backdrop-blur-[12px], bottom border, z-50.
 *
 * NOTE: Content areas below this nav must add `pt-[56px]` to avoid
 * being hidden behind the fixed header. This is NOT applied by this
 * component — each page layout is responsible for it.
 */
export async function GlobalNavBar() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let displayName: string | null = null
  const email: string | null = user?.email ?? null
  const userId: string | null = user?.id ?? null

  if (user) {
    const { data: profile } = await supabase
      .from('v2_profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    if (profile) {
      displayName = (profile as { display_name: string | null }).display_name
    }
  }

  // Fetch initial notifications server-side for fast first paint
  const initialNotifications = userId !== null ? await getLatestNotifications(userId) : []
  const initialUnreadCount = initialNotifications.filter((n) => !n.isRead).length

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 flex h-[56px] items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-base)]/80 px-[var(--sp-5)] backdrop-blur-[12px]"
      role="banner"
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-2 outline-none focus-visible:rounded-[var(--radius-sm)] focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
        aria-label="Go to dashboard"
      >
        <Logo size="sm" />
      </Link>

      <div className="flex items-center gap-1">
        <NotificationBell
          userId={userId}
          initialNotifications={initialNotifications}
          initialUnreadCount={initialUnreadCount}
        />
        <UserMenu displayName={displayName} email={email} />
      </div>
    </header>
  )
}
