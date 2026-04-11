import { beforeEach, describe, expect, test, vi } from 'vitest'

import { ANALYTICS_EVENTS } from '@/lib/analytics/events'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('server-only', () => ({}))

const mockGetUser = vi.fn()
const mockRpc = vi.fn()
const mockRateLimit = vi.fn()
const mockTrackEvent = vi.fn()
const mockCaptureServerError = vi.fn()
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
  captureServerError: (...args: unknown[]) => mockCaptureServerError(...args),
}))

const mockWithTiming = vi.fn(
  async <T,>(_actionName: string, _userId: string, fn: () => Promise<T>): Promise<T> => {
    return fn()
  },
)

vi.mock('@/lib/analytics/timing', () => ({
  withTiming: (...args: unknown[]) =>
    mockWithTiming(
      args[0] as string,
      args[1] as string,
      args[2] as () => Promise<unknown>,
    ),
}))

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

// Import after mocks are set up
const {
  createGang,
  joinGangByCode,
  approveJoinRequest,
  rejectJoinRequest,
  leaveGang,
  updateGangName,
  updateAutoAccept,
  updatePredictionDeadline,
  deleteGang,
  removeMember,
  blockMember,
  unblockMember,
} = await import('./gangs')

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

    // Wrapped in withTiming with the camelCase action name + resolved user id
    expect(mockWithTiming).toHaveBeenCalledWith(
      'createGang',
      'user-123',
      expect.any(Function),
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
    // Failure path forwards the error to PostHog with the action source
    expect(mockCaptureServerError).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({ message: 'unexpected error' }),
      expect.objectContaining({ source: 'createGang' }),
    )
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
    // The join flow calls `.rpc()` twice: first to look up the gang by
    // invite code, then to insert the admin notification. Route by
    // function name so both paths resolve cleanly.
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'get_gang_by_invite_code') {
        return Promise.resolve({ data: [mockGang], error: null })
      }
      if (
        fn === 'create_new_member_notification' ||
        fn === 'create_join_request_notification'
      ) {
        return Promise.resolve({ data: null, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })
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

  // ---- Rejoin: update payload correctness ----

  test('clears departed_at and sets requested_at on rejoin', async () => {
    const updateChain = createQueryChain({ error: null })
    let memberCallIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gang_members') {
        memberCallIndex++
        if (memberCallIndex === 1) return createQueryChain({ data: { status: 'left', is_blocked: false } })
        if (memberCallIndex === 2) return createQueryChain({ count: 5, data: null, error: null })
        if (memberCallIndex === 3) return createQueryChain({ count: 3, data: null, error: null })
        if (memberCallIndex === 5) return createQueryChain({ data: [] })
        if (memberCallIndex === 6) return updateChain
        if (memberCallIndex === 7) return createQueryChain({ data: { user_id: 'admin-456' } })
      }
      if (table === 'v2_profiles') {
        memberCallIndex++
        return createQueryChain({ data: { display_name: 'TestUser' } })
      }
      if (table === 'v2_notifications') return createQueryChain({ error: null })
      return createQueryChain({ data: null })
    })

    await joinGangByCode('XK42AB')

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        departed_at: null,
        requested_at: expect.any(String),
        status: 'approved',
        approved_at: expect.any(String),
      }),
    )
  })

  // ---- Notification type correctness ----

  test('sends new_member notification to admin on auto-accept', async () => {
    let memberCallIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gang_members') {
        memberCallIndex++
        if (memberCallIndex === 1) return createQueryChain({ data: null })
        if (memberCallIndex === 2) return createQueryChain({ count: 5, data: null, error: null })
        if (memberCallIndex === 3) return createQueryChain({ count: 3, data: null, error: null })
        if (memberCallIndex === 5) return createQueryChain({ data: [] })
        if (memberCallIndex === 6) return createQueryChain({ error: null })
        if (memberCallIndex === 7) return createQueryChain({ data: { user_id: 'admin-456' } })
      }
      if (table === 'v2_profiles') {
        memberCallIndex++
        return createQueryChain({ data: { display_name: 'TestUser' } })
      }
      return createQueryChain({ data: null })
    })

    await joinGangByCode('XK42AB')

    // Verify the SECURITY DEFINER RPC was called for the new_member path.
    // The display name is resolved server-side from v2_profiles inside the
    // RPC — the client must not pass it.
    expect(mockRpc).toHaveBeenCalledWith('create_new_member_notification', {
      p_admin_user_id: 'admin-456',
      p_gang_id: mockGang.id,
    })
  })

  test('sends join_request notification to admin when auto-accept is off', async () => {
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'get_gang_by_invite_code') {
        return Promise.resolve({
          data: [{ ...mockGang, auto_accept: false }],
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })
    let memberCallIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gang_members') {
        memberCallIndex++
        if (memberCallIndex === 1) return createQueryChain({ data: null })
        if (memberCallIndex === 2) return createQueryChain({ count: 5, data: null, error: null })
        if (memberCallIndex === 3) return createQueryChain({ count: 3, data: null, error: null })
        if (memberCallIndex === 5) return createQueryChain({ data: [] })
        if (memberCallIndex === 6) return createQueryChain({ error: null })
        if (memberCallIndex === 7) return createQueryChain({ data: { user_id: 'admin-456' } })
      }
      if (table === 'v2_profiles') {
        memberCallIndex++
        return createQueryChain({ data: { display_name: 'TestUser' } })
      }
      return createQueryChain({ data: null })
    })

    await joinGangByCode('XK42AB')

    // Verify the SECURITY DEFINER RPC was called for the join_request path.
    // The display name is resolved server-side from v2_profiles inside the
    // RPC — the client must not pass it.
    expect(mockRpc).toHaveBeenCalledWith('create_join_request_notification', {
      p_admin_user_id: 'admin-456',
      p_gang_id: mockGang.id,
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

// ---------------------------------------------------------------------------
// approveJoinRequest
// ---------------------------------------------------------------------------

describe('approveJoinRequest server action', () => {
  const mockUser = { id: 'admin-user-123' }
  const validGangId = '550e8400-e29b-41d4-a716-446655440000'
  const validUserId = '660e8400-e29b-41d4-a716-446655440001'

  /**
   * Sets up mockFrom for approveJoinRequest calls.
   * The action calls .from() for:
   * 1. v2_gang_members — admin verification (.maybeSingle)
   * 2. v2_gang_members — approved count (.select with count)
   * 3. v2_profiles — requester display name (.single)
   * 4. v2_gang_members — display name dup check (.select)
   * 5. v2_gang_members — update status
   *
   * The notification is sent via create_join_approved_notification RPC,
   * which resolves the gang name server-side — no v2_gangs .from() call.
   */
  function setupApproveFromMock(overrides?: {
    adminCheck?: { data: unknown }
    approvedCount?: number
    requesterProfile?: { data: unknown }
    duplicateName?: { data: unknown[] }
    updateResult?: { data: unknown[]; error: unknown }
  }) {
    const opts = {
      adminCheck: { data: { role: 'admin', status: 'approved' } },
      approvedCount: 5,
      requesterProfile: { data: { display_name: 'NewUser' } },
      duplicateName: { data: [] },
      updateResult: { data: [{ status: 'approved' }], error: null },
      ...overrides,
    }

    let memberCallIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gang_members') {
        memberCallIndex++
        if (memberCallIndex === 1) return createQueryChain(opts.adminCheck)
        if (memberCallIndex === 2) return createQueryChain({ count: opts.approvedCount, data: null, error: null })
        if (memberCallIndex === 3) return createQueryChain(opts.duplicateName)
        if (memberCallIndex === 4) return createQueryChain(opts.updateResult)
      }
      if (table === 'v2_profiles') {
        return createQueryChain(opts.requesterProfile)
      }
      return createQueryChain({ data: null })
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 59 })
    // Notification insert goes through the create_join_approved_notification
    // SECURITY DEFINER RPC (see migration 20260410000001_notification_rpcs.sql).
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---- Auth checks ----

  test('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await approveJoinRequest(validGangId, validUserId)

    expect(result).toEqual({ success: false, error: 'Not authenticated' })
  })

  // ---- Admin check ----

  test('returns error when user is not admin', async () => {
    setupApproveFromMock({
      adminCheck: { data: { role: 'member', status: 'approved' } },
    })

    const result = await approveJoinRequest(validGangId, validUserId)

    expect(result).toEqual({
      success: false,
      error: 'Only gang admins can approve requests',
    })
  })

  test('returns error when admin membership is not approved', async () => {
    setupApproveFromMock({
      adminCheck: { data: { role: 'admin', status: 'pending' } },
    })

    const result = await approveJoinRequest(validGangId, validUserId)

    expect(result).toEqual({
      success: false,
      error: 'Only gang admins can approve requests',
    })
  })

  test('returns error when no admin membership found', async () => {
    setupApproveFromMock({
      adminCheck: { data: null },
    })

    const result = await approveJoinRequest(validGangId, validUserId)

    expect(result).toEqual({
      success: false,
      error: 'Only gang admins can approve requests',
    })
  })

  // ---- Rate limiting ----

  test('returns error when rate limited', async () => {
    setupApproveFromMock()
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    const result = await approveJoinRequest(validGangId, validUserId)

    expect(result).toEqual({
      success: false,
      error: 'Too many requests. Try again later.',
    })
    expect(mockRateLimit).toHaveBeenCalledWith('admin-user-123', 'approve_join_request', {
      max: 60,
      windowSeconds: 3600,
    })
  })

  // ---- Validation ----

  test('returns error for invalid gangId UUID', async () => {
    setupApproveFromMock()

    const result = await approveJoinRequest('not-a-uuid', validUserId)

    expect(result).toEqual({ success: false, error: 'Invalid request' })
  })

  test('returns error for invalid userId UUID', async () => {
    setupApproveFromMock()

    const result = await approveJoinRequest(validGangId, 'not-a-uuid')

    expect(result).toEqual({ success: false, error: 'Invalid request' })
  })

  // ---- Gang full ----

  test('returns error when gang has 20 approved members', async () => {
    setupApproveFromMock({ approvedCount: 20 })

    const result = await approveJoinRequest(validGangId, validUserId)

    expect(result).toEqual({
      success: false,
      error: 'This gang has reached its maximum of 20 members',
    })
  })

  // ---- Display name collision ----

  test('returns error when display name is duplicate in gang', async () => {
    setupApproveFromMock({
      duplicateName: { data: [{ user_id: 'other-user' }] },
    })

    const result = await approveJoinRequest(validGangId, validUserId)

    expect(result).toEqual({
      success: false,
      error: 'A member with the same display name already exists in this gang.',
    })
  })

  // ---- Update failure ----

  test('returns error when update fails', async () => {
    setupApproveFromMock({
      updateResult: { data: [], error: { message: 'db error' } },
    })

    const result = await approveJoinRequest(validGangId, validUserId)

    expect(result).toEqual({
      success: false,
      error: 'Failed to approve request. Please try again.',
    })
  })

  // ---- Race condition: already processed ----

  test('returns already-processed error when zero rows updated (race condition)', async () => {
    setupApproveFromMock({
      updateResult: { data: [], error: null },
    })

    const result = await approveJoinRequest(validGangId, validUserId)

    expect(result).toEqual({
      success: false,
      error: 'This request has already been processed.',
    })
    // Should NOT send notification or fire analytics
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  // ---- Success ----

  test('approves request, fires analytics, revalidates, and returns success', async () => {
    setupApproveFromMock()

    const result = await approveJoinRequest(validGangId, validUserId)

    expect(result).toEqual({ success: true })

    // Revalidation
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/group/${validGangId}`)
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/group/${validGangId}/settings`)

    // Analytics
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'admin-user-123',
      'member_approved',
      expect.objectContaining({
        gang_id: validGangId,
        approved_user_id: validUserId,
      }),
    )
  })

  // ---- Order of operations ----

  test('calls auth before rate limit and admin check', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    await approveJoinRequest(validGangId, validUserId)

    expect(mockGetUser).toHaveBeenCalledOnce()
    expect(mockRateLimit).not.toHaveBeenCalled()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  test('calls rate limit before admin check (DB query)', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    await approveJoinRequest(validGangId, validUserId)

    expect(mockRateLimit).toHaveBeenCalledOnce()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  test('does not revalidate or fire analytics on error', async () => {
    setupApproveFromMock({
      updateResult: { data: [], error: { message: 'db error' } },
    })

    await approveJoinRequest(validGangId, validUserId)

    expect(mockRevalidatePath).not.toHaveBeenCalled()
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// rejectJoinRequest
// ---------------------------------------------------------------------------

describe('rejectJoinRequest server action', () => {
  const mockUser = { id: 'admin-user-123' }
  const validGangId = '550e8400-e29b-41d4-a716-446655440000'
  const validUserId = '660e8400-e29b-41d4-a716-446655440001'

  /**
   * Sets up mockFrom for rejectJoinRequest calls.
   * The action calls .from() for:
   * 1. v2_gang_members — admin verification (.maybeSingle)
   * 2. v2_gang_members — update status
   *
   * The notification is sent via create_join_rejected_notification RPC,
   * which resolves the gang name server-side — no v2_gangs .from() call.
   */
  function setupRejectFromMock(overrides?: {
    adminCheck?: { data: unknown }
    updateResult?: { data: unknown[]; error: unknown }
  }) {
    const opts = {
      adminCheck: { data: { role: 'admin', status: 'approved' } },
      updateResult: { data: [{ status: 'rejected' }], error: null },
      ...overrides,
    }

    let memberCallIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gang_members') {
        memberCallIndex++
        if (memberCallIndex === 1) return createQueryChain(opts.adminCheck)
        if (memberCallIndex === 2) return createQueryChain(opts.updateResult)
      }
      return createQueryChain({ data: null })
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 59 })
    // Notification insert goes through the create_join_rejected_notification
    // SECURITY DEFINER RPC (see migration 20260410000001_notification_rpcs.sql).
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---- Auth checks ----

  test('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await rejectJoinRequest(validGangId, validUserId)

    expect(result).toEqual({ success: false, error: 'Not authenticated' })
  })

  // ---- Admin check ----

  test('returns error when user is not admin', async () => {
    setupRejectFromMock({
      adminCheck: { data: { role: 'member', status: 'approved' } },
    })

    const result = await rejectJoinRequest(validGangId, validUserId)

    expect(result).toEqual({
      success: false,
      error: 'Only gang admins can reject requests',
    })
  })

  test('returns error when no membership found', async () => {
    setupRejectFromMock({
      adminCheck: { data: null },
    })

    const result = await rejectJoinRequest(validGangId, validUserId)

    expect(result).toEqual({
      success: false,
      error: 'Only gang admins can reject requests',
    })
  })

  // ---- Rate limiting ----

  test('returns error when rate limited', async () => {
    setupRejectFromMock()
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    const result = await rejectJoinRequest(validGangId, validUserId)

    expect(result).toEqual({
      success: false,
      error: 'Too many requests. Try again later.',
    })
    expect(mockRateLimit).toHaveBeenCalledWith('admin-user-123', 'reject_join_request', {
      max: 60,
      windowSeconds: 3600,
    })
  })

  // ---- Validation ----

  test('returns error for invalid gangId UUID', async () => {
    setupRejectFromMock()

    const result = await rejectJoinRequest('not-a-uuid', validUserId)

    expect(result).toEqual({ success: false, error: 'Invalid request' })
  })

  test('returns error for invalid userId UUID', async () => {
    setupRejectFromMock()

    const result = await rejectJoinRequest(validGangId, 'not-a-uuid')

    expect(result).toEqual({ success: false, error: 'Invalid request' })
  })

  // ---- Update failure ----

  test('returns error when update fails', async () => {
    setupRejectFromMock({
      updateResult: { data: [], error: { message: 'db error' } },
    })

    const result = await rejectJoinRequest(validGangId, validUserId)

    expect(result).toEqual({
      success: false,
      error: 'Failed to reject request. Please try again.',
    })
  })

  // ---- Race condition: already processed ----

  test('returns already-processed error when zero rows updated (race condition)', async () => {
    setupRejectFromMock({
      updateResult: { data: [], error: null },
    })

    const result = await rejectJoinRequest(validGangId, validUserId)

    expect(result).toEqual({
      success: false,
      error: 'This request has already been processed.',
    })
    // Should NOT send notification or fire analytics
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  // ---- Success ----

  test('rejects request, fires analytics, revalidates, and returns success', async () => {
    setupRejectFromMock()

    const result = await rejectJoinRequest(validGangId, validUserId)

    expect(result).toEqual({ success: true })

    // Revalidation
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/group/${validGangId}`)
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/group/${validGangId}/settings`)

    // Analytics
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'admin-user-123',
      'member_rejected',
      expect.objectContaining({
        gang_id: validGangId,
        rejected_user_id: validUserId,
      }),
    )
  })

  // ---- Order of operations ----

  test('calls auth before rate limit and admin check', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    await rejectJoinRequest(validGangId, validUserId)

    expect(mockGetUser).toHaveBeenCalledOnce()
    expect(mockRateLimit).not.toHaveBeenCalled()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  test('calls rate limit before admin check (DB query)', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    await rejectJoinRequest(validGangId, validUserId)

    expect(mockRateLimit).toHaveBeenCalledOnce()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  test('does not revalidate or fire analytics on error', async () => {
    setupRejectFromMock({
      updateResult: { data: [], error: { message: 'db error' } },
    })

    await rejectJoinRequest(validGangId, validUserId)

    expect(mockRevalidatePath).not.toHaveBeenCalled()
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// leaveGang
// ---------------------------------------------------------------------------

describe('leaveGang server action', () => {
  const mockUser = { id: 'user-123' }
  const validGangId = '550e8400-e29b-41d4-a716-446655440000'

  /**
   * Sets up mockFrom for leaveGang calls.
   * The action calls .from() for:
   * 1. v2_gang_members — membership check (.maybeSingle)
   * 2. v2_gang_members — update status (.update + .select)
   */
  function setupLeaveFromMock(overrides?: {
    membershipCheck?: { data: unknown }
    updateResult?: { data: unknown[]; error: unknown }
  }) {
    const opts = {
      membershipCheck: { data: { role: 'member', status: 'approved' } },
      updateResult: { data: [{ status: 'left' }], error: null },
      ...overrides,
    }

    let memberCallIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gang_members') {
        memberCallIndex++
        if (memberCallIndex === 1) return createQueryChain(opts.membershipCheck)
        if (memberCallIndex === 2) return createQueryChain(opts.updateResult)
      }
      return createQueryChain({ data: null })
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 9 })
  })

  // ---- Auth checks ----

  test('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await leaveGang(validGangId)

    expect(result).toEqual({ success: false, error: 'Not authenticated' })
    expect(mockFrom).not.toHaveBeenCalled()
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })

  // ---- Rate limiting ----

  test('returns error when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    const result = await leaveGang(validGangId)

    expect(result).toEqual({
      success: false,
      error: 'Too many requests. Try again later.',
    })
    expect(mockRateLimit).toHaveBeenCalledWith('user-123', 'leave_gang', {
      max: 10,
      windowSeconds: 3600,
    })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  // ---- Validation ----

  test('returns error for invalid gangId UUID', async () => {
    const result = await leaveGang('not-a-uuid')

    expect(result).toEqual({ success: false, error: 'Invalid request' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  // ---- Admin cannot leave ----

  test('returns error when user is an admin', async () => {
    setupLeaveFromMock({
      membershipCheck: { data: { role: 'admin', status: 'approved' } },
    })

    const result = await leaveGang(validGangId)

    expect(result).toEqual({
      success: false,
      error: 'Admins cannot leave. Delete the gang instead.',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  // ---- Non-member cannot leave ----

  test('returns error when user is not a member', async () => {
    setupLeaveFromMock({
      membershipCheck: { data: null },
    })

    const result = await leaveGang(validGangId)

    expect(result).toEqual({
      success: false,
      error: 'You are not a member of this gang',
    })
  })

  test('returns error when membership status is not approved', async () => {
    setupLeaveFromMock({
      membershipCheck: { data: { role: 'member', status: 'pending' } },
    })

    const result = await leaveGang(validGangId)

    expect(result).toEqual({
      success: false,
      error: 'You are not a member of this gang',
    })
  })

  // ---- Update failure ----

  test('returns error when update fails', async () => {
    setupLeaveFromMock({
      updateResult: { data: [], error: { message: 'db error' } },
    })

    const result = await leaveGang(validGangId)

    expect(result).toEqual({
      success: false,
      error: 'Failed to leave gang. Please try again.',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  // ---- Race condition: already left ----

  test('returns error when zero rows updated (race condition)', async () => {
    setupLeaveFromMock({
      updateResult: { data: [], error: null },
    })

    const result = await leaveGang(validGangId)

    expect(result).toEqual({
      success: false,
      error: 'You are not a member of this gang',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  // ---- Success ----

  test('leaves gang, fires analytics, revalidates, and returns success', async () => {
    setupLeaveFromMock()

    const result = await leaveGang(validGangId)

    expect(result).toEqual({ success: true })

    // Revalidation
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/group/${validGangId}`)

    // Analytics
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'user-123',
      'member_left',
      expect.objectContaining({
        gang_id: validGangId,
      }),
    )
  })

  // ---- Order of operations ----

  test('calls auth before rate limit', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    await leaveGang(validGangId)

    expect(mockGetUser).toHaveBeenCalledOnce()
    expect(mockRateLimit).not.toHaveBeenCalled()
  })

  test('calls rate limit before from query', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    await leaveGang(validGangId)

    expect(mockRateLimit).toHaveBeenCalledOnce()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  test('does not revalidate or fire analytics on error', async () => {
    setupLeaveFromMock({
      updateResult: { data: [], error: { message: 'db error' } },
    })

    await leaveGang(validGangId)

    expect(mockRevalidatePath).not.toHaveBeenCalled()
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// updateGangName
// ---------------------------------------------------------------------------

describe('updateGangName server action', () => {
  const mockUser = { id: 'admin-user-123' }
  const validGangId = '550e8400-e29b-41d4-a716-446655440000'

  /**
   * Sets up mockFrom for updateGangName calls.
   * The action calls .from() for:
   * 1. v2_gangs — `isApprovedGangAdmin` single-query inner-join check
   *    (resolves to `data: { id }` when admin, `data: null` otherwise)
   * 2. v2_gangs — update name (chains `.select('id')` to count rows)
   */
  function setupUpdateNameFromMock(overrides?: {
    adminCheck?: { data: unknown }
    updateResult?: { data?: unknown[]; error: unknown }
  }) {
    const opts = {
      adminCheck: { data: { id: validGangId } },
      updateResult: { data: [{ id: validGangId }], error: null } as {
        data?: unknown[]
        error: unknown
      },
      ...overrides,
    }

    let gangCallIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gangs') {
        gangCallIndex++
        // First v2_gangs call is the isApprovedGangAdmin inner-join check;
        // second is the update with .select('id').
        if (gangCallIndex === 1) return createQueryChain(opts.adminCheck)
        return createQueryChain(opts.updateResult)
      }
      return createQueryChain({ data: null })
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 29 })
  })

  // ---- Auth checks ----

  test('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await updateGangName(validGangId, 'New Name')

    expect(result).toEqual({ success: false, error: 'Not authenticated' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  // ---- Rate limiting ----

  test('returns error when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    const result = await updateGangName(validGangId, 'New Name')

    expect(result).toEqual({
      success: false,
      error: 'Too many requests. Try again later.',
    })
    expect(mockRateLimit).toHaveBeenCalledWith(
      'admin-user-123',
      'update_gang_name',
      { max: 30, windowSeconds: 3600 },
    )
    expect(mockFrom).not.toHaveBeenCalled()
  })

  // ---- Validation ----

  test('returns error for invalid gangId UUID', async () => {
    const result = await updateGangName('not-a-uuid', 'New Name')

    expect(result).toEqual({ success: false, error: 'Invalid request' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  test('returns error for name shorter than 3 chars', async () => {
    const result = await updateGangName(validGangId, 'AB')

    expect(result).toEqual({
      success: false,
      error: 'Gang name must be 3\u201350 characters',
    })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  test('returns error for name longer than 50 chars', async () => {
    const result = await updateGangName(validGangId, 'A'.repeat(51))

    expect(result).toEqual({
      success: false,
      error: 'Gang name must be 3\u201350 characters',
    })
  })

  // ---- Admin verification ----

  test('returns error when inner-join admin check returns null (non-admin, wrong status, or no row)', async () => {
    setupUpdateNameFromMock({ adminCheck: { data: null } })

    const result = await updateGangName(validGangId, 'Valid Name')

    expect(result).toEqual({
      success: false,
      error: "Gang not found or you don't have permission",
    })
  })

  // ---- Soft-delete guard ----

  test('returns generic error and does NOT mutate when gang is soft-deleted', async () => {
    // isApprovedGangAdmin's inner-join query filters on is_deleted=false, so
    // a soft-deleted gang resolves to `data: null` and the action bails
    // before reaching the update branch.
    const updateSpy = vi.fn()
    let gangCallIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gangs') {
        gangCallIndex++
        if (gangCallIndex === 1) {
          return createQueryChain({ data: null })
        }
        // Second call is the update branch — track `.update()` to assert
        // it was never reached.
        const chain = createQueryChain({ data: [], error: null })
        chain.update = updateSpy.mockImplementation(() => chain)
        return chain
      }
      return createQueryChain({ data: null })
    })

    const result = await updateGangName(validGangId, 'Valid Name')

    expect(result).toEqual({
      success: false,
      error: "Gang not found or you don't have permission",
    })
    expect(updateSpy).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  // ---- Update failure ----

  test('returns error when update fails', async () => {
    setupUpdateNameFromMock({
      updateResult: { data: [], error: { message: 'db error' } },
    })

    const result = await updateGangName(validGangId, 'Valid Name')

    expect(result).toEqual({
      success: false,
      error: 'Failed to update gang name. Please try again.',
    })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  // ---- Zero-rows race ----

  test('returns error when update affects zero rows (race with delete)', async () => {
    setupUpdateNameFromMock({
      updateResult: { data: [], error: null },
    })

    const result = await updateGangName(validGangId, 'Valid Name')

    expect(result).toEqual({
      success: false,
      error: "Gang not found or you don't have permission",
    })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  // ---- Success ----

  test('updates name, revalidates, and returns success', async () => {
    setupUpdateNameFromMock()

    const result = await updateGangName(validGangId, '  Mumbai Mavericks  ')

    expect(result).toEqual({ success: true })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/group/${validGangId}`)
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/group/${validGangId}/settings`,
    )
  })
})

// ---------------------------------------------------------------------------
// updateAutoAccept
// ---------------------------------------------------------------------------

describe('updateAutoAccept server action', () => {
  const mockUser = { id: 'admin-user-123' }
  const validGangId = '550e8400-e29b-41d4-a716-446655440000'

  function setupUpdateAutoAcceptFromMock(overrides?: {
    adminCheck?: { data: unknown }
    updateResult?: { data?: unknown[]; error: unknown }
  }) {
    const opts = {
      adminCheck: { data: { id: validGangId } },
      updateResult: { data: [{ id: validGangId }], error: null } as {
        data?: unknown[]
        error: unknown
      },
      ...overrides,
    }

    let gangCallIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gangs') {
        gangCallIndex++
        // First v2_gangs call is the isApprovedGangAdmin inner-join check;
        // second is the update with .select('id').
        if (gangCallIndex === 1) return createQueryChain(opts.adminCheck)
        return createQueryChain(opts.updateResult)
      }
      return createQueryChain({ data: null })
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 29 })
  })

  // ---- Auth checks ----

  test('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await updateAutoAccept(validGangId, true)

    expect(result).toEqual({ success: false, error: 'Not authenticated' })
  })

  // ---- Rate limiting ----

  test('returns error when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    const result = await updateAutoAccept(validGangId, true)

    expect(result).toEqual({
      success: false,
      error: 'Too many requests. Try again later.',
    })
    expect(mockRateLimit).toHaveBeenCalledWith(
      'admin-user-123',
      'update_auto_accept',
      { max: 30, windowSeconds: 3600 },
    )
  })

  // ---- Validation ----

  test('returns error for invalid gangId UUID', async () => {
    const result = await updateAutoAccept('not-a-uuid', true)

    expect(result).toEqual({ success: false, error: 'Invalid request' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  // ---- Admin verification ----

  test('returns error when inner-join admin check returns null', async () => {
    setupUpdateAutoAcceptFromMock({
      adminCheck: { data: null },
    })

    const result = await updateAutoAccept(validGangId, true)

    expect(result).toEqual({
      success: false,
      error: "Gang not found or you don't have permission",
    })
  })

  // ---- Non-boolean autoAccept rejection (S-009) ----

  test('returns error when autoAccept is not a boolean', async () => {
    setupUpdateAutoAcceptFromMock()

    // Deliberately bypass TypeScript to exercise the runtime guard that
    // defends against malformed client payloads reaching the server action.
    const callWithBadPayload = updateAutoAccept as unknown as (
      gangId: string,
      autoAccept: unknown,
    ) => Promise<{ success: boolean; error?: string }>
    const result = await callWithBadPayload(validGangId, 'yes')

    expect(result).toEqual({ success: false, error: 'Invalid request' })
  })

  // ---- Update failure ----

  test('returns error when update fails', async () => {
    setupUpdateAutoAcceptFromMock({
      updateResult: { data: [], error: { message: 'db error' } },
    })

    const result = await updateAutoAccept(validGangId, true)

    expect(result).toEqual({
      success: false,
      error: 'Failed to update setting. Please try again.',
    })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  // ---- Zero-rows race ----

  test('returns error when update affects zero rows (race with delete)', async () => {
    setupUpdateAutoAcceptFromMock({
      updateResult: { data: [], error: null },
    })

    const result = await updateAutoAccept(validGangId, true)

    expect(result).toEqual({
      success: false,
      error: "Gang not found or you don't have permission",
    })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  // ---- Success ----

  test('updates auto-accept, revalidates, and returns success (true)', async () => {
    setupUpdateAutoAcceptFromMock()

    const result = await updateAutoAccept(validGangId, true)

    expect(result).toEqual({ success: true })
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/group/${validGangId}`)
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/group/${validGangId}/settings`,
    )
  })

  test('updates auto-accept, revalidates, and returns success (false)', async () => {
    setupUpdateAutoAcceptFromMock()

    const result = await updateAutoAccept(validGangId, false)

    expect(result).toEqual({ success: true })
  })
})

// ---------------------------------------------------------------------------
// updatePredictionDeadline
// ---------------------------------------------------------------------------

describe('updatePredictionDeadline server action', () => {
  const mockUser = { id: 'admin-user-123' }
  const validGangId = '550e8400-e29b-41d4-a716-446655440000'

  function setupUpdateDeadlineFromMock(overrides?: {
    adminCheck?: { data: unknown }
    updateResult?: { data: unknown[]; error: unknown }
  }) {
    const opts = {
      adminCheck: { data: { id: validGangId } },
      updateResult: { data: [{ gang_id: validGangId }], error: null },
      ...overrides,
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gangs') {
        // isApprovedGangAdmin inner-join check — returns `{ id }` when the
        // caller is an approved admin, `null` otherwise.
        return createQueryChain(opts.adminCheck)
      }
      if (table === 'v2_gang_league_seasons') {
        return createQueryChain(opts.updateResult)
      }
      return createQueryChain({ data: null })
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 29 })
  })

  // ---- Auth checks ----

  test('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await updatePredictionDeadline(validGangId, 60)

    expect(result).toEqual({ success: false, error: 'Not authenticated' })
  })

  // ---- Rate limiting ----

  test('returns error when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    const result = await updatePredictionDeadline(validGangId, 60)

    expect(result).toEqual({
      success: false,
      error: 'Too many requests. Try again later.',
    })
    expect(mockRateLimit).toHaveBeenCalledWith(
      'admin-user-123',
      'update_prediction_deadline',
      { max: 30, windowSeconds: 3600 },
    )
  })

  // ---- Validation ----

  test('returns error for invalid gangId UUID', async () => {
    const result = await updatePredictionDeadline('not-a-uuid', 60)

    expect(result).toEqual({ success: false, error: 'Invalid request' })
  })

  test('returns error for minutes below 15', async () => {
    const result = await updatePredictionDeadline(validGangId, 14)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/at least 15/)
    }
  })

  test('returns error for minutes above 720', async () => {
    const result = await updatePredictionDeadline(validGangId, 721)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/at most 720/)
    }
  })

  test('returns error for non-integer minutes', async () => {
    const result = await updatePredictionDeadline(validGangId, 45.5)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/whole number/)
    }
  })

  test('accepts boundary values 15 and 720', async () => {
    setupUpdateDeadlineFromMock()
    expect(await updatePredictionDeadline(validGangId, 15)).toEqual({
      success: true,
    })

    setupUpdateDeadlineFromMock()
    expect(await updatePredictionDeadline(validGangId, 720)).toEqual({
      success: true,
    })
  })

  // ---- Admin verification ----

  test('returns error when inner-join admin check returns null', async () => {
    setupUpdateDeadlineFromMock({
      adminCheck: { data: null },
    })

    const result = await updatePredictionDeadline(validGangId, 60)

    expect(result).toEqual({
      success: false,
      error: "Gang not found or you don't have permission",
    })
  })

  // ---- Update failure ----

  test('returns error when update fails', async () => {
    setupUpdateDeadlineFromMock({
      updateResult: { data: [], error: { message: 'db error' } },
    })

    const result = await updatePredictionDeadline(validGangId, 60)

    expect(result).toEqual({
      success: false,
      error: 'Failed to update deadline. Please try again.',
    })
  })

  test('returns actionable error when no active season row exists', async () => {
    setupUpdateDeadlineFromMock({
      updateResult: { data: [], error: null },
    })

    const result = await updatePredictionDeadline(validGangId, 60)

    expect(result).toEqual({
      success: false,
      error:
        'This gang is not yet enrolled in an active season. Try again after the next season starts.',
    })
  })

  test('returns error when multiple active season rows are updated (data drift)', async () => {
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined)

    setupUpdateDeadlineFromMock({
      updateResult: {
        data: [{ gang_id: validGangId }, { gang_id: validGangId }],
        error: null,
      },
    })

    const result = await updatePredictionDeadline(validGangId, 60)

    expect(result).toEqual({
      success: false,
      error: 'Unexpected number of active seasons. Please contact support.',
    })
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(mockRevalidatePath).not.toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  // ---- Success ----

  test('updates deadline, revalidates, and returns success', async () => {
    setupUpdateDeadlineFromMock()

    const result = await updatePredictionDeadline(validGangId, 120)

    expect(result).toEqual({ success: true })
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/group/${validGangId}`)
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/group/${validGangId}/settings`,
    )
  })
})

// ---------------------------------------------------------------------------
// deleteGang
// ---------------------------------------------------------------------------

describe('deleteGang server action', () => {
  const mockUser = { id: 'admin-user-123' }
  const validGangId = '550e8400-e29b-41d4-a716-446655440000'

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 4 })
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---- Auth checks ----

  test('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await deleteGang(validGangId)

    expect(result).toEqual({ success: false, error: 'Not authenticated' })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  // ---- Rate limiting ----

  test('returns error when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    const result = await deleteGang(validGangId)

    expect(result).toEqual({
      success: false,
      error: 'Too many requests. Try again later.',
    })
    expect(mockRateLimit).toHaveBeenCalledWith('admin-user-123', 'delete_gang', {
      max: 5,
      windowSeconds: 3600,
    })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  // ---- Validation ----

  test('returns error for invalid gangId UUID', async () => {
    const result = await deleteGang('not-a-uuid')

    expect(result).toEqual({ success: false, error: 'Invalid request' })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  // ---- RPC error mapping ----

  test('maps NOT_GANG_ADMIN (42501) to admin-only error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'NOT_GANG_ADMIN', code: '42501' },
    })

    const result = await deleteGang(validGangId)

    expect(result).toEqual({
      success: false,
      error: 'Only gang admins can delete the gang',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  test('maps GANG_NOT_FOUND to gone error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'GANG_NOT_FOUND: ...', code: 'P0001' },
    })

    const result = await deleteGang(validGangId)

    expect(result).toEqual({
      success: false,
      error: 'This gang no longer exists',
    })
  })

  test('maps GANG_ALREADY_DELETED to gone error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'GANG_ALREADY_DELETED: ...', code: 'P0001' },
    })

    const result = await deleteGang(validGangId)

    expect(result).toEqual({
      success: false,
      error: 'This gang no longer exists',
    })
  })

  test('returns generic error for other RPC errors', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'some other db error', code: 'XX000' },
    })

    const result = await deleteGang(validGangId)

    expect(result).toEqual({
      success: false,
      error: 'Failed to delete gang. Please try again.',
    })
  })

  // ---- Success ----

  test('calls RPC with correct params, fires analytics, revalidates, and returns success', async () => {
    const result = await deleteGang(validGangId)

    expect(result).toEqual({ success: true })
    expect(mockRpc).toHaveBeenCalledWith('delete_gang', {
      p_gang_id: validGangId,
    })
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'admin-user-123',
      ANALYTICS_EVENTS.GANG_DELETED,
      expect.objectContaining({ gang_id: validGangId }),
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/group/${validGangId}`)
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/group/${validGangId}/settings`,
    )
  })

  // ---- RPC signature ----

  test('does not pass p_caller_id to RPC (auth.uid() resolved server-side)', async () => {
    await deleteGang(validGangId)

    expect(mockRpc).toHaveBeenCalledOnce()
    const [, args] = mockRpc.mock.calls[0] as [string, Record<string, unknown>]
    expect(args).toEqual({ p_gang_id: validGangId })
    expect(args).not.toHaveProperty('p_caller_id')
  })

  test('maps NOT_AUTHENTICATED RPC error to signed-in message', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'NOT_AUTHENTICATED', code: '42501' },
    })

    const result = await deleteGang(validGangId)

    expect(result).toEqual({
      success: false,
      error: 'You must be signed in',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  // ---- Order of operations ----

  test('calls auth before rate limit', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    await deleteGang(validGangId)

    expect(mockGetUser).toHaveBeenCalledOnce()
    expect(mockRateLimit).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  test('calls rate limit before RPC', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    await deleteGang(validGangId)

    expect(mockRateLimit).toHaveBeenCalledOnce()
    expect(mockRpc).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// removeMember
// ---------------------------------------------------------------------------

describe('removeMember server action', () => {
  const mockAdmin = { id: '770e8400-e29b-41d4-a716-446655440002' }
  const validGangId = '550e8400-e29b-41d4-a716-446655440000'
  const validTargetId = '660e8400-e29b-41d4-a716-446655440001'

  /**
   * Sets up mockFrom for removeMember calls.
   * Flow:
   *   1. v2_gangs — isApprovedGangAdmin inner-join check
   *   2. v2_gang_members — target member role lookup (.maybeSingle)
   *   3. v2_gang_members — update (with .select())
   */
  function setupRemoveFromMock(overrides?: {
    adminCheck?: { data: unknown }
    targetLookup?: { data: unknown }
    updateResult?: { data: unknown[]; error: unknown }
  }) {
    const opts = {
      adminCheck: { data: { id: validGangId } },
      targetLookup: { data: { role: 'member' } },
      updateResult: { data: [{ status: 'removed' }], error: null },
      ...overrides,
    }

    let memberCallIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gangs') {
        return createQueryChain(opts.adminCheck)
      }
      if (table === 'v2_gang_members') {
        memberCallIndex++
        if (memberCallIndex === 1) return createQueryChain(opts.targetLookup)
        return createQueryChain(opts.updateResult)
      }
      return createQueryChain({ data: null })
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockAdmin }, error: null })
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 29 })
  })

  // ---- Auth checks ----

  test('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await removeMember(validGangId, validTargetId)

    expect(result).toEqual({ success: false, error: 'Not authenticated' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  // ---- Rate limiting ----

  test('returns error when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    const result = await removeMember(validGangId, validTargetId)

    expect(result).toEqual({
      success: false,
      error: 'Too many requests. Try again later.',
    })
    expect(mockRateLimit).toHaveBeenCalledWith(
      mockAdmin.id,
      'remove_member',
      { max: 30, windowSeconds: 3600 },
    )
    expect(mockFrom).not.toHaveBeenCalled()
  })

  // ---- Validation ----

  test('returns error for invalid gangId UUID', async () => {
    const result = await removeMember('not-a-uuid', validTargetId)

    expect(result).toEqual({ success: false, error: 'Invalid request' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  test('returns error for invalid userId UUID', async () => {
    const result = await removeMember(validGangId, 'not-a-uuid')

    expect(result).toEqual({ success: false, error: 'Invalid request' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  // ---- Admin verification ----

  test('returns error when inner-join admin check returns null (non-admin or soft-deleted)', async () => {
    setupRemoveFromMock({
      adminCheck: { data: null },
    })

    const result = await removeMember(validGangId, validTargetId)

    expect(result).toEqual({
      success: false,
      error: "Gang not found or you don't have permission",
    })
  })

  // ---- Self guard ----

  test('returns error when attempting to remove self', async () => {
    setupRemoveFromMock()

    const result = await removeMember(validGangId, mockAdmin.id)

    expect(result).toEqual({
      success: false,
      error: 'Admins cannot leave. Delete the gang instead.',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  // ---- Admin target guard ----

  test('returns error when target is an admin', async () => {
    setupRemoveFromMock({
      targetLookup: { data: { role: 'admin' } },
    })

    const result = await removeMember(validGangId, validTargetId)

    expect(result).toEqual({
      success: false,
      error: 'Admins cannot be removed or blocked',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  // ---- Update failure ----

  test('returns error when update fails', async () => {
    setupRemoveFromMock({
      updateResult: { data: [], error: { message: 'db error' } },
    })

    const result = await removeMember(validGangId, validTargetId)

    expect(result).toEqual({
      success: false,
      error: 'Failed to remove member. Please try again.',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  // ---- Race condition ----

  test('returns error when zero rows updated (race condition)', async () => {
    setupRemoveFromMock({
      updateResult: { data: [], error: null },
    })

    const result = await removeMember(validGangId, validTargetId)

    expect(result).toEqual({
      success: false,
      error: 'This member is no longer active in the gang.',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  // ---- Success ----

  test('removes member, fires analytics, revalidates, and returns success', async () => {
    setupRemoveFromMock()

    const result = await removeMember(validGangId, validTargetId)

    expect(result).toEqual({ success: true })
    expect(mockTrackEvent).toHaveBeenCalledWith(
      mockAdmin.id,
      ANALYTICS_EVENTS.MEMBER_REMOVED,
      expect.objectContaining({
        gang_id: validGangId,
        removed_user_id: validTargetId,
      }),
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/group/${validGangId}`)
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/group/${validGangId}/settings`,
    )
  })
})

// ---------------------------------------------------------------------------
// blockMember
// ---------------------------------------------------------------------------

describe('blockMember server action', () => {
  const mockAdmin = { id: '770e8400-e29b-41d4-a716-446655440002' }
  const validGangId = '550e8400-e29b-41d4-a716-446655440000'
  const validTargetId = '660e8400-e29b-41d4-a716-446655440001'

  /**
   * Sets up mockFrom for blockMember calls.
   * Flow:
   *   1. v2_gangs — isApprovedGangAdmin inner-join check
   *   2. v2_gang_members — target member role+status lookup
   *   3. v2_gang_members — update (race-guarded when approved) OR plain
   *      update for non-approved targets
   *   4. v2_gang_members — OPTIONAL fallback update (only when approved +
   *      race-guarded update affected zero rows)
   */
  function setupBlockFromMock(overrides?: {
    adminCheck?: { data: unknown }
    targetLookup?: { data: unknown }
    /**
     * First update call. For the approved path this ends in `.select()` so
     * the resolved value should be `{ data: [...], error }`. For the
     * non-approved path it's a plain update that resolves to `{ error }`.
     */
    updateResult?: { data?: unknown[]; error: unknown }
    /**
     * Fallback update — only hit on the approved path when the first update
     * affected zero rows (race lost). Defaults to success.
     */
    fallbackUpdateResult?: { error: unknown }
  }) {
    const opts = {
      adminCheck: { data: { id: validGangId } },
      targetLookup: { data: { role: 'member', status: 'approved' } },
      updateResult: { data: [{ is_blocked: true }], error: null } as {
        data?: unknown[]
        error: unknown
      },
      fallbackUpdateResult: { error: null },
      ...overrides,
    }

    let memberCallIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gangs') {
        return createQueryChain(opts.adminCheck)
      }
      if (table === 'v2_gang_members') {
        memberCallIndex++
        if (memberCallIndex === 1) return createQueryChain(opts.targetLookup)
        if (memberCallIndex === 2) return createQueryChain(opts.updateResult)
        return createQueryChain(opts.fallbackUpdateResult)
      }
      return createQueryChain({ data: null })
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockAdmin }, error: null })
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 29 })
  })

  test('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await blockMember(validGangId, validTargetId)

    expect(result).toEqual({ success: false, error: 'Not authenticated' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  test('returns error when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    const result = await blockMember(validGangId, validTargetId)

    expect(result).toEqual({
      success: false,
      error: 'Too many requests. Try again later.',
    })
    expect(mockRateLimit).toHaveBeenCalledWith(
      mockAdmin.id,
      'block_member',
      { max: 30, windowSeconds: 3600 },
    )
  })

  test('returns error for invalid gangId UUID', async () => {
    const result = await blockMember('not-a-uuid', validTargetId)

    expect(result).toEqual({ success: false, error: 'Invalid request' })
  })

  test('returns error for invalid userId UUID', async () => {
    const result = await blockMember(validGangId, 'not-a-uuid')

    expect(result).toEqual({ success: false, error: 'Invalid request' })
  })

  test('returns error when inner-join admin check returns null', async () => {
    setupBlockFromMock({
      adminCheck: { data: null },
    })

    const result = await blockMember(validGangId, validTargetId)

    expect(result).toEqual({
      success: false,
      error: "Gang not found or you don't have permission",
    })
  })

  test('returns error when attempting to block self', async () => {
    setupBlockFromMock()

    const result = await blockMember(validGangId, mockAdmin.id)

    expect(result).toEqual({
      success: false,
      error: 'Admins cannot leave. Delete the gang instead.',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })

  test('returns error when target member does not exist', async () => {
    setupBlockFromMock({ targetLookup: { data: null } })

    const result = await blockMember(validGangId, validTargetId)

    expect(result).toEqual({
      success: false,
      error: 'Member not found in this gang',
    })
  })

  test('returns error when target is an admin', async () => {
    setupBlockFromMock({
      targetLookup: { data: { role: 'admin', status: 'approved' } },
    })

    const result = await blockMember(validGangId, validTargetId)

    expect(result).toEqual({
      success: false,
      error: 'Admins cannot be removed or blocked',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })

  test('returns error when race-guarded update fails (approved path)', async () => {
    setupBlockFromMock({
      updateResult: { data: [], error: { message: 'db error' } },
    })

    const result = await blockMember(validGangId, validTargetId)

    expect(result).toEqual({
      success: false,
      error: 'Failed to block member. Please try again.',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  test('returns error when plain update fails (non-approved path)', async () => {
    setupBlockFromMock({
      targetLookup: { data: { role: 'member', status: 'left' } },
      updateResult: { error: { message: 'db error' } },
    })

    const result = await blockMember(validGangId, validTargetId)

    expect(result).toEqual({
      success: false,
      error: 'Failed to block member. Please try again.',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  test('blocks approved member, fires analytics, revalidates, and returns success', async () => {
    setupBlockFromMock()

    const result = await blockMember(validGangId, validTargetId)

    expect(result).toEqual({ success: true })
    expect(mockTrackEvent).toHaveBeenCalledWith(
      mockAdmin.id,
      ANALYTICS_EVENTS.MEMBER_BLOCKED,
      expect.objectContaining({
        gang_id: validGangId,
        blocked_user_id: validTargetId,
      }),
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/group/${validGangId}`)
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/group/${validGangId}/settings`,
    )
  })

  test('blocks member who has already left (no status transition)', async () => {
    setupBlockFromMock({
      targetLookup: { data: { role: 'member', status: 'left' } },
    })

    const result = await blockMember(validGangId, validTargetId)

    expect(result).toEqual({ success: true })
    expect(mockTrackEvent).toHaveBeenCalled()
  })

  test('blocks previously removed member (no status transition)', async () => {
    setupBlockFromMock({
      targetLookup: { data: { role: 'member', status: 'removed' } },
    })

    const result = await blockMember(validGangId, validTargetId)

    expect(result).toEqual({ success: true })
  })

  // ---- Race condition: approved→left between read and write ----

  test('falls back to plain is_blocked update when target status changed after read (race lost)', async () => {
    // Target reads as `approved`, but by the time the race-guarded update
    // fires, the row has transitioned to `left` elsewhere (another admin,
    // user leaving, etc.). The guarded update affects zero rows, so the
    // action falls back to a plain is_blocked=true update that preserves
    // the new status and does NOT clobber departed_at.
    setupBlockFromMock({
      targetLookup: { data: { role: 'member', status: 'approved' } },
      updateResult: { data: [], error: null },
      fallbackUpdateResult: { error: null },
    })

    const result = await blockMember(validGangId, validTargetId)

    expect(result).toEqual({ success: true })
    expect(mockTrackEvent).toHaveBeenCalledWith(
      mockAdmin.id,
      ANALYTICS_EVENTS.MEMBER_BLOCKED,
      expect.objectContaining({
        gang_id: validGangId,
        blocked_user_id: validTargetId,
      }),
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/group/${validGangId}`)
  })

  test('returns error when fallback update fails after race lost', async () => {
    setupBlockFromMock({
      targetLookup: { data: { role: 'member', status: 'approved' } },
      updateResult: { data: [], error: null },
      fallbackUpdateResult: { error: { message: 'db error' } },
    })

    const result = await blockMember(validGangId, validTargetId)

    expect(result).toEqual({
      success: false,
      error: 'Failed to block member. Please try again.',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// unblockMember
// ---------------------------------------------------------------------------

describe('unblockMember server action', () => {
  const mockAdmin = { id: '770e8400-e29b-41d4-a716-446655440002' }
  const validGangId = '550e8400-e29b-41d4-a716-446655440000'
  const validTargetId = '660e8400-e29b-41d4-a716-446655440001'

  /**
   * Sets up mockFrom for unblockMember calls.
   * Flow:
   *   1. v2_gangs — isApprovedGangAdmin inner-join check
   *   2. v2_gang_members — target member role lookup (.maybeSingle)
   *   3. v2_gang_members — update (with .select() to count affected rows)
   */
  function setupUnblockFromMock(overrides?: {
    adminCheck?: { data: unknown }
    targetLookup?: { data: unknown }
    updateResult?: { data?: unknown[]; error: unknown }
  }) {
    const opts = {
      adminCheck: { data: { id: validGangId } },
      targetLookup: { data: { role: 'member' } },
      updateResult: { data: [{ is_blocked: false }], error: null } as {
        data?: unknown[]
        error: unknown
      },
      ...overrides,
    }

    let memberCallIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gangs') {
        return createQueryChain(opts.adminCheck)
      }
      if (table === 'v2_gang_members') {
        memberCallIndex++
        if (memberCallIndex === 1) return createQueryChain(opts.targetLookup)
        return createQueryChain(opts.updateResult)
      }
      return createQueryChain({ data: null })
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockAdmin }, error: null })
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 29 })
  })

  test('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await unblockMember(validGangId, validTargetId)

    expect(result).toEqual({ success: false, error: 'Not authenticated' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  test('returns error when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    const result = await unblockMember(validGangId, validTargetId)

    expect(result).toEqual({
      success: false,
      error: 'Too many requests. Try again later.',
    })
    expect(mockRateLimit).toHaveBeenCalledWith(
      mockAdmin.id,
      'unblock_member',
      { max: 30, windowSeconds: 3600 },
    )
  })

  test('returns error for invalid gangId UUID', async () => {
    const result = await unblockMember('not-a-uuid', validTargetId)

    expect(result).toEqual({ success: false, error: 'Invalid request' })
  })

  test('returns error for invalid userId UUID', async () => {
    const result = await unblockMember(validGangId, 'not-a-uuid')

    expect(result).toEqual({ success: false, error: 'Invalid request' })
  })

  test('returns error when inner-join admin check returns null', async () => {
    setupUnblockFromMock({
      adminCheck: { data: null },
    })

    const result = await unblockMember(validGangId, validTargetId)

    expect(result).toEqual({
      success: false,
      error: "Gang not found or you don't have permission",
    })
  })

  // ---- Target guard (W-006) ----

  test('returns error when target member does not exist (target lookup)', async () => {
    setupUnblockFromMock({
      targetLookup: { data: null },
    })

    const result = await unblockMember(validGangId, validTargetId)

    expect(result).toEqual({
      success: false,
      error: 'Member not found in this gang',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  test('returns error when attempting to unblock an admin', async () => {
    setupUnblockFromMock({
      targetLookup: { data: { role: 'admin' } },
    })

    const result = await unblockMember(validGangId, validTargetId)

    expect(result).toEqual({
      success: false,
      error: 'Admins cannot be blocked or unblocked',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  test('returns error when update fails', async () => {
    setupUnblockFromMock({
      updateResult: { data: [], error: { message: 'db error' } },
    })

    const result = await unblockMember(validGangId, validTargetId)

    expect(result).toEqual({
      success: false,
      error: 'Failed to unblock member. Please try again.',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  test('returns error when update affects zero rows (race)', async () => {
    // Target lookup found a member, but the update matches zero rows — the
    // row was deleted or the status changed between the lookup and the
    // update. Must NOT fire analytics or revalidate.
    setupUnblockFromMock({
      updateResult: { data: [], error: null },
    })

    const result = await unblockMember(validGangId, validTargetId)

    expect(result).toEqual({
      success: false,
      error: 'Member not found in this gang',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  test('unblocks member, fires analytics, revalidates, and returns success', async () => {
    setupUnblockFromMock()

    const result = await unblockMember(validGangId, validTargetId)

    expect(result).toEqual({ success: true })
    expect(mockTrackEvent).toHaveBeenCalledWith(
      mockAdmin.id,
      ANALYTICS_EVENTS.MEMBER_UNBLOCKED,
      expect.objectContaining({
        gang_id: validGangId,
        unblocked_user_id: validTargetId,
      }),
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/group/${validGangId}`)
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/group/${validGangId}/settings`,
    )
  })
})
