# ADM-001: Admin Foundation

**Phase:** 16 — Admin Dashboard
**Dependencies:** FND-002, FND-005
**Estimated scope:** DB migration + admin layout shell + sidebar nav + middleware auth check

---

## Description

Set up the admin dashboard foundation: a Supabase migration to add `is_system_admin` boolean to `v2_profiles`, middleware to protect `/admin/*` routes, the admin layout shell with a collapsible sidebar navigation, and the admin-specific service role DAL client. The admin dashboard is read-only, dark mode only, and uses shadcn/ui components with the service role Supabase client to bypass RLS.

---

## Acceptance Criteria

### Database Migration
- [ ] New migration adds `is_system_admin BOOLEAN DEFAULT false NOT NULL` to `v2_profiles`
- [ ] RLS policy: only service role can read `is_system_admin` (not exposed to regular users via existing RLS policies)
- [ ] Index on `is_system_admin` for quick lookups
- [ ] Seed: set `is_system_admin = true` for a configurable admin email (env var `ADMIN_EMAILS`)

### Middleware / Proxy
- [ ] `/admin/*` routes require: (1) authenticated session, (2) `is_system_admin = true` on profile
- [ ] Non-admin users hitting `/admin/*` get redirected to `/dashboard`
- [ ] Unauthenticated users hitting `/admin/*` get redirected to `/login`
- [ ] Admin check uses server-side query (not JWT claim) for security

### Admin Layout Shell
- [ ] Route group: `(admin)` under `src/app/`
- [ ] Layout: dark background (`#0A0A0A`), full-width (no NavBar/Footer from main app)
- [ ] Collapsible sidebar navigation with sections matching dashboard plan:
  - Overview (home icon)
  - Fixtures (calendar icon)
  - Scenarios (target icon)
  - Users (users icon)
  - Gangs (shield icon)
  - Predictions (bar-chart icon)
  - Standings (trophy icon)
  - Reference Data (database icon)
  - Notifications (bell icon)
  - Operations (activity icon)
  - Data Integrity (check-circle icon)
  - Rate Limits (clock icon)
  - Moderation (flag icon)
- [ ] Sidebar shows "Bragg Admin" header with admin user's display name
- [ ] Sidebar collapses to icons on mobile / when toggled
- [ ] Active route highlighted in sidebar with lime accent
- [ ] Sign out button at bottom of sidebar

### Admin DAL Client
- [ ] `src/lib/supabase/admin.ts` — creates a service role Supabase client for admin queries
- [ ] Uses `SUPABASE_SERVICE_ROLE_KEY` env var
- [ ] ESLint restricted import rule: only importable from `src/lib/dal/admin/` files
- [ ] Helper: `isSystemAdmin(userId: string): Promise<boolean>` — checks `v2_profiles.is_system_admin`

---

## Files to Create

```
supabase/supabase/migrations/20260412000001_admin_role.sql
web-app/src/
├── app/
│   └── (admin)/
│       ├── layout.tsx                    # Admin layout with sidebar
│       └── admin/
│           └── page.tsx                  # Redirects to /admin/overview
├── components/
│   └── admin/
│       ├── admin-sidebar.tsx             # Collapsible sidebar nav
│       ├── admin-sidebar.stories.tsx
│       ├── admin-header.tsx              # Top bar with breadcrumb + user info
│       └── admin-header.stories.tsx
├── lib/
│   ├── supabase/
│   │   └── admin.ts                     # Service role client
│   └── dal/
│       └── admin/
│           └── auth.ts                  # isSystemAdmin helper
```

---

## Technical Notes

### Migration SQL
```sql
-- Add is_system_admin flag to profiles
ALTER TABLE v2_profiles
  ADD COLUMN is_system_admin BOOLEAN NOT NULL DEFAULT false;

-- Index for quick admin lookups
CREATE INDEX idx_v2_profiles_is_system_admin
  ON v2_profiles (is_system_admin) WHERE is_system_admin = true;

-- RLS: ensure existing user-facing policies do NOT expose is_system_admin
-- The column is only readable via the service role client (which bypasses RLS).
-- No new RLS policy is needed — the absence of a policy granting select on this
-- column to authenticated users is sufficient.
```

### Seed Admin Users
```sql
-- Run after migration. Controlled by ADMIN_EMAILS env var (comma-separated).
-- In seed file or a one-off script:
UPDATE v2_profiles
SET is_system_admin = true
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
);
```

### Middleware / Proxy Extension
Extend the existing proxy in `src/proxy.ts` (or middleware) with an admin gate for `/admin/*` routes:

