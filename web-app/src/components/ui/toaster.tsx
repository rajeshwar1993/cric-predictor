'use client'

import { Toaster as SonnerToaster } from 'sonner'
import { X } from 'lucide-react'

/**
 * Toaster — Electric Street styled toast container.
 *
 * Place this once in the root layout:
 *   import { Toaster } from '@/components/ui/toaster'
 *   <Toaster />
 *
 * Toasts are triggered via the `toast` function re-exported from toast.tsx.
 */
function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      offset={20}
      gap={8}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'relative flex w-full max-w-[380px] items-start gap-3 rounded-md border-2 bg-mid-concrete p-4 font-body text-sm text-text-primary shadow-elevation-2',
          title: 'font-semibold text-text-primary',
          description: 'text-text-secondary text-sm',
          closeButton:
            'absolute right-2 top-2 text-text-muted hover:text-text-primary transition-colors duration-[var(--duration-state)]',
          success: 'border-success',
          error: 'border-error',
          warning: 'border-warning',
          info: 'border-info',
        },
      }}
      closeButton
      icons={{
        success: <ToastIndicator color="var(--color-success)" />,
        error: <ToastIndicator color="var(--color-error)" />,
        warning: <ToastIndicator color="var(--color-warning)" />,
        info: <ToastIndicator color="var(--color-info)" />,
        close: <X className="size-4" />,
      }}
      duration={4000}
    />
  )
}

/**
 * Colored square indicator on the left side of the toast.
 */
function ToastIndicator({ color }: { color: string }) {
  return (
    <span
      className="mt-0.5 block size-3 shrink-0 rounded-[2px]"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  )
}

export { Toaster }
