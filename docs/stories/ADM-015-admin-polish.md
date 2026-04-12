# ADM-015: Admin Dashboard Polish & Navigation

**Phase:** 16 — Admin Dashboard
**Dependencies:** ADM-001 through ADM-014
**Estimated scope:** Breadcrumb navigation, global search, loading states, empty states, responsive polish, keyboard shortcuts

---

## Description

Final polish pass on the admin dashboard: add breadcrumb navigation throughout all admin pages, a global search command palette for quickly finding entities, consistent loading/empty state patterns, responsive design verification across breakpoints, and keyboard shortcuts for power users. This story ties together the entire admin dashboard experience and must be implemented after all other ADM stories are complete.

---

## Acceptance Criteria

### Breadcrumb Navigation
- [ ] All admin pages show breadcrumbs below the admin header: Admin > Section > Detail
- [ ] Breadcrumbs are clickable links back to parent pages
- [ ] Dynamic breadcrumbs for detail pages (e.g., "Admin > Gangs > Thunderbolts", "Admin > Fixtures > Match #23: CSK vs MI")
- [ ] Top-level pages show single-level breadcrumb (e.g., "Admin > Overview")
- [ ] Current page (last breadcrumb segment) is not a link — displayed as muted text
- [ ] Breadcrumb uses `>` separator with `text-neutral-500` color
- [ ] Derive breadcrumbs from URL path segments with a label mapping for known routes

### Global Admin Search
- [ ] Command palette triggered by `Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux)
- [ ] Search scopes: users (by email or display_name), gangs (by name or invite_code), fixtures (by match number or team names)
- [ ] Results grouped by entity type with section headers (Users, Gangs, Fixtures)
- [ ] Each result shows: icon (matching sidebar nav icon for that entity type), primary text, secondary text (email for users, invite code for gangs, date for fixtures)
- [ ] Click result or press Enter on highlighted result navigates to detail page
- [ ] Up/Down arrow keys to navigate results
- [ ] Escape to close the command palette
- [ ] Uses existing `cmdk` library already in the project (via shadcn/ui Command component)
- [ ] Debounced search input (300ms) — queries server action on each keystroke after debounce
- [ ] Empty state: "No results found" when search returns nothing
- [ ] Maximum 5 results per entity type (15 total)
- [ ] Search palette accessible via a search icon button in the admin header

### Loading States
- [ ] All admin pages use Suspense boundaries with skeleton loaders
- [ ] Skeleton variants: metric cards (rectangle grid), tables (row placeholders), charts (block placeholder), detail panels (mixed layout)
- [ ] Loading states match the layout of the actual content (same heights, widths, spacing)
- [ ] Skeletons use shadcn/ui Skeleton component with `bg-neutral-800` base and `bg-neutral-700` shimmer
- [ ] Each admin page section wrapped in its own Suspense boundary (independent loading)

### Empty States
- [ ] Consistent empty state pattern across all admin sections with no data
- [ ] Each section has a meaningful, context-specific empty message (not generic "No data")
- [ ] Empty states use Lucide icons (size 48, `text-neutral-600`)
- [ ] Empty state layout: centered icon, title text (`text-neutral-400`), optional description text (`text-neutral-500`)
- [ ] Reuse the existing EmptyState component pattern from the main app, extended for admin styling

### Responsive Design
- [ ] Admin sidebar collapses to hamburger menu on mobile (`< 768px`)
- [ ] Mobile sidebar uses shadcn/ui Sheet (slide-out from left) with overlay backdrop
- [ ] Tables scroll horizontally on mobile with `overflow-x-auto` wrapper
- [ ] Metric card grids: 4 cols (`>= 1440px`) > 3 cols (`>= 1024px`) > 2 cols (`>= 768px`) > 1 col (`< 768px`)
- [ ] Detail pages stack vertically on mobile (side-by-side sections become single column)
- [ ] All pages tested at 375px, 768px, 1024px, 1440px breakpoints
- [ ] Admin header shows hamburger menu button on mobile (hidden on desktop)
- [ ] Search icon button always visible in header (replaces `Cmd+K` hint text on mobile)

### Keyboard Shortcuts
- [ ] `Cmd+K` / `Ctrl+K`: Open global search command palette
- [ ] `Escape`: Close command palette, close any open Sheet/modal
- [ ] Arrow keys: Navigate search results within command palette
- [ ] Shortcuts do not conflict with browser defaults
- [ ] Keyboard shortcut hint shown in admin header next to search icon: `Cmd+K` badge (hidden on mobile)

---

## Files to Create

```
web-app/src/
├── components/
│   └── admin/
│       ├── admin-breadcrumb.tsx
│       ├── admin-breadcrumb.stories.tsx
│       ├── admin-search.tsx
│       ├── admin-search.stories.tsx
│       ├── admin-skeleton.tsx
│       ├── admin-skeleton.stories.tsx
│       ├── admin-empty-state.tsx
│       └── admin-empty-state.stories.tsx
├── lib/
│   └── actions/
│       └── admin/
│           └── search.ts                    # Server action for search queries
```

---

## Technical Notes

### Breadcrumb Component
```tsx
// src/components/admin/admin-breadcrumb.tsx
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

