import { beforeEach, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn()
const mockRateLimit = vi.fn()
const mockTrackEvent = vi.fn()
const mockRevalidatePath = vi.fn()
const mockSignOut = vi.fn()
const mockRpc = vi.fn()
const mockCookieDelete = vi.fn()

const mockFrom = vi.fn()

/** Sentinel error thrown by the mocked `redirect()` to simulate Next.js behaviour. */
class RedirectError extends Error {
  url: string
  constructor(url: string) {
    super(`NEXT_REDIRECT: ${url}`)
    this.url = url
  }
}

function createQueryChain(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {}
  const handler = () => chain
  chain.select = vi.fn().mockImplementation(handler)
  chain.insert = vi.fn().mockImplementation(handler)
  chain.update = vi.fn().mockImplementation(handler)
  chain.delete = vi.fn().mockImplementation(handler)
  chain.eq = vi.fn().mockImplementation(handler)
  chain.neq = vi.fn().mockImplementation(handler)
  chain.in = vi.fn().mockImplementation(handler)
  chain.limit = vi.fn().mockImplementation(handler)
  chain.single = vi.fn().mockImplementation(() => resolvedValue)
  chain.maybeSingle = vi.fn().mockImplementation(() => resolvedValue)
  // For list/count queries, the chain itself resolves as a thenable
  chain.then = vi.fn().mockImplementation((resolve: (val: unknown) => void) => {
    resolve(resolvedValue)
  })
  return chain
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  })),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

vi.mock('@/lib/analytics/server', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}))

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    delete: (...args: unknown[]) => mockCookieDelete(...args),
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectError(url)
  }),
}))

// Import after mocks
const { updateDisplayName, deleteAccount } = await import('./profile')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface UpdateDisplayNameMockOpts {
  /** Result of the v2_profiles SELECT (current name) */
  currentProfile?: { data: unknown; error?: unknown }
  /** Result of the v2_gang_members SELECT (gang ids) */
  memberships?: { data: unknown; error?: unknown }
  /** Result of the cross-gang uniqueness check */
  collisions?: { data: unknown; error?: unknown }
  /** Result of the v2_profiles UPDATE */
  updateResult?: { error: unknown }
}

/**
 * Sets up mockFrom for updateDisplayName. The action issues, in order:
 *   1. v2_profiles  — SELECT current display_name (.single)
 *   2. v2_gang_members — SELECT all approved memberships
 *   3. v2_gang_members — SELECT cross-gang collisions (skipped when no gangs)
 *   4. v2_profiles  — UPDATE display_name
 */
