# FND-003: Design System Tokens + Fonts

**Phase:** 1 — Foundation
**Dependencies:** FND-001
**Estimated scope:** CSS custom properties, Tailwind theme extension, font loading via `next/font`

---

## Description

Implement the Electric Street design system as CSS custom properties and Tailwind theme tokens. Set up Space Grotesk and DM Sans fonts via `next/font/google`. This story makes all design tokens available to every component via Tailwind classes and CSS variables.

---

## Acceptance Criteria

- [ ] All Electric Street colors available as CSS custom properties and Tailwind classes
- [ ] Typography scale implemented (Display through Caption + Stat)
- [ ] Spacing scale (space-1 through space-20) mapped to Tailwind
- [ ] Border radius tokens (radius-none through radius-full)
- [ ] Shadow/elevation tokens (elevation-0 through elevation-3 + color-block + highlight)
- [ ] Space Grotesk loaded via `next/font/google` (weights: 400, 500, 600, 700)
- [ ] DM Sans loaded via `next/font/google` (weights: 400, 500, 600, 700)
- [ ] Font CSS variables applied: `--font-display` (Space Grotesk), `--font-body` (DM Sans)
- [ ] Motion/animation tokens defined (durations, easings, keyframes)
- [ ] `prefers-reduced-motion` respected — animations collapse to 150ms opacity
- [ ] All tokens documented inline with comments referencing Electric Street spec

---

## Files to Create/Modify

```
web-app/src/
├── app/
│   ├── globals.css                 # UPDATE — add all CSS custom properties + @theme
│   ├── layout.tsx                  # UPDATE — apply font classes to <html>
│   └── fonts.ts                    # Font definitions (next/font/google)
```

---

## Technical Notes

### Font Setup (`fonts.ts`)
```typescript
import { Space_Grotesk, DM_Sans } from 'next/font/google'

export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

export const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})
```

### CSS Custom Properties (`globals.css`)

Apply inside `@theme` block for Tailwind v4, or as `:root` variables:

#### Colors
```css
:root {
  /* Primary */
  --color-bragg-lime: #C8E64A;
  --color-lime-shade: #A8C42A;
  --color-lime-wash: #C8E64A15;

  /* Secondary & Accent */
  --color-electric-coral: #FF6B6B;
  --color-vivid-blue: #4F7DF9;
  --color-sunburst-yellow: #FFD93D;
  --color-ultraviolet: #8B5CF6;

  /* Neutral / Surface */
  --color-concrete-black: #111111;
  --color-dark-concrete: #1A1A1A;
  --color-mid-concrete: #242424;
  --color-light-concrete: #2E2E2E;
  --color-wire: #333333;
  --color-lime-wire: #C8E64A50;

  /* Text */
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #A3A3A3;
  --color-text-muted: #737373;
  --color-text-on-primary: #111111;

  /* Semantic */
  --color-success: #4ADE80;
  --color-warning: #FFD93D;
  --color-error: #FF6B6B;
  --color-info: #4F7DF9;
}
```

#### Spacing (map to Tailwind)
```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
}
```

#### Border Radius
```css
:root {
  --radius-none: 0px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;
}
```

#### Shadows
```css
:root {
  --shadow-elevation-1: 0 2px 4px rgba(0,0,0,0.3);
  --shadow-elevation-2: 0 4px 16px rgba(0,0,0,0.4);
  --shadow-elevation-3: 0 8px 32px rgba(0,0,0,0.5);
  --shadow-color-block: 4px 4px 0 #C8E64A;
  --shadow-highlight: 0 0 0 3px #C8E64A;
}
```

#### Motion
```css
:root {
  --duration-micro: 120ms;
  --duration-state: 180ms;
  --duration-enter: 250ms;
  --duration-exit: 150ms;
  --duration-page: 250ms;
  --duration-score: 300ms;
  --duration-rank: 400ms;

  --ease-out: ease-out;
  --ease-in: ease-in;
  --ease-overshoot: cubic-bezier(0.34, 1.56, 0.64, 1);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-micro: 150ms;
    --duration-state: 150ms;
    --duration-enter: 150ms;
    --duration-exit: 150ms;
    --duration-page: 150ms;
    --duration-score: 150ms;
    --duration-rank: 150ms;
  }
}
```

#### Keyframe Animations
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes pop-in {
  0% { opacity: 0; transform: scale(0.95); }
  70% { transform: scale(1.03); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes score-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
```

### Tailwind v4 Theme Extension
In `globals.css`, use `@theme` to extend Tailwind's theme with custom tokens:

```css
@import "tailwindcss";

@theme {
  --color-bragg-lime: #C8E64A;
  --color-lime-shade: #A8C42A;
  /* ... all colors ... */

  --font-family-display: var(--font-display), system-ui, sans-serif;
  --font-family-body: var(--font-body), system-ui, sans-serif;

  /* Tailwind picks these up as utility classes: bg-bragg-lime, text-electric-coral, etc. */
}
```

### Layout Update
Apply font variables to `<html>`:
```tsx
<html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable} dark`}>
```

Set `<body>` background and default text:
```tsx
<body className="bg-concrete-black text-text-primary font-body antialiased">
```

---

## Design System Reference

All values from `docs/design-systems/electric-street.md`:
- Color Palette (Primary, Secondary, Neutral, Text, Semantic)
- Typography (font stack, type scale)
- Spacing System (8px grid)
- Border Radius (0 to full)
- Shadows & Elevation (5 levels)
- Motion & Animation (7 duration levels, 3 keyframes)

---

## Testing Requirements

- [ ] Verify all color CSS variables render correctly (inspect in browser)
- [ ] Verify fonts load (Space Grotesk for headings, DM Sans for body)
- [ ] Verify `prefers-reduced-motion` disables animations (use browser DevTools emulation)
- [ ] Tailwind classes like `bg-bragg-lime`, `text-electric-coral` work as expected
