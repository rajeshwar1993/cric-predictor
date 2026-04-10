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
    const notificationChain = createQueryChain({ error: null })
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
      if (table === 'v2_notifications') return notificationChain
      return createQueryChain({ data: null })
    })

    await joinGangByCode('XK42AB')

    expect(notificationChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'new_member',
        user_id: 'admin-456',
      }),
    )
  })

  test('sends join_request notification to admin when auto-accept is off', async () => {
    mockRpc.mockResolvedValue({
      data: [{ ...mockGang, auto_accept: false }],
      error: null,
    })
    const notificationChain = createQueryChain({ error: null })
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
      if (table === 'v2_notifications') return notificationChain
      return createQueryChain({ data: null })
    })

    await joinGangByCode('XK42AB')

    expect(notificationChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'join_request',
        user_id: 'admin-456',
      }),
    )
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
   * 6. v2_gangs — fetch gang name (.single)
   * 7. v2_notifications — insert notification
   */
  function setupApproveFromMock(overrides?: {
    adminCheck?: { data: unknown }
    approvedCount?: number
    requesterProfile?: { data: unknown }
    duplicateName?: { data: unknown[] }
    updateResult?: { data: unknown[]; error: unknown }
    gangData?: { data: unknown }
    notificationResult?: { error: unknown }
  }) {
    const opts = {
      adminCheck: { data: { role: 'admin', status: 'approved' } },
      approvedCount: 5,
      requesterProfile: { data: { display_name: 'NewUser' } },
      duplicateName: { data: [] },
      updateResult: { data: [{ status: 'approved' }], error: null },
      gangData: { data: { name: 'Test Gang' } },
      notificationResult: { error: null },
      ...overrides,
    }

    let memberCallIndex = 0
    let gangsCallIndex = 0
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
      if (table === 'v2_gangs') {
        gangsCallIndex++
        if (gangsCallIndex === 1) return createQueryChain(opts.gangData)
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
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 59 })
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
   * 3. v2_gangs — fetch gang name (.single)
   * 4. v2_notifications — insert notification
   */
  function setupRejectFromMock(overrides?: {
    adminCheck?: { data: unknown }
    updateResult?: { data: unknown[]; error: unknown }
    gangData?: { data: unknown }
    notificationResult?: { error: unknown }
  }) {
    const opts = {
      adminCheck: { data: { role: 'admin', status: 'approved' } },
      updateResult: { data: [{ status: 'rejected' }], error: null },
      gangData: { data: { name: 'Test Gang' } },
      notificationResult: { error: null },
      ...overrides,
    }

    let memberCallIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gang_members') {
        memberCallIndex++
        if (memberCallIndex === 1) return createQueryChain(opts.adminCheck)
        if (memberCallIndex === 2) return createQueryChain(opts.updateResult)
      }
      if (table === 'v2_gangs') {
        return createQueryChain(opts.gangData)
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
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 59 })
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
   * 1. v2_gangs — soft-delete / existence check (.maybeSingle) inside
   *    `isApprovedGangAdmin`
   * 2. v2_gang_members — admin verification (.maybeSingle)
   * 3. v2_gangs — update name
   */
  function setupUpdateNameFromMock(overrides?: {
    softDeleteCheck?: { data: unknown }
    adminCheck?: { data: unknown }
    updateResult?: { error: unknown }
  }) {
    const opts = {
      softDeleteCheck: { data: { id: validGangId } },
      adminCheck: { data: { role: 'admin', status: 'approved' } },
      updateResult: { error: null },
      ...overrides,
    }

    let memberCallIndex = 0
    let gangCallIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gang_members') {
        memberCallIndex++
        if (memberCallIndex === 1) return createQueryChain(opts.adminCheck)
      }
      if (table === 'v2_gangs') {
        gangCallIndex++
        // First v2_gangs call is the soft-delete existence check; second is the update.
        if (gangCallIndex === 1) return createQueryChain(opts.softDeleteCheck)
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

  test('returns error when user is not an admin', async () => {
    setupUpdateNameFromMock({
      adminCheck: { data: { role: 'member', status: 'approved' } },
    })

    const result = await updateGangName(validGangId, 'Valid Name')

    expect(result).toEqual({
      success: false,
      error: "Gang not found or you don't have permission",
    })
  })

  test('returns error when admin membership is not approved', async () => {
    setupUpdateNameFromMock({
      adminCheck: { data: { role: 'admin', status: 'pending' } },
    })

    const result = await updateGangName(validGangId, 'Valid Name')

    expect(result).toEqual({
      success: false,
      error: "Gang not found or you don't have permission",
    })
  })

  test('returns error when no membership row exists', async () => {
    setupUpdateNameFromMock({ adminCheck: { data: null } })

    const result = await updateGangName(validGangId, 'Valid Name')

    expect(result).toEqual({
      success: false,
      error: "Gang not found or you don't have permission",
    })
  })

  // ---- Soft-delete guard ----

  test('returns generic error and does NOT mutate when gang is soft-deleted', async () => {
    // isApprovedGangAdmin's soft-delete SELECT filters on is_deleted=false,
    // so a soft-deleted gang resolves to `data: null` from that query.
    const updateSpy = vi.fn()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gangs') {
        // Soft-delete check returns no row (gang is deleted).
        const chain = createQueryChain({ data: null })
        // Track .update() calls on v2_gangs to assert no mutation occurred.
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
    // Action bailed before reaching the update branch.
    expect(updateSpy).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  // ---- Update failure ----

  test('returns error when update fails', async () => {
    setupUpdateNameFromMock({
      updateResult: { error: { message: 'db error' } },
    })

    const result = await updateGangName(validGangId, 'Valid Name')

    expect(result).toEqual({
      success: false,
      error: 'Failed to update gang name. Please try again.',
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
    softDeleteCheck?: { data: unknown }
    adminCheck?: { data: unknown }
    updateResult?: { error: unknown }
  }) {
    const opts = {
      softDeleteCheck: { data: { id: validGangId } },
      adminCheck: { data: { role: 'admin', status: 'approved' } },
      updateResult: { error: null },
      ...overrides,
    }

    let memberCallIndex = 0
    let gangCallIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gang_members') {
        memberCallIndex++
        if (memberCallIndex === 1) return createQueryChain(opts.adminCheck)
      }
      if (table === 'v2_gangs') {
        gangCallIndex++
        // First v2_gangs call is the soft-delete existence check; second is the update.
        if (gangCallIndex === 1) return createQueryChain(opts.softDeleteCheck)
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

  test('returns error when user is not admin', async () => {
    setupUpdateAutoAcceptFromMock({
      adminCheck: { data: { role: 'member', status: 'approved' } },
    })

    const result = await updateAutoAccept(validGangId, true)

    expect(result).toEqual({
      success: false,
      error: "Gang not found or you don't have permission",
    })
  })

  // ---- Update failure ----

  test('returns error when update fails', async () => {
    setupUpdateAutoAcceptFromMock({
      updateResult: { error: { message: 'db error' } },
    })

    const result = await updateAutoAccept(validGangId, true)

    expect(result).toEqual({
      success: false,
      error: 'Failed to update setting. Please try again.',
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
    softDeleteCheck?: { data: unknown }
    adminCheck?: { data: unknown }
    updateResult?: { data: unknown[]; error: unknown }
  }) {
    const opts = {
      softDeleteCheck: { data: { id: validGangId } },
      adminCheck: { data: { role: 'admin', status: 'approved' } },
      updateResult: { data: [{ gang_id: validGangId }], error: null },
      ...overrides,
    }

    let memberCallIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gangs') {
        // Soft-delete / existence check in isApprovedGangAdmin.
        return createQueryChain(opts.softDeleteCheck)
      }
      if (table === 'v2_gang_members') {
        memberCallIndex++
        if (memberCallIndex === 1) return createQueryChain(opts.adminCheck)
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

  test('returns error when user is not admin', async () => {
    setupUpdateDeadlineFromMock({
      adminCheck: { data: { role: 'member', status: 'approved' } },
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

  test('returns friendly error when no active season row exists', async () => {
    setupUpdateDeadlineFromMock({
      updateResult: { data: [], error: null },
    })

    const result = await updatePredictionDeadline(validGangId, 60)

    expect(result).toEqual({
      success: false,
      error: 'No active season found for this gang yet.',
    })
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
      p_caller_id: 'admin-user-123',
    })
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'admin-user-123',
      'gang_deleted',
      expect.objectContaining({ gang_id: validGangId }),
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/group/${validGangId}`)
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/group/${validGangId}/settings`,
    )
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
   *   1. v2_gangs — isApprovedGangAdmin soft-delete existence check
   *   2. v2_gang_members — isApprovedGangAdmin role/status check
   *   3. v2_gang_members — target member role lookup
   *   4. v2_gang_members — update (with .select())
   */
  function setupRemoveFromMock(overrides?: {
    softDeleteCheck?: { data: unknown }
    adminCheck?: { data: unknown }
    targetLookup?: { data: unknown }
    updateResult?: { data: unknown[]; error: unknown }
  }) {
    const opts = {
      softDeleteCheck: { data: { id: validGangId } },
      adminCheck: { data: { role: 'admin', status: 'approved' } },
      targetLookup: { data: { role: 'member' } },
      updateResult: { data: [{ status: 'removed' }], error: null },
      ...overrides,
    }

    let memberCallIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gangs') {
        return createQueryChain(opts.softDeleteCheck)
      }
      if (table === 'v2_gang_members') {
        memberCallIndex++
        if (memberCallIndex === 1) return createQueryChain(opts.adminCheck)
        if (memberCallIndex === 2) return createQueryChain(opts.targetLookup)
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

  test('returns error when caller is not an admin', async () => {
    setupRemoveFromMock({
      adminCheck: { data: { role: 'member', status: 'approved' } },
    })

    const result = await removeMember(validGangId, validTargetId)

    expect(result).toEqual({
      success: false,
      error: "Gang not found or you don't have permission",
    })
  })

  test('returns error when gang is soft-deleted', async () => {
    setupRemoveFromMock({
      softDeleteCheck: { data: null },
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
      error: "You can't perform this action on yourself",
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
      'member_removed',
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
   *   1. v2_gangs — isApprovedGangAdmin soft-delete existence check
   *   2. v2_gang_members — isApprovedGangAdmin role/status check
   *   3. v2_gang_members — target member role+status lookup
   *   4. v2_gang_members — update (race-guarded when approved) OR plain
   *      update for non-approved targets
   *   5. v2_gang_members — OPTIONAL fallback update (only when approved +
   *      race-guarded update affected zero rows)
   */
  function setupBlockFromMock(overrides?: {
    softDeleteCheck?: { data: unknown }
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
      softDeleteCheck: { data: { id: validGangId } },
      adminCheck: { data: { role: 'admin', status: 'approved' } },
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
        return createQueryChain(opts.softDeleteCheck)
      }
      if (table === 'v2_gang_members') {
        memberCallIndex++
        if (memberCallIndex === 1) return createQueryChain(opts.adminCheck)
        if (memberCallIndex === 2) return createQueryChain(opts.targetLookup)
        if (memberCallIndex === 3) return createQueryChain(opts.updateResult)
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

  test('returns error when caller is not an admin', async () => {
    setupBlockFromMock({
      adminCheck: { data: { role: 'member', status: 'approved' } },
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
      error: "You can't perform this action on yourself",
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
      'member_blocked',
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
      'member_blocked',
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
   *   1. v2_gangs — isApprovedGangAdmin soft-delete existence check
   *   2. v2_gang_members — isApprovedGangAdmin role/status check
   *   3. v2_gang_members — update (with .select() to count affected rows)
   */
  function setupUnblockFromMock(overrides?: {
    softDeleteCheck?: { data: unknown }
    adminCheck?: { data: unknown }
    updateResult?: { data?: unknown[]; error: unknown }
  }) {
    const opts = {
      softDeleteCheck: { data: { id: validGangId } },
      adminCheck: { data: { role: 'admin', status: 'approved' } },
      updateResult: { data: [{ is_blocked: false }], error: null } as {
        data?: unknown[]
        error: unknown
      },
      ...overrides,
    }

    let memberCallIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v2_gangs') {
        return createQueryChain(opts.softDeleteCheck)
      }
      if (table === 'v2_gang_members') {
        memberCallIndex++
        if (memberCallIndex === 1) return createQueryChain(opts.adminCheck)
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

  test('returns error when caller is not an admin', async () => {
    setupUnblockFromMock({
      adminCheck: { data: { role: 'member', status: 'approved' } },
    })

    const result = await unblockMember(validGangId, validTargetId)

    expect(result).toEqual({
      success: false,
      error: "Gang not found or you don't have permission",
    })
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

  test('returns error when target member does not exist', async () => {
    // Update succeeds but affects zero rows — the target user is not a
    // member of this gang. Must NOT fire analytics or revalidate.
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
      'member_unblocked',
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
