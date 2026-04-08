# Design System Option 2: Stadium Lights

> Premium sports-broadcast aesthetic with cinematic depth. Deep charcoal surfaces, warm amber highlights, and the Bragg lime as a confident accent. Feels like watching the match on a premium OTT platform.

---

## Design Philosophy

**Vibe:** Premium. Cinematic. Authoritative.
Stadium Lights draws from the experience of watching cricket under floodlights on a high-end broadcast. Deep, layered dark surfaces create depth. Warm amber tones evoke stadium floodlights and golden trophies. The Bragg lime appears as a strategic accent — not everywhere, but where it matters most: your rank, your score, your wins.

**Best for:** Users who want the app to feel polished, trustworthy, and sports-premium without being over-the-top.

---

## Color Palette

### Primary Colors (derived from logo)

| Role | Name | Hex | RGB | Usage |
|------|------|-----|-----|-------|
| Primary | Bragg Lime | `#C8E64A` | 200, 230, 74 | Primary CTAs, user's own rank/score, key wins |
| Primary Hover | Lime Bright | `#D4F05A` | 212, 240, 90 | Hover state |
| Primary Muted | Lime Subtle | `#C8E64A1A` | — | Subtle background tints (10% opacity) |

### Secondary & Accent Colors

| Role | Name | Hex | RGB | Usage |
|------|------|-----|-----|-------|
| Secondary | Stadium Amber | `#F59E0B` | 245, 158, 11 | Trophies, achievements, featured highlights |
| Secondary Light | Gold Glow | `#FBBF24` | 251, 191, 36 | Badges, premium indicators |
| Accent | Sky Blue | `#38BDF8` | 56, 189, 248 | Links, info, secondary actions |
| Warm | Coral | `#FB7185` | 251, 113, 133 | Losses, negative changes, rival highlights |

### Neutral / Surface Colors

| Role | Name | Hex | RGB | Usage |
|------|------|-----|-----|-------|
| Background | Deep Charcoal | `#0F1117` | 15, 17, 23 | App background |
| Surface 1 | Charcoal | `#181B24` | 24, 27, 36 | Cards, panels |
| Surface 2 | Slate | `#1F2330` | 31, 35, 48 | Elevated cards, dropdowns |
| Surface 3 | Light Slate | `#282D3E` | 40, 45, 62 | Hover states, selected rows |
| Border | Steel | `#2D3348` | 45, 51, 72 | Default borders |
| Border Subtle | Faint Steel | `#1F2330` | 31, 35, 48 | Subtle dividers |

### Text Colors

| Role | Name | Hex | Contrast on Deep Charcoal | Usage |
|------|------|-----|--------------------------|-------|
| Text Primary | Bright White | `#F8FAFC` | 17.1:1 | Headings, primary content |
| Text Secondary | Cool Grey | `#94A3B8` | 7.5:1 | Descriptions, secondary |
| Text Muted | Slate Grey | `#64748B` | 4.8:1 | Captions, metadata |
| Text on Primary | Deep Charcoal | `#0F1117` | 14.2:1 on Lime | Text on lime backgrounds |

### Semantic Colors

| Role | Hex | Usage |
|------|-----|-------|
| Success | `#22C55E` | Correct predictions, wins |
| Warning | `#F59E0B` | Deadlines approaching |
| Error | `#EF4444` | Errors, destructive |
| Info | `#38BDF8` | Tips, information |

---

## Typography

### Font Stack

| Role | Font | Weight Range | Fallback |
|------|------|-------------|----------|
| Display / Headings | **Bebas Neue** | 400 (single weight) | system-ui, sans-serif |
| Body / UI | **Source Sans 3** | 300–700 | system-ui, sans-serif |
| Data / Numbers | **Tabular: Source Sans 3** | 600–700 | system-ui, sans-serif |

```css
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');
```

### Type Scale

