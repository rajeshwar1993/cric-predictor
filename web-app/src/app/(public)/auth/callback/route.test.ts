import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be defined before importing the module under test
// ---------------------------------------------------------------------------

// Mock `server-only` — this module throws at import time in non-server envs
vi.mock('server-only', () => ({}))

const mockExchangeCodeForSession = vi.fn()
const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
      getUser: () => mockGetUser(),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}))

const mockTrackEvent = vi.fn()
vi.mock('@/lib/analytics/server', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}))

vi.mock('@/lib/analytics/events', () => ({
  ANALYTICS_EVENTS: {
    AUTH_CALLBACK_SUCCESS: 'auth_callback_success',
    AUTH_CALLBACK_FAILURE: 'auth_callback_failure',
  },
}))

// Import after mocks are set up
import { GET } from './route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/auth/callback')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url)
}

const TEST_USER_ID = 'user-123-abc'

function setupMocks(overrides: {
  exchangeError?: { message: string } | null
  user?: { id: string } | null
  profile?: {
    onboarding_completed: boolean
    terms_version: string | null
    is_deleted: boolean
  } | null
  updateResult?: { error: null }
} = {}) {
  const {
    exchangeError = null,
    user = { id: TEST_USER_ID },
    profile = { onboarding_completed: true, terms_version: '2.0', is_deleted: false },
    updateResult = { error: null },
  } = overrides

  mockExchangeCodeForSession.mockResolvedValue({
    data: exchangeError ? null : { session: {} },
    error: exchangeError,
  })

  mockGetUser.mockResolvedValue({
    data: { user },
  })

  // Chain: .from().select().eq().single()
  const singleMock = vi.fn().mockResolvedValue({ data: profile, error: null })
  const eqMock = vi.fn().mockReturnValue({ single: singleMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

  // For update: .from().update().eq()
  const updateEqMock = vi.fn().mockResolvedValue(updateResult)
  const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock })

  mockFrom.mockImplementation((table: string) => {
    // Return appropriate chain based on call order
    // First call is SELECT (profile lookup), second is UPDATE (restore)
    if (table === 'v2_profiles') {
      // We need to distinguish between select and update calls.
      // Use the returned object: if .select() is called, it's the lookup;
      // if .update() is called, it's the restore.
      return {
        select: selectMock,
        update: updateMock,
      }
    }
    return { select: selectMock, update: updateMock }
  })

  return { singleMock, eqMock, selectMock, updateMock, updateEqMock }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /login?error=missing_code when no code param', async () => {
    const request = makeRequest({})
    const response = await GET(request)

    expect(response.status).toBe(307)
    const redirectUrl = new URL(response.headers.get('location')!)
    expect(redirectUrl.pathname).toBe('/login')
    expect(redirectUrl.searchParams.get('error')).toBe('missing_code')

    // Should fire failure analytics
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'anonymous',
      'auth_callback_failure',
      expect.objectContaining({ reason: 'missing_code' }),
    )
  })

  it('redirects to /login?error=auth_callback_failed when code exchange fails', async () => {
    setupMocks({ exchangeError: { message: 'Invalid code' } })

    const request = makeRequest({ code: 'invalid-code' })
    const response = await GET(request)

    expect(response.status).toBe(307)
    const redirectUrl = new URL(response.headers.get('location')!)
    expect(redirectUrl.pathname).toBe('/login')
    expect(redirectUrl.searchParams.get('error')).toBe('auth_callback_failed')

    expect(mockTrackEvent).toHaveBeenCalledWith(
      'anonymous',
      'auth_callback_failure',
      expect.objectContaining({ reason: 'exchange_failed' }),
    )
  })

  it('redirects to /login?error=auth_callback_failed when getUser returns null after successful exchange', async () => {
    setupMocks({ user: null })

    const request = makeRequest({ code: 'valid-code' })
    const response = await GET(request)

    expect(response.status).toBe(307)
    const redirectUrl = new URL(response.headers.get('location')!)
    expect(redirectUrl.pathname).toBe('/login')
    expect(redirectUrl.searchParams.get('error')).toBe('auth_callback_failed')

    expect(mockTrackEvent).toHaveBeenCalledWith(
      'anonymous',
      'auth_callback_failure',
      expect.objectContaining({ reason: 'no_user' }),
    )
  })

  it('sets cookies and redirects to /dashboard for onboarded user', async () => {
    setupMocks({
      profile: { onboarding_completed: true, terms_version: '2.0', is_deleted: false },
    })

    const request = makeRequest({ code: 'valid-code' })
    const response = await GET(request)

    expect(response.status).toBe(307)
    const redirectUrl = new URL(response.headers.get('location')!)
    expect(redirectUrl.pathname).toBe('/dashboard')

    // Check cookies were set
    const setCookieHeaders = response.headers.getSetCookie()
    const onboardedCookie = setCookieHeaders.find((c) => c.startsWith('bragg_onboarded='))
    const termsCookie = setCookieHeaders.find((c) => c.startsWith('bragg_terms_version='))

    expect(onboardedCookie).toBeDefined()
    expect(onboardedCookie).toContain('true')
    expect(onboardedCookie).toContain('HttpOnly')
    expect(termsCookie).toBeDefined()
    expect(termsCookie).toContain('2.0')
    expect(termsCookie).toContain('HttpOnly')

    // Should fire success analytics
    expect(mockTrackEvent).toHaveBeenCalledWith(
      TEST_USER_ID,
      'auth_callback_success',
      expect.objectContaining({ is_onboarded: true }),
    )
  })

  it('redirects new (not-onboarded) user to /onboarding and clears stale cookie', async () => {
    setupMocks({
      profile: { onboarding_completed: false, terms_version: null, is_deleted: false },
    })

    const request = makeRequest({ code: 'valid-code', redirectTo: '/dashboard' })
    const response = await GET(request)

    expect(response.status).toBe(307)
    const redirectUrl = new URL(response.headers.get('location')!)
    expect(redirectUrl.pathname).toBe('/onboarding')
    expect(redirectUrl.searchParams.get('redirectTo')).toBe('/dashboard')

    // bragg_onboarded cookie should be deleted (set with max-age=0 or expires in the past)
    const setCookieHeaders = response.headers.getSetCookie()
    const onboardedCookie = setCookieHeaders.find((c) => c.startsWith('bragg_onboarded='))
    // When cookies.delete() is called, the cookie value is set to empty with max-age=0
    expect(onboardedCookie).toBeDefined()

    // Success analytics should still fire
    expect(mockTrackEvent).toHaveBeenCalledWith(
      TEST_USER_ID,
      'auth_callback_success',
      expect.objectContaining({ is_onboarded: false }),
    )
  })

  it('restores a deleted user profile before checking onboarding', async () => {
    const { updateMock, updateEqMock } = setupMocks({
      profile: { onboarding_completed: true, terms_version: '2.0', is_deleted: true },
    })

    const request = makeRequest({ code: 'valid-code' })
    const response = await GET(request)

    // Should have called update to restore the profile
    expect(updateMock).toHaveBeenCalledWith({ is_deleted: false, deleted_at: null })
    expect(updateEqMock).toHaveBeenCalledWith('id', TEST_USER_ID)

    // Should still redirect normally (as onboarded)
    expect(response.status).toBe(307)
    const redirectUrl = new URL(response.headers.get('location')!)
    expect(redirectUrl.pathname).toBe('/dashboard')
  })

  it('sanitizes redirectTo param to prevent open redirects', async () => {
    setupMocks({
      profile: { onboarding_completed: true, terms_version: '2.0', is_deleted: false },
    })

    // Try an absolute URL (should be sanitized to /dashboard)
    const request = makeRequest({ code: 'valid-code', redirectTo: 'https://evil.com/steal' })
    const response = await GET(request)

    const redirectUrl = new URL(response.headers.get('location')!)
    expect(redirectUrl.pathname).toBe('/dashboard')
    expect(redirectUrl.hostname).toBe('localhost')
  })

  it('sanitizes protocol-relative redirect URLs', async () => {
    setupMocks({
      profile: { onboarding_completed: true, terms_version: '2.0', is_deleted: false },
    })

    const request = makeRequest({ code: 'valid-code', redirectTo: '//evil.com' })
    const response = await GET(request)

    const redirectUrl = new URL(response.headers.get('location')!)
    expect(redirectUrl.pathname).toBe('/dashboard')
  })

  it('treats missing profile as not-onboarded', async () => {
    setupMocks({ profile: null })

    const request = makeRequest({ code: 'valid-code' })
    const response = await GET(request)

    expect(response.status).toBe(307)
    const redirectUrl = new URL(response.headers.get('location')!)
    expect(redirectUrl.pathname).toBe('/onboarding')
  })

  it('preserves a valid custom redirectTo for onboarded user', async () => {
    setupMocks({
      profile: { onboarding_completed: true, terms_version: '2.0', is_deleted: false },
    })

    const request = makeRequest({ code: 'valid-code', redirectTo: '/gang/my-gang' })
    const response = await GET(request)

    const redirectUrl = new URL(response.headers.get('location')!)
    expect(redirectUrl.pathname).toBe('/gang/my-gang')
  })

  it('redirects to /accept-terms when onboarded user has stale terms version', async () => {
    setupMocks({
      profile: { onboarding_completed: true, terms_version: '1.0', is_deleted: false },
    })

    const request = makeRequest({ code: 'valid-code' })
    const response = await GET(request)

    expect(response.status).toBe(307)
    const redirectUrl = new URL(response.headers.get('location')!)
    expect(redirectUrl.pathname).toBe('/accept-terms')

    // Should set onboarded cookie but NOT terms cookie (stale)
    const setCookieHeaders = response.headers.getSetCookie()
    const onboardedCookie = setCookieHeaders.find((c) => c.startsWith('bragg_onboarded='))
    const termsCookie = setCookieHeaders.find((c) => c.startsWith('bragg_terms_version='))

    expect(onboardedCookie).toBeDefined()
    expect(termsCookie).toBeUndefined()
  })
})
