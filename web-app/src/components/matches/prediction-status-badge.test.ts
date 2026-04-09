import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { getPredictionStatus } from './prediction-status-badge'
import type { MatchStatus } from '@/types'

// ---------------------------------------------------------------------------
// Constants for readability
// ---------------------------------------------------------------------------

/** A start time comfortably in the future (24 hours from "now"). */
const FUTURE_START = '2026-04-10T19:30:00Z'

/** Standard prediction deadline: 45 minutes before start. */
const DEADLINE_MINS = 45

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getPredictionStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // -------------------------------------------------------------------------
  // Guard: non-upcoming/live statuses → 'locked'
  // -------------------------------------------------------------------------

  test('returns "locked" for completed fixture', () => {
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'))
    const result = getPredictionStatus(
      'completed' as MatchStatus,
      FUTURE_START,
      DEADLINE_MINS,
      false,
    )
    expect(result).toBe('locked')
  })

  test('returns "locked" for resolved fixture', () => {
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'))
    const result = getPredictionStatus(
      'resolved' as MatchStatus,
      FUTURE_START,
      DEADLINE_MINS,
      false,
    )
    expect(result).toBe('locked')
  })

  test('returns "locked" for abandoned fixture', () => {
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'))
    const result = getPredictionStatus(
      'abandoned' as MatchStatus,
      FUTURE_START,
      DEADLINE_MINS,
      false,
    )
    expect(result).toBe('locked')
  })

  test('returns "locked" for no_result fixture', () => {
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'))
    const result = getPredictionStatus(
      'no_result' as MatchStatus,
      FUTURE_START,
      DEADLINE_MINS,
      false,
    )
    expect(result).toBe('locked')
  })

  // -------------------------------------------------------------------------
  // Live match → 'live'
  // -------------------------------------------------------------------------

  test('returns "live" when fixture status is live', () => {
    vi.setSystemTime(new Date('2026-04-10T20:00:00Z'))
    const result = getPredictionStatus('live', FUTURE_START, DEADLINE_MINS, false)
    expect(result).toBe('live')
  })

  test('returns "live" for live match even when user has predicted', () => {
    vi.setSystemTime(new Date('2026-04-10T20:00:00Z'))
    const result = getPredictionStatus('live', FUTURE_START, DEADLINE_MINS, true)
    expect(result).toBe('live')
  })

  // -------------------------------------------------------------------------
  // Past deadline → 'locked'
  // -------------------------------------------------------------------------

  test('returns "locked" when past the prediction deadline', () => {
    // Deadline is 45 min before start → 18:45 UTC. Set now to 18:50.
    vi.setSystemTime(new Date('2026-04-10T18:50:00Z'))
    const result = getPredictionStatus('upcoming', FUTURE_START, DEADLINE_MINS, false)
    expect(result).toBe('locked')
  })

  test('returns "locked" when exactly at the deadline', () => {
    // Deadline = 19:30 - 45min = 18:45 UTC
    vi.setSystemTime(new Date('2026-04-10T18:45:00Z'))
    const result = getPredictionStatus('upcoming', FUTURE_START, DEADLINE_MINS, false)
    expect(result).toBe('locked')
  })

  // -------------------------------------------------------------------------
  // Predicted user → 'predicted'
  // -------------------------------------------------------------------------

  test('returns "predicted" when user has predicted and window is open', () => {
    // Window open: within 12h of start but before deadline
    vi.setSystemTime(new Date('2026-04-10T10:00:00Z'))
    const result = getPredictionStatus('upcoming', FUTURE_START, DEADLINE_MINS, true)
    expect(result).toBe('predicted')
  })

  // -------------------------------------------------------------------------
  // Window not open → 'not_open'
  // -------------------------------------------------------------------------

  test('returns "not_open" when more than 12 hours before start', () => {
    // Start at 19:30 UTC → window opens at 07:30 UTC. Set now to 06:00 UTC.
    vi.setSystemTime(new Date('2026-04-10T06:00:00Z'))
    const result = getPredictionStatus('upcoming', FUTURE_START, DEADLINE_MINS, false)
    expect(result).toBe('not_open')
  })

  test('returns "not_open" when exactly 12 hours before start (boundary — window not yet open)', () => {
    // Window opens at start - 12h = 07:30 UTC. At exactly 07:30, now < windowOpens is false,
    // so the window IS open. One ms before: not open.
    vi.setSystemTime(new Date('2026-04-10T07:29:59.999Z'))
    const result = getPredictionStatus('upcoming', FUTURE_START, DEADLINE_MINS, false)
    expect(result).toBe('not_open')
  })

  // -------------------------------------------------------------------------
  // Window open, not predicted → 'predict'
  // -------------------------------------------------------------------------

  test('returns "predict" when window is open and user has not predicted', () => {
    // Within 12h of start and before deadline
    vi.setSystemTime(new Date('2026-04-10T10:00:00Z'))
    const result = getPredictionStatus('upcoming', FUTURE_START, DEADLINE_MINS, false)
    expect(result).toBe('predict')
  })

  test('returns "predict" at the exact moment window opens', () => {
    // Window opens at 07:30 UTC
    vi.setSystemTime(new Date('2026-04-10T07:30:00Z'))
    const result = getPredictionStatus('upcoming', FUTURE_START, DEADLINE_MINS, false)
    expect(result).toBe('predict')
  })

  // -------------------------------------------------------------------------
  // Boundary: 1ms before deadline → still open
  // -------------------------------------------------------------------------

  test('returns "predict" 1ms before the deadline', () => {
    // Deadline = 18:45:00.000 UTC, so 18:44:59.999 is still before
    vi.setSystemTime(new Date('2026-04-10T18:44:59.999Z'))
    const result = getPredictionStatus('upcoming', FUTURE_START, DEADLINE_MINS, false)
    expect(result).toBe('predict')
  })
})
