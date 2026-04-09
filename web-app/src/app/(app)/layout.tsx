import { NavBar } from '@/components/layout/nav-bar'
import { Footer } from '@/components/layout/footer'

/**
 * Authenticated app layout — wraps all pages that display the global
 * NavBar and Footer (dashboard, groups, profile, privacy, terms, etc.).
 *
 * Uses `min-h-dvh flex flex-col` so the footer sticks to the bottom
 * even when the page content is short.
 *
 * @see docs/stories/LAY-003-footer.md — route group structure
 */
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <NavBar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
