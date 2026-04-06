import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageWrapperProps {
  children: ReactNode
  className?: string
}

/**
 * Standard page layout wrapper per Bragg design system.
 *
 * - Max content width: 480px
 * - Horizontal padding: --sp-5 (20px)
 * - Centered on tablet/desktop
 * - Vertical padding for breathing room
 */
export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <main
      className={cn('mx-auto w-full max-w-[480px] px-[var(--sp-5)] py-[var(--sp-6)]', className)}
    >
      {children}
    </main>
  )
}
