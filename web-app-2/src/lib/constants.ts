/**
 * Current terms of service version.
 * Bump the major number when terms change in a way that requires re-acceptance.
 * Minor bumps (e.g., 1.0 → 1.1) do not gate users.
 */
export const CURRENT_TERMS_VERSION = '1.0' as const

/**
 * Cookie names used across the app.
 */
export const COOKIES = {
  ONBOARDED: 'bragg_onboarded',
  TERMS_VERSION: 'bragg_terms_version',
  POST_ONBOARD_REDIRECT: 'bragg_post_onboard_redirect',
} as const

/**
 * Cookie options for long-lived cookies (1 year).
 */
export const LONG_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 365, // 1 year
}

/**
 * Cookie options for short-lived cookies (1 hour).
 */
export const SHORT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60, // 1 hour
}
