import { describe, expect, test } from 'vitest'

import { cn } from './utils'

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
