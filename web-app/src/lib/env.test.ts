import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// We need to dynamically import env so we can control process.env before access
describe('env', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    vi.resetModules()
    // Clone process.env so mutations don't leak between tests
    process.env = { ...ORIGINAL_ENV }
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  describe('required variables', () => {
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_POSTHOG_KEY',
      'NEXT_PUBLIC_APP_URL',
    ] as const

    it.each(requiredVars)('throws when %s is missing', async (varName) => {
      // Set all required vars except the one under test
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test'
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

      // Remove the one we're testing
      delete process.env[varName]

      const { env } = await import('./env')

      expect(() => env[varName]).toThrow(`Missing required environment variable: ${varName}`)
    })

    it('returns values when all required vars are set', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test'
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

      const { env } = await import('./env')

      expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co')
      expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('test-anon-key')
      expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe('test-service-role-key')
      expect(env.NEXT_PUBLIC_POSTHOG_KEY).toBe('phc_test')
      expect(env.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000')
    })
  })

  describe('NEXT_PUBLIC_POSTHOG_HOST', () => {
    it('returns the default value when not set', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test'
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
      delete process.env.NEXT_PUBLIC_POSTHOG_HOST

      const { env } = await import('./env')

      expect(env.NEXT_PUBLIC_POSTHOG_HOST).toBe('https://us.i.posthog.com')
    })

    it('returns the custom value when set', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test'
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://eu.i.posthog.com'

      const { env } = await import('./env')

      expect(env.NEXT_PUBLIC_POSTHOG_HOST).toBe('https://eu.i.posthog.com')
    })
  })
})
