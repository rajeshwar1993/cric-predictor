# DSN-001: shadcn/ui Primitives

**Phase:** 2 — Design System Components
**Dependencies:** FND-003
**Estimated scope:** Customize shadcn/ui Button, Card, Input, Badge, Avatar to match Electric Street

---

## Description

Install and customize the core shadcn/ui primitives to match the Electric Street design system. Each component must be visually identical to the design system screenshots and spec. These primitives are used everywhere — they must be pixel-perfect.

---

## Acceptance Criteria

### Button (`src/components/ui/button.tsx`)
- [ ] **Primary:** bg `#C8E64A`, text `#111111`, uppercase, letter-spacing 0.08em, DM Sans 700, 14px
- [ ] **Secondary:** bg `#242424`, text white, 2px solid `#333333` border, hover border `#C8E64A`
- [ ] **Ghost:** transparent bg, text `#A3A3A3`, hover text white + bg `#1A1A1A`
- [ ] **Destructive:** bg `#FF6B6B`, text `#111111`, hover `#FF5252`
- [ ] **Disabled:** bg `#1A1A1A`, text `#737373`, cursor-not-allowed
- [ ] Height: 48px, padding: 24px horizontal, border-radius: 8px
- [ ] Hover: primary gains offset shadow `4px 4px 0 #A8C42A`
- [ ] Active: `translateY(2px)`, shadow shrinks
- [ ] Transition: all 150ms ease-out
- [ ] Sizes: `default` (48px), `sm` (36px), `lg` (56px), `icon` (48x48)

### Card (`src/components/ui/card.tsx`)
- [ ] Background: `#1A1A1A`
- [ ] Border: `1px solid #333333`
- [ ] Border-radius: 16px
- [ ] Padding: 24px
- [ ] Hover: border `#C8E64A50`, translateY(-2px)
- [ ] Sub-components: CardHeader, CardTitle, CardDescription, CardContent, CardFooter

### Input (`src/components/ui/input.tsx`)
- [ ] Background: `#1A1A1A`
- [ ] Border: `2px solid #333333` (thicker than default for boldness)
- [ ] Border-radius: 8px
- [ ] Height: 48px
- [ ] Text: white, DM Sans 400, 16px
- [ ] Placeholder: `#737373`
- [ ] Focus: border `#C8E64A`, 3px outline offset (highlight ring)
- [ ] Error state: border `#FF6B6B` (via `aria-invalid` or `data-error` attribute)
- [ ] Label component styled: DM Sans 500, 12px, uppercase, letter-spacing 0.1em (Caption style)

### Badge (`src/components/ui/badge.tsx`)
- [ ] **Default:** bg `#1A1A1A`, text `#A3A3A3`, border `#333333`
- [ ] **Lime:** bg `#C8E64A`, text `#111111` (for "Live", "Featured", "Correct")
- [ ] **Coral:** bg `#FF6B6B`, text `#111111` (for "Loss", "Incorrect")
- [ ] **Yellow:** bg `#FFD93D`, text `#111111` (for "Upcoming", rank #1)
- [ ] **Purple:** bg `#8B5CF6`, text white (for "Rare" events)
- [ ] **Blue:** bg `#4F7DF9`, text white (for "Info")
- [ ] **Outline:** transparent bg, text inherit, border `#333333`
- [ ] Border-radius: 4px, padding: 6px 12px
- [ ] Font: DM Sans 700, 11px, uppercase, letter-spacing 0.1em

### Avatar (`src/components/ui/avatar.tsx`)
- [ ] Circle shape (border-radius: full)
- [ ] Background: `#C8E64A` (or team color when provided)
- [ ] Text: `#111111`, Space Grotesk 700
- [ ] Sizes: `sm` (32px), `default` (40px), `lg` (56px)
- [ ] Displays initials from `getAvatarInitials()` helper
- [ ] Fallback initials when no image provided

---

## Files to Create/Modify

```
web-app/src/components/ui/
├── button.tsx                      # CREATE via shadcn, then customize
├── card.tsx                        # CREATE via shadcn, then customize
├── input.tsx                       # CREATE via shadcn, then customize
├── badge.tsx                       # CREATE via shadcn, then customize
├── avatar.tsx                      # CREATE via shadcn, then customize
├── label.tsx                       # CREATE via shadcn (for form labels)
├── button.stories.tsx              # Storybook
├── card.stories.tsx
├── input.stories.tsx
├── badge.stories.tsx
├── avatar.stories.tsx
```

---

## Technical Notes

### Installation
```bash
npx shadcn@latest add button card input badge avatar label
```
Then customize each to match Electric Street.

### Button Implementation Pattern
Use `cva` (class-variance-authority) for variants:
```typescript
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-body font-bold text-sm uppercase tracking-[0.08em] transition-all duration-[150ms] ease-out disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-bragg-lime text-text-on-primary hover:shadow-color-block active:translate-y-0.5 active:shadow-none',
        secondary: 'bg-mid-concrete text-text-primary border-2 border-wire hover:border-bragg-lime',
        ghost: 'text-text-secondary hover:text-text-primary hover:bg-dark-concrete',
        destructive: 'bg-electric-coral text-text-on-primary hover:bg-[#FF5252] active:translate-y-0.5',
      },
      size: {
        default: 'h-12 px-6',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-14 px-8',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)
```

### Card Hover Pattern
Apply hover effect via Tailwind utility classes. Use `group` for child elements that need to respond to parent hover:
```tsx
<div className="bg-dark-concrete border border-wire rounded-lg p-6 transition-all duration-[180ms] ease-out hover:border-lime-wire hover:-translate-y-0.5">
```

---

## Storybook Requirements

Each component needs stories showing ALL variants:

### Button Stories
- `Primary`, `Secondary`, `Ghost`, `Destructive`, `Disabled`
- `Small`, `Default`, `Large`, `Icon`
- `Loading` (with spinner)
- `AllVariants` (grid showing all combinations)

### Card Stories
- `Default`, `WithHover`, `WithContent` (mock match card content)

### Input Stories
- `Default`, `Focused`, `WithValue`, `Error`, `Disabled`, `WithLabel`

### Badge Stories
- All 7 variants in a row
- Usage context: "LIVE", "UPCOMING", "LOSS", "FEATURED", "RARE", "PENDING"

### Avatar Stories
- All 3 sizes, with initials, with team color override

---

## Design System Reference

Refer to screenshots:
- `Screenshot 2026-04-08 at 22.38.29.png` — Stat blocks, buttons, badges, inputs
- `Screenshot 2026-04-08 at 22.38.40.png` — Cards, leaderboard, navigation
