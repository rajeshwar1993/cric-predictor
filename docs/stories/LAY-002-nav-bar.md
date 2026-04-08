# LAY-002: Nav Bar

**Phase:** 3 — Layout Shell
**Dependencies:** LAY-001, DSN-003
**Estimated scope:** Server wrapper + client notification bell + client user menu

---

## Description

Implement the global nav bar that appears on all authenticated pages. The nav bar is a Server Component shell that fetches the user profile, with two Client Component islands: the notification bell (right side) and the user menu avatar (left side panel).

---

## Acceptance Criteria

### Nav Bar Shell (`src/components/layout/nav-bar.tsx`) — Server Component
- [ ] Background: `#111111` (solid, no blur)
- [ ] Height: 56px
- [ ] Border-bottom: `2px solid #1A1A1A`
- [ ] Sticky at top (`position: sticky; top: 0; z-index: 50`)
- [ ] Left: App logo + "BRAGG" text (links to `/dashboard`)
- [ ] Right: Notification bell + User avatar
- [ ] Fetches user profile server-side, passes `userId` and `displayName` as props to client children

### Notification Bell (`src/components/notifications/notification-bell.tsx`) — Client Component
- [ ] Bell icon (24px, white default)
- [ ] Unread count badge (red dot or number) when unread > 0
- [ ] Clicking opens notification SidePanel from right
- [ ] Receives `userId` as prop (for realtime subscription — implemented in NTF-001/002)
- [ ] Placeholder for now — just the bell icon with badge; panel content comes in NTF-001

### User Menu Button (`src/components/layout/user-menu.tsx`) — Client Component
- [ ] Avatar with user's initials (from `displayName`)
- [ ] Clicking opens SidePanel from left
- [ ] Panel contains:
  - User display name and email at top
  - Navigation links: Dashboard, Profile
  - Sign out button at bottom
- [ ] Active link highlighted with lime text + 3px bold underline

---

## Files to Create

```
web-app/src/components/
├── layout/
│   ├── nav-bar.tsx                 # Server Component shell
│   ├── nav-bar.stories.tsx
│   ├── user-menu.tsx               # Client Component (avatar + left panel)
│   ├── user-menu.stories.tsx
├── notifications/
│   ├── notification-bell.tsx       # Client Component (bell icon + right panel trigger)
│   └── notification-bell.stories.tsx
```

---

## Technical Notes

### Server/Client Boundary
```
NavBar (Server Component)
├── Logo + "BRAGG" link (Server — static)
├── NotificationBell (Client — needs click handler, will subscribe to realtime)
│   props: { userId: string, initialUnreadCount: number }
└── UserMenu (Client — needs click handler for SidePanel)
    props: { displayName: string, email: string }
```

### Nav Bar Layout
```tsx
// nav-bar.tsx (Server Component)
import { createServerClient } from '@/lib/supabase/server'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { UserMenu } from './user-menu'
import Link from 'next/link'

export async function NavBar() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null // Shouldn't happen on authenticated pages

  const { data: profile } = await supabase
    .from('v2_profiles')
    .select('display_name, email')
    .eq('id', user.id)
    .single()

  return (
    <nav className="sticky top-0 z-50 h-14 bg-concrete-black border-b-2 border-dark-concrete flex items-center justify-between px-4">
      <Link href="/dashboard" className="font-display font-bold text-lg uppercase tracking-tight">
        BRAGG
      </Link>
      <div className="flex items-center gap-3">
        <NotificationBell userId={user.id} />
        <UserMenu displayName={profile?.display_name ?? ''} email={profile?.email ?? ''} />
      </div>
    </nav>
  )
}
```

### Active Link Detection
Use `usePathname()` from `next/navigation` in the UserMenu client component to highlight the current route.

### Navigation Links in User Menu
```
Dashboard    → /dashboard
Profile      → /profile
---
Sign Out     → calls signOut server action
```

### Sign Out Flow
The sign out button calls a server action that:
1. Signs out from Supabase
2. Clears `bragg_onboarded` and `bragg_terms_version` cookies
3. Redirects to `/`

---

## Storybook Requirements

### NavBar Stories
- `Default` — with mock user data
- `LongDisplayName` — truncation handling
- Note: NavBar is a Server Component, so Storybook story will mock the data and render a presentational wrapper

### NotificationBell Stories
- `NoUnread` — just the bell
- `WithUnread` — bell with count badge (3, 9, 99+)

### UserMenu Stories
- `Closed` — just the avatar
- `Open` — panel visible with nav links
- `ActiveDashboard` — dashboard link highlighted
- `ActiveProfile` — profile link highlighted
