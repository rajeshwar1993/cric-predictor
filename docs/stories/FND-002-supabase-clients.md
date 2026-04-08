# FND-002: Supabase Client Setup + DB Types

**Phase:** 1 — Foundation
**Dependencies:** FND-001
**Estimated scope:** 4 Supabase client factories, auto-generated DB types, environment validation

---

## Description

Set up the four Supabase client factories (server, client, middleware, service-role), auto-generate TypeScript types from the Supabase schema, and create environment variable validation. This enables all data fetching and mutations across the app.

---

## Acceptance Criteria

- [ ] `createServerClient()` — async function for Server Components and Server Actions; reads cookies for auth session, enforces RLS
- [ ] `createBrowserClient()` — singleton for Client Components; uses browser cookies
- [ ] `createMiddlewareClient()` — for middleware; refreshes session cookies
- [ ] `createServiceRoleClient()` — for elevated server-only operations; bypasses RLS
- [ ] Service role client file uses `server-only` package to prevent client import
- [ ] Auto-generated `src/types/database.ts` from Supabase schema (via `supabase gen types typescript`)
- [ ] `src/types/index.ts` — app-specific type aliases derived from database types
- [ ] `src/lib/env.ts` — validates all required environment variables at startup
- [ ] `.env.local.example` file with all required env vars documented
- [ ] ESLint rule or comment restriction on importing service-role client outside allowed files

---

## Files to Create

```
web-app/src/
├── lib/
│   ├── supabase/
│   │   ├── server.ts               # createServerClient()
│   │   ├── client.ts               # createBrowserClient()
│   │   ├── middleware.ts            # createMiddlewareClient()
│   │   └── service-role.ts         # createServiceRoleClient() — server-only
│   └── env.ts                      # Environment variable validation
├── types/
│   ├── database.ts                 # Auto-generated (supabase gen types)
│   └── index.ts                    # App-specific type helpers
web-app/
├── .env.local.example              # Template for env vars
```

---

## Technical Notes

### Server Client (`server.ts`)
```typescript
import { createServerClient as createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createServerClient() {
  const cookieStore = await cookies()
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}
```

### Browser Client (`client.ts`)
```typescript
import { createBrowserClient as createClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createBrowserClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Service Role Client (`service-role.ts`)
```typescript
import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// WARNING: This client bypasses RLS. Only use for system operations.
export function createServiceRoleClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

### Environment Validation (`env.ts`)
Validate at import time using a simple checker (no external libs needed):

```typescript
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  NEXT_PUBLIC_POSTHOG_KEY: requireEnv('NEXT_PUBLIC_POSTHOG_KEY'),
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  NEXT_PUBLIC_APP_URL: requireEnv('NEXT_PUBLIC_APP_URL'),
} as const
```

### Required Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Type Generation
Run from project root (requires Supabase CLI and local Supabase running):
```bash
cd supabase/supabase && npx supabase gen types typescript --local > ../../web-app/src/types/database.ts
```

Add npm script: `"db:types": "cd ../supabase/supabase && npx supabase gen types typescript --local > ../../web-app/src/types/database.ts"`

### App Type Helpers (`types/index.ts`)
Create convenient aliases:
```typescript
import type { Database } from './database'

// Table row types
export type Profile = Database['public']['Tables']['v2_profiles']['Row']
export type Gang = Database['public']['Tables']['v2_gangs']['Row']
export type GangMember = Database['public']['Tables']['v2_gang_members']['Row']
export type Fixture = Database['public']['Tables']['v2_league_season_fixtures']['Row']
export type FixtureScenario = Database['public']['Tables']['v2_fixture_scenarios']['Row']
export type Prediction = Database['public']['Tables']['v2_predictions']['Row']
export type Notification = Database['public']['Tables']['v2_notifications']['Row']
export type LeagueTeam = Database['public']['Tables']['v2_league_teams']['Row']
export type Player = Database['public']['Tables']['v2_players']['Row']
export type FixtureLiveScore = Database['public']['Tables']['v2_fixture_live_scores']['Row']
export type GangFixtureStanding = Database['public']['Tables']['v2_gang_fixture_standings']['Row']
export type GangSeasonStanding = Database['public']['Tables']['v2_gang_season_standings']['Row']

// Enum types
export type MatchStatus = Database['public']['Enums']['v2_match_status']
export type MemberRole = Database['public']['Enums']['v2_member_role']
export type MemberStatus = Database['public']['Enums']['v2_member_status']
export type ScenarioInputType = Database['public']['Enums']['v2_scenario_input_type']
export type ResolutionPhase = Database['public']['Enums']['v2_resolution_phase']
export type NotificationType = Database['public']['Enums']['v2_notification_type']

// Server action return type
export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }
```

### Dependencies to Install
```bash
npm install @supabase/supabase-js @supabase/ssr server-only
```

---

## Testing Requirements

- [ ] Unit test for `env.ts` — throws when required env vars are missing
- [ ] Verify each client factory returns a typed Supabase client (compile-time check)
- [ ] Service role import from a client file fails at build time (`server-only` guard)
