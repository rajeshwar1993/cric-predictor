import { describe, expect, test } from 'vitest'

import { cn, generateInviteMessage, getAvatarInitials, pluralize, truncate } from './utils'

describe('cn (class name merge utility)', () => {
  test('merges simple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  test('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  test('deduplicates conflicting Tailwind classes', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  test('handles undefined and null inputs', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  test('returns empty string with no inputs', () => {
    expect(cn()).toBe('')
  })
})

describe('getAvatarInitials', () => {
  test('extracts initials from two words', () => {
    expect(getAvatarInitials('Rajesh Kumar')).toBe('RK')
  })

  test('extracts single initial from one word', () => {
    expect(getAvatarInitials('Virat')).toBe('V')
  })

  test('returns "?" for empty string', () => {
    expect(getAvatarInitials('')).toBe('?')
  })

  test('returns "?" for whitespace-only string', () => {
    expect(getAvatarInitials('   ')).toBe('?')
  })

  test('handles more than two words (takes first two)', () => {
    expect(getAvatarInitials('Mahendra Singh Dhoni')).toBe('MS')
  })

  test('returns uppercase initials for lowercase input', () => {
    expect(getAvatarInitials('rohit sharma')).toBe('RS')
  })

  test('handles extra whitespace between words', () => {
    expect(getAvatarInitials('  Rohit   Sharma  ')).toBe('RS')
  })
})

describe('generateInviteMessage', () => {
  test('produces expected message format', () => {
    const result = generateInviteMessage(
      'Mumbai Mavericks',
      'Rajesh',
      'abc123',
      'https://bragg.app',
    )

    expect(result).toContain('Rajesh invited you to join "Mumbai Mavericks" on Bragg!')
    expect(result).toContain('https://bragg.app/join/abc123')
    expect(result).toContain('Predict IPL matches')
  })

  test('includes the join URL with the invite code', () => {
    const result = generateInviteMessage('Gang', 'User', 'xyz', 'http://localhost:3000')

    expect(result).toContain('http://localhost:3000/join/xyz')
  })
})

describe('truncate', () => {
  test('returns the original string if under max length', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  test('returns the original string if exactly at max length', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })

  test('truncates and adds ellipsis when over max length', () => {
    const result = truncate('hello world', 6)
    expect(result).toBe('hello\u2026')
    expect(result.length).toBe(6)
  })

  test('handles single character max length', () => {
    expect(truncate('hello', 1)).toBe('\u2026')
  })

  test('handles empty string', () => {
    expect(truncate('', 5)).toBe('')
  })

  test('returns empty string for zero maxLength', () => {
    expect(truncate('hello', 0)).toBe('')
  })

  test('returns empty string for negative maxLength', () => {
    expect(truncate('hello', -5)).toBe('')
  })
})

describe('pluralize', () => {
  test('returns singular form for count of 1', () => {
    expect(pluralize(1, 'member')).toBe('1 member')
  })

  test('returns plural form with "s" for count > 1', () => {
    expect(pluralize(5, 'member')).toBe('5 members')
  })

  test('returns plural form for count of 0', () => {
    expect(pluralize(0, 'member')).toBe('0 members')
  })

  test('uses custom plural when provided', () => {
    expect(pluralize(2, 'match', 'matches')).toBe('2 matches')
  })

  test('uses singular for exactly 1 even with custom plural', () => {
    expect(pluralize(1, 'match', 'matches')).toBe('1 match')
  })
})
