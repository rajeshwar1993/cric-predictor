import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { getUnreadCount } from '@/lib/dal/notifications'
import { UserMenu } from './user-menu'

/**
 * Global nav bar — Server Component shell.
 *
 * Fetches the authenticated user's profile and notification count,
 * then composes two Client Component islands: NotificationBell and UserMenu.
 *
 * Returns `null` when there is no authenticated user (guard only — this
 * component should only be rendered on authenticated pages).
 */
export async function NavBar() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('v2_profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  // Use the shared DAL helper so the nav bar and the rest of the app
  // stay on a single code path for unread counts.
  const unreadCount = await getUnreadCount(user.id)

  return (
    <nav
      className="sticky top-0 z-50 flex h-14 items-center justify-between border-b-2 border-dark-concrete bg-concrete-black px-4"
      aria-label="Primary"
    >
      <Link
        href="/dashboard"
        className="font-display text-lg font-bold uppercase tracking-tight text-text-primary"
      >
        BRAGG
      </Link>

      <div className="flex items-center gap-3">
        <NotificationBell
          userId={user.id}
          initialUnreadCount={unreadCount}
        />
        <UserMenu
          displayName={profile?.display_name ?? ''}
          email={user.email ?? ''}
        />
      </div>
    </nav>
  )
}
