import { createServerClient as createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { env } from '@/lib/env'

export async function createServerClient() {
  const cookieStore = await cookies()

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // `cookies().set()` throws when called from a Server Component.
          // This is safe to ignore: `proxy.ts` refreshes the Supabase
          // session on every request and writes the new cookies before
          // Server Components render, so this path only runs when
          // Supabase's client auto-refreshes mid-render — the refreshed
          // tokens are already in flight via proxy and will reach the
          // browser on the next request.
        }
      },
    },
  })
}
