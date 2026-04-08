# DSN-003: Composite Components (DestructiveDialog, SidePanel, LeaderboardRow)

**Phase:** 2 — Design System Components
**Dependencies:** DSN-001
**Estimated scope:** 3 composite components used across multiple features

---

## Description

Build composite components that combine primitives into reusable patterns: DestructiveActionDialog (type-to-confirm), SidePanel (animated sheet from edge), and LeaderboardRow (ranked member display).

---

## Acceptance Criteria

### DestructiveActionDialog (`src/components/ui/destructive-action-dialog.tsx`)
- [ ] Modal overlay with `#111111` at 80% opacity
- [ ] Card-like dialog: `#242424` bg, `#333333` border, 24px radius
- [ ] Warning icon (triangle-alert) in `#FF6B6B`
- [ ] Title: H3 style, descriptive (e.g., "Delete Gang")
- [ ] Description: body text explaining consequences
- [ ] Type-to-confirm input with specific confirmation value shown as placeholder
- [ ] Confirm button: destructive variant, disabled until input matches
- [ ] Cancel button: ghost variant
- [ ] Props: `title`, `description`, `confirmValue` (what user must type), `confirmLabel`, `onConfirm`, `onCancel`, `isLoading`
- [ ] Usage contexts (per PRD):
  - Delete gang → type gang name
  - Delete account → type email address
  - Leave gang → type gang name
  - Remove member → type member's display name
- [ ] Keyboard: Escape to close, Enter to confirm (when enabled)
- [ ] Focus trapped inside dialog while open

### SidePanel (`src/components/ui/side-panel.tsx`)
- [ ] Uses shadcn Sheet component as base (install via `npx shadcn add sheet`)
- [ ] Animated slide-in from specified edge (left or right)
- [ ] Background: `#1A1A1A`
- [ ] Width: 320px on mobile (full minus 56px), 380px on tablet+
- [ ] Overlay: `#111111` at 60% opacity
- [ ] Close button (X icon) in top-right
- [ ] Header slot for title
- [ ] Scrollable content area
- [ ] Props: `side` ('left' | 'right'), `title`, `open`, `onOpenChange`, `children`
- [ ] Used for: notification panel (right), user menu (left)

### LeaderboardRow (`src/components/leaderboards/leaderboard-row.tsx`)
- [ ] Height: 72px
- [ ] Background: `#1A1A1A`
- [ ] Rank display:
  - `#1`: Yellow `#FFD93D` background block (sharp edges 0px radius), black text — highlighted marker style
  - `#2`: text `#A3A3A3`
  - `#3`: text `#CD7F32` (bronze)
  - Others: text `#737373`
- [ ] Rank number: Space Grotesk 700, 24px
- [ ] Avatar with initials
- [ ] Display name: DM Sans 500, 16px
- [ ] Score: Space Grotesk 700, 20px, right-aligned
- [ ] **Current user highlight:** 4px lime left border + subtle lime wash background (`#C8E64A15`)
- [ ] **Left/removed members:** grayed out (text `#737373`, opacity reduced)
- [ ] Separator: 2px solid `#242424`
- [ ] Props: `rank`, `displayName`, `score`, `isCurrentUser`, `isDeparted`, `avatar?`, `subtitle?` (for additional stats like "14/19 correct")
- [ ] Rank change animation: 400ms spring (for live updates)

---

## Files to Create

```
web-app/src/components/ui/
├── destructive-action-dialog.tsx
├── destructive-action-dialog.stories.tsx
├── side-panel.tsx
├── side-panel.stories.tsx
├── sheet.tsx                       # shadcn Sheet (base for SidePanel)
├── dialog.tsx                      # shadcn Dialog (base for DestructiveDialog)

web-app/src/components/leaderboards/
├── leaderboard-row.tsx
├── leaderboard-row.stories.tsx
```

---

## Technical Notes

### DestructiveActionDialog Pattern
```tsx
interface DestructiveActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmValue: string        // What user must type (e.g., gang name)
  confirmLabel?: string       // Button text (default: "Delete")
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
}

// Usage:
<DestructiveActionDialog
  open={showDelete}
  onOpenChange={setShowDelete}
  title="Delete Gang"
  description="This will permanently delete the gang and all associated data. This cannot be undone."
  confirmValue={gangName}
  confirmLabel="Delete Gang"
  onConfirm={handleDeleteGang}
  isLoading={isDeleting}
/>
```

### SidePanel — Notification Panel (right)
```tsx
<SidePanel side="right" title="Notifications" open={open} onOpenChange={setOpen}>
  {notifications.map(n => <NotificationItem key={n.id} notification={n} />)}
</SidePanel>
```

### SidePanel — User Menu (left)
```tsx
<SidePanel side="left" title="Menu" open={open} onOpenChange={setOpen}>
  <nav>
    <Link href="/dashboard">Dashboard</Link>
    <Link href="/profile">Profile</Link>
  </nav>
  <SignOutButton />
</SidePanel>
```

### LeaderboardRow Rank Styling
```tsx
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="bg-sunburst-yellow text-text-on-primary font-display font-bold text-2xl px-3 py-1 min-w-[48px] text-center">
        #1
      </span>
    )
  }
  // #2 = silver text, #3 = bronze text, others = muted
  const color = rank === 2 ? 'text-text-secondary' : rank === 3 ? 'text-[#CD7F32]' : 'text-text-muted'
  return <span className={cn('font-display font-bold text-2xl min-w-[48px] text-center', color)}>#{rank}</span>
}
```

### Dependencies to Install
```bash
npx shadcn@latest add dialog sheet
```

---

## Storybook Requirements

### DestructiveActionDialog Stories
- `DeleteGang` — type gang name to confirm
- `DeleteAccount` — type email to confirm
- `LeaveGang` — type gang name to confirm
- `RemoveMember` — type display name to confirm
- `Loading` — shows loading spinner on confirm button
- `Disabled` — input doesn't match, button disabled

### SidePanel Stories
- `Right` — notification panel mock
- `Left` — user menu mock
- `Scrollable` — long content
- `Empty` — no content

### LeaderboardRow Stories
- `Rank1` — gold highlight
- `Rank2` — silver
- `Rank3` — bronze
- `RegularRank` — #5
- `CurrentUser` — highlighted with lime border
- `DepartedMember` — grayed out
- `FullLeaderboard` — 8 rows showing all states

---

## Design System Reference

- `Screenshot 2026-04-08 at 22.38.40.png` — Leaderboard rows with rank badges, current user highlight
- `Screenshot 2026-04-08 at 22.38.29.png` — Input styling for the confirm dialog
