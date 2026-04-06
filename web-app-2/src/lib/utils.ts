import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Compute avatar initials from a display name or email.
 *
 * - Two-word name: first letter of first + first letter of last, uppercase
 * - Single-word name: first letter, uppercase
 * - Null/empty name + email: first letter of email local-part (before @), uppercase
 * - Null name + null email: "?"
 */
export function getAvatarInitials(displayName: string | null, email: string | null): string {
  const trimmed = displayName?.trim() ?? ''

  if (trimmed.length > 0) {
    const words = trimmed.split(/\s+/)
    if (words.length >= 2) {
      const first = words[0]
      const last = words[words.length - 1]
      if (first !== undefined && last !== undefined) {
        return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
      }
    }
    return (trimmed[0] ?? '?').toUpperCase()
  }

  if (email !== null && email.length > 0) {
    const localPart = email.split('@')[0]
    if (localPart !== undefined && localPart.length > 0) {
      return (localPart[0] ?? '?').toUpperCase()
    }
  }

  return '?'
}
