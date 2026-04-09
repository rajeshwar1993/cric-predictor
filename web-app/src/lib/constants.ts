/** Current terms of service version. Bump the major number to force re-acceptance. */
export const CURRENT_TERMS_VERSION = '2.0'

/** Maximum members allowed in a single gang. */
export const MAX_GANG_MEMBERS = 20

/** Maximum gangs a single user can belong to. */
export const MAX_USER_GANGS = 40

/** Hours before match start that the prediction window opens. */
export const PREDICTION_WINDOW_HOURS = 12

/** Default deadline before match start (in minutes). */
export const DEFAULT_DEADLINE_MINS = 45

/** Cookie names used by middleware and auth flow. */
export const COOKIE_NAMES = {
  ONBOARDED: 'bragg_onboarded',
  TERMS_VERSION: 'bragg_terms_version',
} as const

/** Shared cookie options for auth-flow cookies (onboarded, terms_version). */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 365 * 24 * 60 * 60, // 1 year
  path: '/',
}

/**
 * Extract the major version number from a semver-like string (e.g. "2.0" → 2).
 */
export function getMajorVersion(version: string): number {
  const parts = version.split('.')
  return parseInt(parts[0] ?? '', 10)
}

/**
 * Check whether a date of birth represents someone who is at least 18 years old.
 */
export function isAtLeast18(dateOfBirth: Date): boolean {
  const today = new Date()
  const age = today.getFullYear() - dateOfBirth.getFullYear()
  const monthDiff = today.getMonth() - dateOfBirth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    return age - 1 >= 18
  }
  return age >= 18
}
