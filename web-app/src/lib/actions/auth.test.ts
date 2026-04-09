import { beforeEach, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSignOut = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({
    auth: { signOut: mockSignOut },
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

/** Sentinel error thrown by the mocked `redirect()` to simulate Next.js behaviour. */
class RedirectError extends Error {
  url: string
  constructor(url: string) {
    super(`NEXT_REDIRECT: ${url}`)
    this.url = url
  }
}

// Import after mocks are set up
const { signOut } = await import('./auth')

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
