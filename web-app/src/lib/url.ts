/**
 * Sanitize a redirect URL to prevent open-redirect attacks.
 * Only relative paths starting with a single `/` are allowed.
 * Rejects protocol-relative URLs, backslash variants, and CRLF/null-byte injection.
 */
export function sanitizeRedirect(url: string): string {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\')) {
    return '/dashboard'
  }
  // Reject CRLF injection and null bytes (both raw and percent-encoded)
  if (/[\x00\r\n]|%0[0da]/i.test(url)) {
    return '/dashboard'
  }
  return url
}
