/**
 * Sanitize a redirect URL to prevent open-redirect attacks.
 * Only relative paths starting with a single `/` are allowed.
 */
export function sanitizeRedirect(url: string): string {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\')) {
    return '/dashboard'
  }
  return url
}
