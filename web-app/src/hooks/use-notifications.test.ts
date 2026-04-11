import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useNotifications } from './use-notifications'
import type { Notification } from '@/types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/**
 * Captures the handler the hook registers with `.on('postgres_changes', ...)`
 * so the tests can emit realtime events synchronously via `emitRealtimeEvent`.
 */
type RealtimeHandler = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Notification | Record<string, never>
  old: Notification | Record<string, never>
}) => void

let capturedHandler: RealtimeHandler | null = null

// Unread-count query mock: .from(...).select(...).eq(...).eq(...) → Promise
const mockCountEqIsRead = vi.fn()
const mockCountEqUserId = vi.fn(() => ({ eq: mockCountEqIsRead }))
const mockCountSelect = vi.fn(
  (_columns: string, _options?: { count?: string; head?: boolean }) => ({
    eq: mockCountEqUserId,
  }),
)

// List query mock (not used in these tests, but the hook references it so we
// provide a stub that never resolves unless a test explicitly opts in).
const mockListLimit = vi.fn(() => Promise.resolve({ data: [], error: null }))
const mockListOrder = vi.fn(() => ({ limit: mockListLimit }))
const mockListEq = vi.fn(() => ({ order: mockListOrder }))
const mockListSelect = vi.fn((_columns: string) => ({ eq: mockListEq }))

const mockFrom = vi.fn((_table: string) => {
  // Return an object that supports BOTH the count query shape and the list
  // query shape. `select` is called once per query; the options arg tells us
  // which shape the caller wants.
  return {
    select: (_columns: string, options?: { count?: string; head?: boolean }) => {
      if (options?.head) {
        return mockCountSelect(_columns, options)
      }
      return mockListSelect(_columns)
    },
  }
})

const mockSubscribe = vi.fn(() => ({}))
const mockOn = vi.fn((_event: string, _filter: unknown, handler: RealtimeHandler) => {
  capturedHandler = handler
  return { subscribe: mockSubscribe }
})
const mockChannel = vi.fn(() => ({ on: mockOn }))
const mockRemoveChannel = vi.fn()

// The hook stores the client in a ref so it must be stable across renders.
const stableClient = {
  from: mockFrom,
  channel: mockChannel,
  removeChannel: mockRemoveChannel,
}

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => stableClient,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'user-123'

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    user_id: USER_ID,
    type: 'deadline_reminder',
    message: 'Your prediction is locked',
    gang_id: null,
    fixture_id: null,
    is_read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function emitRealtimeEvent(payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Notification | Record<string, never>
  old: Notification | Record<string, never>
}) {
  if (!capturedHandler) {
    throw new Error('Realtime handler was not registered by the hook')
  }
  capturedHandler(payload)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useNotifications', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    // Reset (not just clear) so any queued `mockResolvedValueOnce` responses
    // from the previous test don't leak into this one.
    mockCountEqIsRead.mockReset()
    mockCountEqUserId.mockClear()
    mockCountSelect.mockClear()
    mockListLimit.mockClear()
    mockListOrder.mockClear()
    mockListEq.mockClear()
    mockListSelect.mockClear()
    mockFrom.mockClear()
    mockSubscribe.mockClear()
    mockOn.mockClear()
    mockChannel.mockClear()
    mockRemoveChannel.mockClear()
    capturedHandler = null

    // Default: unread count starts at 0.
    mockCountEqIsRead.mockResolvedValue({ count: 0, error: null })

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('increments the unread count when an INSERT event arrives', async () => {
    // Initial fetch resolves with 0, then the post-INSERT refetch returns 1.
    mockCountEqIsRead
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: 1, error: null })

    const { result } = renderHook(() => useNotifications(USER_ID))

    await waitFor(() => {
      expect(result.current.isLoadingCount).toBe(false)
    })
    expect(result.current.unreadCount).toBe(0)

    await act(async () => {
      emitRealtimeEvent({
        eventType: 'INSERT',
        new: makeNotification({ id: 'notif-new', is_read: false }),
        old: {},
      })
    })

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(1)
    })
    expect(result.current.pulse).toBe(true)
  })

  it('re-syncs the unread count on mark-as-read UPDATE', async () => {
    // Initial fetch: 2 unread. After UPDATE (mark one as read): 1.
    mockCountEqIsRead
      .mockResolvedValueOnce({ count: 2, error: null })
      .mockResolvedValueOnce({ count: 1, error: null })

    const { result } = renderHook(() => useNotifications(USER_ID))

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(2)
    })

    await act(async () => {
      emitRealtimeEvent({
        eventType: 'UPDATE',
        new: makeNotification({ id: 'notif-1', is_read: true }),
        old: makeNotification({ id: 'notif-1', is_read: false }),
      })
    })

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(1)
    })
  })

  it('cleans up the realtime channel on unmount', async () => {
    const { result, unmount } = renderHook(() => useNotifications(USER_ID))

    await waitFor(() => {
      expect(result.current.isLoadingCount).toBe(false)
    })

    expect(mockChannel).toHaveBeenCalledWith(`notifications:${USER_ID}`)
    expect(mockSubscribe).toHaveBeenCalled()

    unmount()

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1)
  })

  it('prepends the payload row to notifications on INSERT', async () => {
    const { result } = renderHook(() => useNotifications(USER_ID))

    await waitFor(() => {
      expect(result.current.isLoadingCount).toBe(false)
    })

    expect(result.current.notifications).toHaveLength(0)

    const newRow = makeNotification({ id: 'notif-new', message: 'Fresh notification' })

    await act(async () => {
      emitRealtimeEvent({
        eventType: 'INSERT',
        new: newRow,
        old: {},
      })
    })

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1)
    })
    expect(result.current.notifications[0]).toEqual(newRow)

    // Emitting the same INSERT again must not create a duplicate.
    await act(async () => {
      emitRealtimeEvent({
        eventType: 'INSERT',
        new: newRow,
        old: {},
      })
    })

    expect(result.current.notifications).toHaveLength(1)
  })

  it('re-fetches unread count when the tab becomes visible', async () => {
    // Initial mount fetch returns 0.
    mockCountEqIsRead.mockResolvedValue({ count: 0, error: null })

    const { result } = renderHook(() => useNotifications(USER_ID))

    await waitFor(() => {
      expect(result.current.isLoadingCount).toBe(false)
    })
    expect(result.current.unreadCount).toBe(0)

    const initialCountCalls = mockCountEqIsRead.mock.calls.length

    // Switch the mock so the next fetch (triggered by the visibility
    // change) returns 5.
    mockCountEqIsRead.mockResolvedValue({ count: 5, error: null })

    // Dispatch a visibilitychange while the tab is visible.
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() => {
      expect(mockCountEqIsRead.mock.calls.length).toBeGreaterThan(initialCountCalls)
    })
    await waitFor(() => {
      expect(result.current.unreadCount).toBe(5)
    })
  })

  it('does not re-fetch unread count when the tab becomes hidden', async () => {
    const { result } = renderHook(() => useNotifications(USER_ID))

    await waitFor(() => {
      expect(result.current.isLoadingCount).toBe(false)
    })

    const initialCountCalls = mockCountEqIsRead.mock.calls.length

    // Make the tab hidden and dispatch the event.
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(mockCountEqIsRead.mock.calls.length).toBe(initialCountCalls)
  })
})