// Label mapping for known route segments
const routeLabels: Record<string, string> = {
  overview:         'Overview',
  fixtures:         'Fixtures',
  scenarios:        'Scenarios',
  users:            'Users',
  gangs:            'Gangs',
  predictions:      'Predictions',
  standings:        'Standings',
  reference:        'Reference Data',
  notifications:    'Notifications',
  operations:       'Operations',
  'data-integrity': 'Data Integrity',
  'rate-limits':    'Rate Limits',
  moderation:       'Moderation',
}

interface AdminBreadcrumbProps {
  // Optional override for the last segment label (used for detail pages)
  detailLabel?: string
}

export function AdminBreadcrumb({ detailLabel }: AdminBreadcrumbProps) {
  const pathname = usePathname()
  // Split: /admin/gangs/abc-123 → ['admin', 'gangs', 'abc-123']
  const segments = pathname.split('/').filter(Boolean)

  // Build breadcrumb items from segments
  // First item is always "Admin" linking to /admin/overview
  // Middle items are clickable links
  // Last item is current page (not a link)
}
```

### Global Search — Server Action
```typescript
// src/lib/actions/admin/search.ts
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { isSystemAdmin } from '@/lib/dal/admin/auth'
import { createServerClient } from '@/lib/supabase/server'

interface SearchResult {
  type: 'user' | 'gang' | 'fixture'
  id: string
  primary: string       // display_name, gang name, or "Match #N: Team A vs Team B"
  secondary: string     // email, invite_code, or date
  href: string          // link to detail page
}

export async function searchAdminEntities(query: string): Promise<SearchResult[]> {
  // Auth check: verify caller is admin
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const isAdmin = await isSystemAdmin(user.id)
  if (!isAdmin) return []

  if (!query || query.trim().length < 2) return []

  const admin = createAdminClient()
  const trimmed = query.trim()

  const [users, gangs, fixtures] = await Promise.all([
    // Search users by email or display_name
    admin
      .from('v2_profiles')
      .select('id, display_name, email')
      .or(`email.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`)
      .limit(5),

    // Search gangs by name or invite_code
    admin
      .from('v2_gangs')
      .select('id, name, invite_code')
      .or(`name.ilike.%${trimmed}%,invite_code.ilike.%${trimmed}%`)
      .limit(5),

    // Search fixtures by match_number or team names
    admin
      .from('v2_fixtures')
      .select('id, match_number, v2_teams!home_team_id (short_name), v2_teams!away_team_id (short_name), start_time')
      .or(`match_number::text.ilike.%${trimmed}%`)
      .limit(5),
  ])

  const results: SearchResult[] = []

  users.data?.forEach((u) => {
    results.push({
      type: 'user',
      id: u.id,
      primary: u.display_name ?? 'Unnamed User',
      secondary: u.email,
      href: `/admin/users/${u.id}`,
    })
  })

  gangs.data?.forEach((g) => {
    results.push({
      type: 'gang',
      id: g.id,
      primary: g.name,
      secondary: g.invite_code,
      href: `/admin/gangs/${g.id}`,
    })
  })

  fixtures.data?.forEach((f) => {
    const homeTeam = f.v2_teams && 'short_name' in f.v2_teams ? f.v2_teams.short_name : '???'
    results.push({
      type: 'fixture',
      id: f.id,
      primary: `Match #${f.match_number}: ${homeTeam} vs ???`,
      secondary: new Date(f.start_time).toLocaleDateString(),
      href: `/admin/fixtures/${f.id}`,
    })
  })

  return results
}
```

### Global Search — Client Component
```tsx
// src/components/admin/admin-search.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { Users, Shield, Calendar } from 'lucide-react'
import { searchAdminEntities } from '@/lib/actions/admin/search'

// Debounce search by 300ms
// Group results by type: Users, Gangs, Fixtures
// Navigate on selection
// Cmd+K / Ctrl+K to open
```

### Skeleton Variants
```tsx
// src/components/admin/admin-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton'

export function MetricCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900">
      {/* Header */}
      <div className="flex gap-4 border-b border-neutral-800 p-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-neutral-800/50 p-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <Skeleton className="mb-4 h-4 w-32" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <Skeleton className="mb-3 h-4 w-24" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <Skeleton className="mb-3 h-4 w-24" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  )
}
```

### Admin Empty State
```tsx
// src/components/admin/admin-empty-state.tsx
import type { LucideIcon } from 'lucide-react'

interface AdminEmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
}

export function AdminEmptyState({ icon: Icon, title, description }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={48} className="mb-4 text-neutral-600" />
      <p className="text-lg font-medium text-neutral-400">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-neutral-500">{description}</p>
      )}
    </div>
  )
}
```

### Responsive Sidebar (Mobile Sheet)
Update `admin-sidebar.tsx` (from ADM-001) to support mobile:
```tsx
// Extend AdminSidebar with mobile support
// Desktop: fixed sidebar with collapse toggle
// Mobile (<768px): hidden by default, opens as shadcn/ui Sheet (slide from left)
// Admin header shows hamburger button on mobile that triggers Sheet open

