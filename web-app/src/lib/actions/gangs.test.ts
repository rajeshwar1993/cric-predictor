import { beforeEach, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn()
const mockRpc = vi.fn()
const mockRateLimit = vi.fn()
const mockTrackEvent = vi.fn()
const mockRevalidatePath = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
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

// Import after mocks are set up
const { createGang } = await import('./gangs')

// ---------------------------------------------------------------------------
// createGang
// ---------------------------------------------------------------------------

describe('createGang server action', () => {
  const mockUser = { id: 'user-123' }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 9 })
    mockRpc.mockResolvedValue({ data: 'gang-new-id', error: null })
  })

  // ---- Auth checks ----

  test('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await createGang('My Gang')

    expect(result).toEqual({ success: false, error: 'Not authenticated' })
    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })

  test('returns error when auth check fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'session expired' },
    })

    const result = await createGang('My Gang')

    expect(result).toEqual({ success: false, error: 'Not authenticated' })
  })

  // ---- Rate limiting ----

  test('returns error when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    const result = await createGang('My Gang')

    expect(result).toEqual({
      success: false,
      error: 'Too many requests. Try again later.',
    })
    expect(mockRateLimit).toHaveBeenCalledWith('user-123', 'create_gang', {
      max: 10,
      windowSeconds: 3600,
    })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  // ---- Validation ----

  test('returns validation error for name shorter than 3 chars', async () => {
    const result = await createGang('AB')

    expect(result).toEqual({
      success: false,
      error: 'Gang name must be 3\u201350 characters',
    })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  test('returns validation error for name shorter than 3 chars after trim', async () => {
    const result = await createGang('  AB  ')

    expect(result).toEqual({
      success: false,
      error: 'Gang name must be 3\u201350 characters',
    })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  test('returns validation error for name longer than 50 chars', async () => {
    const longName = 'A'.repeat(51)
    const result = await createGang(longName)

    expect(result).toEqual({
      success: false,
      error: 'Gang name must be 3\u201350 characters',
    })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  test('returns validation error for empty string', async () => {
    const result = await createGang('')

    expect(result).toEqual({
      success: false,
      error: 'Gang name must be 3\u201350 characters',
    })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  test('returns validation error for whitespace-only string', async () => {
    const result = await createGang('   ')

    expect(result).toEqual({
      success: false,
      error: 'Gang name must be 3\u201350 characters',
    })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  // ---- Success ----

  test('creates gang, revalidates, fires analytics, and returns gangId on success', async () => {
    const result = await createGang('Mumbai Mavericks')

    expect(result).toEqual({
      success: true,
      data: { gangId: 'gang-new-id', inviteCode: '' },
    })

    // RPC call
    expect(mockRpc).toHaveBeenCalledOnce()
    expect(mockRpc).toHaveBeenCalledWith('create_gang', {
      p_gang_name: 'Mumbai Mavericks',
      p_creator_id: 'user-123',
    })

    // Revalidation
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')

    // Analytics
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'user-123',
      'gang_created',
      expect.objectContaining({ gang_name: 'Mumbai Mavericks' }),
    )
  })

  test('trims gang name before passing to RPC', async () => {
    await createGang('  Trimmed Gang  ')

    expect(mockRpc).toHaveBeenCalledWith('create_gang', {
      p_gang_name: 'Trimmed Gang',
      p_creator_id: 'user-123',
    })
  })

  test('accepts exactly 3-character gang name', async () => {
    const result = await createGang('ABC')

    expect(result).toEqual({
      success: true,
      data: { gangId: 'gang-new-id', inviteCode: '' },
    })
  })

  test('accepts exactly 50-character gang name', async () => {
    const name = 'A'.repeat(50)
    const result = await createGang(name)

    expect(result).toEqual({
      success: true,
      data: { gangId: 'gang-new-id', inviteCode: '' },
    })
  })

  // ---- Error handling ----

  test('returns max gangs error when RPC raises MAX_GANGS_REACHED', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'MAX_GANGS_REACHED', code: 'P0001' },
    })

    const result = await createGang('My Gang')

    expect(result).toEqual({
      success: false,
      error: "You've reached the maximum of 40 gangs.",
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  test('returns invite code error when RPC raises INVITE_CODE_GENERATION_FAILED', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'INVITE_CODE_GENERATION_FAILED', code: 'P0001' },
    })

    const result = await createGang('My Gang')

    expect(result).toEqual({
      success: false,
      error: 'Unable to generate invite code. Please try again.',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })

  test('returns generic error for other RPC errors', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'unexpected error', code: '42P01' },
    })

    const result = await createGang('My Gang')

    expect(result).toEqual({
      success: false,
      error: 'Failed to create gang. Please try again.',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })

  // ---- Order of operations ----

  test('calls auth check before rate limit', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    await createGang('My Gang')

    expect(mockGetUser).toHaveBeenCalledOnce()
    expect(mockRateLimit).not.toHaveBeenCalled()
  })

  test('calls rate limit before RPC', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    await createGang('My Gang')

    expect(mockRateLimit).toHaveBeenCalledOnce()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  test('does not revalidate or fire analytics on RPC error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'db error' },
    })

    await createGang('My Gang')

    expect(mockRevalidatePath).not.toHaveBeenCalled()
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })
})
