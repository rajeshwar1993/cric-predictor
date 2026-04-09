import { cn } from '@/lib/utils'

/**
 * PageWrapper — enforces consistent max-width, horizontal padding, and
 * bottom safe-area spacing across every page.
 *
 * Renders a `<div>` (not `<main>`) so pages can place their own `<main>`
 * landmark without creating duplicate landmarks (accessibility).
 *
 * @param maxWidth - `"default"` (720px) for most pages; `"sm"` (480px) for
 *   narrow flows like auth/onboarding.
 *
 * @see docs/design-systems/electric-street.md — Layout section
 * @see docs/stories/LAY-001-root-layout.md
 */
export function PageWrapper({
  children,
  className,
  maxWidth = 'default',
}: {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'default'
}) {
  return (
    <div
      className={cn(
        'mx-auto px-4 pb-[max(34px,env(safe-area-inset-bottom))] md:px-8',
        maxWidth === 'sm' ? 'max-w-[480px]' : 'max-w-[720px]',
        className,
      )}
    >
      {children}
    </div>
  )
}
