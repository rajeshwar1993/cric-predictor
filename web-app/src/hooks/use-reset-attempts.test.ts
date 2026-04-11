import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { useResetAttempts } from './use-reset-attempts'

describe('useResetAttempts', () => {
  it('starts with zero attempts and not exhausted', () => {
    const reset = vi.fn()
    const { result } = renderHook(() => useResetAttempts(reset))

    expect(result.current.attempts).toBe(0)
    expect(result.current.hasExhausted).toBe(false)
    expect(reset).not.toHaveBeenCalled()
  })

  it('increments attempts and calls reset on each handleReset', () => {
    const reset = vi.fn()
    const { result } = renderHook(() => useResetAttempts(reset))

    act(() => {
      result.current.handleReset()
    })

    expect(result.current.attempts).toBe(1)
    expect(result.current.hasExhausted).toBe(false)
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('flags hasExhausted once attempts reach the default max of 2', () => {
    const reset = vi.fn()
    const { result } = renderHook(() => useResetAttempts(reset))

    act(() => {
      result.current.handleReset()
    })
    act(() => {
      result.current.handleReset()
    })

    expect(result.current.attempts).toBe(2)
    expect(result.current.hasExhausted).toBe(true)
    expect(reset).toHaveBeenCalledTimes(2)
  })

  it('respects a custom maxAttempts limit', () => {
    const reset = vi.fn()
    const { result } = renderHook(() => useResetAttempts(reset, 3))

    act(() => {
      result.current.handleReset()
    })
    act(() => {
      result.current.handleReset()
    })

    expect(result.current.hasExhausted).toBe(false)

    act(() => {
      result.current.handleReset()
    })

    expect(result.current.attempts).toBe(3)
    expect(result.current.hasExhausted).toBe(true)
  })
})
