import { beforeEach, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — chainable builder to simulate Supabase PostgREST query builder.
// ---------------------------------------------------------------------------

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()

/**
 * Build a chainable mock that records method calls and resolves to
 * `resolvedValue` at the end of the chain. Delegates `then` to a real
 * Promise so `await` semantics (rejection, chaining) behave correctly.
 */
function chainBuilder(resolvedValue: {
  data?: unknown
  error: unknown
  count?: number | null
}) {
  const chain = {
    select(...args: unknown[]) {
      mockSelect(...args)
      return chain
    },
    eq(...args: unknown[]) {
      mockEq(...args)
      return chain
    },
    order(...args: unknown[]) {
      mockOrder(...args)
      return chain
    },
    limit(...args: unknown[]) {
      mockLimit(...args)
      return chain
    },
    then(
      fn: (v: {
        data?: unknown
        error: unknown
        count?: number | null
      }) => unknown,
    ) {
      return Promise.resolve(resolvedValue).then(fn)
    },
  }
  return chain
}

let tableResults: Map<
  string,
  { data?: unknown; error: unknown; count?: number | null }
>

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockImplementation(async () => ({
    from: (table: string) => {
      mockFrom(table)
      const result = tableResults.get(table) ?? { data: [], error: null }
      return chainBuilder(result)
    },
  })),
}))

// Import after mocks
const { getNotifications, getUnreadCount } = await import('./notifications')

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const NOTIF_A = {
  id: 'notif-aaa',
  user_id: 'user-1',
  type: 'new_member',
  message: 'Virat joined your gang',
  gang_id: 'gang-1',
  fixture_id: null,
  is_read: false,
  created_at: '2026-04-10T12:00:00Z',
}

const NOTIF_B = {
  id: 'notif-bbb',
  user_id: 'user-1',
  type: 'deadline_reminder',
  message: 'Lock in your picks before 7:15 PM',
  gang_id: 'gang-1',
  fixture_id: 'fx-1',
  is_read: true,
  created_at: '2026-04-10T11:00:00Z',
}

// ---------------------------------------------------------------------------
// getNotifications
// ---------------------------------------------------------------------------

describe('getNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tableResults = new Map()
  })

  test('returns empty array when user has no notifications', async () => {
    tableResults.set('v2_notifications', { data: [], error: null })

    const result = await getNotifications('user-1')

    expect(result).toEqual([])
    expect(mockFrom).toHaveBeenCalledWith('v2_notifications')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  test('returns notifications ordered by created_at desc with default limit 20', async () => {
    tableResults.set('v2_notifications', {
      data: [NOTIF_A, NOTIF_B],
      error: null,
    })

    const result = await getNotifications('user-1')

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(NOTIF_A)
    expect(result[1]).toEqual(NOTIF_B)
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(mockLimit).toHaveBeenCalledWith(20)
  })

  test('honors the provided limit when supplied', async () => {
    tableResults.set('v2_notifications', { data: [NOTIF_A], error: null })

    await getNotifications('user-1', 5)

    expect(mockLimit).toHaveBeenCalledWith(5)
  })

  test('handles null data as empty array', async () => {
    tableResults.set('v2_notifications', { data: null, error: null })

    const result = await getNotifications('user-1')

    expect(result).toEqual([])
  })

  test('throws when the query errors', async () => {
    tableResults.set('v2_notifications', {
      data: null,
      error: { message: 'db error', code: '42P01' },
    })

    await expect(getNotifications('user-1')).rejects.toEqual(
      expect.objectContaining({ message: 'db error' }),
    )
  })
})

// ---------------------------------------------------------------------------
// getUnreadCount
// ---------------------------------------------------------------------------

describe('getUnreadCount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tableResults = new Map()
  })

  test('returns 0 when there are no unread notifications', async () => {
    tableResults.set('v2_notifications', { count: 0, error: null })

    const result = await getUnreadCount('user-1')

    expect(result).toBe(0)
  })

  test('returns the count reported by Supabase', async () => {
    tableResults.set('v2_notifications', { count: 7, error: null })

    const result = await getUnreadCount('user-42')

    expect(result).toBe(7)
    expect(mockFrom).toHaveBeenCalledWith('v2_notifications')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-42')
    expect(mockEq).toHaveBeenCalledWith('is_read', false)
  })

  test('treats a null count as zero', async () => {
    tableResults.set('v2_notifications', { count: null, error: null })

    const result = await getUnreadCount('user-1')

    expect(result).toBe(0)
  })

  test('throws when the query errors', async () => {
    tableResults.set('v2_notifications', {
      count: null,
      error: { message: 'permission denied', code: '42501' },
    })

    await expect(getUnreadCount('user-1')).rejects.toEqual(
      expect.objectContaining({ message: 'permission denied' }),
    )
  })
})
