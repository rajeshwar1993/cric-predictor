import { beforeEach, describe, expect, test, vi } from 'vitest'

import { ANALYTICS_EVENTS } from '@/lib/analytics/events'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('server-only', () => ({}))

const mockGetUser = vi.fn()
const mockRateLimit = vi.fn()
const mockTrackEvent = vi.fn()
const mockCaptureServerError = vi.fn()
const mockRevalidatePath = vi.fn()
const mockFrom = vi.fn()

function createQueryChain(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {}
  const handler = () => chain
  chain.select = vi.fn().mockImplementation(handler)
  chain.update = vi.fn().mockImplementation(handler)
  chain.eq = vi.fn().mockImplementation(handler)
  chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => void) => {
    resolve(resolvedValue)
  })
  return chain
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
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

// Import after mocks
const { markNotificationAsRead, markAllNotificationsAsRead } = await import(
  './notifications'
)

// ---------------------------------------------------------------------------
// markNotificationAsRead
// ---------------------------------------------------------------------------

describe('markNotificationAsRead', () => {
  const mockUser = { id: 'user-123' }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 59 })
    mockFrom.mockImplementation(() => createQueryChain({ error: null }))
  })

  test('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await markNotificationAsRead('notif-1')

    expect(result).toEqual({ success: false, error: 'Not authenticated' })
    expect(mockFrom).not.toHaveBeenCalled()
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })

  test('returns rate limit error when exceeded', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    // Use a valid UUID so validation passes and we reach the rate-limit
    // gate — validation runs BEFORE rate-limit so an invalid id would
    // never consume the 60/min budget.
    const result = await markNotificationAsRead(
      '11111111-1111-4111-8111-111111111111',
    )

    expect(result).toEqual({
      success: false,
      error: 'Too many requests. Try again later.',
    })
    expect(mockRateLimit).toHaveBeenCalledWith(
      'user-123',
      'mark_notification_read',
      expect.objectContaining({ max: 60, windowSeconds: 60 }),
    )
    expect(mockFrom).not.toHaveBeenCalled()
  })

  test('returns validation error for empty notification id', async () => {
    const result = await markNotificationAsRead('')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/notification/i)
    }
    expect(mockFrom).not.toHaveBeenCalled()
  })

  test('returns validation error for non-uuid notification id', async () => {
    const result = await markNotificationAsRead('not-a-uuid')

    expect(result.success).toBe(false)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  test('validates before rate-limiting so invalid ids do not eat the budget', async () => {
    const result = await markNotificationAsRead('not-a-uuid')

    expect(result).toEqual({ success: false, error: 'Invalid notification id' })
    // Rate limiter must NOT be called — validation short-circuited it.
    expect(mockRateLimit).not.toHaveBeenCalled()
  })

  test('updates notification, fires analytics, and returns success', async () => {
    const result = await markNotificationAsRead(
      '11111111-1111-4111-8111-111111111111',
    )

    expect(result).toEqual({ success: true })
    expect(mockFrom).toHaveBeenCalledWith('v2_notifications')
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'user-123',
      ANALYTICS_EVENTS.NOTIFICATION_MARKED_READ,
      expect.objectContaining({
        notification_id: '11111111-1111-4111-8111-111111111111',
      }),
    )
    // Wrapped in withTiming with the camelCase action name + resolved user id
    expect(mockWithTiming).toHaveBeenCalledWith(
      'markNotificationAsRead',
      'user-123',
      expect.any(Function),
    )
  })

  test('returns error when update fails', async () => {
    mockFrom.mockImplementation(() =>
      createQueryChain({ error: { message: 'db error' } }),
    )

    const result = await markNotificationAsRead(
      '11111111-1111-4111-8111-111111111111',
    )

    expect(result).toEqual({
      success: false,
      error: 'Failed to mark notification as read.',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
    // Failure path forwards the error to PostHog with the action source
    expect(mockCaptureServerError).toHaveBeenCalledWith(
      'user-123',
      expect.anything(),
      expect.objectContaining({ source: 'markNotificationAsRead' }),
    )
  })
})

// ---------------------------------------------------------------------------
// markAllNotificationsAsRead
// ---------------------------------------------------------------------------

describe('markAllNotificationsAsRead', () => {
  const mockUser = { id: 'user-123' }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 9 })
    mockFrom.mockImplementation(() => createQueryChain({ error: null }))
  })

  test('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await markAllNotificationsAsRead()

    expect(result).toEqual({ success: false, error: 'Not authenticated' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  test('returns rate limit error when exceeded', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    const result = await markAllNotificationsAsRead()

    expect(result).toEqual({
      success: false,
      error: 'Too many requests. Try again later.',
    })
    expect(mockRateLimit).toHaveBeenCalledWith(
      'user-123',
      'mark_all_notifications_read',
      expect.objectContaining({ max: 10, windowSeconds: 60 }),
    )
    expect(mockFrom).not.toHaveBeenCalled()
  })

  test('updates all unread notifications, fires analytics, and returns success', async () => {
    const result = await markAllNotificationsAsRead()

    expect(result).toEqual({ success: true })
    expect(mockFrom).toHaveBeenCalledWith('v2_notifications')
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'user-123',
      ANALYTICS_EVENTS.ALL_NOTIFICATIONS_MARKED_READ,
      expect.any(Object),
    )
  })

  test('returns error when update fails', async () => {
    mockFrom.mockImplementation(() =>
      createQueryChain({ error: { message: 'db error' } }),
    )

    const result = await markAllNotificationsAsRead()

    expect(result).toEqual({
      success: false,
      error: 'Failed to mark notifications as read.',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })
})
