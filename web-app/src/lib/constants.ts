/**
 * Canonical legal disclaimer copy. PRD NFR requires this string on the
 * landing page, the login page, the global footer, and anywhere else
 * we ask the user to engage with the game. Keep this as the single
 * source of truth so a legal-review change only needs to land here.
 */
export const LEGAL_DISCLAIMER =
  'Bragg is a free prediction game for entertainment purposes only. No real money. No betting. No prizes.'

/** Current terms of service version. Bump the major number to force re-acceptance. */
export const CURRENT_TERMS_VERSION = '2.0'

/** Maximum members allowed in a single gang. */
export const MAX_GANG_MEMBERS = 20

/** Maximum gangs a single user can belong to. */
export const MAX_USER_GANGS = 40

/** Hours before match start that the prediction window opens. */
export const PREDICTION_WINDOW_HOURS = 12

/** Prediction window duration in milliseconds (derived from PREDICTION_WINDOW_HOURS). */
export const PREDICTION_WINDOW_MS = PREDICTION_WINDOW_HOURS * 60 * 60 * 1000

/** Default deadline before match start (in minutes). */
export const DEFAULT_DEADLINE_MINS = 45

/**
 * Polling interval used by live match leaderboard + prediction reveal pollers.
 *
 * Less aggressive than the live scorecard poller (15s) because leaderboard
 * and reveal data change at most once per scenario resolution. Shared between
 * `use-match-leaderboard` and `use-match-predictions` so they stay in sync.
 */
export const LEADERBOARD_POLL_INTERVAL_MS = 30_000

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
