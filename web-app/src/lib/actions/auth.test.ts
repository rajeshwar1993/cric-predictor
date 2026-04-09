import { beforeEach, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSignOut = vi.fn()
const mockSignInWithOtp = vi.fn()
const mockDelete = vi.fn()
const mockTrackEvent = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({
    auth: { signOut: mockSignOut, signInWithOtp: mockSignInWithOtp },
  }),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    delete: mockDelete,
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectError(url)
  }),
}))

vi.mock('@/lib/analytics/server', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}))

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_APP_URL: 'https://bragg.app',
  },
}))

/** Sentinel error thrown by the mocked `redirect()` to simulate Next.js behaviour. */
class RedirectError extends Error {
  url: string
  constructor(url: string) {
    super(`NEXT_REDIRECT: ${url}`)
    this.url = url
  }
}

// Import after mocks are set up
const { signOut, sendMagicLink } = await import('./auth')

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------

describe('signOut server action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignOut.mockResolvedValue({ error: null })
  })

  test('signs out, clears cookies, and redirects to /', async () => {
    const error = await signOut().catch((e: unknown) => e) as RedirectError

    expect(error).toBeInstanceOf(RedirectError)
    expect(error.url).toBe('/')
    expect(mockSignOut).toHaveBeenCalledOnce()
    expect(mockDelete).toHaveBeenCalledWith('bragg_onboarded')
    expect(mockDelete).toHaveBeenCalledWith('bragg_terms_version')
  })

  test('returns error when supabase signOut fails', async () => {
    mockSignOut.mockResolvedValue({
      error: { message: 'session_not_found' },
    })

    const result = await signOut()

    expect(result).toEqual({ success: false, error: 'session_not_found' })
    // Cookies should NOT be deleted when signOut itself fails
    expect(mockDelete).not.toHaveBeenCalled()
  })

  test('returns generic error when an unexpected exception is thrown', async () => {
    mockSignOut.mockRejectedValue(new Error('network failure'))

    const result = await signOut()

    expect(result).toEqual({
      success: false,
      error: 'Failed to sign out. Please try again.',
    })
    expect(mockDelete).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// sendMagicLink
// ---------------------------------------------------------------------------

describe('sendMagicLink server action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignInWithOtp.mockResolvedValue({ error: null })
  })

  test('returns success for a valid email', async () => {
    const result = await sendMagicLink('user@example.com')

    expect(result).toEqual({ success: true })
    expect(mockSignInWithOtp).toHaveBeenCalledOnce()
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      options: {
        emailRedirectTo: 'https://bragg.app/auth/callback',
      },
    })
  })

  test('constructs callback URL with redirectTo when provided', async () => {
    const result = await sendMagicLink('user@example.com', '/dashboard')

    expect(result).toEqual({ success: true })
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      options: {
        emailRedirectTo: 'https://bragg.app/auth/callback?redirectTo=%2Fdashboard',
      },
    })
  })

  test('sanitizes protocol-relative redirectTo to prevent open redirect', async () => {
    const result = await sendMagicLink('user@example.com', '//evil.com')

    expect(result).toEqual({ success: true })
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      options: {
        emailRedirectTo: 'https://bragg.app/auth/callback?redirectTo=%2Fdashboard',
      },
    })
  })

  test('sanitizes absolute URL redirectTo to prevent open redirect', async () => {
    const result = await sendMagicLink('user@example.com', 'https://evil.com')

    expect(result).toEqual({ success: true })
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      options: {
        emailRedirectTo: 'https://bragg.app/auth/callback?redirectTo=%2Fdashboard',
      },
    })
  })

  test('sanitizes backslash-based redirectTo to prevent open redirect', async () => {
    const result = await sendMagicLink('user@example.com', '/\\evil.com')

    expect(result).toEqual({ success: true })
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      options: {
        emailRedirectTo: 'https://bragg.app/auth/callback?redirectTo=%2Fdashboard',
      },
    })
  })

  test('returns validation error for empty email', async () => {
    const result = await sendMagicLink('')

    expect(result).toEqual({ success: false, error: 'Email is required' })
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })

  test('returns validation error for invalid email format', async () => {
    const result = await sendMagicLink('not-an-email')

    expect(result).toEqual({ success: false, error: 'Please enter a valid email address' })
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })

  test('returns rate limit error when Supabase returns 429', async () => {
    mockSignInWithOtp.mockResolvedValue({
      error: { status: 429, message: 'Rate limit exceeded' },
    })

    const result = await sendMagicLink('user@example.com')

    expect(result).toEqual({
      success: false,
      error: 'Too many attempts. Please try again later.',
    })
  })

  test('returns generic error for other Supabase errors', async () => {
    mockSignInWithOtp.mockResolvedValue({
      error: { status: 500, message: 'Internal server error' },
    })

    const result = await sendMagicLink('user@example.com')

    expect(result).toEqual({
      success: false,
      error: 'Failed to send magic link. Please try again.',
    })
  })

  test('fires MAGIC_LINK_REQUESTED analytics event on success', async () => {
    await sendMagicLink('user@example.com')

    expect(mockTrackEvent).toHaveBeenCalledOnce()
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.any(String),
      'magic_link_requested',
      expect.objectContaining({ email_hash: expect.any(String) }),
    )
  })

  test('does not fire analytics event on validation error', async () => {
    await sendMagicLink('not-an-email')

    expect(mockTrackEvent).not.toHaveBeenCalled()
  })

  test('does not fire analytics event on Supabase error', async () => {
    mockSignInWithOtp.mockResolvedValue({
      error: { status: 500, message: 'Internal server error' },
    })

    await sendMagicLink('user@example.com')

    expect(mockTrackEvent).not.toHaveBeenCalled()
  })
})
