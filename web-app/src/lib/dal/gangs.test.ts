import { beforeEach, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — chain-style to simulate Supabase PostgREST builder
// ---------------------------------------------------------------------------

/** Tracks calls to `.from()` */
const mockFrom = vi.fn()
/** Tracks calls to `.select()` */
const mockSelect = vi.fn()
/** Tracks calls to `.eq()` */
const mockEq = vi.fn()
/** Tracks calls to `.rpc()` */
const mockRpc = vi.fn()
/** Tracks calls to `.maybeSingle()` */
const mockMaybeSingle = vi.fn()

/**
 * Build a chainable mock that records every method call and resolves to
 * `resolvedValue` at the end of the chain.
 */
function chainBuilder(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, (...args: unknown[]) => typeof chain> & {
    then: (fn: (v: { data: unknown; error: unknown }) => void) => void
  } = {
    select(...args: unknown[]) {
      mockSelect(...args)
      return chain
    },
    eq(...args: unknown[]) {
      mockEq(...args)
      return chain
    },
    maybeSingle() {
      mockMaybeSingle()
      return chain
    },
    // Make it thenable so `await` resolves it
    then(fn: (v: { data: unknown; error: unknown }) => void) {
      fn(resolvedValue)
    },
  }
  return chain
}

/** The per-test resolved value for the query. */
let queryResult: { data: unknown; error: unknown }

/** The per-test resolved value for RPC calls. */
let rpcResult: { data: unknown; error: unknown }

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockImplementation(async () => ({
    from: (table: string) => {
      mockFrom(table)
      return chainBuilder(queryResult)
    },
    rpc: (fnName: string, params: unknown) => {
      mockRpc(fnName, params)
      return chainBuilder(rpcResult)
    },
  })),
}))

// Import after mocks
const { getUserGangs, getGangByInviteCode, getMembershipStatus } =
  await import('./gangs')

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

const GANG_A = {
  id: 'gang-aaa',
  name: 'Mumbai Mavericks',
  invite_code: 'ABC123',
  created_at: '2026-03-01T00:00:00Z',
}

const GANG_B = {
  id: 'gang-bbb',
  name: 'Delhi Dynamos',
  invite_code: 'XYZ789',
  created_at: '2026-03-10T00:00:00Z',
}

// ---------------------------------------------------------------------------
// Tests — getUserGangs
// ---------------------------------------------------------------------------

describe('getUserGangs', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: no gangs
    queryResult = { data: [], error: null }
    rpcResult = { data: [], error: null }
  })

  test('returns empty array when user has no approved memberships', async () => {
    const result = await getUserGangs('user-1')

    expect(result).toEqual([])
    expect(mockFrom).toHaveBeenCalledTimes(1)
    expect(mockFrom).toHaveBeenCalledWith('v2_gang_members')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mockEq).toHaveBeenCalledWith('status', 'approved')
  })

  test('maps membership rows to UserGang shape with correct member counts', async () => {
    queryResult = {
      data: [
        {
          role: 'admin',
          v2_gangs: {
            ...GANG_A,
            v2_gang_members: [{ count: 3 }],
          },
        },
        {
          role: 'member',
          v2_gangs: {
            ...GANG_B,
            v2_gang_members: [{ count: 2 }],
          },
        },
      ],
      error: null,
    }

    const result = await getUserGangs('user-1')

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      id: 'gang-aaa',
      name: 'Mumbai Mavericks',
      inviteCode: 'ABC123',
      role: 'admin',
      memberCount: 3,
      createdAt: '2026-03-01T00:00:00Z',
    })
    expect(result[1]).toEqual({
      id: 'gang-bbb',
      name: 'Delhi Dynamos',
      inviteCode: 'XYZ789',
      role: 'member',
      memberCount: 2,
      createdAt: '2026-03-10T00:00:00Z',
    })
  })

  test('throws when the query errors', async () => {
    queryResult = { data: null, error: { message: 'db error', code: '42P01' } }

    await expect(getUserGangs('user-1')).rejects.toEqual(
      expect.objectContaining({ message: 'db error' }),
    )
  })

  test('returns 0 memberCount when nested count is zero', async () => {
    queryResult = {
      data: [
        {
          role: 'admin',
          v2_gangs: {
            ...GANG_A,
            v2_gang_members: [{ count: 0 }],
          },
        },
      ],
      error: null,
    }

    const result = await getUserGangs('user-1')

    expect(result).toHaveLength(1)
    expect(result[0]?.memberCount).toBe(0)
  })

  test('queries with correct filters including nested count filter', async () => {
    queryResult = {
      data: [
        {
          role: 'member',
          v2_gangs: {
            ...GANG_A,
            v2_gang_members: [{ count: 1 }],
          },
        },
      ],
      error: null,
    }

    await getUserGangs('user-42')

    // Only one .from() call — single query approach
    expect(mockFrom).toHaveBeenCalledTimes(1)
    expect(mockFrom).toHaveBeenCalledWith('v2_gang_members')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-42')
    expect(mockEq).toHaveBeenCalledWith('status', 'approved')
    expect(mockEq).toHaveBeenCalledWith('v2_gangs.is_deleted', false)
    // Nested count filter for approved members only
    expect(mockEq).toHaveBeenCalledWith('v2_gangs.v2_gang_members.status', 'approved')
  })
})

