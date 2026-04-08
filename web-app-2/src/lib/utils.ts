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
/**
 * Returns a human-readable relative timestamp.
 * Examples: "just now", "2m ago", "3h ago", "5d ago", "2w ago"
 */
export function formatTimeAgo(date: string | Date): string {
  const now = Date.now()
  const then = typeof date === 'string' ? new Date(date).getTime() : date.getTime()
  const diffMs = now - then

  if (diffMs < 0) return 'just now'

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${String(minutes)}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${String(hours)}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${String(days)}d ago`

  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${String(weeks)}w ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${String(months)}mo ago`

  const years = Math.floor(days / 365)
  return `${String(years)}y ago`
}

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
