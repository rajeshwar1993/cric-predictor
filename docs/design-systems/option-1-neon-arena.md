# Design System Option 1: Neon Arena

> Cyberpunk-inspired, gaming-forward dark UI with electric neon accents derived from the Bragg logo. Bold, aggressive, high-energy — like walking into a neon-lit gaming arena.

---

## Design Philosophy

**Vibe:** Electric. Competitive. Unapologetic.
Neon Arena takes the shattered "B" logo's lime energy and amplifies it into a full cyberpunk aesthetic. Every element glows, pulses, or demands attention. This is a game app that *feels* like a game — neon highlights, sharp edges, glitch-inspired micro-animations, and dark void backgrounds that make colors pop off the screen.

**Best for:** Users who want the app to feel like an esports overlay or gaming HUD.

---

## Color Palette

### Primary Colors (derived from logo)

| Role | Name | Hex | RGB | Usage |
|------|------|-----|-----|-------|
| Primary | Bragg Lime | `#C8E64A` | 200, 230, 74 | Primary CTAs, active states, key highlights |
| Primary Hover | Lime Bright | `#D4F05A` | 212, 240, 90 | Hover/pressed state of primary |
| Primary Muted | Lime Dim | `#C8E64A33` | — | Backgrounds, subtle highlights (20% opacity) |

### Secondary & Accent Colors

| Role | Name | Hex | RGB | Usage |
|------|------|-----|-----|-------|
| Secondary | Electric Cyan | `#00E5FF` | 0, 229, 255 | Secondary actions, links, info states |
| Accent | Hot Magenta | `#FF2D78` | 255, 45, 120 | Warnings, losses, rival highlights |
| Tertiary | Plasma Purple | `#A855F7` | 168, 85, 247 | Badges, special achievements, rare states |

### Neutral / Surface Colors

| Role | Name | Hex | RGB | Usage |
|------|------|-----|-----|-------|
| Background | Void Black | `#0A0A0F` | 10, 10, 15 | App background |
| Surface 1 | Dark Slate | `#12121A` | 18, 18, 26 | Cards, panels |
| Surface 2 | Elevated Slate | `#1A1A28` | 26, 26, 40 | Elevated cards, modals |
| Surface 3 | Hover Slate | `#222236` | 34, 34, 54 | Hover backgrounds |
| Border | Glow Line | `#2A2A3E` | 42, 42, 62 | Default borders |
| Border Active | Lime Glow | `#C8E64A40` | — | Active/focused borders (25% opacity) |

### Text Colors

| Role | Name | Hex | Contrast on Void | Usage |
|------|------|-----|------------------|-------|
| Text Primary | White | `#F0F0F5` | 16.5:1 | Headings, primary content |
| Text Secondary | Silver | `#9CA3AF` | 7.2:1 | Secondary text, descriptions |
| Text Muted | Dim Grey | `#6B7280` | 4.6:1 | Captions, timestamps |
| Text on Primary | Black | `#0A0A0F` | 13.8:1 on Lime | Text on lime backgrounds |

### Semantic Colors

| Role | Hex | Usage |
|------|-----|-------|
| Success | `#22C55E` | Correct predictions, wins |
| Warning | `#F59E0B` | Deadlines, pending states |
| Error | `#EF4444` | Errors, destructive actions |
| Info | `#00E5FF` | Informational, tips |

---

## Typography

### Font Stack

| Role | Font | Weight Range | Fallback |
|------|------|-------------|----------|
| Display / Headings | **Russo One** | 400 (single weight) | system-ui, sans-serif |
| Body / UI | **Chakra Petch** | 300–700 | system-ui, sans-serif |
| Data / Numbers | **JetBrains Mono** | 400–700 | monospace |

```css
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300;400;500;600;700&family=Russo+One&family=JetBrains+Mono:wght@400;500;700&display=swap');
```

### Type Scale

