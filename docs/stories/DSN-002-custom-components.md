# DSN-002: Custom Components (StatBlock, EmptyState, Skeleton, Toast)

**Phase:** 2 — Design System Components
**Dependencies:** DSN-001
**Estimated scope:** 4 custom components unique to Bragg, not in shadcn/ui

---

## Description

Build custom components defined in the Electric Street design system that don't exist in shadcn/ui: StatBlock (signature component), EmptyState, Skeleton (shimmer loading), and Toast notifications.

---

## Acceptance Criteria

### StatBlock (`src/components/ui/stat-block.tsx`)
- [ ] Background: `#C8E64A` (default) or custom color via prop
- [ ] Border-radius: 0px (sharp — signature design element)
- [ ] Text: `#111111`, Space Grotesk 700
- [ ] Shadow: `4px 4px 0 #A8C42A` (offset — signature)
- [ ] Compact size, fits in a row of 2-3 blocks
- [ ] Props: `value` (number/string), `label` (string), `color?` (override bg), `size?` (sm/default)
- [ ] Number display uses `tabular-nums` font feature for no layout shift
- [ ] Score pop animation on value change (scale overshoot: 1.0 → 1.15 → 1.0)

### EmptyState (`src/components/ui/empty-state.tsx`)
- [ ] Centered layout with icon, headline, description, and optional action button
- [ ] Icon: 48px, `#737373` (muted)
- [ ] Headline: H3 style (Space Grotesk 600, 20px)
- [ ] Description: Body Small (DM Sans 400, 14px, `#A3A3A3`)
- [ ] Action: optional button or link
- [ ] Props: `icon` (Lucide icon name), `headline`, `description`, `action?` (ReactNode)

### Skeleton (`src/components/ui/skeleton.tsx`)
- [ ] Background: `#1A1A1A` base with shimmer gradient animation
- [ ] Shimmer: 1.5s ease-in-out infinite, gradient from `#1A1A1A` to `#2E2E2E` and back
- [ ] Matches real content shape (same height, border-radius, spacing)
- [ ] `prefers-reduced-motion`: disable shimmer, show static `#1A1A1A` background
- [ ] Variants: `text` (h-4 rounded), `heading` (h-6 rounded), `card` (h-[120px] rounded-lg), `avatar` (rounded-full), `block` (custom h/w via className)
- [ ] Pre-built skeleton compositions:
  - `MatchCardSkeleton` — mimics match card shape
  - `LeaderboardRowSkeleton` — mimics leaderboard row
  - `ScenarioCardSkeleton` — mimics prediction scenario card
  - `PageSkeleton` — full page placeholder

### Toast (`src/components/ui/toast.tsx`)
- [ ] Background: `#242424`
- [ ] Border: `2px solid` (semantic color based on type)
- [ ] Border-radius: 8px
- [ ] Types: `success` (green `#4ADE80`), `error` (red `#FF6B6B`), `warning` (yellow `#FFD93D`), `info` (blue `#4F7DF9`)
- [ ] Auto-dismiss: 4 seconds (except error — stays until dismissed)
- [ ] Position: fixed bottom center, 20px from bottom
- [ ] Has colored square indicator on the left side (matching the screenshots)
- [ ] Dismiss button (X) on the right
- [ ] Stacks vertically when multiple toasts
- [ ] Uses `sonner` or built-in toast system from shadcn/ui
- [ ] `useToast()` hook or `toast()` function for triggering

---

## Files to Create

```
web-app/src/components/ui/
├── stat-block.tsx
├── stat-block.stories.tsx
├── empty-state.tsx
├── empty-state.stories.tsx
├── skeleton.tsx
├── skeleton.stories.tsx
├── toast.tsx                       # May use sonner — install via shadcn
├── toaster.tsx                     # Toast container/provider
├── toast.stories.tsx
```

---

## Technical Notes

### StatBlock Implementation
```tsx
interface StatBlockProps {
  value: string | number
  label: string
  color?: string        // override bg color (e.g., team color, coral for errors)
  size?: 'sm' | 'default'
}

export function StatBlock({ value, label, color, size = 'default' }: StatBlockProps) {
  return (
    <div
      className={cn(
        'inline-flex flex-col items-center justify-center font-display font-bold text-text-on-primary',
        'shadow-[4px_4px_0_var(--color-lime-shade)]',
        size === 'sm' ? 'px-3 py-2 min-w-[72px]' : 'px-4 py-3 min-w-[88px]',
      )}
      style={{ backgroundColor: color || 'var(--color-bragg-lime)' }}
    >
      <span className={cn('tabular-nums', size === 'sm' ? 'text-xl' : 'text-[28px] leading-tight')}>
        {value}
      </span>
      <span className="text-[11px] uppercase tracking-[0.1em] opacity-80">{label}</span>
    </div>
  )
}
```

### Shimmer Animation
```css
.animate-shimmer {
  background: linear-gradient(
    90deg,
    var(--color-dark-concrete) 0%,
    var(--color-light-concrete) 50%,
    var(--color-dark-concrete) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

### Toast Setup
Use `sonner` via shadcn/ui:
```bash
npx shadcn@latest add sonner
```
Customize the Toaster component to match Electric Street styling.

### EmptyState Pattern
```tsx
<EmptyState
  icon="users"
  headline="No gangs yet"
  description="Create a gang or join one with an invite code to start predicting."
  action={<Button>Create a Gang</Button>}
/>
```

---

## Storybook Requirements

### StatBlock Stories
- `Default` (lime bg, "14/19", "CORRECT")
- `Rank` (lime bg, "#1", "RANK")
- `Error` (coral bg, "5", "WRONG")
- `Points` (coral bg, "87", "POINTS")
- `Row` — 4 stat blocks in a row (mimics the design system screenshot)
- `AnimatedUpdate` — shows score-pop animation

### EmptyState Stories
- `NoGangs` — "No gangs yet" with create button
- `NoPredictions` — "No predictions" with predict CTA
- `NoMembers` — "Invite your friends"

### Skeleton Stories
- `Text`, `Heading`, `Card`, `Avatar`
- `MatchCardSkeleton`, `LeaderboardRowSkeleton`
- `PageSkeleton` — full page

### Toast Stories
- `Success`, `Error`, `Warning`, `Info`
- `Stacked` — multiple toasts visible
- `AutoDismiss` — shows timeout behavior

---

## Design System Reference

- `Screenshot 2026-04-08 at 22.38.29.png` — Stat blocks visual reference (lime, yellow rank, coral, purple)
- `Screenshot 2026-04-08 at 22.39.15.png` — Toast notifications (4 types with colored left indicator)
- `Screenshot 2026-04-08 at 22.39.08.png` — Shadows, border radius, spacing scale