```typescript
// In the middleware/proxy chain, before serving /admin/* routes:
import { isSystemAdmin } from '@/lib/dal/admin/auth'

async function adminGate(userId: string): Promise<'allowed' | 'forbidden'> {
  const isAdmin = await isSystemAdmin(userId)
  return isAdmin ? 'allowed' : 'forbidden'
}

// Usage in middleware:
if (pathname.startsWith('/admin')) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))
  const result = await adminGate(user.id)
  if (result === 'forbidden') return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

**Important:** The admin check queries the database server-side (not a JWT claim) so that revoking admin access takes effect immediately without waiting for token refresh.

### Service Role Client
```typescript
// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
```

### Admin Auth DAL
```typescript
// src/lib/dal/admin/auth.ts
import { createAdminClient } from '@/lib/supabase/admin'

export async function isSystemAdmin(userId: string): Promise<boolean> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('v2_profiles')
    .select('is_system_admin')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return false
  return data.is_system_admin === true
}
```

### Admin Layout
```tsx
// src/app/(admin)/layout.tsx
import { createServerClient } from '@/lib/supabase/server'
import { isSystemAdmin } from '@/lib/dal/admin/auth'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const isAdmin = await isSystemAdmin(user.id)
  if (!isAdmin) redirect('/dashboard')

  return (
    <div className="flex h-dvh bg-[#0A0A0A]">
      <AdminSidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### Sidebar Navigation Items
```typescript
const navItems = [
  { label: 'Overview',        href: '/admin/overview',        icon: Home },
  { label: 'Fixtures',        href: '/admin/fixtures',        icon: Calendar },
  { label: 'Scenarios',       href: '/admin/scenarios',       icon: Target },
  { label: 'Users',           href: '/admin/users',           icon: Users },
  { label: 'Gangs',           href: '/admin/gangs',           icon: Shield },
  { label: 'Predictions',     href: '/admin/predictions',     icon: BarChart3 },
  { label: 'Standings',       href: '/admin/standings',       icon: Trophy },
  { label: 'Reference Data',  href: '/admin/reference',       icon: Database },
  { label: 'Notifications',   href: '/admin/notifications',   icon: Bell },
  { label: 'Operations',      href: '/admin/operations',      icon: Activity },
  { label: 'Data Integrity',  href: '/admin/data-integrity',  icon: CheckCircle },
  { label: 'Rate Limits',     href: '/admin/rate-limits',     icon: Clock },
  { label: 'Moderation',      href: '/admin/moderation',      icon: Flag },
] as const
```

### ESLint Restricted Import
Add to `.eslintrc` / `eslint.config.js`:
```javascript
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@/lib/supabase/admin'],
        message: 'Admin client can only be imported in src/lib/dal/admin/ files.',
        // This rule applies to all files NOT in src/lib/dal/admin/
      }],
    }],
  },
  overrides: [{
    files: ['src/lib/dal/admin/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  }],
}
```

### Key Design Decisions
- The admin layout does NOT use the main app's NavBar/Footer — it is a completely separate shell
- Sidebar uses Lucide icons, consistent with the rest of the app
- The `(admin)` route group means URLs are `/admin/overview`, `/admin/fixtures`, etc.
- The service role client bypasses RLS — use with care, only in `src/lib/dal/admin/` files
- The redirect page at `/admin` (root) sends the user to `/admin/overview`

---

## Edge Cases

- User whose `is_system_admin` is revoked mid-session should be blocked on next `/admin/*` request (server-side check, not cached)
- If `SUPABASE_SERVICE_ROLE_KEY` is missing, throw immediately — never fall back to anon key
- Sidebar should gracefully handle routes that don't exist yet (not yet implemented admin pages)

---

## Storybook Requirements

### AdminSidebar Stories
- `Expanded` — full sidebar with labels and icons
- `Collapsed` — icon-only sidebar
- `MobileCollapsed` — mobile width, collapsed
- `ActiveRoute` — overview route highlighted with lime accent

### AdminHeader Stories
- `Default` — header with "Bragg Admin" and user info
- `WithBreadcrumb` — header with breadcrumb trail (e.g., "Admin > Reference Data > Teams")

---

## Testing Requirements

- [ ] Unit test: `isSystemAdmin()` returns `true` for admin user, `false` for non-admin user
- [ ] Unit test: `isSystemAdmin()` returns `false` when user does not exist
- [ ] Unit test: `createAdminClient()` throws when `SUPABASE_SERVICE_ROLE_KEY` is not set
- [ ] Integration test: middleware redirects unauthenticated users on `/admin/*` to `/login`
- [ ] Integration test: middleware redirects non-admin authenticated users on `/admin/*` to `/dashboard`
- [ ] Integration test: middleware allows admin users to access `/admin/*` routes
- [ ] Migration test: `is_system_admin` column defaults to `false`
- [ ] Migration test: index exists on `is_system_admin`
