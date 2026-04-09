import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { getMajorVersion, middleware, sanitizeRedirect } from './middleware'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/middleware', () => ({
  createMiddlewareClient: (_request: NextRequest) => ({
    supabase: { auth: { getUser: mockGetUser } },
    response: NextResponse.next(),
  }),
}))

describe('sanitizeRedirect', () => {
  test('allows simple relative paths', () => {
    expect(sanitizeRedirect('/dashboard')).toBe('/dashboard')
  })

  test('allows relative paths with query params', () => {
    expect(sanitizeRedirect('/gang/123?tab=members')).toBe('/gang/123?tab=members')
  })

  test('allows root path', () => {
    expect(sanitizeRedirect('/')).toBe('/')
  })

  test('rejects absolute URLs', () => {
    expect(sanitizeRedirect('https://evil.com/dashboard')).toBe('/dashboard')
  })

  test('rejects protocol-relative URLs', () => {
    expect(sanitizeRedirect('//evil.com/dashboard')).toBe('/dashboard')
  })

  test('rejects paths not starting with /', () => {
    expect(sanitizeRedirect('evil.com')).toBe('/dashboard')
  })

  test('rejects empty string', () => {
    expect(sanitizeRedirect('')).toBe('/dashboard')
  })

  test('rejects paths with backslash protocol bypass', () => {
    expect(sanitizeRedirect('/\\evil.com')).toBe('/dashboard')
  })
})

describe('getMajorVersion', () => {
  test('extracts major version from semver-like string', () => {
    expect(getMajorVersion('2.0')).toBe(2)
  })

  test('extracts major version from full semver', () => {
    expect(getMajorVersion('3.1.4')).toBe(3)
  })

  test('handles single number version', () => {
    expect(getMajorVersion('1')).toBe(1)
  })

  test('returns NaN for non-numeric input', () => {
    expect(getMajorVersion('abc')).toBeNaN()
  })

  test('returns NaN for empty string', () => {
    expect(getMajorVersion('')).toBeNaN()
  })

  test('handles version with leading zeros', () => {
    expect(getMajorVersion('02.1')).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// middleware() integration tests
// ---------------------------------------------------------------------------

/** Build a NextRequest for testing with optional cookies. */
function buildRequest(pathname: string, cookies: Record<string, string> = {}): NextRequest {
  const url = new URL(pathname, 'http://localhost:3000')
  const headers = new Headers()
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
  if (cookieHeader) headers.set('cookie', cookieHeader)

  return new NextRequest(url, { headers })
}

describe('middleware – gate interaction (redirect loop prevention)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const authenticatedUser = { data: { user: { id: 'user-1' } } }

  test('R-001 regression: authenticated new user on /onboarding does NOT redirect to /accept-terms', async () => {
    // User is authenticated but has NO cookies (neither onboarded nor terms)
    mockGetUser.mockResolvedValue(authenticatedUser)

    const request = buildRequest('/onboarding')
    const response = await middleware(request)

    // Should pass through (200), NOT redirect
    expect(response.status).toBe(200)
  })

  test('R-001 regression: authenticated new user on /accept-terms does NOT redirect to /onboarding', async () => {
    // User is authenticated but has NO cookies (neither onboarded nor terms)
    mockGetUser.mockResolvedValue(authenticatedUser)

    const request = buildRequest('/accept-terms')
    const response = await middleware(request)

    // Should pass through (200), NOT redirect
    expect(response.status).toBe(200)
  })

  test('authenticated user without onboarded cookie on /dashboard redirects to /onboarding', async () => {
    mockGetUser.mockResolvedValue(authenticatedUser)

    const request = buildRequest('/dashboard')
    const response = await middleware(request)

    expect(response.status).toBeGreaterThanOrEqual(300)
    expect(response.status).toBeLessThan(400)
    const location = response.headers.get('location') ?? ''
    expect(new URL(location).pathname).toBe('/onboarding')
  })

  test('authenticated user with onboarded cookie but no terms cookie on /dashboard redirects to /accept-terms', async () => {
    mockGetUser.mockResolvedValue(authenticatedUser)

    const request = buildRequest('/dashboard', { bragg_onboarded: '1' })
    const response = await middleware(request)

    expect(response.status).toBeGreaterThanOrEqual(300)
    expect(response.status).toBeLessThan(400)
    const location = response.headers.get('location') ?? ''
    expect(new URL(location).pathname).toBe('/accept-terms')
  })

  test('unauthenticated user redirects to /login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const request = buildRequest('/dashboard')
    const response = await middleware(request)

    expect(response.status).toBeGreaterThanOrEqual(300)
    expect(response.status).toBeLessThan(400)
    const location = response.headers.get('location') ?? ''
    expect(new URL(location).pathname).toBe('/login')
  })

  test('fully onboarded and terms-accepted user passes through on /dashboard', async () => {
    mockGetUser.mockResolvedValue(authenticatedUser)

    const request = buildRequest('/dashboard', {
      bragg_onboarded: '1',
      bragg_terms_version: '2.0',
    })
    const response = await middleware(request)

    expect(response.status).toBe(200)
  })

  test('public route / passes through without auth redirect', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const request = buildRequest('/')
    const response = await middleware(request)

    expect(response.status).toBe(200)
  })
})
