# DASH-001: Dashboard Page + Gang Cards

**Phase:** 5 — Dashboard
**Dependencies:** AUTH-003, LAY-002, LAY-003
**Estimated scope:** Dashboard page with gang cards grid, empty state

---

## Description

Build the dashboard page (`/dashboard`) — the main hub after login. Shows a grid of gang cards the user belongs to, with empty state for new users. This is the first authenticated page users see.

---

## Acceptance Criteria

### Dashboard Page
- [ ] Route: `/dashboard` (inside `(app)` layout with NavBar + Footer)
- [ ] Server Component: fetches user's gangs via DAL
- [ ] Shows gang cards grid for approved memberships
- [ ] Empty state when user has no gangs (EmptyState component with create/join CTAs)

### Gang Card (`src/components/gangs/gang-card.tsx`)
- [ ] Background: `#1A1A1A`, border `#333333`, radius 16px, padding 24px
- [ ] Gang name: H3 style (Space Grotesk 600, 20px)
- [ ] Member count: "X/20 members" in caption style
- [ ] User's role badge: "ADMIN" (lime badge) or "MEMBER" (default badge)
- [ ] Hover: border `#C8E64A50`, translateY(-2px)
- [ ] Entire card is clickable → links to `/group/[gangId]`

### Empty State
- [ ] Icon: `users` (Lucide)
- [ ] Headline: "No gangs yet"
- [ ] Description: "Create a gang or join one with an invite code to start predicting."
- [ ] Two CTAs below: Create Gang form + Join Gang form (see DASH-002, DASH-003)

### DAL Function (`src/lib/dal/gangs.ts`)
- [ ] `getUserGangs(userId: string)` → returns gangs with member count and user's role
- [ ] Query: `v2_gang_members` WHERE `user_id` = userId AND `status` = 'approved', JOIN `v2_gangs` WHERE `is_deleted` = false
- [ ] Include member count per gang (approved members)
- [ ] Include user's role per gang

---

## Files to Create

```
web-app/src/
├── app/
│   └── (app)/
│       ├── layout.tsx              # App layout with NavBar + Footer
│       └── dashboard/
│           └── page.tsx
├── components/
│   └── gangs/
│       ├── gang-card.tsx
│       ├── gang-card.stories.tsx
│       ├── gangs-grid.tsx          # Grid of gang cards
│       └── gangs-grid.stories.tsx
├── lib/
│   └── dal/
│       └── gangs.ts                # getUserGangs + future gang DAL functions
```

---

## Technical Notes

### App Layout (`(app)/layout.tsx`)
```tsx
import { NavBar } from '@/components/layout/nav-bar'
import { Footer } from '@/components/layout/footer'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      <div className="min-h-[calc(100dvh-56px)]"> {/* NavBar height */}
        {children}
      </div>
      <Footer />
    </>
  )
}
```

### Dashboard Page
```tsx
import { createServerClient } from '@/lib/supabase/server'
import { getUserGangs } from '@/lib/dal/gangs'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { GangsGrid } from '@/components/gangs/gangs-grid'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const gangs = await getUserGangs(user.id)

  return (
    <PageWrapper>
      <h1 className="font-display font-bold text-2xl uppercase tracking-tight mb-6">
        Your Gangs
      </h1>
      <GangsGrid gangs={gangs} />
      {/* Create/Join forms appear below the grid (or as the empty state) */}
    </PageWrapper>
  )
}
```

### DAL Function
```typescript
export async function getUserGangs(userId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('v2_gang_members')
    .select(`
      role,
      v2_gangs!inner (
        id, name, invite_code, created_at,
        v2_gang_members (count)
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'approved')
    .eq('v2_gangs.is_deleted', false)

  if (error) throw error
  return data
}
```

---

## Storybook Requirements

### GangCard Stories
- `Admin` — shows admin badge
- `Member` — shows member badge
- `FullGang` — "20/20 members"
- `NewGang` — "1/20 members"

### GangsGrid Stories
- `Empty` — no gangs (empty state)
- `OneGang` — single card
- `MultipleGangs` — 4-5 cards in grid
- `MaxGangs` — many cards showing scroll
