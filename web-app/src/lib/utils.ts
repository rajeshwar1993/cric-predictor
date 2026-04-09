import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract initials from a display name.
 *
 * Takes the first letter of the first two words, uppercase.
 * - "Rajesh Kumar" → "RK"
 * - "Virat" → "V"
 * - "" → "?"
 */
export function getAvatarInitials(displayName: string): string {
  const trimmed = displayName.trim()
  if (!trimmed) return '?'

  const words = trimmed.split(/\s+/)
  const firstInitial = words[0]?.[0] ?? ''
  const secondInitial = words[1]?.[0] ?? ''

  return (firstInitial + secondInitial).toUpperCase()
}

/**
 * Generate a share/invite message for a gang.
 *
 * @param gangName - The gang's display name
 * @param inviterName - The inviter's display name
 * @param inviteCode - The gang's unique invite code
 * @param appUrl - The app's base URL (e.g. https://bragg.app)
 */
export function generateInviteMessage(
  gangName: string,
  inviterName: string,
  inviteCode: string,
  appUrl: string,
): string {
  const joinUrl = `${appUrl}/join/${inviteCode}`
  return `${inviterName} invited you to join "${gangName}" on Bragg! Predict IPL matches and compete with your crew.\n\nJoin here: ${joinUrl}`
}

/**
 * Truncate a string to a maximum length, appending an ellipsis
 * if it was truncated.
 *
 * @param str - The string to truncate
 * @param maxLength - Maximum character length (including ellipsis)
 */
export function truncate(str: string, maxLength: number): string {
  if (maxLength <= 0) return ''
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 1) + '\u2026'
}

/**
 * Pluralize a word based on count.
 *
 * @param count - The quantity
 * @param singular - Singular form (e.g. "member")
 * @param plural - Optional plural form; defaults to singular + "s"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : (plural ?? singular + 's')
  return `${count} ${word}`
}
