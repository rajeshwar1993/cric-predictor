import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { formatDate, formatDeadline, formatMatchTime, formatTimeAgo } from './format-date'

describe('formatDate', () => {
  test('formats a Date object as absolute date without timezone', () => {
    const date = new Date('2026-03-28T14:00:00Z')
    const result = formatDate(date)
    // Should contain day, month abbreviation, year
    expect(result).toMatch(/28/)
    expect(result).toMatch(/Mar/)
    expect(result).toMatch(/2026/)
  })

  test('accepts an ISO string', () => {
    const result = formatDate('2026-03-28T14:00:00Z')
    expect(result).toMatch(/28/)
    expect(result).toMatch(/Mar/)
    expect(result).toMatch(/2026/)
  })

  test('handles different months', () => {
    const result = formatDate('2026-12-25T00:00:00Z')
    expect(result).toMatch(/25/)
    expect(result).toMatch(/Dec/)
    expect(result).toMatch(/2026/)
  })
})

describe('formatDeadline', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('returns time only when deadline is today', () => {
    vi.setSystemTime(new Date(2026, 2, 28, 10, 0, 0))

    // Same day, later
    const deadline = new Date(2026, 2, 28, 18, 45, 0)
    const result = formatDeadline(deadline)

    // Should contain time but NOT "Tomorrow" or a date
    expect(result).toMatch(/\d/)
    expect(result).not.toContain('Tomorrow')
  })

  test('includes "Tomorrow" when deadline is the next day', () => {
    vi.setSystemTime(new Date(2026, 2, 28, 18, 0, 0))

    const deadline = new Date(2026, 2, 29, 7, 30, 0)
    const result = formatDeadline(deadline)

    expect(result).toContain('Tomorrow')
    expect(result).toMatch(/\d/)
  })

  test('includes date when deadline is beyond tomorrow', () => {
    vi.setSystemTime(new Date(2026, 2, 28, 12, 0, 0))

    const deadline = new Date(2026, 2, 30, 7, 30, 0)
    const result = formatDeadline(deadline)

    expect(result).not.toContain('Tomorrow')
    expect(result).toMatch(/Mar/)
    expect(result).toMatch(/\d/)
  })

  test('accepts an ISO string', () => {
    vi.setSystemTime(new Date(2026, 2, 28, 12, 0, 0))

    const result = formatDeadline('2026-03-28T13:15:00')
    expect(result).toMatch(/\d/)
  })
})

describe('formatMatchTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('shows "Today" for a date on the current day', () => {
    // Set "now" to 2026-03-28 at noon local time
    vi.setSystemTime(new Date(2026, 2, 28, 12, 0, 0))

    // Same calendar day, evening
    const matchDate = new Date(2026, 2, 28, 19, 30, 0)
    const result = formatMatchTime(matchDate)

    expect(result).toContain('Today')
    expect(result).toContain('\u00B7')
  })

  test('shows "Tomorrow" for a date on the next day', () => {
    vi.setSystemTime(new Date(2026, 2, 28, 22, 0, 0))

    const matchDate = new Date(2026, 2, 29, 19, 30, 0)
    const result = formatMatchTime(matchDate)

    expect(result).toContain('Tomorrow')
    expect(result).toContain('\u00B7')
  })

  test('shows day and date for future dates beyond tomorrow', () => {
    vi.setSystemTime(new Date(2026, 2, 28, 12, 0, 0))

    // 2 days later
    const matchDate = new Date(2026, 2, 30, 19, 30, 0)
    const result = formatMatchTime(matchDate)

    expect(result).not.toContain('Today')
    expect(result).not.toContain('Tomorrow')
    // Should contain the middle dot separator
    expect(result).toContain('\u00B7')
    // Should contain the month abbreviation
    expect(result).toMatch(/Mar/)
  })

  test('accepts an ISO string', () => {
    vi.setSystemTime(new Date(2026, 2, 28, 12, 0, 0))

    const result = formatMatchTime('2026-03-28T19:30:00')
    expect(result).toContain('Today')
  })

  test('handles midnight boundary for today/tomorrow', () => {
    // Set now to 11:59 PM on March 28
    vi.setSystemTime(new Date(2026, 2, 28, 23, 59, 0))

    // Match at 12:01 AM on March 29 — this is tomorrow
    const matchDate = new Date(2026, 2, 29, 0, 1, 0)
    const result = formatMatchTime(matchDate)

    expect(result).toContain('Tomorrow')
  })
})