| Level | Size | Line Height | Weight | Font | Usage |
|-------|------|-------------|--------|------|-------|
| Display | 40px / 2.5rem | 1.1 | 400 | Russo One | Hero headlines |
| H1 | 32px / 2rem | 1.2 | 400 | Russo One | Page titles |
| H2 | 24px / 1.5rem | 1.25 | 400 | Russo One | Section titles |
| H3 | 20px / 1.25rem | 1.3 | 600 | Chakra Petch | Card titles |
| H4 | 18px / 1.125rem | 1.35 | 600 | Chakra Petch | Subsections |
| Body Large | 18px / 1.125rem | 1.6 | 400 | Chakra Petch | Lead paragraphs |
| Body | 16px / 1rem | 1.6 | 400 | Chakra Petch | Default body text |
| Body Small | 14px / 0.875rem | 1.5 | 400 | Chakra Petch | Secondary text |
| Caption | 12px / 0.75rem | 1.4 | 500 | Chakra Petch | Timestamps, labels |
| Data | 16–32px | 1.2 | 700 | JetBrains Mono | Scores, stats, countdowns |

---

## Spacing System

Based on 4px grid:

| Token | Value | Usage |
|-------|-------|-------|
| `space-0` | 0px | — |
| `space-1` | 4px | Tight inline spacing |
| `space-2` | 8px | Icon-to-text gaps, compact padding |
| `space-3` | 12px | Input padding, small gaps |
| `space-4` | 16px | Standard padding, card gaps |
| `space-5` | 20px | Section inner padding |
| `space-6` | 24px | Card padding, between sections |
| `space-8` | 32px | Section spacing |
| `space-10` | 40px | Large section gaps |
| `space-12` | 48px | Page section separators |
| `space-16` | 64px | Hero spacing |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-none` | 0px | Sharp-edged elements (badges, data chips) |
| `radius-sm` | 4px | Small elements, tags |
| `radius-md` | 8px | Buttons, inputs |
| `radius-lg` | 12px | Cards, panels |
| `radius-xl` | 16px | Modal, bottom sheets |
| `radius-full` | 9999px | Avatars, pills |

**Note:** Neon Arena favors **sharper corners** (4–8px) for a techy, angular feel. Full-round is reserved for avatars and status indicators only.

---

## Shadows & Elevation

| Level | Shadow | Usage |
|-------|--------|-------|
| Elevation 0 | none | Flat elements |
| Elevation 1 | `0 1px 3px rgba(0,0,0,0.4)` | Cards at rest |
| Elevation 2 | `0 4px 12px rgba(0,0,0,0.5)` | Hover cards, dropdowns |
| Elevation 3 | `0 8px 24px rgba(0,0,0,0.6)` | Modals, dialogs |
| Neon Glow (Lime) | `0 0 20px #C8E64A40, 0 0 40px #C8E64A20` | Active/focused primary elements |
| Neon Glow (Cyan) | `0 0 20px #00E5FF30, 0 0 40px #00E5FF15` | Secondary active elements |
| Neon Glow (Magenta) | `0 0 20px #FF2D7830, 0 0 40px #FF2D7815` | Error/loss highlights |

---

## Components

### Buttons

| Variant | Background | Text | Border | Hover | Active |
|---------|-----------|------|--------|-------|--------|
| Primary | `#C8E64A` | `#0A0A0F` | none | `#D4F05A` + neon glow | scale(0.97) |
| Secondary | transparent | `#00E5FF` | `1px solid #00E5FF` | `#00E5FF15` bg | scale(0.97) |
| Ghost | transparent | `#F0F0F5` | none | `#222236` bg | scale(0.97) |
| Destructive | `#EF4444` | `#FFFFFF` | none | `#DC2626` | scale(0.97) |
| Disabled | `#1A1A28` | `#6B7280` | none | — | — |

- **Size:** Height 44px (touch target minimum), padding 16px horizontal
- **Border Radius:** 8px
- **Font:** Chakra Petch 600, 14px, uppercase, letter-spacing 0.05em
- **Transition:** all 150ms ease-out

### Cards

