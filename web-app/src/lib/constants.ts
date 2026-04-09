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
