import { beforeEach, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn()
const mockRpc = vi.fn()
const mockRateLimit = vi.fn()
const mockTrackEvent = vi.fn()
const mockRevalidatePath = vi.fn()

// Chainable query builder mock for .from().select().eq().maybeSingle(), etc.
const mockFrom = vi.fn()

function createQueryChain(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {}
  const handler = () => chain
  chain.select = vi.fn().mockImplementation(handler)
  chain.insert = vi.fn().mockImplementation(handler)
  chain.update = vi.fn().mockImplementation(handler)
  chain.delete = vi.fn().mockImplementation(handler)
  chain.eq = vi.fn().mockImplementation(handler)
  chain.neq = vi.fn().mockImplementation(handler)
  chain.limit = vi.fn().mockImplementation(handler)
  chain.single = vi.fn().mockImplementation(() => resolvedValue)
  chain.maybeSingle = vi.fn().mockImplementation(() => resolvedValue)
  // For count queries, the final result is the chain itself resolved as a promise
  chain.then = vi.fn().mockImplementation((resolve: (val: unknown) => void) => {
    resolve(resolvedValue)
  })
  return chain
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
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

// Import after mocks are set up
const { createGang, joinGangByCode } = await import('./gangs')

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

// ---------------------------------------------------------------------------
// joinGangByCode
// ---------------------------------------------------------------------------

describe('joinGangByCode server action', () => {
  const mockUser = { id: 'user-123' }
  const mockGang = {
    id: 'gang-abc',
    name: 'Test Gang',
    auto_accept: true,
    is_deleted: false,
    created_by: 'admin-456',
  }

  /**
   * Helper: sets up the mockFrom chain for joinGangByCode calls.
   * The action calls .from() for different tables in sequence:
   * 1. v2_gang_members — existing membership check (.maybeSingle)
   * 2. v2_gang_members — approved count in gang (.select with count)
   * 3. v2_gang_members — user total gang count (.select with count)
   * 4. v2_profiles — user display name (.single)
   * 5. v2_gang_members — display name dup check (.select)
   * 6. v2_gang_members — insert/update member
   * 7. v2_gang_members — admin lookup (.single)
   * 8. v2_notifications — insert notification
   */
  function setupFromMock(overrides?: {
    existingMember?: { data: unknown }
    approvedCount?: number
    userGangCount?: number
    profile?: { data: unknown }
    duplicateName?: { data: unknown[] }
    upsertResult?: { error: unknown }
    adminMember?: { data: unknown }
    notificationResult?: { error: unknown }
  }) {
    const opts = {
      existingMember: { data: null },
      approvedCount: 5,
      userGangCount: 3,
      profile: { data: { display_name: 'TestUser' } },
      duplicateName: { data: [] },
      upsertResult: { error: null },
      adminMember: { data: { user_id: 'admin-456' } },
      notificationResult: { error: null },
      ...overrides,
    }

    let callIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gang_members') {
        callIndex++
        // Call 1: existing membership check
        if (callIndex === 1) {
          return createQueryChain(opts.existingMember)
        }
        // Call 2: approved member count for gang
        if (callIndex === 2) {
          return createQueryChain({ count: opts.approvedCount, data: null, error: null })
        }
        // Call 3: user total gang count
        if (callIndex === 3) {
          return createQueryChain({ count: opts.userGangCount, data: null, error: null })
        }
        // Call 5: display name duplicate check
        if (callIndex === 5) {
          return createQueryChain(opts.duplicateName)
        }
        // Call 6: insert or update member
        if (callIndex === 6) {
          return createQueryChain(opts.upsertResult)
        }
        // Call 7: admin lookup
        if (callIndex === 7) {
          return createQueryChain(opts.adminMember)
        }
      }
      if (table === 'v2_profiles') {
        // Call 4: profile display name
        callIndex++
        return createQueryChain(opts.profile)
      }
      if (table === 'v2_notifications') {
        return createQueryChain(opts.notificationResult)
      }
      return createQueryChain({ data: null })
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 19 })
    mockRpc.mockResolvedValue({ data: [mockGang], error: null })
  })

  // ---- Auth checks ----

  test('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await joinGangByCode('XK42AB')

    expect(result).toEqual({ success: false, error: 'Not authenticated' })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  // ---- Rate limiting ----

  test('returns error when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    const result = await joinGangByCode('XK42AB')

    expect(result).toEqual({
      success: false,
      error: 'Too many requests. Try again later.',
    })
    expect(mockRateLimit).toHaveBeenCalledWith('user-123', 'join_gang', {
      max: 20,
      windowSeconds: 3600,
    })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  // ---- Validation ----

  test('returns error for empty invite code', async () => {
    const result = await joinGangByCode('')

    expect(result).toEqual({ success: false, error: 'Invalid invite code' })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  test('returns error for invite code shorter than 6 chars', async () => {
    const result = await joinGangByCode('ABC12')

    expect(result).toEqual({ success: false, error: 'Invalid invite code' })
  })

  test('returns error for invite code longer than 6 chars', async () => {
    const result = await joinGangByCode('ABC1234')

    expect(result).toEqual({ success: false, error: 'Invalid invite code' })
  })

  test('returns error for lowercase invite code', async () => {
    const result = await joinGangByCode('abc123')

    expect(result).toEqual({ success: false, error: 'Invalid invite code' })
  })

  test('returns error for invite code with special chars', async () => {
    const result = await joinGangByCode('AB-C12')

    expect(result).toEqual({ success: false, error: 'Invalid invite code' })
  })

  // ---- Gang lookup ----

  test('returns error when invite code does not match any gang', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const result = await joinGangByCode('ZZZZZZ')

    expect(result).toEqual({ success: false, error: 'Invalid invite code' })
  })

  test('returns error when RPC fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'db error' } })

    const result = await joinGangByCode('XK42AB')

    expect(result).toEqual({ success: false, error: 'Invalid invite code' })
  })

  test('returns error when gang is deleted', async () => {
    mockRpc.mockResolvedValue({
      data: [{ ...mockGang, is_deleted: true }],
      error: null,
    })

    const result = await joinGangByCode('XK42AB')

    expect(result).toEqual({ success: false, error: 'This gang no longer exists' })
  })

  // ---- Membership status checks ----

  test('returns already-a-member error when status is approved', async () => {
    setupFromMock({
      existingMember: { data: { status: 'approved', is_blocked: false } },
    })

    const result = await joinGangByCode('XK42AB')

    expect(result).toEqual({
      success: false,
      error: `already_a_member:${mockGang.id}`,
    })
  })

  test('returns pending error when status is pending', async () => {
    setupFromMock({
      existingMember: { data: { status: 'pending', is_blocked: false } },
    })

    const result = await joinGangByCode('XK42AB')

    expect(result).toEqual({
      success: false,
      error: 'Your request is pending admin approval',
    })
  })

  test('returns blocked error when user is blocked', async () => {
    setupFromMock({
      existingMember: { data: { status: 'removed', is_blocked: true } },
    })

    const result = await joinGangByCode('XK42AB')

    expect(result).toEqual({
      success: false,
      error: 'You are not able to join this gang',
    })
  })

  // ---- Gang full ----

  test('returns error when gang has 20 approved members', async () => {
    setupFromMock({ approvedCount: 20 })

    const result = await joinGangByCode('XK42AB')

    expect(result).toEqual({
      success: false,
      error: 'This gang has reached its maximum of 20 members',
    })
  })

  // ---- User gang limit ----

  test('returns error when user has 40 gangs', async () => {
    setupFromMock({ userGangCount: 40 })

    const result = await joinGangByCode('XK42AB')

    expect(result).toEqual({
      success: false,
      error: "You've reached the maximum of 40 gangs.",
    })
  })

  // ---- Display name uniqueness ----

  test('returns error when display name is duplicate in gang', async () => {
    setupFromMock({
      duplicateName: { data: [{ user_id: 'other-user' }] },
    })

    const result = await joinGangByCode('XK42AB')

    expect(result).toEqual({
      success: false,
      error: 'A member with your display name already exists in this gang. Please update your display name first.',
    })
  })

  // ---- Success: auto-accept ----

  test('returns approved status when gang has auto_accept enabled', async () => {
    setupFromMock()

    const result = await joinGangByCode('XK42AB')

    expect(result).toEqual({
      success: true,
      data: { gangId: mockGang.id, status: 'approved' },
    })
  })

  test('fires JOIN_REQUESTED analytics event on success', async () => {
    setupFromMock()

    await joinGangByCode('XK42AB')

    expect(mockTrackEvent).toHaveBeenCalledWith(
      'user-123',
      'join_requested',
      expect.objectContaining({
        gang_id: mockGang.id,
        status: 'approved',
        invite_code: 'XK42AB',
      }),
    )
  })

  test('revalidates dashboard and gang page on success', async () => {
    setupFromMock()

    await joinGangByCode('XK42AB')

    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/group/${mockGang.id}`)
  })

  // ---- Success: pending (auto_accept off) ----

  test('returns pending status when gang has auto_accept disabled', async () => {
    mockRpc.mockResolvedValue({
      data: [{ ...mockGang, auto_accept: false }],
      error: null,
    })
    setupFromMock()

    const result = await joinGangByCode('XK42AB')

    expect(result).toEqual({
      success: true,
      data: { gangId: mockGang.id, status: 'pending' },
    })
  })

  // ---- Rejoin flows ----

  test('allows rejoin when previous status was rejected', async () => {
    setupFromMock({
      existingMember: { data: { status: 'rejected', is_blocked: false } },
    })

    const result = await joinGangByCode('XK42AB')

    expect(result).toEqual({
      success: true,
      data: { gangId: mockGang.id, status: 'approved' },
    })
  })

  test('allows rejoin when previous status was left', async () => {
    setupFromMock({
      existingMember: { data: { status: 'left', is_blocked: false } },
    })

    const result = await joinGangByCode('XK42AB')

    expect(result).toEqual({
      success: true,
      data: { gangId: mockGang.id, status: 'approved' },
    })
  })

  test('allows rejoin when previous status was removed and not blocked', async () => {
    setupFromMock({
      existingMember: { data: { status: 'removed', is_blocked: false } },
    })

    const result = await joinGangByCode('XK42AB')

    expect(result).toEqual({
      success: true,
      data: { gangId: mockGang.id, status: 'approved' },
    })
  })

  // ---- Order of operations ----

  test('calls auth before rate limit', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    await joinGangByCode('XK42AB')

    expect(mockGetUser).toHaveBeenCalledOnce()
    expect(mockRateLimit).not.toHaveBeenCalled()
  })

  test('calls rate limit before RPC', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    await joinGangByCode('XK42AB')

    expect(mockRateLimit).toHaveBeenCalledOnce()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  test('calls RPC with correct parameters', async () => {
    setupFromMock()

    await joinGangByCode('XK42AB')

    expect(mockRpc).toHaveBeenCalledWith('get_gang_by_invite_code', {
      p_invite_code: 'XK42AB',
    })
  })
})
