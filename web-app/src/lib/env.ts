/**
 * Environment variable validation.
 *
 * Uses lazy getters so variables are validated on first access,
 * not at module import time. This prevents build failures in CI
 * where env vars may not be set during static analysis / compilation.
 */

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const env = {
  get NEXT_PUBLIC_SUPABASE_URL(): string {
    return requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY(): string {
    return requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  },
  get SUPABASE_SERVICE_ROLE_KEY(): string {
    return requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  },
  get NEXT_PUBLIC_POSTHOG_KEY(): string {
    return requireEnv('NEXT_PUBLIC_POSTHOG_KEY')
  },
  get NEXT_PUBLIC_POSTHOG_HOST(): string {
    return process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
  },
  get NEXT_PUBLIC_APP_URL(): string {
    return requireEnv('NEXT_PUBLIC_APP_URL')
  },
} as const