// ---------------------------------------------------------------------------
// Tests — getGangByInviteCode
// ---------------------------------------------------------------------------

describe('getGangByInviteCode', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    queryResult = { data: [], error: null }
    rpcResult = { data: [], error: null }
  })

  test('returns null when no gang matches the invite code', async () => {
    rpcResult = { data: [], error: null }

    const result = await getGangByInviteCode('NOCODE')

    expect(result).toBeNull()
    expect(mockRpc).toHaveBeenCalledWith('get_gang_by_invite_code', {
      p_invite_code: 'NOCODE',
    })
  })

  test('returns null when RPC returns null data', async () => {
    rpcResult = { data: null, error: null }

    const result = await getGangByInviteCode('NOCODE')

    expect(result).toBeNull()
  })

  test('maps RPC row to GangByInviteCode shape', async () => {
    rpcResult = {
      data: [
        {
          id: 'gang-123',
          name: 'Test Gang',
          auto_accept: true,
          is_deleted: false,
          created_by: 'user-abc',
        },
      ],
      error: null,
    }

    const result = await getGangByInviteCode('ABC123')

    expect(result).toEqual({
      id: 'gang-123',
      name: 'Test Gang',
      autoAccept: true,
      isDeleted: false,
      createdBy: 'user-abc',
    })
  })

  test('throws when the RPC errors', async () => {
    rpcResult = { data: null, error: { message: 'rpc error', code: '42883' } }

    await expect(getGangByInviteCode('ABC123')).rejects.toEqual(
      expect.objectContaining({ message: 'rpc error' }),
    )
  })

  test('takes first row when RPC returns multiple (edge case)', async () => {
    rpcResult = {
      data: [
        {
          id: 'gang-first',
          name: 'First Gang',
          auto_accept: false,
          is_deleted: false,
          created_by: 'user-1',
        },
        {
          id: 'gang-second',
          name: 'Second Gang',
          auto_accept: true,
          is_deleted: false,
          created_by: 'user-2',
        },
      ],
      error: null,
    }

    const result = await getGangByInviteCode('DUP001')

    expect(result?.id).toBe('gang-first')
  })
})

// ---------------------------------------------------------------------------
// Tests — getMembershipStatus
// ---------------------------------------------------------------------------

describe('getMembershipStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    queryResult = { data: null, error: null }
    rpcResult = { data: [], error: null }
  })

  test('returns null when user has no membership in the gang', async () => {
    queryResult = { data: null, error: null }

    const result = await getMembershipStatus('gang-1', 'user-1')

    expect(result).toBeNull()
    expect(mockFrom).toHaveBeenCalledWith('v2_gang_members')
    expect(mockSelect).toHaveBeenCalledWith('status, is_blocked')
    expect(mockEq).toHaveBeenCalledWith('gang_id', 'gang-1')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1)
  })

  test('maps membership row to MembershipInfo shape — approved, not blocked', async () => {
    queryResult = {
      data: { status: 'approved', is_blocked: false },
      error: null,
    }

    const result = await getMembershipStatus('gang-1', 'user-1')

    expect(result).toEqual({ status: 'approved', isBlocked: false })
  })

  test('maps membership row to MembershipInfo shape — pending, not blocked', async () => {
    queryResult = {
      data: { status: 'pending', is_blocked: false },
      error: null,
    }

    const result = await getMembershipStatus('gang-1', 'user-1')

    expect(result).toEqual({ status: 'pending', isBlocked: false })
  })

  test('maps membership row to MembershipInfo shape — rejected, blocked', async () => {
    queryResult = {
      data: { status: 'rejected', is_blocked: true },
      error: null,
    }

    const result = await getMembershipStatus('gang-1', 'user-1')

    expect(result).toEqual({ status: 'rejected', isBlocked: true })
  })

  test('throws when the query errors', async () => {
    queryResult = { data: null, error: { message: 'db error', code: '42P01' } }

    await expect(getMembershipStatus('gang-1', 'user-1')).rejects.toEqual(
      expect.objectContaining({ message: 'db error' }),
    )
  })
})