| Level | Size | Line Height | Weight | Font | Usage |
|-------|------|-------------|--------|------|-------|
| Display | 48px / 3rem | 1.0 | 400 | Bebas Neue | Hero headlines, big numbers |
| H1 | 36px / 2.25rem | 1.1 | 400 | Bebas Neue | Page titles |
| H2 | 28px / 1.75rem | 1.15 | 400 | Bebas Neue | Section titles |
| H3 | 22px / 1.375rem | 1.25 | 600 | Source Sans 3 | Card titles |
| H4 | 18px / 1.125rem | 1.35 | 600 | Source Sans 3 | Subsection headers |
| Body Large | 18px / 1.125rem | 1.6 | 400 | Source Sans 3 | Lead text |
| Body | 16px / 1rem | 1.6 | 400 | Source Sans 3 | Default body |
| Body Small | 14px / 0.875rem | 1.5 | 400 | Source Sans 3 | Secondary text |
| Caption | 12px / 0.75rem | 1.4 | 500 | Source Sans 3 | Labels, timestamps |
| Stat Large | 36px / 2.25rem | 1.1 | 400 | Bebas Neue | Score displays, big stats |
| Stat | 20px / 1.25rem | 1.2 | 700 | Source Sans 3 | Inline statistics |

**Note:** Bebas Neue is ALL-CAPS only. Use it exclusively for headings and display numbers — never for body text or UI labels.

---

## Spacing System

Based on 4px grid:

| Token | Value | Usage |
|-------|-------|-------|
| `space-0` | 0px | — |
| `space-1` | 4px | Tight inline spacing |
| `space-2` | 8px | Icon gaps, compact padding |
| `space-3` | 12px | Input inner padding |
| `space-4` | 16px | Standard padding |
| `space-5` | 20px | Card inner spacing |
| `space-6` | 24px | Between components |
| `space-8` | 32px | Section spacing |
| `space-10` | 40px | Large gaps |
| `space-12` | 48px | Page sections |
| `space-16` | 64px | Hero areas |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 6px | Tags, small elements |
| `radius-md` | 10px | Buttons, inputs |
| `radius-lg` | 14px | Cards |
| `radius-xl` | 20px | Modals, bottom sheets |
| `radius-full` | 9999px | Avatars, pills, status dots |

**Note:** Stadium Lights uses **softer, more rounded corners** (10–14px) for a premium, approachable feel compared to Neon Arena's sharp edges.

---

## Shadows & Elevation

| Level | Shadow | Usage |
|-------|--------|-------|
| Elevation 0 | none | Flat elements |
| Elevation 1 | `0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)` | Cards at rest |
| Elevation 2 | `0 4px 8px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.2)` | Hover cards, dropdowns |
| Elevation 3 | `0 12px 32px rgba(0,0,0,0.5)` | Modals, dialogs |
| Amber Glow | `0 0 24px rgba(245,158,11,0.15)` | Trophy/achievement highlights |
| Lime Accent | `0 0 16px rgba(200,230,74,0.12)` | Subtle primary highlight |

**Philosophy:** Shadows are deep and cinematic, not neon. They create depth through layering, not glow.

---

## Components

### Buttons

| Variant | Background | Text | Border | Hover | Active |
|---------|-----------|------|--------|-------|--------|
| Primary | `#C8E64A` | `#0F1117` | none | `#D4F05A`, elevation 2 | scale(0.98) |
| Secondary | `#1F2330` | `#F8FAFC` | `1px solid #2D3348` | `#282D3E` | scale(0.98) |
| Ghost | transparent | `#94A3B8` | none | `#1F2330` bg | scale(0.98) |
| Destructive | `#DC2626` | `#FFFFFF` | none | `#B91C1C` | scale(0.98) |
| Disabled | `#181B24` | `#64748B` | none | — | — |

- **Size:** Height 44px, padding 20px horizontal
- **Border Radius:** 10px
- **Font:** Source Sans 3, 600, 15px, letter-spacing 0.02em
- **Transition:** all 200ms cubic-bezier(0.16, 1, 0.3, 1)

