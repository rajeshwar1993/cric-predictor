# LAY-001: Root Layout + Page Wrapper

**Phase:** 3 — Layout Shell
**Dependencies:** FND-003, DSN-001
**Estimated scope:** Root layout with fonts/providers, reusable PageWrapper component

---

## Description

Implement the root layout (`src/app/layout.tsx`) that applies fonts, dark mode, PostHog provider, and the Toaster. Also create the `PageWrapper` component that enforces max-width and padding constraints per the design system.

---

## Acceptance Criteria

### Root Layout (`src/app/layout.tsx`)
- [ ] `<html lang="en" className="dark">` with font CSS variables applied
- [ ] `<body>` with `bg-concrete-black text-text-primary font-body antialiased`
- [ ] PostHog provider wraps all children (PHProvider is a `'use client'` component rendered by the Server Component layout — this is the standard Next.js pattern for providers)
- [ ] Toaster component rendered (for toast notifications)
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1">` set
- [ ] Metadata: title "Bragg — Predict Right. Prove It.", description for SEO

### Mobile-First Foundation
- [ ] All layouts and components designed mobile-first (375px), then scale up to tablet (768px) and desktop
- [ ] Touch targets minimum 44px diameter (per WCAG)
- [ ] Bottom safe area padding (34px) for notched phones applied via PageWrapper
- [ ] No horizontal scroll on any page at 375px width

### PageWrapper (`src/components/layout/page-wrapper.tsx`)
- [ ] Max content width: 480px (mobile), 720px (tablet)
- [ ] Page padding: 16px (mobile), 32px (tablet+)
- [ ] Centered horizontally (`mx-auto`)
- [ ] Bottom safe area: 34px padding-bottom
- [ ] Props: `children`, `className?` (for overrides), `maxWidth?` ('sm' | 'default' = 480/720)
- [ ] Used by every page to enforce consistent layout

---

## Files to Create/Modify

```
web-app/src/
├── app/
│   ├── layout.tsx                  # UPDATE — full implementation
│   └── globals.css                 # UPDATE — base body styles
├── components/
│   └── layout/
│       ├── page-wrapper.tsx
│       └── page-wrapper.stories.tsx
```

---

## Technical Notes

### Root Layout
```tsx
import type { Metadata } from 'next'
import { spaceGrotesk, dmSans } from './fonts'
import { PHProvider } from '@/components/analytics/posthog-provider'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Bragg', template: '%s | Bragg' },
  description: 'Predict right. Prove it. Bragg. A social prediction game for cricket.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable} dark`}>
      <body className="bg-concrete-black text-text-primary font-body antialiased min-h-dvh">
        <PHProvider>
          {children}
          <Toaster />
        </PHProvider>
      </body>
    </html>
  )
}
```

### PageWrapper
```tsx
export function PageWrapper({
  children,
  className,
  maxWidth = 'default',
}: {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'default'
}) {
  return (
    <main
      className={cn(
        'mx-auto px-4 pb-[34px] md:px-8',
        maxWidth === 'sm' ? 'max-w-[480px]' : 'max-w-[720px]',
        className,
      )}
    >
      {children}
    </main>
  )
}
```

### Body Base Styles (globals.css)
```css
body {
  min-height: 100dvh;
  -webkit-font-smoothing: antialiased;
}

/* Scrollbar styling for dark theme */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--color-concrete-black); }
::-webkit-scrollbar-thumb { background: var(--color-wire); border-radius: 3px; }
```

---

## Storybook Requirements

### PageWrapper Stories
- `Default` — with sample content showing max-width constraint
- `NarrowWidth` — `maxWidth="sm"` variant
- `WithLongContent` — scrollable content
