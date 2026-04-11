import { render } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockIdentifyUser = vi.fn()

vi.mock('@/lib/analytics/client', () => ({
  identifyUser: (...args: unknown[]) => mockIdentifyUser(...args),
}))

// Import after mocks are set up so the SUT binds the mocked client.
const { IdentifyUser } = await import('./identify-user')

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('IdentifyUser', () => {
  beforeEach(() => {
    mockIdentifyUser.mockClear()
  })

  test('calls identifyUser exactly once on first mount with the supplied id', () => {
    render(<IdentifyUser userId="user-123" />)

    expect(mockIdentifyUser).toHaveBeenCalledTimes(1)
    expect(mockIdentifyUser).toHaveBeenCalledWith('user-123')
  })

  test('renders nothing visible', () => {
    const { container } = render(<IdentifyUser userId="user-456" />)
    expect(container.firstChild).toBeNull()
  })

  test('re-fires identify when the userId prop changes', () => {
    const { rerender } = render(<IdentifyUser userId="user-123" />)
    expect(mockIdentifyUser).toHaveBeenCalledTimes(1)
    expect(mockIdentifyUser).toHaveBeenLastCalledWith('user-123')

    rerender(<IdentifyUser userId="user-456" />)

    expect(mockIdentifyUser).toHaveBeenCalledTimes(2)
    expect(mockIdentifyUser).toHaveBeenLastCalledWith('user-456')
  })

  test('does not re-fire when the same userId is rendered again', () => {
    const { rerender } = render(<IdentifyUser userId="user-789" />)
    expect(mockIdentifyUser).toHaveBeenCalledTimes(1)

    rerender(<IdentifyUser userId="user-789" />)

    expect(mockIdentifyUser).toHaveBeenCalledTimes(1)
  })
})