### Cards

- **Background:** `#181B24`
- **Border:** `1px solid #2D3348`
- **Border Radius:** 14px
- **Padding:** 20px
- **Hover:** Elevation 2, border lightens to `#3D4460`
- **Match Card:** Top gradient strip (4px) using team color → transparent

### Inputs

- **Background:** `#181B24`
- **Border:** `1px solid #2D3348`
- **Border Radius:** 10px
- **Height:** 44px
- **Text:** `#F8FAFC`, Source Sans 3 400, 16px
- **Placeholder:** `#64748B`
- **Focus:** Border `#C8E64A`, subtle lime shadow
- **Error:** Border `#EF4444`

### Badges

- **Pill Shape:** `border-radius: 9999px`
- **Background:** Semi-transparent (e.g., `#C8E64A1A`)
- **Text:** Matching solid color
- **Padding:** 4px 12px
- **Font:** Source Sans 3 600, 12px

### Leaderboard Row

- **Background:** `#181B24`
- **Separator:** `1px solid #1F2330` between rows
- **Height:** 72px
- **Rank:** Bebas Neue 400, 28px
- **#1:** Gold amber `#F59E0B` with trophy icon
- **#2:** Silver `#94A3B8`
- **#3:** Bronze `#CD7F32`
- **Score:** Source Sans 3 700, 18px, right-aligned
- **Your row:** Background `#C8E64A0D`, left border 3px `#C8E64A`

### Navigation Bar

- **Background:** `#0F1117` at 98% opacity, `backdrop-filter: blur(16px)`
- **Height:** 60px
- **Border-bottom:** `1px solid #1F2330`
- **Active:** Lime text + bottom indicator (3px, rounded)
- **Icons:** 24px

### Score Display

- **Large stat:** Bebas Neue 48px, `#F8FAFC`
- **Label:** Source Sans 3 500, 12px, `#64748B`, uppercase, letter-spacing 0.1em
- **Change indicator:** Small arrow + colored number (green up, coral down)

### Toast Notifications

- **Background:** `#1F2330`
- **Border:** `1px solid #2D3348`
- **Border Radius:** 10px
- **Icon:** Semantic color circle (20px) on left
- **Auto-dismiss:** 4 seconds

---

## Iconography

- **Style:** Outlined, 1.5px stroke
- **Library:** Lucide Icons
- **Sizes:** 16px (inline), 20px (buttons), 24px (navigation), 40px (empty states)
- **Color:** Inherits text color; active = primary lime or amber

---

## Motion & Animation

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro-interaction | 150ms | ease-out | Button press, icon toggle |
| State transition | 200ms | cubic-bezier(0.16, 1, 0.3, 1) | Hover, focus |
| Content enter | 300ms | cubic-bezier(0.16, 1, 0.3, 1) | Card, modal enter |
| Content exit | 200ms | ease-in | Close, dismiss |
| Page transition | 350ms | cubic-bezier(0.16, 1, 0.3, 1) | Route change |
| Score update | 500ms | spring (damping: 20) | Number counter, rank change |
| Live pulse | 1500ms | ease-in-out (infinite) | Live match indicator |

**Philosophy:** Motion is smooth and confident, never flashy. Transitions feel cinematic — like a broadcast camera move. No glitch effects, no neon pulses.

**Reduced motion:** Animations reduce to 150ms opacity fades.

---

## Grid & Layout

- **Max content width:** 480px (mobile), 960px (tablet/desktop)
- **Page padding:** 16px (mobile), 24px (tablet+)
- **Card grid:** Single column mobile, 2-col at 768px
- **Dashboard:** Stats row (2–3 cards side by side), then full-width lists
- **Bottom safe area:** 34px

---

## Dark Mode

Stadium Lights is **dark-only** — the premium broadcast aesthetic requires dark surfaces. However, unlike Neon Arena, the darks are warmer (charcoal with blue undertones rather than pure void black), creating a more inviting atmosphere.