// In admin layout:
// <Sheet>
//   <SheetTrigger asChild>
//     <Button variant="ghost" className="md:hidden">
//       <Menu size={20} />
//     </Button>
//   </SheetTrigger>
//   <SheetContent side="left" className="w-64 bg-[#0A0A0A] p-0">
//     <AdminSidebar user={user} mobile />
//   </SheetContent>
// </Sheet>
```

### Integration with Admin Header
The admin header (from ADM-001) should be updated to include:
1. Hamburger menu button (mobile only, `md:hidden`)
2. Breadcrumb component (always visible)
3. Search icon button + `Cmd+K` badge (badge hidden on mobile)

```tsx
// Updated AdminHeader structure:
// <header className="flex items-center gap-4 border-b border-neutral-800 px-6 py-3">
//   <HamburgerButton className="md:hidden" />
//   <AdminBreadcrumb detailLabel={detailLabel} />
//   <div className="ml-auto flex items-center gap-2">
//     <SearchButton />
//     <kbd className="hidden md:inline ...">Cmd+K</kbd>
//   </div>
// </header>
```

### Key Design Decisions
- Breadcrumbs derive from URL path segments — no need for a context provider. Detail page labels are passed as props from the page component.
- Global search uses a server action (not a route handler) for simplicity. The server action includes an admin auth check to prevent unauthorized access.
- Search input requires minimum 2 characters before querying to reduce noise.
- Skeletons are composed from shadcn/ui Skeleton primitives — no custom animation needed.
- Empty states extend the app-level pattern with admin-specific dark styling.
- Mobile sidebar uses Sheet instead of a custom drawer to stay consistent with shadcn/ui patterns.
- Keyboard shortcuts are registered via `useEffect` with `keydown` listeners. Only active when no input element is focused (except for `Cmd+K` which always works and `Escape` which closes).

---

## Edge Cases

- Breadcrumb for unknown route segment (not in `routeLabels`) — use titleCase of the segment as fallback
- Detail page with UUID in URL (e.g., `/admin/gangs/abc-123`) — the UUID is not human-readable; the page component must pass a `detailLabel` prop with the entity name
- Search query with special characters — sanitize before passing to `ilike` (escape `%` and `_`)
- Search returns no results — show "No results found for [query]" message
- Mobile sidebar open + keyboard shortcut `Cmd+K` — close sidebar Sheet, open search palette
- Skeleton dimensions must match actual content — if a new admin page is added, a corresponding skeleton variant should be created
- Very long breadcrumb on mobile — truncate middle segments with ellipsis, always show first (Admin) and last (current page)
- Admin with slow connection — Suspense boundaries ensure each section loads independently; one slow query does not block the entire page

---

## Storybook Requirements

### AdminBreadcrumb Stories
- `TopLevel` — single-level breadcrumb: "Admin > Overview"
- `Detail` — two-level breadcrumb: "Admin > Gangs > Thunderbolts"
- `DeepNested` — three-level breadcrumb: "Admin > Fixtures > Match #23: CSK vs MI"

### AdminSearch Stories
- `Empty` — command palette open with empty input, no results
- `WithResults` — search results grouped by Users, Gangs, Fixtures
- `NoResults` — search query entered but no matching results
- `ByType` — results showing only one entity type (e.g., only Users match)

### AdminSkeleton Stories
- `MetricCards` — 4-column grid of metric card skeletons
- `Table` — table skeleton with header and 5 row placeholders
- `Chart` — single chart block skeleton
- `Detail` — detail page layout skeleton with title and two-column content

### AdminEmptyState Stories
- `Default` — generic empty state with icon, title, and description
- `WithAction` — empty state with only icon and title (no description)

---

## Testing Requirements

- [ ] Unit test: AdminBreadcrumb renders correct segments from pathname
- [ ] Unit test: AdminBreadcrumb maps known route segments to human-readable labels
- [ ] Unit test: AdminBreadcrumb last segment is not a link
- [ ] Unit test: AdminBreadcrumb renders `detailLabel` override for the last segment
- [ ] Unit test: `searchAdminEntities()` returns empty array for queries under 2 characters
- [ ] Unit test: `searchAdminEntities()` returns empty array for non-admin callers
- [ ] Unit test: `searchAdminEntities()` returns grouped results for users, gangs, and fixtures
- [ ] Unit test: `searchAdminEntities()` limits results to 5 per entity type
- [ ] Unit test: AdminSkeleton MetricCardsSkeleton renders correct number of skeleton cards
- [ ] Unit test: AdminSkeleton TableSkeleton renders correct number of rows and columns
- [ ] Unit test: AdminEmptyState renders icon, title, and optional description
- [ ] Unit test: AdminEmptyState omits description paragraph when not provided
- [ ] Integration test: `Cmd+K` keydown opens the command palette
- [ ] Integration test: `Escape` keydown closes the command palette
- [ ] Integration test: selecting a search result navigates to the correct detail page
- [ ] Responsive test: sidebar collapses to Sheet on viewports < 768px
- [ ] Responsive test: metric card grid adjusts columns at each breakpoint (375, 768, 1024, 1440)
