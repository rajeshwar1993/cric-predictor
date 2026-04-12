/**
 * Authentication helper for E2E tests.
 *
 * Signs in a test user via Supabase password auth, then injects the
 * session cookies into the Playwright browser context so the app
 * recognises the user as logged in.
 */
import { createClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'
import { readAuthState } from './auth-state'
import { getProjectRef } from './supabase-admin'

/** Max cookie chunk size used by @supabase/ssr */
const MAX_CHUNK_SIZE = 3180

interface AuthenticateOptions {
  /** Skip setting the bragg_onboarded cookie (true for Suite 01 tests) */
  skipOnboardingCookie?: boolean
  /** Skip setting the bragg_terms_version cookie (true for Suite 09 terms test) */
  skipTermsCookie?: boolean
  /** Page to navigate to after auth (defaults to '/dashboard') */
  navigateTo?: string
}

/**
 * Authenticates a test user in the browser by:
 * 1. Signing in via Supabase `signInWithPassword` (server-side)
 * 2. Injecting the session tokens as cookies into the browser context
 * 3. Setting app-specific cookies (onboarding, terms) unless skipped
 * 4. Navigating to the target page
 */
export async function authenticate(
  page: Page,
  userIndex: number,
  options: AuthenticateOptions = {}
): Promise<void> {
  const state = readAuthState()
  const user = state.users[userIndex]
  if (!user) throw new Error(`Test user ${userIndex} not found in auth state`)

  // Sign in via Supabase JS to get a real session
  const supabase = createClient(
    process.env.E2E_SUPABASE_URL!,
    process.env.E2E_SUPABASE_ANON_KEY!
  )
  const { data, error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  })
  if (error || !data.session) {
    throw new Error(`Failed to sign in user ${userIndex} (${user.email}): ${error?.message}`)
  }

  const session = data.session
  const projectRef = getProjectRef()
  const baseUrl = new URL(process.env.E2E_BASE_URL!)

  // Build the session JSON that Supabase SSR stores in cookies.
  // The SSR library stores the full session object.
  const sessionJson = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    token_type: session.token_type,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    user: session.user,
  })

  // Supabase SSR uses base64url encoding with "base64-" prefix
  const encoded = `base64-${stringToBase64URL(sessionJson)}`
  const urlEncoded = encodeURIComponent(encoded)

  // Cookie base name: sb-<project-ref>-auth-token
  const cookieBaseName = `sb-${projectRef}-auth-token`

  const cookieBase = {
    domain: baseUrl.hostname,
    path: '/',
    httpOnly: false, // Supabase SSR default
    secure: baseUrl.protocol === 'https:',
    sameSite: 'Lax' as const,
  }

  // Chunk the cookie if needed (max 3180 chars per chunk)
  if (urlEncoded.length <= MAX_CHUNK_SIZE) {
    // Single cookie
    await page.context().addCookies([
      { ...cookieBase, name: cookieBaseName, value: encoded },
    ])
  } else {
    // Chunked cookies
    const chunks = chunkString(urlEncoded, MAX_CHUNK_SIZE)
    const cookies = chunks.map((chunk, i) => ({
      ...cookieBase,
      name: `${cookieBaseName}.${i}`,
      value: decodeURIComponent(chunk),
    }))
    await page.context().addCookies(cookies)
  }

  // Set app-specific cookies (onboarding gate, terms gate)
  const appCookies: Array<{
    name: string
    value: string
    domain: string
    path: string
    httpOnly: boolean
    secure: boolean
    sameSite: 'Lax'
  }> = []

  if (!options.skipOnboardingCookie) {
    appCookies.push({
      ...cookieBase,
      name: 'bragg_onboarded',
      value: 'true',
      httpOnly: true,
    })
  }

  if (!options.skipTermsCookie) {
    appCookies.push({
      ...cookieBase,
      name: 'bragg_terms_version',
      value: '2.0',
      httpOnly: true,
    })
  }

  if (appCookies.length > 0) {
    await page.context().addCookies(appCookies)
  }

  // Navigate to target page
  const target = options.navigateTo ?? '/dashboard'
  await page.goto(target, { waitUntil: 'domcontentloaded' })
}

// ─── Base64URL helpers ──────────────────────────────────────────────────

/**
 * Encodes a string to base64url (RFC 4648 without padding).
 * Mirrors the implementation in @supabase/ssr.
 */
function stringToBase64URL(str: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(str)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  // btoa → replace +/ with -_ → strip padding
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Splits a string into chunks of a given max size, respecting
 * percent-encoded sequences (won't split %XX mid-sequence).
 */
function chunkString(str: string, maxSize: number): string[] {
  const chunks: string[] = []
  let i = 0
  while (i < str.length) {
    let end = Math.min(i + maxSize, str.length)
    // Don't split in the middle of a percent-encoded sequence
    if (end < str.length) {
      // Check if we're splitting inside %XX
      for (let j = 1; j <= 2; j++) {
        if (str[end - j] === '%') {
          end = end - j
          break
        }
      }
    }
    chunks.push(str.slice(i, end))
    i = end
  }
  return chunks
}