describe('formatTimeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('returns "Just now" for less than 1 minute ago', () => {
    const now = new Date(2026, 2, 28, 12, 0, 0)
    vi.setSystemTime(now)

    const date = new Date(now.getTime() - 30 * 1000) // 30 seconds ago
    expect(formatTimeAgo(date)).toBe('Just now')
  })

  test('returns "Just now" for exactly now', () => {
    const now = new Date(2026, 2, 28, 12, 0, 0)
    vi.setSystemTime(now)

    expect(formatTimeAgo(now)).toBe('Just now')
  })

  test('returns "Just now" for future dates', () => {
    const now = new Date(2026, 2, 28, 12, 0, 0)
    vi.setSystemTime(now)

    const future = new Date(now.getTime() + 60 * 1000)
    expect(formatTimeAgo(future)).toBe('Just now')
  })

  test('returns "Xm ago" for minutes', () => {
    const now = new Date(2026, 2, 28, 12, 0, 0)
    vi.setSystemTime(now)

    const date = new Date(now.getTime() - 5 * 60 * 1000) // 5 minutes ago
    expect(formatTimeAgo(date)).toBe('5m ago')
  })

  test('returns "1m ago" at exactly 1 minute', () => {
    const now = new Date(2026, 2, 28, 12, 0, 0)
    vi.setSystemTime(now)

    const date = new Date(now.getTime() - 60 * 1000)
    expect(formatTimeAgo(date)).toBe('1m ago')
  })

  test('returns "59m ago" at the edge of hours', () => {
    const now = new Date(2026, 2, 28, 12, 0, 0)
    vi.setSystemTime(now)

    const date = new Date(now.getTime() - 59 * 60 * 1000)
    expect(formatTimeAgo(date)).toBe('59m ago')
  })

  test('returns "Xh ago" for hours', () => {
    const now = new Date(2026, 2, 28, 12, 0, 0)
    vi.setSystemTime(now)

    const date = new Date(now.getTime() - 3 * 60 * 60 * 1000) // 3 hours ago
    expect(formatTimeAgo(date)).toBe('3h ago')
  })

  test('returns "1h ago" at exactly 1 hour', () => {
    const now = new Date(2026, 2, 28, 12, 0, 0)
    vi.setSystemTime(now)

    const date = new Date(now.getTime() - 60 * 60 * 1000)
    expect(formatTimeAgo(date)).toBe('1h ago')
  })

  test('returns "Xd ago" for days', () => {
    const now = new Date(2026, 2, 28, 12, 0, 0)
    vi.setSystemTime(now)

    const date = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
    expect(formatTimeAgo(date)).toBe('3d ago')
  })

  test('returns "6d ago" at the edge of week threshold', () => {
    const now = new Date(2026, 2, 28, 12, 0, 0)
    vi.setSystemTime(now)

    const date = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
    expect(formatTimeAgo(date)).toBe('6d ago')
  })

  test('falls back to formatDate for dates older than 7 days', () => {
    const now = new Date(2026, 2, 28, 12, 0, 0)
    vi.setSystemTime(now)

    const date = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
    const result = formatTimeAgo(date)

    // Should be an absolute date, not relative
    expect(result).not.toMatch(/ago/)
    expect(result).toMatch(/Mar/)
    expect(result).toMatch(/2026/)
  })

  test('accepts an ISO string', () => {
    const now = new Date(2026, 2, 28, 12, 0, 0)
    vi.setSystemTime(now)

    const date = new Date(now.getTime() - 2 * 60 * 1000)
    expect(formatTimeAgo(date.toISOString())).toBe('2m ago')
  })
})
