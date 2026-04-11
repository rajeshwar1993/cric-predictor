import { IdentifyUser } from '@/components/analytics/identify-user'
import { Footer } from '@/components/layout/footer'
import { NavBar } from '@/components/layout/nav-bar'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Authenticated app layout — wraps all pages that display the global
 * NavBar and Footer (dashboard, groups, profile, privacy, terms, etc.).
 *
 * Uses `min-h-dvh flex flex-col` so the footer sticks to the bottom
 * even when the page content is short.
 *
 * Server component: also resolves the current user and renders the
 * `IdentifyUser` client island so PostHog gets a `posthog.identify(userId)`
 * call on the first authenticated client render after the auth callback.
 * Middleware already gates the `(app)` segment behind a valid session, so
 * a missing user here is a defensive fallback only.
 *
 * @see docs/stories/LAY-003-footer.md — route group structure
 * @see docs/stories/PERF-001-posthog-events.md — analytics identity
 */
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-dvh flex-col">
      <NavBar />
      <main id="main" className="flex-1">{children}</main>
      <Footer />
      {user ? <IdentifyUser userId={user.id} /> : null}
    </div>
  )
}