- **Background:** `#12121A`
- **Border:** `1px solid #2A2A3E`
- **Border Radius:** 12px
- **Padding:** 24px
- **Hover:** Border transitions to `#C8E64A40`, subtle neon glow
- **Match Card variant:** Left accent stripe (4px) using team color

### Inputs

- **Background:** `#12121A`
- **Border:** `1px solid #2A2A3E`
- **Border Radius:** 8px
- **Height:** 44px
- **Text:** `#F0F0F5`, Chakra Petch 400, 16px
- **Placeholder:** `#6B7280`
- **Focus:** Border `#C8E64A`, neon glow shadow
- **Error:** Border `#EF4444`, magenta glow

### Badges / Tags

- **Background:** Semi-transparent color (e.g., `#C8E64A20`)
- **Text:** Matching solid color (e.g., `#C8E64A`)
- **Border Radius:** 4px (sharp)
- **Padding:** 4px 8px
- **Font:** Chakra Petch 600, 12px, uppercase

### Leaderboard Row

- **Background:** `#12121A` (alternating `#1A1A28`)
- **Height:** 64px
- **Rank Number:** JetBrains Mono 700, 20px
- **#1 Rank:** Lime glow effect, `#C8E64A` rank color
- **#2 Rank:** Cyan, `#00E5FF`
- **#3 Rank:** Magenta, `#FF2D78`
- **Score:** JetBrains Mono 700, right-aligned
- **Hover:** Background shifts to `#222236`, subtle border glow

### Navigation Bar

- **Background:** `#0A0A0F` with `backdrop-filter: blur(12px)` and 95% opacity
- **Height:** 56px
- **Active indicator:** Lime underline (2px) with neon glow
- **Icons:** 24px, `#9CA3AF` default, `#C8E64A` active

### Bottom Sheet / Modal

- **Overlay:** `rgba(0, 0, 0, 0.7)` with `backdrop-filter: blur(8px)`
- **Background:** `#12121A`
- **Border Radius:** 16px (top only for bottom sheets)
- **Handle bar:** `#2A2A3E`, 32px wide, 4px tall, centered

### Toast Notifications

- **Background:** `#1A1A28`
- **Border-left:** 4px solid (semantic color)
- **Border Radius:** 8px
- **Auto-dismiss:** 4 seconds
- **Entrance:** slide-in from top, 200ms ease-out

---

## Iconography

- **Style:** Outlined, 1.5px stroke weight
- **Library:** Lucide Icons (primary), Heroicons (fallback)
- **Sizes:** 16px (inline), 20px (buttons), 24px (navigation), 32px (empty states)
- **Color:** Inherits from text color; active states use primary lime

---

## Motion & Animation

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro-interaction | 150ms | ease-out | Button press, toggle |
| State transition | 200ms | ease-out | Hover, focus, tab switch |
| Content enter | 250ms | cubic-bezier(0.16, 1, 0.3, 1) | Card appear, modal enter |
| Content exit | 180ms | ease-in | Modal close, element remove |
| Page transition | 300ms | cubic-bezier(0.16, 1, 0.3, 1) | Route changes |
| Neon pulse | 2000ms | ease-in-out (infinite) | Active rank highlight, live indicator |
| Score update | 400ms | spring (stiffness: 100) | Number counter animation |

**Special effects:**
- **Glitch flash:** 100ms CSS glitch on big score changes (translate ±2px + opacity flicker)
- **Neon pulse:** Subtle glow intensity oscillation on live/active elements
- **Score counter:** Numbers roll up/down when values change

**Reduced motion:** All animations collapse to instant opacity fades (150ms).

---

## Grid & Layout

- **Max content width:** 480px (mobile-first, single column)
- **Page padding:** 16px horizontal
- **Card grid:** Single column on mobile, 2-col at 768px+
- **Leaderboard:** Full-width within content area
- **Bottom safe area:** 34px minimum (for gesture bar)

---

## Dark Mode

Neon Arena is **dark-only by design**. There is no light mode variant. The entire aesthetic depends on neon-on-dark contrast.
