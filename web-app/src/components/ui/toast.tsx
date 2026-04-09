/**
 * Toast — wraps sonner's `toast` with Electric Street defaults.
 *
 * Error toasts persist until manually dismissed (duration: Infinity).
 * All other types auto-dismiss after 4 seconds (configured in Toaster).
 *
 * Usage:
 *   import { toast } from '@/components/ui/toast'
 *   toast.success('Prediction saved!')
 *   toast.error('Something went wrong. Please try again.')
 *   toast.warning('Deadline approaching!')
 *   toast.info('Scores will update shortly.')
 */

import type { ReactNode } from 'react'
import { toast as sonnerToast, type ExternalToast } from 'sonner'

/**
 * Wrapped toast function that makes error toasts persistent by default.
 */
const toast = Object.assign(
  // Default (plain) toast — pass through
  (message: string | ReactNode, data?: ExternalToast) =>
    sonnerToast(message, data),
  {
    success: (message: string | ReactNode, data?: ExternalToast) =>
      sonnerToast.success(message, data),
    error: (message: string | ReactNode, data?: ExternalToast) =>
      sonnerToast.error(message, { duration: Infinity, ...data }),
    warning: (message: string | ReactNode, data?: ExternalToast) =>
      sonnerToast.warning(message, data),
    info: (message: string | ReactNode, data?: ExternalToast) =>
      sonnerToast.info(message, data),
    loading: (message: string | ReactNode, data?: ExternalToast) =>
      sonnerToast.loading(message, data),
    dismiss: sonnerToast.dismiss,
    promise: sonnerToast.promise,
    custom: sonnerToast.custom,
    message: sonnerToast.message,
  }
)

export { toast }