function setupMocks(opts: UpdateDisplayNameMockOpts = {}) {
  const {
    currentProfile = { data: { display_name: 'Old Name' }, error: null },
    memberships = { data: [], error: null },
    collisions = { data: [], error: null },
    updateResult = { error: null },
  } = opts

  let profileCall = 0
  let memberCall = 0
  mockFrom.mockImplementation((table: string) => {
    if (table === 'v2_profiles') {
      profileCall++
      // First call = SELECT, second call = UPDATE
      if (profileCall === 1) return createQueryChain(currentProfile)
      return createQueryChain({ data: null, ...updateResult })
    }
    if (table === 'v2_gang_members') {
      memberCall++
      if (memberCall === 1) return createQueryChain(memberships)
      return createQueryChain(collisions)
    }
    return createQueryChain({ data: null, error: null })
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('updateDisplayName server action', () => {
  const mockUser = { id: 'user-123' }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 9 })
  })

  // ---- Auth ----

  test('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await updateDisplayName('New Name')

    expect(result).toEqual({ success: false, error: 'Not authenticated' })
    expect(mockRateLimit).not.toHaveBeenCalled()
    expect(mockFrom).not.toHaveBeenCalled()
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })

  // ---- Rate limit ----

  test('returns error when rate limited', async () => {
    setupMocks({
      currentProfile: { data: { display_name: 'Old Name' }, error: null },
    })
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    const result = await updateDisplayName('New Name')

    expect(result).toEqual({
      success: false,
      error: 'Too many requests. Try again later.',
    })
    expect(mockRateLimit).toHaveBeenCalledWith(
      'user-123',
      'update_display_name',
      { max: 10, windowSeconds: 3600 },
    )
    // Only the profile-fetch SELECT runs — no membership query, no update.
    expect(mockFrom).toHaveBeenCalledTimes(1)
    expect(mockFrom).toHaveBeenCalledWith('v2_profiles')
  })

  // ---- Validation ----

  test('returns validation error for name shorter than 2 chars', async () => {
    setupMocks({
      currentProfile: { data: { display_name: 'Old Name' }, error: null },
    })

    const result = await updateDisplayName('A')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/at least 2 characters/i)
    }
    // Profile fetch runs first for the no-op check, then validation fails.
    expect(mockFrom).toHaveBeenCalledTimes(1)
    expect(mockFrom).toHaveBeenCalledWith('v2_profiles')
  })

  test('returns validation error for name shorter than 2 chars after trim', async () => {
    setupMocks({
      currentProfile: { data: { display_name: 'Old Name' }, error: null },
    })

    const result = await updateDisplayName('  A  ')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/at least 2 characters/i)
    }
  })

  test('returns validation error for name longer than 30 chars', async () => {
    setupMocks({
      currentProfile: { data: { display_name: 'Old Name' }, error: null },
    })

    const result = await updateDisplayName('A'.repeat(31))

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/at most 30 characters/i)
    }
  })

  // ---- No-op short-circuit ----

  test('returns success without updating when trimmed name matches current name', async () => {
    setupMocks({
      currentProfile: { data: { display_name: 'Same Name' }, error: null },
    })

    const result = await updateDisplayName('  Same Name  ')

    expect(result).toEqual({ success: true })
    // Only the SELECT should have run — no membership query, no update,
    // no analytics, no revalidation.
    expect(mockFrom).toHaveBeenCalledTimes(1)
    expect(mockFrom).toHaveBeenCalledWith('v2_profiles')
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  test('no-op save skips the rate limiter so double-clicks do not burn the budget', async () => {
    setupMocks({
      currentProfile: { data: { display_name: 'Same Name' }, error: null },
    })

    const result = await updateDisplayName('Same Name')

    expect(result).toEqual({ success: true })
    // The rate limiter must not fire for a no-op save, otherwise a user
    // double-clicking Save with the same name would burn their hourly budget.
    expect(mockRateLimit).not.toHaveBeenCalled()
  })

  // ---- Profile lookup failure ----

  test('returns error when current-profile lookup fails', async () => {
    setupMocks({
      currentProfile: { data: null, error: { message: 'db error' } },
    })

    const result = await updateDisplayName('New Name')

    expect(result).toEqual({
      success: false,
      error: 'Failed to update display name. Please try again.',
    })
  })

  // ---- Memberships lookup failure ----

  test('returns error when membership lookup fails', async () => {
    setupMocks({
      currentProfile: { data: { display_name: 'Old Name' }, error: null },
      memberships: { data: null, error: { message: 'db error' } },
    })

    const result = await updateDisplayName('New Name')

    expect(result).toEqual({
      success: false,
      error: 'Failed to update display name. Please try again.',
    })
  })

  // ---- Cross-gang uniqueness ----

  test('returns error with single gang name when name collides in one gang', async () => {
    setupMocks({
      currentProfile: { data: { display_name: 'Old Name' }, error: null },
      memberships: {
        data: [{ gang_id: 'gang-aaa' }, { gang_id: 'gang-bbb' }],
        error: null,
      },
      collisions: {
        data: [
          {
            gang_id: 'gang-aaa',
            v2_gangs: { name: 'Mumbai Mavericks' },
            v2_profiles: { display_name: 'New Name' },
          },
        ],
        error: null,
      },
    })

    const result = await updateDisplayName('New Name')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Mumbai Mavericks')
      expect(result.error).toMatch(/already has/)
    }
    // No update, no analytics, no revalidation
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  test('returns error listing multiple gang names when name collides in multiple gangs', async () => {
    setupMocks({
      currentProfile: { data: { display_name: 'Old Name' }, error: null },
      memberships: {
        data: [{ gang_id: 'gang-aaa' }, { gang_id: 'gang-bbb' }],
        error: null,
      },
      collisions: {
        data: [
          {
            gang_id: 'gang-aaa',
            v2_gangs: { name: 'Mumbai Mavericks' },
            v2_profiles: { display_name: 'New Name' },
          },
          {
            gang_id: 'gang-bbb',
            v2_gangs: { name: 'Delhi Dynamos' },
            v2_profiles: { display_name: 'New Name' },
          },
        ],
        error: null,
      },
    })

    const result = await updateDisplayName('New Name')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Mumbai Mavericks')
      expect(result.error).toContain('Delhi Dynamos')
      expect(result.error).toMatch(/already have/)
    }
  })

  test('returns error when collision lookup fails', async () => {
    setupMocks({
      currentProfile: { data: { display_name: 'Old Name' }, error: null },
      memberships: { data: [{ gang_id: 'gang-aaa' }], error: null },
      collisions: { data: null, error: { message: 'db error' } },
    })

    const result = await updateDisplayName('New Name')

    expect(result).toEqual({
      success: false,
      error: 'Failed to update display name. Please try again.',
    })
  })

  // ---- Update failure ----

  test('returns error when update fails', async () => {
    setupMocks({
      currentProfile: { data: { display_name: 'Old Name' }, error: null },
      memberships: { data: [], error: null },
      updateResult: { error: { message: 'db error' } },
    })

    const result = await updateDisplayName('New Name')

    expect(result).toEqual({
      success: false,
      error: 'Failed to update display name. Please try again.',
    })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })

  // ---- Success cases ----

  test('updates name, revalidates, fires analytics, and returns success when user has no gangs', async () => {
    setupMocks({
      currentProfile: { data: { display_name: 'Old Name' }, error: null },
      memberships: { data: [], error: null },
    })

    const result = await updateDisplayName('  New Name  ')

    expect(result).toEqual({ success: true })
    // Layout-level revalidation forces the (app) layout — and therefore the
    // NavBar's cached display name — to re-render immediately.
    expect(mockRevalidatePath).toHaveBeenCalledWith('/profile', 'layout')
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'user-123',
      'display_name_updated',
      expect.objectContaining({ new_display_name: 'New Name' }),
    )
  })

  test('updates name and revalidates every gang page the user belongs to', async () => {
    setupMocks({
      currentProfile: { data: { display_name: 'Old Name' }, error: null },
      memberships: {
        data: [{ gang_id: 'gang-aaa' }, { gang_id: 'gang-bbb' }],
        error: null,
      },
      collisions: { data: [], error: null },
    })

    const result = await updateDisplayName('New Name')

    expect(result).toEqual({ success: true })
    // All revalidations happen at the layout level so NavBar, member lists,
    // and leaderboards pick up the new display name together.
    expect(mockRevalidatePath).toHaveBeenCalledWith('/profile', 'layout')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/group/gang-aaa', 'layout')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/group/gang-bbb', 'layout')
  })

  test('handles null current display_name (first save)', async () => {
    setupMocks({
      currentProfile: { data: { display_name: null }, error: null },
      memberships: { data: [], error: null },
    })

    const result = await updateDisplayName('First Name')

    expect(result).toEqual({ success: true })
    expect(mockTrackEvent).toHaveBeenCalled()
  })

  // ---- Order of operations ----

  test('checks auth before rate limit', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    await updateDisplayName('New Name')

    expect(mockGetUser).toHaveBeenCalled()
    expect(mockRateLimit).not.toHaveBeenCalled()
  })

  test('checks rate limit before validation', async () => {
    setupMocks({
      currentProfile: { data: { display_name: 'Old Name' }, error: null },
    })
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    const result = await updateDisplayName('A') // would fail validation

    // Rate limit fires (and short-circuits) before validation runs, so the
    // user sees a rate-limit error rather than a validation error.
    expect(mockRateLimit).toHaveBeenCalled()
    expect(result).toEqual({
      success: false,
      error: 'Too many requests. Try again later.',
    })
    // Only the profile-fetch SELECT ran; nothing past rate limit should
    // have touched the database.
    expect(mockFrom).toHaveBeenCalledTimes(1)
    expect(mockFrom).toHaveBeenCalledWith('v2_profiles')
  })

  test('no-op short-circuit runs before rate limit so repeat saves do not burn the budget', async () => {
    setupMocks({
      currentProfile: { data: { display_name: 'Same Name' }, error: null },
    })

    const result = await updateDisplayName('Same Name')

    expect(result).toEqual({ success: true })
    expect(mockRateLimit).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// deleteAccount
// ---------------------------------------------------------------------------

describe('deleteAccount server action', () => {
  const mockUser = { id: 'user-987', email: 'user@example.com' }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockRpc.mockResolvedValue({ error: null })
    mockSignOut.mockResolvedValue({ error: null })
  })

  // ---- Auth ----

  test('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await deleteAccount()

    expect(result).toEqual({ success: false, error: 'Not authenticated' })
    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockSignOut).not.toHaveBeenCalled()
    expect(mockCookieDelete).not.toHaveBeenCalled()
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })

  // ---- RPC failure ----

  test('returns error and does NOT sign out when the RPC fails', async () => {
    mockRpc.mockResolvedValue({
      error: { message: 'USER_NOT_FOUND' },
    })

    const result = await deleteAccount()

    expect(result).toEqual({
      success: false,
      error: 'Failed to delete account. Please try again.',
    })
    expect(mockRpc).toHaveBeenCalledWith('delete_account', {
      p_user_id: 'user-987',
    })
    // Critical: the RPC failed, so we must not sign the user out or
    // clear cookies — their account is still intact.
    expect(mockSignOut).not.toHaveBeenCalled()
    expect(mockCookieDelete).not.toHaveBeenCalled()
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })

  // ---- signOut failure ----

  test('completes redirect even when signOut fails after successful RPC', async () => {
    // R-001 + R-002: once the RPC succeeds the account is durably deleted.
    // A signOut failure from that point on is recoverable cleanup — the
    // action must still fire analytics, attempt cookie cleanup, and
    // redirect. It must NOT return `{ success: false }` and it must NOT
    // swallow the NEXT_REDIRECT throw.
    mockSignOut.mockResolvedValue({
      error: { message: 'session_not_found' },
    })
    // Silence the expected console.error emitted by the best-effort path
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const thrown = (await deleteAccount().catch(
      (e: unknown) => e,
    )) as unknown

    // Redirect still fires — not an ActionResult
    expect(thrown).toBeInstanceOf(RedirectError)
    expect((thrown as RedirectError).url).toBe('/')

    expect(mockRpc).toHaveBeenCalledWith('delete_account', {
      p_user_id: 'user-987',
    })
    expect(mockSignOut).toHaveBeenCalledOnce()
    // Analytics still fires — the "account deleted" event represents the
    // RPC succeeding, not the signOut.
    expect(mockTrackEvent).toHaveBeenCalledWith('user-987', 'account_deleted')
    // Cookies are still cleared on a best-effort basis.
    expect(mockCookieDelete).toHaveBeenCalledWith('bragg_onboarded')
    expect(mockCookieDelete).toHaveBeenCalledWith('bragg_terms_version')
    // And the signOut failure was logged.
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  test('completes redirect even when signOut throws after successful RPC', async () => {
    // Same contract as the resolved-error case, but for a thrown
    // exception from signOut (e.g. network failure after the session
    // handshake but before Supabase responds).
    mockSignOut.mockRejectedValue(new Error('network failure'))
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const thrown = (await deleteAccount().catch(
      (e: unknown) => e,
    )) as unknown

    expect(thrown).toBeInstanceOf(RedirectError)
    expect((thrown as RedirectError).url).toBe('/')

    expect(mockTrackEvent).toHaveBeenCalledWith('user-987', 'account_deleted')
    expect(mockCookieDelete).toHaveBeenCalledWith('bragg_onboarded')
    expect(mockCookieDelete).toHaveBeenCalledWith('bragg_terms_version')
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  // ---- Ordering ----

  test('fires analytics event immediately after RPC success, before signOut', async () => {
    // A call-order tracker proves analytics runs before signOut so a
    // flaky signOut cannot skew deletion metrics (R-001 + R-002).
    const calls: string[] = []
    mockRpc.mockImplementation(async () => {
      calls.push('rpc')
      return { error: null }
    })
    mockTrackEvent.mockImplementation(() => {
      calls.push('trackEvent')
    })
    mockSignOut.mockImplementation(async () => {
      calls.push('signOut')
      return { error: null }
    })
    mockCookieDelete.mockImplementation(() => {
      calls.push('cookieDelete')
    })

    const thrown = (await deleteAccount().catch(
      (e: unknown) => e,
    )) as unknown

    expect(thrown).toBeInstanceOf(RedirectError)

    // rpc → trackEvent → signOut → cookieDelete (twice)
    const rpcIdx = calls.indexOf('rpc')
    const trackEventIdx = calls.indexOf('trackEvent')
    const signOutIdx = calls.indexOf('signOut')
    expect(rpcIdx).toBeGreaterThanOrEqual(0)
    expect(trackEventIdx).toBeGreaterThan(rpcIdx)
    expect(signOutIdx).toBeGreaterThan(trackEventIdx)
    expect(calls).toEqual([
      'rpc',
      'trackEvent',
      'signOut',
      'cookieDelete',
      'cookieDelete',
    ])
  })

  // ---- Happy path ----

  test('deletes account, signs out, clears cookies, fires analytics, and redirects to /', async () => {
    // Order tracker — happy path must also fire analytics before signOut.
    const calls: string[] = []
    mockRpc.mockImplementation(async () => {
      calls.push('rpc')
      return { error: null }
    })
    mockTrackEvent.mockImplementation(() => {
      calls.push('trackEvent')
    })
    mockSignOut.mockImplementation(async () => {
      calls.push('signOut')
      return { error: null }
    })
    mockCookieDelete.mockImplementation(() => {
      calls.push('cookieDelete')
    })

    const error = (await deleteAccount().catch(
      (e: unknown) => e,
    )) as RedirectError

    expect(error).toBeInstanceOf(RedirectError)
    expect(error.url).toBe('/')

    // RPC called with the authenticated user id
    expect(mockRpc).toHaveBeenCalledWith('delete_account', {
      p_user_id: 'user-987',
    })
    // Sign out after the RPC succeeds
    expect(mockSignOut).toHaveBeenCalledOnce()
    // Cookies cleared
    expect(mockCookieDelete).toHaveBeenCalledWith('bragg_onboarded')
    expect(mockCookieDelete).toHaveBeenCalledWith('bragg_terms_version')
    // Analytics fires with the captured user id
    expect(mockTrackEvent).toHaveBeenCalledWith('user-987', 'account_deleted')

    // Analytics MUST fire before signOut — a flaky signOut cannot skew
    // deletion metrics.
    const trackEventIdx = calls.indexOf('trackEvent')
    const signOutIdx = calls.indexOf('signOut')
    expect(trackEventIdx).toBeGreaterThanOrEqual(0)
    expect(signOutIdx).toBeGreaterThan(trackEventIdx)
  })

  test('returns generic error when an unexpected exception is thrown', async () => {
    mockRpc.mockRejectedValue(new Error('network failure'))

    const result = await deleteAccount()

    expect(result).toEqual({
      success: false,
      error: 'Failed to delete account. Please try again.',
    })
    expect(mockSignOut).not.toHaveBeenCalled()
    expect(mockCookieDelete).not.toHaveBeenCalled()
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })
})
