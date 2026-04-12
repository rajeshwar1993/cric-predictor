import { redirect } from 'next/navigation'

import { AdminHeader } from '@/components/admin/admin-header'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { isSystemAdmin } from '@/lib/dal/admin/auth'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Admin layout — full-screen dark shell with sidebar nav.
 * Completely separate from the main app layout (no NavBar/Footer).
 *
 * Auth + admin checks are enforced both here (server-side on render)
 * and in the proxy (on navigation), providing defense in depth.
 */
export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const isAdmin = await isSystemAdmin(user.id)
  if (!isAdmin) redirect('/dashboard')

  // Fetch display name for the sidebar
  const { data: profile } = await supabase
    .from('v2_profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="flex h-dvh bg-[#0A0A0A]">
      <AdminSidebar displayName={profile?.display_name ?? null} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
